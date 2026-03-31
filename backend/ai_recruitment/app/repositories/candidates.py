from __future__ import annotations

from typing import Any

from app.db.client import SupabaseClientFactory


class CandidateRepository:
    """Supabase repository for recruiter-scoped candidate records."""

    def __init__(self, client_factory: SupabaseClientFactory) -> None:
        self._client_factory = client_factory

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
        query = (
            client.table("candidates")
            .select("*", count="exact")
            .eq("recruiter_id", recruiter_id)
            .order("created_at", desc=True)
        )

        if candidate_ids is not None:
            if not candidate_ids:
                return [], 0
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
