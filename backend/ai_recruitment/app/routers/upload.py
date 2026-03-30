from __future__ import annotations

from typing import List

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.models.schemas import DeleteFileResponse, UploadResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    request: Request,
    files: List[UploadFile] = File(
        ...,
        description="Upload one or more CV files (.pdf, .txt, .docx).",
    ),
) -> UploadResponse:
    """Upload one or more CV files and index them for RAG and matching."""
    ingestion_service: IngestionService = request.app.state.ingestion_service

    if not files:
        raise HTTPException(
            status_code=400,
            detail="No files uploaded. Use the file picker and send multipart/form-data.",
        )

    return await ingestion_service.ingest_files(files=files)


@router.delete("/file/{file_name}", response_model=DeleteFileResponse)
def delete_file(
    file_name: str,
    request: Request,
) -> DeleteFileResponse:
    """Delete all candidates and vectors associated with a file name."""
    ingestion_service: IngestionService = request.app.state.ingestion_service
    return ingestion_service.delete_file(file_name=file_name)
