from __future__ import annotations

from langchain_openai import ChatOpenAI

from app.auth.service import AuthenticatedRecruiter
from app.models.schemas import CandidateProfileResponse, JDExtractionSchema, MatchJDResponse, SmartJDResponse
from app.prompts.jd_prompt import build_jd_prompt, build_smart_jd_prompt
from app.repositories.candidates import CandidateRepository
from app.repositories.chunks import ChunkRepository
from app.services.embedding_service import EmbeddingService
from app.services.scoring_service import ScoringService


class MatchingService:
    """JD parsing, semantic retrieval, and weighted candidate ranking service."""

    def __init__(
        self,
        candidate_repository: CandidateRepository,
        chunk_repository: ChunkRepository,
        jd_parser_model: ChatOpenAI,
        embedding_service: EmbeddingService,
        scoring_service: ScoringService,
        retrieval_k: int = 50,
    ) -> None:
        self._candidate_repository = candidate_repository
        self._chunk_repository = chunk_repository
        self._embedding_service = embedding_service
        self._scoring_service = scoring_service
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
        matches = self._chunk_repository.search_chunks(
            access_token=recruiter.access_token,
            recruiter_id=recruiter.id,
            query_embedding=self._embedding_service.embed_query(job_description),
            limit=max(self._retrieval_k, top_n * 10),
        )
        candidate_ids = self._rank_candidate_ids(matches)

        if candidate_ids:
            rows, _ = self._candidate_repository.list_candidates(
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                limit=max(top_n * 5, 10),
                offset=0,
                candidate_ids=candidate_ids,
            )
        else:
            rows, _ = self._candidate_repository.list_candidates(
                access_token=recruiter.access_token,
                recruiter_id=recruiter.id,
                limit=max(top_n * 5, 10),
                offset=0,
            )

        candidate_profiles = [CandidateProfileResponse.from_record(row) for row in rows]
        scored = [self._scoring_service.score_candidate(profile, parsed_jd) for profile in candidate_profiles]
        scored.sort(key=lambda item: item.overall_score, reverse=True)
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
    def _rank_candidate_ids(matches: list[dict[str, object]]) -> list[str]:
        rank_map: dict[str, float] = {}

        for position, match in enumerate(matches, start=1):
            candidate_id = str(match.get("candidate_id") or "")
            if not candidate_id:
                continue
            similarity = float(match.get("similarity") or 0)
            rank_map[candidate_id] = rank_map.get(candidate_id, 0.0) + similarity + (1.0 / position)

        return [
            candidate_id
            for candidate_id, _ in sorted(rank_map.items(), key=lambda item: item[1], reverse=True)
        ]
