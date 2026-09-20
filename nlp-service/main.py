from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from keyword_extractor import extract_intent, warm_up as warm_up_spacy
from matcher import get_model, rank_architects
from transcriber import (
    TranscriptionError,
    pool_stats,
    transcribe,
    warm_up as warm_up_transcriber,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

LARAVEL_URL = os.getenv("LARAVEL_URL", "")
INTERNAL_KEY = os.getenv("INTERNAL_KEY", "")
TOP_K = int(os.getenv("TOP_K", "10"))
# Laravel's job already writes matches from the /match response, so the
# callback is OFF by default to avoid double-writes. Set to "1" to enable
# fire-and-forget mode when calling /match directly (e.g. cron/integration).
ENABLE_LARAVEL_CALLBACK = os.getenv("ENABLE_LARAVEL_CALLBACK", "0") == "1"


MAX_AUDIO_BYTES = int(os.getenv("MAX_AUDIO_BYTES", str(15 * 1024 * 1024)))  # 15 MB


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading sentence-transformer model...")
    get_model()
    logger.info("Loading spaCy pipeline...")
    warm_up_spacy()
    # Builds the Groq key pool so a missing/incomplete GROQ_API_KEYS
    # shows up in the boot log, not on a client's first recording.
    logger.info("Building Groq key pool...")
    warm_up_transcriber()
    logger.info("Model ready.")
    yield


app = FastAPI(title="ArchIntent NLP Matching Service", lifespan=lifespan)


def verify_internal_key(x_internal_key: str | None = Header(default=None)) -> None:
    if not INTERNAL_KEY:
        # Auth disabled when no key is configured (dev convenience).
        return
    if x_internal_key != INTERNAL_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Internal-Key",
        )


class ArchitectProject(BaseModel):
    architect_project_id: int | None = None
    project_description: str = ""
    style_tags: list[str] = Field(default_factory=list)


class ArchitectEntry(BaseModel):
    architect_id: int
    specialization: str = ""
    bio: str = ""
    projects: list[ArchitectProject] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    project_id: int
    project_type: str = ""
    location: str = ""
    brief_text: str = ""


class MatchRequest(BaseModel):
    project: ProjectEntry
    architects: list[ArchitectEntry]


class ExtractKeywordsRequest(BaseModel):
    text: str = Field(..., max_length=5000)


@app.get("/health")
def health() -> dict:
    stats = pool_stats()
    return {
        "ok": True,
        "callback_enabled": ENABLE_LARAVEL_CALLBACK,
        # Masked key labels only -- never the keys themselves.
        "transcription": {
            "configured": stats is not None,
            "model": os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3"),
            "total_keys": stats["total_keys"] if stats else 0,
            "available_keys": stats["available_keys"] if stats else 0,
            "aggregate_capacity": stats["aggregate_capacity"] if stats else None,
        },
    }


@app.post("/match", dependencies=[Depends(verify_internal_key)])
async def match(req: MatchRequest) -> dict:
    if not req.architects:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No architects provided",
        )

    project_dict = req.project.model_dump()
    architect_dicts = [a.model_dump() for a in req.architects]

    matches = rank_architects(project_dict, architect_dicts, top_k=TOP_K)

    payload = {"project_id": req.project.project_id, "matches": matches}

    if ENABLE_LARAVEL_CALLBACK and LARAVEL_URL and INTERNAL_KEY and matches:
        await _post_to_laravel(payload)

    return {"success": True, "matches_count": len(matches), "matches": matches}


@app.post("/extract-keywords", dependencies=[Depends(verify_internal_key)])
def extract_keywords(req: ExtractKeywordsRequest) -> dict:
    """Decode a client's free-text brief into structured design terms.

    Standalone from /match on purpose: the frontend calls this live,
    while the client is still writing/reviewing their brief and before
    a project (or any architects to match against) exists yet, to show
    a "we understood: modern, minimalist, open-plan" confirmation.
    Matching itself gets the same enrichment automatically, inside
    matcher.build_project_text -- this endpoint does not need to be
    called for keyword extraction to affect match quality.
    """
    intent = extract_intent(req.text)
    return {"success": True, "intent": intent.to_dict()}


@app.post("/transcribe", dependencies=[Depends(verify_internal_key)])
async def transcribe_audio(file: UploadFile = File(...)) -> dict:
    audio_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio must be under {MAX_AUDIO_BYTES // (1024 * 1024)} MB.",
        )

    try:
        text = await transcribe(audio_bytes, file.filename or "recording.webm")
    except TranscriptionError as exc:
        # Pool exhaustion is a 'come back shortly', not a gateway fault,
        # so it gets 429 + Retry-After and the caller can act on it.
        if exc.retry_after is not None:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(exc),
                headers={"Retry-After": str(int(exc.retry_after) + 1)},
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return {"success": True, "transcript": text}


async def _post_to_laravel(payload: dict) -> None:
    url = f"{LARAVEL_URL.rstrip('/')}/api/internal/project-matches"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "X-Internal-Key": INTERNAL_KEY,
                    "Accept": "application/json",
                },
            )
            if not resp.is_success:
                logger.error(
                    "Laravel callback failed: %s %s",
                    resp.status_code,
                    resp.text[:200],
                )
            else:
                logger.info(
                    "Laravel notified: project_id=%s matches=%d",
                    payload["project_id"],
                    len(payload["matches"]),
                )
    except Exception as exc:
        logger.error("Laravel callback error: %s", exc)
