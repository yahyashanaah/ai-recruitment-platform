from __future__ import annotations

import json
import mimetypes
from typing import Any

import requests
import streamlit as st


st.set_page_config(
    page_title="AI Recruitment Intelligence UI",
    layout="wide",
    page_icon=":briefcase:",
)


def _default_base_url() -> str:
    return "http://127.0.0.1:8000/api/v1"


def _api_url(path: str) -> str:
    base_url = st.session_state.api_base_url.strip().rstrip("/")
    return f"{base_url}{path}"


def _api_root() -> str:
    base_url = st.session_state.api_base_url.strip().rstrip("/")
    if base_url.endswith("/api/v1"):
        return base_url[: -len("/api/v1")]
    return base_url


def _to_json_response(response: requests.Response) -> dict[str, Any]:
    try:
        return response.json()
    except Exception:
        return {"raw_text": response.text}


def _render_error(prefix: str, response: requests.Response) -> None:
    payload = _to_json_response(response)
    st.error(f"{prefix} (HTTP {response.status_code})")
    st.json(payload)

def _upload_files(files: list[st.runtime.uploaded_file_manager.UploadedFile]) -> None:
    if not files:
        st.warning("Select one or more files first.")
        return

    multipart_files: list[tuple[str, tuple[str, bytes, str]]] = []
    for file in files:
        content_type = file.type or mimetypes.guess_type(file.name)[0] or "application/octet-stream"
        multipart_files.append(("files", (file.name, file.getvalue(), content_type)))

    with st.spinner("Uploading and indexing files..."):
        response = requests.post(
            _api_url("/documents/upload"),
            files=multipart_files,
            timeout=300,
        )

    if response.status_code != 200:
        _render_error("Upload failed", response)
        return

    payload = _to_json_response(response)
    st.success(payload.get("message", "Upload completed"))
    col1, col2, col3 = st.columns(3)
    col1.metric("Files Processed", payload.get("files_processed", 0))
    col2.metric("Total Chunks", payload.get("total_chunks", 0))
    col3.metric("Failed Files", payload.get("failed_count", 0))

    candidates = payload.get("candidates", [])
    if candidates:
        st.subheader("Processed Candidates")
        st.dataframe(candidates, use_container_width=True)

    errors = payload.get("errors", [])
    if errors:
        st.subheader("Errors")
        for item in errors:
            st.error(item)


def _chat_sse(question: str, top_k: int) -> None:
    if not question.strip():
        st.warning("Enter a question first.")
        return

    try:
        response = requests.post(
            _api_url("/chat/ask"),
            json={"question": question, "top_k": top_k},
            headers={"Accept": "text/event-stream"},
            stream=True,
            timeout=300,
        )
    except requests.RequestException as exc:
        st.error(f"Chat request failed: {exc}")
        return

    if response.status_code != 200:
        _render_error("Chat request failed", response)
        return

    answer_placeholder = st.empty()
    answer_text = ""
    sources: list[dict[str, Any]] = []
    current_event = ""
    failed = False

    for raw_line in response.iter_lines(decode_unicode=True):
        if raw_line is None:
            continue
        line = raw_line.strip()
        if not line:
            continue

        if line.startswith("event:"):
            current_event = line.removeprefix("event:").strip()
            continue

        if not line.startswith("data:"):
            continue

        data_str = line.removeprefix("data:").strip()
        try:
            data = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        if current_event == "token":
            token = str(data.get("text", ""))
            answer_text += token
            answer_placeholder.markdown(answer_text)
        elif current_event == "sources":
            sources = data.get("sources", [])
        elif current_event == "error":
            failed = True
            st.error(data.get("message", "Unknown chat error"))
        elif current_event == "done":
            break

    if not answer_text and not failed:
        answer_placeholder.info("Not found in uploaded documents.")

    if not failed:
        st.subheader("Sources")
        if sources:
            st.dataframe(sources, use_container_width=True)
        else:
            st.info("No sources returned.")


def _match_jd(job_description: str) -> None:
    if not job_description.strip():
        st.warning("Enter a job description first.")
        return

    with st.spinner("Matching candidates..."):
        response = requests.post(
            _api_url("/match-jd"),
            json={"job_description": job_description},
            timeout=300,
        )

    if response.status_code != 200:
        _render_error("JD matching failed", response)
        return

    payload = _to_json_response(response)
    st.subheader("Parsed Job Description")
    st.json(payload.get("parsed_jd", {}))

    top_candidates = payload.get("top_candidates", [])
    st.subheader("Top Candidates")
    if not top_candidates:
        st.info("No matches found.")
        return

    st.dataframe(top_candidates, use_container_width=True)


def _fetch_candidates() -> list[dict[str, Any]]:
    response = requests.get(_api_url("/candidates"), timeout=60)
    if response.status_code != 200:
        _render_error("Failed to fetch candidates", response)
        return []
    payload = _to_json_response(response)
    return payload if isinstance(payload, list) else []


def _delete_candidate(candidate_id: str) -> None:
    response = requests.delete(_api_url(f"/candidates/{candidate_id}"), timeout=60)
    if response.status_code != 200:
        _render_error("Failed to delete candidate", response)
        return
    payload = _to_json_response(response)
    st.success(f"Deleted candidate {payload.get('candidate_id', candidate_id)}")
    st.json(payload)


if "api_base_url" not in st.session_state:
    st.session_state.api_base_url = _default_base_url()


st.title("AI Recruitment Intelligence")
st.caption("Streamlit UI for CV ingestion, RAG chat, JD matching, and candidate management.")

with st.sidebar:
    st.header("Configuration")
    st.session_state.api_base_url = st.text_input(
        "Backend API Base URL",
        value=st.session_state.api_base_url,
        help="Example: http://127.0.0.1:8000/api/v1",
    )

    if st.button("Health Check", use_container_width=True):
        try:
            health_response = requests.get(f"{_api_root()}/health", timeout=60)
            if health_response.status_code == 200:
                st.success("Backend is healthy.")
                st.json(_to_json_response(health_response))
            else:
                _render_error("Health check failed", health_response)
        except requests.RequestException as exc:
            st.error(f"Could not connect: {exc}")


tab_upload, tab_chat, tab_match, tab_candidates = st.tabs(
    [
        "Upload Documents",
        "Chat (SSE)",
        "Match JD",
        "Candidates",
    ]
)

with tab_upload:
    st.subheader("Upload CV Documents")
    uploaded_files = st.file_uploader(
        "Choose PDF, DOCX, or TXT files",
        type=["pdf", "docx", "txt"],
        accept_multiple_files=True,
    )
    if st.button("Upload and Index", type="primary"):
        _upload_files(uploaded_files)

with tab_chat:
    st.subheader("Ask Questions on Uploaded CVs")
    question = st.text_area("Question", height=110, placeholder="Example: Who has FastAPI experience?")
    top_k = st.slider("Top-K context chunks", min_value=1, max_value=20, value=5)
    if st.button("Ask", type="primary"):
        _chat_sse(question=question, top_k=top_k)

with tab_match:
    st.subheader("Match Job Description")
    jd = st.text_area("Job Description", height=220)
    if st.button("Match Top Candidates", type="primary"):
        _match_jd(job_description=jd)

with tab_candidates:
    st.subheader("Candidate Profiles")
    if st.button("Refresh Candidates", type="primary"):
        st.session_state.candidates_cache = _fetch_candidates()

    candidates_data = st.session_state.get("candidates_cache", [])
    if candidates_data:
        st.dataframe(candidates_data, use_container_width=True)
    else:
        st.info("No candidates loaded yet. Click 'Refresh Candidates'.")

    if candidates_data:
        st.markdown("### Delete Candidate")
        options = {
            f"{c.get('name', 'Unknown')} ({c.get('candidate_id', '')})": c.get("candidate_id", "")
            for c in candidates_data
        }
        selected_label = st.selectbox("Select Candidate", options=list(options.keys()))
        if st.button("Delete Selected Candidate"):
            _delete_candidate(options[selected_label])
            st.session_state.candidates_cache = _fetch_candidates()
