from __future__ import annotations

from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import RecruiterResponse, RecruiterSessionResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=RecruiterSessionResponse)
def get_current_session(
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> RecruiterSessionResponse:
    """Return the current authenticated recruiter profile."""
    return RecruiterSessionResponse(
        recruiter=RecruiterResponse(
            id=current_recruiter.id,
            full_name=current_recruiter.full_name,
            email=current_recruiter.email,
        )
    )
