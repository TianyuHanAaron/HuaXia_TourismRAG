"""Tests for syncing canonical media assets into the React app."""

from __future__ import annotations

import json
import importlib.util
from pathlib import Path

import pytest

SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "sync_frontend_assets.py"
SPEC = importlib.util.spec_from_file_location("sync_frontend_assets", SCRIPT_PATH)
assert SPEC is not None
sync_module = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(sync_module)

FrontendAssetSyncError = sync_module.FrontendAssetSyncError
sync_frontend_assets = sync_module.sync_frontend_assets


def test_sync_frontend_assets_copies_manifest_assets(tmp_path: Path) -> None:
    """Manifest-listed files are copied under the React public asset root."""

    source_root = tmp_path / "source"
    destination_root = tmp_path / "frontend" / "public" / "assets" / "huaxia"
    avatar = source_root / "assets" / "avatars" / "xiaxia.jpg"
    model = source_root / "assets" / "models" / "xiaxia.glb"
    background = source_root / "assets" / "travel" / "wall.jpg"
    for path in (avatar, model, background):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"asset")

    manifest = {
        "version": 1,
        "assets": [
            {"id": "avatar", "path": "assets/avatars/xiaxia.jpg"},
            {"id": "model", "path": "assets/models/xiaxia.glb"},
            {"id": "wall", "path": "assets/travel/wall.jpg"},
        ],
    }
    (source_root / "assets" / "manifest.json").write_text(
        json.dumps(manifest),
        encoding="utf-8",
    )

    copied = sync_frontend_assets(
        source_root=source_root,
        destination_root=destination_root,
        source_manifest_copy=None,
    )

    assert copied == 4
    assert (destination_root / "manifest.json").is_file()
    assert (destination_root / "avatars" / "xiaxia.jpg").read_bytes() == b"asset"
    assert (destination_root / "models" / "xiaxia.glb").read_bytes() == b"asset"
    assert (destination_root / "travel" / "wall.jpg").read_bytes() == b"asset"


def test_sync_frontend_assets_fails_for_missing_manifest_asset(tmp_path: Path) -> None:
    """A stale manifest should fail builds before React serves broken media URLs."""

    source_root = tmp_path / "source"
    destination_root = tmp_path / "frontend" / "public" / "assets" / "huaxia"
    (source_root / "assets").mkdir(parents=True)
    manifest = {
        "version": 1,
        "assets": [
            {"id": "missing", "path": "assets/travel/missing.jpg"},
        ],
    }
    (source_root / "assets" / "manifest.json").write_text(
        json.dumps(manifest),
        encoding="utf-8",
    )

    with pytest.raises(FrontendAssetSyncError, match="missing"):
        sync_frontend_assets(
            source_root=source_root,
            destination_root=destination_root,
            source_manifest_copy=None,
        )
