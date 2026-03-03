from __future__ import annotations

RAG_PROMPT = """
You are an AI Recruitment Intelligence Assistant.
Answer the user's question strictly from the provided context.

If the answer is missing from context, return exactly:
Not found in uploaded documents.

Provide concise, professional, factual answers.

CONTEXT:
{context}

QUESTION:
{question}
""".strip()


def build_rag_prompt(context: str, question: str) -> str:
    """Render RAG prompt with context and user question."""
    return RAG_PROMPT.format(context=context[:32000], question=question)
