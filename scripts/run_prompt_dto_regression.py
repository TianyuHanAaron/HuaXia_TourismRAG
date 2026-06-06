"""Run the deterministic V5 prompt/DTO regression report."""

from __future__ import annotations

import argparse
from pathlib import Path

from huaxia_tourismrag.services.prompt_dto_regression import (
    build_prompt_dto_regression_report,
)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--contracts",
        type=Path,
        default=Path("evals/v5_prompt_dto_contracts.json"),
        help="Path to prompt/DTO contract fixtures.",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=None,
        help="Optional previous report JSON for score regression diffs.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("evals/latest_prompt_dto_regression_report.json"),
        help="Where to write the generated JSON report.",
    )
    parser.add_argument(
        "--run-mode",
        choices=["smoke", "full"],
        default="smoke",
        help="Label this report as a smoke or full regression run.",
    )
    args = parser.parse_args()

    report = build_prompt_dto_regression_report(
        contracts_path=args.contracts,
        baseline_path=args.baseline,
        run_mode=args.run_mode,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(report.model_dump_json(indent=2), encoding="utf-8")
    print(
        {
            "output": str(args.output),
            "contract_count": report.contract_count,
            "release_blocked": report.release_blocked,
        }
    )


if __name__ == "__main__":
    main()
