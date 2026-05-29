from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.prompt_compaction import FinalPromptCompactor
from huaxia_tourismrag.services.topic_evidence_selector import TopicEvidenceBundle


def make_quote(citation_id: int, quote: str) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk-{citation_id}",
        source_type="internal",
        content_type="travel_guide",
        title=f"标题 {citation_id}",
        source_name="内部资料",
        source_ref=f"internal:chunk-{citation_id}",
        quote=quote,
    )


def test_prompt_compactor_deduplicates_topic_quote_text():
    long_quote = "山西历史人文路线建议保留太原、大同和平遥。"
    quote = make_quote(1, long_quote)
    pack = CitationPack(
        context_text=f"[1] quote={long_quote}",
        citations=["[1] 标题 1 - 内部资料 - internal:chunk-1"],
        evidence_quotes=[quote],
    )
    bundle = TopicEvidenceBundle(
        category="food",
        title="美食",
        evidence_quotes=[quote],
    )

    compacted = FinalPromptCompactor().compact(pack, [bundle])

    assert compacted.context_text.count(long_quote) == 1
    assert "citation_ids=[1]" in compacted.context_text
    assert compacted.included_citation_ids == [1]


def test_prompt_compactor_prioritizes_topic_quotes_then_caps_remaining():
    quotes = [make_quote(index, f"证据 {index}") for index in range(1, 5)]
    pack = CitationPack(
        context_text="legacy",
        citations=[f"[{index}] x" for index in range(1, 5)],
        evidence_quotes=quotes,
    )
    bundle = TopicEvidenceBundle(
        category="shopping",
        title="购物",
        evidence_quotes=[quotes[2]],
    )

    compacted = FinalPromptCompactor(max_quotes=2).compact(pack, [bundle])

    assert compacted.included_citation_ids == [3, 1]
    assert compacted.omitted_citation_ids == [2, 4]
    assert "[3] citation_id=3" in compacted.context_text
    assert "[2] citation_id=2" not in compacted.context_text


def test_prompt_compactor_falls_back_to_legacy_context_without_evidence_quotes():
    pack = CitationPack(
        context_text="legacy context",
        citations=[],
        evidence_quotes=[],
    )

    compacted = FinalPromptCompactor().compact(pack, [])

    assert "legacy context" in compacted.context_text
    assert compacted.included_citation_ids == []
