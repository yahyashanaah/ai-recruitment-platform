from __future__ import annotations

from typing import Any

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

from app.utils.document_loader import LoadedPage


def chunk_pages(
    pages: list[LoadedPage],
    chunk_size: int,
    chunk_overlap: int,
    base_metadata: dict[str, Any],
) -> list[Document]:
    """Split extracted pages into metadata-rich chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    chunks: list[Document] = []
    for page in pages:
        page_text = page.text.strip()
        if not page_text:
            continue

        metadata = {**base_metadata, "page_number": page.page_number}
        page_chunks = splitter.create_documents(texts=[page_text], metadatas=[metadata])
        chunks.extend(page_chunks)

    return chunks
