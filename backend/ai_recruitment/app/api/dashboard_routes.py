from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> DashboardSummaryResponse:
    """Return the recruiter dashboard summary in a single response payload."""
    dashboard_service: DashboardService = request.app.state.dashboard_service
    return await dashboard_service.get_summary(current_recruiter)
