# Digital-only refocus: approved design, implemented

Date: 2026-06-12. Owner approved the taxonomy below in conversation. Implemented end to end on 2026-06-12: taxonomy v2.0.0, record retagging, research prompts, website copy, README, and CLAUDE.md.

## Decision

Complyr narrows from all GCC regulation to digital regulation only. The 17-branch taxonomy v1 is replaced by a 9-category digital taxonomy. The research prompt, the website copy, the 13 existing records, and the handoff docs all follow from that change. All 13 current records already use digital leaves, so nothing gets deleted, only retagged.

## Approved taxonomy v2: 9 categories, 32 subcategories

Proposed ids in parentheses. Every node needs a label, label_ar, and a scope statement with explicit out-of-scope boundaries, same discipline as v1. No general, other, or misc buckets.

1. Data & privacy (data_privacy)
   - Personal data protection (personal_data_protection): general data protection laws, rights, controller and processor duties, breach notification
   - Cross-border data flows (crossborder_data_flows): transfer rules, localisation, adequacy
   - Data governance & open data (data_governance_open_data): national data strategies, data offices, data sharing, open data
2. AI & emerging technologies (ai_emerging_tech)
   - AI governance & ethics (ai_governance_ethics): AI strategies, ethics principles, risk frameworks, non-financial tech sandboxes fold into this scope
   - Generative AI (generative_ai)
   - Autonomous & smart systems (autonomous_smart_systems): autonomy itself, robotics, smart city tech
   - IoT & connected devices (iot_connected_devices): CST and TDRA IoT frameworks live here
   - Blockchain & Web3 (blockchain_web3): blockchain as technology, government DLT strategies, smart contract recognition. Boundary: crypto as financial activity sits under digital_finance.virtual_assets; an instrument doing both tags both
3. Cybersecurity (cybersecurity)
   - Security controls & frameworks (security_controls_frameworks): baseline controls such as NCA ECC; encryption and cryptography standards fold into this scope
   - Critical infrastructure (critical_infrastructure)
   - Incident reporting (incident_reporting): system compromise reporting, not personal data breach notification
   - Cybercrime (cybercrime): offences against information systems
4. Telecommunications & digital infrastructure (telecom_digital_infrastructure)
   - Licensing & markets (licensing_markets)
   - Spectrum (spectrum)
   - OTT & digital communication services (ott_digital_comms): VoIP and messaging rules, a distinctly GCC topic
   - Cloud & data centres (cloud_data_centres): CST cloud framework, Bahrain cloud rules, data centre licensing
   - Internet governance & domain names (internet_governance_domains): ccTLDs, internet governance
5. Digital government & identity (digital_government)
   - E-government services (egovernment_services): e-services, digital transformation programmes, government cloud-first policy
   - Digital identity & trust services (digital_identity_trust): national digital ID, e-signatures, electronic transactions and trust services laws
6. Digital economy & platforms (digital_economy)
   - E-commerce (ecommerce)
   - Online platforms (online_platforms): platform and intermediary duties, app stores, sharing economy platforms
   - E-invoicing & digital tax administration (einvoicing_digital_tax): ZATCA Fatoora and equivalents
7. Digital finance (digital_finance)
   - Payments & e-money (payments_emoney)
   - Open banking (open_banking)
   - Virtual assets (virtual_assets): tokens, exchanges, custody, VASP licensing, VARA rulebooks, AML duties of VASPs tag here
   - Fintech sandboxes (fintech_sandboxes)
8. Online content & media (online_content)
   - Online media licensing (online_media_licensing): UAE electronic media regulation, SA online journalism licensing
   - Content standards & moderation (content_standards_moderation): online content offences sit here, not under cybercrime
   - Online advertising & influencers (online_advertising_influencers)
   - Gaming & esports (gaming_esports): scope covers licensed online gaming regimes such as UAE GCGRA
9. Digital health (digital_health)
   - Telehealth & digital health services (telehealth_digital_services)
   - Health data (health_data): health sector specific data rules; general data protection law applied to health stays under personal_data_protection

## Classification rules to carry into v2

Keep leaf_only_tagging, multiple_leaves_allowed (reword the example for digital), no_residual_categories, tag_against_scope, promulgating_decrees. Adapt breach_duties_boundary (breach notification under data_privacy.personal_data_protection, never cybersecurity) and cybercrime_boundary (system offences under cybersecurity.cybercrime, content offences under online_content.content_standards_moderation). Drop aml_boundary and listing_rules_boundary, replaced by the VASP AML note in virtual_assets. Rewrite dataset_scope: the dataset covers digital regulation only; an instrument whose primary subject is digital technology, data, networks, online activity, or digitally delivered services. Non-digital instruments are out of scope even when issued by a digital authority. Instruments in traditional domains enter only when they specifically regulate the digital channel or technology.

## Record retagging map (all 13 records)

- technology_digital.data_protection_privacy maps to data_privacy.personal_data_protection (bh-pdpl-2018, qa-pdppl-2016, sa-pdpl-2021, sa-pdpl-amendment-2023, sa-pdpl-implementing-regulation-2023, om-pdpl-2022, om-pdpl-executive-regulation-2024, ae-pdpl-2021, plus the two multi-tag records below)
- ae-ai-charter-2024 and sa-ai-ethics-principles-2023: ai_emerging_tech.ai_governance_ethics
- sa-generative-ai-guidelines-gov-2024: ai_emerging_tech.generative_ai plus digital_government.egovernment_services
- ae-data-office-law-2021: data_privacy.personal_data_protection plus data_privacy.data_governance_open_data
- kw-citra-dppr-2021: data_privacy.personal_data_protection plus telecom_digital_infrastructure.licensing_markets

## Implementation checklist

1. Rewrite the themes array and classification_rules in `data/taxonomy.json`, bump version to 2.0.0. Instrument classes, binding statuses, lifecycle, and relationship types stay as they are.
2. Retag the 13 records per the map above. Run `npm run validate` (it enforces referential integrity against the taxonomy).
3. Update `docs/research/deep-research-prompts.md`: frame the analyst as researching digital regulation, and add a run matrix listing every Category and Subcategory pair so each prompt run picks from the approved list. Consider adding Arabic topic terms per subcategory.
4. Update website copy: `src/pages/index.astro` headline and intro should say digital regulation (suggest "GCC Digital Regulation. Verified. Structured. Open." with a matching Arabic subline), page title and meta description, classification panel text computes counts from the taxonomy automatically. `src/layouts/Base.astro` footer description. `src/pages/dashboard.astro` meta description.
5. Check README for broad-scope copy and align it.
6. Update CLAUDE.md: taxonomy line (9 branches, 32 leaves, digital only), dataset scope rule, and remove or update the line saying constitutional and electoral law are the explicit out-of-scope examples.
7. `npm run validate`, `npm test`, `npm run build`, then commit and push (push deploys to GitHub Pages).

## Context a fresh session needs

- The June 2026 visual restyle is done, live, and documented in CLAUDE.md; this refocus is content and copy only, no design changes.
- Writing rules apply to every file touched: no em dashes or dash punctuation, sentence case, plain professional tone.
- The owner reviews everything; he approved this taxonomy including keeping blockchain_web3 (technology) separate from virtual_assets (financial activity).
