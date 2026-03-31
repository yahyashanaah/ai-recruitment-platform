from __future__ import annotations

from app.models.schemas import (
    CandidateMatchResponse,
    CandidateProfileResponse,
    JDExtractionSchema,
    ScoreBreakdown,
    SkillOverlapBreakdown,
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
        skills_score = 100.0 if not required_skills else (len(matched_skills) / len(required_skills)) * 100

        skill_overlap = SkillOverlapBreakdown(
            matched_required_skills=len(matched_skills),
            total_required_skills=len(required_skills),
            overlap_percentage=round(skills_score, 2),
        )

        experience_score = self._experience_score(candidate.years_of_experience, jd.min_experience)
        education_score = self._education_score(candidate.education, jd.education_required)
        certifications_score = self._certifications_score(candidate.certifications, jd.nice_to_have_skills)

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

        return CandidateMatchResponse(
            candidate_id=candidate.candidate_id,
            candidate_name=candidate.name,
            file_name=candidate.file_name,
            linkedin=candidate.linkedin,
            phone_number=candidate.phone_number,
            gmail=candidate.gmail,
            location=candidate.location,
            years_of_experience=candidate.years_of_experience,
            skills_match=matched_skills,
            missing_skills=missing_skills,
            skill_overlap=skill_overlap,
            education=candidate.education,
            overall_score=round(overall_score, 2),
            reasoning=self._build_reasoning(
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                candidate_years=candidate.years_of_experience,
                min_years=jd.min_experience,
                education_score=education_score,
                certifications_score=certifications_score,
            ),
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
        return 100 if required_education.strip().lower() in candidate_education.lower() else 0

    @staticmethod
    def _certifications_score(certifications: list[str], nice_to_have: list[str]) -> float:
        if not nice_to_have:
            return 100 if certifications else 0

        certification_text = " ".join(certifications).lower()
        targets = [item.strip().lower() for item in nice_to_have if item.strip()]
        if not targets:
            return 100

        hits = sum(1 for target in targets if target in certification_text)
        return min((hits / len(targets)) * 100, 100) if hits else 0

    @staticmethod
    def _build_reasoning(
        *,
        matched_skills: list[str],
        missing_skills: list[str],
        candidate_years: float,
        min_years: float,
        education_score: float,
        certifications_score: float,
    ) -> str:
        strengths: list[str] = []
        gaps: list[str] = []

        if matched_skills:
            strengths.append(f"strong {', '.join(matched_skills[:3])} coverage")
        else:
            gaps.append("no required skill overlap")

        if min_years > 0:
            if candidate_years >= min_years:
                strengths.append(f"meets the {min_years:g}+ year experience target")
            else:
                gaps.append(f"below the {min_years:g}+ year experience target")
        elif candidate_years > 0:
            strengths.append(f"brings {candidate_years:g} years of experience")

        if education_score >= 100:
            strengths.append("education aligns with the role")
        elif education_score == 0:
            gaps.append("education match is unclear")

        if certifications_score >= 100:
            strengths.append("certifications support the role")
        elif certifications_score == 0 and missing_skills:
            gaps.append(f"lacks {', '.join(missing_skills[:3])}")

        sentence: list[str] = []
        if strengths:
            sentence.append("Strengths: " + "; ".join(strengths))
        if gaps:
            sentence.append("Gaps: " + "; ".join(gaps))
        return ". ".join(sentence) if sentence else "Solid overall profile fit."
