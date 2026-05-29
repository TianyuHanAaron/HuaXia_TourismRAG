"""User-facing normalization for async job failures."""

from __future__ import annotations

from typing import Any


QWEN_FREE_TIER_ONLY_CODE = "AllocationQuota.FreeTierOnly"


def public_job_error(exc: Exception) -> str:
    """Return a concise user-facing error for a failed background job."""

    status_code = getattr(exc, "status_code", None)
    error_code = _provider_error_code(getattr(exc, "body", None))
    if status_code == 403 and error_code == QWEN_FREE_TIER_ONLY_CODE:
        return (
            "Qwen Cloud 当前账号仍处于 free-tier-only 限制或免费额度已用尽，"
            "请在 Qwen Cloud 控制台关闭 free-tier-only 模式或确认付费额度后重试。"
        )
    return str(exc)


def _provider_error_code(body: Any) -> str | None:
    if not isinstance(body, dict):
        return None
    direct_code = body.get("code")
    if isinstance(direct_code, str):
        return direct_code
    nested_error = body.get("error")
    if isinstance(nested_error, dict):
        nested_code = nested_error.get("code")
        if isinstance(nested_code, str):
            return nested_code
    return None
