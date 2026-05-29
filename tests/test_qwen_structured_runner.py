from types import SimpleNamespace

import pytest

from huaxia_tourismrag.agents.qwen_structured_runner import (
    QwenCloudStructuredRunner,
    run_qwen_structured,
)
from huaxia_tourismrag.core.config import Settings
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.schemas.research import TravelResearchPlan


class FakeChatCompletions:
    def __init__(self, content: str | list[str]) -> None:
        self.contents = content if isinstance(content, list) else [content]
        self.requests = []

    async def create(self, **kwargs):
        self.requests.append(kwargs)
        content = self.contents[min(len(self.requests) - 1, len(self.contents) - 1)]
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=content),
                )
            ]
        )


class FakeAsyncOpenAI:
    instance = None

    def __init__(self, **kwargs) -> None:
        self.kwargs = kwargs
        self.completions = FakeChatCompletions(
            '{"answer":"夏夏建议成都重庆美食线。","highlights":["火锅"],'
            '"warnings":[],"citations":[]}'
        )
        self.chat = SimpleNamespace(completions=self.completions)
        FakeAsyncOpenAI.instance = self


@pytest.mark.asyncio
async def test_qwen_structured_runner_parses_valid_json(monkeypatch):
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        FakeAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.7-max",
    )

    answer = await runner.run(
        prompt="成都重庆美食路线怎么安排？",
        output_type=TravelAnswer,
        instructions="只输出 TravelAnswer JSON。",
    )

    assert answer.answer == "夏夏建议成都重庆美食线。"
    client = FakeAsyncOpenAI.instance
    assert client.kwargs["api_key"] == "dashscope-key"
    assert client.kwargs["base_url"] == "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    request = client.completions.requests[0]
    assert request["model"] == "qwen3.7-max"
    assert request["response_format"] == {"type": "json_object"}
    assert request["extra_body"] == {"enable_thinking": False}


@pytest.mark.asyncio
async def test_qwen_structured_runner_reports_invalid_json(monkeypatch):
    class InvalidJsonAsyncOpenAI(FakeAsyncOpenAI):
        def __init__(self, **kwargs) -> None:
            self.kwargs = kwargs
            self.completions = FakeChatCompletions("不是 JSON")
            self.chat = SimpleNamespace(completions=self.completions)

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        InvalidJsonAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.7-max",
    )

    with pytest.raises(ValueError, match="valid JSON"):
        await runner.run(
            prompt="成都重庆美食路线怎么安排？",
            output_type=TravelAnswer,
            instructions="只输出 TravelAnswer JSON。",
        )


@pytest.mark.asyncio
async def test_run_qwen_structured_uses_model_override(monkeypatch):
    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        FakeAsyncOpenAI,
    )
    settings = Settings(
        _env_file=None,
        TOURISM_AGENT_PROVIDER="qwen_cloud",
        TOURISM_AGENT_MODEL="qwen3.7-max",
        DASHSCOPE_API_KEY="dashscope-key",
    )

    await run_qwen_structured(
        prompt="成都重庆美食路线怎么安排？",
        output_type=TravelAnswer,
        instructions="只输出 TravelAnswer JSON。",
        settings=settings,
        model_override="qwen3.6-flash",
    )

    request = FakeAsyncOpenAI.instance.completions.requests[0]
    assert request["model"] == "qwen3.6-flash"


@pytest.mark.asyncio
async def test_qwen_structured_runner_retries_schema_echo(monkeypatch):
    class SchemaEchoAsyncOpenAI(FakeAsyncOpenAI):
        def __init__(self, **kwargs) -> None:
            self.kwargs = kwargs
            self.completions = FakeChatCompletions(
                [
                    (
                        '{"type":"object","properties":{"answer":{"type":"string"}},'
                        '"required":["answer"]}'
                    ),
                    (
                        '{"answer":"夏夏建议成都重庆美食线。","highlights":["火锅"],'
                        '"warnings":[],"citations":[]}'
                    ),
                ]
            )
            self.chat = SimpleNamespace(completions=self.completions)
            FakeAsyncOpenAI.instance = self

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        SchemaEchoAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.6-flash",
    )

    answer = await runner.run(
        prompt="成都重庆美食路线怎么安排？",
        output_type=TravelAnswer,
        instructions="只输出 TravelAnswer JSON。",
    )

    assert answer.answer == "夏夏建议成都重庆美食线。"
    assert len(FakeAsyncOpenAI.instance.completions.requests) == 2


@pytest.mark.asyncio
async def test_qwen_structured_runner_retries_validation_error(monkeypatch):
    class ValidationRepairAsyncOpenAI(FakeAsyncOpenAI):
        def __init__(self, **kwargs) -> None:
            self.kwargs = kwargs
            self.completions = FakeChatCompletions(
                [
                    (
                        '{"original_question":"广西五日游","destination":"广西",'
                        '"origin":"广州","trip_days":5,'
                        '"travelers_summary":"两人","budget_level":"mid_range",'
                        '"interests":["漓江","阳朔","涠洲岛"],'
                        '"required_entities":[{"name":"漓江竹筏","entity_type":"activity",'
                        '"evidence_use":"route_feasibility","optional":false}],'
                        '"answer_language":"zh-CN",'
                        '"tasks":[{"task_type":"route","evidence_use":"route_feasibility",'
                        '"query":"广州 广西 桂林 阳朔 北海 五日游 交通",'
                        '"reason":"确认路线顺序","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"mixed"},'
                        '{"task_type":"activity","evidence_use":"local_experience",'
                        '"query":"阳朔 遇龙河 骑行 竹筏",'
                        '"reason":"核验体验安排","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"mixed"},'
                        '{"task_type":"food","evidence_use":"local_food",'
                        '"query":"北海 涠洲岛 海鲜 美食",'
                        '"reason":"核验本地美食","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"local_experience"}]}'
                    ),
                    (
                        '{"original_question":"广西五日游","destination":"广西",'
                        '"origin":"广州","trip_days":5,'
                        '"travelers_summary":"两人","budget_level":"mid_range",'
                        '"interests":["漓江","阳朔","涠洲岛"],'
                        '"required_entities":[{"name":"漓江竹筏","entity_type":"activity",'
                        '"evidence_use":"route_feasibility","optional":false}],'
                        '"answer_language":"zh-CN",'
                        '"tasks":[{"task_type":"route","evidence_use":"route_feasibility",'
                        '"query":"广州 广西 桂林 阳朔 北海 五日游 交通",'
                        '"reason":"确认路线顺序","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"mixed"},'
                        '{"task_type":"attraction","evidence_use":"route_feasibility",'
                        '"query":"阳朔 遇龙河 骑行 竹筏",'
                        '"reason":"核验体验安排","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"local_experience"},'
                        '{"task_type":"food","evidence_use":"local_food",'
                        '"query":"北海 涠洲岛 海鲜 美食",'
                        '"reason":"核验本地美食","max_results":5,'
                        '"freshness_required":false,"recency_days":null,'
                        '"source_preference":"local_experience"}]}'
                    ),
                ]
            )
            self.chat = SimpleNamespace(completions=self.completions)
            FakeAsyncOpenAI.instance = self

    monkeypatch.setattr(
        "huaxia_tourismrag.agents.qwen_structured_runner.AsyncOpenAI",
        ValidationRepairAsyncOpenAI,
    )
    runner = QwenCloudStructuredRunner(
        api_key="dashscope-key",
        base_url="https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
        model="qwen3.6-plus",
    )

    plan = await runner.run(
        prompt="广西五日游",
        output_type=TravelResearchPlan,
        instructions="只输出 TravelResearchPlan JSON。",
    )

    assert plan.tasks[1].task_type == "attraction"
    assert plan.tasks[1].source_preference == "local_experience"
    assert len(FakeAsyncOpenAI.instance.completions.requests) == 2
    retry_messages = FakeAsyncOpenAI.instance.completions.requests[1]["messages"]
    assert "没有通过 Pydantic 校验" in retry_messages[-1]["content"]
