"""spaCy-based keyword extraction for client project briefs.

This is the "decode client intent" stage the FYP proposal calls for: it
runs BEFORE semantic matching, pulling structured design parameters
(style, room types, materials, features) out of a client's free-text
brief so that:

  1. the embedding text handed to Sentence-BERT is enriched with the
     salient terms rather than diluted by filler words, and
  2. the frontend can show the client a "we understood: modern,
     minimalist, open-plan" confirmation before they submit -- a
     concrete, demonstrable piece of the intent-decoding pipeline.

Two complementary techniques, matching how spaCy is actually meant to be
used rather than a bare keyword list:

  - A curated architecture-domain vocabulary (PhraseMatcher, so
    multi-word terms like "open plan" and "natural light" match as a
    single unit rather than two unrelated words) for the four buckets
    the rest of the system cares about: style, room_type, material,
    feature.
  - Generic noun-chunk / adjective extraction as a fallback "keywords"
    bucket, so a term the curated list does not know about (a client
    describing something unusual) is not silently dropped.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from functools import lru_cache

import spacy
from spacy.matcher import PhraseMatcher

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------
# Curated architecture-domain vocabulary.
#
# Kept here as a plain dict of lists rather than a config file: it is
# small, it is read-only at runtime, and having it inline next to the
# matcher that consumes it makes it easy to see exactly what the system
# is capable of recognising -- worth pointing to directly in the FYP
# report's methodology chapter.
# ---------------------------------------------------------------------
VOCABULARY: dict[str, list[str]] = {
    "style": [
        "modern", "contemporary", "minimalist", "minimalism", "traditional",
        "classical", "industrial", "rustic", "colonial", "victorian",
        "mediterranean", "scandinavian", "brutalist", "art deco",
        "farmhouse", "transitional", "bohemian", "eclectic", "vernacular",
        "sustainable", "eco friendly", "green building",
    ],
    "room_type": [
        "bedroom", "master bedroom", "bathroom", "kitchen", "living room",
        "dining room", "family room", "home office", "study", "library",
        "garage", "basement", "attic", "balcony", "terrace", "courtyard",
        "lobby", "foyer", "mezzanine", "penthouse", "guest room",
        "prayer room", "servant quarter", "store room", "laundry room",
        "home theater", "gym",
    ],
    "material": [
        "glass", "concrete", "wood", "timber", "steel", "brick", "stone",
        "marble", "granite", "aluminum", "aluminium", "clay", "bamboo",
        "exposed concrete", "reclaimed wood",
    ],
    "feature": [
        "open plan", "open floor plan", "natural light", "garden",
        "swimming pool", "rooftop", "skylight", "high ceiling",
        "floor to ceiling windows", "smart home", "energy efficient",
        "solar panel", "rainwater harvesting", "courtyard garden",
        "double height", "cross ventilation", "car parking", "elevator",
        "lift", "cctv", "security system",
    ],
}

# Sentiment/vague-size words: never carry design signal even standalone
# ("nice", "small house please" tells the matcher nothing useful), and
# would otherwise show up as noise in both the embedding-enrichment text
# and the frontend's "we understood: ..." chips.
_GENERIC_ADJECTIVES = {
    "nice", "good", "great", "beautiful", "lovely", "wonderful", "amazing",
    "small", "large", "big", "little", "huge", "great", "much", "many",
}

_nlp: spacy.language.Language | None = None
_matcher: PhraseMatcher | None = None


def _load() -> tuple[spacy.language.Language, PhraseMatcher]:
    global _nlp, _matcher
    if _nlp is not None and _matcher is not None:
        return _nlp, _matcher

    # Parser and NER are not needed for phrase matching or noun chunks
    # at the tagger level; disabling them roughly halves load time and
    # memory on a dyno that is already carrying the S-BERT model.
    # tagger + lemmatizer + attribute_ruler stay on: noun_chunks needs
    # the parser for chunk boundaries, so re-enable it deliberately.
    nlp = spacy.load("en_core_web_sm", disable=["ner"])

    matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
    for bucket, terms in VOCABULARY.items():
        patterns = [nlp.make_doc(term) for term in terms]
        matcher.add(bucket, patterns)

    _nlp, _matcher = nlp, matcher
    return nlp, matcher


def warm_up() -> None:
    """Force the spaCy pipeline to load now rather than on first request.

    Called from main.py's startup lifespan, matching how matcher.get_model()
    is warmed up -- a missing/broken model then surfaces as a clear log
    line during deploy, not as a 500 on a client's first request.
    """
    _load()


@dataclass
class ExtractedIntent:
    style: list[str] = field(default_factory=list)
    room_type: list[str] = field(default_factory=list)
    material: list[str] = field(default_factory=list)
    feature: list[str] = field(default_factory=list)
    # Deduplicated union of every term found above PLUS generic noun
    # chunks / adjectives not covered by the curated vocabulary -- this
    # is what gets fed back into the embedding text.
    keywords: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "style": self.style,
            "room_type": self.room_type,
            "material": self.material,
            "feature": self.feature,
            "keywords": self.keywords,
        }


def extract_intent(text: str) -> ExtractedIntent:
    """Decode a client's free-text brief into structured parameters.

    Returns an empty ExtractedIntent for blank input rather than raising
    -- callers (both the /extract-keywords endpoint and the matcher's
    text-building step) should treat "found nothing" as a normal,
    silent case, not an error.
    """
    text = (text or "").strip()
    if not text:
        return ExtractedIntent()

    nlp, matcher = _load()
    doc = nlp(text)

    buckets: dict[str, list[str]] = {k: [] for k in VOCABULARY}
    seen_by_bucket: dict[str, set[str]] = {k: set() for k in VOCABULARY}

    for match_id, start, end in matcher(doc):
        bucket = nlp.vocab.strings[match_id]
        term = doc[start:end].text.lower()
        if term not in seen_by_bucket[bucket]:
            seen_by_bucket[bucket].add(term)
            buckets[bucket].append(term)

    matched_terms = {t for terms in buckets.values() for t in terms}

    def _overlaps_matched(phrase: str) -> bool:
        # A noun chunk like "a rooftop terrace" or "the basement" is not
        # NEW information once "terrace"/"basement" has already been
        # matched via the curated vocabulary -- it is the same concept
        # with an article and a redundant head noun attached. Checking
        # containment (not just equality) is what actually catches this;
        # without it, briefs mentioning any matched term inside a longer
        # noun phrase produced visibly duplicated "Key terms".
        return any(term in phrase or phrase in term for term in matched_terms)

    # Fallback: noun chunks and standalone descriptive adjectives that
    # the curated vocabulary does not recognise. Filtered to a sensible
    # length so this stays "keywords", not a restatement of the whole
    # sentence back at the client.
    extra: list[str] = []
    seen_extra: set[str] = set()
    for chunk in doc.noun_chunks:
        phrase = chunk.text.lower().strip()
        word_count = len(phrase.split())
        if not (1 <= word_count <= 3):
            continue
        if phrase in seen_extra or _overlaps_matched(phrase):
            continue
        # Skip chunks that are just a bare pronoun/determiner ("it", "a
        # project") -- spaCy's noun_chunks includes these and they carry
        # no design information.
        if chunk.root.pos_ not in ("NOUN", "PROPN"):
            continue
        seen_extra.add(phrase)
        extra.append(phrase)

    for tok in doc:
        if tok.pos_ != "ADJ" or tok.is_stop:
            continue
        lemma = tok.lemma_.lower()
        if lemma in _GENERIC_ADJECTIVES:
            continue
        if lemma in seen_extra:
            continue
        # A standalone adjective that is just one word of an
        # already-matched multi-word phrase ("open" inside "open plan",
        # "natural" inside "natural light") is not new information --
        # only surface it if it is NOT part of anything already found.
        if any(lemma in term.split() for term in matched_terms):
            continue
        seen_extra.add(lemma)
        extra.append(lemma)

    keywords = [t for terms in buckets.values() for t in terms] + extra

    return ExtractedIntent(
        style=buckets["style"],
        room_type=buckets["room_type"],
        material=buckets["material"],
        feature=buckets["feature"],
        keywords=keywords,
    )


def enrich_text_with_keywords(text: str) -> str:
    """Boost a brief's embedding text with its own decoded keywords.

    S-BERT embeds the whole string, so repeating the salient terms
    increases their weight in the resulting vector relative to
    surrounding filler words, without discarding the original text (the
    model still sees full sentence context, which matters for
    similarity quality).

    Used internally by matcher.build_project_text -- this is what makes
    keyword extraction actually affect matching, rather than existing
    only behind the preview endpoint.
    """
    intent = extract_intent(text)
    if not intent.keywords:
        return text
    return text + ". Key terms: " + ", ".join(intent.keywords)
