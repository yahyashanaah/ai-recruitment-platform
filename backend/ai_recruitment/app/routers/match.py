from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import MatchJDRequest, MatchJDResponse
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
