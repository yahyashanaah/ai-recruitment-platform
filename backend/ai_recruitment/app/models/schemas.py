from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CandidateExtractionSchema(BaseModel):
    """LLM output schema for CV profile extraction."""

    name: str = "Unknown"
    phone_number: str = ""
    gmail: str = ""
    location: str = ""
    years_of_experience: float = 0
    skills: list[str] = Field(default_factory=list)
    education: str = ""
    current_position: str = ""
    certifications: list[str] = Field(default_factory=list)


class JDExtractionSchema(BaseModel):
    """LLM output schema for job description parsing."""

    required_skills: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)
    min_experience: float = 0
    education_required: str = ""


class SalarySuggestion(BaseModel):
    """Optional market-informed salary range for a generated JD."""

    currency: str = "USD"
    min_amount: int | None = None
    max_amount: int | None = None
    period: str = "year"
    rationale: str = ""


class SmartJDRequest(BaseModel):
    """Request body for generating a recruiter-ready JD from a short brief."""

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


class CandidateProfileResponse(BaseModel):
    """API response model for structured candidate profile."""

    model_config = ConfigDict(from_attributes=True)

    candidate_id: str
    file_name: str

    name: str
    phone_number: str
    gmail: str
    location: str
    years_of_experience: float
    skills: list[str]
    education: str
    current_position: str
    certifications: list[str]
    raw_profile: dict[str, Any] = Field(default_factory=dict)


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


class ChatAskRequest(BaseModel):
    """Request body for RAG chat."""

    question: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=5, ge=1, le=20)


class ChatSource(BaseModel):
    """Document citation metadata for chat answers."""

    candidate_name: str
    file_name: str
    page_number: int


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
    """Top candidate record returned by JD matching API."""

    candidate_name: str
    phone_number: str
    gmail: str
    location: str
    years_of_experience: float
    skills_match: list[str]
    missing_skills: list[str]
    skill_overlap: SkillOverlapBreakdown
    education: str
    overall_score: float
    reasoning: str
    current_position: str
    certifications: list[str]
    score_breakdown: ScoreBreakdown


class MatchJDResponse(BaseModel):
    """Response body for top candidate matches."""

    parsed_jd: JDExtractionSchema
    top_candidates: list[CandidateMatchResponse] = Field(default_factory=list)


class DeleteCandidateResponse(BaseModel):
    """Response body for candidate deletion."""

    candidate_id: str
    deleted_from_sqlite: bool
    deleted_vectors: int


class DeleteFileResponse(BaseModel):
    """Response body for file-based deletion."""

    file_name: str
    deleted_candidates: int
    deleted_vectors: int
