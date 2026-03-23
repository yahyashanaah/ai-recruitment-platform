# AI Recruitment Intelligence Backend

FastAPI backend for CV ingestion, RAG chat, and JD matching using SQLite + FAISS.

## Stack
- Python 3.11+
- FastAPI
- LangChain
- FAISS (local vector index)
- Sentence-transformers embeddings + OpenAI chat model (configurable)
- SQLite (structured candidate profiles)
- Pydantic v2

## Run
```bash
cd backend/ai_recruitment
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Streamlit UI
Run the full UI:
```bash
cd backend/ai_recruitment
streamlit run streamlit_app.py
```

The UI includes:
- Multi-file CV upload (`.pdf`, `.docx`, `.txt`)
- Chat with SSE token streaming
- JD matching with score breakdown
- Candidate listing and delete

## Environment (.env)
```env
OPENAI_API_KEY=your_key
OPENAI_CHAT_MODEL=gpt-4o
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
SQLITE_URL=sqlite:///./data/candidates.db
FAISS_INDEX_PATH=./data/faiss_index
CHUNK_SIZE=900
CHUNK_OVERLAP=120
RAG_TOP_K=5
MATCH_RETRIEVAL_K=50
```

Notes:
- `DATABASE_URL` is also accepted for backward compatibility.
- `OPENAI_EMBEDDING_MODEL` is accepted as a legacy alias for backward compatibility.

## APIs
Base path: `/api/v1`

1. `POST /documents/upload`
- Multipart field: `files` (multiple)
- Supported: `.pdf`, `.docx`, `.txt`
- Stores chunks in FAISS and structured profiles in SQLite
- Swagger behavior:
  - Click `POST /api/v1/documents/upload`
  - Click `Try it out`
  - You will see a `Choose Files` button (not `Add string item`)
  - Select one or more files and click `Execute`

2. `POST /chat/ask`
- RAG answer streaming via SSE events: `token`, `sources`, `done`

3. `POST /match-jd`
- Returns parsed JD and top 3 candidates with weighted score breakdown

4. `POST /jd/generate`
- Accepts a short hiring brief such as `Backend engineer for fintech startup`
- Returns a structured JD with:
  - required skills
  - preferred skills
  - matching keywords
  - optimized JD copy for better matching
  - optional salary suggestion

5. `GET /candidates`
- Returns all structured candidate profiles

6. `DELETE /candidates/{candidate_id}`
- Deletes from SQLite and FAISS

7. `DELETE /documents/file/{file_name}`
- Deletes all candidates and vectors associated with the uploaded file name

## Quick cURL upload
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/documents/upload" \
  -H "accept: application/json" \
  -F "files=@resume1.pdf" \
  -F "files=@resume2.pdf"
```

## Quick cURL delete by file
```bash
curl -X DELETE "http://127.0.0.1:8000/api/v1/documents/file/resume1.pdf" \
  -H "accept: application/json"
```
