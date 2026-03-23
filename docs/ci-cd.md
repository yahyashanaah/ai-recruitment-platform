# CI/CD

## What is implemented

The repository now has two GitHub Actions workflows:

- `CI` in `.github/workflows/ci.yml`
- `CD` in `.github/workflows/cd.yml`

## CI workflow

The `CI` workflow runs on every push and every pull request.

It has two jobs:

1. `Backend Validation`
- Uses Python `3.11`
- Installs `backend/ai_recruitment/requirements.txt`
- Runs `.github/scripts/validate_backend.py`

What the backend validator checks:
- the FastAPI app imports correctly
- OpenAPI schema generation works
- required API routes exist
- `/api/v1/documents/upload` is still documented as binary multipart upload
- `/api/v1/chat/ask` still exposes `text/event-stream`

This is intentional. The backend currently has no formal pytest suite, and a full startup check would require live model downloads and runtime secrets. The validator gives you a deterministic contract check without pretending the pipeline is doing more than it really is.

2. `Frontend Lint And Build`
- Uses Node.js `22`
- Runs `npm ci`
- Runs `npm run lint`
- Runs `npm run build`

This catches React/Next.js type, lint, and production build issues before merge.

## CD workflow

The `CD` workflow runs in two ways:

- automatically after `CI` completes successfully on `main`
- manually through `workflow_dispatch`

This workflow packages delivery artifacts. It does not deploy to a cloud provider because no deployment target or credentials were provided. That is the correct boundary for now.

It creates:

1. `ai-recruitment-backend`
- a `.tar.gz` bundle of `backend/ai_recruitment`
- excludes local-only files such as `.env`, `.venv`, `data`, and Python cache files

2. `ai-recruitment-frontend`
- a standalone Next.js production bundle
- includes the server output from `.next/standalone`
- includes static assets from `.next/static`
- includes `public/` if present

## Why `output: "standalone"` was added

`frontend/next.config.ts` now uses:

```ts
output: "standalone"
```

That makes Next.js produce a self-contained production server bundle that is easier to deploy from GitHub Actions artifacts.

## How the workflow sequence works

1. Push code or open a pull request.
2. `CI` runs backend validation and frontend lint/build.
3. If the branch is `main` and `CI` succeeds, `CD` starts automatically.
4. `CD` rebuilds from the validated commit and uploads deployable artifacts.

## What you still need for real deployment

If you want actual automatic deployment next, choose a target:

- Vercel for the Next.js frontend
- Render, Railway, Azure, AWS, or a VPS for the FastAPI backend

At that point, the `CD` workflow can be extended with:

- GitHub repository secrets
- provider-specific login steps
- deploy commands per environment
