"""Qwen Cloud structured-output runner for Pydantic DTOs."""

from __future__ import annotations

import json
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from huaxia_tourismrag.agents.model_runtime import ensure_agent_model_ready
from huaxia_tourismrag.core.config import Settings, get_settings


OutputT = TypeVar("OutputT", bound=BaseModel)


class QwenCloudStructuredRunner:
    """Run Qwen Cloud in JSON mode and validate the result into a DTO."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: float = 120.0,
    ) -> None:
        self.model = model
        self._client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout_seconds,
        )

    async def run(
        self,
        prompt: str,
        output_type: type[OutputT],
        instructions: str,
    ) -> OutputT:
        """Return a validated Pydantic DTO from Qwen Cloud JSON output."""

        messages = [
            {
                "role": "system",
                "content": self._system_prompt(instructions, output_type),
            },
            {"role": "user", "content": prompt},
        ]
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0,
            response_format={"type": "json_object"},
            extra_body={"enable_thinking": False},
        )
        content = response.choices[0].message.content
        json_text = _extract_json_text(content)
        try:
            return output_type.model_validate_json(json_text)
        except (ValidationError, ValueError) as exc:
            if _looks_like_json_schema(json_text):
                repaired = await self._retry_schema_echo(
                    messages=messages,
                    schema_echo=json_text,
                    output_type=output_type,
                )
                if repaired is not None:
                    return repaired
            repaired = await self._retry_validation_error(
                messages=messages,
                invalid_json=json_text,
                validation_error=str(exc),
                output_type=output_type,
            )
            if repaired is not None:
                return repaired
            raise ValueError(
                f"Qwen Cloud response was not valid JSON for {output_type.__name__}: {exc}"
            ) from exc

    def _system_prompt(self, instructions: str, output_type: type[BaseModel]) -> str:
        schema = json.dumps(output_type.model_json_schema(), ensure_ascii=False)
        field_names = ", ".join(output_type.model_fields)
        return (
            f"{instructions}\n\n"
            "你必须只输出一个 JSON object，不要输出 Markdown、解释或代码围栏。\n"
            "你要输出的是一个已填写的业务数据实例，不是 JSON schema。\n"
            "不要复制 schema，不要输出 properties、required、$defs 等 schema 元字段。\n"
            f"顶层必须直接包含这些字段：{field_names}。\n"
            f"JSON 必须符合这个 Pydantic schema：\n{schema}"
        )

    async def _retry_schema_echo(
        self,
        messages: list[dict[str, str]],
        schema_echo: str,
        output_type: type[OutputT],
    ) -> OutputT | None:
        field_names = ", ".join(output_type.model_fields)
        retry_messages = [
            *messages,
            {"role": "assistant", "content": schema_echo},
            {
                "role": "user",
                "content": (
                    "你刚才输出的是 JSON schema，不是业务数据实例。"
                    "请重新输出一个已填写的 JSON object。"
                    f"顶层必须直接包含这些字段：{field_names}。"
                    "不要输出 properties、required、$defs、title 或 type。"
                ),
            },
        ]
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=retry_messages,
            temperature=0,
            response_format={"type": "json_object"},
            extra_body={"enable_thinking": False},
        )
        content = response.choices[0].message.content
        json_text = _extract_json_text(content)
        if _looks_like_json_schema(json_text):
            return None
        try:
            return output_type.model_validate_json(json_text)
        except (ValidationError, ValueError):
            return None

    async def _retry_validation_error(
        self,
        messages: list[dict[str, str]],
        invalid_json: str,
        validation_error: str,
        output_type: type[OutputT],
    ) -> OutputT | None:
        retry_messages = [
            *messages,
            {"role": "assistant", "content": invalid_json},
            {
                "role": "user",
                "content": (
                    "你刚才输出的是业务 JSON 实例，但没有通过 Pydantic 校验。"
                    "请只修正字段值，让它严格符合 schema。"
                    "不要改变顶层结构，不要新增 schema 元字段，不要输出解释。"
                    "如果某个字段是枚举值，必须从 schema 允许值中选择。"
                    f"\n\nPydantic 校验错误：\n{validation_error}"
                    f"\n\n需要修正的 JSON：\n{invalid_json}"
                ),
            },
        ]
        response = await self._client.chat.completions.create(
            model=self.model,
            messages=retry_messages,
            temperature=0,
            response_format={"type": "json_object"},
            extra_body={"enable_thinking": False},
        )
        content = response.choices[0].message.content
        json_text = _extract_json_text(content)
        if _looks_like_json_schema(json_text):
            return None
        try:
            return output_type.model_validate_json(json_text)
        except (ValidationError, ValueError):
            return None


def _extract_json_text(content: object) -> str:
    if not isinstance(content, str):
        raise ValueError("Qwen Cloud response content must be a valid JSON string.")

    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    if not text.startswith("{"):
        raise ValueError("Qwen Cloud response content must be valid JSON.")
    return text


def _looks_like_json_schema(json_text: str) -> bool:
    try:
        payload = json.loads(json_text)
    except ValueError:
        return False
    if not isinstance(payload, dict):
        return False
    return (
        payload.get("type") == "object"
        and isinstance(payload.get("properties"), dict)
        and isinstance(payload.get("required"), list)
    )


async def run_qwen_structured(
    prompt: str,
    output_type: type[OutputT],
    instructions: str,
    settings: Settings | None = None,
    model_override: str | None = None,
) -> OutputT:
    """Build the configured Qwen Cloud runner and validate one DTO response."""

    settings = settings or get_settings()
    ensure_agent_model_ready(settings)
    if not settings.dashscope_api_key:
        raise RuntimeError("DASHSCOPE_API_KEY is required for Qwen Cloud generation")
    return await QwenCloudStructuredRunner(
        api_key=settings.dashscope_api_key,
        base_url=settings.qwen_cloud_base_url,
        model=model_override or settings.tourism_agent_model,
        timeout_seconds=settings.qdrant_timeout_seconds,
    ).run(
        prompt=prompt,
        output_type=output_type,
        instructions=instructions,
    )
