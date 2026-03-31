# TalentCore AI Backend

FastAPI backend for recruiter-scoped CV ingestion, RAG chat, Smart JD generation, and JD matching using Supabase Postgres + pgvector.

## Stack
- Python 3.11+
- FastAPI
- Supabase Auth
- Supabase Postgres
- pgvector
- sentence-transformers/all-MiniLM-L6-v2
- OpenAI chat model
- Pydantic v2

## Setup
```bash
cd backend/ai_recruitment
pip install -r requirements.txt
```

Apply the Supabase schema:
```sql
-- run backend/ai_recruitment/schema.sql in the Supabase SQL editor
```

Configure environment variables:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=gpt-4o
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHUNK_SIZE=900
CHUNK_OVERLAP=120
RAG_TOP_K=5
MATCH_RETRIEVAL_K=50
CORS_ALLOW_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
```

Run:
```bash
uvicorn app.main:app --reload
```

## API Base
`/api/v1`

## Endpoints
- `GET /auth/me`
- `POST /documents/upload`
- `DELETE /documents/file/{file_name}`
- `POST /chat/ask`
- `POST /match-jd`
- `POST /jd/generate`
- `GET /candidates`
- `GET /candidates/{candidate_id}`
- `PATCH /candidates/{candidate_id}`
- `DELETE /candidates/{candidate_id}`
- `GET /chunks`
- `GET /chunks/{chunk_id}`
- `POST /chunks`
- `PATCH /chunks/{chunk_id}`
- `DELETE /chunks/{chunk_id}`
- `POST /chunks/search`
- `GET /health`

## Auth
Send the Supabase access token in the `Authorization` header:
```http
Authorization: Bearer <supabase_access_token>
```
