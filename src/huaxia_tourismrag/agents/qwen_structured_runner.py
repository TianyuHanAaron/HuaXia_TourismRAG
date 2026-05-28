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

        response = await self._client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": self._system_prompt(instructions, output_type),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"},
            extra_body={"enable_thinking": False},
        )
        content = response.choices[0].message.content
        json_text = _extract_json_text(content)
        try:
            return output_type.model_validate_json(json_text)
        except (ValidationError, ValueError) as exc:
            raise ValueError(
                f"Qwen Cloud response was not valid JSON for {output_type.__name__}: {exc}"
            ) from exc

    def _system_prompt(self, instructions: str, output_type: type[BaseModel]) -> str:
        schema = json.dumps(output_type.model_json_schema(), ensure_ascii=False)
        return (
            f"{instructions}\n\n"
            "你必须只输出一个 JSON object，不要输出 Markdown、解释或代码围栏。\n"
            f"JSON 必须符合这个 Pydantic schema：\n{schema}"
        )


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
