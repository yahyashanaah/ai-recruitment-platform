from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from langchain_openai import ChatOpenAI

from app.api import auth, candidates, chat, chunks, documents, matching
from app.auth.service import AuthService
from app.core.config import Settings, get_settings
from app.db.client import SupabaseClientFactory
from app.repositories.candidates import CandidateRepository
from app.repositories.chunks import ChunkRepository
from app.repositories.recruiters import RecruiterRepository
from app.services.candidate_service import CandidateService
from app.services.chunk_service import ChunkService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.matching_service import MatchingService
from app.services.rag_service import RAGService
from app.services.scoring_service import ScoringService
from app.services.streaming_service import StreamingService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and wire application dependencies."""
    settings = get_settings()
    settings.validate_runtime_dependencies()

    client_factory = SupabaseClientFactory(settings)
    recruiter_repository = RecruiterRepository(client_factory)
    candidate_repository = CandidateRepository(client_factory)
    chunk_repository = ChunkRepository(client_factory)

    api_key = settings.openai_api_key or None
    embedding_service = EmbeddingService(model_name=settings.embedding_model)

    extraction_model = ChatOpenAI(
        model=settings.openai_chat_model,
        api_key=api_key,
        temperature=0,
    )
    rag_model = ChatOpenAI(
        model=settings.openai_chat_model,
        api_key=api_key,
        temperature=0,
        streaming=True,
    )
    jd_parser_model = ChatOpenAI(
        model=settings.openai_chat_model,
        api_key=api_key,
        temperature=0,
    )

    scoring_service = ScoringService()
    auth_service = AuthService(recruiter_repository=recruiter_repository)
    candidate_service = CandidateService(
        candidate_repository=candidate_repository,
        chunk_repository=chunk_repository,
        embedding_service=embedding_service,
    )
    chunk_service = ChunkService(
        chunk_repository=chunk_repository,
        embedding_service=embedding_service,
    )
    ingestion_service = IngestionService(
        candidate_repository=candidate_repository,
        extraction_model=extraction_model,
        embedding_service=embedding_service,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    rag_service = RAGService(
        chat_model=rag_model,
        chunk_repository=chunk_repository,
        embedding_service=embedding_service,
        default_top_k=settings.rag_top_k,
    )
    matching_service = MatchingService(
        candidate_repository=candidate_repository,
        chunk_repository=chunk_repository,
        jd_parser_model=jd_parser_model,
        embedding_service=embedding_service,
        scoring_service=scoring_service,
        retrieval_k=settings.match_retrieval_k,
    )

    app.state.auth_service = auth_service
    app.state.candidate_service = candidate_service
    app.state.chunk_service = chunk_service
    app.state.ingestion_service = ingestion_service
    app.state.rag_service = rag_service
    app.state.matching_service = matching_service
    app.state.streaming_service = StreamingService()

    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """Application factory used by uvicorn."""
    _settings = settings or get_settings()

    app = FastAPI(
        title=_settings.app_name,
        lifespan=lifespan,
    )
    app.openapi_version = "3.0.3"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix=_settings.api_prefix)
    app.include_router(documents.router, prefix=_settings.api_prefix)
    app.include_router(chat.router, prefix=_settings.api_prefix)
    app.include_router(matching.router, prefix=_settings.api_prefix)
    app.include_router(candidates.router, prefix=_settings.api_prefix)
    app.include_router(chunks.router, prefix=_settings.api_prefix)

    @app.get("/health", tags=["Health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    def custom_openapi() -> dict:
        if app.openapi_schema:
            return app.openapi_schema

        openapi_schema = get_openapi(
            title=app.title,
            version="1.0.0",
            routes=app.routes,
        )
        upload_schema = (
            openapi_schema.get("components", {})
            .get("schemas", {})
            .get("Body_upload_documents_api_v1_documents_upload_post")
        )
        files_property = (upload_schema or {}).get("properties", {}).get("files")
        if isinstance(files_property, dict):
            items = files_property.get("items")
            if isinstance(items, dict) and items.get("type") == "string":
                items["format"] = "binary"
                items.pop("contentMediaType", None)

        app.openapi_schema = openapi_schema
        return app.openapi_schema

    app.openapi = custom_openapi

    return app


app = create_app()
