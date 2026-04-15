from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from langchain_openai import ChatOpenAI

from app.api import auth, candidates, chat, chunks, dashboard_routes, documents, matching
from app.auth.service import AuthService
from app.core.config import Settings, get_settings
from app.db.client import SupabaseClientFactory
from app.db.pg_client import DirectPostgresPool
from app.repositories.activity_repository import RecruiterActivityRepository
from app.repositories.candidates import CandidateRepository
from app.repositories.candidate_vector_search_repository import CandidateVectorSearchRepository
from app.repositories.chunks import ChunkRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.recruiters import RecruiterRepository
from app.services.candidate_service import CandidateService
from app.services.chunk_service import ChunkService
from app.services.dashboard_service import DashboardService
from app.services.embedding_service import EmbeddingService
from app.services.ingestion_service import IngestionService
from app.services.matching_service import MatchingService
from app.services.rag_service import RAGService
from app.services.scoring_service import ScoringService
from app.services.streaming_service import StreamingService

if sys.platform.startswith("win") and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _install_windows_connection_reset_filter() -> None:
    """Suppress noisy Windows transport reset callbacks caused by client disconnects."""
    if not sys.platform.startswith("win"):
        return

    loop = asyncio.get_running_loop()
    default_handler = loop.get_exception_handler()

    def handler(current_loop: asyncio.AbstractEventLoop, context: dict[str, object]) -> None:
        exception = context.get("exception")
        handle = context.get("handle")
        if (
            isinstance(exception, ConnectionResetError)
            and getattr(exception, "winerror", None) == 10054
            and handle is not None
            and "_call_connection_lost" in repr(handle)
        ):
            return

        if default_handler is not None:
            default_handler(current_loop, context)
        else:
            current_loop.default_exception_handler(context)

    loop.set_exception_handler(handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and wire application dependencies."""
    settings = get_settings()
    settings.validate_runtime_dependencies()
    _install_windows_connection_reset_filter()

    client_factory = SupabaseClientFactory(settings)
    direct_pg_pool = DirectPostgresPool(settings)
    if direct_pg_pool.enabled:
        await direct_pg_pool.open()

    recruiter_repository = RecruiterRepository(client_factory)
    activity_repository = RecruiterActivityRepository(client_factory)
    candidate_repository = CandidateRepository(client_factory)
    chunk_repository = ChunkRepository(client_factory)
    vector_search_repository = CandidateVectorSearchRepository(direct_pg_pool)
    dashboard_repository = DashboardRepository(direct_pg_pool)

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
        vector_search_repository=vector_search_repository,
        embedding_service=embedding_service,
        search_cache_ttl_seconds=settings.search_cache_ttl_seconds,
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
        activity_repository=activity_repository,
        default_top_k=settings.rag_top_k,
    )
    matching_service = MatchingService(
        candidate_repository=candidate_repository,
        chunk_repository=chunk_repository,
        vector_search_repository=vector_search_repository,
        jd_parser_model=jd_parser_model,
        embedding_service=embedding_service,
        scoring_service=scoring_service,
        activity_repository=activity_repository,
        retrieval_k=settings.match_retrieval_k,
    )
    dashboard_service = DashboardService(
        dashboard_repository=dashboard_repository,
        candidate_repository=candidate_repository,
        cache_ttl_seconds=settings.dashboard_cache_ttl_seconds,
    )

    app.state.auth_service = auth_service
    app.state.candidate_service = candidate_service
    app.state.chunk_service = chunk_service
    app.state.ingestion_service = ingestion_service
    app.state.rag_service = rag_service
    app.state.matching_service = matching_service
    app.state.dashboard_service = dashboard_service
    app.state.streaming_service = StreamingService()

    yield

    await direct_pg_pool.close()


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
    app.include_router(dashboard_routes.router, prefix=_settings.api_prefix)

    @app.get("/health", tags=["Health"])
    def health() -> dict[str, str]:
        return {"status": "ok this is a health check endpoint"}

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
