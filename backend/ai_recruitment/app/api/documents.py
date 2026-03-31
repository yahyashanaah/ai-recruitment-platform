from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.auth.dependencies import get_current_recruiter
from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import DeleteFileResponse, UploadResponse
from app.services.candidate_service import CandidateService
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    request: Request,
    files: List[UploadFile] = File(
        ...,
        description="Upload one or more CV files (.pdf, .txt, .docx).",
    ),
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> UploadResponse:
    """Upload one or more CV files and persist candidates and vector chunks in Supabase."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    ingestion_service: IngestionService = request.app.state.ingestion_service
    return await ingestion_service.ingest_files(files=files, recruiter=current_recruiter)


@router.delete("/file/{file_name}", response_model=DeleteFileResponse)
def delete_file(
    file_name: str,
    request: Request,
    current_recruiter: AuthenticatedRecruiter = Depends(get_current_recruiter),
) -> DeleteFileResponse:
    """Delete all candidates and cascaded chunks associated with a source file."""
    candidate_service: CandidateService = request.app.state.candidate_service
    return candidate_service.delete_file(recruiter=current_recruiter, file_name=file_name)

