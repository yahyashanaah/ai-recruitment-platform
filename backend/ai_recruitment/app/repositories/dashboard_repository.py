from __future__ import annotations

from typing import Any
from uuid import UUID

from app.db.pg_client import DirectPostgresPool


class DashboardRepository:
    """Direct-postgres dashboard aggregation queries."""

    def __init__(self, pg_pool: DirectPostgresPool | None) -> None:
        self._pg_pool = pg_pool

    @property
    def enabled(self) -> bool:
        return bool(self._pg_pool and self._pg_pool.get_pool() is not None)

    async def fetch_summary(
        self,
        recruiter_id: str,
        *,
        recent_candidates_limit: int = 5,
        recent_activity_limit: int = 8,
    ) -> dict[str, Any]:
        pool = self._pg_pool.get_pool() if self._pg_pool else None
        if pool is None:
            raise RuntimeError("Direct PostgreSQL pool is not configured.")

        recruiter_uuid = UUID(recruiter_id)

        summary_query = """
            select
                (select count(*)::integer
                 from public.candidates
                 where recruiter_id = $1) as total_candidates,
                (select count(*)::integer
                 from public.candidates
                 where recruiter_id = $1
                   and created_at >= date_trunc('month', timezone('utc', now()))) as uploads_this_month,
                (select count(*)::integer
                 from public.recruiter_activity
                 where recruiter_id = $1
                   and activity_type = 'match'
                   and occurred_at >= date_trunc('month', timezone('utc', now()))) as match_runs_this_month,
                (select count(*)::integer
                 from public.recruiter_activity
                 where recruiter_id = $1
                   and activity_type = 'chat'
                   and occurred_at >= date_trunc('month', timezone('utc', now()))) as chat_queries_this_month
        """

        recent_candidates_query = """
            select
                id::text as candidate_id,
                name,
                file_name,
                current_position,
                location,
                created_at
            from public.candidates
            where recruiter_id = $1
            order by created_at desc
            limit $2
        """

        recent_activity_query = """
            select
                activity_type,
                occurred_at,
                candidate_id::text as candidate_id,
                candidate_name,
                file_name,
                detail
            from (
                select
                    'upload'::text as activity_type,
                    created_at as occurred_at,
                    id as candidate_id,
                    name as candidate_name,
                    file_name,
                    'Candidate uploaded'::text as detail
                from public.candidates
                where recruiter_id = $1

                union all

                select
                    activity_type,
                    occurred_at,
                    nullif(metadata ->> 'candidate_id', '')::uuid as candidate_id,
                    coalesce(metadata ->> 'candidate_name', '') as candidate_name,
                    coalesce(metadata ->> 'file_name', '') as file_name,
                    coalesce(metadata ->> 'detail', '') as detail
                from public.recruiter_activity
                where recruiter_id = $1
            ) activity_feed
            order by occurred_at desc
            limit $2
        """

        async with pool.acquire() as connection:
            summary_row = await connection.fetchrow(summary_query, recruiter_uuid)
            recent_candidate_rows = await connection.fetch(
                recent_candidates_query,
                recruiter_uuid,
                recent_candidates_limit,
            )
            recent_activity_rows = await connection.fetch(
                recent_activity_query,
                recruiter_uuid,
                recent_activity_limit,
            )

        return {
            "total_candidates": int(summary_row["total_candidates"] or 0) if summary_row else 0,
            "uploads_this_month": int(summary_row["uploads_this_month"] or 0) if summary_row else 0,
            "match_runs_this_month": int(summary_row["match_runs_this_month"] or 0) if summary_row else 0,
            "chat_queries_this_month": int(summary_row["chat_queries_this_month"] or 0) if summary_row else 0,
            "recent_candidates": [dict(row) for row in recent_candidate_rows],
            "recent_activity": [dict(row) for row in recent_activity_rows],
        }
