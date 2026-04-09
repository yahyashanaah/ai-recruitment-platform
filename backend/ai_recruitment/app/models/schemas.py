from __future__ import annotations

from datetime import datetime
from typing import Any, Mapping, Self

from pydantic import BaseModel, ConfigDict, Field


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


class RecruiterResponse(BaseModel):
    """Authenticated recruiter profile mapped to Supabase auth.users."""

    id: str
    full_name: str
    email: str
    created_at: datetime | None = None
    last_login: datetime | None = None

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        return cls(
            id=str(record["id"]),
            full_name=str(record.get("full_name") or "Recruiter"),
            email=str(record.get("email") or ""),
            created_at=record.get("created_at"),
            last_login=record.get("last_login"),
        )


class RecruiterSessionResponse(BaseModel):
    """Current authenticated recruiter session."""

    recruiter: RecruiterResponse


class CandidateExtractionSchema(BaseModel):
    """LLM output schema for CV profile extraction."""

    name: str = "Unknown"
    linkedin: str = ""
    phone_number: str = ""
    gmail: str = ""
    location: str = ""
    years_of_experience: float = 0
    skills: list[str] = Field(default_factory=list)
    education: str = ""
    current_position: str = ""
    certifications: list[str] = Field(default_factory=list)


class CandidateProfileResponse(BaseModel):
    """Structured candidate profile returned to authenticated recruiters."""

    model_config = ConfigDict(from_attributes=True)

    candidate_id: str
    file_name: str
    name: str
    linkedin: str = ""
    phone_number: str = ""
    gmail: str = ""
    location: str = ""
    years_of_experience: float = 0
    skills: list[str] = Field(default_factory=list)
    education: str = ""
    current_position: str = ""
    certifications: list[str] = Field(default_factory=list)
    raw_profile: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime | None = None

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        raw_profile = record.get("raw_profile")
        return cls(
            candidate_id=str(record.get("id") or record.get("candidate_id")),
            file_name=str(record.get("file_name") or ""),
            name=str(record.get("name") or "Unknown"),
            linkedin=str(record.get("linkedin") or ""),
            phone_number=str(record.get("phone_number") or ""),
            gmail=str(record.get("gmail") or ""),
            location=str(record.get("location") or ""),
            years_of_experience=float(record.get("years_of_experience") or 0),
            skills=_as_string_list(record.get("skills")),
            education=str(record.get("education") or ""),
            current_position=str(record.get("current_position") or ""),
            certifications=_as_string_list(record.get("certifications")),
            raw_profile=raw_profile if isinstance(raw_profile, dict) else {},
            created_at=record.get("created_at"),
        )


class CandidateUpdateRequest(BaseModel):
    """Patchable candidate fields."""

    file_name: str | None = None
    name: str | None = None
    linkedin: str | None = None
    phone_number: str | None = None
    gmail: str | None = None
    location: str | None = None
    years_of_experience: float | None = None
    skills: list[str] | None = None
    education: str | None = None
    current_position: str | None = None
    certifications: list[str] | None = None
    raw_profile: dict[str, Any] | None = None


class UploadResponse(BaseModel):
    """Response model for batch CV ingestion."""

    success: bool
    message: str
    files_processed: int
    total_chunks: int
    processed_count: int
    failed_count: int
    candidates: list[CandidateProfileResponse] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class CandidateChunkResponse(BaseModel):
    """Stored CV chunk with recruiter-scoped metadata."""

    chunk_id: str
    candidate_id: str
    content: str
    page_number: int
    file_name: str
    created_at: datetime | None = None

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        return cls(
            chunk_id=str(record.get("id") or record.get("chunk_id")),
            candidate_id=str(record.get("candidate_id") or ""),
            content=str(record.get("content") or ""),
            page_number=int(record.get("page_number") or 1),
            file_name=str(record.get("file_name") or ""),
            created_at=record.get("created_at"),
        )


class CandidateChunkCreateRequest(BaseModel):
    """Manual chunk creation payload."""

    candidate_id: str
    content: str = Field(min_length=1)
    page_number: int = Field(default=1, ge=1)
    file_name: str = Field(min_length=1)


class CandidateChunkUpdateRequest(BaseModel):
    """Patchable candidate chunk fields."""

    content: str | None = None
    page_number: int | None = Field(default=None, ge=1)
    file_name: str | None = None


class CandidateChunkSearchRequest(BaseModel):
    """Semantic search request over candidate chunks."""

    query: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=20)
    candidate_ids: list[str] | None = None


class CandidateChunkSearchResult(CandidateChunkResponse):
    """Semantic match result with similarity score."""

    similarity: float
    candidate_name: str = ""

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        return cls(
            chunk_id=str(record.get("id") or record.get("chunk_id")),
            candidate_id=str(record.get("candidate_id") or ""),
            content=str(record.get("content") or ""),
            page_number=int(record.get("page_number") or 1),
            file_name=str(record.get("file_name") or ""),
            created_at=record.get("created_at"),
            similarity=float(record.get("similarity") or 0),
            candidate_name=str(record.get("candidate_name") or ""),
        )


class ChatAskRequest(BaseModel):
    """Request body for SSE-based recruiter Q&A."""

    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatSource(BaseModel):
    """Chat source citation metadata."""

    candidate_name: str
    file_name: str
    page_number: int


class JDExtractionSchema(BaseModel):
    """LLM output schema for job description parsing."""

    required_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    min_experience: float = 0
    education_required: str = ""


class SalarySuggestion(BaseModel):
    """Optional salary guidance for a generated job description."""

    currency: str = "USD"
    min_amount: int | None = None
    max_amount: int | None = None
    period: str = "year"
    rationale: str = ""


class SmartJDRequest(BaseModel):
    """Short recruiter brief used to generate a structured job description."""

    role_brief: str = Field(min_length=3, max_length=4000)
    seniority: str = ""
    industry: str = ""
    work_model: str = ""
    include_salary_suggestion: bool = True


class SmartJDResponse(BaseModel):
    """Structured, matching-optimized job description."""

    title: str = ""
    seniority: str = ""
    industry: str = ""
    work_model: str = ""
    employment_type: str = ""
    role_summary: str = ""
    responsibilities: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    matching_keywords: list[str] = Field(default_factory=list)
    min_experience: float = 0
    education_required: str = ""
    optimized_job_description: str = ""
    salary_suggestion: SalarySuggestion | None = None


class MatchJDRequest(BaseModel):
    """Request body for job description matching."""

    job_description: str = Field(min_length=1, max_length=16000)
    top_n: int = Field(default=3, ge=1, le=20)


class ScoreBreakdown(BaseModel):
    """Detailed weighted score components."""

    skills_score: float
    experience_score: float
    education_score: float
    certifications_score: float


class SkillOverlapBreakdown(BaseModel):
    """Structured overlap details between JD requirements and candidate skills."""

    matched_required_skills: int
    total_required_skills: int
    overlap_percentage: float


class CandidateMatchResponse(BaseModel):
    """Candidate match result returned by the JD matching engine."""

    candidate_id: str
    candidate_name: str
    file_name: str
    linkedin: str = ""
    phone_number: str = ""
    gmail: str = ""
    location: str = ""
    years_of_experience: float = 0
    skills_match: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    skill_overlap: SkillOverlapBreakdown
    education: str = ""
    overall_score: float
    reasoning: str
    current_position: str = ""
    certifications: list[str] = Field(default_factory=list)
    score_breakdown: ScoreBreakdown


class MatchJDResponse(BaseModel):
    """Response body for top candidate matches."""

    parsed_jd: JDExtractionSchema
    top_candidates: list[CandidateMatchResponse] = Field(default_factory=list)


class DashboardRecentCandidateResponse(BaseModel):
    """Compact candidate payload for dashboard recent lists."""

    candidate_id: str
    name: str
    file_name: str
    current_position: str = ""
    location: str = ""
    created_at: datetime | None = None

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        return cls(
            candidate_id=str(record.get("candidate_id") or record.get("id") or ""),
            name=str(record.get("name") or "Unknown"),
            file_name=str(record.get("file_name") or ""),
            current_position=str(record.get("current_position") or ""),
            location=str(record.get("location") or ""),
            created_at=record.get("created_at"),
        )


class DashboardActivityResponse(BaseModel):
    """Recent recruiter activity item for dashboard feeds."""

    activity_type: str
    occurred_at: datetime | None = None
    candidate_id: str | None = None
    candidate_name: str = ""
    file_name: str = ""
    detail: str = ""

    @classmethod
    def from_record(cls, record: Mapping[str, Any]) -> Self:
        candidate_id = record.get("candidate_id")
        return cls(
            activity_type=str(record.get("activity_type") or ""),
            occurred_at=record.get("occurred_at") or record.get("created_at"),
            candidate_id=str(candidate_id) if candidate_id else None,
            candidate_name=str(record.get("candidate_name") or record.get("name") or ""),
            file_name=str(record.get("file_name") or ""),
            detail=str(record.get("detail") or ""),
        )


class DashboardSummaryResponse(BaseModel):
    """Single dashboard response optimized for one round-trip loading."""

    total_candidates: int
    uploads_this_month: int
    match_runs_this_month: int
    chat_queries_this_month: int
    recent_candidates: list[DashboardRecentCandidateResponse] = Field(default_factory=list)
    recent_activity: list[DashboardActivityResponse] = Field(default_factory=list)


class DeleteCandidateResponse(BaseModel):
    """Candidate deletion response."""

    candidate_id: str
    deleted: bool
    deleted_chunks: int


class DeleteFileResponse(BaseModel):
    """File-level deletion response."""

    file_name: str
    deleted_candidates: int
    deleted_chunks: int
