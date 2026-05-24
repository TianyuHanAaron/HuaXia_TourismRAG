"""Download the Xiaxia Sketchfab model as a local GLB asset.

The script intentionally reads a Sketchfab token from the environment or a local
.env file but never prints the token or temporary signed download URL.
"""

from __future__ import annotations

import argparse
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

import httpx


DEFAULT_MODEL_UID = "ec164c039241435e93a77f197e999c98"
DEFAULT_OUTPUT = Path("assets/models/xiaxia-avatar.glb")


class SketchfabDownloadError(RuntimeError):
    """Raised when the Sketchfab model cannot be downloaded."""


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download a downloadable Sketchfab model to a local GLB file.",
    )
    parser.add_argument("--model-uid", default=DEFAULT_MODEL_UID)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--env-file", type=Path, default=Path(".env"))
    parser.add_argument(
        "--token-env",
        default="SKETCHFAB_API_TOKEN",
        help="Environment variable containing the Sketchfab API token.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=120,
        help="HTTP timeout in seconds.",
    )
    args = parser.parse_args()

    token = _load_token(env_name=args.token_env, env_file=args.env_file)
    if not token:
        raise SystemExit(
            f"Missing {args.token_env}. Add it to .env or export it before running.",
        )

    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    _download_glb(
        model_uid=args.model_uid,
        token=token,
        output=output,
        timeout=args.timeout,
    )
    size_mb = output.stat().st_size / (1024 * 1024)
    print(f"Downloaded GLB to {output} ({size_mb:.1f} MB)")


def _load_token(env_name: str, env_file: Path) -> str | None:
    value = os.environ.get(env_name)
    if value:
        return value.strip().strip('"').strip("'")

    if not env_file.exists():
        return None

    for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, raw_value = stripped.split("=", 1)
        if key.strip() == env_name:
            return raw_value.strip().strip('"').strip("'")
    return None


def _download_glb(
    *,
    model_uid: str,
    token: str,
    output: Path,
    timeout: float,
) -> None:
    download_api = f"https://api.sketchfab.com/v3/models/{model_uid}/download"
    headers = {"Authorization": f"Token {token}"}

    with httpx.Client(timeout=timeout, follow_redirects=True) as client:
        response = client.get(download_api, headers=headers)
        if response.status_code == 401:
            raise SketchfabDownloadError(
                "Sketchfab rejected the token. Use a Sketchfab API token with model "
                "download access, not a Bearer/OAuth header value.",
            )
        response.raise_for_status()
        payload = response.json()
        glb_payload = payload.get("glb")
        if not isinstance(glb_payload, dict) or not glb_payload.get("url"):
            available = ", ".join(sorted(payload.keys()))
            raise SketchfabDownloadError(
                f"No GLB download URL was returned. Available formats: {available}",
            )

        signed_url = str(glb_payload["url"])
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir) / "xiaxia-sketchfab-download"
            with client.stream("GET", signed_url) as model_response:
                model_response.raise_for_status()
                with temp_path.open("wb") as file:
                    for chunk in model_response.iter_bytes():
                        file.write(chunk)

            _materialize_glb(temp_path=temp_path, output=output)


def _materialize_glb(*, temp_path: Path, output: Path) -> None:
    with temp_path.open("rb") as file:
        signature = file.read(4)

    if signature == b"glTF":
        shutil.copyfile(temp_path, output)
        return

    if zipfile.is_zipfile(temp_path):
        with zipfile.ZipFile(temp_path) as archive:
            glb_names = [
                name
                for name in archive.namelist()
                if not name.endswith("/") and name.lower().endswith(".glb")
            ]
            if not glb_names:
                raise SketchfabDownloadError(
                    "Sketchfab archive did not contain a .glb file.",
                )
            with archive.open(glb_names[0]) as source, output.open("wb") as target:
                shutil.copyfileobj(source, target)
            return

    raise SketchfabDownloadError("Downloaded file is neither GLB nor a ZIP archive.")


if __name__ == "__main__":
    main()
