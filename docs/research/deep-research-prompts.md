# Deep research prompts for dataset build-out

How to use: open one chat per country. In that chat, run Prompt A once to set context, then run Prompt B once per research area. Each run should return ready-to-file JSON records. Save each record to `data/documents/<id>.json` and run `npm run validate`. The validator catches schema violations, unknown themes or authorities, and broken relationship targets, so paste with confidence and let CI do the checking.

Research areas to run per country:

1. Data protection and privacy
2. AI and emerging technology governance
3. Digital economy (e-commerce, platforms, electronic transactions, digital government, cloud and telecom rules with compliance impact)

Countries and codes: Bahrain (BH), Saudi Arabia (SA), UAE (AE), Qatar (QA), Kuwait (KW), Oman (OM).

---

## Prompt A: chat setup (run once per country chat)

```text
You are a senior regulatory research analyst building a structured dataset of {COUNTRY} regulation for an open source project. Your job in this chat is deep, source-verified research. Accuracy beats completeness: never invent a fact, a date, an instrument number, or a URL. Everything you report must trace to a source you actually opened.

Source hierarchy, in order of preference:
1. Official gazette or official legislation portal
2. The issuing regulator's own website (the instrument PDF or its official page)
3. Reputable law firm briefings and IAPP/DataGuidance analyses (acceptable for context and dates, but mark the record source_confidence "secondary" if no official source was found)

Official starting points for {COUNTRY}:
- Saudi Arabia: laws.boe.gov.sa (Bureau of Experts consolidated laws), sdaia.gov.sa, nca.gov.sa, cst.gov.sa, istitlaa.ncc.gov.sa (public consultations), Umm Al Qura gazette
- UAE: uaelegislation.gov.ae, u.ae, tdra.gov.ae, ai.gov.ae, difc.ae legal database, en.adgm.thomsonreuters.com
- Bahrain: legalaffairs.gov.bh (Legislation and Legal Opinion Commission), pdp.gov.bh, cbb.gov.bh rulebook
- Qatar: almeezan.qa, ncsa.gov.qa, cra.gov.qa, qfcra.com and QFC legislation
- Kuwait: citra.gov.kw, Kuwait Al-Youm gazette via e.gov.kw
- Oman: qanoon.om, mjla.gov.om (Ministry of Justice and Legal Affairs gazette), mtcit.gov.om

Ground rules for every record you produce:
- One record per instrument. A royal or emiri decree that merely promulgates a law is NOT a separate record; it belongs in the law's citation string.
- Record an instrument once, describing its current standing. Amendments are separate records linked with a relationship of type "amends".
- Relationships are forward-only, entered on the newer or subordinate instrument: an executive regulation "implements" its law, an amendment "amends" the original, a replacement "supersedes" what it quietly replaced, a formal abrogation "repeals". Never enter inverse forms like amended_by.
- Many GCC instruments are legally binding only in Arabic. Report the official Arabic title exactly as published. Set english_text_unofficial true when the circulating English text is an unofficial translation.
- Arabic fields: fill them only with text taken from or faithfully reflecting official Arabic sources. Otherwise set them null.
- If you cannot verify something, say so explicitly in the notes field and set source_confidence to "pending_verification". Do not fill gaps with plausible guesses.

Confirm you understand, then wait for my research instructions.
```

---

## Prompt B: research run (run once per area, same chat)

```text
Research area: {AREA} regulation in {COUNTRY}, focusing on roughly 2016 to today with emphasis on 2021 onward. Find every instrument with real compliance significance: laws, amendments, executive or implementing regulations, cabinet and ministerial resolutions, regulator decisions and circulars, plus significant non-binding items (national strategies, official guidelines, frameworks, codes, consultations currently open or that produced an instrument).

For financial free zones (DIFC, ADGM, QFC), include their instruments as part of the parent country, with the free zone authority as the issuing authority.

Work instrument by instrument. For each one, open the best source you can find and capture the facts. Then output one JSON object per instrument in exactly this shape, inside a separate code block per instrument:

{
  "id": "<country code lowercase>-<short-slug>-<year>",
  "title": "<plain language title in English>",
  "title_ar": "<plain Arabic title or null>",
  "official_title": "<formal instrument name in English>",
  "official_title_ar": "<formal Arabic name exactly as published, or null>",
  "jurisdiction": "<BH|SA|AE|QA|KW|OM>",
  "instrument_class": "<one of: law, decree, regulation, resolution, decision, circular, rulebook_module, national_strategy, policy, guideline, framework, handbook, code_of_practice, standard, consultation_paper, white_paper>",
  "binding_status": "<binding|non_binding|conditionally_binding>",
  "lifecycle": "<consultation|enacted|in_force|amended|repealed|superseded>",
  "themes": ["<see theme list below, leaf ids only, one or more>"],
  "issuing_authority": "<authority id; if the authority is not in the list below, give full name, Arabic name, type, one sentence mandate, and website so it can be added>",
  "language_of_official_text": "<ar|en|both>",
  "english_text_unofficial": <true|false>,
  "date_issued": "<YYYY-MM-DD>",
  "date_effective": "<YYYY-MM-DD or null>",
  "compliance_deadline": "<YYYY-MM-DD or null, the latest date by which regulated entities had or have to comply>",
  "gazette": { "name": "<gazette name>", "number": "<issue number or null>", "issue_date": "<YYYY-MM-DD or null>" },
  "citation": "<formatted legal citation, including the promulgating decree where applicable>",
  "summary": "<2 to 3 factual sentences: what the instrument does>",
  "summary_ar": "<2 to 3 sentences in Arabic, only if faithful to official Arabic sources, else null>",
  "impact_note": "<one paragraph, written like an analyst briefing an executive: who is affected, what changes, what action is needed>",
  "impact_note_ar": null,
  "obligations": [
    { "description": "<discrete obligation>", "obligated_party": "<who>", "deadline": "<period or date, or null>" }
  ],
  "applicability": {
    "entity_types": ["<who it applies to>"],
    "sectors": ["<sectors, or 'all sectors'>"],
    "extraterritorial": <true|false>,
    "penalties": "<one line on the penalty regime or null>",
    "grace_period": "<transition period or null>"
  },
  "relationships": [ { "type": "<amends|repeals|supersedes|implements|consults_on|enabled_by|references>", "target_id": "<id of the other instrument>" } ],
  "source_url": "<the best URL you actually opened, official preferred>",
  "source_confidence": "<official|secondary|pending_verification>",
  "last_verified": "<today, YYYY-MM-DD>",
  "tags": ["<free form keywords the taxonomy does not capture>"],
  "notes": "<anything a human reviewer must check before publishing, or null>"
}

Classification rules:
- instrument_class is what the document IS by legal form. binding_status is whether it binds. lifecycle is its current standing. Never mix the three.
- conditionally_binding is for standards incorporated by reference and comply-or-explain codes, and requires a relationship of type enabled_by pointing at the instrument that gives it force.
- superseded is for instruments quietly replaced without formal repeal (common for strategies and guidance). repealed requires formal abrogation.
- Tag themes against these scope rules: personal data breach duties belong under data_protection_privacy even when issued by a cybersecurity authority; AML belongs under finance.aml_cft regardless of issuer; a fintech rule tags finance.fintech_payments and only also a technology leaf if it regulates the technology itself.

Theme leaf ids for this project (use only these; if nothing fits, propose a new leaf and flag it in notes):
technology_digital.data_protection_privacy, technology_digital.ai_emerging_tech, technology_digital.cybersecurity, technology_digital.telecommunications, technology_digital.digital_government, technology_digital.ecommerce_platforms, finance.fintech_payments, finance.banking, finance.capital_markets, finance.aml_cft

Known authority ids you may reference: sa-king, sa-sdaia, ae-president, ae-uae-data-office, ae-ai-office, ae-difc-cdp, ae-adgm-odp, bh-king, bh-pdpa, bh-cbb, qa-emir, qa-ncsa, qa-qfc-dpo, kw-citra, om-sultan, om-mtcit. Heads of state are the issuing authority for laws promulgated by royal or emiri decree.

After the records, give me a short list titled "Could not verify" naming anything you found referenced in secondary sources but could not confirm against an official or reliable source.

Start with the most important instruments and work down. Depth beats breadth: a fully verified record is worth more than three half-checked ones.
```

---

## After each run

1. Save each JSON object to `data/documents/<id>.json` (file name must equal the id).
2. If GPT proposed a new authority, add it to `data/authorities.json` first.
3. Run `npm run validate`. Fix what it reports.
4. Spot-check each source_url yourself before changing source_confidence to official.
5. Commit per country or per area, so review stays manageable.
