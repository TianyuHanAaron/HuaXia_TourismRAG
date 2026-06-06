# V5 Reliability And Scale Plan Folder

## Product Framing

V5 turns the trip command center from a useful mobile workflow into a dependable service that can support real consumer usage, provider failures, mobile offline behavior, and support recovery.

V1 established the planning engine and command-center domain direction. V2 shaped a mobile-first market MVP. V3 made provider handoffs concrete. V5 focuses on reliability, observability, operations, cost control, and scale.

## V5 Product Promise

HuaXia remains:

> A trip command center from planning to home.

V5 adds:

> The command center keeps working when providers fail, networks are weak, jobs are slow, and users need recovery support.

## Preserved Strengths

- FastAPI and Pydantic DTO contracts remain the backend boundary.
- Qwen Cloud, RAG, citation guard, async jobs, SSE, and generated OpenAPI clients stay central.
- React web remains the planning, demo, and operations surface.
- Expo mobile remains the primary traveler execution surface.
- V2 trip workflow and V3 provider action concepts stay intact.

## V5 Scope

V5 is not a full booking platform. It is a reliability and scale layer over the existing trip workflow:

- Durable workflow execution.
- Provider health and fallback handling.
- Route bundle revalidation.
- Mobile offline synchronization.
- Notification delivery reliability.
- Observability and tracing.
- Cost and rate-limit controls.
- Support and admin recovery tools.
- Security, retention, and incident response.
- Load testing and quality regression checks.

## Implemented Slice 1: Reliability Snapshot

The first V5 implementation slice adds a DTO-first trip reliability snapshot:

- Backend endpoint: `GET /trips/{trip_id}/reliability`.
- Backend endpoint: `GET /trips/reliability/slos` publishes Step 01 SLO targets.
- Backend evaluator: computes `healthy`, `degraded`, `critical`, or `not_ready` from current trip state.
- Mobile contract: typed `TripReliabilitySnapshotResponse`, Zod validation, API client, TanStack Query option, query invalidation, and Trip Home status surfacing.
- Mobile contract: typed `TripReliabilitySloTargetsResponse`, Zod validation, API client, and static TanStack Query option.
- User-facing behavior: Trip Home can show degraded or critical execution reliability before a provider action fails in front of the traveler.

This slice intentionally does not add durable workers, provider polling, circuit breakers, or admin incident workflows. Those remain later V5 steps.

## Implemented Slice 2: Durable Approval Workflow Runtime

The second V5 implementation slice adds a durable command record around trip approval:

- Backend DTOs: `TripDurableWorkflowRecord` and `TripDurableWorkflowListResponse`.
- Backend runtime: reusable `TripWorkflowStore` interface with in-memory and Redis implementations.
- Backend behavior: `POST /trips/{trip_id}/approve` is idempotent by `Idempotency-Key` and returns `X-Trip-Workflow-ID`.
- Backend endpoint: `GET /trips/{trip_id}/workflows` lists tenant-scoped workflow records for support/admin inspection.
- Mobile contract: typed workflow response, Zod validation, API client, TanStack Query key/option, invalidation, and a dedicated guard script.

This slice intentionally scopes durable execution to trip approval first. Task generation, provider refresh, notification scheduling, and offline replay can reuse the same workflow store boundary in later slices.

## Implemented Slice 3: Leased Worker Queue Resilience

The third V5 implementation slice upgrades the external travel job queue:

- Queue items now carry attempt count, max attempts, lease id, lease expiry, retry availability, enqueue time, and last error.
- In-memory and Redis-backed queues now support `ack`, `fail`, `snapshot`, and expired lease recovery.
- Worker success acknowledges queue leases; worker failure retries or dead-letters poison messages.
- Backend endpoint: `GET /tourism/jobs/queue/snapshot` publishes queue depth, leased count, retry count, dead-letter count, oldest ready age, and failed samples.
- Runtime config: `JOB_QUEUE_LEASE_SECONDS`, `JOB_QUEUE_MAX_ATTEMPTS`, and `JOB_QUEUE_RETRY_BACKOFF_SECONDS`.

This slice keeps the current queue architecture and does not introduce Celery, gRPC, or a separate orchestration product.

## Implemented Slice 4: Provider Health Monitoring

The fourth V5 implementation slice adds current provider health as a first-class execution input:

- Backend DTOs: `ProviderHealthSnapshot` and `ProviderHealthSnapshotResponse`.
- Backend service: provider health normalization, in-memory health store, registry health overlay, action-level health validation, and healthy-first ordering helper.
- Backend endpoint: `GET /trips/provider-health` exposes optional domain and region filters.
- Backend behavior: `/trips/provider-connectors` now resolves connectors against current health, and mobile provider action sheets apply health before rendering primary launch buttons.
- Mobile contract: provider health response types, Zod validation, API client, query key, reconnect-aware query option, invalidation, and a dedicated guard script.

This slice provides the health input needed for later circuit breakers and fallback orchestration, but it does not yet run scheduled provider probes or maintain breaker state.

## Implemented Slice 5: Provider Circuit Breakers And Fallbacks

The fifth V5 implementation slice prevents repeated launches into providers that are actively failing:

- Backend DTOs: `ProviderCircuitBreakerSnapshot` and `ProviderCircuitBreakerSnapshotResponse`.
- Backend service: in-memory circuit breaker store with closed, open, and half-open states; failure windowing; cooldown timing; fallback provider ids; and action-level breaker validation.
- Backend endpoint: `GET /trips/provider-circuit-breakers` exposes optional domain and region filters for support/admin inspection.
- Backend behavior: failed provider follow-up outcomes record breaker failures, completed outcomes reset breaker state, and mobile provider action sheets apply breaker status after health status.
- Mobile contract: provider circuit breaker response types, Zod validation, API client, query key, reconnect-aware query option, invalidation, and a dedicated guard script.
- User-facing behavior: when a provider circuit is open, the primary action is either demoted to a fallback launch or hidden if no safe fallback exists.

This slice uses an in-memory store for the first implementation. Scheduled probes, persistent Redis-backed breaker state, affected-trip aggregation, and the full admin dashboard remain later V5 work.

## Implemented Slice 6: Route Bundle Freshness And Revalidation

The sixth V5 implementation slice makes route freshness explicit before map handoff:

- Backend DTOs: `RouteBundle` now carries `generated_at`, `valid_until`, `last_revalidated_at`, `refresh_reason`, `freshness_status`, `revalidation_attempts`, and `provider_version`.
- Backend service: in-memory route freshness store, deterministic freshness evaluation, same-day short freshness windows, approximate-route marking, and route-action freshness demotion.
- Backend endpoint: `GET /trips/{trip_id}/route-bundles` overlays freshness state and accepts a deterministic `now` query for tests/support.
- Backend endpoint: `POST /trips/{trip_id}/route-bundles/{route_bundle_id}/revalidate` records manual refresh attempts and returns refreshed bundle state.
- Backend behavior: mobile provider action sheets demote stale route actions to fallback before launch.
- Mobile contract: route freshness response types, Zod validation, typed route revalidation API, query keys/options, invalidation, provider action sheet freshness context, fixtures, and a dedicated guard script.

This slice uses deterministic local refresh metadata for the first implementation. Scheduled provider refresh jobs, live map-provider duration refreshes, persistent refresh history, and admin stale-route dashboards remain later V5 work.

## Implemented Slice 7: Trip Execution Event Store

The seventh V5 implementation slice adds a projected execution-event layer over existing trip audit events:

- Backend DTOs: `TripExecutionEvent`, `TripExecutionEventListResponse`, `TripRecentActivityItem`, and `TripRecentActivityResponse`.
- Backend service: in-memory execution event store, audit-to-execution projection, event categorization, actor typing, correlation-id extraction, sensitive payload redaction, and mobile-safe recent activity projection.
- Backend endpoint: `GET /trips/{trip_id}/execution-events` exposes filtered execution events by visibility, category, and limit.
- Backend endpoint: `GET /trips/{trip_id}/execution-events/mobile-activity` exposes user-visible recent activity only.
- Backend behavior: approval, archive, task, provider launch/follow-up, calendar export, document, booking, and offline task mutations project audit events into execution events after successful state changes.
- Mobile contract: execution-event and recent-activity response types, Zod validation, typed API functions, TanStack Query keys/options, and a dedicated guard script.
- Safety behavior: sensitive document events are private and payloads are redacted before execution-event responses; mobile recent activity excludes private events.

This slice stores projected execution events in memory while preserving durability through existing persisted trip audit events. A Redis-backed event projection, support event joins, notification delivery event ingestion, and admin timeline UI remain later V5 work.

## Implemented Slice 8: Mobile Offline Sync V2

The eighth V5 implementation slice makes queued mobile task mutations safe to replay:

- Backend DTOs: offline mutation results now distinguish `accepted`, `duplicate`, `conflict`, `rejected`, and `failed` states with conflict policy, server task, server version, and duplicate metadata.
- Backend behavior: `POST /trips/{trip_id}/offline-task-updates` is idempotent for duplicate client mutation ids, checks duplicates before optimistic version conflicts, and reports missing tasks as sync conflicts rather than generic failures.
- Backend behavior: stale `expected_updated_at` mutations preserve the newer server task in the sync result so mobile can show a focused conflict sheet.
- Mobile contract: queued task mutations now sync through the batch endpoint instead of replaying individual task PATCH calls.
- Mobile behavior: accepted and duplicate mutations are removed from MMKV, while conflict, rejected, and failed mutations remain queued for user resolution or retry.
- Mobile validation: a dedicated guard script verifies the batch endpoint wrapper, V5 sync statuses, and conflict-copy contract.

This slice does not add a full support conflict dashboard, local note mutation sync, or push-triggered background sync. Those remain later reliability and mobile execution work.

## Implemented Slice 9: Push Notification Reliability

The ninth V5 implementation slice adds a notification delivery ledger for mobile reminders:

- Backend DTOs: notification permission state, delivery status, delivery records, in-app fallback alerts, and delivery ledger responses.
- Backend service: in-memory tenant-scoped notification delivery store with dedupe-key handling, quiet-hour adjustment, timezone normalization, and fallback alert creation.
- Backend endpoint: `GET /trips/{trip_id}/notification-deliveries` lists recorded notification delivery attempts and fallback alerts.
- Backend endpoint: `POST /trips/{trip_id}/notification-deliveries` records Expo scheduling outcomes, permission-denied fallbacks, provider responses, duplicate attempts, and failed-send fallbacks.
- Backend behavior: notification delivery records project into trip execution events with `notification_*` event names.
- Mobile contract: typed notification delivery responses, Zod validation, API functions, TanStack Query option, and a dedicated guard script.
- Mobile behavior: reminder settings now reports Expo scheduling outcomes to the backend ledger after scheduling or in-app fallback mode.

This slice records and exposes notification reliability state. It does not yet send remote push notifications from the backend, poll Expo delivery receipts, or implement a full admin notification operations dashboard.

## Implemented Slice 10: Observability And Tracing

The tenth V5 implementation slice adds support-safe diagnostic traces for trip execution operations:

- Backend DTOs: `TripTraceEvent` and `TripTraceEventListResponse` expose diagnostic id, correlation id, request id, operation type, status, redacted payload, and log-search URL.
- Backend service: in-memory observability store plus centralized redaction for sensitive URL query params, provider tokens, authorization headers, booking references, and document metadata.
- Backend endpoint: `GET /trips/{trip_id}/observability/traces` lists trace events filtered by operation type, correlation id, and limit.
- Backend behavior: provider action launch, notification delivery recording, offline task sync, and document metadata attachment emit observability traces after successful state changes.
- Mobile contract: trace response types, Zod validation, typed API function, TanStack Query key/option, and a dedicated guard script.
- Support behavior: a user-visible diagnostic id can be mapped to a correlation id and log-search URL without exposing provider secrets or document storage references.

This slice does not yet add a full OpenTelemetry exporter, persistent trace backend, support trace-search UI, or planning-job spans. Those remain later V5 observability work.

## Implemented Slice 11: Cost And Rate Limit Controls

The eleventh V5 implementation slice adds provider budget decisions before high-cost calls are launched:

- Backend DTOs: provider cost-control policies, check requests, decisions, usage snapshots, and summary responses.
- Backend service: in-memory per-tenant cost-control store with entitlement-aware policies, cache-hit tracking, degraded-mode decisions, remaining-call counters, and estimated cost tracking.
- Backend endpoint: `GET /trips/provider-cost-controls` lists cost policies and usage snapshots for support/admin/mobile surfaces.
- Backend endpoint: `POST /trips/provider-cost-controls/check` evaluates one provider operation and returns `allowed`, `cache_hit`, `degraded`, or `blocked`.
- Starter policies: weather snapshots, Tavily web search, and Firecrawl page parsing have conservative free-tier budgets and degraded-mode user copy.
- Mobile contract: cost-control response types, Zod validation, typed API functions, TanStack Query key/option, and a dedicated guard script.
- User-facing behavior: mobile can show copy such as "Using cached weather until provider quota resets" rather than raw provider quota failures.

This slice does not yet replace request-local provider budgets inside every provider integration, add persistent Redis cost ledgers, or implement a full admin cost dashboard. Those remain later V5 operations work.

## Implemented Slice 12: Data Retention And Archival

The twelfth V5 implementation slice adds trip-level retention and sensitive-data cleanup:

- Backend DTOs: retention policy, snapshot, apply request, and apply response contracts.
- Backend endpoint: `GET /trips/{trip_id}/retention` reports archive/redaction readiness, sensitive document count, booking-reference count, support-hold state, and policy copy.
- Backend endpoint: `POST /trips/{trip_id}/retention/apply` applies support holds or redacts sensitive vault/booking metadata and archives eligible completed trips.
- Backend service: `trip_retention.py` keeps retention logic separate from workflow generation and provider actions.
- Backend behavior: sensitive document storage refs, local refs, parser metadata, booking confirmation codes, source document links, booking notes, and sensitive audit metadata are removed before archival completes.
- Execution events: `retention_policy_applied` and `retention_hold_set` are projected into the trip execution timeline.
- Mobile contract: retention response/request types, Zod validation, typed API functions, TanStack Query key/option, and a dedicated guard script.
- Support behavior: support hold pauses retention redaction when an open support case still needs evidence.

This slice does not yet add a scheduled retention worker, user-facing legal export workflow, or admin retention dashboard. Those remain later security and operations work.

## Implemented Slice 13: Security Hardening And Secrets Operations

The thirteenth V5 implementation slice adds support-safe security posture diagnostics:

- Backend DTOs: `SecurityCredentialPosture` and `SecurityPostureResponse` describe configured, missing, and not-required credentials without exposing raw secret values.
- Backend service: `security_posture.py` centralizes secret redaction and credential posture evaluation for Qwen/DashScope, OpenAI fallback, Tavily, Firecrawl, Qdrant, and remote embeddings.
- Backend endpoint: `GET /support/security/posture` is support-admin only and returns redacted credential state, environment variable names, and rotation guidance.
- Support audit: posture views write `security_posture_viewed` events with `resource_type="security"` and `target_user_id="system"`.
- Mobile contract: security posture response types, Zod validation, typed support API function, TanStack Query key/option, and a dedicated guard script.
- Privacy behavior: `frontend_secret_exposure_allowed=false` and `sensitive_document_prompt_default="excluded"` are explicit response fields so admin/mobile surfaces can display security posture without implying document prompt access.

This slice does not add a secret manager integration, automatic rotation workflow, admin dashboard UI, KMS-backed document encryption, or scheduled security posture checks. Those remain later security and partner credential operations work.

## Implemented Slice 14: Partner Credential Management

The fourteenth V5 implementation slice adds central provider credential readiness without exposing provider secrets:

- Backend config: `PROVIDER_CREDENTIALS_JSON` carries safe partner credential metadata such as environment, credential reference id, expiration, disabled state, last successful probe, and partner parameter keys.
- Backend DTOs: `ProviderCredentialReadiness` and `ProviderCredentialReadinessResponse` expose configured, missing, expired, sandbox-mismatch, disabled, and not-required states.
- Backend service: `provider_credentials.py` parses central credential metadata, strips raw references from responses, validates partner parameter presence, and derives configured provider ids for health checks.
- Backend endpoint: `GET /trips/provider-credentials` returns safe readiness by domain, environment, and optional deterministic `now`.
- Health integration: provider health and provider action mobile sheets use central credential metadata when configured, so missing, expired, disabled, or environment-mismatched providers degrade before launch.
- Mobile contract: provider credential readiness response types, Zod validation, typed API function, TanStack Query key/option, and a dedicated guard script.

This slice does not add a real secret manager, partner portal UI, automatic credential rotation, live provider probes, or per-partner commercial configuration editing. Those remain later admin operations and provider scale work.

## Implemented Slice 15: Admin Operations Console

The fifteenth V5 implementation slice adds a role-protected operations console summary:

- Backend DTOs: admin operations overview, panels, controlled actions, and console response contracts.
- Backend service: `admin_operations.py` aggregates support-safe counts and panel statuses without returning traveler detail, trip ids, raw workflow errors, or provider secrets.
- Backend endpoint: `GET /support/operations/console` is support-admin only and returns aggregate trip, workflow, provider, notification, document, analytics, incident, and support-case panels.
- Support audit: console views write `operations_console_viewed` events with `resource_type="operations"` and `target_user_id="system"`.
- Controlled-action contract: retry workflow, revalidate provider, resend notification, set support hold, open incident, and refresh subscription are exposed as auditable action metadata with `requires_reason=true`.
- Mobile contract: admin operations console response types, Zod validation, typed support API function, TanStack Query key/option, and a dedicated guard script.

This slice does not add a full React admin UI, broad mutation routes, database-level admin editing, or production incident tooling. Those remain later support recovery and reliability-scale work.

## Implemented Slice 16: Support Recovery Playbooks

The sixteenth V5 implementation slice adds deterministic support recovery playbooks:

- Backend DTOs: support recovery playbook, playbook list response, apply request, mobile refresh payload, and apply response contracts.
- Backend endpoint: `GET /support/users/{target_user_id}/trips/{trip_id}/recovery-playbooks` returns consent-gated, support-safe recovery recommendations.
- Backend endpoint: `POST /support/users/{target_user_id}/trips/{trip_id}/recovery-playbooks/apply` applies controlled support recovery actions with `expected_updated_at` current-version checks.
- Implemented recovery actions: clear a blocked task, and mark a provider action completed externally after support confirms the user handled it outside the app.
- Support audit: playbook views and applications write `support_playbooks_viewed` and `support_playbook_applied` events.
- Mobile contract: support recovery response/request types, Zod validation, typed API functions, TanStack Query key/option, and a dedicated guard script.
- Safety behavior: playbook recommendation copy avoids raw provider failure text, confirmation codes, document contents, and provider secrets.

This slice does not yet implement route regeneration, notification resend, sync-conflict resolution, or provider-action rebuild mutation logic. Those remain declared playbook actions for later reliability work.

## Implemented Slice 17: Multi-Region And Latency Strategy

The seventeenth V5 implementation slice adds regional latency readiness for mobile execution:

- Backend DTOs: provider regional latency samples, traveler-facing regional latency response, and admin regional latency summary contracts.
- Backend service: `regional_latency.py` derives selected provider ids, regional route confidence, mobile prefetch recommendations, and admin regional health summaries from provider health and credential posture.
- Backend endpoint: `GET /trips/{trip_id}/regional-latency` returns mobile-safe latency context for active trip surfaces.
- Mobile contract: regional latency response types, Zod validation, typed API function, TanStack Query key/option, Trip Home prefetch awareness, and a dedicated guard script.
- User-facing behavior: mobile can distinguish normal routing, degraded regional confidence, and provider-prefetch recommendations before the traveler launches a map or provider action.

This slice does not add real synthetic probes, multi-region deployment automation, CDN edge routing, or persistent latency history. Those remain later V5/V6 scale work.

## Implemented Slice 18: Load Testing And Capacity Planning

The eighteenth V5 implementation slice adds repeatable capacity planning inputs:

- Backend DTOs: capacity-planning scenario results, queue snapshots, and support capacity report contracts.
- Backend service: `capacity_planning.py` evaluates representative queue, worker, provider, and mobile execution capacity scenarios.
- Backend endpoint: `GET /support/capacity/report` is support-admin only and exposes controlled dry-run or live-mode capacity posture.
- Script: `scripts/load_capacity_smoke.py` runs the same scenario fixture outside the API for repeatable smoke checks.
- Eval fixture: `evals/v5_capacity_smoke_scenarios.json` stores scenario inputs under source control.
- Mobile contract: capacity report response types, Zod validation, typed support API function, TanStack Query option, and a dedicated guard script.

This slice does not provision infrastructure, run distributed load tests, or autoscale workers. It defines the DTO-first capacity report needed before production traffic expansion.

## Implemented Slice 19: Quality Evaluation Harness

The nineteenth V5 implementation slice adds a deterministic quality harness for trip-command-center output:

- Backend DTOs: quality evaluation fixture results, criterion results, mobile snapshot, and report response contracts.
- Backend service: `quality_evaluation.py` scores representative trips against itinerary usefulness, task readiness, provider action quality, citation presence, safety coverage, and mobile execution fitness.
- Backend endpoint: `GET /support/quality/report` is support-admin only and returns aggregate quality gates plus fixture-level detail.
- Script: `scripts/run_quality_evaluation.py` executes the fixture set from the command line.
- Eval fixture: `evals/v5_quality_fixture_journeys.json` stores the benchmark journeys.
- Mobile contract: quality report response types, Zod validation, typed support API function, TanStack Query option, and a dedicated guard script.

This slice uses deterministic fixture scoring. Live LLM answer sampling, human review queues, and business KPI joins remain later V5/V6 work.

## Implemented Slice 20: LLM Prompt And DTO Regression Tests

The twentieth V5 implementation slice adds DTO-focused regression checks around LLM output contracts:

- Backend DTOs: prompt/DTO contract results, criterion results, enum-observation metadata, and report response contracts.
- Backend service: `prompt_dto_regression.py` checks required DTO sections, enum drift, citation fields, itinerary time structure, task-action compatibility, and prompt-contract readiness.
- Backend endpoint: `GET /support/prompt-dto/report` is support-admin only and returns dry-run or live-mode prompt/DTO posture.
- Script: `scripts/run_prompt_dto_regression.py` runs the contract fixture outside the API.
- Eval fixture: `evals/v5_prompt_dto_contracts.json` stores prompt/DTO regression inputs.
- Mobile contract: prompt/DTO report response types, Zod validation, typed support API function, TanStack Query option, and a dedicated guard script.

This slice does not replace provider-level LLM evaluation or production answer sampling. It creates a stable regression gate for the DTO-first planning engine.

## Implemented Slice 21: Compliance And Incident Response

The twenty-first V5 implementation slice adds compliance incident tracking and feature-disable visibility:

- Backend DTOs: compliance incidents, disable switches, mobile incident banners, create/patch requests, and report responses.
- Backend service: `compliance_incidents.py` stores incident records, derives active disable switches, and projects mobile-safe incident banners.
- Backend endpoints: support-admin incident report, incident creation, incident patching, and mobile incident banner retrieval.
- Backend behavior: compliance incident actions are support-audited and avoid exposing raw private details to mobile responses.
- Mobile contract: compliance incident response types, Zod validation, typed support/mobile API functions, TanStack Query option, and a dedicated guard script.
- User-facing behavior: mobile can show a focused incident banner when a feature is disabled for safety, compliance, or provider-risk reasons.

This slice does not add a legal case-management system, external incident paging provider, or automated policy classifier. Those remain later operations work.

## Implemented Slice 22: Rollout And Business-Scale Readiness

The twenty-second V5 implementation slice aggregates reliability, quality, compliance, and support signals into a business-scale release gate:

- Backend DTOs: V5 business-scale gates, reliability scorecard, launch-mode metadata, and V6 bridge contracts.
- Backend service: `v5_rollout_readiness.py` combines quality evaluation, prompt/DTO regression, compliance incidents, capacity planning, provider health, support audit signals, rollout flags, and mobile execution readiness.
- Backend endpoint: `GET /rollout/v5/business-scale-readiness` is support-admin only and records `v5_business_scale_readiness_viewed` audit events.
- Mobile contract: business-scale readiness response types, Zod validation, typed support API function, TanStack Query option, and a dedicated guard script.
- Release behavior: controlled growth is allowed only when critical gates are clear, rollback is inactive, controlled beta is enabled, and provider/compliance risks are acceptable.

This slice does not start paid growth automatically. It defines the operational evidence needed before V6 business-scale investment.

## Folder Guide

- `00` defines the V5 roadmap and boundary.
- `01` defines reliability principles and service-level objectives.
- `02` to `07` define durable workflow, workers, provider health, fallbacks, route freshness, and event store.
- `08` to `10` define offline sync, notification reliability, and observability.
- `11` defines cost and rate-limit controls.
- `12` defines data retention and archival.
- `13` defines security hardening and secret posture diagnostics.
- `14` defines partner credential operations.
- `15` defines admin operations console contracts.
- `16` defines support recovery playbooks and controlled support recovery actions.
- `17` to `18` define latency, multi-region posture, and capacity planning.
- `19` to `20` define quality and LLM/DTO regression evaluation.
- `21` defines compliance and incident response.
- `22` defines rollout and business-scale readiness.

## Verification

Expected folder checks:

```bash
find docs/superpowers/plans/trip-command-center-v5-reliability-scale -maxdepth 1 -type f | sort | wc -l
for i in $(seq -w 0 22); do ls docs/superpowers/plans/trip-command-center-v5-reliability-scale/${i}-*.md >/dev/null; done
```

Expected results: 24 files, all numbered files present, no placeholder text, and no unrelated project references.
