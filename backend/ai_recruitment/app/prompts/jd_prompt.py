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


def build_jd_prompt(job_description: str) -> str:
    """Render JD parsing prompt with a bounded payload."""
    return JD_PROMPT.format(job_description=job_description[:24000])
