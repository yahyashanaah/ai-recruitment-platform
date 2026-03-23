from __future__ import annotations

JD_PROMPT = """
You are an expert technical recruiter.
Extract structured requirements from the job description.

Return valid JSON only with these keys exactly:
- required_skills
- nice_to_have_skills
- min_experience
- education_required

Rules:
- Use 0 for unknown min_experience.
- Skills must be short labels.
- Keep required_skills focused on must-have qualifications.

JOB DESCRIPTION:
{job_description}
""".strip()


SMART_JD_PROMPT = """
You are a principal recruitment strategist designing high-conviction job descriptions for strong candidate matching.

Transform the hiring brief into a recruiter-ready, structured JD that is optimized for semantic search and CV matching.

Return valid JSON only with these keys exactly:
- title
- seniority
- employment_type
- role_summary
- responsibilities
- required_skills
- preferred_skills
- matching_keywords
- min_experience
- education_required
- optimized_job_description
- salary_suggestion

Rules:
- required_skills must contain only true must-haves.
- preferred_skills must contain valuable but non-blocking skills.
- matching_keywords must contain 8 to 15 search-friendly terms or phrases recruiters should expect in CVs.
- responsibilities must be concise bullet-ready sentences.
- optimized_job_description must be polished recruiter copy with:
  1) a short role overview,
  2) core responsibilities,
  3) clearly separated must-have and preferred qualifications.
- Use plain professional language. Avoid hype and filler.
- Use 0 for unknown min_experience.
- If include_salary_suggestion is false, return salary_suggestion as null.
- If include_salary_suggestion is true, salary_suggestion must be an object with:
  - currency
  - min_amount
  - max_amount
  - period
  - rationale
- Salary suggestions should be realistic for the brief. If location is unknown, make a reasonable startup-market assumption and say so in rationale.
- Prefer short normalized skill labels such as "FastAPI", "PostgreSQL", "Docker", "AWS".

HIRING BRIEF:
{role_brief}

INCLUDE SALARY SUGGESTION:
{include_salary_suggestion}
""".strip()


def build_jd_prompt(job_description: str) -> str:
    """Render JD parsing prompt with a bounded payload."""
    return JD_PROMPT.format(job_description=job_description[:24000])


def build_smart_jd_prompt(role_brief: str, include_salary_suggestion: bool) -> str:
    """Render smart JD generation prompt with bounded payload."""
    return SMART_JD_PROMPT.format(
        role_brief=role_brief[:4000],
        include_salary_suggestion="true" if include_salary_suggestion else "false",
    )
