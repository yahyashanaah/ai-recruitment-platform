from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, Response

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import CandidateProfileResponse, CandidateUpdateRequest, DeleteCandidateResponse
from app.services.candidate_service import CandidateService

router = APIRouter(tags=["Candidates"])


@router.get("/candidates", response_model=list[CandidateProfileResponse])
def get_candidates(
    request: Request,
    response: Response,
    skills: list[str] | None = Query(default=None),
    min_experience: float | None = Query(default=None, ge=0),
    location: str | None = Query(default=None),
    education: str | None = Query(default=None),
    certifications: list[str] | None = Query(default=None),
    query: str | None = Query(default=None, min_length=1),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> list[CandidateProfileResponse]:
    """Return recruiter-owned structured candidate profiles with filtering and hybrid search."""
    candidate_service: CandidateService = request.app.state.candidate_service
    candidates, total = candidate_service.list_candidates(
        recruiter=current_recruiter,
        limit=limit,
        offset=offset,
        skills=skills,
        min_experience=min_experience,
        location=location,
        education=education,
        certifications=certifications,
        query=query,
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)
    return candidates


@router.get("/candidates/{candidate_id}", response_model=CandidateProfileResponse)
def get_candidate(
    candidate_id: str,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> CandidateProfileResponse:
    """Return a single recruiter-owned candidate profile."""
    candidate_service: CandidateService = request.app.state.candidate_service
    return candidate_service.get_candidate(recruiter=current_recruiter, candidate_id=candidate_id)


@router.patch("/candidates/{candidate_id}", response_model=CandidateProfileResponse)
def update_candidate(
    candidate_id: str,
    payload: CandidateUpdateRequest,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> CandidateProfileResponse:
    """Update a recruiter-owned candidate profile."""
    candidate_service: CandidateService = request.app.state.candidate_service
    return candidate_service.update_candidate(
        recruiter=current_recruiter,
        candidate_id=candidate_id,
        payload=payload,
    )


@router.delete("/candidates/{candidate_id}", response_model=DeleteCandidateResponse)
def delete_candidate(
    candidate_id: str,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> DeleteCandidateResponse:
    """Delete a recruiter-owned candidate and cascaded chunks."""
    candidate_service: CandidateService = request.app.state.candidate_service
    return candidate_service.delete_candidate(recruiter=current_recruiter, candidate_id=candidate_id)

