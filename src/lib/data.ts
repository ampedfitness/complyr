import taxonomyJson from '../../data/taxonomy.json';
import authoritiesJson from '../../data/authorities.json';
import type { Authority, Dataset, DocRecord, Stats } from './types';

const documentModules = import.meta.glob<{ default: Omit<DocRecord, 'year'> }>(
  '../../data/documents/*.json',
  { eager: true }
);

const documents: DocRecord[] = Object.values(documentModules)
  .map((mod) => {
    const doc = mod.default;
    return { ...doc, year: Number(doc.date_issued.slice(0, 4)) } as DocRecord;
  })
  .sort((a, b) => b.date_issued.localeCompare(a.date_issued));

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
  dateRange:
    documents.length === 0
      ? null
      : {
          from: documents[documents.length - 1].date_issued,
          to: documents[0].date_issued,
        },
};

export const recentDocuments = documents.slice(0, 3);
