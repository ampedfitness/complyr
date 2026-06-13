import { useState } from 'react';
import type { Authority, DocRecord, InstrumentClass, LabelledTerm } from '../lib/types';
import { CONFIDENCE_LABELS, JURISDICTION_NAMES } from '../lib/labels';
import FamilyTree from './FamilyTree';

interface Props {
  doc: DocRecord;
  lang: 'en' | 'ar';
  expanded: boolean;
  onToggle: () => void;
  authority: Authority | undefined;
  instrumentClass: InstrumentClass | undefined;
  lifecycle: LabelledTerm | undefined;
  bindingStatus: LabelledTerm | undefined;
  leafLabels: Map<string, string>;
  docsById: Map<string, DocRecord>;
  todayIso: string;
  activeThemes: string[];
}

function firstSentence(text: string): string {
  const idx = text.indexOf('. ');
  return idx === -1 ? text : text.slice(0, idx + 1);
}

function ArText({ en, ar, lang }: { en: string; ar: string | null; lang: 'en' | 'ar' }) {
  if (lang === 'ar' && ar) {
    return (
      <span lang="ar" dir="rtl" style={{ display: 'block' }}>
        {ar}
      </span>
    );
  }
  return <>{en}</>;
}

export default function RecordCard({
  doc,
  lang,
  expanded,
  onToggle,
  authority,
  instrumentClass,
  lifecycle,
  bindingStatus,
  leafLabels,
  docsById,
  todayIso,
  activeThemes,
}: Props) {
  const [copied, setCopied] = useState(false);
  const deadlineUpcoming = doc.compliance_deadline && doc.compliance_deadline >= todayIso;
  const detailId = `detail-${doc.id}`;
  const oneLiner =
    lang === 'ar' && doc.summary_ar ? firstSentence(doc.summary_ar) : firstSentence(doc.summary);
  const bulletLeaves = doc.theme_notes
    ? activeThemes.filter((t) => doc.theme_notes && doc.theme_notes[t]).slice(0, 3)
    : [];

  const copyCitation = async () => {
    if (!doc.citation) return;
    try {
      await navigator.clipboard.writeText(doc.citation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable; the citation stays selectable.
    }
  };

  return (
    <li className={expanded ? 'record-card expanded' : 'record-card'}>
      <button
        type="button"
        className="record-head"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={onToggle}
      >
        <span className="record-tags">
          <span className={`badge jur-${doc.jurisdiction}`} title={JURISDICTION_NAMES[doc.jurisdiction]}>
            {doc.jurisdiction}
          </span>
          <span className="pill">{instrumentClass?.label ?? doc.instrument_class}</span>
          {expanded && (
            <>
              <span className={`pill ${doc.binding_status}`}>
                {bindingStatus?.label ?? doc.binding_status}
              </span>
              <span className={`pill lifecycle-${doc.lifecycle}`}>
                {lifecycle?.label ?? doc.lifecycle}
              </span>
            </>
          )}
          {doc.source_confidence === 'pending_verification' && (
            <span className="pill confidence-pending_verification">Pending verification</span>
          )}
          <span className="year">{doc.year}</span>
        </span>
        <span className="record-title">
          <ArText en={doc.title} ar={doc.title_ar} lang={lang} />
        </span>
        {bulletLeaves.length > 0 ? (
          <ul className="record-bullets">
            {bulletLeaves.map((t) => (
              <li key={t}>
                <span className="bullet-leaf">{leafLabels.get(t) ?? t}</span>{' '}
                {doc.theme_notes![t]}
              </li>
            ))}
          </ul>
        ) : (
          <span
            className="record-line"
            lang={lang === 'ar' && doc.summary_ar ? 'ar' : undefined}
            dir={lang === 'ar' && doc.summary_ar ? 'rtl' : undefined}
          >
            {oneLiner}
          </span>
        )}
        {expanded && (
          <span className="record-meta">
            <span>{authority?.name ?? doc.issuing_authority}</span>
            {doc.date_issued && (
              <span>
                Issued <span className="mono">{doc.date_issued}</span>
              </span>
            )}
            {doc.date_effective && (
              <span>
                Effective <span className="mono">{doc.date_effective}</span>
              </span>
            )}
            <span>{doc.themes.map((t) => leafLabels.get(t) ?? t).join(', ')}</span>
          </span>
        )}
        {deadlineUpcoming && (
          <span className="deadline-flag">
            Compliance deadline <span className="mono">{doc.compliance_deadline}</span>
          </span>
        )}
      </button>

      {expanded && (
        <div className="record-detail" id={detailId}>
          <section className="detail-section">
            <h3>Summary</h3>
            <p>
              <ArText en={doc.summary} ar={doc.summary_ar} lang={lang} />
            </p>
          </section>

          {doc.impact_note && (
            <section className="detail-section">
              <h3>What this means</h3>
              <p>
                <ArText en={doc.impact_note} ar={doc.impact_note_ar} lang={lang} />
              </p>
            </section>
          )}

          {doc.obligations.length > 0 && (
            <section className="detail-section">
              <h3>Obligations</h3>
              <ul className="obligation-list">
                {doc.obligations.map((o, i) => (
                  <li key={i}>
                    <span className="who">{o.obligated_party}:</span> {o.description}
                    {o.deadline && (
                      <>
                        {' '}
                        <span className="when">{o.deadline}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {doc.applicability && (
            <section className="detail-section">
              <h3>Applicability</h3>
              <dl className="applicability-grid">
                {doc.applicability.entity_types && doc.applicability.entity_types.length > 0 && (
                  <div>
                    <dt>Applies to</dt>
                    <dd>{doc.applicability.entity_types.join(', ')}</dd>
                  </div>
                )}
                {doc.applicability.sectors && doc.applicability.sectors.length > 0 && (
                  <div>
                    <dt>Sectors</dt>
                    <dd>{doc.applicability.sectors.join(', ')}</dd>
                  </div>
                )}
                <div>
                  <dt>Extraterritorial</dt>
                  <dd>{doc.applicability.extraterritorial ? 'Yes' : 'No'}</dd>
                </div>
                {doc.applicability.penalties && (
                  <div>
                    <dt>Penalties</dt>
                    <dd>{doc.applicability.penalties}</dd>
                  </div>
                )}
                {doc.applicability.grace_period && (
                  <div>
                    <dt>Grace period</dt>
                    <dd>{doc.applicability.grace_period}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <section className="detail-section">
            <h3>Instrument family</h3>
            <FamilyTree doc={doc} docsById={docsById} lang={lang} />
          </section>

          {doc.citation && (
            <section className="detail-section">
              <h3>Citation</h3>
              <div className="citation-row">
                <code>{doc.citation}</code>
                <button type="button" className="btn" onClick={copyCitation}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </section>
          )}

          <section className="detail-section">
            <h3>Source</h3>
            <div className="source-row">
              {doc.gazette && (
                <span>
                  {doc.gazette.name}
                  {doc.gazette.number ? ` No. ${doc.gazette.number}` : ''}
                  {doc.gazette.issue_date ? (
                    <>
                      {', '}
                      <span className="mono">{doc.gazette.issue_date}</span>
                    </>
                  ) : null}
                </span>
              )}
              <a href={doc.source_url} rel="noopener">
                Official text
              </a>
              <span className="muted">{CONFIDENCE_LABELS[doc.source_confidence]}</span>
              {doc.last_verified && (
                <span className="muted">
                  Last verified <span className="mono">{doc.last_verified}</span>
                </span>
              )}
              {doc.language_of_official_text === 'ar' && doc.english_text_unofficial && (
                <span className="muted">Binding text is Arabic; English is an unofficial translation</span>
              )}
            </div>
          </section>
        </div>
      )}
    </li>
  );
}
