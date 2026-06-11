import type { Jurisdiction, RelationshipType } from './types';

export const JURISDICTION_NAMES: Record<Jurisdiction, string> = {
  BH: 'Bahrain',
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  QA: 'Qatar',
  KW: 'Kuwait',
  OM: 'Oman',
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, { forward: string; inverse: string }> = {
  amends: { forward: 'amends', inverse: 'amended by' },
  repeals: { forward: 'repeals', inverse: 'repealed by' },
  supersedes: { forward: 'supersedes', inverse: 'superseded by' },
  implements: { forward: 'implements', inverse: 'implemented by' },
  consults_on: { forward: 'consults on', inverse: 'resulted from consultation' },
  enabled_by: { forward: 'enabled by', inverse: 'enables' },
  references: { forward: 'references', inverse: 'referenced by' },
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  official: 'Official source',
  secondary: 'Secondary source',
  pending_verification: 'Pending verification',
};
