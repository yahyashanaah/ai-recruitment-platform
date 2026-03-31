from __future__ import annotations

from typing import Any

from app.db.client import SupabaseClientFactory


class ChunkRepository:
    """Supabase repository for recruiter-scoped candidate chunks and vector search."""

    def __init__(self, client_factory: SupabaseClientFactory) -> None:
        self._client_factory = client_factory

    def count_chunks_for_candidate(
        self,
        access_token: str,
        recruiter_id: str,
        candidate_id: str,
    ) -> int:
        client = self._client_factory.for_access_token(access_token)
        response = (
            client.table("candidate_chunks")
            .select("id", count="exact")
            .eq("recruiter_id", recruiter_id)
            .eq("candidate_id", candidate_id)
            .limit(1)
            .execute()
        )
        return int(response.count or 0)

    def list_chunks(
        self,
        access_token: str,
        recruiter_id: str,
        *,
        candidate_id: str | None,
        limit: int,
        offset: int,
    ) -> tuple[list[dict[str, Any]], int]:
        client = self._client_factory.for_access_token(access_token)
        query = (
            client.table("candidate_chunks")
            .select("*", count="exact")
            .eq("recruiter_id", recruiter_id)
            .order("created_at", desc=True)
        )
        if candidate_id:
            query = query.eq("candidate_id", candidate_id)

        response = query.range(offset, offset + limit - 1).execute()
        rows = response.data or []
        total = int(response.count or len(rows))
        return rows, total

    def get_chunk(
        self,
        access_token: str,
        recruiter_id: str,
        chunk_id: str,
    ) -> dict[str, Any] | None:
        client = self._client_factory.for_access_token(access_token)
        response = (
            client.table("candidate_chunks")
            .select("*")
            .eq("recruiter_id", recruiter_id)
            .eq("id", chunk_id)
            .limit(1)
            .execute()
        )
        rows = response.data or []
        return rows[0] if rows else None

    def create_chunk(
        self,
        access_token: str,
        recruiter_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        client = self._client_factory.for_access_token(access_token)
        insert_payload = dict(payload)
        if isinstance(insert_payload.get("embedding"), list):
            insert_payload["embedding"] = _vector_literal(insert_payload["embedding"])

        response = client.table("candidate_chunks").insert(insert_payload).execute()
        rows = response.data or []
        if rows:
            return rows[0]

        chunk_id = str(insert_payload["id"])
        record = self.get_chunk(access_token, recruiter_id, chunk_id)
        if not record:
            raise RuntimeError("Failed to create candidate chunk.")
        return record

    def update_chunk(
        self,
        access_token: str,
        recruiter_id: str,
        chunk_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        client = self._client_factory.for_access_token(access_token)
        update_payload = {key: value for key, value in payload.items() if value is not None}
        if isinstance(update_payload.get("embedding"), list):
            update_payload["embedding"] = _vector_literal(update_payload["embedding"])
        if not update_payload:
            return self.get_chunk(access_token, recruiter_id, chunk_id)

        client.table("candidate_chunks").update(update_payload).eq("recruiter_id", recruiter_id).eq(
            "id", chunk_id
        ).execute()
        return self.get_chunk(access_token, recruiter_id, chunk_id)

    def delete_chunk(
        self,
        access_token: str,
        recruiter_id: str,
        chunk_id: str,
    ) -> bool:
        existing = self.get_chunk(access_token, recruiter_id, chunk_id)
        if not existing:
            return False

        client = self._client_factory.for_access_token(access_token)
        client.table("candidate_chunks").delete().eq("recruiter_id", recruiter_id).eq("id", chunk_id).execute()
        return True

    def search_chunks(
        self,
        access_token: str,
        recruiter_id: str,
        query_embedding: list[float],
        *,
        limit: int,
        candidate_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        client = self._client_factory.for_access_token(access_token)
        response = client.rpc(
            "match_candidate_chunks",
            {
                "query_embedding": _vector_literal(query_embedding),
                "recruiter_filter": recruiter_id,
                "match_count": limit,
                "candidate_filter": candidate_ids,
            },
        ).execute()
        return list(response.data or [])


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.12f}" for value in values) + "]"
