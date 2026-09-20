from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_model: SentenceTransformer | None = None


@dataclass(frozen=True)
class Match:
    architect_id: int
    architect_project_id: int | None
    match_score: int

    def to_dict(self) -> dict:
        return {
            "architect_id": self.architect_id,
            "architect_project_id": self.architect_project_id,
            "match_score": self.match_score,
        }


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        model_name = os.getenv("MODEL_NAME", "all-MiniLM-L6-v2")
        _model = SentenceTransformer(model_name)
    return _model


def _join(*parts: str) -> str:
    return " ".join(p.strip() for p in parts if p and p.strip())


def build_project_text(project: dict) -> str:
    return _join(
        project.get("project_type", ""),
        f"in {project['location']}" if project.get("location") else "",
        project.get("brief_text", ""),
    )


def build_architect_base_text(architect: dict) -> str:
    return _join(architect.get("specialization", ""), architect.get("bio", ""))


def build_project_text_for_architect(arch_base: str, arch_project: dict) -> str:
    tags = ", ".join(arch_project.get("style_tags", []) or [])
    desc = arch_project.get("project_description", "") or ""
    return _join(arch_base, desc, tags)


def rank_architects(
    project: dict,
    architects: list[dict],
    top_k: int = 10,
    min_score: float | None = None,
) -> list[dict]:
    """Score each architect by the best of their portfolio projects.

    Returns a list of dicts with integer `match_score` in 0..100 to match
    the Laravel `ProjectMatchWriter` validator.
    """
    if min_score is None:
        min_score = float(os.getenv("MIN_SCORE", "0.20"))

    project_text = build_project_text(project)
    if not project_text or not architects:
        return []

    model = get_model()

    # Build one text per (architect, portfolio_project) pair so we can pick
    # the architect's best-matching project rather than always projects[0].
    pairs: list[tuple[int, int | None, str]] = []
    for arch in architects:
        base = build_architect_base_text(arch)
        projects = arch.get("projects") or []
        if not projects:
            text = base
            if text:
                pairs.append((arch["architect_id"], None, text))
            continue
        for ap in projects:
            text = build_project_text_for_architect(base, ap)
            if text:
                pairs.append(
                    (
                        arch["architect_id"],
                        ap.get("architect_project_id"),
                        text,
                    )
                )

    if not pairs:
        return []

    texts = [project_text] + [text for _, _, text in pairs]
    embeddings = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    project_vec = embeddings[0:1]
    pair_vecs = embeddings[1:]
    scores = cosine_similarity(project_vec, pair_vecs)[0]

    # Collapse pairs to "best project per architect".
    best: dict[int, tuple[float, int | None]] = {}
    for (architect_id, arch_project_id, _text), score in zip(pairs, scores):
        current = best.get(architect_id)
        if current is None or score > current[0]:
            best[architect_id] = (float(score), arch_project_id)

    matches = [
        Match(
            architect_id=architect_id,
            architect_project_id=arch_project_id,
            # Laravel validator requires integer 0..100.
            match_score=max(0, min(100, int(round(score * 100)))),
        )
        for architect_id, (score, arch_project_id) in best.items()
        if score >= min_score
    ]

    matches.sort(key=lambda m: m.match_score, reverse=True)
    return [m.to_dict() for m in matches[:top_k]]
