from __future__ import annotations

from datetime import datetime
from typing import Any

from app.db.client import SupabaseClientFactory


class CandidateRepository:
    """Supabase repository for recruiter-scoped candidate records."""

    _LIST_COLUMNS = ",".join(
        [
            "id",
            "file_name",
            "name",
            "linkedin",
            "phone_number",
            "gmail",
            "location",
            "years_of_experience",
            "skills",
            "education",
            "current_position",
            "certifications",
            "created_at",
        ]
    )

    def __init__(self, client_factory: SupabaseClientFactory) -> None:
        self._client_factory = client_factory

    @staticmethod
    def _apply_filters(
        query: Any,
        *,
        skills: list[str] | None = None,
        min_experience: float | None = None,
        location: str | None = None,
        education: str | None = None,
        certifications: list[str] | None = None,
        candidate_ids: list[str] | None = None,
        file_name: str | None = None,
        created_from: datetime | None = None,
    ) -> Any:
        if candidate_ids is not None:
            if not candidate_ids:
                return None
            query = query.in_("id", candidate_ids)

        if skills:
            query = query.contains("skills", skills)
        if min_experience is not None:
            query = query.gte("years_of_experience", min_experience)
        if location:
            query = query.ilike("location", f"%{location}%")
        if education:
            query = query.ilike("education", f"%{education}%")
        if certifications:
            query = query.contains("certifications", certifications)
        if file_name:
            query = query.eq("file_name", file_name)
        if created_from is not None:
            query = query.gte("created_at", created_from.isoformat())

        return query

    def ingest_candidate_with_chunks(
        self,
        access_token: str,
        recruiter_id: str,
        candidate_payload: dict[str, Any],
        chunks_payload: list[dict[str, Any]],
    ) -> str:
        client = self._client_factory.for_access_token(access_token)
        response = client.rpc(
            "ingest_candidate_with_chunks",
            {
                "recruiter_input": recruiter_id,
                "candidate_input": candidate_payload,
                "chunks_input": chunks_payload,
            },
        ).execute()

        data = response.data
        if isinstance(data, list):
            if not data:
                raise RuntimeError("Supabase ingestion RPC returned no candidate id.")
            return str(data[0])

        if not data:
            raise RuntimeError("Supabase ingestion RPC returned no candidate id.")

        return str(data)

    def list_candidates(
        self,
        access_token: str,
        recruiter_id: str,
        *,
        limit: int,
        offset: int,
        skills: list[str] | None = None,
        min_experience: float | None = None,
        location: str | None = None,
        education: str | None = None,
        certifications: list[str] | None = None,
        candidate_ids: list[str] | None = None,
        file_name: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        client = self._client_factory.for_access_token(access_token)
        base_query = (
            client.table("candidates")
            .select(self._LIST_COLUMNS, count="exact")
            .eq("recruiter_id", recruiter_id)
            .order("created_at", desc=True)
        )
        query = self._apply_filters(
            base_query,
            skills=skills,
            min_experience=min_experience,
            location=location,
            education=education,
            certifications=certifications,
            candidate_ids=candidate_ids,
            file_name=file_name,
        )
        if query is None:
            return [], 0

        if candidate_ids is None:
            response = query.range(offset, offset + limit - 1).execute()
            rows = response.data or []
            total = int(response.count or len(rows))
            return rows, total

        response = query.execute()
        rows = response.data or []
        total = int(response.count or len(rows))

        order_map = {candidate_id: position for position, candidate_id in enumerate(candidate_ids)}
        rows.sort(key=lambda row: order_map.get(str(row["id"]), len(order_map)))
        return rows[offset : offset + limit], total

    def list_candidate_ids(
        self,
        access_token: str,
        recruiter_id: str,
        *,
        skills: list[str] | None = None,
        min_experience: float | None = None,
        location: str | None = None,
        education: str | None = None,
        certifications: list[str] | None = None,
        file_name: str | None = None,
    ) -> list[str]:
        client = self._client_factory.for_access_token(access_token)
        base_query = client.table("candidates").select("id").eq("recruiter_id", recruiter_id)
        query = self._apply_filters(
            base_query,
            skills=skills,
            min_experience=min_experience,
            location=location,
            education=education,
            certifications=certifications,
            file_name=file_name,
        )
        if query is None:
            return []

        response = query.execute()
        return [str(row["id"]) for row in (response.data or []) if row.get("id")]

    def count_candidates(
        self,
        access_token: str,
        recruiter_id: str,
        *,
        created_from: datetime | None = None,
    ) -> int:
        client = self._client_factory.for_access_token(access_token)
        base_query = client.table("candidates").select("id", count="exact").eq("recruiter_id", recruiter_id)
        query = self._apply_filters(base_query, created_from=created_from)
        if query is None:
            return 0

        response = query.limit(1).execute()
        return int(response.count or 0)

    def get_candidate(
        self,
        access_token: str,
        recruiter_id: str,
        candidate_id: str,
    ) -> dict[str, Any] | None:
        client = self._client_factory.for_access_token(access_token)
        response = (
            client.table("candidates")
            .select("*")
            .eq("recruiter_id", recruiter_id)
            .eq("id", candidate_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0] if rows else None

    def update_candidate(
        self,
        access_token: str,
        recruiter_id: str,
        candidate_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        client = self._client_factory.for_access_token(access_token)
        update_payload = {key: value for key, value in payload.items() if value is not None}
        if not update_payload:
            return self.get_candidate(access_token, recruiter_id, candidate_id)

        client.table("candidates").update(update_payload).eq("recruiter_id", recruiter_id).eq(
            "id", candidate_id
        ).execute()
        return self.get_candidate(access_token, recruiter_id, candidate_id)

    def delete_candidate(
        self,
        access_token: str,
        recruiter_id: str,
        candidate_id: str,
    ) -> bool:
        existing = self.get_candidate(access_token, recruiter_id, candidate_id)
        if not existing:
            return False

        client = self._client_factory.for_access_token(access_token)
        client.table("candidates").delete().eq("recruiter_id", recruiter_id).eq("id", candidate_id).execute()
        return True

    def delete_candidates_by_file_name(
        self,
        access_token: str,
        recruiter_id: str,
        file_name: str,
    ) -> int:
        existing, _ = self.list_candidates(
            access_token=access_token,
            recruiter_id=recruiter_id,
            limit=500,
            offset=0,
            file_name=file_name,
        )
        if not existing:
            return 0

        client = self._client_factory.for_access_token(access_token)
        client.table("candidates").delete().eq("recruiter_id", recruiter_id).eq("file_name", file_name).execute()
        return len(existing)
