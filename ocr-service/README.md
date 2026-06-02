# OCR service (Pix2Text)

Self-hosted handwriting → LaTeX OCR for MathPad. Free, no per-call cost.

## Run

```powershell
cd ocr-service
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

First run downloads ~500MB of models (CnSTD + CnOCR + math formula detector). Subsequent starts are fast.

Endpoints:
- `GET  /health` → `{ok, loaded}`
- `POST /ocr` (multipart `file=<png>`) → `{ok, lines: string[], blocks: number}`

## Production note

For deployed MathPad, run this on a small CPU box (no GPU needed for the base model — ~2s/page on a modest CPU). Or replace with Gemini Flash vision via `/api/ocr` fallback if you don't want to manage Python infra.
