from huaxia_tourismrag.services.topic_section_generation import (
    decide_topic_section_generation,
)


def test_topic_section_generation_falls_back_inline_without_deferred_worker():
    deep = decide_topic_section_generation(mode="async_for_deep", detail_level="deep")
    always_async = decide_topic_section_generation(mode="async", detail_level="standard")

    assert deep.generate_inline
    assert not deep.deferred
    assert deep.inline_fallback
    assert always_async.generate_inline
    assert not always_async.deferred
    assert always_async.inline_fallback


def test_topic_section_generation_defers_when_worker_is_available():
    deep = decide_topic_section_generation(
        mode="async_for_deep",
        detail_level="deep",
        deferred_worker_available=True,
    )
    standard = decide_topic_section_generation(
        mode="async_for_deep",
        detail_level="standard",
        deferred_worker_available=True,
    )
    always_async = decide_topic_section_generation(
        mode="async",
        detail_level="standard",
        deferred_worker_available=True,
    )

    assert deep.deferred
    assert not deep.generate_inline
    assert standard.generate_inline
    assert not standard.deferred
    assert always_async.deferred
    assert not always_async.generate_inline


def test_topic_section_generation_disabled_mode_turns_sections_off():
    decision = decide_topic_section_generation(mode="disabled", detail_level="deep")

    assert decision.disabled
    assert not decision.generate_inline
    assert not decision.deferred
