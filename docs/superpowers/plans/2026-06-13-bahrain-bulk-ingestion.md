# Bahrain bulk ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load the 322 consolidated Bahrain regulations from the research workbook into `data/documents/` as browsable, filterable overview records, with per filter contextual bullets, without breaking the existing 13 curated records.

**Architecture:** Relax the document schema so lean catalogue records validate on the fields the workbook honestly provides, add two optional fields (`theme_notes`, `year`). A Python ingest script groups workbook rows by `regulation_id` into one record per regulation and writes JSON. The data loader normalises every record to safe defaults so components never read an absent field. The dashboard renders a regulation's per leaf blurbs as bullets when a category filter is active.

**Tech Stack:** Python 3 with openpyxl for ingestion (matching the existing `scripts/add-regulation-ids.py`); Astro 6 plus React 19 islands and the Node Ajv validator for the site.

**Source workbook:** `~/OneDrive/Desktop/Bahrain_Regulatory_Database_deep_crawl_v2_with_ids.xlsx`, sheet `Bahrain (2)`, columns include `regulation_id` and `is_primary` (added by `add-regulation-ids.py`). 446 rows, 322 regulations.

**Spec:** `docs/superpowers/specs/2026-06-13-bahrain-bulk-ingestion-design.md`

---

## File structure

- `schema/document.schema.json` (modify): trim `required`, make `date_issued` nullable, lower `summary` floor, add `theme_notes` and `year` properties.
- `src/lib/types.ts` (modify): mark deferred fields optional on the loader input, add `theme_notes` and `year` to `DocRecord`.
- `src/lib/data.ts` (modify): normalise records to safe defaults, derive `year`, year aware sort key, robust stats range.
- `src/components/RecordCard.tsx` (modify): accept `activeThemes`, render bullets from `theme_notes`, guard expanded sections that read deferred fields.
- `src/components/Dashboard.tsx` (modify): compute the active leaf set per card and pass it to `RecordCard`; year aware sort.
- `src/styles/global.css` (modify): styles for `.record-bullets`.
- `scripts/bahrain_ingest_lib.py` (create): pure mapping helpers (instrument class, lifecycle, confidence, slug, year, theme resolution, authority resolution, record assembly).
- `scripts/test_bahrain_ingest.py` (create): assert based unit tests for the pure helpers.
- `scripts/ingest-bahrain.py` (create): reads the workbook, drives the lib, upserts authorities, writes records, prints a report.
- `data/authorities.json` (modify, by the script): adds the missing Bahrain authorities.
- `data/documents/bh-*.json` (create, by the script): the 321 new records (PDPL skipped).

---

## Task 1: Relax the document schema

**Files:**
- Modify: `schema/document.schema.json`

- [ ] **Step 1: Trim the required array**

Replace the entire `"required": [ ... ]` block (lines 7 to 36) with this shorter list:

```json
  "required": [
    "id",
    "title",
    "jurisdiction",
    "instrument_class",
    "binding_status",
    "lifecycle",
    "themes",
    "issuing_authority",
    "summary",
    "source_url",
    "source_confidence",
    "tags"
  ],
```

- [ ] **Step 2: Make date_issued nullable and lower the summary floor**

In `"properties"`, change these two lines:

```json
    "date_issued": { "type": ["string", "null"], "format": "date" },
```

```json
    "summary": { "type": "string", "minLength": 40 },
```

- [ ] **Step 3: Add the theme_notes and year properties**

In `"properties"`, immediately before the closing `"notes"` property, add:

```json
    "theme_notes": {
      "type": "object",
      "additionalProperties": { "type": "string" },
      "description": "Per leaf contextual blurbs keyed by leaf theme id; rendered as bullets when a category filter is active"
    },
    "year": {
      "type": "integer",
      "minimum": 1900,
      "maximum": 2100,
      "description": "Calendar year of the instrument; used when date_issued is unknown"
    },
```

- [ ] **Step 4: Validate that the existing records still pass**

Run: `npm run validate`
Expected: `13 documents checked, 0 errors` (warning count unchanged). Ajv is `strict: true`, so a schema typo would fail here.

- [ ] **Step 5: Commit**

```bash
git add schema/document.schema.json
git commit -m "feat: relax document schema for lean catalogue records"
```

---

## Task 2: Make the loader and types tolerant of lean records

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/data.ts`

- [ ] **Step 1: Mark deferred fields optional and add the new fields in types.ts**

Replace the `DocRecord` interface (lines 31 to 64) with this version. The twelve always present fields stay required; everything the lean records omit becomes optional, and after normalisation in `data.ts` they are always concrete, so components keep their current field reads.

```ts
export interface DocRecord {
  id: string;
  title: string;
  title_ar: string | null;
  official_title: string;
  official_title_ar: string | null;
  jurisdiction: Jurisdiction;
  instrument_class: string;
  binding_status: 'binding' | 'non_binding' | 'conditionally_binding';
  lifecycle: 'consultation' | 'enacted' | 'in_force' | 'amended' | 'repealed' | 'superseded';
  themes: string[];
  theme_notes?: Record<string, string>;
  issuing_authority: string;
  language_of_official_text: 'ar' | 'en' | 'both';
  english_text_unofficial?: boolean;
  date_issued: string;
  date_effective: string | null;
  compliance_deadline: string | null;
  gazette: { name: string; number?: string | null; issue_date?: string | null } | null;
  citation: string | null;
  summary: string;
  summary_ar: string | null;
  impact_note: string;
  impact_note_ar: string | null;
  obligations: Obligation[];
  applicability: Applicability | null;
  relationships: Relationship[];
  source_url: string;
  source_confidence: 'official' | 'secondary' | 'pending_verification';
  last_verified: string;
  tags: string[];
  notes?: string | null;
  /** Derived at build time from date_issued, falling back to the workbook year. */
  year: number;
}

/** Shape of a record as stored on disk: the twelve core fields, everything else optional. */
export type RawDoc = Partial<DocRecord> &
  Pick<
    DocRecord,
    | 'id'
    | 'title'
    | 'jurisdiction'
    | 'instrument_class'
    | 'binding_status'
    | 'lifecycle'
    | 'themes'
    | 'issuing_authority'
    | 'summary'
    | 'source_url'
    | 'source_confidence'
    | 'tags'
  >;
```

- [ ] **Step 2: Rewrite data.ts to normalise records**

Replace the top of `src/lib/data.ts` (lines 1 to 15) with this. It loads each JSON file as a `RawDoc`, fills safe defaults, derives `year`, and sorts newest first using a year aware key so dateless records still sort sensibly.

```ts
import taxonomyJson from '../../data/taxonomy.json';
import authoritiesJson from '../../data/authorities.json';
import type { Authority, Dataset, DocRecord, RawDoc, Stats } from './types';

const documentModules = import.meta.glob<{ default: RawDoc }>(
  '../../data/documents/*.json',
  { eager: true }
);

function deriveYear(doc: RawDoc): number {
  if (doc.date_issued && /^\d{4}/.test(doc.date_issued)) return Number(doc.date_issued.slice(0, 4));
  if (typeof doc.year === 'number') return doc.year;
  return 0;
}

function normalise(raw: RawDoc): DocRecord {
  return {
    title_ar: null,
    official_title: '',
    official_title_ar: null,
    language_of_official_text: 'ar',
    english_text_unofficial: false,
    date_effective: null,
    compliance_deadline: null,
    gazette: null,
    citation: null,
    summary_ar: null,
    impact_note: '',
    impact_note_ar: null,
    obligations: [],
    applicability: null,
    relationships: [],
    last_verified: '',
    notes: null,
    ...raw,
    date_issued: raw.date_issued ?? '',
    year: deriveYear(raw),
  } as DocRecord;
}

function sortKey(d: DocRecord): string {
  if (d.date_issued && d.date_issued.length >= 4) return d.date_issued;
  return d.year ? `${d.year}-00-00` : '0000-00-00';
}

const documents: DocRecord[] = Object.values(documentModules)
  .map((mod) => normalise(mod.default))
  .sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
```

- [ ] **Step 3: Make the stats date range robust to dateless records**

In `src/lib/data.ts`, replace the `dateRange` expression inside `stats` (the `documents.length === 0 ? null : { from: ..., to: ... }` block) with this, which ignores records that have no `date_issued`:

```ts
  dateRange: (() => {
    const dated = documents.map((d) => d.date_issued).filter((d) => d.length >= 4).sort();
    return dated.length === 0 ? null : { from: dated[0], to: dated[dated.length - 1] };
  })(),
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run build`
Expected: Astro build succeeds with no TypeScript errors. (The 13 existing records still render; nothing references a removed field.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data.ts
git commit -m "feat: normalise lean records and add theme_notes and year to the type"
```

---

## Task 3: Pure ingest helpers with unit tests

**Files:**
- Create: `scripts/bahrain_ingest_lib.py`
- Test: `scripts/test_bahrain_ingest.py`

- [ ] **Step 1: Write the failing tests**

Create `scripts/test_bahrain_ingest.py`:

```python
"""Unit tests for the pure Bahrain ingest helpers. Run: python scripts/test_bahrain_ingest.py"""
from bahrain_ingest_lib import (
    map_instrument_class, is_uncertain_type, map_lifecycle, map_confidence,
    slugify, to_year, binding_status, resolve_authority, build_record,
)

def test_instrument_class():
    assert map_instrument_class("rulebook module") == "rulebook_module"
    assert map_instrument_class("law?") == "law"
    assert map_instrument_class("white paper") == "white_paper"
    assert map_instrument_class("national strategy") == "national_strategy"
    assert map_instrument_class("nonsense") is None

def test_uncertain_type():
    assert is_uncertain_type("law?") is True
    assert is_uncertain_type("law") is False

def test_lifecycle():
    assert map_lifecycle("in force") == "in_force"
    assert map_lifecycle("in consultation") == "consultation"
    assert map_lifecycle("amended") == "amended"
    assert map_lifecycle("superseded") == "superseded"

def test_confidence():
    assert map_confidence("official") == "official"
    assert map_confidence("official reference") == "official"
    assert map_confidence("official for instrument, secondary for VASP detail") == "official"
    assert map_confidence("secondary") == "secondary"
    assert map_confidence("official index") == "pending_verification"

def test_slugify():
    assert slugify("Law No. 30 of 2018 with Respect to Personal Data Protection Law").startswith("law-no-30-of-2018")
    assert "--" not in slugify("A  &  B")
    assert not slugify("Test!").endswith("-")

def test_to_year():
    assert to_year(2018) == 2018
    assert to_year("2024") == 2024
    assert to_year("UNVERIFIED") is None

def test_binding_status():
    binding_by_class = {"law": True, "guideline": False}
    assert binding_status("law", binding_by_class) == "binding"
    assert binding_status("guideline", binding_by_class) == "non_binding"

def test_resolve_authority():
    assert resolve_authority("Telecommunications Regulatory Authority")[0] == "bh-tra"
    assert resolve_authority("Central Bank of Bahrain")[0] == "bh-cbb"
    assert resolve_authority("UNVERIFIED")[0] == "bh-gov"
    aid, _ = resolve_authority("Totally Unknown Body")
    assert aid is None

def test_build_record():
    rows = [
        {"Category": "Data & privacy", "Subcategory": "Personal data protection",
         "Instrument name (EN)": "Test Law of 2020", "Type": "law", "Year": 2020,
         "Date issued": "UNVERIFIED", "Issuing authority": "Central Bank of Bahrain",
         "One line description": "Short context blurb for personal data protection here.",
         "Summary": "A sufficiently long summary describing the test law in plain language for the card.",
         "Status": "in force", "Source URL": "https://example.gov.bh/x", "Verified": "official",
         "is_primary": 1},
        {"Category": "Data & privacy", "Subcategory": "Cross-border data flows",
         "Instrument name (EN)": "Test Law of 2020", "Type": "law", "Year": 2020,
         "Date issued": "UNVERIFIED", "Issuing authority": "Central Bank of Bahrain",
         "One line description": "Different blurb for the cross border angle of this law.",
         "Summary": "A sufficiently long summary describing the test law in plain language for the card.",
         "Status": "in force", "Source URL": "https://example.gov.bh/x", "Verified": "official",
         "is_primary": 0},
    ]
    leaf_lookup = {
        ("data & privacy", "personal data protection"): "data_privacy.personal_data_protection",
        ("data & privacy", "cross-border data flows"): "data_privacy.crossborder_data_flows",
    }
    branch_label = {"data_privacy": "Data & privacy"}
    binding_by_class = {"law": True}
    rec = build_record(rows, doc_id="bh-test-law-of-2020",
                       leaf_lookup=leaf_lookup, branch_label=branch_label,
                       binding_by_class=binding_by_class)
    assert rec["id"] == "bh-test-law-of-2020"
    assert rec["jurisdiction"] == "BH"
    assert rec["instrument_class"] == "law"
    assert rec["binding_status"] == "binding"
    assert rec["lifecycle"] == "in_force"
    assert rec["source_confidence"] == "official"
    assert rec["date_issued"] is None
    assert rec["year"] == 2020
    assert set(rec["themes"]) == {
        "data_privacy.personal_data_protection", "data_privacy.crossborder_data_flows"}
    assert rec["theme_notes"]["data_privacy.crossborder_data_flows"].startswith("Different blurb")
    assert rec["tags"] == ["Data & privacy"]
    assert rec["issuing_authority"] == "bh-cbb"
    assert len(rec["summary"]) >= 40

if __name__ == "__main__":
    import sys
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"ok   {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{failures} failures")
    sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python scripts/test_bahrain_ingest.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'bahrain_ingest_lib'`.

- [ ] **Step 3: Write the helper library**

Create `scripts/bahrain_ingest_lib.py`:

```python
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python scripts/test_bahrain_ingest.py`
Expected: `0 failures` with every `test_*` line printing `ok`.

- [ ] **Step 5: Commit**

```bash
git add scripts/bahrain_ingest_lib.py scripts/test_bahrain_ingest.py
git commit -m "feat: pure mapping helpers for Bahrain ingestion with tests"
```

---

## Task 4: The ingest driver

**Files:**
- Create: `scripts/ingest-bahrain.py`

- [ ] **Step 1: Write the driver**

Create `scripts/ingest-bahrain.py`:

```python
#!/usr/bin/env python3
"""Ingest the consolidated Bahrain workbook into data/documents JSON records.

Reads sheet "Bahrain (2)" (already stamped with regulation_id / is_primary by
add-regulation-ids.py), groups rows by regulation, writes one record per
regulation, and upserts any missing Bahrain authorities. Skips a regulation
when its generated id already exists as a curated file.

Usage: python scripts/ingest-bahrain.py [WORKBOOK.xlsx]
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from collections import OrderedDict, Counter
from pathlib import Path

import openpyxl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bahrain_ingest_lib import slugify, resolve_authority, resolve_leaf, build_record, _norm

REPO = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO / "data" / "documents"
AUTH_PATH = REPO / "data" / "authorities.json"
TAX_PATH = REPO / "data" / "taxonomy.json"
SHEET = "Bahrain (2)"
HEADER_ROW = 1  # zero based index into iter_rows
DEFAULT_WB = Path.home() / "OneDrive" / "Desktop" / "Bahrain_Regulatory_Database_deep_crawl_v2_with_ids.xlsx"

# Workbook regulation_id -> existing curated record id. These are already in the
# repo as hand built rich records, so the workbook duplicate is skipped. The PDPL
# slugifies to a different id than the curated bh-pdpl-2018, so it must be matched
# by regulation_id here, not by generated id collision.
CURATED_OVERLAP = {"BH-R001": "bh-pdpl-2018"}

# Authorities the script ensures exist in authorities.json. Ids match AUTHORITY_ALIASES.
AUTHORITY_ENTRIES = {
    "bh-tra": {"name": "Telecommunications Regulatory Authority", "type": "regulator",
               "mandate": "Regulates the telecommunications sector, spectrum, and related digital infrastructure in Bahrain.",
               "website": "https://www.tra.org.bh"},
    "bh-ncsc": {"name": "National Cyber Security Center", "type": "regulator",
                "mandate": "Leads national cybersecurity strategy, controls, and incident response.",
                "website": "https://www.ncsc.gov.bh"},
    "bh-moj": {"name": "Ministry of Justice, Islamic Affairs and Waqf", "type": "ministry",
               "mandate": "Administers justice and, for the data protection law, the supervisory authority function.",
               "website": "https://www.moj.gov.bh"},
    "bh-iga": {"name": "Information and eGovernment Authority", "type": "government_agency",
               "mandate": "Runs national e-government services, digital identity, open data, and information policy.",
               "website": "https://www.iga.gov.bh"},
    "bh-nhra": {"name": "National Health Regulatory Authority", "type": "regulator",
                "mandate": "Regulates healthcare providers and services, including digital and tele-health.",
                "website": "https://www.nhra.bh"},
    "bh-moic": {"name": "Ministry of Industry and Commerce", "type": "ministry",
                "mandate": "Oversees commerce, e-commerce, and consumer protection.",
                "website": "https://www.moic.gov.bh"},
    "bh-pm": {"name": "Prime Minister", "type": "head_of_government",
              "mandate": "Issues edicts and decisions of the Council of Ministers.",
              "website": None},
    "bh-nbr": {"name": "National Bureau for Revenue", "type": "government_agency",
               "mandate": "Administers VAT and excise, including e-invoicing and digital tax administration.",
               "website": "https://www.nbr.gov.bh"},
    "bh-shura": {"name": "Shura Council", "type": "legislature",
                 "mandate": "Upper chamber of the National Assembly; participates in enacting legislation.",
                 "website": "https://www.shura.bh"},
    "bh-caa": {"name": "Civil Aviation Affairs", "type": "regulator",
               "mandate": "Regulates civil aviation, including drones and unmanned systems.",
               "website": "https://www.caa.gov.bh"},
    "bh-scict": {"name": "Supreme Council for Information and Communication Technology", "type": "council",
                 "mandate": "Sets national information and communication technology policy direction.",
                 "website": None},
    "bh-edb": {"name": "Bahrain Economic Development Board", "type": "government_agency",
               "mandate": "Promotes investment and economic development, including digital and emerging technology initiatives.",
               "website": "https://www.bahrainedb.com"},
    "bh-gov": {"name": "Government of Bahrain", "type": "government",
               "mandate": "General government of the Kingdom of Bahrain; used where the specific issuing body is unconfirmed.",
               "website": "https://www.bahrain.bh"},
    "bh-mtt": {"name": "Ministry of Transportation and Telecommunications", "type": "ministry",
               "mandate": "Oversees transportation and telecommunications policy and ministerial decisions.",
               "website": "https://www.mtt.gov.bh"},
    "bh-mofne": {"name": "Ministry of Finance and National Economy", "type": "ministry",
                 "mandate": "Oversees public finance and national economic policy.",
                 "website": "https://www.mof.gov.bh"},
    "bh-moh": {"name": "Ministry of Health", "type": "ministry",
               "mandate": "Oversees public health policy and health services.",
               "website": "https://www.moh.gov.bh"},
}


def load_workbook_rows(path):
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / path.name
        shutil.copy2(path, tmp)
        wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
        ws = wb[SHEET]
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
    header = [(h or "").strip() if isinstance(h, str) else h for h in rows[HEADER_ROW]]
    out = []
    for r in rows[HEADER_ROW + 1:]:
        if all(c is None for c in r):
            continue
        out.append(dict(zip(header, r)))
    return out


def build_taxonomy_lookups():
    tax = json.loads(TAX_PATH.read_text(encoding="utf-8"))
    leaf_lookup = {}
    branch_label = {}
    for branch in tax["themes"]:
        branch_label[branch["id"]] = branch["label"]
        for leaf in branch.get("children", []):
            leaf_lookup[(_norm(branch["label"]), _norm(leaf["label"]))] = leaf["id"]
    binding_by_class = {c["id"]: bool(c.get("binding")) for c in tax["instrument_classes"]}
    return leaf_lookup, branch_label, binding_by_class


def upsert_authorities(used_ids):
    authorities = json.loads(AUTH_PATH.read_text(encoding="utf-8"))
    existing = {a["id"] for a in authorities}
    added = []
    for aid in sorted(used_ids):
        if aid in existing:
            continue
        entry = AUTHORITY_ENTRIES.get(aid)
        if not entry:
            continue
        authorities.append({
            "id": aid, "name": entry["name"], "name_ar": None,
            "jurisdiction": "BH", "type": entry["type"],
            "mandate": entry["mandate"], "website": entry["website"],
        })
        added.append(aid)
    if added:
        AUTH_PATH.write_text(json.dumps(authorities, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return added


def allocate_id(title, taken):
    base = "bh-" + slugify(title)
    if base == "bh-":
        base = "bh-instrument"
    cid = base
    n = 2
    while cid in taken:
        cid = f"{base}-{n}"
        n += 1
    taken.add(cid)
    return cid


def main():
    wb_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_WB
    if not wb_path.exists():
        print(f"ERROR: workbook not found: {wb_path}", file=sys.stderr)
        return 1

    rows = load_workbook_rows(wb_path)
    leaf_lookup, branch_label, binding_by_class = build_taxonomy_lookups()

    groups = OrderedDict()
    for r in rows:
        groups.setdefault(r.get("regulation_id"), []).append(r)

    # Idempotent: remove previously generated Bahrain catalogue files so reruns do
    # not accumulate numeric suffixes. Curated Bahrain records are protected.
    protected = set(CURATED_OVERLAP.values())
    for p in DOCS_DIR.glob("bh-*.json"):
        if p.stem not in protected:
            p.unlink()

    existing_files = {p.stem for p in DOCS_DIR.glob("*.json")}
    taken = set(existing_files)

    written = 0
    skipped_existing = []
    unmapped_authorities = Counter()
    unmapped_leaves = Counter()
    used_authority_ids = set()
    records = []

    for rid, grp in groups.items():
        if rid in CURATED_OVERLAP:
            skipped_existing.append((rid, CURATED_OVERLAP[rid]))
            continue
        primary = next((r for r in grp if r.get("is_primary") == 1), grp[0])
        title = str(primary.get("Instrument name (EN)") or "").strip()

        # Resolve authority and report misses.
        aid, _ = resolve_authority(primary.get("Issuing authority"))
        if aid is None:
            unmapped_authorities[str(primary.get("Issuing authority"))] += 1
        else:
            used_authority_ids.add(aid)

        # Report any leaf that fails to map.
        for r in grp:
            if resolve_leaf(r.get("Category"), r.get("Subcategory"), leaf_lookup) is None:
                unmapped_leaves[(str(r.get("Category")), str(r.get("Subcategory")))] += 1

        doc_id = allocate_id(title, taken)
        rec = build_record(grp, doc_id=doc_id, leaf_lookup=leaf_lookup,
                           branch_label=branch_label, binding_by_class=binding_by_class)
        records.append(rec)

    # Add authorities before writing records so referential integrity holds.
    added = upsert_authorities(used_authority_ids)

    for rec in records:
        (DOCS_DIR / f"{rec['id']}.json").write_text(
            json.dumps(rec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written += 1

    print(f"Workbook : {wb_path}")
    print(f"Regulations in sheet : {len(groups)}")
    print(f"Records written      : {written}")
    print(f"Authorities added    : {len(added)} {added}")
    print(f"Skipped (id already exists): {len(skipped_existing)} {skipped_existing}")
    if unmapped_authorities:
        print("\nUNMAPPED authorities (add to AUTHORITY_ALIASES/ENTRIES):")
        for name, c in unmapped_authorities.most_common():
            print(f"  {c:>3}  {name}")
    if unmapped_leaves:
        print("\nUNMAPPED (Category, Subcategory) pairs (check against taxonomy labels):")
        for pair, c in unmapped_leaves.most_common():
            print(f"  {c:>3}  {pair}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Dry run to surface any unmapped values**

Run: `python scripts/ingest-bahrain.py`
Expected: a report. The skip list should contain exactly one entry, the PDPL, mapping to `bh-pdpl-2018`. If `UNMAPPED authorities` or `UNMAPPED (Category, Subcategory) pairs` are non empty, fix them before continuing: add the missing alias to `AUTHORITY_ALIASES` (and an `AUTHORITY_ENTRIES` row if it is a new id) in the respective files, or correct the leaf label match. Rerun until both unmapped lists are empty.

- [ ] **Step 3: Commit the driver**

```bash
git add scripts/ingest-bahrain.py
git commit -m "feat: Bahrain workbook ingest driver"
```

---

## Task 5: Run ingestion and validate the dataset

**Files:**
- Modify (generated): `data/authorities.json`, `data/documents/bh-*.json`

- [ ] **Step 1: Run the ingest for real**

Run: `python scripts/ingest-bahrain.py`
Expected: `Records written : 321`, `Skipped (id already exists): 1 [(...'bh-pdpl-2018')]`, authorities added around 16, both unmapped lists empty.

- [ ] **Step 2: Validate**

Run: `npm run validate`
Expected: `334 documents checked, 0 errors`. Warnings are acceptable (records with `lifecycle: amended` that have no amending instrument in the set produce warnings by design; the validator only fails on errors). If there are errors, read each one (they name the file and field), fix the cause in `bahrain_ingest_lib.py` or `ingest-bahrain.py`, delete the generated `data/documents/bh-*.json` for Bahrain, and rerun Steps 1 and 2. Do not hand edit generated records.

To clear generated records for a clean rerun (PowerShell):
`Get-ChildItem data/documents/bh-*.json | Where-Object { $_.BaseName -ne 'bh-pdpl-2018' } | Remove-Item`

- [ ] **Step 3: Run the validator smoke tests**

Run: `npm test`
Expected: existing validator tests pass (unchanged).

- [ ] **Step 4: Commit the data**

```bash
git add data/authorities.json data/documents
git commit -m "data: ingest 321 Bahrain regulations as catalogue records"
```

---

## Task 6: Render per filter bullets on the cards

**Files:**
- Modify: `src/components/RecordCard.tsx`
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the activeThemes prop and bullet rendering in RecordCard.tsx**

In `src/components/RecordCard.tsx`, add `activeThemes` to the `Props` interface, after `todayIso: string;`:

```ts
  activeThemes: string[];
```

Add it to the destructured parameters in the function signature, after `todayIso,`:

```ts
  activeThemes,
```

After the `const oneLiner = ...` line, add the computed bullet list:

```ts
  const bulletLeaves = doc.theme_notes
    ? activeThemes.filter((t) => doc.theme_notes && doc.theme_notes[t]).slice(0, 3)
    : [];
```

Replace the existing `record-line` span (the block that renders `{oneLiner}`) with this conditional, which shows bullets when a category filter is active and the record has matching blurbs, and otherwise falls back to the current one liner:

```tsx
        {bulletLeaves.length > 0 ? (
          <ul className="record-bullets">
            {bulletLeaves.map((t) => (
              <li key={t}>
                <span className="bullet-leaf">{leafLabels.get(t) ?? t}</span>{' '}
                {doc.theme_notes![t]}
              </li>
            ))}
          </ul>
        ) : (
          <span
            className="record-line"
            lang={lang === 'ar' && doc.summary_ar ? 'ar' : undefined}
            dir={lang === 'ar' && doc.summary_ar ? 'rtl' : undefined}
          >
            {oneLiner}
          </span>
        )}
```

- [ ] **Step 2: Guard the expanded sections that read deferred fields**

In `src/components/RecordCard.tsx`, guard the three spots that a lean record leaves empty.

Wrap the "Issued" meta span (around line 104) so it only renders with a date:

```tsx
            {doc.date_issued && (
              <span>
                Issued <span className="mono">{doc.date_issued}</span>
              </span>
            )}
```

Wrap the "What this means" section so it only renders when there is an impact note:

```tsx
          {doc.impact_note && (
            <section className="detail-section">
              <h3>What this means</h3>
              <p>
                <ArText en={doc.impact_note} ar={doc.impact_note_ar} lang={lang} />
              </p>
            </section>
          )}
```

Wrap the "Last verified" span in the Source section so it only renders when present:

```tsx
              {doc.last_verified && (
                <span className="muted">
                  Last verified <span className="mono">{doc.last_verified}</span>
                </span>
              )}
```

- [ ] **Step 3: Compute and pass activeThemes in Dashboard.tsx**

In `src/components/Dashboard.tsx`, just before the `return (` of the component (after the `todayIso` line near line 216), add the helper:

```ts
  const activeLeavesFor = (doc: DocRecord): string[] => {
    if (leaf) return [leaf];
    if (branch) return doc.themes.filter((t) => t.startsWith(branch + '.'));
    return [];
  };
```

In the `RecordCard` JSX (around line 528), add the prop after `todayIso={todayIso}`:

```tsx
                activeThemes={activeLeavesFor(doc)}
```

- [ ] **Step 4: Make the dashboard sort year aware**

In `src/components/Dashboard.tsx`, replace the `results` sort comparator (lines around 210 to 214) with this, so dateless records sort by year instead of crashing or clustering wrongly:

```ts
  const sortVal = (d: DocRecord) =>
    d.date_issued && d.date_issued.length >= 4 ? d.date_issued : d.year ? `${d.year}-00-00` : '0000-00-00';
  const results = dataset.documents.filter(matches).sort((a, b) => {
    if (sort === 'oldest') return sortVal(a).localeCompare(sortVal(b));
    if (sort === 'title') return a.title.localeCompare(b.title);
    return sortVal(b).localeCompare(sortVal(a));
  });
```

- [ ] **Step 5: Style the bullets in global.css**

In `src/styles/global.css`, append:

```css
.record-bullets {
  margin: 0;
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  color: var(--ink-soft, #52525b);
  font-size: 0.92rem;
}
.record-bullets li {
  position: relative;
  padding-left: 14px;
}
.record-bullets li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent, #5048e5);
}
.record-bullets .bullet-leaf {
  font-weight: 600;
  color: var(--ink, #18181b);
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/RecordCard.tsx src/components/Dashboard.tsx src/styles/global.css
git commit -m "feat: per filter contextual bullets on dashboard cards"
```

---

## Task 7: Verify end to end

**Files:** none (verification only)

- [ ] **Step 1: Full validation suite**

Run: `npm run validate && npm test && npm run build`
Expected: validate reports 334 documents 0 errors; tests pass; build succeeds.

- [ ] **Step 2: Visual pass on the dashboard**

Run: `npm run dev`, open the dashboard at the printed `/complyr` URL.
Confirm:
- The instrument count near the top reads 334 (321 Bahrain plus 13 existing).
- Selecting country BH and category Data & privacy shows the PDPL once (the curated `bh-pdpl-2018`) and other Bahrain data privacy records.
- Selecting a single leaf (for example Cross-border data flows) shows matching regulations each with one contextual bullet drawn from `theme_notes`.
- Selecting a branch shows regulations with several bullets where they are cross listed, capped at three.
- Clearing the category filter shows each card's summary one liner again.
- A Bahrain record with `source_confidence: pending_verification` shows the Pending verification pill.
- Expanding a lean Bahrain card does not show empty Issued, What this means, or Last verified rows, and does not error in the console.

- [ ] **Step 3: Update CLAUDE.md dataset status**

In `CLAUDE.md`, under `## Dataset pipeline (current plan)`, replace the `Current dataset: 13 demo records ...` line with:

```
Current dataset: 13 curated records plus 321 Bahrain catalogue records ingested from the research workbook by scripts/ingest-bahrain.py (overview tier: filtering and summaries, with per leaf theme_notes bullets; detailed legal fields deferred). Other five countries pending.
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record Bahrain catalogue ingestion in handoff notes"
```

---

## Self-review notes

- Spec coverage: schema relaxation (Task 1), theme_notes and year (Tasks 1, 2), authorities (Task 4 driver `AUTHORITY_ENTRIES` and `upsert_authorities`), ingest grouping and field mapping (Tasks 3, 4), skip on collision (Task 4 `allocate_id` plus driver skip), honesty rules (Task 3 `build_record` notes and pending_verification), dashboard bullets and single select reconciliation (Task 6), verification (Task 7). All covered.
- The `binding_status` source of truth is `data/taxonomy.json` `instrument_classes[].binding`, read once in `build_taxonomy_lookups`.
- `theme_notes` keys are leaf ids; `RecordCard` looks each up in `leafLabels`, which is already built from the taxonomy in `Dashboard.tsx`.
- Skip on collision works two ways: curated overlaps are matched by `regulation_id` via `CURATED_OVERLAP` (the PDPL, because its workbook slug differs from `bh-pdpl-2018`), and `allocate_id` additionally suffixes any generated id that already exists, so reruns never overwrite a curated file.
- Idempotency: the driver deletes all `bh-*.json` except the protected curated ids at the start of every run, so reruns never accumulate numeric suffixes and always produce the same set of files. If the owner later hand curates more Bahrain records, add their ids to `CURATED_OVERLAP` (or a protected set) so the cleanup never removes them.
```
