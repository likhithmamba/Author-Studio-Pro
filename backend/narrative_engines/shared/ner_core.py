"""
imperialx.shared.ner_core
==========================
Rule-based Named Entity Recognition optimised for fiction manuscripts.
No ML models. Uses capitalisation heuristics, pattern matching, and
dialogue attribution parsing.

Used by: Voice Divergence, Gun Tracker, Scene Entropy, Temporal Engine, Cold Open Scorer.

Why rule-based and not spaCy?
- No external model download required
- Works offline and in restricted environments  
- Deterministic — same input always produces same output
- Fast: O(n) with compiled regex
- Tuned for fiction patterns, not news text (where ML NER was trained)
"""

from __future__ import annotations

import re
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple

from .pipeline_core import ManuscriptDocument, Token, Sentence, Paragraph


# ─────────────────────────────────────────────────────────────────────────────
# DATA CONTRACTS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Entity:
    """A named entity occurrence in the manuscript."""
    canonical: str              # resolved canonical name (e.g. "John Harker")
    surface_form: str           # as it appears in text (e.g. "Harker", "John")
    entity_type: str            # PERSON | OBJECT | PLACE | TEMPORAL | CONCEPT
    chapter_id: int
    paragraph_id: int
    sentence_id: int
    char_start: int
    char_end: int
    context: str                # surrounding 80 characters for display


@dataclass
class EntityRegistry:
    """
    All entities detected across the full manuscript.
    Engines query this registry rather than re-running NER.
    """
    persons: Dict[str, List[Entity]] = field(default_factory=dict)
    objects: Dict[str, List[Entity]] = field(default_factory=dict)
    places: Dict[str, List[Entity]] = field(default_factory=dict)
    temporal: Dict[str, List[Entity]] = field(default_factory=dict)

    # Dialogue attribution: character name → list of attributed sentences
    dialogue_by_character: Dict[str, List[Sentence]] = field(default_factory=dict)

    # Character alias map: surface form → canonical name
    alias_map: Dict[str, str] = field(default_factory=dict)

    @property
    def all_character_names(self) -> List[str]:
        return sorted(self.persons.keys())

    def get_character_appearances(self, canonical: str) -> List[Entity]:
        return self.persons.get(canonical, [])

    def get_first_appearance_chapter(self, canonical: str) -> Optional[int]:
        appearances = self.persons.get(canonical, [])
        if not appearances:
            return None
        return min(e.chapter_id for e in appearances)

    def get_entity_by_chapter(self, chapter_id: int) -> List[Entity]:
        all_entities = []
        for entities in list(self.persons.values()) + list(self.objects.values()):
            all_entities.extend(e for e in entities if e.chapter_id == chapter_id)
        return all_entities

    def get_new_entities_in_chapter(self, chapter_id: int) -> List[Entity]:
        """Entities introduced for the first time in this chapter (for Entropy scoring)."""
        seen_before: Set[str] = set()
        new_in_chapter: List[Entity] = []

        for ch_id in range(chapter_id):
            for entities in list(self.persons.values()) + list(self.objects.values()) + list(self.places.values()):
                for e in entities:
                    if e.chapter_id == ch_id:
                        seen_before.add(e.canonical)

        for entities in list(self.persons.values()) + list(self.objects.values()) + list(self.places.values()):
            for e in entities:
                if e.chapter_id == chapter_id and e.canonical not in seen_before:
                    new_in_chapter.append(e)
                    seen_before.add(e.canonical)

        return new_in_chapter


# ─────────────────────────────────────────────────────────────────────────────
# PATTERNS
# ─────────────────────────────────────────────────────────────────────────────

# Titles that precede person names
PERSON_TITLES = re.compile(
    r'\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Sir|Lord|Lady|Captain|Capt|'
    r'Lieutenant|Lt|Colonel|Col|General|Gen|Sergeant|Sgt|'
    r'Father|Mother|Brother|Sister|Reverend|Rev|Prince|Princess|'
    r'King|Queen|Duke|Duchess|Count|Countess|Baron|Baroness)\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
    re.UNICODE
)

# Dialogue attribution: "said John" / "John said" / "asked Mary" patterns
DIALOGUE_ATTR_SAID = re.compile(
    r'[""]\s*[,.]?\s*(?:said|asked|replied|answered|whispered|shouted|'
    r'muttered|cried|called|stated|declared|announced|continued|'
    r'began|added|insisted|demanded|pleaded|snapped|hissed|'
    r'laughed|sighed|groaned|murmured|breathed)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
    re.UNICODE
)
DIALOGUE_ATTR_SAID_REV = re.compile(
    r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|asked|replied|answered|'
    r'whispered|shouted|muttered|cried|called|continued|added|'
    r'insisted|demanded|pleaded|snapped|hissed|laughed|sighed|murmured)',
    re.UNICODE
)

# Standalone capitalised proper nouns (potential names)
PROPER_NOUN = re.compile(r'\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\b')

# Common English words that appear capitalised at sentence start (not names)
NOT_NAMES: Set[str] = {
    'The', 'A', 'An', 'But', 'And', 'Or', 'Nor', 'So', 'Yet', 'For',
    'He', 'She', 'It', 'They', 'We', 'You', 'I', 'His', 'Her', 'Its',
    'Their', 'Our', 'My', 'Your', 'This', 'That', 'These', 'Those',
    'When', 'Where', 'Why', 'How', 'What', 'Who', 'Which',
    'If', 'Although', 'Though', 'Because', 'Since', 'While', 'As',
    'Then', 'Now', 'Later', 'After', 'Before', 'Until', 'Once',
    'There', 'Here', 'Outside', 'Inside', 'Above', 'Below',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    'English', 'French', 'German', 'Spanish', 'Italian', 'Russian',
    'God', 'Lord', 'Heaven', 'Hell', 'Earth',
}

# Object markers: definite articles before specific nouns that carry narrative weight
OBJECT_PATTERNS = re.compile(
    r'\b(?:the|a|an)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:that|which|who|he|she|it)\b|'
    r'\bthe\s+(letter|pistol|photograph|ring|knife|key|book|map|journal|diary|'
    r'document|package|envelope|box|chest|sword|gun|watch|locket|portrait|'
    r'medal|necklace|bracelet|hat|coat|glove|mask|token|relic|artifact|'
    r'stone|gem|crown|throne|scroll|seal|contract|deed|will|testament)\b',
    re.IGNORECASE
)

# Place markers
PLACE_MARKERS = re.compile(
    r'\b(?:in|at|to|from|near|outside|inside|through|across|into|'
    r'toward|towards|past|beyond)\s+(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b'
)


# ─────────────────────────────────────────────────────────────────────────────
# NAME DEDUPLICATION
# ─────────────────────────────────────────────────────────────────────────────

def build_alias_map(surface_forms: List[str]) -> Dict[str, str]:
    """
    Resolve aliases to canonical names using longest-match heuristic.
    "Harker", "Jonathan", "Jonathan Harker" → all resolve to "Jonathan Harker".
    
    Algorithm:
    1. Find all full names (First Last pattern)
    2. For each single name, check if it is a component of any full name
    3. If yes, map it to the full name
    4. Resolve chains: if A→B and B→C then A→C
    """
    names = list(set(surface_forms))
    full_names = [n for n in names if ' ' in n]

    alias_map: Dict[str, str] = {}

    for name in names:
        if ' ' in name:
            alias_map[name] = name  # full names are canonical
            continue

        # Check if this single name is a component of a full name
        matches = [fn for fn in full_names if name in fn.split()]
        if matches:
            # Prefer the shortest full name that contains this component
            alias_map[name] = min(matches, key=len)
        else:
            alias_map[name] = name

    return alias_map


def filter_false_positives(
    names: List[str],
    min_frequency: int = 2,
    frequency_map: Optional[Dict[str, int]] = None,
) -> List[str]:
    """
    Remove false positive person detections.
    A proper noun appearing only once is probably a common word capitalised at sentence start.
    """
    if frequency_map is None:
        return names

    return [
        n for n in names
        if frequency_map.get(n, 0) >= min_frequency and n not in NOT_NAMES
    ]


# ─────────────────────────────────────────────────────────────────────────────
# DIALOGUE EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_dialogue_attributions(
    paragraphs: List[Paragraph],
) -> Dict[str, List[Sentence]]:
    """
    Extract all dialogue sentences and attribute them to characters.
    Uses multiple attribution patterns:
    1. Postfix: "text," said John.
    2. Prefix: John said, "text"
    3. Block: paragraph starts with quote followed by attribution
    
    Returns dict: character_canonical → [attributed sentences]
    """
    attributions: Dict[str, List[Sentence]] = defaultdict(list)

    for para in paragraphs:
        if not para.is_dialogue:
            continue

        full_text = para.text

        # Pattern 1: postfix attribution — "..." said Name
        for match in DIALOGUE_ATTR_SAID.finditer(full_text):
            name = match.group(1).strip()
            if name and name not in NOT_NAMES:
                for sent in para.sentences:
                    if sent.is_dialogue:
                        attributions[name].append(sent)
                break  # one attribution per dialogue paragraph

        # Pattern 2: prefix attribution — Name said "..."
        for match in DIALOGUE_ATTR_SAID_REV.finditer(full_text):
            name = match.group(1).strip()
            if name and name not in NOT_NAMES:
                for sent in para.sentences:
                    if sent.is_dialogue:
                        attributions[name].append(sent)
                break

    return dict(attributions)


# ─────────────────────────────────────────────────────────────────────────────
# ENTITY EXTRACTION
# ─────────────────────────────────────────────────────────────────────────────

def extract_persons(doc: ManuscriptDocument) -> Dict[str, List[Entity]]:
    """
    Extract all person entities from the manuscript.
    Three passes:
    1. Title-prefixed names (highest confidence)
    2. Dialogue attribution names (high confidence)  
    3. Recurring capitalised proper nouns (lower confidence, frequency-filtered)
    """
    person_surface_forms: List[str] = []
    raw_detections: List[Tuple[str, int, int, int, int, int, str]] = []
    # Tuple: (surface_form, chapter_id, para_id, sent_id, char_start, char_end, context)

    for sent in doc.sentences:
        text = sent.text
        # Pass 1: titled names — highest confidence
        for match in PERSON_TITLES.finditer(text):
            name = match.group(1)
            person_surface_forms.append(name)
            raw_detections.append((
                name, sent.chapter_id, sent.paragraph_id, sent.id,
                sent.char_start + match.start(1),
                sent.char_start + match.end(1),
                text[max(0, match.start()-30):match.end()+30]
            ))

        # Pass 2: dialogue attributions handled separately
        # Pass 3: all capitalised proper nouns (mid-sentence = not sentence-start capitalisation)
        words_in_sent = text.split()
        for i, word in enumerate(words_in_sent):
            if i == 0:  # skip first word — could be capitalised due to sentence start
                continue
            clean = re.sub(r'[^\w]', '', word)
            if (clean and clean[0].isupper() and len(clean) > 2
                    and clean not in NOT_NAMES
                    and re.match(r'^[A-Z][a-z]+$', clean)):
                # Check for two-word name
                if i + 1 < len(words_in_sent):
                    next_clean = re.sub(r'[^\w]', '', words_in_sent[i + 1])
                    if next_clean and next_clean[0].isupper() and len(next_clean) > 2 and next_clean not in NOT_NAMES:
                        full_name = f"{clean} {next_clean}"
                        person_surface_forms.append(full_name)
                        # find position
                        pos = text.find(word)
                        raw_detections.append((
                            full_name, sent.chapter_id, sent.paragraph_id, sent.id,
                            sent.char_start + (pos if pos != -1 else 0),
                            sent.char_start + (pos if pos != -1 else 0) + len(full_name),
                            text[max(0, (pos if pos != -1 else 0)-20):(pos if pos != -1 else 0)+len(full_name)+20]
                        ))
                        continue

                person_surface_forms.append(clean)
                pos = text.find(word)
                raw_detections.append((
                    clean, sent.chapter_id, sent.paragraph_id, sent.id,
                    sent.char_start + (pos if pos != -1 else 0),
                    sent.char_start + (pos if pos != -1 else 0) + len(clean),
                    text[max(0, (pos if pos != -1 else 0)-20):(pos if pos != -1 else 0)+len(clean)+20]
                ))

    # Build frequency map for false positive filtering
    freq_map: Dict[str, int] = defaultdict(int)
    for sf in person_surface_forms:
        freq_map[sf] += 1

    # Build alias map
    alias_map = build_alias_map(person_surface_forms)

    # Group entities by canonical name
    persons: Dict[str, List[Entity]] = defaultdict(list)
    seen_pairs: Set[Tuple] = set()  # avoid duplicate detections

    for (sf, ch_id, para_id, sent_id, cs, ce, ctx) in raw_detections:
        canonical = alias_map.get(sf, sf)
        # Filter out single-occurrence non-titled names
        if freq_map.get(sf, 0) < 2 and sf not in [m.group(1) for m in PERSON_TITLES.finditer(doc.normalised_text)]:
            continue
        if canonical in NOT_NAMES:
            continue

        dedup_key = (canonical, sent_id, cs)
        if dedup_key in seen_pairs:
            continue
        seen_pairs.add(dedup_key)

        entity = Entity(
            canonical=canonical,
            surface_form=sf,
            entity_type='PERSON',
            chapter_id=ch_id,
            paragraph_id=para_id,
            sentence_id=sent_id,
            char_start=cs,
            char_end=ce,
            context=ctx,
        )
        persons[canonical].append(entity)

    return dict(persons)


def extract_objects(doc: ManuscriptDocument) -> Dict[str, List[Entity]]:
    """
    Extract named objects with narrative weight.
    Looks for definite article + specific noun patterns that suggest importance.
    """
    objects: Dict[str, List[Entity]] = defaultdict(list)

    for sent in doc.sentences:
        for match in OBJECT_PATTERNS.finditer(sent.text):
            obj_name = (match.group(1) or match.group(2) or '').strip().lower()
            if not obj_name or len(obj_name) < 3:
                continue

            entity = Entity(
                canonical=obj_name,
                surface_form=match.group(0),
                entity_type='OBJECT',
                chapter_id=sent.chapter_id,
                paragraph_id=sent.paragraph_id,
                sentence_id=sent.id,
                char_start=sent.char_start + match.start(),
                char_end=sent.char_start + match.end(),
                context=sent.text[max(0, match.start()-20):match.end()+20],
            )
            objects[obj_name].append(entity)

    return dict(objects)


def extract_places(doc: ManuscriptDocument) -> Dict[str, List[Entity]]:
    """Extract place entity mentions using preposition + proper noun patterns."""
    places: Dict[str, List[Entity]] = defaultdict(list)
    freq_map: Dict[str, int] = defaultdict(int)

    for sent in doc.sentences:
        for match in PLACE_MARKERS.finditer(sent.text):
            name = match.group(1).strip()
            if name and name not in NOT_NAMES and len(name) > 2:
                freq_map[name] += 1

    for sent in doc.sentences:
        for match in PLACE_MARKERS.finditer(sent.text):
            name = match.group(1).strip()
            if not name or name in NOT_NAMES or freq_map.get(name, 0) < 2:
                continue
            entity = Entity(
                canonical=name,
                surface_form=match.group(0),
                entity_type='PLACE',
                chapter_id=sent.chapter_id,
                paragraph_id=sent.paragraph_id,
                sentence_id=sent.id,
                char_start=sent.char_start + match.start(),
                char_end=sent.char_start + match.end(),
                context=sent.text[max(0, match.start()-20):match.end()+20],
            )
            places[name].append(entity)

    return dict(places)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

def extract_entities(doc: ManuscriptDocument) -> EntityRegistry:
    """
    Full NER pass over a ManuscriptDocument.
    Returns an EntityRegistry consumed by all downstream engines.
    
    Complexity: O(n) — three passes over the sentence list.
    Performance target: < 500ms for 100k word manuscript.
    """
    persons = extract_persons(doc)
    objects = extract_objects(doc)
    places = extract_places(doc)

    # Dialogue attribution (uses paragraph-level analysis)
    dialogue_by_char = extract_dialogue_attributions(doc.paragraphs)

    # Build alias map from persons for external use
    all_surface_forms = [e.surface_form for entities in persons.values() for e in entities]
    alias_map = build_alias_map(all_surface_forms)

    registry = EntityRegistry(
        persons=persons,
        objects=objects,
        places=places,
        temporal={},  # populated by temporal_parser
        dialogue_by_character=dialogue_by_char,
        alias_map=alias_map,
    )

    return registry
