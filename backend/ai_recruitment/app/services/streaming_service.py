from __future__ import annotations

import json
from typing import Any


class StreamingService:
    """Helper for formatting Server-Sent Events payloads."""

    @staticmethod
    def to_sse(event: str, data: dict[str, Any]) -> str:
        return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
