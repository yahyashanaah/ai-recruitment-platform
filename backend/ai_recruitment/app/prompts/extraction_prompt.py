from __future__ import annotations

EXTRACTION_PROMPT = """
You are an expert recruitment analyst.
Extract a structured candidate profile from the CV text.

Return valid JSON only with these keys exactly:
- name
- phone_number
- gmail
- location
- years_of_experience
- skills
- education
- current_position
- certifications

Rules:
- Use empty string for missing string fields.
- Use 0 for missing years_of_experience.
- Use empty arrays for missing list fields.
- Keep skills and certifications concise and deduplicated.

CV TEXT:
{cv_text}
""".strip()


def build_extraction_prompt(cv_text: str) -> str:
    """Render extraction prompt with a bounded CV payload."""
    return EXTRACTION_PROMPT.format(cv_text=cv_text[:24000])
