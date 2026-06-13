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
