from __future__ import annotations

import asyncio

from langchain_openai import ChatOpenAI

from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import CandidateProfileResponse, JDExtractionSchema, MatchJDResponse, SmartJDResponse
from app.prompts.jd_prompt import build_jd_prompt, build_smart_jd_prompt
from app.repositories.activity_repository import RecruiterActivityRepository
from app.repositories.candidates import CandidateRepository
from app.repositories.candidate_vector_search_repository import CandidateVectorSearchRepository
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService
from app.services.scoring_service import ScoringService


class MatchingService:
    """JD parsing, semantic retrieval, and weighted candidate ranking service."""

    def __init__(
        self,
        candidate_repository: CandidateRepository,
        chunk_repository: ChunkRepository,
        vector_search_repository: CandidateVectorSearchRepository,
        jd_parser_model: ChatOpenAI,
        embedding_service: EmbeddingService,
        scoring_service: ScoringService,
        activity_repository: RecruiterActivityRepository | None = None,
        retrieval_k: int = 50,
    ) -> None:
        self._candidate_repository = candidate_repository
        self._chunk_repository = chunk_repository
        self._vector_search_repository = vector_search_repository
        self._embedding_service = embedding_service
        self._scoring_service = scoring_service
        self._activity_repository = activity_repository
        self._retrieval_k = retrieval_k
        self._jd_parser = jd_parser_model.with_structured_output(JDExtractionSchema)
        self._jd_generator = jd_parser_model.with_structured_output(SmartJDResponse)

    async def match_job_description(
        self,
        recruiter: AuthenticatedRecruiter,
        job_description: str,
        top_n: int = 3,
    ) -> MatchJDResponse:
        parsed_jd = await self._parse_job_description(job_description)
        query_embedding = await self._embedding_service.embed_query_async(job_description)
        candidate_ids: list[str]
        semantic_scores: dict[str, float]

        if self._vector_search_repository.enabled:
            vector_hits = await self._vector_search_repository.search_candidates_by_embedding(
                recruiter_id=recruiter.id,
                query_embedding=query_embedding,
                limit=max(self._retrieval_k, top_n * 10),
            )
            candidate_ids, semantic_scores = self._rank_vector_hits(vector_hits)
        else:
            matches = await asyncio.to_thread(
                self._chunk_repository.search_chunks,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                query_embedding=query_embedding,
                limit=max(self._retrieval_k, top_n * 10),
            )
            candidate_ids, semantic_scores = self._rank_candidate_ids(matches)

        if candidate_ids:
            rows, _ = await asyncio.to_thread(
                self._candidate_repository.list_candidates,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                limit=max(top_n * 5, 10),
                offset=0,
                candidate_ids=candidate_ids,
            )
        else:
            rows, _ = await asyncio.to_thread(
                self._candidate_repository.list_candidates,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                limit=max(top_n * 5, 10),
                offset=0,
            )

        candidate_profiles = [CandidateProfileResponse.from_record(row) for row in rows]
        scored = [
            self._scoring_service.score_candidate(
                profile,
                parsed_jd,
                semantic_score=semantic_scores.get(profile.candidate_id),
            )
            for profile in candidate_profiles
        ]
        scored.sort(
            key=lambda item: (
                item.overall_score,
                semantic_scores.get(item.candidate_id, 0.0),
                item.skill_overlap.matched_required_skills,
                item.years_of_experience,
            ),
            reverse=True,
        )
        await self._record_activity(
            recruiter=recruiter,
            activity_type="match",
            metadata={"detail": "Ran JD matching"},
        )
        return MatchJDResponse(parsed_jd=parsed_jd, top_candidates=scored[:top_n])

    async def generate_smart_job_description(
        self,
        role_brief: str,
        seniority: str = "",
        industry: str = "",
        work_model: str = "",
        include_salary_suggestion: bool = True,
    ) -> SmartJDResponse:
        prompt = build_smart_jd_prompt(
            role_brief=role_brief,
            seniority=seniority,
            industry=industry,
            work_model=work_model,
            include_salary_suggestion=include_salary_suggestion,
        )
        return await self._jd_generator.ainvoke(prompt)

    async def _parse_job_description(self, job_description: str) -> JDExtractionSchema:
        return await self._jd_parser.ainvoke(build_jd_prompt(job_description=job_description))

    @staticmethod
    def _rank_candidate_ids(matches: list[dict[str, object]]) -> tuple[list[str], dict[str, float]]:
        rank_map: dict[str, float] = {}
        similarity_map: dict[str, list[float]] = {}

        for position, match in enumerate(matches, start=1):
            candidate_id = str(match.get("candidate_id") or "")
            if not candidate_id:
                continue
            similarity = max(float(match.get("similarity") or 0), 0.0)
            rank_map[candidate_id] = rank_map.get(candidate_id, 0.0) + similarity + (1.0 / position)
            similarity_map.setdefault(candidate_id, []).append(similarity)

        ordered_ids = [
            candidate_id
            for candidate_id, _ in sorted(rank_map.items(), key=lambda item: item[1], reverse=True)
        ]
        semantic_scores = {
            candidate_id: MatchingService._semantic_score(values)
            for candidate_id, values in similarity_map.items()
        }
        return ordered_ids, semantic_scores

    @staticmethod
    def _rank_vector_hits(matches: list[dict[str, object]]) -> tuple[list[str], dict[str, float]]:
        ordered_ids = [str(match.get("candidate_id") or "") for match in matches if match.get("candidate_id")]
        semantic_scores = {
            str(match["candidate_id"]): round(min(100.0, float(match.get("similarity") or 0.0) * 100.0), 2)
            for match in matches
            if match.get("candidate_id")
        }
        return ordered_ids, semantic_scores

    @staticmethod
    def _semantic_score(similarities: list[float]) -> float:
        if not similarities:
            return 0.0

        top_similarities = sorted(similarities, reverse=True)[:3]
        peak_similarity = top_similarities[0]
        average_similarity = sum(top_similarities) / len(top_similarities)
        return round(min(100.0, ((peak_similarity * 0.65) + (average_similarity * 0.35)) * 100), 2)

    async def _record_activity(
        self,
        *,
        recruiter: AuthenticatedRecruiter,
        activity_type: str,
        metadata: dict[str, object],
    ) -> None:
        if self._activity_repository is None:
            return

        try:
            await asyncio.to_thread(
                self._activity_repository.create_activity,
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                activity_type=activity_type,
                metadata=metadata,
            )
        except Exception:
            return
