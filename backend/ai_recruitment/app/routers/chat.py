from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatAskRequest
from app.services.rag_service import RAGService
from app.services.streaming_service import StreamingService

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/ask")
async def ask_question(
    payload: ChatAskRequest,
    request: Request,
) -> StreamingResponse:
    """Answer recruiter questions using RAG and stream tokens via SSE."""
    rag_service: RAGService = request.app.state.rag_service
    streaming_service: StreamingService = request.app.state.streaming_service

    async def event_stream() -> AsyncIterator[str]:
        try:
            async for event in rag_service.stream_answer(
                question=payload.question,
                top_k=payload.top_k,
            ):
                yield streaming_service.to_sse(event=event["event"], data=event["data"])
        except Exception as exc:  # noqa: BLE001
            yield streaming_service.to_sse(
                event="error",
                data={"message": str(exc)},
            )
            yield streaming_service.to_sse(event="done", data={"status": "failed"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
