"""Run deterministic V5 trip workflow quality evaluation fixtures."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from huaxia_tourismrag.services.quality_evaluation import build_quality_evaluation_report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixtures", default="evals/v5_quality_fixture_journeys.json")
    parser.add_argument("--baseline", default=None)
    parser.add_argument("--output", default="evals/v5_quality_evaluation_report.json")
    parser.add_argument("--run-mode", choices=["smoke", "full"], default="smoke")
    args = parser.parse_args()
    report = build_quality_evaluation_report(
        fixtures_path=Path(args.fixtures),
        baseline_path=Path(args.baseline) if args.baseline else None,
        run_mode=args.run_mode,
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "output": str(output_path),
                "fixture_count": report.fixture_count,
                "release_blocked": report.release_blocked,
            }
        )
    )


if __name__ == "__main__":
    main()
