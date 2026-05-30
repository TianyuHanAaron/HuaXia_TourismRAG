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
    assert "[3]" not in result.answer.answer
    assert any(issue.issue_type == "unknown_reference" and issue.citation_id == 3 for issue in result.issues)


def test_guard_removes_unknown_citation_markers_from_nested_itinerary_fields():
    answer = TravelAnswer.model_validate(
        {
            "answer": "河南行程如下。[3]",
            "highlights": ["龙门石窟适合亲子讲解。[3]"],
            "warnings": [],
            "citations": [],
            "generated_itinerary": {
                "destination": "河南",
                "travel_tips": ["7月注意防暑。[3]"],
                "itinerary": [
                    {
                        "day": 1,
                        "city": "洛阳",
                        "activities": [
                            {
                                "name": "龙门石窟",
                                "description": "上午看卢舍那大佛。[3]",
                                "alternatives": [
                                    {
                                        "title": "白马寺",
                                        "description": "下午可替换为白马寺。[3]",
                                    }
                                ],
                            }
                        ],
                        "notes": "晚上吃水席。[3]",
                    }
                ],
            },
        }
    )

    result = CitationGuard().validate_and_normalize(answer, _pack())
    text = result.answer.model_dump_json()

    assert "[3]" not in text
    assert result.answer.citations == []
    assert any(
        issue.issue_type == "unknown_reference" and issue.citation_id == 3
        for issue in result.issues
    )


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


def test_citation_guard_reads_itinerary_activity_alternatives():
    answer = TravelAnswer.model_validate(
        {
            "answer": "夏夏整理好了。",
            "highlights": [],
            "warnings": [],
            "citations": ["[1] 成都川剧 - 测试来源 - internal:opera"],
            "generated_itinerary": {
                "destination": "成都",
                "itinerary": [
                    {
                        "day": 1,
                        "city": "成都",
                        "activities": [
                            {
                                "name": "夜间选择",
                                "description": "19:00 可自由安排。",
                                "alternatives": [
                                    {
                                        "title": "看变脸",
                                        "description": "晚上可以看川剧变脸演出。[1]",
                                        "citations": [1],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        }
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 成都川剧 - 测试来源 - internal:opera"],
        evidence_quotes=[
            EvidenceQuote(
                citation_id=1,
                chunk_id="opera",
                source_type="internal",
                content_type="entertainment",
                title="成都川剧",
                source_name="测试来源",
                source_ref="internal:opera",
                quote="成都川剧演出。",
            )
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert result.answer.citations == ["[1] 成都川剧 - 测试来源 - internal:opera"]
    assert result.issues == []


def test_guard_scans_dedicated_topic_sections():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="正文概览。",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "food",
                "title": "美食",
                "summary": "成都可安排本地小吃和当地人常去的餐厅。[1]",
                "recommendations": ["担担面、钟水饺适合作为轻量午餐。[2]"],
            }
        ],
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.used_citation_ids == {1, 2}
    assert result.answer.citations == [
        "[1] 来源 1 - 测试来源 - https://example.cn/1",
        "[2] 来源 2 - 测试来源 - https://example.cn/2",
    ]


def test_guard_scans_structured_topic_section_items():
    guard = CitationGuard()
    answer = TravelAnswer(
        answer="正文概览。",
        highlights=[],
        warnings=[],
        citations=[],
        topic_sections=[
            {
                "category": "entertainment",
                "title": "娱乐项目",
                "items": [
                    {
                        "title": "川剧体验",
                        "description": "成都段可把川剧变脸安排在非转场日晚间。[1]",
                        "kind": "booking_or_timing",
                        "citations": [1],
                    }
                ],
            }
        ],
    )

    result = guard.validate_and_normalize(answer, _pack())

    assert result.used_citation_ids == {1}
    assert result.answer.citations == [
        "[1] 来源 1 - 测试来源 - https://example.cn/1",
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
        answer="成都晚餐安排如下。[1]",
        highlights=[],
        warnings=[],
        citations=["[1] 铁路规则 - 12306 - internal:railway:1"],
        generated_itinerary={
            "destination": "成都",
            "itinerary": [
                {
                    "day": 1,
                    "city": "成都",
                    "activities": [
                        {
                            "name": "成都本地晚餐",
                            "category": "local_restaurant",
                            "description": "适合安排地道餐食体验。[1]",
                        }
                    ],
                }
            ],
        },
    )

    result = guard.validate_and_normalize(answer, pack)

    assert any(issue.issue_type == "source_type_mismatch" and issue.citation_id == 1 for issue in result.issues)


def test_citation_guard_flags_policy_citation_in_main_answer_claim() -> None:
    answer = TravelAnswer(
        answer="苗寨长桌宴很值得体验。[1]",
        highlights=[],
        warnings=[],
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
        evidence_quotes=[
            _quote(1, content_type="railway", source_ref="internal:rail"),
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert any(
        issue.issue_type == "source_type_mismatch" and issue.citation_id == 1
        for issue in result.issues
    )


def test_citation_guard_allows_policy_citation_in_warning() -> None:
    answer = TravelAnswer(
        answer="苗寨长桌宴建议用本地餐饮证据核验。",
        highlights=[],
        warnings=["铁路出行请注意实名制规则。[1]"],
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
    )
    pack = CitationPack(
        context_text="",
        citations=["[1] 铁路旅客运输规程 - 中国政府网 - internal:rail"],
        evidence_quotes=[
            _quote(1, content_type="railway", source_ref="internal:rail"),
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert not any(
        issue.issue_type == "source_type_mismatch" for issue in result.issues
    )


def test_citation_guard_removes_policy_citation_markers_from_highlights() -> None:
    answer = TravelAnswer(
        answer="广西路线需要重点核验交通衔接。",
        highlights=["桂林阳朔海岛联游很赶。[1]", "漓江和遇龙河体验应保留。[2]"],
        warnings=["铁路出行请注意实名制规则。[1]"],
        citations=[
            "[1] 铁路旅客运输规程 - 中国政府网 - internal:rail",
            "[2] 桂林阳朔旅行指南 - 文旅来源 - https://example.cn/guilin",
        ],
    )
    pack = CitationPack(
        context_text="",
        citations=[
            "[1] 铁路旅客运输规程 - 中国政府网 - internal:rail",
            "[2] 桂林阳朔旅行指南 - 文旅来源 - https://example.cn/guilin",
        ],
        evidence_quotes=[
            _quote(1, content_type="railway", source_ref="internal:rail"),
            _quote(2, content_type="travel_guide", source_ref="https://example.cn/guilin"),
        ],
    )

    result = CitationGuard().validate_and_normalize(answer, pack)

    assert result.answer.highlights == [
        "桂林阳朔海岛联游很赶。",
        "漓江和遇龙河体验应保留。[2]",
    ]
    assert result.answer.warnings == ["铁路出行请注意实名制规则。[1]"]
    assert result.answer.citations == [
        "[1] 铁路旅客运输规程 - 中国政府网 - internal:rail",
        "[2] 桂林阳朔旅行指南 - 文旅来源 - https://example.cn/guilin",
    ]
    assert any(
        issue.issue_type == "source_type_mismatch" and issue.citation_id == 1
        for issue in result.issues
    )
