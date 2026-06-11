import { useMemo, useState } from 'react';
import type { Dataset, DocRecord, Jurisdiction } from '../lib/types';
import { JURISDICTION_NAMES } from '../lib/labels';
import DocumentCard from './DocumentCard';

interface Props {
  dataset: Dataset;
}

const ALL_JURISDICTIONS: Jurisdiction[] = ['BH', 'SA', 'AE', 'QA', 'KW', 'OM'];

export default function Explorer({ dataset }: Props) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [q, setQ] = useState('');
  const [juris, setJuris] = useState<Jurisdiction[]>([]);
  const [branch, setBranch] = useState('');
  const [leaf, setLeaf] = useState('');
  const [cls, setCls] = useState('');
  const [binding, setBinding] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [authority, setAuthority] = useState('');
  const [year, setYear] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const docsById = useMemo(
    () => new Map(dataset.documents.map((d) => [d.id, d])),
    [dataset.documents]
  );
  const authoritiesById = useMemo(
    () => new Map(dataset.authorities.map((a) => [a.id, a])),
    [dataset.authorities]
  );
  const classesById = useMemo(
    () => new Map(dataset.instrumentClasses.map((c) => [c.id, c])),
    [dataset.instrumentClasses]
  );
  const lifecyclesById = useMemo(
    () => new Map(dataset.lifecycles.map((l) => [l.id, l])),
    [dataset.lifecycles]
  );
  const bindingById = useMemo(
    () => new Map(dataset.bindingStatuses.map((b) => [b.id, b])),
    [dataset.bindingStatuses]
  );
  const leafLabels = useMemo(
    () =>
      new Map(
        dataset.branches.flatMap((b) => b.children.map((l) => [l.id, l.label] as [string, string]))
      ),
    [dataset.branches]
  );

  const years = useMemo(
    () => [...new Set(dataset.documents.map((d) => d.year))].sort((a, b) => b - a),
    [dataset.documents]
  );
  const referencedAuthorities = useMemo(() => {
    const used = new Set(dataset.documents.map((d) => d.issuing_authority));
    return dataset.authorities.filter((a) => used.has(a.id));
  }, [dataset]);
  const selectedBranch = dataset.branches.find((b) => b.id === branch);
  const todayIso = new Date().toISOString().slice(0, 10);

  const matches = (doc: DocRecord): boolean => {
    if (juris.length > 0 && !juris.includes(doc.jurisdiction)) return false;
    if (leaf && !doc.themes.includes(leaf)) return false;
    if (!leaf && branch && !doc.themes.some((t) => t.startsWith(branch + '.'))) return false;
    if (cls && doc.instrument_class !== cls) return false;
    if (binding && doc.binding_status !== binding) return false;
    if (lifecycle && doc.lifecycle !== lifecycle) return false;
    if (authority && doc.issuing_authority !== authority) return false;
    if (year && String(doc.year) !== year) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      const haystack = [
        doc.title,
        doc.title_ar,
        doc.official_title,
        doc.official_title_ar,
        doc.summary,
        doc.summary_ar,
        ...doc.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  };

  const results = dataset.documents.filter(matches);
  const hasFilters =
    q || juris.length > 0 || branch || leaf || cls || binding || lifecycle || authority || year;

  const clearAll = () => {
    setQ('');
    setJuris([]);
    setBranch('');
    setLeaf('');
    setCls('');
    setBinding('');
    setLifecycle('');
    setAuthority('');
    setYear('');
  };

  const toggleJur = (j: Jurisdiction) =>
    setJuris((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));

  return (
    <div>
      <div className="explorer-controls">
        <div className="controls-row">
          <input
            type="search"
            className="search-input"
            placeholder="Search titles, summaries, and tags in English or Arabic"
            aria-label="Search documents"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="jur-chips" role="group" aria-label="Filter by jurisdiction">
            {ALL_JURISDICTIONS.map((j) => (
              <button
                key={j}
                type="button"
                className={juris.includes(j) ? 'chip active' : 'chip'}
                aria-pressed={juris.includes(j)}
                title={JURISDICTION_NAMES[j]}
                onClick={() => toggleJur(j)}
              >
                {j}
              </button>
            ))}
          </div>
        </div>
        <div className="controls-row">
          <select
            className="filter-select"
            aria-label="Theme branch"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setLeaf('');
            }}
          >
            <option value="">All themes</option>
            {dataset.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          {selectedBranch && (
            <select
              className="filter-select"
              aria-label="Theme subcategory"
              value={leaf}
              onChange={(e) => setLeaf(e.target.value)}
            >
              <option value="">All {selectedBranch.label}</option>
              {selectedBranch.children.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
          <select
            className="filter-select"
            aria-label="Instrument class"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
          >
            <option value="">All instrument classes</option>
            {dataset.instrumentClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Binding status"
            value={binding}
            onChange={(e) => setBinding(e.target.value)}
          >
            <option value="">Any binding status</option>
            {dataset.bindingStatuses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Lifecycle"
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
          >
            <option value="">Any lifecycle</option>
            {dataset.lifecycles.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Issuing authority"
            value={authority}
            onChange={(e) => setAuthority(e.target.value)}
          >
            <option value="">Any authority</option>
            {referencedAuthorities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Any year</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="result-meta">
        <span aria-live="polite">
          {results.length} of {dataset.documents.length} entries
        </span>
        <div className="lang-toggle" role="group" aria-label="Content language">
          <button
            type="button"
            className={lang === 'en' ? 'active' : ''}
            aria-pressed={lang === 'en'}
            onClick={() => setLang('en')}
          >
            English
          </button>
          <button
            type="button"
            className={lang === 'ar' ? 'active' : ''}
            aria-pressed={lang === 'ar'}
            onClick={() => setLang('ar')}
            lang="ar"
          >
            العربية
          </button>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="empty-state">
          No entries match the current filters. Clear a filter or two, or contribute the missing
          instrument on GitHub.
        </p>
      ) : (
        <ol className="doc-list">
          {results.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              lang={lang}
              expanded={expanded === doc.id}
              onToggle={() => setExpanded(expanded === doc.id ? null : doc.id)}
              authority={authoritiesById.get(doc.issuing_authority)}
              instrumentClass={classesById.get(doc.instrument_class)}
              lifecycle={lifecyclesById.get(doc.lifecycle)}
              bindingStatus={bindingById.get(doc.binding_status)}
              leafLabels={leafLabels}
              docsById={docsById}
              todayIso={todayIso}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
