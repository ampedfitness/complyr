# Research prompts for dataset build-out

Two workflows. Workflow A is the primary pipeline: research lands in an Excel workbook, one tab per country, then gets converted into validated JSON records in bulk. Workflow B emits finished JSON records directly, for contributors filing single PRs.

## Workflow A: Excel register, one prompt per subcategory

One workbook. One tab per country (BH, SA, AE, QA, KW, OM). Every tab has exactly these columns, in this order:

| Column | Content |
| --- | --- |
| Category | Theme branch, e.g. Technology & Digital |
| Subcategory | Theme leaf, e.g. Data protection & privacy |
| Instrument name (EN) | Plain English name |
| Official name (AR) | Official Arabic title exactly as published, or blank |
| Type | One of: law, decree, regulation, resolution, decision, circular, rulebook module, national strategy, policy, guideline, framework, handbook, code of practice, standard, consultation paper, white paper |
| Year | Year issued |
| Date issued | YYYY-MM-DD if known, else blank |
| Issuing authority | The body that issued it |
| One line description | What it does, in one sentence |
| Summary | 2 to 3 factual sentences |
| Status | One of: in consultation, enacted, in force, amended, repealed, superseded |
| Related instruments | Plain text such as: implements Law 30/2018, amends PDPL 2021, supersedes 2019 strategy |
| Source URL | Best URL actually opened, official preferred |
| Verified | official, secondary, or unverified, plus any caveat |

Run the prompt below once per subcategory per country chat, filling in the placeholders. Paste each returned table into the country tab.

```text
You are a senior regulatory research analyst building a verified register of {COUNTRY} regulation. Accuracy beats completeness: never invent a fact, a date, an instrument number, or a URL. Everything you report must trace to a source you actually opened. If you cannot verify something, write UNVERIFIED in that cell instead of guessing.

Research ONLY this area in this run:

Category: {CATEGORY}
Subcategory: {SUBCATEGORY}

Find every instrument with real compliance significance in this subcategory, from roughly 2000 to today, prioritising 2015 onward: laws, amendments, executive or implementing regulations, cabinet and ministerial resolutions, regulator decisions and circulars, plus significant non-binding items (national strategies, official guidelines, frameworks, codes of practice, standards, consultations that are open or produced an instrument). For financial free zones (DIFC, ADGM, QFC), include their instruments with the free zone authority as the issuer.

Source hierarchy, in order of preference:
1. Official gazette or official legislation portal
2. The issuing regulator's own website
3. Reputable law firm briefings and IAPP or DataGuidance analyses (mark these "secondary" in the Verified column)

Official starting points by country:
- Saudi Arabia: laws.boe.gov.sa, istitlaa.ncc.gov.sa, Umm Al Qura gazette, plus the regulator's own site
- UAE: uaelegislation.gov.ae, u.ae, difc.ae legal database, en.adgm.thomsonreuters.com
- Bahrain: legalaffairs.gov.bh, cbb.gov.bh rulebook, pdp.gov.bh
- Qatar: almeezan.qa, plus the regulator's own site and QFC legislation
- Kuwait: official gazette Kuwait Al-Youm via e.gov.kw, citra.gov.kw
- Oman: qanoon.om, mjla.gov.om

Type is a controlled vocabulary. Classify by legal form and issuer, never by the document's own title. Use exactly one of:
- law: primary legislation passed through the country's lawmaking process. Includes a Saudi nizam, a UAE federal law or federal decree law, and any law promulgated by royal decree.
- decree: a royal or emiri decree with substantive content of its own, such as establishing an authority or ordering a specific measure. A decree that merely promulgates a law is NOT a row at all.
- regulation: an executive or implementing regulation issued under a specific law to give it operational effect. Always name that law in Related instruments.
- resolution: a cabinet or ministerial resolution of general binding effect that is not the executive regulation of a single law.
- decision: a binding instrument issued by a sectoral regulator or authority within its mandate, such as licensing conditions or technical rules.
- circular: a binding instruction from a regulator or ministry to the entities it supervises, narrower and more operational than a decision.
- rulebook module: one module of a regulator's consolidated rulebook, such as a CBB Rulebook module. Record at module level, one row per module.
- national strategy: a government wide strategy setting direction, targets, and institutional responsibilities.
- policy: a stated position of a ministry or regulator that guides decisions without creating enforceable duties.
- guideline: guidance explaining how to interpret or comply with binding rules, or recommending practices, with no duties of its own.
- framework: a structured reference model of principles, controls, or maturity levels intended for adoption rather than enforcement.
- handbook: an operational manual consolidating procedures and explanatory material.
- code of practice: a code of expected conduct for a sector, often operating on a comply or explain basis.
- standard: a technical or management standard specifying requirements, voluntary unless another instrument makes it mandatory.
- consultation paper: a document published to gather input on a proposed instrument or policy.
- white paper: an analytical or position paper signalling regulatory direction without draft rules.

Status is also controlled. Use exactly one of:
- in consultation: published as a draft, input being sought
- enacted: formally issued but not yet effective
- in force: currently effective, or operative for non binding documents
- amended: in force but changed by later instruments; list the amending instruments in Related instruments
- repealed: formally abrogated by a later instrument
- superseded: replaced in practice without formal repeal, common for strategies and guidance

Rules:
- One row per instrument. Amendments and executive regulations are their own rows; say what they amend or implement in Related instruments.
- Report the official Arabic title exactly as published where available.
- If a document does not clearly fit one Type, pick the closest and append a question mark, for example "decision?", so a human reviews it.
- Keep every cell free of line breaks and pipe characters.

Output ONE table with EXACTLY these columns and nothing else in the cells:

Category | Subcategory | Instrument name (EN) | Official name (AR) | Type | Year | Date issued | Issuing authority | One line description | Summary | Status | Related instruments | Source URL | Verified

Order rows by importance, most significant instrument first. After the table, add two short lists: "Could not verify" for anything referenced in secondary sources you could not confirm, and "Sources used" with the URLs you actually opened.

Depth beats breadth: a fully verified row is worth more than three half checked ones.
```

After each run: paste the table into the country tab, spot-check the source URLs yourself, and correct the Verified column where you confirmed against the official text. The workbook then comes back to the conversion step, which maps rows to the JSON schema, builds relationships from the Related instruments column, writes impact notes and obligations, and runs `npm run validate`.

## Workflow B: direct JSON records

For contributors filing PRs directly, the prompts that emit complete `data/documents/<id>.json` records live in the project history and the README contribution guide. The essentials: one JSON file per instrument named by its id, themes tagged at leaf level only against the scope statements in `data/taxonomy.json`, forward-only relationships, `source_confidence` set honestly, and `npm run validate` before pushing.
