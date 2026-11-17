from __future__ import annotations

import asyncio
import io
import json
import os
import secrets
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader
from pypdf.errors import PdfReadError
from starlette.concurrency import run_in_threadpool
from starlette.formparsers import MultiPartParser

from . import gemini
from .errors import EngineError, revision
from .schemas import CoachRequest, Exam, ExtractionRequest, Model, ValidationRequest
from .symbolic import verify_bounded

MAX_UPLOAD = 20 * 1024 * 1024
# Body stream is already capped at 21 MB. Prevent multipart temp-file spooling.
MultiPartParser.spool_max_size = MAX_UPLOAD + 1024 * 1024
app = FastAPI(
    title="TargetJEE Engine",
    version="1.0.0",
    description="Stateless algebra-checked drill forge. No accounts, key storage or central learner database.",
)
origins = [
    s.strip().rstrip("/")
    for s in os.getenv("TARGETJEE_FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if s.strip()
]
if not origins or "*" in origins:
    raise RuntimeError("Explicit frontend CORS origins required")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Gemini-Api-Key"],
    max_age=600,
)
queue = asyncio.Semaphore(2)
validation_queue = asyncio.Semaphore(2)


@app.middleware("http")
async def request_guard(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex[:12]
    # Hosts may probe the container over private cleartext HTTP before TLS-edge
    # routing is enabled. Only this credential-free GET is exempt; never relax
    # transport checks for a POST or an API route to make readiness pass.
    internal_health_probe = request.method == "GET" and request.url.path == "/health"
    if (
        os.getenv("TARGETJEE_REQUIRE_HTTPS", "false").lower() == "true"
        and not internal_health_probe
        and request.headers.get("x-forwarded-proto", request.url.scheme) != "https"
    ):
        return JSONResponse({"detail": "HTTPS required"}, status_code=400)
    # Bound the stream even without Content-Length. Never inspect/log headers.
    if request.method == "POST":
        total = 0
        chunks = []
        async for chunk in request.stream():
            total += len(chunk)
            if total > MAX_UPLOAD + 1024 * 1024:
                return JSONResponse({"detail": "Request exceeds upload limit"}, status_code=413)
            chunks.append(chunk)
        # Starlette's cached request replays _body to the downstream app.
        request._body = b"".join(chunks)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(EngineError)
async def safe_engine_error(request: Request, exc: EngineError):
    return JSONResponse(
        {
            "detail": exc.detail,
            "diagnostic": {
                "code": exc.code,
                "stage": exc.stage,
                "request_id": request.state.request_id,
                "revision": revision(),
            },
        },
        status_code=exc.status_code,
    )


@app.exception_handler(RequestValidationError)
async def safe_validation(_request, exc):
    return JSONResponse(
        {
            "detail": [
                {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()
            ]
        },
        status_code=422,
    )


def require_key(key: str | None) -> str:
    if not key:
        raise HTTPException(
            401,
            "Add a Gemini key in your browser settings, or start a free reference drill.",
        )
    if not 20 <= len(key) <= 256 or not all(c.isalnum() or c in "_-" for c in key):
        raise HTTPException(401, "Invalid key format. Replace it in your browser settings.")
    return key


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "targetjee-engine",
        "schema": "targetjee.item.v2",
        "persistence": "none",
        "revision": revision(),
    }


@app.get("/v1/reference")
async def reference(exam: Exam = "main"):
    items = json.loads(
        (Path(__file__).resolve().parents[2] / "data" / "seed-items.json").read_text()
    )
    selected = [i for i in items if i["exam"] == exam]
    for item in selected:
        secrets.SystemRandom().shuffle(item["options"])
    return {
        "items": selected,
        "source": "seeded-reference",
        "parameter_notice": "Illustrative parameters; not empirically calibrated.",
    }


@app.post("/v1/items/validate")
async def validate(payload: ValidationRequest):
    try:
        await asyncio.wait_for(validation_queue.acquire(), timeout=8.0)
    except TimeoutError:
        raise HTTPException(429, "Symbolic workers are busy. Please retry shortly.") from None
    try:
        results = await run_in_threadpool(verify_bounded, payload.items)
        return {"results": results}
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    finally:
        validation_queue.release()


def forge_rejection(error: ValueError) -> tuple[int, str]:
    message = str(error)
    if message == "Symbolic verification timed out; simplify the problem":
        return (
            503,
            "The algebra check reached its time limit. No item was released. "
            "Try one simpler problem or a reference drill; no automatic retry was made.",
        )
    reasons = {
        "Equivalent distractors rejected": "Gemini produced equivalent answer options.",
        "Option distinctness cannot be established": "The answer options could not be proved distinct.",
        "Key does not uniquely match solution certificate": "The generated key did not match a unique checked answer.",
        "Recovery answer certificate failed": "A generated recovery answer did not match its certificate.",
        "Undeclared symbol": "A generated expression used a symbol outside its declared domain.",
        "Only bounded numeric exponents supported": "A generated exponent is outside the supported algebra language.",
        "Unsupported expression syntax": "A generated expression used unsupported algebra syntax.",
        "Non-real or undefined expression": "A generated expression was undefined or non-real.",
    }
    for option_id in "ABCD":
        reasons[f"Option {option_id} does not match its derivation certificate"] = (
            "A generated option did not match its derivation certificate."
        )
        reasons[f"Option {option_id} violates expected dimensional powers"] = (
            "The generated unit vectors were inconsistent."
        )
    reason = reasons.get(
        message, "The generated item could not be safely verified by the algebra check."
    )
    return (
        422,
        f"{reason} No unverified item was released. This can be a generation error, not an image problem. "
        "Try one problem or the other model; no automatic retry was made.",
    )


async def forge(
    payload: ExtractionRequest,
    key: str,
    data: bytes | None = None,
    mime: str | None = None,
):
    try:
        await asyncio.wait_for(queue.acquire(), timeout=8.0)
    except TimeoutError:
        raise HTTPException(
            429, "The two-worker forge queue is full. Please retry shortly."
        ) from None
    try:
        items = await gemini.extract(payload, key, data, mime)
        verified_items = []
        needs_ocr_review = []
        skipped_items = []
        verification = []
        first_exc = None

        for item in items:
            try:
                res_list = await run_in_threadpool(verify_bounded, [item])
                res = res_list[0]
                for option in item.options:
                    option.latex = res["canonical_options"][option.id]
                secrets.SystemRandom().shuffle(item.options)
                verified_items.append(item)
                verification.append(res)
            except ValueError as exc:
                if first_exc is None:
                    first_exc = exc
                err_msg = str(exc)
                if "Key does not uniquely match solution certificate" in err_msg:
                    needs_ocr_review.append(
                        {
                            "item": item.model_dump(),
                            "reason": "Key does not uniquely match solution certificate (check for OCR sign, subscript, or coordinate typos)",
                            "error": err_msg,
                        }
                    )
                else:
                    skipped_items.append(
                        {
                            "item_id": item.id,
                            "reason": err_msg,
                        }
                    )

        if not verified_items and not needs_ocr_review:
            status, detail = forge_rejection(first_exc or ValueError("No items could be verified"))
            raise EngineError(
                status,
                detail,
                "verification_timeout" if status == 503 else "verification_rejected",
                "verification",
            ) from None

        return {
            "items": [i.model_dump() for i in verified_items],
            "verified_items": [i.model_dump() for i in verified_items],
            "needs_ocr_review": needs_ocr_review,
            "skipped_items": skipped_items,
            "verification": verification,
            "source": "gemini",
        }
    finally:
        queue.release()


@app.post("/v1/extractions")
async def extract_text(
    payload: ExtractionRequest, x_gemini_api_key: str | None = Header(default=None)
):
    key = require_key(x_gemini_api_key)
    return await forge(payload, key)


def inspect_upload(data: bytes, mime: str):
    if mime == "application/pdf":
        if not data.startswith(b"%PDF-"):
            raise ValueError("File signature does not match PDF")
        pdf = PdfReader(io.BytesIO(data))
        if pdf.is_encrypted or not 1 <= len(pdf.pages) <= 30:
            raise ValueError("Use an unencrypted PDF with 1–30 pages")
    else:
        if mime == "image/png" and not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("File signature does not match PNG")
        if mime == "image/jpeg" and not data.startswith(b"\xff\xd8\xff"):
            raise ValueError("File signature does not match JPEG")
        # Restrict decoder discovery as well as the MIME/signature checks.
        # Do not initialize unrelated image plugins for untrusted uploads.
        with Image.open(io.BytesIO(data), formats=["PNG", "JPEG"]) as image:
            if image.width * image.height > 25_000_000:
                raise ValueError("Image exceeds 25 megapixels; resize it first")
            if image.format not in ("PNG", "JPEG"):
                raise ValueError("Only real PNG and JPEG images accepted")
            image.verify()


@app.post("/v1/extractions/upload")
async def extract_upload(
    file: Annotated[UploadFile, File()],
    exam: Annotated[Exam, Form()] = "main",
    model: Annotated[Model, Form()] = "gemini-flash-latest",
    x_gemini_api_key: str | None = Header(default=None),
):
    key = require_key(x_gemini_api_key)
    mime = file.content_type or ""
    if mime not in ("image/png", "image/jpeg", "application/pdf"):
        raise HTTPException(415, "Only PNG, JPEG and PDF are accepted")
    data = await file.read(MAX_UPLOAD + 1)
    await file.close()
    if not data or len(data) > MAX_UPLOAD:
        raise HTTPException(413, "Upload must be nonempty and at most 20 MB")
    try:
        await run_in_threadpool(inspect_upload, data, mime)
    except (ValueError, UnidentifiedImageError, Image.DecompressionBombError):
        raise HTTPException(
            422,
            "File content is invalid, encrypted, too large in pixels, or exceeds 30 PDF pages.",
        ) from None
    except (
        OSError,
        EOFError,
        TypeError,
        KeyError,
        IndexError,
        ArithmeticError,
        SyntaxError,
        PdfReadError,
        NotImplementedError,
    ):
        raise HTTPException(422, "This document could not be safely decoded.") from None
    return await forge(
        ExtractionRequest(
            text="Extract a self-contained problem from this uploaded document. Include all necessary diagram descriptions.",
            exam=exam,
            model=model,
        ),
        key,
        data,
        mime,
    )


@app.post("/v1/coach")
async def coach(payload: CoachRequest, x_gemini_api_key: str | None = Header(default=None)):
    key = require_key(x_gemini_api_key)
    try:
        await asyncio.wait_for(queue.acquire(), timeout=8.0)
    except TimeoutError:
        raise HTTPException(429, "Coach is busy. Please retry shortly.") from None
    try:
        return {"reply": await gemini.coach(payload, key)}
    finally:
        queue.release()
