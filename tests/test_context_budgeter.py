from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote
from huaxia_tourismrag.services.context_budgeter import ContextBudgeter


def _quote(citation_id: int, content_type: str, quote: str) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk:{citation_id}",
        source_type="internal",
        content_type=content_type,
        title=f"来源 {citation_id}",
        source_name="test",
        source_ref=f"internal:chunk:{citation_id}",
        quote=quote,
    )


def test_context_budgeter_keeps_destination_quotes_before_policy_quotes() -> None:
    pack = CitationPack(
        context_text="",
        citations=[
            "[1] railway",
            "[2] attraction",
            "[3] food",
            "[4] legal",
        ],
        evidence_quotes=[
            _quote(1, "railway", "铁路规则"),
            _quote(2, "attraction", "黄果树瀑布景区"),
            _quote(3, "local_cuisine", "苗寨长桌宴"),
            _quote(4, "legal", "旅游法规则"),
        ],
    )

    trimmed = ContextBudgeter(max_quotes_by_detail={"standard": 2}).trim(
        pack,
        "standard",
    )

    assert [quote.citation_id for quote in trimmed.evidence_quotes] == [2, 3]
    assert trimmed.citations == ["[2] attraction", "[3] food"]
