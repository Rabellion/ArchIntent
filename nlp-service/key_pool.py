"""Round-robin, rate-limit-aware pool of Groq API keys.

Groq's free tier caps `whisper-large-v3` at 20 RPM, 2,000 RPD, 7,200
audio-seconds/hour and 28,800 audio-seconds/day. Those limits apply per
*organization*, not per key -- so pooling keys only multiplies capacity
when the keys belong to separate accounts. That was verified against the
live API before this module was written: three different keys each
reported `x-ratelimit-remaining-requests: 1999` after their own single
request, rather than 1999/1998/1997, which is what a shared bucket would
have produced.

Two things follow from the observed headers and shape this design:

1. Groq reports RPD and audio-seconds remaining, but *never* RPM. So RPM
   has to be tracked locally, while RPD and ASH can be reconciled against
   the authoritative numbers Groq returns on every response.
2. Audio-seconds, not requests, is the binding limit for sustained voice
   use. 7,200 sec/hour is only ~240 thirty-second briefs, well under what
   20 RPM would otherwise allow. A pool that tracked requests alone would
   still collect 429s.

The pool therefore tracks four sliding windows per key, hands keys out
round-robin (so load spreads evenly instead of draining key 0 first),
skips any key without headroom, and puts a key in cooldown when Groq
returns 429 so the caller can immediately re-roll onto another one.

State is in-process. On a single Heroku dyno that is the whole picture; a
restart resets the counters, which can briefly over-estimate headroom
until the first response header sync corrects it.
"""
from __future__ import annotations

import os
import re
import struct
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Deque, Iterable, Mapping

# Free-tier whisper-large-v3 limits. Overridable via env for a paid tier.
DEFAULT_RPM = int(os.getenv("GROQ_RPM", "20"))
DEFAULT_RPD = int(os.getenv("GROQ_RPD", "2000"))
DEFAULT_ASH = float(os.getenv("GROQ_ASH", "7200"))
DEFAULT_ASD = float(os.getenv("GROQ_ASD", "28800"))

MINUTE = 60.0
HOUR = 3600.0
DAY = 86400.0

# Leave a little headroom rather than driving each key to its exact
# ceiling: our local clock and Groq's window boundaries never align
# perfectly, and a request in flight when the window rolls can still 429.
SAFETY_MARGIN = int(os.getenv("GROQ_SAFETY_MARGIN", "1"))

_DURATION_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(ms|h|m|s)")
_UNIT_SECONDS = {"ms": 0.001, "s": 1.0, "m": 60.0, "h": 3600.0}

# Browser MediaRecorder defaults to roughly 32 kbps opus; used only when a
# container's real duration cannot be read cheaply.
_ASSUMED_BYTES_PER_SECOND = 4000.0
_MIN_ESTIMATE_SECONDS = 1.0


class NoKeyAvailable(Exception):
    """Every key is at a limit or cooling down.

    `retry_after` is the number of seconds until the soonest key frees up,
    so the caller can surface a meaningful Retry-After instead of a bare
    failure.
    """

    def __init__(self, message: str, retry_after: float) -> None:
        super().__init__(message)
        self.retry_after = retry_after


def parse_keys(raw: str | None) -> list[str]:
    """Parse keys from newline/comma separated text.

    Blank lines and `#` comments are ignored, and duplicates are dropped
    while preserving order -- the supplied key file genuinely contained
    repeats, and a duplicate would otherwise be handed out twice as often
    while sharing one real quota.
    """
    if not raw:
        return []

    out: list[str] = []
    seen: set[str] = set()
    for chunk in raw.replace(",", "\n").splitlines():
        key = chunk.strip()
        if not key or key.startswith("#"):
            continue
        if key not in seen:
            seen.add(key)
            out.append(key)
    return out


def parse_duration(text: str | None) -> float | None:
    """Parse a Groq reset value such as '43.2s', '2m59.56s' or '500ms'."""
    if not text:
        return None
    total = 0.0
    matched = False
    for amount, unit in _DURATION_RE.findall(text.strip().lower()):
        total += float(amount) * _UNIT_SECONDS[unit]
        matched = True
    return total if matched else None


def probe_audio_seconds(audio: bytes, filename: str) -> float:
    """Best-effort duration of an audio clip, for audio-seconds budgeting.

    WAV is parsed exactly from its header. Everything else (webm/opus from
    the browser, mp3, m4a) would need a real decoder, so it is estimated
    from size -- deliberately rough, because the response headers tell us
    the true consumption immediately afterwards and the pool reconciles
    against them.
    """
    exact = _wav_duration(audio)
    if exact is not None:
        return max(exact, _MIN_ESTIMATE_SECONDS)

    estimate = len(audio) / _ASSUMED_BYTES_PER_SECOND
    return max(estimate, _MIN_ESTIMATE_SECONDS)


def _wav_duration(audio: bytes) -> float | None:
    if len(audio) < 44 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        return None

    byte_rate: int | None = None
    pos = 12
    try:
        while pos + 8 <= len(audio):
            chunk_id = audio[pos:pos + 4]
            (chunk_size,) = struct.unpack("<I", audio[pos + 4:pos + 8])
            body = pos + 8

            if chunk_id == b"fmt " and body + 16 <= len(audio):
                (byte_rate,) = struct.unpack("<I", audio[body + 8:body + 12])
            elif chunk_id == b"data" and byte_rate:
                # Trust the smaller of declared and actual, so a truncated
                # upload is not billed as if it were complete.
                actual = min(chunk_size, len(audio) - body)
                return actual / byte_rate if byte_rate > 0 else None

            pos = body + chunk_size + (chunk_size & 1)
    except (struct.error, ValueError):
        return None
    return None


def mask_key(key: str) -> str:
    """A log-safe label. Never returns enough to reconstruct the key."""
    if len(key) <= 12:
        return "***"
    return f"{key[:8]}...{key[-4:]}"


@dataclass
class _KeyState:
    key: str
    label: str
    requests_minute: Deque[float] = field(default_factory=deque)
    requests_day: Deque[float] = field(default_factory=deque)
    audio_hour: Deque[tuple[float, float]] = field(default_factory=deque)
    audio_day: Deque[tuple[float, float]] = field(default_factory=deque)
    cooldown_until: float = 0.0
    # Authoritative figures echoed by Groq, when we have them.
    known_requests_remaining: int | None = None
    known_audio_remaining: float | None = None
    consecutive_failures: int = 0


@dataclass
class Lease:
    """A reserved slot on one key.

    Held by the caller for the duration of one request so the outcome can
    be reported back: `sync_from_headers` on success, `penalize` on 429,
    `refund` when the request never reached Groq at all.
    """

    key: str
    label: str
    audio_seconds: float
    _pool: "GroqKeyPool"
    _reserved_at: float
    _settled: bool = False

    def sync_from_headers(self, headers: Mapping[str, str]) -> None:
        self._pool.sync_from_headers(self.key, headers)

    def penalize(self, retry_after: float) -> None:
        self._pool.penalize(self.key, retry_after)

    def refund(self) -> None:
        if self._settled:
            return
        self._settled = True
        self._pool.refund(self.key, self._reserved_at)


class GroqKeyPool:
    def __init__(
        self,
        keys: Iterable[str],
        rpm: int = DEFAULT_RPM,
        rpd: int = DEFAULT_RPD,
        ash: float = DEFAULT_ASH,
        asd: float = DEFAULT_ASD,
        clock: Callable[[], float] | None = None,
    ) -> None:
        deduped = parse_keys("\n".join(keys)) if not isinstance(keys, str) else parse_keys(keys)
        if not deduped:
            raise ValueError("GroqKeyPool requires at least one API key")

        self._states = [_KeyState(key=k, label=mask_key(k)) for k in deduped]
        self._by_key = {st.key: st for st in self._states}
        self._rpm = rpm
        self._rpd = rpd
        self._ash = ash
        self._asd = asd
        self._clock = clock or time.monotonic
        self._cursor = 0
        self._lock = threading.RLock()

    # ------------------------------------------------------------ public

    def acquire(self, audio_seconds: float = 0.0) -> Lease:
        """Reserve a slot on the next key with headroom.

        Scans round-robin from the cursor so requests spread evenly across
        keys rather than draining the first one and only then moving on.
        """
        audio_seconds = max(0.0, float(audio_seconds))

        with self._lock:
            now = self._clock()
            count = len(self._states)

            for offset in range(count):
                index = (self._cursor + offset) % count
                state = self._states[index]
                self._prune(state, now)

                if self._has_capacity(state, now, audio_seconds):
                    self._cursor = (index + 1) % count
                    self._reserve(state, now, audio_seconds)
                    return Lease(
                        key=state.key,
                        label=state.label,
                        audio_seconds=audio_seconds,
                        _pool=self,
                        _reserved_at=now,
                    )

            raise NoKeyAvailable(
                f"All {count} Groq keys are at their rate limit",
                retry_after=self._soonest_free(now, audio_seconds),
            )

    def sync_from_headers(self, key: str, headers: Mapping[str, str]) -> None:
        """Adopt Groq's authoritative remaining counts for this key."""
        state = self._by_key.get(key)
        if state is None:
            return

        lowered = {str(k).lower(): v for k, v in headers.items()}

        with self._lock:
            now = self._clock()

            remaining_requests = _as_int(lowered.get("x-ratelimit-remaining-requests"))
            if remaining_requests is not None:
                state.known_requests_remaining = remaining_requests
                if remaining_requests <= 0:
                    reset = parse_duration(lowered.get("x-ratelimit-reset-requests"))
                    state.cooldown_until = max(
                        state.cooldown_until, now + (reset or MINUTE)
                    )

            remaining_audio = _as_float(
                lowered.get("x-ratelimit-remaining-audio-seconds")
            )
            if remaining_audio is not None:
                state.known_audio_remaining = remaining_audio
                if remaining_audio <= 0:
                    reset = parse_duration(
                        lowered.get("x-ratelimit-reset-audio-seconds")
                    )
                    state.cooldown_until = max(
                        state.cooldown_until, now + (reset or MINUTE)
                    )

            state.consecutive_failures = 0

    def penalize(self, key: str, retry_after: float) -> None:
        """Park a key after a 429 (or repeated failures) so callers re-roll."""
        state = self._by_key.get(key)
        if state is None:
            return
        with self._lock:
            now = self._clock()
            state.cooldown_until = max(
                state.cooldown_until, now + max(0.0, float(retry_after))
            )
            state.consecutive_failures += 1

    def refund(self, key: str, reserved_at: float) -> None:
        """Return a reservation that never became a real Groq request."""
        state = self._by_key.get(key)
        if state is None:
            return
        with self._lock:
            _discard(state.requests_minute, reserved_at)
            _discard(state.requests_day, reserved_at)
            _discard_pair(state.audio_hour, reserved_at)
            _discard_pair(state.audio_day, reserved_at)

    def stats(self) -> dict:
        with self._lock:
            now = self._clock()
            keys = []
            available = 0
            for state in self._states:
                self._prune(state, now)
                is_free = self._has_capacity(state, now, 0.0)
                available += 1 if is_free else 0
                keys.append(
                    {
                        "key": state.label,
                        "available": is_free,
                        "requests_last_minute": len(state.requests_minute),
                        "requests_last_day": len(state.requests_day),
                        "audio_seconds_last_hour": round(
                            _total(state.audio_hour), 1
                        ),
                        "audio_seconds_last_day": round(_total(state.audio_day), 1),
                        "cooldown_seconds": max(
                            0.0, round(state.cooldown_until - now, 1)
                        ),
                    }
                )
            return {
                "total_keys": len(self._states),
                "available_keys": available,
                "limits": {
                    "rpm": self._rpm,
                    "rpd": self._rpd,
                    "audio_seconds_per_hour": self._ash,
                    "audio_seconds_per_day": self._asd,
                },
                "aggregate_capacity": {
                    "requests_per_minute": self._rpm * len(self._states),
                    "requests_per_day": self._rpd * len(self._states),
                },
                "keys": keys,
            }

    # ----------------------------------------------------------- internal

    def _prune(self, state: _KeyState, now: float) -> None:
        _expire(state.requests_minute, now - MINUTE)
        _expire(state.requests_day, now - DAY)
        _expire_pairs(state.audio_hour, now - HOUR)
        _expire_pairs(state.audio_day, now - DAY)

    def _has_capacity(self, state: _KeyState, now: float, audio_seconds: float) -> bool:
        if state.cooldown_until > now:
            return False
        if len(state.requests_minute) >= self._rpm:
            return False
        if len(state.requests_day) >= self._rpd:
            return False
        if _total(state.audio_hour) + audio_seconds > self._ash:
            return False
        if _total(state.audio_day) + audio_seconds > self._asd:
            return False
        if (
            state.known_requests_remaining is not None
            and state.known_requests_remaining <= 0
        ):
            return False
        if (
            state.known_audio_remaining is not None
            and state.known_audio_remaining < audio_seconds
        ):
            return False
        return True

    def _reserve(self, state: _KeyState, now: float, audio_seconds: float) -> None:
        state.requests_minute.append(now)
        state.requests_day.append(now)
        if audio_seconds > 0:
            state.audio_hour.append((now, audio_seconds))
            state.audio_day.append((now, audio_seconds))
        if state.known_requests_remaining is not None:
            state.known_requests_remaining -= 1
        if state.known_audio_remaining is not None:
            state.known_audio_remaining -= audio_seconds

    def _soonest_free(self, now: float, audio_seconds: float) -> float:
        best: float | None = None
        for state in self._states:
            waits = [max(0.0, state.cooldown_until - now)]

            if len(state.requests_minute) >= self._rpm and state.requests_minute:
                waits.append(max(0.0, state.requests_minute[0] + MINUTE - now))
            if len(state.requests_day) >= self._rpd and state.requests_day:
                waits.append(max(0.0, state.requests_day[0] + DAY - now))
            if state.audio_hour and _total(state.audio_hour) + audio_seconds > self._ash:
                waits.append(max(0.0, state.audio_hour[0][0] + HOUR - now))
            if state.audio_day and _total(state.audio_day) + audio_seconds > self._asd:
                waits.append(max(0.0, state.audio_day[0][0] + DAY - now))

            wait = max(waits)
            best = wait if best is None else min(best, wait)

        # A clip larger than a whole window can never fit; report the window
        # length rather than 0, which would invite a pointless instant retry.
        if best is None or best <= 0:
            return HOUR if audio_seconds > self._ash else MINUTE
        return best


def build_pool_from_env(
    env_var: str = "GROQ_API_KEYS", clock: Callable[[], float] | None = None
) -> GroqKeyPool | None:
    """Build the pool from config, or return None when unconfigured."""
    keys = parse_keys(os.getenv(env_var, ""))
    if not keys:
        # Single-key fallback keeps a minimal local setup working.
        single = os.getenv("GROQ_API_KEY", "").strip()
        if single:
            keys = [single]
    if not keys:
        return None

    effective_rpm = max(1, DEFAULT_RPM - SAFETY_MARGIN)
    return GroqKeyPool(keys, rpm=effective_rpm, clock=clock)


# ------------------------------------------------------------- helpers


def _expire(window: Deque[float], cutoff: float) -> None:
    while window and window[0] <= cutoff:
        window.popleft()


def _expire_pairs(window: Deque[tuple[float, float]], cutoff: float) -> None:
    while window and window[0][0] <= cutoff:
        window.popleft()


def _discard(window: Deque[float], value: float) -> None:
    try:
        window.remove(value)
    except ValueError:
        pass


def _discard_pair(window: Deque[tuple[float, float]], timestamp: float) -> None:
    for item in window:
        if item[0] == timestamp:
            window.remove(item)
            return


def _total(window: Deque[tuple[float, float]]) -> float:
    return sum(seconds for _, seconds in window)


def _as_int(value: str | None) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _as_float(value: str | None) -> float | None:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None
