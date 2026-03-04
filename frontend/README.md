# AI Recruitment Frontend (Next.js 16)

Premium SaaS dashboard frontend for the AI Recruitment Intelligence backend.

## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Framer Motion

## Configure
Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Default:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## Run
```bash
npm install
npm run dev
```

## Pages
- `/` Overview introduction for recruiters
- `/upload` CV upload, progress animation, view/download icons
- `/chat` ChatGPT-style streaming chat (SSE)
- `/match` JD matching with animated score cards
- `/candidates` Candidate list with slide-over details panel
