from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import MatchJDRequest, MatchJDResponse, SmartJDRequest, SmartJDResponse
from app.services.matching_service import MatchingService

router = APIRouter(tags=["Matching"])


@router.post("/match-jd", response_model=MatchJDResponse)
async def match_job_description(
    payload: MatchJDRequest,
    request: Request,
) -> MatchJDResponse:
    """Match a JD to the best candidate profiles using retrieval + weighted scoring."""
    matching_service: MatchingService = request.app.state.matching_service
    return await matching_service.match_job_description(
        job_description=payload.job_description,
        top_n=payload.top_n,
    )


@router.post("/jd/generate", response_model=SmartJDResponse)
async def generate_smart_job_description(
    payload: SmartJDRequest,
    request: Request,
) -> SmartJDResponse:
    """Generate a structured, matching-optimized JD from a short hiring brief."""
    matching_service: MatchingService = request.app.state.matching_service
    return await matching_service.generate_smart_job_description(
        role_brief=payload.role_brief,
        include_salary_suggestion=payload.include_salary_suggestion,
    )
