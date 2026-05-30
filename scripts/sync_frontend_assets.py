"""Sync canonical HuaXia media assets into the React public directory."""

from __future__ import annotations

import json
import shutil
from pathlib import Path


class FrontendAssetSyncError(RuntimeError):
    """Raised when the canonical asset manifest is stale or incomplete."""


DEFAULT_SOURCE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DESTINATION_ROOT = (
    DEFAULT_SOURCE_ROOT / "frontend" / "public" / "assets" / "huaxia"
)
DEFAULT_SOURCE_MANIFEST_COPY = (
    DEFAULT_SOURCE_ROOT / "frontend" / "src" / "assets" / "huaxia-manifest.json"
)


def sync_frontend_assets(
    *,
    source_root: Path = DEFAULT_SOURCE_ROOT,
    destination_root: Path = DEFAULT_DESTINATION_ROOT,
    source_manifest_copy: Path | None = DEFAULT_SOURCE_MANIFEST_COPY,
) -> int:
    """Copy manifest and manifest-listed assets into React public assets.

    Returns the number of files copied, including the manifest.
    """

    manifest_path = source_root / "assets" / "manifest.json"
    if not manifest_path.is_file():
        raise FrontendAssetSyncError(f"asset manifest is missing: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = manifest.get("assets")
    if not isinstance(assets, list):
        raise FrontendAssetSyncError("asset manifest must contain an assets list")

    destination_root.mkdir(parents=True, exist_ok=True)
    shutil.copy2(manifest_path, destination_root / "manifest.json")
    copied = 1
    if source_manifest_copy is not None:
        source_manifest_copy.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(manifest_path, source_manifest_copy)
        copied += 1

    for item in assets:
        if not isinstance(item, dict):
            raise FrontendAssetSyncError("asset manifest entries must be objects")
        relative_path = item.get("path")
        if not isinstance(relative_path, str) or not relative_path.strip():
            raise FrontendAssetSyncError("asset manifest entry has no path")

        source_path = source_root / relative_path
        if not source_path.is_file():
            raise FrontendAssetSyncError(f"asset listed in manifest is missing: {relative_path}")

        asset_relative_path = Path(relative_path)
        if len(asset_relative_path.parts) < 2 or asset_relative_path.parts[0] != "assets":
            raise FrontendAssetSyncError(
                f"asset path must live under assets/: {relative_path}"
            )
        target_path = destination_root / Path(*asset_relative_path.parts[1:])
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target_path)
        copied += 1

    return copied


def main() -> None:
    """CLI entrypoint used by frontend build scripts."""

    copied = sync_frontend_assets()
    print(f"Synced {copied} HuaXia frontend asset files.")


if __name__ == "__main__":
    main()
