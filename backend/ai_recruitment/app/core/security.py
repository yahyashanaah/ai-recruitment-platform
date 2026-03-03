from __future__ import annotations

from fastapi import Header


async def get_request_scope(x_request_scope: str | None = Header(default=None)) -> str:
    """Placeholder dependency for future auth and request scoping."""
    if x_request_scope and x_request_scope.strip():
        return x_request_scope.strip()
    return "default"
