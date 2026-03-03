from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from uuid import uuid4

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings

from app.vectorstore.base import BaseVectorStore

logger = logging.getLogger(__name__)


class FAISSVectorStore(BaseVectorStore):
    """FAISS-backed implementation of BaseVectorStore with local persistence."""

    def __init__(self, embeddings: Embeddings, index_path: str) -> None:
        self._embeddings = embeddings
        self._index_path = Path(index_path).resolve()
        self._index_path.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._embedding_dimension = self._infer_embedding_dimension()
        self._store: FAISS | None = self._load_existing()
        self._handle_dimension_mismatch()

    def _infer_embedding_dimension(self) -> int:
        vector = self._embeddings.embed_query("__dimension_probe__")
        if not vector:
            raise ValueError("Embedding model returned an empty vector for dimension probe.")
        return len(vector)

    def _load_existing(self) -> FAISS | None:
        index_file = self._index_path / "index.faiss"
        meta_file = self._index_path / "index.pkl"
        if not index_file.exists() or not meta_file.exists():
            return None

        return FAISS.load_local(
            folder_path=str(self._index_path),
            embeddings=self._embeddings,
            allow_dangerous_deserialization=True,
        )

    def _handle_dimension_mismatch(self) -> None:
        if self._store is None:
            return

        existing_dim = int(getattr(self._store.index, "d", -1))
        if existing_dim <= 0 or existing_dim == self._embedding_dimension:
            return

        logger.warning(
            "FAISS index dimension mismatch detected (index=%s, embedding_model=%s). "
            "Backing up incompatible index files and starting with an empty vector store.",
            existing_dim,
            self._embedding_dimension,
        )
        self._backup_incompatible_index(existing_dim=existing_dim)
        self._store = None

    def _backup_incompatible_index(self, existing_dim: int) -> None:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        for file_name in ("index.faiss", "index.pkl"):
            source_path = self._index_path / file_name
            if not source_path.exists():
                continue

            backup_name = (
                f"{source_path.name}.bak."
                f"dim{existing_dim}-to-{self._embedding_dimension}.{timestamp}"
            )
            backup_path = self._index_path / backup_name
            source_path.rename(backup_path)

    def _persist(self) -> None:
        if self._store is not None:
            self._store.save_local(str(self._index_path))

    def add_documents(self, documents: list[Document]) -> None:
        if not documents:
            return

        with self._lock:
            ids = [str(uuid4()) for _ in documents]
            if self._store is None:
                self._store = FAISS.from_documents(documents=documents, embedding=self._embeddings, ids=ids)
            else:
                self._store.add_documents(documents=documents, ids=ids)
            self._persist()

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        metadata_filter: dict[str, str] | None = None,
    ) -> list[Document]:
        with self._lock:
            if self._store is None:
                return []
            try:
                return self._store.similarity_search(query=query, k=k, filter=metadata_filter)
            except AssertionError as exc:
                raise RuntimeError(
                    "FAISS index is incompatible with the current EMBEDDING_MODEL. "
                    "Please re-upload CV files to rebuild embeddings."
                ) from exc

    def delete_candidate(self, candidate_id: str) -> int:
        with self._lock:
            if self._store is None:
                return 0

            doc_ids_to_delete: list[str] = []
            for doc_id, document in self._store.docstore._dict.items():
                metadata = document.metadata or {}
                if metadata.get("candidate_id") == candidate_id:
                    doc_ids_to_delete.append(doc_id)

            if not doc_ids_to_delete:
                return 0

            self._store.delete(ids=doc_ids_to_delete)
            self._persist()
            return len(doc_ids_to_delete)

    def get_all_candidates(self) -> list[dict[str, str]]:
        with self._lock:
            if self._store is None:
                return []

            unique_candidates: dict[str, dict[str, str]] = {}
            for document in self._store.docstore._dict.values():
                metadata = document.metadata or {}

                candidate_id = metadata.get("candidate_id")
                if not candidate_id:
                    continue

                if candidate_id not in unique_candidates:
                    unique_candidates[candidate_id] = {
                        "candidate_id": candidate_id,
                        "candidate_name": metadata.get("candidate_name", "Unknown"),
                        "file_name": metadata.get("file_name", ""),
                    }

            return list(unique_candidates.values())
