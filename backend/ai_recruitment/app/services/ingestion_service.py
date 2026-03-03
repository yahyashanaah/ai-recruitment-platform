from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from langchain_openai import ChatOpenAI

from app.models.candidate import CandidateORM, CandidateRepository
from app.models.schemas import CandidateExtractionSchema, CandidateProfileResponse, DeleteCandidateResponse, DeleteFileResponse, UploadResponse
from app.prompts.extraction_prompt import build_extraction_prompt
from app.utils.chunking import chunk_pages
from app.utils.document_loader import load_document
from app.vectorstore.base import BaseVectorStore


class IngestionService:
    """Service layer for CV ingestion and candidate profile operations."""

    def __init__(
        self,
        vector_store: BaseVectorStore,
        candidate_repository: CandidateRepository,
        extraction_model: ChatOpenAI,
        chunk_size: int,
        chunk_overlap: int,
    ) -> None:
        self._vector_store = vector_store
        self._candidate_repository = candidate_repository
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._extractor = extraction_model.with_structured_output(CandidateExtractionSchema)

    async def ingest_files(self, files: list[UploadFile]) -> UploadResponse:
        """Ingest uploaded CV files, index chunks, and persist structured profiles."""
        processed_candidates: list[CandidateProfileResponse] = []
        errors: list[str] = []
        total_chunks = 0

        for upload_file in files:
            file_name = upload_file.filename or "unknown"
            candidate_id = str(uuid4())

            try:
                pages = await load_document(upload_file)
                full_text = "\n\n".join(page.text for page in pages if page.text.strip())
                if not full_text.strip():
                    raise ValueError("No readable text was extracted from the document.")

                extracted_profile = await self._extract_profile(full_text=full_text, file_name=file_name)
                candidate_name = extracted_profile.name.strip() or Path(file_name).stem
                profile_payload = extracted_profile.model_dump()
                profile_payload["name"] = candidate_name

                chunks = chunk_pages(
                    pages=pages,
                    chunk_size=self._chunk_size,
                    chunk_overlap=self._chunk_overlap,
                    base_metadata={
                        "candidate_id": candidate_id,
                        "candidate_name": candidate_name,
                        "file_name": file_name,
                    },
                )

                if not chunks:
                    raise ValueError("No chunkable content found in the document.")

                self._vector_store.add_documents(chunks)

                try:
                    candidate_row = self._candidate_repository.create_candidate(
                        candidate_id=candidate_id,
                        file_name=file_name,
                        profile=profile_payload,
                    )
                except Exception:
                    # Keep stores consistent if SQLite write fails.
                    self._vector_store.delete_candidate(candidate_id=candidate_id)
                    raise

                total_chunks += len(chunks)
                processed_candidates.append(self._to_response_model(candidate_row))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{file_name}: {exc}")

        files_processed = len(processed_candidates)
        failed_count = len(errors)

        return UploadResponse(
            success=files_processed > 0,
            message="Files processed successfully" if files_processed > 0 else "No files processed",
            files_processed=files_processed,
            total_chunks=total_chunks,
            processed_count=files_processed,
            failed_count=failed_count,
            candidates=processed_candidates,
            errors=errors,
        )

    def get_all_candidates(self) -> list[CandidateProfileResponse]:
        rows = self._candidate_repository.get_all_candidates()
        return [self._to_response_model(row) for row in rows]

    def delete_candidate(self, candidate_id: str) -> DeleteCandidateResponse:
        deleted_from_sqlite = self._candidate_repository.delete_candidate(
            candidate_id=candidate_id,
        )
        deleted_vectors = self._vector_store.delete_candidate(
            candidate_id=candidate_id,
        )

        return DeleteCandidateResponse(
            candidate_id=candidate_id,
            deleted_from_sqlite=deleted_from_sqlite,
            deleted_vectors=deleted_vectors,
        )

    def delete_file(self, file_name: str) -> DeleteFileResponse:
        candidate_ids = self._candidate_repository.get_candidate_ids_by_file_name(file_name=file_name)

        deleted_vectors = 0
        for candidate_id in candidate_ids:
            deleted_vectors += self._vector_store.delete_candidate(candidate_id=candidate_id)

        deleted_candidates = self._candidate_repository.delete_candidates_by_file_name(file_name=file_name)

        return DeleteFileResponse(
            file_name=file_name,
            deleted_candidates=deleted_candidates,
            deleted_vectors=deleted_vectors,
        )

    async def _extract_profile(self, full_text: str, file_name: str) -> CandidateExtractionSchema:
        prompt = build_extraction_prompt(cv_text=full_text)
        try:
            return await self._extractor.ainvoke(prompt)
        except Exception:
            # If extraction fails, continue ingestion with a minimal profile.
            return CandidateExtractionSchema(name=Path(file_name).stem)

    @staticmethod
    def _to_response_model(row: CandidateORM) -> CandidateProfileResponse:
        return CandidateProfileResponse(
            candidate_id=row.candidate_id,
            file_name=row.file_name,
            name=row.name,
            phone_number=row.phone_number,
            gmail=row.gmail,
            location=row.location,
            years_of_experience=float(row.years_of_experience or 0),
            skills=list(row.skills or []),
            education=row.education,
            current_position=row.current_position,
            certifications=list(row.certifications or []),
            raw_profile=dict(row.raw_profile or {}),
        )
