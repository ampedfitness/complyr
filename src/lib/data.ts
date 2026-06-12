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

const taxonomy = taxonomyJson as unknown as {
  themes: Dataset['branches'];
  instrument_classes: Dataset['instrumentClasses'];
  lifecycle: Dataset['lifecycles'];
  binding_statuses: Dataset['bindingStatuses'];
};

export const dataset: Dataset = {
  documents,
  branches: taxonomy.themes,
  instrumentClasses: taxonomy.instrument_classes,
  lifecycles: taxonomy.lifecycle,
  bindingStatuses: taxonomy.binding_statuses,
  authorities: authoritiesJson as Authority[],
};

export const stats: Stats = {
  entries: documents.length,
  jurisdictions: new Set(documents.map((d) => d.jurisdiction)).size,
  authorities: dataset.authorities.length,
  dateRange: (() => {
    const dated = documents.map((d) => d.date_issued).filter((d) => d.length >= 4).sort();
    return dated.length === 0 ? null : { from: dated[0], to: dated[dated.length - 1] };
  })(),
};

export const recentDocuments = documents.slice(0, 3);
