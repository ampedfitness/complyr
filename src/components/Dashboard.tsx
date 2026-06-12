import { useEffect, useMemo, useState } from 'react';
import type { Dataset, DocRecord, Jurisdiction } from '../lib/types';
import { JURISDICTION_NAMES } from '../lib/labels';
import RecordCard from './RecordCard';

interface Props {
  dataset: Dataset;
}

const ALL_JURISDICTIONS: Jurisdiction[] = ['BH', 'SA', 'AE', 'QA', 'KW', 'OM'];
type Sort = 'newest' | 'oldest' | 'title';

interface RailOption {
  id: string;
  label: string;
  count: number;
}

function RailRadio({
  label,
  options,
  value,
  onChange,
  allLabel,
  note,
}: {
  label: string;
  options: RailOption[];
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  note?: string;
}) {
  return (
    <div className="rail-group">
      <div className="rail-label">{label}</div>
      <button
        type="button"
        className={value === '' ? 'rail-opt active' : 'rail-opt'}
        onClick={() => onChange('')}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={value === o.id ? 'rail-opt active' : 'rail-opt'}
          onClick={() => onChange(value === o.id ? '' : o.id)}
        >
          {o.label} <span className="count">{o.count}</span>
        </button>
      ))}
      {note && <div className="rail-note">{note}</div>}
    </div>
  );
}

export default function Dashboard({ dataset }: Props) {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [countries, setCountries] = useState<Jurisdiction[]>([]);
  const [branch, setBranch] = useState('');
  const [leaf, setLeaf] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [authority, setAuthority] = useState('');
  const [cls, setCls] = useState('');
  const [binding, setBinding] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read filters from the URL once, so filtered views are shareable links.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const list = (k: string) => p.get(k)?.split(',').filter(Boolean) ?? [];
    setQ(p.get('q') ?? '');
    if (p.get('sort') === 'oldest' || p.get('sort') === 'title') setSort(p.get('sort') as Sort);
    setCountries(list('c').filter((x): x is Jurisdiction => ALL_JURISDICTIONS.includes(x as Jurisdiction)));
    setBranch(p.get('b') ?? '');
    setLeaf(p.get('l') ?? '');
    setYears(list('y'));
    setAuthority(p.get('a') ?? '');
    setCls(p.get('ic') ?? '');
    setBinding(p.get('bs') ?? '');
    setLifecycle(p.get('lc') ?? '');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (sort !== 'newest') p.set('sort', sort);
    if (countries.length) p.set('c', countries.join(','));
    if (branch) p.set('b', branch);
    if (leaf) p.set('l', leaf);
    if (years.length) p.set('y', years.join(','));
    if (authority) p.set('a', authority);
    if (cls) p.set('ic', cls);
    if (binding) p.set('bs', binding);
    if (lifecycle) p.set('lc', lifecycle);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [hydrated, q, sort, countries, branch, leaf, years, authority, cls, binding, lifecycle]);

  const docsById = useMemo(() => new Map(dataset.documents.map((d) => [d.id, d])), [dataset]);
  const authoritiesById = useMemo(
    () => new Map(dataset.authorities.map((a) => [a.id, a])),
    [dataset]
  );
  const classesById = useMemo(
    () => new Map(dataset.instrumentClasses.map((c) => [c.id, c])),
    [dataset]
  );
  const lifecyclesById = useMemo(() => new Map(dataset.lifecycles.map((l) => [l.id, l])), [dataset]);
  const bindingById = useMemo(
    () => new Map(dataset.bindingStatuses.map((b) => [b.id, b])),
    [dataset]
  );
  const leafLabels = useMemo(
    () =>
      new Map(
        dataset.branches.flatMap((b) => b.children.map((l) => [l.id, l.label] as [string, string]))
      ),
    [dataset]
  );

  const countOf = (pred: (d: DocRecord) => boolean) => dataset.documents.filter(pred).length;

  const branchOptions: RailOption[] = dataset.branches
    .map((b) => ({
      id: b.id,
      label: b.label,
      count: countOf((d) => d.themes.some((t) => t.startsWith(b.id + '.'))),
    }))
    .filter((b) => b.count > 0);
  const emptyBranchCount = dataset.branches.length - branchOptions.length;

  const leafOptions: RailOption[] = branch
    ? (dataset.branches.find((b) => b.id === branch)?.children ?? [])
        .map((l) => ({ id: l.id, label: l.label, count: countOf((d) => d.themes.includes(l.id)) }))
        .filter((l) => l.count > 0)
    : [];

  const yearOptions = useMemo(
    () => [...new Set(dataset.documents.map((d) => String(d.year)))].sort((a, b) => b.localeCompare(a)),
    [dataset]
  );

  const authorityOptions: RailOption[] = useMemo(() => {
    const used = new Set(dataset.documents.map((d) => d.issuing_authority));
    return dataset.authorities
      .filter((a) => used.has(a.id))
      .filter((a) => countries.length === 0 || countries.includes(a.jurisdiction))
      .map((a) => ({
        id: a.id,
        label: a.name,
        count: countOf((d) => d.issuing_authority === a.id),
      }));
  }, [dataset, countries]);

  // A country change can hide the selected authority; drop it rather than filter on a ghost.
  useEffect(() => {
    if (authority && !authorityOptions.some((a) => a.id === authority)) setAuthority('');
  }, [authority, authorityOptions]);

  const classOptions: RailOption[] = dataset.instrumentClasses
    .map((c) => ({ id: c.id, label: c.label, count: countOf((d) => d.instrument_class === c.id) }))
    .filter((c) => c.count > 0);

  const bindingOptions: RailOption[] = dataset.bindingStatuses
    .map((b) => ({ id: b.id, label: b.label, count: countOf((d) => d.binding_status === b.id) }))
    .filter((b) => b.count > 0);

  const lifecycleOptions: RailOption[] = dataset.lifecycles
    .map((l) => ({ id: l.id, label: l.label, count: countOf((d) => d.lifecycle === l.id) }))
    .filter((l) => l.count > 0);

  const matches = (doc: DocRecord): boolean => {
    if (countries.length > 0 && !countries.includes(doc.jurisdiction)) return false;
    if (leaf && !doc.themes.includes(leaf)) return false;
    if (!leaf && branch && !doc.themes.some((t) => t.startsWith(branch + '.'))) return false;
    if (years.length > 0 && !years.includes(String(doc.year))) return false;
    if (authority && doc.issuing_authority !== authority) return false;
    if (cls && doc.instrument_class !== cls) return false;
    if (binding && doc.binding_status !== binding) return false;
    if (lifecycle && doc.lifecycle !== lifecycle) return false;
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

  const results = dataset.documents.filter(matches).sort((a, b) => {
    if (sort === 'oldest') return a.date_issued.localeCompare(b.date_issued);
    if (sort === 'title') return a.title.localeCompare(b.title);
    return b.date_issued.localeCompare(a.date_issued);
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  const download = (content: string, name: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () =>
    download(
      JSON.stringify(results, null, 2),
      `complyr-export-${todayIso}.json`,
      'application/json'
    );

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'id', 'title', 'jurisdiction', 'instrument_class', 'binding_status', 'lifecycle',
      'themes', 'issuing_authority', 'date_issued', 'date_effective', 'compliance_deadline',
      'citation', 'summary', 'source_url', 'source_confidence', 'last_verified',
    ];
    const rows = results.map((d) =>
      [
        d.id, d.title, d.jurisdiction, d.instrument_class, d.binding_status, d.lifecycle,
        d.themes.join('; '), authoritiesById.get(d.issuing_authority)?.name ?? d.issuing_authority,
        d.date_issued, d.date_effective, d.compliance_deadline,
        d.citation, d.summary, d.source_url, d.source_confidence, d.last_verified,
      ]
        .map(esc)
        .join(',')
    );
    download([header.join(','), ...rows].join('\r\n'), `complyr-export-${todayIso}.csv`, 'text/csv');
  };

  interface ActiveChip {
    key: string;
    label: string;
    clear: () => void;
  }
  const activeChips: ActiveChip[] = [
    ...countries.map((c) => ({
      key: `c-${c}`,
      label: JURISDICTION_NAMES[c],
      clear: () => setCountries((prev) => prev.filter((x) => x !== c)),
    })),
    ...(leaf
      ? [{ key: 'leaf', label: leafLabels.get(leaf) ?? leaf, clear: () => setLeaf('') }]
      : branch
        ? [
            {
              key: 'branch',
              label: dataset.branches.find((b) => b.id === branch)?.label ?? branch,
              clear: () => {
                setBranch('');
                setLeaf('');
              },
            },
          ]
        : []),
    ...years.map((y) => ({
      key: `y-${y}`,
      label: y,
      clear: () => setYears((prev) => prev.filter((x) => x !== y)),
    })),
    ...(authority
      ? [
          {
            key: 'auth',
            label: authoritiesById.get(authority)?.name ?? authority,
            clear: () => setAuthority(''),
          },
        ]
      : []),
    ...(cls
      ? [{ key: 'cls', label: classesById.get(cls)?.label ?? cls, clear: () => setCls('') }]
      : []),
    ...(binding
      ? [
          {
            key: 'bind',
            label: bindingById.get(binding)?.label ?? binding,
            clear: () => setBinding(''),
          },
        ]
      : []),
    ...(lifecycle
      ? [
          {
            key: 'life',
            label: lifecyclesById.get(lifecycle)?.label ?? lifecycle,
            clear: () => setLifecycle(''),
          },
        ]
      : []),
  ];

  const clearAll = () => {
    setQ('');
    setCountries([]);
    setBranch('');
    setLeaf('');
    setYears([]);
    setAuthority('');
    setCls('');
    setBinding('');
    setLifecycle('');
  };

  const rail = (
    <aside className={railOpen ? 'rail open' : 'rail'} aria-label="Filters">
      {railOpen && (
        <button type="button" className="btn rail-close" onClick={() => setRailOpen(false)}>
          Close
        </button>
      )}
      <div className="rail-group">
        <div className="rail-label">Country</div>
        <div className="rail-chips" role="group" aria-label="Filter by country">
          {ALL_JURISDICTIONS.map((j) => (
            <button
              key={j}
              type="button"
              className={countries.includes(j) ? 'chip active' : 'chip'}
              aria-pressed={countries.includes(j)}
              title={JURISDICTION_NAMES[j]}
              onClick={() =>
                setCountries((prev) =>
                  prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]
                )
              }
            >
              {j}
            </button>
          ))}
        </div>
      </div>

      <div className="rail-group">
        <div className="rail-label">Category</div>
        <button
          type="button"
          className={branch === '' ? 'rail-opt active' : 'rail-opt'}
          onClick={() => {
            setBranch('');
            setLeaf('');
          }}
        >
          All categories
        </button>
        {branchOptions.map((b) => (
          <span key={b.id} style={{ display: 'contents' }}>
            <button
              type="button"
              className={branch === b.id && !leaf ? 'rail-opt active' : 'rail-opt'}
              onClick={() => {
                setBranch(branch === b.id ? '' : b.id);
                setLeaf('');
              }}
            >
              {b.label} <span className="count">{b.count}</span>
            </button>
            {branch === b.id &&
              leafOptions.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={leaf === l.id ? 'rail-opt sub active' : 'rail-opt sub'}
                  onClick={() => setLeaf(leaf === l.id ? '' : l.id)}
                >
                  {l.label} <span className="count">{l.count}</span>
                </button>
              ))}
          </span>
        ))}
        {emptyBranchCount > 0 && (
          <div className="rail-note">{emptyBranchCount} more branches await their first entries</div>
        )}
      </div>

      <div className="rail-group">
        <div className="rail-label">Year</div>
        <div className="rail-chips" role="group" aria-label="Filter by year">
          {yearOptions.map((y) => (
            <button
              key={y}
              type="button"
              className={years.includes(y) ? 'chip active' : 'chip'}
              aria-pressed={years.includes(y)}
              onClick={() =>
                setYears((prev) => (prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]))
              }
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <RailRadio
        label="Authority"
        options={authorityOptions}
        value={authority}
        onChange={setAuthority}
        allLabel="Any authority"
        note={countries.length > 0 ? 'Showing authorities from the selected countries' : undefined}
      />
      <RailRadio
        label="Instrument"
        options={classOptions}
        value={cls}
        onChange={setCls}
        allLabel="All instruments"
      />
      <RailRadio
        label="Binding status"
        options={bindingOptions}
        value={binding}
        onChange={setBinding}
        allLabel="Any status"
      />
      <RailRadio
        label="Lifecycle"
        options={lifecycleOptions}
        value={lifecycle}
        onChange={setLifecycle}
        allLabel="Any lifecycle"
      />
    </aside>
  );

  return (
    <div className="dash">
      {rail}
      <div>
        <button type="button" className="btn rail-toggle" onClick={() => setRailOpen(true)}>
          Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
        </button>
        <div className="dash-topbar">
          <input
            type="search"
            className="search-input"
            placeholder="Search titles, summaries, and tags in English or Arabic"
            aria-label="Search documents"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="filter-select"
            aria-label="Sort order"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A to Z</option>
          </select>
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
          <button type="button" className="btn" onClick={exportJson} title="Export the filtered records as JSON">
            Export JSON
          </button>
          <button type="button" className="btn" onClick={exportCsv} title="Export the filtered records as CSV">
            Export CSV
          </button>
        </div>

        <div className="active-filters">
          <span aria-live="polite">
            {results.length} of {dataset.documents.length} instruments
          </span>
          {activeChips.map((c) => (
            <button key={c.key} type="button" className="filter-chip" onClick={c.clear}>
              {c.label} <span className="x">&times;</span>
            </button>
          ))}
          {(activeChips.length > 0 || q) && (
            <button type="button" className="btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <p className="empty-state">
            No instruments match the current filters. Clear a filter or two, or try a different
            search.
          </p>
        ) : (
          <ol className="record-grid">
            {results.map((doc) => (
              <RecordCard
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
    </div>
  );
}
