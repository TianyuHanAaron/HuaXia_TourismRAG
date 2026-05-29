from huaxia_tourismrag.services.evidence_source_policy import source_fit_for_task


def test_policy_sources_do_not_fit_scenic_or_food_claims() -> None:
    assert (
        source_fit_for_task(
            task_type="attraction",
            evidence_use="mainstream_attraction",
            content_type="railway",
        ).is_primary
        is False
    )
    assert (
        source_fit_for_task(
            task_type="food",
            evidence_use="local_food",
            content_type="legal",
        ).is_primary
        is False
    )


def test_destination_sources_fit_scenic_and_food_claims() -> None:
    assert (
        source_fit_for_task(
            task_type="attraction",
            evidence_use="mainstream_attraction",
            content_type="attraction",
        ).is_primary
        is True
    )
    assert (
        source_fit_for_task(
            task_type="food",
            evidence_use="local_food",
            content_type="local_cuisine",
        ).is_primary
        is True
    )


def test_policy_sources_fit_risk_and_transport_claims() -> None:
    assert (
        source_fit_for_task(
            task_type="risk",
            evidence_use="risk_warning",
            content_type="tourism_safety",
        ).is_primary
        is True
    )
    assert (
        source_fit_for_task(
            task_type="transport",
            evidence_use="route_feasibility",
            content_type="railway",
        ).is_primary
        is True
    )
