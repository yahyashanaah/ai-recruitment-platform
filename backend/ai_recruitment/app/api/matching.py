from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import MatchJDRequest, MatchJDResponse, SmartJDRequest, SmartJDResponse
from app.services.matching_service import MatchingService

router = APIRouter(tags=["Matching"])


@router.post("/match-jd", response_model=MatchJDResponse)
async def match_job_description(
    payload: MatchJDRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> MatchJDResponse:
    """Match a JD to the best recruiter-owned candidate profiles using pgvector retrieval."""
    matching_service: MatchingService = request.app.state.matching_service
    return await matching_service.match_job_description(
        recruiter=current_recruiter,
        job_description=payload.job_description,
        top_n=payload.top_n,
    )


@router.post("/jd/generate", response_model=SmartJDResponse)
async def generate_smart_job_description(
    payload: SmartJDRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> SmartJDResponse:
    """Generate a structured, matching-optimized JD from a short hiring brief."""
    matching_service: MatchingService = request.app.state.matching_service
    return await matching_service.generate_smart_job_description(
        role_brief=payload.role_brief,
        seniority=payload.seniority,
        industry=payload.industry,
        work_model=payload.work_model,
        include_salary_suggestion=payload.include_salary_suggestion,
    )

