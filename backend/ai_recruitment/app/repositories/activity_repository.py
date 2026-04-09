from __future__ import annotations

from typing import Any

from app.db.client import SupabaseClientFactory


class RecruiterActivityRepository:
    """Lightweight usage logging for dashboard analytics."""

    def __init__(self, client_factory: SupabaseClientFactory) -> None:
        self._client_factory = client_factory

    def create_activity(
        self,
        access_token: str,
        recruiter_id: str,
        *,
        activity_type: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        client = self._client_factory.for_access_token(access_token)
        client.table("recruiter_activity").insert(
            {
                "recruiter_id": recruiter_id,
                "activity_type": activity_type,
                "metadata": metadata or {},
            }
        ).execute()
