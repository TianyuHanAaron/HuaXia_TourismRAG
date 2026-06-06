"""Run safe V5 capacity smoke scenarios against a local HuaXia API."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx

from huaxia_tourismrag.services.capacity_planning import build_capacity_planning_report


async def _run_request(
    client: httpx.AsyncClient,
    *,
    base_url: str,
    scenario: dict[str, Any],
    semaphore: asyncio.Semaphore,
) -> dict[str, Any]:
    async with semaphore:
        started = time.perf_counter()
        response = await client.request(
            scenario.get("method", "GET"),
            f"{base_url}{scenario['path']}",
            headers=scenario.get("headers") or {},
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        return {
            "scenario_key": scenario["scenario_key"],
            "status_code": response.status_code,
            "elapsed_ms": elapsed_ms,
            "ok": 200 <= response.status_code < 400,
        }


async def _run_live(args: argparse.Namespace) -> list[dict[str, Any]]:
    fixture = json.loads(Path(args.scenarios).read_text(encoding="utf-8"))
    scenarios = fixture["scenarios"]
    timeout = httpx.Timeout(args.timeout_seconds, connect=10.0)
    semaphore = asyncio.Semaphore(args.concurrency)
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await asyncio.gather(
            *[
                _run_request(
                    client,
                    base_url=args.base_url.rstrip("/"),
                    scenario=scenario,
                    semaphore=semaphore,
                )
                for scenario in scenarios
            ]
        )


def _write_report(args: argparse.Namespace, results: list[dict[str, Any]]) -> None:
    samples_by_scenario: dict[str, list[float]] = {}
    for result in results:
        samples_by_scenario.setdefault(result["scenario_key"], []).append(result["elapsed_ms"])
    report = build_capacity_planning_report(
        run_mode="local_smoke",
        provider_mode=args.provider_mode,
        samples_by_scenario=samples_by_scenario,  # type: ignore[arg-type]
        live_provider_calls_allowed=args.allow_live_providers,
    )
    output = {
        "results": results,
        "report": report.model_dump(mode="json"),
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")


async def _main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--scenarios", default="evals/v5_capacity_smoke_scenarios.json")
    parser.add_argument("--output", default="evals/v5_capacity_smoke_report.json")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--timeout-seconds", type=float, default=30.0)
    parser.add_argument(
        "--provider-mode",
        choices=["mocked", "recorded", "sandbox", "live"],
        default="mocked",
    )
    parser.add_argument("--allow-live-providers", action="store_true")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Write a deterministic report without contacting the API.",
    )
    args = parser.parse_args()
    if args.provider_mode == "live" and not args.allow_live_providers:
        raise SystemExit("live provider load tests require --allow-live-providers")
    if args.dry_run:
        _write_report(args, [])
        return
    results = await _run_live(args)
    _write_report(args, results)
    print(json.dumps({"output": args.output, "scenario_count": len(results)}))


if __name__ == "__main__":
    asyncio.run(_main())
