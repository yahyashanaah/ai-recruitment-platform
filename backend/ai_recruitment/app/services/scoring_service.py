from __future__ import annotations

from app.models.schemas import (
    CandidateMatchResponse,
    CandidateProfileResponse,
    JDExtractionSchema,
    ScoreBreakdown,
)


class ScoringService:
    """Weighted candidate scoring engine."""

    SKILLS_WEIGHT = 0.50
    EXPERIENCE_WEIGHT = 0.30
    EDUCATION_WEIGHT = 0.10
    CERTIFICATIONS_WEIGHT = 0.10

    def score_candidate(
        self,
        candidate: CandidateProfileResponse,
        jd: JDExtractionSchema,
    ) -> CandidateMatchResponse:
        required_skills = self._normalize_set(jd.required_skills)
        candidate_skills = self._normalize_set(candidate.skills)

        matched_skills = sorted(required_skills.intersection(candidate_skills))
        missing_skills = sorted(required_skills.difference(candidate_skills))

        if required_skills:
            skills_score = (len(matched_skills) / len(required_skills)) * 100
        else:
            skills_score = 100

        experience_score = self._experience_score(
            years=candidate.years_of_experience,
            minimum=jd.min_experience,
        )

        education_score = self._education_score(
            candidate_education=candidate.education,
            required_education=jd.education_required,
        )

        certifications_score = self._certifications_score(
            certifications=candidate.certifications,
            nice_to_have=jd.nice_to_have_skills,
        )

        overall_score = (
            (skills_score * self.SKILLS_WEIGHT)
            + (experience_score * self.EXPERIENCE_WEIGHT)
            + (education_score * self.EDUCATION_WEIGHT)
            + (certifications_score * self.CERTIFICATIONS_WEIGHT)
        )

        breakdown = ScoreBreakdown(
            skills_score=round(skills_score, 2),
            experience_score=round(experience_score, 2),
            education_score=round(education_score, 2),
            certifications_score=round(certifications_score, 2),
        )

        reasoning = self._build_reasoning(
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            candidate_years=candidate.years_of_experience,
            min_years=jd.min_experience,
            education_score=education_score,
            certifications_score=certifications_score,
        )

        return CandidateMatchResponse(
            candidate_name=candidate.name,
            phone_number=candidate.phone_number,
            gmail=candidate.gmail,
            location=candidate.location,
            years_of_experience=candidate.years_of_experience,
            skills_match=matched_skills,
            missing_skills=missing_skills,
            education=candidate.education,
            overall_score=round(overall_score, 2),
            reasoning=reasoning,
            current_position=candidate.current_position,
            certifications=candidate.certifications,
            score_breakdown=breakdown,
        )

    @staticmethod
    def _normalize_set(values: list[str]) -> set[str]:
        return {value.strip().lower() for value in values if value and value.strip()}

    @staticmethod
    def _experience_score(years: float, minimum: float) -> float:
        if minimum <= 0:
            return 100
        return min((max(years, 0) / minimum) * 100, 100)

    @staticmethod
    def _education_score(candidate_education: str, required_education: str) -> float:
        if not required_education.strip():
            return 100

        candidate_text = candidate_education.lower()
        required_text = required_education.lower()
        return 100 if required_text in candidate_text else 0

    @staticmethod
    def _certifications_score(certifications: list[str], nice_to_have: list[str]) -> float:
        if not certifications:
            return 0

        if not nice_to_have:
            return 100

        cert_text = " ".join(certifications).lower()
        targets = [item.strip().lower() for item in nice_to_have if item.strip()]
        if not targets:
            return 100

        hits = sum(1 for target in targets if target in cert_text)
        if hits == 0:
            return 40

        return min((hits / len(targets)) * 100, 100)

    @staticmethod
    def _build_reasoning(
        matched_skills: list[str],
        missing_skills: list[str],
        candidate_years: float,
        min_years: float,
        education_score: float,
        certifications_score: float,
    ) -> str:
        skill_summary = (
            f"Matched {len(matched_skills)} required skill(s)"
            if matched_skills
            else "No required skills matched"
        )

        missing_summary = (
            f"Missing: {', '.join(missing_skills[:5])}."
            if missing_skills
            else "No major skill gaps identified."
        )

        experience_summary = (
            f"Experience: {candidate_years} years vs required {min_years} years."
            if min_years > 0
            else f"Experience: {candidate_years} years."
        )

        education_summary = (
            "Education aligns with requirement."
            if education_score >= 100
            else "Education requirement may not fully align."
        )

        cert_summary = (
            "Strong certification relevance."
            if certifications_score >= 80
            else "Limited certification alignment."
        )

        return f"{skill_summary}. {missing_summary} {experience_summary} {education_summary} {cert_summary}"
