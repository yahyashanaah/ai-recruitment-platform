from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from langchain_openai import ChatOpenAI

from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import CandidateExtractionSchema, CandidateProfileResponse, UploadResponse
from app.prompts.extraction_prompt import build_extraction_prompt
from app.repositories.candidates import CandidateRepository
from app.services.embedding_service import EmbeddingService
from app.utils.chunking import chunk_pages
from app.utils.document_loader import load_document


class IngestionService:
    """Recruiter-scoped CV ingestion pipeline backed by Supabase and pgvector."""

    def __init__(
        self,
        candidate_repository: CandidateRepository,
        extraction_model: ChatOpenAI,
        embedding_service: EmbeddingService,
        chunk_size: int,
        chunk_overlap: int,
    ) -> None:
        self._candidate_repository = candidate_repository
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap
        self._embedding_service = embedding_service
        self._extractor = extraction_model.with_structured_output(CandidateExtractionSchema)

    async def ingest_files(
        self,
        files: list[UploadFile],
        recruiter: AuthenticatedRecruiter,
    ) -> UploadResponse:
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

                embeddings = await self._embedding_service.embed_documents_async(
                    [chunk.page_content for chunk in chunks]
                )
                candidate_payload = {
                    "id": candidate_id,
                    "file_name": file_name,
                    "name": candidate_name,
                    "linkedin": profile_payload.get("linkedin", ""),
                    "phone_number": profile_payload.get("phone_number", ""),
                    "gmail": profile_payload.get("gmail", ""),
                    "location": profile_payload.get("location", ""),
                    "years_of_experience": float(profile_payload.get("years_of_experience") or 0),
                    "skills": profile_payload.get("skills", []),
                    "education": profile_payload.get("education", ""),
                    "current_position": profile_payload.get("current_position", ""),
                    "certifications": profile_payload.get("certifications", []),
                    "raw_profile": {
                        **profile_payload,
                        "file_name": file_name,
                    },
                }
                chunk_payloads = [
                    {
                        "id": str(uuid4()),
                        "candidate_id": candidate_id,
                        "content": chunk.page_content,
                        "embedding": embedding,
                        "page_number": int(chunk.metadata.get("page_number", 1)),
                        "file_name": file_name,
                    }
                    for chunk, embedding in zip(chunks, embeddings, strict=True)
                ]

                saved_candidate_id = await asyncio.to_thread(
                    self._candidate_repository.ingest_candidate_with_chunks,
                    access_token=recruiter.access_token,
                    recruiter_id=recruiter.id,
                    candidate_payload=candidate_payload,
                    chunks_payload=chunk_payloads,
                )
                processed_candidates.append(
                    CandidateProfileResponse(
                        candidate_id=saved_candidate_id,
                        file_name=file_name,
                        name=candidate_name,
                        linkedin=str(profile_payload.get("linkedin") or ""),
                        phone_number=str(profile_payload.get("phone_number") or ""),
                        gmail=str(profile_payload.get("gmail") or ""),
                        location=str(profile_payload.get("location") or ""),
                        years_of_experience=float(profile_payload.get("years_of_experience") or 0),
                        skills=list(profile_payload.get("skills") or []),
                        education=str(profile_payload.get("education") or ""),
                        current_position=str(profile_payload.get("current_position") or ""),
                        certifications=list(profile_payload.get("certifications") or []),
                        raw_profile={**profile_payload, "file_name": file_name},
                    )
                )
                total_chunks += len(chunk_payloads)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{file_name}: {exc}")

        files_processed = len(processed_candidates)
        return UploadResponse(
            success=files_processed > 0,
            message="Files processed successfully" if files_processed > 0 else "No files processed",
            files_processed=files_processed,
            total_chunks=total_chunks,
            processed_count=files_processed,
            failed_count=len(errors),
            candidates=processed_candidates,
            errors=errors,
        )

    async def _extract_profile(self, full_text: str, file_name: str) -> CandidateExtractionSchema:
        prompt = build_extraction_prompt(cv_text=full_text)
        try:
            return await self._extractor.ainvoke(prompt)
        except Exception:
            return CandidateExtractionSchema(name=Path(file_name).stem)
