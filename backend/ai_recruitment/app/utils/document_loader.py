from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import List

from docx import Document as DocxDocument
from fastapi import UploadFile
from pypdf import PdfReader


@dataclass(slots=True)
class LoadedPage:
    """Single extracted page/block from an uploaded resume file."""
    page_number: int
    text: str


async def load_document(upload_file: UploadFile) -> List[LoadedPage]:
    """Extract text pages from PDF, DOCX, or TXT uploads."""
    file_name = upload_file.filename or ""
    extension = file_name.lower().split(".")[-1] if "." in file_name else ""

    payload = await upload_file.read()

    if not payload:
        raise ValueError(f"File '{file_name}' is empty.")

    if extension == "pdf":
        return _load_pdf(payload)

    if extension == "docx":
        return _load_docx(payload)

    if extension in {"txt", "text"}:
        return _load_txt(payload)

    if extension == "doc":
        raise ValueError(
            f"Unsupported legacy Word format for '{file_name}'. "
            "Please convert .doc to .docx and upload again."
        )

    raise ValueError(
        f"Unsupported file type for '{file_name}'. "
        "Supported types are: .pdf, .txt, .docx."
    )


def _load_pdf(payload: bytes) -> List[LoadedPage]:
    reader = PdfReader(BytesIO(payload))
    pages: List[LoadedPage] = []

    for idx, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        if text:
            pages.append(LoadedPage(page_number=idx, text=text))

    if not pages:
        pages.append(LoadedPage(page_number=1, text=""))

    return pages


def _load_docx(payload: bytes) -> List[LoadedPage]:
    document = DocxDocument(BytesIO(payload))
    paragraphs = [
        p.text.strip()
        for p in document.paragraphs
        if p.text.strip()
    ]
    text = "\n".join(paragraphs)

    return [LoadedPage(page_number=1, text=text)]


def _load_txt(payload: bytes) -> List[LoadedPage]:
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = payload.decode(encoding).strip()
            return [LoadedPage(page_number=1, text=text)]
        except UnicodeDecodeError:
            continue

    raise ValueError("Unable to decode TXT file content.")