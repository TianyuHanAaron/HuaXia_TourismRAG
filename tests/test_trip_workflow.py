from datetime import datetime, time

import pytest

from huaxia_tourismrag.schemas.evidence import (
    ActivityItem,
    DailyPlan,
    TravelAnswer,
    TravelItinerary,
)
from huaxia_tourismrag.services.trip_workflow import (
    TripStateTransitionError,
    TripWorkflowError,
    approve_trip,
    build_mobile_provider_action_sheet,
    build_provider_recovery_states,
    build_offline_provider_cache_entries,
    build_calendar_events,
    build_local_transport_plan,
    build_navigation_previews,
    build_route_bundles,
    build_safety_card,
    build_weather_snapshot,
    create_trip_from_draft,
    draft_from_travel_answer,
    export_calendar_events,
    mark_provider_action_launched,
    record_provider_action_follow_up,
    update_task,
    validate_provider_action,
)
from huaxia_tourismrag.schemas.trips import (
    CalendarExportRequest,
    TripDocument,
    TripProviderActionFollowUpRequest,
    TripProviderAction,
    TripProviderActionLaunchRequest,
)


def test_draft_from_travel_answer_preserves_itinerary_and_citations():
    answer = TravelAnswer(
        answer="山西十日深度游。",
        highlights=["古建"],
        warnings=["老人儿童需要午休"],
        citations=["[1] 云冈石窟官方信息"],
        generated_itinerary=TravelItinerary(
            destination="山西",
            travelers=5,
            itinerary=[
                DailyPlan(
                    day=1,
                    city="太原",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            end_time=time(11, 30),
                            name="晋祠博物馆",
                            description="上午慢游晋祠。",
                            citations=[1],
                        )
                    ],
                )
            ],
        ),
    )

    draft = draft_from_travel_answer(answer=answer, source_job_id="job-1")

    assert draft.title == "山西"
    assert draft.destination == "山西"
    assert draft.travelers == 5
    assert draft.warnings == ["老人儿童需要午休"]
    assert draft.evidence_refs[0].citation_line == "[1] 云冈石窟官方信息"
    assert draft.milestones[0].title == "晋祠博物馆"
    assert draft.milestones[0].citation_ids == [1]


def test_approve_trip_generates_phases_tasks_and_provider_actions():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
        )
    )
    trip = create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)

    approved = approve_trip(trip)

    assert approved.status == "approved"
    assert {phase.phase_type for phase in approved.phases} >= {
        "booking",
        "daily_activities",
        "return_preparation",
    }
    assert any(task.category == "booking" for task in approved.tasks)
    assert any(action.action_type == "open_map_route" for action in approved.provider_actions)


def test_approve_trip_generates_map_action_with_route_bundle_metadata():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观。",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="八达岭长城",
                            description="下午前往。",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-provider-route",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    map_action = next(action for action in trip.provider_actions if action.action_type == "open_map_route")

    assert map_action.route_bundle_id == "route-day-1"
    assert map_action.route_origin == "北京"
    assert map_action.route_destination == "八达岭长城"
    assert map_action.route_mode == "driving"
    assert map_action.route_confidence == "medium"
    assert map_action.route_provider_id == "amap"
    assert map_action.context["route_bundle_id"] == "route-day-1"
    assert map_action.context["destination"] == "八达岭长城"
    assert map_action.deep_link.startswith("androidamap://")
    assert map_action.fallback_url.startswith("https://www.google.com/maps/dir/?api=1")


def test_approve_trip_generates_prefilled_flight_search_context():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            start_date=datetime(2026, 5, 8),
            travelers=3,
            itinerary=[],
        ),
    )
    draft = draft_from_travel_answer(answer=answer).model_copy(
        update={
            "origin_city": "天津",
            "return_city": "天津",
            "end_date": datetime(2026, 5, 12).date(),
            "preferred_airline": "中国国际航空",
        }
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-flight-ready",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    flight_action = next(
        action for action in trip.provider_actions if action.action_id == "action-flight-search"
    )

    assert flight_action.provider == "skyscanner"
    assert flight_action.flight_search_context is not None
    assert flight_action.flight_search_context.origin_city == "天津"
    assert flight_action.flight_search_context.destination_city == "北京"
    assert flight_action.flight_search_context.departure_date == datetime(2026, 5, 8).date()
    assert flight_action.flight_search_context.return_date == datetime(2026, 5, 12).date()
    assert flight_action.flight_search_context.travelers == 3
    assert flight_action.flight_search_context.preferred_airline == "中国国际航空"
    assert flight_action.flight_search_context.preferred_provider_id == "skyscanner"
    assert flight_action.flight_search_context.api_provider_id == "amadeus"
    assert flight_action.flight_search_context.validation_status == "ready"
    assert flight_action.flight_search_context.missing_fields == []
    assert str(flight_action.url).startswith("https://www.skyscanner")
    assert flight_action.fallback_url.startswith("https://www.google.com/travel/flights")
    assert flight_action.context["origin_city"] == "天津"
    assert flight_action.context["destination_city"] == "北京"
    assert flight_action.context["travelers"] == "3"
    assert flight_action.validation_status == "ready"


def test_approve_trip_marks_incomplete_flight_search_as_fallback_not_booking():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-flight-incomplete",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    flight_action = next(
        action for action in trip.provider_actions if action.action_id == "action-flight-search"
    )

    assert flight_action.flight_search_context is not None
    assert flight_action.flight_search_context.validation_status == "needs_review"
    assert set(flight_action.flight_search_context.missing_fields) == {
        "origin_city",
        "departure_date",
    }
    assert flight_action.validation_status == "needs_fallback"
    assert flight_action.available is True
    assert flight_action.reason == (
        "Flight search needs review before launch; HuaXia prepares search context but does not book tickets."
    )
    assert flight_action.flight_search_context.search_url is not None
    assert "北京" in flight_action.context["destination_city"]


def test_approve_trip_generates_prefilled_hotel_search_context():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            start_date=datetime(2026, 5, 8),
            end_date=datetime(2026, 5, 12).date(),
            travelers=3,
            budget_level="mid_range",
            itinerary=[],
        ),
    )
    draft = draft_from_travel_answer(answer=answer).model_copy(
        update={
            "lodging_area": "王府井/东单",
            "preferred_hotel_platform": "booking_com",
        }
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-hotel-ready",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    hotel_action = next(
        action for action in trip.provider_actions if action.action_id == "action-hotel-search"
    )

    assert hotel_action.provider == "booking_com"
    assert hotel_action.hotel_search_context is not None
    assert hotel_action.hotel_search_context.destination_city == "北京"
    assert hotel_action.hotel_search_context.recommended_area.area_name == "王府井/东单"
    assert hotel_action.hotel_search_context.check_in_date == datetime(2026, 5, 8).date()
    assert hotel_action.hotel_search_context.check_out_date == datetime(2026, 5, 12).date()
    assert hotel_action.hotel_search_context.guest_count == 3
    assert hotel_action.hotel_search_context.budget_level == "mid_range"
    assert hotel_action.hotel_search_context.preferred_provider_id == "booking_com"
    assert hotel_action.hotel_search_context.validation_status == "ready"
    assert hotel_action.hotel_search_context.missing_fields == []
    assert str(hotel_action.url).startswith("https://www.booking.com/searchresults.html")
    assert hotel_action.fallback_url.startswith("https://www.google.com/travel/hotels")
    assert hotel_action.context["lodging_area"] == "王府井/东单"
    assert hotel_action.context["guest_count"] == "3"
    assert hotel_action.validation_status == "ready"


def test_approve_trip_marks_incomplete_hotel_search_as_fallback_not_availability():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-hotel-incomplete",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    hotel_action = next(
        action for action in trip.provider_actions if action.action_id == "action-hotel-search"
    )

    assert hotel_action.hotel_search_context is not None
    assert hotel_action.hotel_search_context.validation_status == "needs_review"
    assert set(hotel_action.hotel_search_context.missing_fields) == {
        "check_in_date",
        "check_out_date",
    }
    assert hotel_action.validation_status == "needs_fallback"
    assert hotel_action.available is True
    assert hotel_action.reason == (
        "Hotel search needs review before launch; HuaXia prepares search context but does not confirm availability."
    )
    assert hotel_action.hotel_search_context.search_url is not None
    assert hotel_action.context["destination_city"] == "北京"


def test_calendar_export_action_uses_expo_calendar_with_ics_fallback_context():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2026, 5, 8),
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                end_time=time(11, 0),
                                name="故宫博物院",
                                description="上午参观。",
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-calendar-action",
            tenant_id="tenant-a",
            draft=draft,
        )
    )
    trip.draft.milestones[0].date = datetime(2026, 5, 8).date()

    calendar_action = next(
        action for action in trip.provider_actions if action.action_id == "action-calendar-export"
    )
    events = build_calendar_events(trip, timezone="Asia/Shanghai")

    assert calendar_action.provider == "expo_calendar"
    assert calendar_action.requires_external_target is False
    assert calendar_action.calendar_export_context is not None
    assert calendar_action.calendar_export_context.provider_id == "expo_calendar"
    assert calendar_action.calendar_export_context.fallback_target == "ics"
    assert calendar_action.calendar_export_context.requires_user_confirmation is True
    assert calendar_action.context["fallback_target"] == "ics"
    assert events[0].provider_id == "expo_calendar"
    assert events[0].fallback_target == "ics"
    assert events[0].timezone == "Asia/Shanghai"
    assert events[0].reminder_offsets_minutes == [30]
    assert events[0].selected_by_default is True


def test_device_calendar_export_records_provider_without_ics_payload():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2026, 5, 8),
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                name="故宫博物院",
                                description="上午参观。",
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-calendar-device",
            tenant_id="tenant-a",
            draft=draft,
        )
    )
    event_ids = [event.event_id for event in build_calendar_events(trip)]

    trip, response = export_calendar_events(
        trip,
        CalendarExportRequest(
            event_ids=event_ids[:1],
            target="device_calendar",
            timezone="Asia/Shanghai",
            provider_id="expo_calendar",
        ),
    )

    assert response.provider_id == "expo_calendar"
    assert response.fallback_target == "ics"
    assert response.requires_device_permission is True
    assert response.ics_content is None
    assert response.events[0].provider_id == "expo_calendar"
    assert trip.audit_events[-1].metadata["provider_id"] == "expo_calendar"
    assert trip.audit_events[-1].metadata["fallback_target"] == "ics"


def test_weather_snapshot_maps_weather_warnings_to_operational_task_impacts():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="川西十二日高原湖泊线。",
            highlights=[],
            warnings=["九月高原昼夜温差大，午后可能降雨；海拔较高，需预防高反。"],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="川西",
                start_date=datetime(2026, 9, 26),
                travelers=2,
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="康定",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                name="木格措高原湖泊徒步",
                                description="高海拔湖泊慢行。",
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-weather",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    snapshot = build_weather_snapshot(
        trip,
        provider_id="weatherapi",
        now=datetime(2026, 9, 20),
    )
    weather_action = next(
        action for action in trip.provider_actions if action.action_id == "action-weather"
    )

    assert snapshot.provider.provider_id == "weatherapi"
    assert snapshot.fallback_provider_id == "openweather"
    assert snapshot.location == "川西"
    assert snapshot.status == "needs_provider_fetch"
    assert snapshot.stale is True
    assert {alert.alert_type for alert in snapshot.alerts} >= {"rain", "altitude"}
    assert any("rain gear" in impact.recommended_task_update.lower() for impact in snapshot.task_impacts)
    assert any(impact.task_id == "task-prepare-packing" for impact in snapshot.task_impacts)
    assert any(impact.task_id == "task-review-safety" for impact in snapshot.task_impacts)
    assert weather_action.provider == "weatherapi"
    assert weather_action.weather_snapshot is not None
    assert weather_action.weather_snapshot.alerts
    assert weather_action.context["provider_id"] == "weatherapi"


def test_weather_snapshot_marks_far_future_forecast_unavailable_but_keeps_operational_caution():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=["夏季高温时避免正午户外暴晒。"],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2035, 8, 1),
                itinerary=[],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-weather-far-future",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    snapshot = build_weather_snapshot(trip, now=datetime(2026, 6, 6))

    assert snapshot.status == "forecast_unavailable"
    assert snapshot.stale is True
    assert snapshot.stale_reason == "Forecast window is too far in the future."
    assert any(alert.alert_type == "heat" for alert in snapshot.alerts)


def test_domestic_safety_card_uses_china_medical_provider_and_source_labels():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-safety-cn",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="北京五日游。",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
                )
            ),
        )
    )

    card = build_safety_card(trip)

    hospital_action = next(
        action for action in card.emergency_actions if action.action_id == "safety-hospital-search"
    )
    assert card.is_international is False
    assert {"110", "120", "119"}.issubset(set(card.emergency_numbers))
    assert hospital_action.provider_id == "amap"
    assert hospital_action.url is not None and "amap" in hospital_action.url
    assert hospital_action.requires_network is True
    assert any(
        source.provider_id == "amap" and source.domain == "medical_search"
        for source in card.provider_sources
    )
    assert any(
        source.domain == "emergency_numbers" and source.offline_available
        for source in card.provider_sources
    )


def test_international_safety_card_includes_embassy_entry_and_stale_risk_sources():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-safety-intl",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="Tokyo trip.",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="Tokyo, Japan", itinerary=[]),
                )
            ),
        )
    )

    card = build_safety_card(trip)

    assert card.is_international is True
    assert card.embassy is not None
    assert card.embassy.provider_id == "google_search"
    assert card.entry_requirements is not None
    assert card.entry_requirements.provider_id == "sherpa"
    assert "sherpa" in card.entry_requirements.source_url.lower()
    assert card.risk_advisory.provider_id == "riskline"
    assert card.risk_advisory.status == "needs_provider_fetch"
    assert card.risk_advisory.stale is True
    assert any(
        source.provider_id == "sherpa" and source.domain == "entry_requirements"
        for source in card.provider_sources
    )
    assert any(source.provider_id == "riskline" and source.stale for source in card.provider_sources)


def test_local_transport_plan_uses_taxi_first_for_china_group_route_with_rain():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=["午后可能降雨，老人儿童同行。"],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2026, 9, 26),
                travelers=4,
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                name="故宫博物院",
                                description="上午参观。",
                            ),
                            ActivityItem(
                                start_time=time(14, 0),
                                name="八达岭长城",
                                description="下午包车前往。",
                            ),
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-local-transport",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    plan = build_local_transport_plan(trip)
    transport_action = next(
        action for action in trip.provider_actions if action.action_id == "action-transport-booking"
    )

    assert plan.provider_id == "amap_local_transport"
    assert plan.route_bundle_id == "route-day-1"
    assert plan.origin == "北京"
    assert plan.destination == "八达岭长城"
    assert plan.primary_option.mode == "taxi"
    assert plan.primary_option.provider_id == "amap_local_transport"
    assert plan.primary_option.launch_url.startswith("androidamap://")
    assert any(option.mode == "transit" for option in plan.alternative_options)
    assert "rain" in plan.weather_alert_ids
    assert transport_action.provider == "amap_local_transport"
    assert transport_action.local_transport_plan is not None
    assert transport_action.local_transport_plan.primary_option.mode == "taxi"
    assert transport_action.context["primary_mode"] == "taxi"
    assert transport_action.validation_status == "ready"


def test_document_upload_action_is_metadata_only_and_sensitive():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
        )
    )
    trip = approve_trip(create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft))

    action = next(action for action in trip.provider_actions if action.action_id == "action-upload-document")

    assert action.provider == "local_document_parser"
    assert action.data_sensitivity == "sensitive"
    assert action.requires_external_target is False
    assert action.document_import_context is not None
    assert action.document_import_context.provider_id == "local_document_parser"
    assert action.document_import_context.metadata_only_default is True
    assert action.document_import_context.prompt_excluded_by_default is True
    assert "manual_booking_entry" in action.document_import_context.fallback_provider_ids


def test_local_transport_plan_uses_global_ride_hail_for_international_route():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="Tokyo trip.",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="Tokyo",
                travelers=2,
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="Tokyo",
                        activities=[
                            ActivityItem(name="Tokyo Station", description="Arrive."),
                            ActivityItem(name="Shibuya", description="Evening walk."),
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-global-transport",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    plan = build_local_transport_plan(trip)

    assert plan.provider_id == "uber"
    assert plan.primary_option.mode == "taxi"
    assert plan.primary_option.provider_id == "uber"
    assert plan.primary_option.launch_url.startswith("https://m.uber.com/ul/")
    assert any(option.provider_id == "google_maps_transit" for option in plan.alternative_options)


def test_approve_trip_prefers_known_official_attraction_ticket_link():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            start_date=datetime(2026, 5, 8),
            travelers=3,
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观故宫。",
                        )
                    ],
                )
            ],
        ),
    )
    draft = draft_from_travel_answer(answer=answer).model_copy(
        update={
            "official_attraction_links": [
                {
                    "attraction_name": "故宫博物院",
                    "url": "https://www.dpm.org.cn/Home.html",
                    "source": "user",
                    "time_slot_required": True,
                    "identity_document_required": True,
                }
            ]
        }
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-ticket-official",
            tenant_id="tenant-a",
            draft=draft,
        )
    )

    ticket_action = next(
        action for action in trip.provider_actions if action.action_id == "action-ticket-site"
    )

    assert ticket_action.provider == "official_attraction"
    assert ticket_action.ticket_requirement is not None
    assert ticket_action.ticket_requirement.attraction_name == "故宫博物院"
    assert ticket_action.ticket_requirement.destination_city == "北京"
    assert ticket_action.ticket_requirement.visit_date == datetime(2026, 5, 8).date()
    assert ticket_action.ticket_requirement.visit_time == time(9, 0)
    assert ticket_action.ticket_requirement.visitor_count == 3
    assert ticket_action.ticket_requirement.time_slot_required is True
    assert ticket_action.ticket_requirement.identity_document_required is True
    assert ticket_action.ticket_requirement.official_link is not None
    assert str(ticket_action.url) == "https://www.dpm.org.cn/Home.html"
    assert ticket_action.fallback_url.startswith("https://www.viator.com/searchResults")
    assert ticket_action.context["attraction_name"] == "故宫博物院"
    assert ticket_action.validation_status == "ready"


def test_approve_trip_uses_viator_for_global_ticket_search_without_official_link():
    answer = TravelAnswer(
        answer="Tokyo five day trip.",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="Tokyo",
            start_date=datetime(2026, 5, 8),
            travelers=2,
            itinerary=[
                DailyPlan(
                    day=1,
                    city="Tokyo",
                    activities=[
                        ActivityItem(
                            start_time=time(10, 0),
                            name="Tokyo Skytree",
                            description="Visit the observation deck.",
                        )
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-ticket-viator",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    ticket_action = next(
        action for action in trip.provider_actions if action.action_id == "action-ticket-site"
    )

    assert ticket_action.provider == "viator"
    assert ticket_action.ticket_requirement is not None
    assert ticket_action.ticket_requirement.attraction_name == "Tokyo Skytree"
    assert ticket_action.ticket_requirement.validation_status == "needs_review"
    assert ticket_action.ticket_requirement.confidence == "provider_search"
    assert str(ticket_action.url).startswith("https://www.viator.com/searchResults")
    assert ticket_action.validation_status == "needs_fallback"
    assert ticket_action.available is True


def test_executable_task_engine_generates_actionable_category_complete_tasks():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=["长城日需要包车。"],
            citations=["[1] 北京旅游来源"],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                start_time=time(9, 0),
                                end_time=time(11, 30),
                                name="故宫博物院",
                                description="上午参观故宫。",
                                citations=[1],
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )

    categories = {task.category for task in trip.tasks}
    expected = {
        "booking",
        "document",
        "packing",
        "transport",
        "lodging",
        "ticket",
        "activity",
        "food_reservation",
        "safety",
        "return",
        "custom",
    }

    assert expected.issubset(categories)
    assert len({task.task_id for task in trip.tasks}) == len(trip.tasks)
    assert all(task.title and task.instruction and task.phase_type for task in trip.tasks)
    assert any(task.provider_action_ids for task in trip.tasks)
    assert any(task.priority == "urgent" for task in trip.tasks)
    assert any(event.event_type == "task_added" for event in trip.audit_events)


def test_skipping_ticket_check_unblocks_downstream_activity_when_safe():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[ActivityItem(name="故宫博物院", description="上午参观。")],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    activity_task = next(task for task in trip.tasks if task.category == "activity")
    assert activity_task.status == "blocked"

    trip = update_task(trip, "task-check-tickets", updates={"status": "skipped"})
    activity_task = next(task for task in trip.tasks if task.category == "activity")

    assert activity_task.status == "pending"
    assert activity_task.blocked_reason is None


def test_invalid_task_transition_is_rejected_after_completion():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    completed_task = next(task for task in trip.tasks if task.status == "completed")

    with pytest.raises(Exception):
        update_task(
            trip,
            completed_task.task_id,
            updates={"status": "pending"},
        )


def test_provider_action_validation_marks_missing_external_target_unavailable():
    action = TripProviderAction(
        action_id="action-broken",
        action_type="open_hotel_search",
        label="Search hotel",
        provider="booking",
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "A provider URL or deep link is required before launch."


def test_provider_action_validation_requires_declared_context():
    action = TripProviderAction(
        action_id="action-missing-context",
        action_type="open_map_route",
        label="Open planned route",
        provider="amap",
        url="https://example.com/route",
        required_context=["origin", "destination"],
        context={"origin": "Hotel"},
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "Missing provider action context: destination."
    assert validated.validation_errors == ["missing_context:destination"]


def test_provider_action_validation_blocks_disabled_provider():
    action = TripProviderAction(
        action_id="action-disabled-provider",
        action_type="open_flight_search",
        label="Book with Duffel",
        provider="duffel",
        url="https://example.com/flights",
        fallback_url="https://www.google.com/travel/flights",
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "Provider duffel is disabled."
    assert validated.validation_errors == ["provider_disabled:duffel"]


def test_provider_action_validation_blocks_region_unsupported_provider():
    action = TripProviderAction(
        action_id="action-wrong-region",
        action_type="open_map_route",
        label="Open Amap route",
        provider="amap",
        url="https://uri.amap.com/navigation",
        fallback_url="https://www.google.com/maps/dir/?api=1",
        context={"route_region": "international"},
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "Provider amap does not support region: international."
    assert validated.validation_errors == ["provider_region_unsupported:amap:international"]


def test_provider_action_validation_rejects_malformed_fallback_and_deep_link():
    malformed_fallback = TripProviderAction(
        action_id="action-bad-fallback",
        action_type="open_ticket_site",
        label="Open ticket fallback",
        provider="viator",
        fallback_url="not a url",
    )
    malformed_deep_link = TripProviderAction(
        action_id="action-bad-deep-link",
        action_type="open_map_route",
        label="Open route app",
        provider="google_maps",
        deep_link="googlemaps",
        fallback_url="https://www.google.com/maps/dir/?api=1",
    )

    fallback_validated = validate_provider_action(malformed_fallback)
    deep_link_validated = validate_provider_action(malformed_deep_link)

    assert fallback_validated.available is False
    assert fallback_validated.validation_errors == ["invalid_fallback_url"]
    assert deep_link_validated.available is False
    assert deep_link_validated.validation_errors == ["invalid_deep_link"]


def test_provider_action_validation_demotes_primary_action_without_fallback():
    action = TripProviderAction(
        action_id="action-no-fallback",
        action_type="open_hotel_search",
        label="Search hotel",
        provider="booking_com",
        url="https://www.booking.com/searchresults.html",
    )

    validated = validate_provider_action(action)

    assert validated.available is True
    assert validated.validation_status == "needs_fallback"
    assert validated.validation_errors == ["missing_fallback_target"]


def test_provider_action_validation_demotes_low_confidence_and_stale_sources():
    low_confidence_route = TripProviderAction(
        action_id="action-low-confidence-route",
        action_type="open_map_route",
        label="Open route",
        provider="google_maps",
        url="https://www.google.com/maps/dir/?api=1",
        fallback_url="https://www.google.com/maps/search/?api=1&query=Hotel",
        route_confidence="low",
    )
    stale_ticket = TripProviderAction(
        action_id="action-stale-ticket",
        action_type="open_ticket_site",
        label="Open official ticket",
        provider="official_attraction",
        url="https://example.com/tickets",
        fallback_url="https://www.viator.com/searchResults/all",
        context={"source_stale": "true"},
    )

    route_validated = validate_provider_action(low_confidence_route)
    stale_validated = validate_provider_action(stale_ticket)

    assert route_validated.available is True
    assert route_validated.validation_status == "needs_fallback"
    assert "route_confidence_low" in route_validated.validation_errors
    assert stale_validated.available is True
    assert stale_validated.validation_status == "needs_fallback"
    assert "source_stale" in stale_validated.validation_errors


def test_provider_action_validation_blocks_unconfirmed_sensitive_external_handoff():
    action = TripProviderAction(
        action_id="action-sensitive-external",
        action_type="open_hotel_search",
        label="Open booking with passport data",
        provider="booking_com",
        url="https://www.booking.com/searchresults.html",
        fallback_url="https://www.google.com/travel/hotels",
        data_sensitivity="sensitive",
    )

    validated = validate_provider_action(action)

    assert validated.available is False
    assert validated.validation_status == "unavailable"
    assert validated.unavailable_reason == "Sensitive provider handoff requires explicit user confirmation."
    assert validated.validation_errors == ["sensitive_handoff_unconfirmed"]


def test_provider_action_launch_rejects_disallowed_launch_channel():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-manual-only",
            action_type="upload_document",
            label="Attach document",
            provider="document_vault",
            requires_external_target=False,
            allowed_launch_channels=["manual_done"],
        )
    )

    with pytest.raises(TripWorkflowError, match="launch channel app is not allowed"):
        mark_provider_action_launched(
            trip,
            "action-manual-only",
            request=TripProviderActionLaunchRequest(launch_channel="app"),
        )


def test_provider_action_launch_records_fallback_and_manual_audit_metadata():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-fallback-only",
            action_type="open_ticket_site",
            label="Open ticket fallback",
            provider="official_ticket_sources",
            fallback_url="https://example.com/tickets",
        )
    )

    launched = mark_provider_action_launched(
        trip,
        "action-fallback-only",
        request=TripProviderActionLaunchRequest(
            launch_channel="fallback_browser",
            client_event_id="client-1",
        ),
    )
    action = next(
        action for action in launched.provider_actions if action.action_id == "action-fallback-only"
    )
    event = launched.audit_events[-1]

    assert action.launched_at is not None
    assert action.last_launch_channel == "fallback_browser"
    assert action.last_target_url == "https://example.com/tickets"
    assert event.event_type == "provider_action_launched"
    assert event.metadata["launch_channel"] == "fallback_browser"
    assert event.metadata["target_url"] == "https://example.com/tickets"
    assert event.metadata["client_event_id"] == "client-1"
    assert event.metadata["validation_status"] == "needs_fallback"
    assert event.metadata["data_sensitivity"] == "public"

    manually_handled = mark_provider_action_launched(
        launched,
        "action-upload-document",
        request=TripProviderActionLaunchRequest(launch_channel="manual_done"),
    )
    handled_action = next(
        action
        for action in manually_handled.provider_actions
        if action.action_id == "action-upload-document"
    )

    assert handled_action.handled_at is not None
    assert handled_action.last_launch_channel == "manual_done"


def test_sensitive_provider_action_launch_redacts_audit_target_url():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="Tokyo trip.", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-sensitive-url", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-sensitive-provider",
            action_type="open_hotel_search",
            label="Open booking with traveler context",
            provider="booking_com",
            url="https://example.com/search?email=user@example.com&confirmation_code=ABC123",
            data_sensitivity="sensitive",
            context={"user_confirmed_sensitive_handoff": "true"},
        )
    )

    launched = mark_provider_action_launched(
        trip,
        "action-sensitive-provider",
        request=TripProviderActionLaunchRequest(
            launch_channel="browser",
            target_url="https://example.com/search?email=user@example.com&confirmation_code=ABC123",
            client_event_id="sensitive-url-1",
        ),
    )
    action = next(
        action
        for action in launched.provider_actions
        if action.action_id == "action-sensitive-provider"
    )
    event = launched.audit_events[-1]

    assert action.last_target_url == (
        "https://example.com/search?email=user@example.com&confirmation_code=ABC123"
    )
    assert event.metadata["target_url"] == "[redacted:sensitive_provider_url]"
    assert event.metadata["target_url_redacted"] == "true"
    assert "user@example.com" not in str(event.metadata)
    assert "ABC123" not in str(event.metadata)


def test_provider_action_follow_up_completes_linked_task_and_exposes_recovery_state():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    action_id = "action-hotel-search"
    lodging_task = next(task for task in trip.tasks if action_id in task.provider_action_ids)

    launched = mark_provider_action_launched(
        trip,
        action_id,
        request=TripProviderActionLaunchRequest(
            launch_channel="browser",
            client_event_id="launch-1",
        ),
    )
    launched_action = next(action for action in launched.provider_actions if action.action_id == action_id)
    states = build_provider_recovery_states(launched)
    state = next(state for state in states.states if state.action_id == action_id)

    assert launched_action.recovery_status == "needs_follow_up"
    assert launched_action.last_launch_result == "launched"
    assert launched_action.follow_up_prompt_at is not None
    assert state.recovery_status == "needs_follow_up"
    assert state.recovery_options == [
        "completed",
        "attach_confirmation",
        "try_another",
        "failed",
        "remind_later",
    ]

    completed = record_provider_action_follow_up(
        launched,
        action_id,
        TripProviderActionFollowUpRequest(
            outcome="completed",
            task_id=lodging_task.task_id,
            client_event_id="follow-up-1",
        ),
    )
    completed_action = next(action for action in completed.provider_actions if action.action_id == action_id)
    completed_task = next(task for task in completed.tasks if task.task_id == lodging_task.task_id)
    event = completed.audit_events[-1]

    assert completed_action.recovery_status == "completed"
    assert completed_action.last_launch_result == "completed"
    assert completed_action.handled_at is not None
    assert completed_task.status == "completed"
    assert event.event_type == "provider_action_recovered"
    assert event.metadata["follow_up_outcome"] == "completed"
    assert event.metadata["client_event_id"] == "follow-up-1"


def test_provider_action_failed_follow_up_is_retryable_without_completing_task():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    action_id = "action-ticket-site"
    ticket_task = next(task for task in trip.tasks if action_id in task.provider_action_ids)
    launched = mark_provider_action_launched(
        trip,
        action_id,
        request=TripProviderActionLaunchRequest(launch_channel="fallback_browser"),
    )

    failed = record_provider_action_follow_up(
        launched,
        action_id,
        TripProviderActionFollowUpRequest(
            outcome="failed",
            failure_reason="Official page returned 404",
            task_id=ticket_task.task_id,
        ),
    )
    failed_action = next(action for action in failed.provider_actions if action.action_id == action_id)
    still_pending_task = next(task for task in failed.tasks if task.task_id == ticket_task.task_id)
    state = next(
        state for state in build_provider_recovery_states(failed).states if state.action_id == action_id
    )
    event = failed.audit_events[-1]

    assert failed_action.recovery_status == "retry_available"
    assert failed_action.last_launch_result == "failed"
    assert failed_action.failure_reason == "Official page returned 404"
    assert still_pending_task.status == "pending"
    assert state.recovery_status == "retry_available"
    assert "try_another" in state.recovery_options
    assert event.event_type == "provider_action_failed"
    assert event.metadata["failure_reason"] == "Official page returned 404"


def test_mobile_provider_action_sheet_compacts_hotel_action_for_bottom_sheet():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                start_date=datetime(2026, 9, 26),
                end_date=datetime(2026, 9, 30),
                travelers=2,
                itinerary=[],
            ),
        )
    )
    trip = approve_trip(create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft))

    sheet = build_mobile_provider_action_sheet(trip, "action-hotel-search")

    assert sheet.action_id == "action-hotel-search"
    assert sheet.title == "Search lodging"
    assert sheet.recommended_provider_id == "booking_com"
    assert sheet.validation_status == "ready"
    assert sheet.primary_action.launch_channel == "browser"
    assert sheet.primary_action.disabled is False
    assert sheet.primary_action.target_url is not None
    assert any(option.launch_channel == "fallback_browser" for option in sheet.alternative_actions)
    assert [option.launch_channel for option in sheet.recovery_actions] == [
        "manual_done",
        "remind_later",
    ]
    assert any(row.key == "recommended_area" for row in sheet.context_rows)


def test_mobile_provider_action_sheet_makes_low_confidence_context_obvious():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-1",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-low-confidence-route",
            action_type="open_map_route",
            label="Open route",
            provider="google_maps",
            url="https://www.google.com/maps/dir/?api=1",
            fallback_url="https://www.google.com/maps/search/?api=1&query=Hotel",
            route_confidence="low",
            route_origin="Hotel",
            route_destination="Temple",
        )
    )

    sheet = build_mobile_provider_action_sheet(trip, "action-low-confidence-route")

    assert sheet.validation_status == "needs_fallback"
    assert sheet.requires_correction is True
    assert sheet.correction_prompt == "Review route confidence before launching."
    assert any(row.key == "validation_errors" and "route_confidence_low" in row.value for row in sheet.context_rows)
    assert sheet.primary_action.launch_channel == "fallback_browser"


def test_mobile_provider_action_sheet_blocks_unavailable_primary_action():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-1",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-unavailable",
            action_type="open_ticket_site",
            label="Open ticket",
            provider="viator",
        )
    )

    sheet = build_mobile_provider_action_sheet(trip, "action-unavailable")

    assert sheet.available is False
    assert sheet.validation_status == "unavailable"
    assert sheet.requires_correction is True
    assert sheet.primary_action.disabled is True
    assert sheet.primary_action.label == "Fix missing provider context"
    assert sheet.recovery_actions[-1].launch_channel == "remind_later"


def test_mobile_provider_action_sheet_allows_controlled_in_app_browser_surface():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-1",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-controlled-guide",
            action_type="open_local_guide",
            label="Open local guide",
            provider="official_city_guide",
            url="https://example.com/beijing-guide",
            allowed_launch_channels=[
                "in_app_browser",
                "browser",
                "manual_done",
                "remind_later",
            ],
            webview_policy="allowed",
            webview_policy_reason="Official guide page does not require login, checkout, or payment.",
        )
    )

    sheet = build_mobile_provider_action_sheet(trip, "action-controlled-guide")

    assert sheet.primary_action.launch_channel == "in_app_browser"
    assert sheet.primary_action.launch_surface == "in_app_browser"
    assert sheet.primary_action.target_url == "https://example.com/beijing-guide"
    assert any(row.key == "webview_policy" and row.value == "allowed" for row in sheet.context_rows)


def test_mobile_provider_action_sheet_forces_sensitive_checkout_to_external_browser():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-1",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-payment-checkout",
            action_type="open_ticket_site",
            label="Open checkout",
            provider="ticket_provider",
            url="https://example.com/checkout",
            fallback_url="https://example.com/tickets",
            allowed_launch_channels=[
                "in_app_browser",
                "browser",
                "fallback_browser",
                "manual_done",
                "remind_later",
            ],
            data_sensitivity="personal",
            context={"flow_type": "payment"},
        )
    )

    sheet = build_mobile_provider_action_sheet(trip, "action-payment-checkout")

    assert sheet.primary_action.launch_channel == "browser"
    assert sheet.primary_action.launch_surface == "external_browser"
    assert all(option.launch_channel != "in_app_browser" for option in sheet.alternative_actions)
    assert any(
        row.key == "webview_policy"
        and row.value == "external_only"
        and row.status == "warning"
        for row in sheet.context_rows
    )


def test_provider_action_launch_records_in_app_browser_without_completing_task():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-1",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-controlled-guide",
            action_type="open_local_guide",
            label="Open local guide",
            provider="official_city_guide",
            url="https://example.com/beijing-guide",
            allowed_launch_channels=[
                "in_app_browser",
                "browser",
                "manual_done",
                "remind_later",
            ],
            webview_policy="allowed",
        )
    )

    launched = mark_provider_action_launched(
        trip,
        "action-controlled-guide",
        request=TripProviderActionLaunchRequest(launch_channel="in_app_browser"),
    )
    action = next(
        action
        for action in launched.provider_actions
        if action.action_id == "action-controlled-guide"
    )
    event = launched.audit_events[-1]

    assert action.last_launch_channel == "in_app_browser"
    assert action.recovery_status == "needs_follow_up"
    assert action.handled_at is None
    assert event.metadata["launch_channel"] == "in_app_browser"


def test_offline_provider_cache_entries_label_network_and_stale_context():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=["午后可能降雨，户外活动需带雨具。"],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            start_date=datetime(2035, 8, 1),
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观。",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="八达岭长城",
                            description="下午前往。",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-offline-cache",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    entries, stale_banners, excluded_document_ids = build_offline_provider_cache_entries(
        trip,
        now=datetime(2026, 6, 6),
    )

    route_entry = next(entry for entry in entries if entry.entry_type == "route_summary")
    action_entry = next(
        entry
        for entry in entries
        if entry.entry_type == "provider_action" and entry.action_id == "action-hotel-search"
    )
    weather_entry = next(entry for entry in entries if entry.entry_type == "weather_snapshot")

    assert route_entry.available_offline is True
    assert route_entry.requires_network is False
    assert route_entry.route_bundle_id == "route-day-1"
    assert action_entry.requires_network is True
    assert action_entry.available_offline is True
    assert weather_entry.stale is True
    assert weather_entry.stale_reason
    assert any("weather" in banner.lower() for banner in stale_banners)
    assert excluded_document_ids == []


def test_offline_provider_cache_entries_exclude_sensitive_document_storage():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-offline-doc",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
            ),
        )
    )
    trip.documents.append(
        TripDocument(
            document_id="doc-passport",
            category="id_passport",
            title="Passport copy",
            storage_ref="s3://private/passport.pdf",
            local_reference="file:///private/passport.pdf",
            sensitive=True,
        )
    )

    entries, _, excluded_document_ids = build_offline_provider_cache_entries(trip)

    assert "doc-passport" in excluded_document_ids
    assert all(entry.document_id != "doc-passport" for entry in entries)
    assert all("passport.pdf" not in (entry.summary or "") for entry in entries)


def test_provider_action_launch_rejects_unavailable_action():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    trip.provider_actions.append(
        TripProviderAction(
            action_id="action-broken",
            action_type="open_hotel_search",
            label="Search hotel",
            provider="booking",
        )
    )

    with pytest.raises(TripWorkflowError, match="provider URL or deep link"):
        mark_provider_action_launched(trip, "action-broken")


def test_route_bundle_exposes_v3_handoff_context_and_provider_selection():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    date=datetime(2026, 9, 26),
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观。",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="八达岭长城",
                            description="下午包车前往。",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-route",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    bundle = build_route_bundles(trip)[0]

    assert bundle.route_bundle_id == bundle.route_id
    assert bundle.trip_id == "trip-route"
    assert bundle.task_id == "task-activity-m-1-2"
    assert bundle.origin == "北京"
    assert bundle.destination == "八达岭长城"
    assert bundle.waypoints == ["故宫博物院"]
    assert bundle.coordinates == []
    assert bundle.travel_mode == "driving"
    assert bundle.planned_departure_time is not None
    assert bundle.provider_id == "amap"
    assert bundle.launch_url == bundle.provider_urls["amap"]
    assert bundle.deep_link_url.startswith("androidamap://")
    assert bundle.fallback_url
    assert bundle.source == "workflow"
    assert bundle.validation_status == "ready"


def test_route_bundle_overview_is_low_confidence_when_only_destination_is_known():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-overview",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="北京五日游。",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
                )
            ),
        )
    )

    bundle = build_route_bundles(trip)[0]

    assert bundle.route_bundle_id == "route-overview"
    assert bundle.trip_id == "trip-overview"
    assert bundle.task_id is None
    assert bundle.provider_id == "amap"
    assert bundle.travel_mode == "mixed"
    assert bundle.confidence == "low"
    assert bundle.validation_status == "needs_review"
    assert bundle.handoff_ready is False
    assert bundle.unavailable_reason == "At least two route points are required before turn-by-turn navigation."


def test_map_provider_selection_keeps_china_routes_on_amap_despite_google_preference():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观。",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="八达岭长城",
                            description="下午前往。",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-map-cn",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    bundle = build_route_bundles(
        trip,
        preferred_provider_id="google_maps",
        device_platform="web",
    )[0]

    assert bundle.provider_id == "amap"
    assert bundle.route_region == "china"
    assert bundle.provider_selection_reason == "regional reliability requires Amap for China routes"
    assert bundle.launch_url == bundle.provider_urls["amap"]
    assert "amap" in bundle.available_provider_ids
    assert "google_maps" in bundle.available_provider_ids


def test_map_provider_selection_allows_apple_maps_preference_on_ios_international_route():
    answer = TravelAnswer(
        answer="Tokyo trip.",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="Tokyo",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="Tokyo",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="Tokyo Station",
                            description="Morning visit.",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="Shibuya",
                            description="Afternoon visit.",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-map-ios",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    bundle = build_route_bundles(
        trip,
        preferred_provider_id="apple_maps",
        device_platform="ios",
    )[0]

    assert bundle.provider_id == "apple_maps"
    assert bundle.route_region == "international"
    assert bundle.launch_url == bundle.provider_urls["apple_maps"]
    assert "apple_maps" in bundle.available_provider_ids
    assert bundle.provider_selection_reason == "preferred provider selected"


def test_map_provider_selection_excludes_apple_native_option_on_android():
    answer = TravelAnswer(
        answer="Tokyo trip.",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="Tokyo",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="Tokyo",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="Tokyo Station",
                            description="Morning visit.",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="Shibuya",
                            description="Afternoon visit.",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-map-android",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    bundle = build_route_bundles(trip, device_platform="android")[0]

    assert bundle.provider_id == "google_maps"
    assert "apple_maps" not in bundle.available_provider_ids
    assert "google_maps" in bundle.available_provider_ids


def test_mapbox_preference_uses_mapbox_for_preview_not_primary_execution():
    answer = TravelAnswer(
        answer="Tokyo trip.",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="Tokyo",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="Tokyo",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="Tokyo Station",
                            description="Morning visit.",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="Shibuya",
                            description="Afternoon visit.",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-mapbox-preview",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    bundle = build_route_bundles(
        trip,
        preferred_provider_id="mapbox",
        device_platform="web",
    )[0]

    assert bundle.provider_id == "google_maps"
    assert bundle.preview_provider_id == "mapbox"
    assert bundle.provider_selection_reason == "Mapbox reserved for preview; Google Maps selected for execution"
    assert "mapbox" in bundle.available_provider_ids


def test_navigation_preview_exposes_mobile_handoff_actions_for_ready_route():
    answer = TravelAnswer(
        answer="北京五日游。",
        highlights=[],
        warnings=[],
        citations=[],
        generated_itinerary=TravelItinerary(
            destination="北京",
            itinerary=[
                DailyPlan(
                    day=1,
                    city="北京",
                    activities=[
                        ActivityItem(
                            start_time=time(9, 0),
                            name="故宫博物院",
                            description="上午参观。",
                        ),
                        ActivityItem(
                            start_time=time(14, 0),
                            name="八达岭长城",
                            description="下午前往。",
                        ),
                    ],
                )
            ],
        ),
    )
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-nav-preview",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(answer=answer),
        )
    )

    preview = build_navigation_previews(
        trip,
        preferred_provider_id="google_maps",
        device_platform="ios",
    )[0]

    assert preview.route_bundle_id == "route-day-1"
    assert preview.origin == "北京"
    assert preview.destination == "八达岭长城"
    assert preview.provider_id == "amap"
    assert preview.provider_display_name == "Amap / 高德地图"
    assert preview.travel_mode == "driving"
    assert preview.route_summary == "北京 -> 故宫博物院 -> 八达岭长城"
    assert preview.confidence == "medium"
    assert preview.validation_status == "ready"
    assert preview.primary_action.launch_channel == "app"
    assert preview.primary_action.target_url.startswith("iosamap://")
    assert preview.browser_fallback_action.launch_channel == "fallback_browser"
    assert preview.browser_fallback_action.target_url.startswith("https://www.google.com/maps")
    assert preview.copy_destination_action.value == "八达岭长城"
    assert preview.manual_completion_action.launch_channel == "manual_done"
    assert preview.remind_later_action.launch_channel == "remind_later"
    assert preview.requires_correction is False


def test_navigation_preview_prompts_correction_for_low_confidence_overview_route():
    trip = approve_trip(
        create_trip_from_draft(
            trip_id="trip-nav-low-confidence",
            tenant_id="tenant-a",
            draft=draft_from_travel_answer(
                answer=TravelAnswer(
                    answer="北京五日游。",
                    highlights=[],
                    warnings=[],
                    citations=[],
                    generated_itinerary=TravelItinerary(destination="北京", itinerary=[]),
                )
            ),
        )
    )

    preview = build_navigation_previews(trip, device_platform="android")[0]

    assert preview.route_bundle_id == "route-overview"
    assert preview.validation_status == "needs_review"
    assert preview.requires_correction is True
    assert preview.correction_prompt == (
        "Confirm a concrete origin and destination before launching turn-by-turn navigation."
    )
    assert preview.primary_action.launch_channel == "browser"
    assert preview.primary_action.target_url.startswith("https://uri.amap.com/navigation")
    assert preview.manual_search_action is not None
    assert preview.manual_search_action.launch_channel == "browser"
    assert "query=" in preview.manual_search_action.target_url


def test_task_dependencies_block_and_unblock_deterministically():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(
            answer="北京五日游。",
            highlights=[],
            warnings=[],
            citations=[],
            generated_itinerary=TravelItinerary(
                destination="北京",
                itinerary=[
                    DailyPlan(
                        day=1,
                        city="北京",
                        activities=[
                            ActivityItem(
                                name="故宫博物院",
                                description="上午参观。",
                            )
                        ],
                    )
                ],
            ),
        )
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )
    activity_task = next(task for task in trip.tasks if task.category == "activity")

    assert activity_task.status == "blocked"
    assert "task-check-tickets" in activity_task.depends_on
    assert activity_task.blocked_reason

    trip = update_task(
        trip,
        "task-check-tickets",
        updates={"status": "completed"},
    )
    unblocked_activity = next(task for task in trip.tasks if task.task_id == activity_task.task_id)

    assert unblocked_activity.status == "pending"
    assert unblocked_activity.blocked_reason is None


def test_non_draft_trip_cannot_be_approved_twice():
    draft = draft_from_travel_answer(
        answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
    )
    trip = approve_trip(
        create_trip_from_draft(trip_id="trip-1", tenant_id="tenant-a", draft=draft)
    )

    with pytest.raises(TripStateTransitionError):
        approve_trip(trip)
