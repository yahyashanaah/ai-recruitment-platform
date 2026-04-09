from __future__ import annotations

from typing import Any
from uuid import UUID

from app.db.pg_client import DirectPostgresPool


class CandidateVectorSearchRepository:
    """Direct-postgres semantic search for candidate discovery and ranking."""

    def __init__(self, pg_pool: DirectPostgresPool | None) -> None:
        self._pg_pool = pg_pool

    @property
    def enabled(self) -> bool:
        return bool(self._pg_pool and self._pg_pool.get_pool() is not None)

    async def search_candidates_by_embedding(
        self,
        recruiter_id: str,
        query_embedding: list[float],
        *,
        limit: int,
        candidate_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        pool = self._pg_pool.get_pool() if self._pg_pool else None
        if pool is None:
            raise RuntimeError("Direct PostgreSQL pool is not configured.")

        recruiter_uuid = UUID(recruiter_id)
        candidate_filter = [UUID(candidate_id) for candidate_id in candidate_ids] if candidate_ids else None
        requested_limit = max(limit, 1)
        probe_limit = max(requested_limit * 8, 40)
        vector_literal = _vector_literal(query_embedding)

        query = """
            with ranked_hits as (
                select
                    candidate_id,
                    1 - (embedding <=> ($2)::extensions.vector(384)) as similarity
                from public.candidate_chunks
                where recruiter_id = $1
                  and ($3::uuid[] is null or candidate_id = any($3))
                order by embedding <=> ($2)::extensions.vector(384)
                limit $4
            )
            select
                candidate_id::text as candidate_id,
                max(similarity)::double precision as similarity,
                count(*)::integer as hit_count
            from ranked_hits
            group by candidate_id
            order by max(similarity) desc, count(*) desc, candidate_id
            limit $5
        """

        async with pool.acquire() as connection:
            rows = await connection.fetch(
                query,
                recruiter_uuid,
                vector_literal,
                candidate_filter,
                probe_limit,
                requested_limit,
            )

        return [
            {
                "candidate_id": str(row["candidate_id"]),
                "similarity": float(row["similarity"] or 0.0),
                "hit_count": int(row["hit_count"] or 0),
            }
            for row in rows
        ]


def _vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.12f}" for value in values) + "]"
