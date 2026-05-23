from datetime import datetime, timezone

from huaxia_tourismrag.schemas.evidence import TravelChunk
from huaxia_tourismrag.tools.reranker import BgeRerankerTool


def make_chunk(chunk_id: str, score: float | None = None) -> TravelChunk:
    return TravelChunk(
        id=chunk_id,
        source_type="internal",
        content_type="travel_guide",
        title=f"chunk {chunk_id}",
        text=f"旅游证据内容 {chunk_id}",
        source_name="test",
        retrieved_at=datetime.now(timezone.utc),
        score=score,
    )


class FakeRerankerModel:
    def compute_score(self, pairs: list[list[str]], normalize: bool) -> list[float]:
        assert normalize is True
        assert len(pairs) == 2
        return [0.2, 0.9]


class BrokenRerankerModel:
    def compute_score(self, pairs: list[list[str]], normalize: bool) -> list[float]:
        raise AttributeError("XLMRobertaTokenizer has no attribute prepare_for_model")


class CountingRerankerModel:
    calls = 0

    def compute_score(self, pairs: list[list[str]], normalize: bool) -> list[float]:
        self.calls += 1
        return [0.5 for _ in pairs]


def test_rerank_sorts_by_model_scores():
    tool = BgeRerankerTool(FakeRerankerModel())
    chunks = [make_chunk("a"), make_chunk("b")]

    ranked = tool.rerank("北京怎么玩", chunks, top_k=2)

    assert [chunk.id for chunk in ranked] == ["b", "a"]
    assert ranked[0].rerank_score == 0.9


def test_rerank_uses_fast_fallback_when_model_is_disabled():
    chunks = [make_chunk("low", score=0.1), make_chunk("high", score=0.8)]

    ranked = BgeRerankerTool(None).rerank("北京怎么玩", chunks, top_k=1)

    assert [chunk.id for chunk in ranked] == ["high"]
    assert ranked[0].rerank_score is not None


def test_rerank_falls_back_to_retrieval_scores_when_model_fails():
    tool = BgeRerankerTool(BrokenRerankerModel())
    chunks = [make_chunk("low", score=0.1), make_chunk("high", score=0.8)]

    ranked = tool.rerank("北京怎么玩", chunks, top_k=1)

    assert [chunk.id for chunk in ranked] == ["high"]
    assert ranked[0].rerank_score is not None


def test_model_rerank_limits_candidate_count_before_expensive_scoring():
    model = CountingRerankerModel()
    chunks = [make_chunk(str(index), score=index / 10) for index in range(10)]

    ranked = BgeRerankerTool(model, max_model_candidates=3).rerank(
        "北京怎么玩",
        chunks,
        top_k=2,
    )

    assert model.calls == 1
    assert len(ranked) == 2


def test_fallback_rerank_prefers_relevant_web_text_over_unrelated_internal_score():
    tool = BgeRerankerTool(BrokenRerankerModel())
    unrelated_internal = TravelChunk(
        id="internal",
        source_type="internal",
        content_type="travel_guide",
        title="故宫博物院参观须知",
        text="北京故宫参观需要预约，并遵守文物保护要求。",
        source_name="internal",
        retrieved_at=datetime.now(timezone.utc),
        score=0.95,
    )
    relevant_web = TravelChunk(
        id="web",
        source_type="web",
        content_type="travel_guide",
        title="山西十日深度游路线",
        text="山西太原、大同、五台山、平遥、临汾、运城适合十日历史人文深度游。",
        source_name="tavily",
        retrieved_at=datetime.now(timezone.utc),
    )

    ranked = tool.rerank(
        "山西省历史人文深度十日游 太原 大同 五台山 平遥 临汾 运城",
        [unrelated_internal, relevant_web],
        top_k=1,
    )

    assert [chunk.id for chunk in ranked] == ["web"]
    assert ranked[0].rerank_score is not None
