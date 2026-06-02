"""
Math handwriting OCR microservice.

Uses Pix2Text's LatexOCR class directly (MFR model only) to avoid the broken
TableOCR/layout-parser path on Windows.

Run:
  cd ocr-service
  .venv\\Scripts\\Activate.ps1
  python app.py
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pix2text.latex_ocr import LatexOCR
from PIL import Image
import io
import os
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ocr")

OCR_TOKEN = os.environ.get("OCR_TOKEN", "")

app = FastAPI(title="MathPad OCR")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_model = None

def get_model():
    global _model
    if _model is None:
        log.info("loading LatexOCR (MFR) model — first call only...")
        _model = LatexOCR()
        log.info("LatexOCR ready")
    return _model


def require_token(authorization):
    if not OCR_TOKEN:
        return
    if not authorization or authorization != f"Bearer {OCR_TOKEN}":
        raise HTTPException(401, "unauthorized")


@app.get("/health")
def health():
    return {"ok": True, "loaded": _model is not None}


# ----- SymPy equivalence checker -----------------------------------------------------
# Cheap algebraic sanity layer: given two expressions (LaTeX-ish or JS-ish), test if
# they're symbolically equal via simplify(a - b) == 0. Used by the Next.js grader as a
# post-validation step to catch alternate-form false-negatives (cos(2x) vs 1-2sin²(x)).
from fastapi import Body
try:
    import sympy as sp
except Exception:
    sp = None  # type: ignore

def _parse(expr: str):
    """Light LaTeX → SymPy translation, then sympify with implicit mult + ^ as power."""
    s = (expr or "").strip()
    if not s:
        raise ValueError("empty expression")
    s = s.strip("$ \t\n")
    # LaTeX → ASCII math
    s = s.replace("\\cdot", "*").replace("\\times", "*").replace("\\div", "/")
    s = s.replace("\\,", "").replace("\\;", "").replace("\\!", "").replace("\\ ", " ")
    # \frac{a}{b}  →  ((a)/(b))    (run twice to handle nested)
    import re
    for _ in range(3):
        s = re.sub(r"\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}", r"((\1)/(\2))", s)
    s = re.sub(r"\\sqrt\s*\{([^{}]+)\}", r"sqrt(\1)", s)
    # Strip remaining backslash commands → bare names (e.g. \sin → sin)
    s = re.sub(r"\\([A-Za-z]+)", r"\1", s)
    # Curly braces → parens (for ^{...} and the like)
    s = s.replace("{", "(").replace("}", ")")
    # Spelled-out e^x: leave Euler's e to sympy
    from sympy.parsing.sympy_parser import (
        parse_expr, standard_transformations, implicit_multiplication_application, convert_xor,
    )
    trans = standard_transformations + (implicit_multiplication_application, convert_xor)
    return parse_expr(s, transformations=trans)


@app.post("/equiv")
def equiv(payload: dict = Body(...)):
    if sp is None:
        raise HTTPException(503, "SymPy not available")
    a_raw = str(payload.get("a", ""))
    b_raw = str(payload.get("b", ""))
    try:
        a = _parse(a_raw)
        b = _parse(b_raw)
    except Exception as e:
        return {"ok": False, "equivalent": False, "reason": f"parse error: {e}"}
    try:
        diff = sp.simplify(a - b)
        equivalent = diff == 0
        if not equivalent:
            # Try a second pass with trig identities
            try:
                diff2 = sp.simplify(sp.trigsimp(a - b))
                equivalent = diff2 == 0
            except Exception:
                pass
        return {"ok": True, "equivalent": bool(equivalent), "a": str(a), "b": str(b), "diff": str(diff)}
    except Exception as e:
        return {"ok": False, "equivalent": False, "reason": f"simplify error: {e}"}


@app.post("/ocr")
async def ocr(file: UploadFile = File(...), authorization: str | None = Header(default=None)):
    require_token(authorization)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "expected image upload")
    data = await file.read()
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
        result = get_model().recognize(img)
        # result is {"text": "...", "score": 0.99} OR a plain string in some versions
        if isinstance(result, dict):
            text = str(result.get("text", "")).strip()
            score = float(result.get("score", 0.0))
        else:
            text = str(result).strip()
            score = None
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        # If the whole expression came back as one line (typical for MFR), keep as one line.
        if not lines and text:
            lines = [text]
        return {"ok": True, "lines": lines, "score": score, "raw": text}
    except Exception as e:
        log.exception("ocr failed")
        raise HTTPException(500, f"ocr failed: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=7800)
