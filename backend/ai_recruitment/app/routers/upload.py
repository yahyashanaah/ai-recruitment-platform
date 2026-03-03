from __future__ import annotations

from typing import List

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.models.schemas import DeleteFileResponse, UploadResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=UploadResponse)
async def upload_documents(
    request: Request,
    file: UploadFile | None = File(
        default=None,
        description="Single file input. Click the file-picker button and select a file from your system.",
    ),
    files: List[UploadFile] | None = File(
        default=None,
        description=(
            "Multiple files input (.pdf, .txt, .docx). "
            "Use the picker for each row and add more rows if needed."
        ),
    ),
) -> UploadResponse:
    """Upload one or more CV files and index them for RAG and matching."""
    ingestion_service: IngestionService = request.app.state.ingestion_service

    upload_items: list[UploadFile] = []
    if file is not None:
        upload_items.append(file)
    if files:
        upload_items.extend(files)

    if not upload_items:
        raise HTTPException(
            status_code=400,
            detail="No files uploaded. Use the file picker and send multipart/form-data.",
        )

    return await ingestion_service.ingest_files(files=upload_items)


@router.delete("/file/{file_name}", response_model=DeleteFileResponse)
def delete_file(
    file_name: str,
    request: Request,
) -> DeleteFileResponse:
    """Delete all candidates and vectors associated with a file name."""
    ingestion_service: IngestionService = request.app.state.ingestion_service
    return ingestion_service.delete_file(file_name=file_name)
