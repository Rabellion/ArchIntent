"""Unit tests for the Groq API key pool.

The pool is pure logic with an injected clock, so every rate-limit and
re-roll behaviour below is tested deterministically -- no sleeping, no
network, no real keys.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from key_pool import GroqKeyPool, NoKeyAvailable, parse_keys  # noqa: E402


class FakeClock:
    """Manually advanced monotonic clock."""

    def __init__(self, start: float = 1000.0) -> None:
        self.now = start

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def make_pool(n_keys: int = 3, rpm: int = 20, rpd: int = 2000, clock=None):
    keys = [f"gsk_test_key_{i:02d}" for i in range(n_keys)]
    return GroqKeyPool(keys, rpm=rpm, rpd=rpd, clock=clock or FakeClock())


# ---------------------------------------------------------------- parsing


def test_parse_keys_splits_on_newlines_and_commas():
    raw = "gsk_aaa\ngsk_bbb,gsk_ccc\n\n  gsk_ddd  \n"
    assert parse_keys(raw) == ["gsk_aaa", "gsk_bbb", "gsk_ccc", "gsk_ddd"]


def test_parse_keys_deduplicates_preserving_order():
    # The supplied key file really does contain repeats; a duplicate must
    # not get double quota or be handed out twice as fast.
    raw = "gsk_a\ngsk_b\ngsk_a\ngsk_c\ngsk_b"
    assert parse_keys(raw) == ["gsk_a", "gsk_b", "gsk_c"]


def test_parse_keys_ignores_comments_and_blank_lines():
    raw = "# comment\ngsk_a\n\n# another\ngsk_b\n"
    assert parse_keys(raw) == ["gsk_a", "gsk_b"]


def test_empty_pool_is_rejected():
    with pytest.raises(ValueError):
        GroqKeyPool([], rpm=20, rpd=2000)


# ------------------------------------------------------------ round robin


def test_acquire_cycles_through_keys_in_order():
    pool = make_pool(n_keys=3)
    got = [pool.acquire().key for _ in range(6)]
    assert got == [
        "gsk_test_key_00",
        "gsk_test_key_01",
        "gsk_test_key_02",
        "gsk_test_key_00",
        "gsk_test_key_01",
        "gsk_test_key_02",
    ]


def test_round_robin_spreads_load_evenly_rather_than_draining_key_zero():
    # 3 keys x 20 RPM = 60 requests should be evenly split 20/20/20,
    # never 20 on the first key and a failure on request 21.
    pool = make_pool(n_keys=3, rpm=20)
    counts: dict[str, int] = {}
    for _ in range(60):
        lease = pool.acquire()
        counts[lease.key] = counts.get(lease.key, 0) + 1
    assert sorted(counts.values()) == [20, 20, 20]


# ------------------------------------------------------------ rpm limits


def test_single_key_blocks_after_rpm_is_reached():
    pool = make_pool(n_keys=1, rpm=3)
    for _ in range(3):
        pool.acquire()
    with pytest.raises(NoKeyAvailable):
        pool.acquire()


def test_exhausted_key_is_skipped_and_another_key_is_used():
    """The core requirement: never rate-limit a single key -- re-roll."""
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=2, rpd=2000, clock=clock)
    # Drain k0 only, by penalising k1 out of the rotation first.
    pool.penalize("k1", retry_after=30.0)
    assert pool.acquire().key == "k0"
    assert pool.acquire().key == "k0"
    # k0 is now at its RPM ceiling and k1 is cooling down.
    with pytest.raises(NoKeyAvailable):
        pool.acquire()
    # Once k1's cooldown lapses the pool re-rolls onto it instead of
    # pushing a third request through k0.
    clock.advance(31)
    assert pool.acquire().key == "k1"


def test_minute_window_slides_so_capacity_returns():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=2, rpd=2000, clock=clock)
    pool.acquire()
    pool.acquire()
    with pytest.raises(NoKeyAvailable):
        pool.acquire()
    clock.advance(60.001)
    assert pool.acquire().key == "k0"


def test_aggregate_capacity_is_keys_times_rpm():
    pool = make_pool(n_keys=5, rpm=20)
    for _ in range(100):
        pool.acquire()
    with pytest.raises(NoKeyAvailable):
        pool.acquire()


# ------------------------------------------------------------ rpd limits


def test_daily_limit_is_enforced_independently_of_the_minute_window():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=20, rpd=5, clock=clock)
    for _ in range(5):
        pool.acquire()
        clock.advance(61)  # always clear of the minute window
    with pytest.raises(NoKeyAvailable):
        pool.acquire()


def test_daily_window_slides_after_24h():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=20, rpd=2, clock=clock)
    pool.acquire()
    pool.acquire()
    clock.advance(61)
    with pytest.raises(NoKeyAvailable):
        pool.acquire()
    clock.advance(86400)
    assert pool.acquire().key == "k0"


# ------------------------------------------------------- 429 / cooldown


def test_penalize_puts_key_in_cooldown_and_rotation_skips_it():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=20, rpd=2000, clock=clock)
    pool.penalize("k0", retry_after=10.0)
    assert [pool.acquire().key for _ in range(3)] == ["k1", "k1", "k1"]
    clock.advance(11)
    assert pool.acquire().key == "k0"


def test_lease_penalize_marks_its_own_key():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=20, rpd=2000, clock=clock)
    lease = pool.acquire()
    assert lease.key == "k0"
    lease.penalize(retry_after=30.0)
    assert pool.acquire().key == "k1"


# ------------------------------------------------------------- refunding


def test_refund_returns_the_reserved_slot():
    pool = make_pool(n_keys=1, rpm=2)
    a = pool.acquire()
    pool.acquire()
    with pytest.raises(NoKeyAvailable):
        pool.acquire()
    a.refund()  # e.g. the connection died before Groq saw the request
    assert pool.acquire().key == a.key


def test_refund_is_idempotent():
    pool = make_pool(n_keys=1, rpm=2)
    a = pool.acquire()
    a.refund()
    a.refund()
    # Only one slot should have come back, so two more acquires fit and a
    # third does not.
    pool.acquire()
    pool.acquire()
    with pytest.raises(NoKeyAvailable):
        pool.acquire()


# ------------------------------------------------- exhaustion / retry_after


def test_no_key_available_reports_when_to_retry():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=1, rpd=2000, clock=clock)
    pool.acquire()
    clock.advance(20)
    with pytest.raises(NoKeyAvailable) as exc:
        pool.acquire()
    # 60s window opened at t=0, we are at t=20 -> ~40s until it frees.
    assert 39.0 <= exc.value.retry_after <= 41.0


def test_retry_after_picks_the_soonest_of_all_keys():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=1, rpd=2000, clock=clock)
    pool.acquire()          # k0 at t=0
    clock.advance(30)
    pool.acquire()          # k1 at t=30
    with pytest.raises(NoKeyAvailable) as exc:
        pool.acquire()
    # k0 frees at t=60 (30s away), k1 at t=90 (60s away) -> expect ~30.
    assert 29.0 <= exc.value.retry_after <= 31.0


# ------------------------------------------------------------------ stats


def test_stats_reports_masked_keys_only():
    pool = make_pool(n_keys=2)
    pool.acquire()
    stats = pool.stats()
    assert stats["total_keys"] == 2
    blob = repr(stats)
    assert "gsk_test_key_00" not in blob
    assert "gsk_test_key_01" not in blob


def test_stats_counts_available_keys():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1", "k2"], rpm=1, rpd=2000, clock=clock)
    assert pool.stats()["available_keys"] == 3
    pool.acquire()
    assert pool.stats()["available_keys"] == 2
    pool.penalize("k2", retry_after=60)
    assert pool.stats()["available_keys"] == 1


# ------------------------------------------------- audio seconds (ASH/ASD)


def test_audio_seconds_per_hour_limits_acquisition():
    # ASH is the binding limit for sustained voice use: 7200 audio-sec/hour
    # allows only ~240 x 30s briefs even though RPM would allow far more.
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=1000, rpd=100000, ash=100, asd=100000, clock=clock)
    pool.acquire(audio_seconds=60)
    pool.acquire(audio_seconds=30)
    # 90 of 100 used; a 30s clip no longer fits.
    with pytest.raises(NoKeyAvailable):
        pool.acquire(audio_seconds=30)
    # ...but a 10s clip still does.
    assert pool.acquire(audio_seconds=10).key == "k0"


def test_audio_hour_window_slides():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=1000, rpd=100000, ash=100, asd=100000, clock=clock)
    pool.acquire(audio_seconds=100)
    with pytest.raises(NoKeyAvailable):
        pool.acquire(audio_seconds=10)
    clock.advance(3601)
    assert pool.acquire(audio_seconds=100).key == "k0"


def test_audio_seconds_per_day_enforced():
    clock = FakeClock()
    pool = GroqKeyPool(["k0"], rpm=1000, rpd=100000, ash=100000, asd=200, clock=clock)
    pool.acquire(audio_seconds=100)
    clock.advance(3601)          # clear the hour window, not the day
    pool.acquire(audio_seconds=100)
    clock.advance(3601)
    with pytest.raises(NoKeyAvailable):
        pool.acquire(audio_seconds=1)
    clock.advance(86400)
    assert pool.acquire(audio_seconds=100).key == "k0"


def test_audio_budget_rerolls_to_a_key_with_headroom():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=1000, rpd=100000, ash=100, asd=100000, clock=clock)
    pool.acquire(audio_seconds=100)      # k0 now full on audio
    # Round robin would hand out k1 next anyway; drain it too and confirm
    # the pool reports exhaustion rather than overspending k0.
    pool.acquire(audio_seconds=100)
    with pytest.raises(NoKeyAvailable):
        pool.acquire(audio_seconds=1)


def test_oversized_clip_is_rejected_not_silently_queued():
    pool = make_pool(n_keys=2)
    with pytest.raises(NoKeyAvailable):
        pool.acquire(audio_seconds=999999)


# ------------------------------------------------------- header syncing


def test_sync_from_headers_adopts_groq_authoritative_remaining():
    clock = FakeClock()
    pool = GroqKeyPool(["k0", "k1"], rpm=1000, rpd=2000, ash=7200, asd=28800, clock=clock)
    lease = pool.acquire(audio_seconds=2)
    # Groq says this key has far less left than our local count assumed
    # (e.g. usage from another process or a previous dyno).
    lease.sync_from_headers({
        "x-ratelimit-remaining-requests": "0",
        "x-ratelimit-remaining-audio-seconds": "7198",
        "x-ratelimit-reset-requests": "43.2s",
    })
    # k0 is now known-exhausted on RPD, so the pool must skip it.
    assert pool.acquire(audio_seconds=2).key == "k1"


def test_sync_from_headers_tolerates_missing_and_malformed_values():
    pool = make_pool(n_keys=1)
    lease = pool.acquire(audio_seconds=1)
    lease.sync_from_headers({})
    lease.sync_from_headers({"x-ratelimit-remaining-requests": "not-a-number"})
    lease.sync_from_headers({"x-ratelimit-reset-requests": "banana"})
    # Still usable; malformed upstream data must not brick the pool.
    assert pool.acquire(audio_seconds=1).key == "gsk_test_key_00"


@pytest.mark.parametrize(
    "text,expected",
    [
        ("43.2s", 43.2),
        ("2m59.56s", 179.56),
        ("1s", 1.0),
        ("1h2m3s", 3723.0),
        ("500ms", 0.5),
        ("", None),
        ("banana", None),
    ],
)
def test_parse_reset_duration(text, expected):
    from key_pool import parse_duration

    got = parse_duration(text)
    if expected is None:
        assert got is None
    else:
        assert got == pytest.approx(expected, abs=0.01)


# ------------------------------------------------------ duration probing


def test_probe_duration_reads_a_real_wav_header():
    import struct

    from key_pool import probe_audio_seconds

    sr, secs = 16000, 3
    n = sr * secs
    frames = b"\x00\x00" * n
    wav = (
        b"RIFF" + struct.pack("<I", 36 + len(frames)) + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16)
        + b"data" + struct.pack("<I", len(frames)) + frames
    )
    assert probe_audio_seconds(wav, "clip.wav") == pytest.approx(3.0, abs=0.05)


def test_probe_duration_falls_back_to_an_estimate_for_opus_webm():
    from key_pool import probe_audio_seconds

    # 32 kB of webm/opus at the browser's default ~32 kbps -> ~8s.
    secs = probe_audio_seconds(b"\x1a\x45\xdf\xa3" + b"\x00" * 32_000, "voice.webm")
    assert 1.0 <= secs <= 60.0


def test_probe_duration_never_returns_zero_or_negative():
    from key_pool import probe_audio_seconds

    assert probe_audio_seconds(b"", "empty.webm") > 0
    assert probe_audio_seconds(b"\x00" * 10, "tiny.wav") > 0
