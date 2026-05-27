from huaxia_tourismrag.schemas.evidence import CitationPack, EvidenceQuote, TravelAnswer
from huaxia_tourismrag.tools.citation_guard import CitationGuard


def _quote(
    citation_id: int,
    *,
    content_type: str = "attraction",
    source_ref: str | None = None,
) -> EvidenceQuote:
    return EvidenceQuote(
        citation_id=citation_id,
        chunk_id=f"chunk:{citation_id}",
        source_type="web",
        content_type=content_type,
        title=f"来源 {citation_id}",
        source_name="测试来源",
        source_ref=source_ref or f"https://example.cn/{citation_id}",
        quote=f"第 {citation_id} 条证据。",
        url=source_ref if source_ref and source_ref.startswith("http") else None,
    )


def _pack() -> CitationPack:
    return CitationPack(
        context_text="",
        citations=[
            "[1] 来源 1 - 测试来源 - https://example.cn/1",
            "[2] 来源 2 - 测试来源 - https://example.cn/2",
        ],
        evidence_quotes=[_quote(1), _quote(2)],
    )


def test_guard_rejects_unknown_citation_ids():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="云冈石窟建议提前预约。[3]",
        highlights=[],
        warnings=[],
        citations=["[3] 模型编出来的来源 - fake - https://fake.example"],
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.answer.citations == []
    assert any(issue.issue_type == "unknown_reference" and issue.citation_id == 3 for issue in result.issues)


def test_guard_normalizes_altered_citation_lines_and_removes_unused_lines():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="云冈石窟建议提前预约。[1]",
        highlights=["大同段只用一个证据。[1]"],
        warnings=[],
        citations=[
            "[1] 来源 1 - 被模型改写 - https://wrong.example",
            "[2] 来源 2 - 测试来源 - https://example.cn/2",
        ],
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.answer.citations == ["[1] 来源 1 - 测试来源 - https://example.cn/1"]
    assert any(issue.issue_type == "altered_citation_line" and issue.citation_id == 1 for issue in result.issues)
    assert any(issue.issue_type == "unused_citation_line" and issue.citation_id == 2 for issue in result.issues)


def test_guard_adds_missing_used_citation_lines():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="成都火锅适合安排在晚餐。[2]",
        highlights=[],
        warnings=[],
        citations=[],
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.answer.citations == ["[2] 来源 2 - 测试来源 - https://example.cn/2"]
    assert any(issue.issue_type == "missing_citation_line" and issue.citation_id == 2 for issue in result.issues)


def test_guard_scans_highlights_warnings_and_generated_itinerary():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="主回答没有引用。",
        highlights=["亮点引用。[1]"],
        warnings=["提醒引用。[2]"],
        citations=[],
        generated_itinerary={
            "destination": "山西",
            "itinerary": [
                {
                    "day": 1,
                    "city": "大同",
                    "activities": [
                        {
                            "name": "云冈石窟",
                            "description": "世界文化遗产核心景点。[1]",
                        }
                    ],
                    "notes": "傍晚少走回头路。[2]",
                }
            ],
        },
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.used_citation_ids == {1, 2}
    assert result.answer.citations == [
        "[1] 来源 1 - 测试来源 - https://example.cn/1",
        "[2] 来源 2 - 测试来源 - https://example.cn/2",
    ]


def test_guard_flags_policy_or_railway_citation_for_food_claims():
    guard = CitationGuard()
    pack = CitationPack(
        context_text="",
        citations=["[1] 铁路规则 - 12306 - internal:railway:1"],
        evidence_quotes=[
            _quote(1, content_type="railway", source_ref="internal:railway:1"),
        ],
    )
    answer = TravelAnswer(
        answer="成都火锅、担担面适合做本地美食体验。[1]",
        highlights=[],
        warnings=[],
        citations=["[1] 铁路规则 - 12306 - internal:railway:1"],
    )

    result = guard.validate_and_normalize(answer, pack)

    assert any(issue.issue_type == "source_type_mismatch" and issue.citation_id == 1 for issue in result.issues)
