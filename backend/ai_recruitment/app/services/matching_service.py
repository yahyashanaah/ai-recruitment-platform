from __future__ import annotations

from langchain_core.documents import Document
from langchain_openai import ChatOpenAI

from app.models.candidate import CandidateORM, CandidateRepository
from app.models.schemas import (
    CandidateProfileResponse,
    JDExtractionSchema,
    MatchJDResponse,
)
from app.prompts.jd_prompt import build_jd_prompt
from app.services.scoring_service import ScoringService
from app.vectorstore.base import BaseVectorStore


class MatchingService:
    """Service that matches a JD against indexed candidates and scores top matches."""

    def __init__(
        self,
        vector_store: BaseVectorStore,
        candidate_repository: CandidateRepository,
        jd_parser_model: ChatOpenAI,
        scoring_service: ScoringService,
        retrieval_k: int = 50,
    ) -> None:
        self._vector_store = vector_store
        self._candidate_repository = candidate_repository
        self._scoring_service = scoring_service
        self._retrieval_k = retrieval_k
        self._jd_parser = jd_parser_model.with_structured_output(JDExtractionSchema)

    async def match_job_description(self, job_description: str) -> MatchJDResponse:
        parsed_jd = await self._parse_job_description(job_description)

        docs = self._vector_store.similarity_search(
            query=job_description,
            k=self._retrieval_k,
        )
        ranked_candidate_ids = self._rank_candidates_from_docs(docs)[:10]

        if ranked_candidate_ids:
            candidate_rows = self._candidate_repository.get_candidates_by_ids(
                candidate_ids=ranked_candidate_ids,
            )
        else:
            candidate_rows = self._candidate_repository.get_all_candidates()[:10]

        candidate_profiles = [self._to_profile_response(row) for row in candidate_rows]
        scored = [self._scoring_service.score_candidate(profile, parsed_jd) for profile in candidate_profiles]
        scored.sort(key=lambda item: item.overall_score, reverse=True)

        return MatchJDResponse(parsed_jd=parsed_jd, top_candidates=scored[:3])

    async def _parse_job_description(self, job_description: str) -> JDExtractionSchema:
        prompt = build_jd_prompt(job_description=job_description)
        return await self._jd_parser.ainvoke(prompt)

    @staticmethod
    def _rank_candidates_from_docs(documents: list[Document]) -> list[str]:
        rank_map: dict[str, float] = {}

        for position, doc in enumerate(documents, start=1):
            metadata = doc.metadata or {}
            candidate_id = str(metadata.get("candidate_id", ""))
            if not candidate_id:
                continue

            # Higher weight for earlier retrieval positions.
            rank_map[candidate_id] = rank_map.get(candidate_id, 0.0) + (1.0 / position)

        ranked_pairs = sorted(rank_map.items(), key=lambda item: item[1], reverse=True)
        return [candidate_id for candidate_id, _ in ranked_pairs]

    @staticmethod
    def _to_profile_response(row: CandidateORM) -> CandidateProfileResponse:
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
