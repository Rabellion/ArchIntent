"""Voice-to-text via Groq's hosted Whisper Large V3.

Deliberately NOT a locally-loaded Whisper model. This service already
loads Sentence-BERT (via torch) into the same Heroku Eco dyno (512MB
RAM). Adding a second transformer model in-process for speech
recognition risks the dyno OOMing under real usage -- exactly the kind
of failure that would show up mid-demo rather than in testing. A hosted
API moves that compute off the dyno entirely.

Capacity comes from a pool of free-tier keys rather than one paid key
(see key_pool.py). Each key carries its own 20 RPM / 2,000 RPD /
7,200 audio-sec-per-hour allowance because the keys belong to separate
Groq organizations -- verified against the live API, not assumed. The
pool hands them out round-robin and skips any key without headroom, so
no single key is ever driven into its own rate limit.

If a request still comes back 429 -- our window arithmetic and Groq's
will never align perfectly -- that key is parked for the duration of its
Retry-After and the request immediately re-rolls onto the next key
rather than failing.
"""
from __future__ import annotations

import logging
import os
import time

import httpx

from key_pool import (
    GroqKeyPool,
    Lease,
    NoKeyAvailable,
    build_pool_from_env,
    parse_duration,
    probe_audio_seconds,
)

logger = logging.getLogger(__name__)

GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3")
REQUEST_TIMEOUT = float(os.getenv("GROQ_TIMEOUT_SECONDS", "15"))

# Cap re-rolls so one bad clip cannot walk the entire key list.
MAX_ATTEMPTS = int(os.getenv("GROQ_MAX_ATTEMPTS", "4"))

# Heroku's router terminates any request that has not produced a
# response within 30s, so the whole re-roll sequence has to finish
# inside that window or the client sees an H12 regardless of what we
# do here. Groq transcribes a 30s clip in ~1-2s, so this budget is
# only ever reached when keys are timing out -- at which point
# answering promptly beats retrying into a dead connection.
TOTAL_BUDGET = float(os.getenv("GROQ_TOTAL_BUDGET_SECONDS", "25"))

# A key that answers 401/403 is misconfigured or revoked; park it for a
# long while instead of retrying it on every request.
DEAD_KEY_COOLDOWN = float(os.getenv("GROQ_DEAD_KEY_COOLDOWN", "3600"))
SERVER_ERROR_COOLDOWN = 5.0

_pool: GroqKeyPool | None = None
_pool_loaded = False


class TranscriptionError(Exception):
    """Raised for any failure to produce a transcript, with a message
    that is safe to show to the end user (no API keys, no stack
    internals)."""

    def __init__(self, message: str, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


def _get_pool() -> GroqKeyPool:
    global _pool, _pool_loaded
    if not _pool_loaded:
        _pool = build_pool_from_env()
        _pool_loaded = True
        if _pool is not None:
            logger.info(
                "Groq key pool ready: %d keys, aggregate %d req/min",
                _pool.stats()["total_keys"],
                _pool.stats()["aggregate_capacity"]["requests_per_minute"],
            )
    if _pool is None:
        raise TranscriptionError(
            "Voice transcription is not configured on this server."
        )
    return _pool


def warm_up() -> None:
    """Build the pool at startup so a misconfiguration is visible in the
    boot log rather than on a client's first recording."""
    global _pool, _pool_loaded
    _pool = build_pool_from_env()
    _pool_loaded = True
    if _pool is None:
        logger.warning(
            "GROQ_API_KEYS is not set -- voice transcription will be unavailable."
        )
    else:
        stats = _pool.stats()
        logger.info(
            "Groq key pool ready: %d keys (%d req/min, %d req/day aggregate)",
            stats["total_keys"],
            stats["aggregate_capacity"]["requests_per_minute"],
            stats["aggregate_capacity"]["requests_per_day"],
        )


def pool_stats() -> dict | None:
    """Pool state for the health endpoint. Contains only masked keys."""
    global _pool, _pool_loaded
    if not _pool_loaded:
        _pool = build_pool_from_env()
        _pool_loaded = True
    return _pool.stats() if _pool is not None else None


async def transcribe(audio_bytes: bytes, filename: str) -> str:
    """Transcribe an audio clip to text, re-rolling across pooled keys.

    `filename` is passed through to Groq purely so it can infer the audio
    format from the extension (webm/mp3/wav/m4a/...) -- the browser's
    MediaRecorder produces webm/opus by default, which Whisper accepts.
    """
    if not audio_bytes:
        raise TranscriptionError("No audio was received.")

    pool = _get_pool()
    estimated_seconds = probe_audio_seconds(audio_bytes, filename)
    attempts = min(MAX_ATTEMPTS, pool.stats()["total_keys"])
    last_error: str | None = None
    deadline = time.monotonic() + TOTAL_BUDGET

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        for attempt in range(attempts):
            remaining = deadline - time.monotonic()
            if remaining <= 1.0:
                logger.warning(
                    "Transcription budget exhausted after %d attempt(s)", attempt
                )
                break

            try:
                lease = pool.acquire(audio_seconds=estimated_seconds)
            except NoKeyAvailable as exc:
                raise TranscriptionError(
                    "Voice transcription is busy right now. Please try again "
                    "in a moment, or type your brief.",
                    retry_after=exc.retry_after,
                ) from exc

            outcome = await _attempt(
                client, lease, audio_bytes, filename, timeout=remaining
            )

            if outcome.transcript is not None:
                return outcome.transcript

            last_error = outcome.error
            if not outcome.retryable:
                break

            logger.warning(
                "Groq attempt %d/%d on key %s failed (%s); re-rolling",
                attempt + 1,
                attempts,
                lease.label,
                outcome.error,
            )

    logger.error("Groq transcription exhausted all attempts: %s", last_error)
    raise TranscriptionError(
        "Could not transcribe the recording. Please try again or type your brief."
    )


class _Outcome:
    __slots__ = ("transcript", "error", "retryable")

    def __init__(
        self,
        transcript: str | None = None,
        error: str | None = None,
        retryable: bool = False,
    ) -> None:
        self.transcript = transcript
        self.error = error
        self.retryable = retryable


async def _attempt(
    client: httpx.AsyncClient,
    lease: Lease,
    audio_bytes: bytes,
    filename: str,
    timeout: float,
) -> _Outcome:
    try:
        response = await client.post(
            GROQ_TRANSCRIBE_URL,
            timeout=min(REQUEST_TIMEOUT, max(1.0, timeout)),
            headers={"Authorization": f"Bearer {lease.key}"},
            files={"file": (filename, audio_bytes)},
            data={
                "model": GROQ_MODEL,
                # English is the only language the rest of the pipeline
                # (the curated keyword vocabulary, S-BERT) is tuned for;
                # pinning it avoids Whisper auto-detecting the wrong
                # language on short or accented clips.
                "language": "en",
                "response_format": "json",
            },
        )
    except httpx.HTTPError as exc:
        # Never reached Groq, so the reservation was not actually spent.
        lease.refund()
        return _Outcome(error=f"transport: {exc!s}", retryable=True)

    # Groq reports true remaining RPD and audio-seconds on every response;
    # adopting them keeps the pool honest even if our local arithmetic
    # drifts or another process shares these keys.
    lease.sync_from_headers(response.headers)

    if response.status_code == 429:
        retry_after = (
            parse_duration(response.headers.get("retry-after"))
            or parse_duration(response.headers.get("x-ratelimit-reset-requests"))
            or 60.0
        )
        lease.penalize(retry_after)
        return _Outcome(error=f"429 rate limited ({retry_after:.0f}s)", retryable=True)

    if response.status_code in (401, 403):
        lease.penalize(DEAD_KEY_COOLDOWN)
        return _Outcome(
            error=f"{response.status_code} key rejected", retryable=True
        )

    if response.status_code >= 500:
        lease.penalize(SERVER_ERROR_COOLDOWN)
        return _Outcome(error=f"{response.status_code} upstream", retryable=True)

    if response.status_code >= 400:
        # 400/413/415: the clip itself is the problem, so another key will
        # not help.
        detail = _error_detail(response)
        logger.error("Groq rejected the audio: %s %s", response.status_code, detail)
        return _Outcome(error=f"{response.status_code} {detail}", retryable=False)

    try:
        text = response.json().get("text", "")
    except ValueError:
        text = response.text

    return _Outcome(transcript=(text or "").strip())


def _error_detail(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text[:200]
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict):
            return str(error.get("message", ""))[:200]
        if error:
            return str(error)[:200]
    return str(payload)[:200]
