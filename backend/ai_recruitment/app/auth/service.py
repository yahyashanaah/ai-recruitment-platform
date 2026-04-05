from __future__ import annotations

from dataclasses import dataclass
from time import monotonic
from typing import Any

from fastapi import HTTPException, status

from app.repositories.recruiters import RecruiterRepository


@dataclass(slots=True)
class AuthenticatedRecruiter:
    """Authenticated recruiter context attached to each request."""

    id: str
    email: str
    full_name: str
    access_token: str


class AuthService:
    """Validates Supabase JWTs and ensures recruiter profile records exist."""

    def __init__(self, recruiter_repository: RecruiterRepository, cache_ttl_seconds: float = 120.0) -> None:
        self._recruiter_repository = recruiter_repository
        self._cache_ttl_seconds = cache_ttl_seconds
        self._recruiter_cache: dict[str, tuple[float, AuthenticatedRecruiter]] = {}

    def authenticate(self, access_token: str | None) -> AuthenticatedRecruiter:
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing bearer token.",
            )

        cached = self._recruiter_cache.get(access_token)
        now = monotonic()
        if cached and cached[0] > now:
            return cached[1]

        try:
            auth_response = self._recruiter_repository.get_auth_user(access_token)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Supabase access token.",
            ) from exc

        auth_user = getattr(auth_response, "user", None)
        recruiter_id = str(getattr(auth_user, "id", "") or "")
        email = str(getattr(auth_user, "email", "") or "")

        if not recruiter_id or not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Supabase user payload is incomplete.",
            )

        recruiter_record = self._recruiter_repository.ensure_from_auth_user(
            access_token=access_token,
            auth_user=auth_user,
        )

        recruiter = AuthenticatedRecruiter(
            id=str(recruiter_record["id"]),
            email=str(recruiter_record["email"]),
            full_name=str(recruiter_record["full_name"]),
            access_token=access_token,
        )
        self._recruiter_cache[access_token] = (now + self._cache_ttl_seconds, recruiter)
        return recruiter

    @staticmethod
    def extract_full_name(auth_user: Any) -> str:
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
