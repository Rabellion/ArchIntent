"""Voice-to-text via the OpenAI Whisper API.

Deliberately NOT a locally-loaded Whisper model. This service already
loads Sentence-BERT (via torch) into the same Heroku Eco dyno (512MB
RAM). Adding a second transformer model in-process for speech
recognition risks the dyno OOMing under real usage -- exactly the kind
of failure that would show up mid-demo rather than in testing. The
OpenAI API moves that compute off the dyno entirely, at a cost low
enough to be a non-issue for a project at this scale (~$0.006/minute of
audio as of this writing).

If a future revision of the project wants a fully self-hosted pipeline,
the natural place to plug in a local model (faster-whisper, tiny/base)
is right here, behind the same transcribe() signature.
"""
from __future__ import annotations

import logging
import os

from openai import AsyncOpenAI, OpenAIError

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


class TranscriptionError(Exception):
    """Raised for any failure to produce a transcript, with a message
    that is safe to show to the end user (no API keys, no stack
    internals)."""


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            raise TranscriptionError(
                "Voice transcription is not configured on this server."
            )
        _client = AsyncOpenAI(api_key=api_key)
    return _client


async def transcribe(audio_bytes: bytes, filename: str) -> str:
    """Transcribe an audio clip to text.

    `filename` is passed through to OpenAI purely so it can infer the
    audio format from the extension (webm/mp3/wav/m4a/...) -- the
    browser's MediaRecorder produces webm/opus by default, which the
    Whisper API accepts directly.
    """
    if not audio_bytes:
        raise TranscriptionError("No audio was received.")

    client = _get_client()

    try:
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=(filename, audio_bytes),
            # English is the only language the rest of the pipeline
            # (the curated keyword vocabulary, S-BERT calls) is tuned
            # for; pinning it avoids Whisper auto-detecting the wrong
            # language on short or accented clips.
            language="en",
            response_format="text",
        )
    except OpenAIError as exc:
        logger.error("Whisper transcription failed: %s", exc)
        raise TranscriptionError(
            "Could not transcribe the recording. Please try again or type your brief."
        ) from exc

    # response_format="text" returns a plain string from this SDK
    # version; guard the type in case that ever changes upstream.
    text = result if isinstance(result, str) else getattr(result, "text", "")
    return text.strip()
