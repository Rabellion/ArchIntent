from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

from matcher import get_model, rank_architects

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading sentence-transformer model...")
    get_model()
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


@app.get("/health")
def health() -> dict:
    return {"ok": True, "callback_enabled": ENABLE_LARAVEL_CALLBACK}


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
