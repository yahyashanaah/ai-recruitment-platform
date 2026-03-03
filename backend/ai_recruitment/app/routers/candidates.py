from __future__ import annotations

from fastapi import APIRouter, Request

from app.models.schemas import CandidateProfileResponse, DeleteCandidateResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(tags=["Candidates"])


@router.get("/candidates", response_model=list[CandidateProfileResponse])
def get_candidates(
    request: Request,
) -> list[CandidateProfileResponse]:
    """Return all structured candidate profiles."""
    ingestion_service: IngestionService = request.app.state.ingestion_service
    return ingestion_service.get_all_candidates()


@router.delete("/candidates/{candidate_id}", response_model=DeleteCandidateResponse)
def delete_candidate(
    candidate_id: str,
    request: Request,
) -> DeleteCandidateResponse:
    """Delete candidate data from SQLite and FAISS."""
    ingestion_service: IngestionService = request.app.state.ingestion_service
    return ingestion_service.delete_candidate(candidate_id=candidate_id)
