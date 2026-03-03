from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:  # pragma: no cover - compatibility fallback
    from langchain_community.embeddings import HuggingFaceEmbeddings

from app.core.config import Settings, get_settings
from app.models.candidate import CandidateRepository, init_db
from app.routers import candidates, chat, match, upload
from app.services.ingestion_service import IngestionService
from app.services.matching_service import MatchingService
from app.services.rag_service import RAGService
from app.services.scoring_service import ScoringService
from app.services.streaming_service import StreamingService
from app.vectorstore.faiss_store import FAISSVectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and wire application dependencies."""
    settings = get_settings()
    settings.ensure_directories()

    session_factory = init_db(settings.sqlite_url)
    candidate_repository = CandidateRepository(session_factory)

    api_key = settings.openai_api_key or None
    embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)

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

    vector_store = FAISSVectorStore(
        embeddings=embeddings,
        index_path=settings.faiss_index_path,
    )

    scoring_service = ScoringService()
    ingestion_service = IngestionService(
        vector_store=vector_store,
        candidate_repository=candidate_repository,
        extraction_model=extraction_model,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    rag_service = RAGService(
        chat_model=rag_model,
        vector_store=vector_store,
        default_top_k=settings.rag_top_k,
    )
    matching_service = MatchingService(
        vector_store=vector_store,
        candidate_repository=candidate_repository,
        jd_parser_model=jd_parser_model,
        scoring_service=scoring_service,
        retrieval_k=settings.match_retrieval_k,
    )

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

    app.include_router(upload.router, prefix=_settings.api_prefix)
    app.include_router(chat.router, prefix=_settings.api_prefix)
    app.include_router(match.router, prefix=_settings.api_prefix)
    app.include_router(candidates.router, prefix=_settings.api_prefix)

    @app.get("/health", tags=["Health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
