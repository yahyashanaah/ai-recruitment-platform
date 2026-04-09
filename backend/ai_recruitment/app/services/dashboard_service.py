from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from app.auth.service import AuthenticatedRecruiter
from app.core.cache import TTLCache
from app.models.schemas import (
    DashboardActivityResponse,
    DashboardRecentCandidateResponse,
    DashboardSummaryResponse,
)
from app.repositories.candidates import CandidateRepository
from app.repositories.dashboard_repository import DashboardRepository


class DashboardService:
    """Fast recruiter dashboard summary service with optional direct-postgres path."""

    def __init__(
        self,
        dashboard_repository: DashboardRepository,
        candidate_repository: CandidateRepository,
        cache_ttl_seconds: int,
    ) -> None:
        self._dashboard_repository = dashboard_repository
        self._candidate_repository = candidate_repository
        self._cache = TTLCache[str, DashboardSummaryResponse](
            ttl_seconds=cache_ttl_seconds,
            max_size=1024,
        )

    async def get_summary(self, recruiter: AuthenticatedRecruiter) -> DashboardSummaryResponse:
        cached = self._cache.get(recruiter.id)
        if cached is not None:
            return cached

        if self._dashboard_repository.enabled:
            try:
                raw_summary = await self._dashboard_repository.fetch_summary(recruiter.id)
                summary = DashboardSummaryResponse(
                    total_candidates=int(raw_summary["total_candidates"]),
                    uploads_this_month=int(raw_summary["uploads_this_month"]),
                    match_runs_this_month=int(raw_summary["match_runs_this_month"]),
                    chat_queries_this_month=int(raw_summary["chat_queries_this_month"]),
                    recent_candidates=[
                        DashboardRecentCandidateResponse.from_record(record)
                        for record in raw_summary["recent_candidates"]
                    ],
                    recent_activity=[
                        DashboardActivityResponse.from_record(record)
                        for record in raw_summary["recent_activity"]
                    ],
                )
                self._cache.set(recruiter.id, summary)
                return summary
            except Exception:
                pass

        summary = await self._fallback_summary(recruiter)
        self._cache.set(recruiter.id, summary)
        return summary

    async def _fallback_summary(self, recruiter: AuthenticatedRecruiter) -> DashboardSummaryResponse:
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        total_candidates, uploads_this_month, recent_candidates = await asyncio.gather(
            asyncio.to_thread(
                self._candidate_repository.count_candidates,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
            ),
            asyncio.to_thread(
                self._candidate_repository.count_candidates,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                created_from=month_start,
            ),
            asyncio.to_thread(
                self._candidate_repository.list_candidates,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                limit=5,
                offset=0,
            ),
        )

        candidate_rows, _ = recent_candidates
        recent_candidate_models = [
            DashboardRecentCandidateResponse.from_record(record)
            for record in candidate_rows
        ]
        recent_activity = [
            DashboardActivityResponse(
                activity_type="upload",
                occurred_at=candidate.created_at,
                candidate_id=candidate.candidate_id,
                candidate_name=candidate.name,
                file_name=candidate.file_name,
                detail="Candidate uploaded",
            )
            for candidate in recent_candidate_models
        ]

        return DashboardSummaryResponse(
            total_candidates=total_candidates,
            uploads_this_month=uploads_this_month,
            match_runs_this_month=0,
            chat_queries_this_month=0,
            recent_candidates=recent_candidate_models,
            recent_activity=recent_activity,
        )
