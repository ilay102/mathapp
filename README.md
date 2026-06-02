# MathPad

Tablet-first web notebook for university math. Handwrite a problem and your work, tap **Check my work**, and an AI tutor finds the *first* line where you went wrong and reveals progressive hints (nudge → step → correction).

## Stack

- **Next.js 15** + React 19 + TypeScript + Tailwind
- **perfect-freehand** stylus canvas (Pointer Events, pressure, palm rejection, coalesced events)
- **DeepSeek V4 Flash** for grading + hints — ~$0.001 per check with caching
- **Pix2Text** Python sidecar for free, self-hosted handwriting OCR
- **Supabase** auth (magic link) + Postgres + Row-Level Security

## Run locally

```powershell
# 1. App
cd mathapp
npm install
Copy-Item .env.example .env.local
# edit .env.local: paste DEEPSEEK_API_KEY (required)
#                  paste NEXT_PUBLIC_SUPABASE_* (optional — needed for notebooks)
npm run dev          # http://localhost:3010

# 2. OCR sidecar (optional but recommended)
cd ocr-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py        # http://127.0.0.1:7800

# 3. Supabase (optional — enables notebooks + auth + quota)
# Create project at supabase.com → SQL editor → paste supabase/schema.sql → run
# Copy URL + anon key into .env.local, restart dev server
```

## Routes

| Route | What it does |
|---|---|
| `/` | Single-page demo (no auth) — handwrite + check |
| `/login` | Magic-link sign in |
| `/notebooks` | List your notebooks |
| `/notebooks/[id]` | List pages in a notebook |
| `/notebooks/[id]/[pageId]` | Editor with autosave + check |
| `POST /api/check-work` | Grade work, persist + enforce daily cap |
| `POST /api/ocr` | Proxy to Pix2Text sidecar |
| `POST /api/notebooks` | Create new notebook |

## Eval harness

```powershell
npm run eval         # POSTs labeled problems to /api/check-work and scores
```

Edit `eval/problems.json` to add cases. Results land in `eval/last-run.json`.
Goal: ≥90% pass before scaling effort.

## Cost model

- Free: 3 checks/day, no progressive hints (only correct/wrong)
- Pro $9.99/mo or $59/yr: 25 checks/day fair-use cap, full hints, export PDF
- Verified student: 40% off

At 25 checks/day worst-case Pro user: server cost ≈ $0.60/mo. Healthy margin.

## What's deliberately not done yet

- **SymPy verifier** — would push cost lower and hallucinations down. Next big win.
- **Stripe + subscription tiers** — quota cap is hardcoded to free; tier lookup is TODO.
- **PWA install + offline** — manifest/SW pending. Works as install-to-home-screen via Safari "Add to Home Screen" already.
- **Stroke replay + history** — saved strokes load on edit, but no scrub/undo timeline yet.
