export type Jurisdiction = 'BH' | 'SA' | 'AE' | 'QA' | 'KW' | 'OM';

export type RelationshipType =
  | 'amends'
  | 'repeals'
  | 'supersedes'
  | 'implements'
  | 'consults_on'
  | 'enabled_by'
  | 'references';

export interface Obligation {
  description: string;
  obligated_party: string;
  deadline?: string | null;
}

export interface Applicability {
  entity_types?: string[];
  sectors?: string[];
  extraterritorial?: boolean;
  penalties?: string | null;
  grace_period?: string | null;
}

export interface Relationship {
  type: RelationshipType;
  target_id: string;
}

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
  /** Derived at build time from date_issued. */
  year: number;
}

export interface ThemeLeaf {
  id: string;
  label: string;
  label_ar: string | null;
  scope: string;
}

export interface ThemeBranch {
  id: string;
  label: string;
  label_ar: string | null;
  coverage: 'full' | 'partial' | 'stub';
  scope: string;
  children: ThemeLeaf[];
}

export interface InstrumentClass {
  id: string;
  label: string;
  label_ar: string | null;
  binding: boolean;
  scope: string;
  jurisdiction_forms?: Partial<Record<Jurisdiction, string>>;
}

export interface LabelledTerm {
  id: string;
  label: string;
  label_ar: string | null;
  scope: string;
}

export interface Authority {
  id: string;
  name: string;
  name_ar: string | null;
  jurisdiction: Jurisdiction;
  type: string;
  mandate: string;
  website: string | null;
}

export interface Dataset {
  documents: DocRecord[];
  branches: ThemeBranch[];
  instrumentClasses: InstrumentClass[];
  lifecycles: LabelledTerm[];
  bindingStatuses: LabelledTerm[];
  authorities: Authority[];
}

export interface Stats {
  entries: number;
  jurisdictions: number;
  authorities: number;
  dateRange: { from: string; to: string } | null;
}
