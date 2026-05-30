"""Export the FastAPI OpenAPI schema for the React DTO client generator."""

from __future__ import annotations

import json
from pathlib import Path

from huaxia_tourismrag.bootstrap import create_app


DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parents[1] / "frontend" / "openapi.json"


def export_openapi(output_path: Path = DEFAULT_OUTPUT_PATH) -> Path:
    """Write the app OpenAPI schema to ``output_path``."""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    app = create_app()
    output_path.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_path


def main() -> None:
    """CLI entrypoint used by Orval generation."""

    path = export_openapi()
    print(f"Exported OpenAPI schema to {path}")


if __name__ == "__main__":
    main()
