from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.db.client import SupabaseClientFactory


class RecruiterRepository:
    """Supabase persistence for recruiter profiles mapped to auth.users."""

    def __init__(self, client_factory: SupabaseClientFactory) -> None:
        self._client_factory = client_factory

    def get_auth_user(self, access_token: str) -> Any:
        return self._client_factory.admin().auth.get_user(access_token)

    def get_by_id(self, access_token: str, recruiter_id: str) -> dict[str, Any] | None:
        client = self._client_factory.for_access_token(access_token)
        response = (
            client.table("recruiters")
            .select("*")
            .eq("id", recruiter_id)
            .limit(1)
            .execute()
        )

        rows = response.data or []
        return rows[0] if rows else None

    def ensure_from_auth_user(self, access_token: str, auth_user: Any) -> dict[str, Any]:
        recruiter_id = str(getattr(auth_user, "id"))
        existing = self.get_by_id(access_token, recruiter_id)
        if existing:
            return existing

        client = self._client_factory.for_access_token(access_token)
        email = str(getattr(auth_user, "email", "") or "")
        payload = {
            "id": recruiter_id,
            "full_name": _extract_full_name(auth_user),
            "email": email,
            "last_login": datetime.now(UTC).isoformat(),
        }
        response = client.table("recruiters").upsert(payload, on_conflict="id").execute()
        rows = response.data or []
        if rows:
            return rows[0]

        created = self.get_by_id(access_token, recruiter_id)
        if not created:
            raise RuntimeError("Failed to ensure recruiter profile.")
        return created


def _extract_full_name(auth_user: Any) -> str:
    metadata = getattr(auth_user, "user_metadata", None) or {}
    full_name = (
        metadata.get("full_name")
        or metadata.get("name")
        or metadata.get("user_name")
        or metadata.get("preferred_username")
        or getattr(auth_user, "email", "").split("@", 1)[0]
        or "Recruiter"
    )
    return str(full_name).strip() or "Recruiter"
