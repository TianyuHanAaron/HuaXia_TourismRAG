import asyncio

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from huaxia_tourismrag.api.routes import trip_router
from huaxia_tourismrag.schemas.evidence import TravelAnswer
from huaxia_tourismrag.services.trip_store import InMemoryTripStore
from huaxia_tourismrag.services.trip_workflow import draft_from_travel_answer
from huaxia_tourismrag.services.trip_workflow_runtime import (
    InMemoryTripWorkflowStore,
    run_trip_approval_workflow,
)


@pytest.mark.asyncio
async def test_approval_workflow_is_idempotent_for_duplicate_command():
    trip_store = InMemoryTripStore()
    workflow_store = InMemoryTripWorkflowStore()
    trip = await trip_store.create_from_draft(
        "tenant-a",
        draft_from_travel_answer(
            answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
        ),
        owner_user_id="user-a",
    )

    first = await run_trip_approval_workflow(
        trip_store=trip_store,
        workflow_store=workflow_store,
        trip_id=trip.trip_id,
        tenant_id="tenant-a",
        owner_user_id="user-a",
        idempotency_key="approve-once",
    )
    second = await run_trip_approval_workflow(
        trip_store=trip_store,
        workflow_store=workflow_store,
        trip_id=trip.trip_id,
        tenant_id="tenant-a",
        owner_user_id="user-a",
        idempotency_key="approve-once",
    )

    assert first.trip is not None
    assert second.trip is not None
    assert first.trip.status == "approved"
    assert second.trip.status == "approved"
    assert first.workflow.workflow_id == second.workflow.workflow_id
    assert second.workflow.status == "completed"
    assert second.workflow.attempt_count == 1
    assert second.workflow.terminal_result == {"trip_id": trip.trip_id}


@pytest.mark.asyncio
async def test_approval_workflow_records_terminal_failure_for_missing_trip():
    result = await run_trip_approval_workflow(
        trip_store=InMemoryTripStore(),
        workflow_store=InMemoryTripWorkflowStore(),
        trip_id="missing-trip",
        tenant_id="tenant-a",
        owner_user_id="user-a",
        idempotency_key="missing-approval",
    )

    assert result.trip is None
    assert result.workflow.status == "failed"
    assert result.workflow.attempt_count == 1
    assert result.workflow.terminal_error
    assert result.workflow.next_retry_at is not None


def test_approval_route_records_and_lists_durable_workflow():
    client = make_trip_client()
    trip_store = client.app.state.trip_store
    trip = asyncio.run(async_create_trip(trip_store))

    first = client.post(
        f"/trips/{trip.trip_id}/approve",
        headers={"Idempotency-Key": "route-approve-once"},
    )
    second = client.post(
        f"/trips/{trip.trip_id}/approve",
        headers={"Idempotency-Key": "route-approve-once"},
    )
    listed = client.get(f"/trips/{trip.trip_id}/workflows")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.headers["X-Trip-Workflow-ID"] == second.headers["X-Trip-Workflow-ID"]
    assert listed.status_code == 200
    body = listed.json()
    assert len(body["workflows"]) == 1
    workflow = body["workflows"][0]
    assert workflow["workflow_kind"] == "trip_approval"
    assert workflow["status"] == "completed"
    assert workflow["idempotency_key"] == "route-approve-once"
    assert workflow["attempt_count"] == 1


async def async_create_trip(trip_store: InMemoryTripStore):
    return await trip_store.create_from_draft(
        "demo-tenant",
        draft_from_travel_answer(
            answer=TravelAnswer(answer="北京五日游。", highlights=[], warnings=[], citations=[])
        ),
        owner_user_id="u_123",
    )


def make_trip_client() -> TestClient:
    app = FastAPI()
    app.state.trip_store = InMemoryTripStore()
    app.state.trip_workflow_store = InMemoryTripWorkflowStore()
    app.include_router(trip_router)
    return TestClient(app)
