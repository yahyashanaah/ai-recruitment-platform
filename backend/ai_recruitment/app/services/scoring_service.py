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
    SEMANTIC_INFLUENCE = 0.08

    _TERM_ALIASES = {
        "postgre sql": "postgresql",
        "postgres": "postgresql",
        "react.js": "react",
        "react js": "react",
        "next.js": "nextjs",
        "next js": "nextjs",
        "node.js": "nodejs",
        "node js": "nodejs",
        "ts": "typescript",
        "js": "javascript",
        "c#": "csharp",
        ".net": "dotnet",
        "ms sql": "sql server",
    }
    _EDUCATION_LEVELS: tuple[tuple[int, tuple[str, ...]], ...] = (
        (4, ("phd", "doctorate", "doctor of philosophy", "doctoral")),
        (3, ("master", "msc", "m.sc", "mba", "ma", "ms ")),
        (2, ("bachelor", "bsc", "b.sc", "bs ", "ba ")),
        (1, ("associate", "diploma")),
    )

    def score_candidate(
        self,
        candidate: CandidateProfileResponse,
        jd: JDExtractionSchema,
        semantic_score: float | None = None,
    ) -> CandidateMatchResponse:
        required_skill_map = self._normalize_labels(jd.required_skills)
        preferred_skill_map = self._normalize_labels(jd.nice_to_have_skills)
        candidate_terms = self._expand_terms([*candidate.skills, *candidate.certifications, candidate.current_position])
        certification_terms = self._expand_terms(candidate.certifications)

        matched_required_keys = [
            normalized
            for normalized in required_skill_map
            if self._term_matches(normalized, candidate_terms)
        ]
        matched_required = [required_skill_map[normalized] for normalized in matched_required_keys]
        missing_required = [
            required_skill_map[normalized]
            for normalized in required_skill_map
            if normalized not in matched_required_keys
        ]

        matched_preferred = [
            preferred_skill_map[normalized]
            for normalized in preferred_skill_map
            if normalized not in required_skill_map and self._term_matches(normalized, candidate_terms)
        ]

        required_score = (
            (len(matched_required_keys) / len(required_skill_map)) * 100 if required_skill_map else None
        )
        preferred_score = (
            (len(matched_preferred) / len(preferred_skill_map)) * 100 if preferred_skill_map else None
        )
        skills_score = self._skills_score(
            required_score=required_score,
            preferred_score=preferred_score,
            semantic_score=semantic_score,
        )

        skill_overlap = SkillOverlapBreakdown(
            matched_required_skills=len(matched_required_keys),
            total_required_skills=len(required_skill_map),
            overlap_percentage=round(required_score or 0, 2),
        )

        experience_score = self._experience_score(candidate.years_of_experience, jd.min_experience)
        education_score = self._education_score(candidate.education, jd.education_required)
        certifications_score = self._certifications_score(
            certifications=candidate.certifications,
            certification_terms=certification_terms,
            preferred_skill_map=preferred_skill_map,
        )

        weighted_score = (
            (skills_score * self.SKILLS_WEIGHT)
            + (experience_score * self.EXPERIENCE_WEIGHT)
            + (education_score * self.EDUCATION_WEIGHT)
            + (certifications_score * self.CERTIFICATIONS_WEIGHT)
        )
        overall_score = weighted_score
        if semantic_score is not None:
            overall_score = min(
                100.0,
                (weighted_score * (1 - self.SEMANTIC_INFLUENCE)) + (semantic_score * self.SEMANTIC_INFLUENCE),
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
            skills_match=matched_required + matched_preferred,
            missing_skills=missing_required,
            skill_overlap=skill_overlap,
            education=candidate.education,
            overall_score=round(overall_score, 2),
            reasoning=self._build_reasoning(
                matched_skills=matched_required,
                preferred_skills=matched_preferred,
                missing_skills=missing_required,
                candidate_years=candidate.years_of_experience,
                min_years=jd.min_experience,
                education_score=education_score,
                certifications_score=certifications_score,
                semantic_score=semantic_score,
            ),
            current_position=candidate.current_position,
            certifications=candidate.certifications,
            score_breakdown=breakdown,
        )

    @staticmethod
    def _skills_score(
        *,
        required_score: float | None,
        preferred_score: float | None,
        semantic_score: float | None,
    ) -> float:
        if required_score is not None and preferred_score is not None:
            return (required_score * 0.85) + (preferred_score * 0.15)
        if required_score is not None:
            return required_score
        if preferred_score is not None and semantic_score is not None:
            return (preferred_score * 0.8) + (semantic_score * 0.2)
        if preferred_score is not None:
            return preferred_score
        return semantic_score or 0.0

    @staticmethod
    def _experience_score(years: float, minimum: float) -> float:
        if minimum <= 0:
            if years <= 0:
                return 35.0
            return min(100.0, 55.0 + (min(years, 10.0) * 4.5))

        ratio = max(years, 0) / minimum
        if ratio >= 1:
            return min(100.0, 88.0 + min((ratio - 1.0) * 12.0, 12.0))
        return max(0.0, ratio * 88.0)

    @classmethod
    def _education_score(cls, candidate_education: str, required_education: str) -> float:
        candidate_text = candidate_education.strip().lower()
        required_text = required_education.strip().lower()

        if not required_text:
            return 100.0 if candidate_text else 45.0

        required_level = cls._education_level(required_text)
        candidate_level = cls._education_level(candidate_text)
        if required_level and candidate_level:
            if candidate_level >= required_level:
                return 100.0
            if candidate_level == required_level - 1:
                return 60.0
            return 20.0

        return 100.0 if required_text in candidate_text else 0.0

    @classmethod
    def _certifications_score(
        cls,
        *,
        certifications: list[str],
        certification_terms: set[str],
        preferred_skill_map: dict[str, str],
    ) -> float:
        if not certifications:
            return 0.0

        base_score = min(100.0, 30.0 + (len(certifications) - 1) * 15.0)
        if not preferred_skill_map:
            return base_score

        matched_targets = [
            normalized
            for normalized in preferred_skill_map
            if cls._term_matches(normalized, certification_terms)
        ]
        if not matched_targets:
            return base_score * 0.65

        preferred_alignment = (len(matched_targets) / len(preferred_skill_map)) * 100
        return max(base_score, preferred_alignment)

    @staticmethod
    def _build_reasoning(
        *,
        matched_skills: list[str],
        preferred_skills: list[str],
        missing_skills: list[str],
        candidate_years: float,
        min_years: float,
        education_score: float,
        certifications_score: float,
        semantic_score: float | None,
    ) -> str:
        strengths: list[str] = []
        gaps: list[str] = []

        if matched_skills:
            strengths.append(f"strong {', '.join(matched_skills[:3])} coverage")
        else:
            gaps.append("no required skill overlap")

        if preferred_skills:
            strengths.append(f"also covers preferred skills such as {', '.join(preferred_skills[:2])}")

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

        if semantic_score is not None and semantic_score >= 75:
            strengths.append("semantic profile is closely aligned with the JD")
        elif semantic_score is not None and semantic_score < 45:
            gaps.append("document evidence is only weakly aligned with the JD language")

        sentence: list[str] = []
        if strengths:
            sentence.append("Strengths: " + "; ".join(strengths))
        if gaps:
            sentence.append("Gaps: " + "; ".join(gaps))
        return ". ".join(sentence) if sentence else "Solid overall profile fit."

    @classmethod
    def _normalize_labels(cls, values: list[str]) -> dict[str, str]:
        labels: dict[str, str] = {}
        for value in values:
            original = value.strip()
            normalized = cls._canonical_label(original)
            if original and normalized and normalized not in labels:
                labels[normalized] = original
        return labels

    @classmethod
    def _expand_terms(cls, values: list[str]) -> set[str]:
        terms: set[str] = set()
        for value in values:
            normalized = cls._canonical_label(value)
            if not normalized:
                continue
            terms.add(normalized)
            for token in normalized.split():
                if token:
                    terms.add(cls._TERM_ALIASES.get(token, token))
        return terms

    @staticmethod
    def _term_matches(normalized_target: str, candidate_terms: set[str]) -> bool:
        if normalized_target in candidate_terms:
            return True
        target_tokens = [token for token in normalized_target.split() if token]
        return bool(target_tokens) and all(token in candidate_terms for token in target_tokens)

    @classmethod
    def _canonical_label(cls, value: str) -> str:
        normalized = " ".join(
            value.strip()
            .lower()
            .replace("/", " ")
            .replace(",", " ")
            .replace("(", " ")
            .replace(")", " ")
            .replace("-", " ")
            .split()
        )
        return cls._TERM_ALIASES.get(normalized, normalized)

    @classmethod
    def _education_level(cls, text: str) -> int:
        padded_text = f" {text} "
        for level, keywords in cls._EDUCATION_LEVELS:
            if any(keyword in padded_text for keyword in keywords):
                return level
        return 0
