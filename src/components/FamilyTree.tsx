import type { DocRecord, RelationshipType } from '../lib/types';
import { RELATIONSHIP_LABELS } from '../lib/labels';

// Order in which related instruments hang beneath their parent:
// amendments first, then implementing measures, then everything else.
const TYPE_ORDER: RelationshipType[] = [
  'amends',
  'repeals',
  'supersedes',
  'implements',
  'enabled_by',
  'consults_on',
  'references',
];

interface Props {
  doc: DocRecord;
  docsById: Map<string, DocRecord>;
  lang: 'en' | 'ar';
}

function findRoot(doc: DocRecord, docsById: Map<string, DocRecord>): DocRecord {
  let current = doc;
  const visited = new Set<string>([doc.id]);
  for (;;) {
    const next = TYPE_ORDER.map((t) => current.relationships.find((r) => r.type === t))
      .find((r) => r && docsById.has(r.target_id) && !visited.has(r.target_id));
    if (!next) return current;
    current = docsById.get(next.target_id)!;
    visited.add(current.id);
  }
}

function childrenOf(parent: DocRecord, all: DocRecord[]): { doc: DocRecord; type: RelationshipType }[] {
  return all
    .flatMap((d) =>
      d.relationships
        .filter((r) => r.target_id === parent.id)
        .map((r) => ({ doc: d, type: r.type }))
    )
    .sort(
      (a, b) =>
        TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
        a.doc.date_issued.localeCompare(b.doc.date_issued)
    );
}

export default function FamilyTree({ doc, docsById, lang }: Props) {
  const all = [...docsById.values()];
  const root = findRoot(doc, docsById);
  const hasFamily = root.id !== doc.id || childrenOf(doc, all).length > 0;

  if (!hasFamily) {
    return <p className="muted">No recorded relationships for this instrument.</p>;
  }

  const renderNode = (
    node: DocRecord,
    relType: RelationshipType | null,
    visited: Set<string>,
    depth: number
  ) => {
    const kids = depth < 4 ? childrenOf(node, all).filter((k) => !visited.has(k.doc.id)) : [];
    for (const k of kids) visited.add(k.doc.id);
    const title = lang === 'ar' && node.title_ar ? node.title_ar : node.title;
    return (
      <li key={node.id}>
        {relType && <span className="rel-label">{RELATIONSHIP_LABELS[relType].forward}</span>}
        <span
          className={node.id === doc.id ? 'current' : undefined}
          lang={lang === 'ar' && node.title_ar ? 'ar' : undefined}
          dir={lang === 'ar' && node.title_ar ? 'rtl' : undefined}
        >
          {title}
        </span>{' '}
        <span className="mono muted">{node.year}</span>
        {kids.length > 0 && (
          <ul>{kids.map((k) => renderNode(k.doc, k.type, visited, depth + 1))}</ul>
        )}
      </li>
    );
  };

  return <ul className="family-tree">{renderNode(root, null, new Set([root.id]), 0)}</ul>;
}
