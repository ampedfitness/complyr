# Complyr

There is no public, structured schema for GCC digital regulation: what an instrument is by legal form, whether and how it binds, what it regulates, and what it amends or implements. Complyr answers that with an open taxonomy, a JSON data model with referential integrity enforced in CI, and a curated dataset verified against official sources. Coverage is digital regulation across Bahrain, Saudi Arabia, the UAE, Qatar, Kuwait, and Oman: data and privacy, AI and emerging technologies, cybersecurity, telecom and digital infrastructure, digital government, digital economy, digital finance, online content, and digital health.

Live site: https://ampedfitness.github.io/complyr/

A portfolio project by [Author name] <!-- AUTHOR: fill in name and link -->. Nothing here is legal advice.

## How instruments are classified

Every document is classified on three independent axes that never mix:

1. **Instrument class**: what the document is, by legal form and force. Exactly one per document.
2. **Themes**: what the document is about. One or more leaf tags from a two level tree.
3. **Lifecycle**: current legal standing. Exactly one per document.

The instrument class split starts with binding force, because that is the first question a compliance reader asks. Binding classes: law, decree, regulation, resolution, regulator decision, circular, rulebook module. Non binding classes: national strategy, policy, guideline, framework, handbook, code of practice, standard, consultation paper, white paper. A separate `binding_status` field records whether the specific document binds, does not bind, or binds conditionally through another instrument, such as a standard incorporated by reference.

The same legal form carries different names across the six jurisdictions. The taxonomy records this per class; the law class maps as:

| Jurisdiction | Form of primary legislation |
| --- | --- |
| Saudi Arabia | Nizam, issued by royal decree |
| UAE | Federal law or federal decree law |
| Bahrain | Law, issued by decree law or law |
| Qatar | Law |
| Kuwait | Law or decree law |
| Oman | Law promulgated by royal decree |

A royal or emiri decree that merely promulgates a law is not a separate record; it lives in the law's citation string. This keeps the dataset from filling up with decree stubs.

The theme tree has nine top level categories covering the digital regulatory space, each with leaf subcategories and a written scope statement. Documents tag leaves only; parents are computed. There are no general or miscellaneous categories anywhere: if nothing fits, the tree has a gap and the fix is a new leaf with a scope statement, not a junk drawer. Boundary calls are written into the scope statements, for example personal data breach duties sit under data privacy rather than cybersecurity, and crypto as a financial activity sits under digital finance while blockchain as a technology sits under AI and emerging technologies.

Lifecycle distinguishes `superseded` from `repealed`. Strategies and guidance get quietly replaced without formal repeal, and the data does not pretend otherwise.

Relationships between documents are typed and directed: amends, repeals, supersedes, implements, consults_on, enabled_by, references. Contributors enter only the forward direction on the newer or subordinate instrument; the site computes inverses and renders each document's family as a hierarchy, enabling law at the top, implementing regulations below, guidance beneath.

## The data model

One JSON file per instrument in `data/documents/`, named by its id. A full record:

```json
{
  "id": "om-pdpl-executive-regulation-2024",
  "title": "Executive Regulation of the Oman Personal Data Protection Law",
  "title_ar": "اللائحة التنفيذية لقانون حماية البيانات الشخصية",
  "official_title": "Executive Regulation of the Personal Data Protection Law, Ministerial Decision No. 34/2024",
  "official_title_ar": "اللائحة التنفيذية لقانون حماية البيانات الشخصية الصادرة بالقرار الوزاري رقم 34/2024",
  "jurisdiction": "OM",
  "instrument_class": "regulation",
  "binding_status": "binding",
  "lifecycle": "in_force",
  "themes": ["data_privacy.personal_data_protection"],
  "issuing_authority": "om-mtcit",
  "language_of_official_text": "ar",
  "english_text_unofficial": true,
  "date_issued": "2024-01-28",
  "date_effective": "2024-02-05",
  "compliance_deadline": "2025-02-05",
  "gazette": { "name": "Official Gazette of Oman", "number": null, "issue_date": "2024-02-04" },
  "citation": "Executive Regulation of the Personal Data Protection Law, Ministerial Decision No. 34/2024",
  "summary": "The operational regulation under Oman's data protection law...",
  "summary_ar": null,
  "impact_note": "This regulation started the real compliance clock in Oman...",
  "impact_note_ar": null,
  "obligations": [
    {
      "description": "Align existing processing operations with the law and regulation",
      "obligated_party": "Controllers",
      "deadline": "2025-02-05"
    }
  ],
  "applicability": {
    "entity_types": ["private companies", "controllers and processors in Oman"],
    "sectors": ["all sectors"],
    "extraterritorial": false,
    "penalties": "Administrative penalties under the law's framework",
    "grace_period": "One year for existing processing, ended 5 February 2025"
  },
  "relationships": [{ "type": "implements", "target_id": "om-pdpl-2022" }],
  "source_url": "https://qanoon.om",
  "source_confidence": "pending_verification",
  "last_verified": "2026-06-11",
  "tags": ["executive regulation", "permits", "breach notification"],
  "notes": "Confirm the decision date and gazette issue against the qanoon.om text."
}
```

Field notes that matter:

- `issuing_authority` is an id resolving to `data/authorities.json`, never free text. The registry holds every issuing body with its Arabic name, type, one sentence mandate, and website.
- Many GCC instruments bind only in Arabic. `language_of_official_text` records this and `english_text_unofficial` flags translations.
- `impact_note` is the analytical core: one paragraph on who is affected, what changes, and what action is needed, written like an analyst briefing an executive.
- `source_confidence` is honest about verification: `official` for gazette or regulator sources, `secondary` for reputable analyses, `pending_verification` when a fact still needs checking. Pending records are visibly flagged on the site.

## Contributing an entry

1. Pick an instrument and verify it against the official gazette or the issuing regulator. `docs/research/deep-research-prompts.md` has ready made deep research prompts that emit records in this exact format.
2. If the issuing body is new, add it to `data/authorities.json` first.
3. Create `data/documents/<id>.json`. The id starts with the lowercase jurisdiction code and the file name must equal the id.
4. Tag themes at leaf level only and against the scope statements in `data/taxonomy.json`, not the labels.
5. Enter relationships in the forward direction only; the site computes the rest.
6. Run `npm run validate` and fix what it reports, then open a pull request.

Validation enforces: schema shape for every file, theme ids that exist and are leaves, authority ids that resolve, relationship targets that exist and use forward types, unique ids matching file names, and an `enabled_by` link on every conditionally binding instrument. CI runs the same checks plus a full site build on every pull request.

## Run and deploy

```bash
npm ci
npm run dev        # local dev server
npm run validate   # data validation
npm test           # validator smoke tests
npm run build      # static build to dist/
```

Deployment is GitHub Pages via the workflow in `.github/workflows/deploy.yml`, triggered on push to main. The site is fully static: no backend, no database, no tracking.

## Scope and limitations

Complyr is a curated dataset, not a live monitoring service. Records are added and verified by hand, and each carries its own `last_verified` date. The dataset currently holds an initial demonstration set centred on data protection law across all six jurisdictions, with build out underway; entries marked `pending_verification` await confirmation against official sources before they should be relied on.

The dataset covers digital regulation only: instruments whose primary subject is digital technology, data, networks, online activity, or digitally delivered services. Non digital instruments are out of scope even when issued by a digital authority, and instruments in traditional domains enter only when they specifically regulate the digital channel or technology. The taxonomy has nine categories (Data & privacy, AI & emerging technologies, Cybersecurity, Telecommunications & digital infrastructure, Digital government & identity, Digital economy & platforms, Digital finance, Online content & media, Digital health) and thirty two subcategories, each with a written scope statement so the tree stays collectively exhaustive while entries accumulate.

## Roadmap

v2

- Comparison view of one topic across all six jurisdictions
- Defined terms glossary per instrument
- ICS calendar export of compliance deadlines
- RSS feed and stable JSON endpoints

v3

- Mapping instruments to international frameworks: GDPR concepts, OECD AI Principles, NIST AI RMF
- Per jurisdiction regulatory timeline view

## Licences

Code is MIT licensed (see `LICENSE`). The dataset under `data/` is licensed CC BY 4.0 (see `LICENSE-DATA`); cite Complyr when you reuse it.
