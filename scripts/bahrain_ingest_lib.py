"""Pure mapping helpers for Bahrain workbook ingestion. No file IO here, so unit testable."""
import re

INSTRUMENT_CLASS_MAP = {
    "law": "law", "decree": "decree", "decision": "decision", "resolution": "resolution",
    "circular": "circular", "regulation": "regulation", "policy": "policy",
    "guideline": "guideline", "framework": "framework", "standard": "standard",
    "handbook": "handbook", "code of practice": "code_of_practice",
    "rulebook module": "rulebook_module", "consultation paper": "consultation_paper",
    "white paper": "white_paper", "national strategy": "national_strategy",
}

LIFECYCLE_MAP = {
    "in force": "in_force", "amended": "amended", "superseded": "superseded",
    "in consultation": "consultation", "enacted": "enacted", "repealed": "repealed",
}

# Maps a normalised workbook authority string to an authorities.json id.
# Entries the script must ensure exist live in AUTHORITY_ENTRIES in ingest-bahrain.py.
AUTHORITY_ALIASES = {
    "telecommunications regulatory authority": "bh-tra",
    "telecommunications regulatory authority board": "bh-tra",
    "telecommunications regulatory authority and bahrain domain registry": "bh-tra",
    "central bank of bahrain": "bh-cbb",
    "king of bahrain": "bh-king",
    "national cyber security center": "bh-ncsc",
    "ministry of justice, islamic affairs and waqf": "bh-moj",
    "information and egovernment authority": "bh-iga",
    "national health regulatory authority": "bh-nhra",
    "ministry of industry and commerce": "bh-moic",
    "prime minister": "bh-pm",
    "national bureau for revenue": "bh-nbr",
    "shura council": "bh-shura",
    "civil aviation affairs, ministry of transportation and telecommunications": "bh-caa",
    "supreme council for information and communication technology and information": "bh-scict",
    "supreme council for information and communication technology": "bh-scict",
    "gcc ministerial committee for egovernment": "bh-iga",
    "world economic forum centre for the fourth industrial revolution, bahrain economic development board": "bh-edb",
    "world economic forum centre for the fourth industrial revolution with bahrain economic development board": "bh-edb",
    "bahrain economic development board": "bh-edb",
    "unesco and information and egovernment authority": "bh-iga",
    "government of bahrain": "bh-gov",
    "minister of transportation and telecommunications": "bh-mtt",
    "minister responsible for telecommunications": "bh-mtt",
    "ministry of finance and national economy": "bh-mofne",
    "ministry of health": "bh-moh",
    "unverified": "bh-gov",
}

_ws = re.compile(r"\s+")


def _norm(text):
    return _ws.sub(" ", str(text or "").strip().lower())


def map_instrument_class(raw):
    base = str(raw or "").strip().rstrip("?").strip().lower()
    return INSTRUMENT_CLASS_MAP.get(base)


def is_uncertain_type(raw):
    return str(raw or "").strip().endswith("?")


def map_lifecycle(raw):
    return LIFECYCLE_MAP.get(_norm(raw))


def map_confidence(raw):
    v = _norm(raw)
    if v.startswith("official index"):
        return "pending_verification"
    if v.startswith("secondary"):
        return "secondary"
    if "official" in v:
        return "official"
    return "pending_verification"


def slugify(name):
    s = re.sub(r"[^a-z0-9]+", "-", str(name or "").lower()).strip("-")
    return s[:60].rstrip("-")


def to_year(raw):
    try:
        return int(str(raw).strip()[:4])
    except (ValueError, TypeError):
        return None


def binding_status(instrument_class, binding_by_class):
    return "binding" if binding_by_class.get(instrument_class) else "non_binding"


def resolve_authority(raw):
    """Return (authority_id, normalised_string). authority_id is None when unknown."""
    norm = _norm(raw)
    return AUTHORITY_ALIASES.get(norm), norm


def resolve_leaf(category, subcategory, leaf_lookup):
    """Map a (Category, Subcategory) pair to a leaf id, or None."""
    return leaf_lookup.get((_norm(category), _norm(subcategory)))


def build_record(rows, *, doc_id, leaf_lookup, branch_label, binding_by_class):
    """Assemble one document record from all workbook rows of a regulation."""
    primary = next((r for r in rows if r.get("is_primary") == 1), rows[0])

    instrument_class = map_instrument_class(primary.get("Type"))
    lifecycle = map_lifecycle(primary.get("Status"))
    confidence = map_confidence(primary.get("Verified"))
    year = to_year(primary.get("Year"))
    authority_id, _ = resolve_authority(primary.get("Issuing authority"))

    themes = []
    theme_notes = {}
    branch_labels = []
    for r in rows:
        leaf = resolve_leaf(r.get("Category"), r.get("Subcategory"), leaf_lookup)
        if leaf is None:
            continue
        if leaf not in themes:
            themes.append(leaf)
        blurb = str(r.get("One line description") or "").strip()
        if blurb and leaf not in theme_notes:
            theme_notes[leaf] = blurb
        branch_id = leaf.split(".", 1)[0]
        label = branch_label.get(branch_id)
        if label and label not in branch_labels:
            branch_labels.append(label)

    notes_parts = []
    if is_uncertain_type(primary.get("Type")):
        notes_parts.append(f"Instrument type recorded as uncertain in the source ({primary.get('Type')}).")
    related = str(primary.get("Related instruments") or "").strip()
    if related and related.upper() != "UNVERIFIED":
        notes_parts.append(f"Related instruments: {related}")
    if confidence == "pending_verification":
        notes_parts.append("Sourced from an official index listing; confirm against the instrument text.")
    if _norm(primary.get("Issuing authority")) == "unverified":
        notes_parts.append("Issuing authority unverified in the source; assigned to the Government of Bahrain pending confirmation.")

    record = {
        "id": doc_id,
        "title": str(primary.get("Instrument name (EN)") or "").strip(),
        "jurisdiction": "BH",
        "instrument_class": instrument_class,
        "binding_status": binding_status(instrument_class, binding_by_class),
        "lifecycle": lifecycle,
        "themes": themes,
        "issuing_authority": authority_id,
        "date_issued": None,
        "summary": str(primary.get("Summary") or "").strip(),
        "source_url": str(primary.get("Source URL") or "").strip(),
        "source_confidence": confidence,
        "tags": branch_labels,
        "year": year,
    }
    if theme_notes:
        record["theme_notes"] = theme_notes
    if notes_parts:
        record["notes"] = " ".join(notes_parts)
    return record
