"""Run manual latency benchmarks against a local HuaXia TourismRAG API."""

from __future__ import annotations

import argparse
import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx


def _endpoint(mode: str) -> str:
    return "/tourism/itineraries/diy" if mode == "diy" else "/tourism/questions"


async def _run_case(
    client: httpx.AsyncClient,
    base_url: str,
    case: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "question": case["prompt"],
        "detail_level": case["detail_level"],
        "language": "zh-CN",
    }
    started = time.perf_counter()
    response = await client.post(f"{base_url}{_endpoint(case['mode'])}", json=payload)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    result: dict[str, Any] = {
        "id": case["id"],
        "mode": case["mode"],
        "detail_level": case["detail_level"],
        "elapsed_ms": elapsed_ms,
        "status_code": response.status_code,
    }
    if response.headers.get("content-type", "").startswith("application/json"):
        body = response.json()
        generated_itinerary = body.get("generated_itinerary") or {}
        result.update(
            {
                "needs_reply": body.get("needs_reply"),
                "has_job_id": bool(body.get("job_id")),
                "citations": len(body.get("citations") or []),
                "topic_sections": len(body.get("topic_sections") or []),
                "itinerary_days": len(generated_itinerary.get("itinerary") or []),
                "warnings": len(body.get("warnings") or []),
            }
        )
    else:
        result["body_preview"] = response.text[:160]
    return result


async def _main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--cases",
        default="evals/speed_v3_benchmarks.json",
        help="Path to benchmark fixture JSON.",
    )
    args = parser.parse_args()
    cases = json.loads(Path(args.cases).read_text(encoding="utf-8"))
    timeout = httpx.Timeout(180.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        for case in cases:
            result = await _run_case(client, args.base_url.rstrip("/"), case)
            print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(_main())
