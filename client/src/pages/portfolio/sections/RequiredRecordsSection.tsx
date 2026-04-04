import React from 'react';
import { toIndic } from '../../../utils/printUtils';
import type { CompletionData } from '../../../api/portfolio';

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1B3A6B', textAlign: 'center',
  paddingBottom: 7, marginBottom: 14, marginTop: 6,
  borderBottom: '2pt solid #1B3A6B',
};
const thStyle: React.CSSProperties = {
  background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px',
  fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0',
};
const tdStyle: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, textAlign: 'right',
  border: '0.5px solid #C5CFE0', verticalAlign: 'top',
  wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal',
};
const numCell: React.CSSProperties = {
  background: '#1B3A6B', color: '#fff', fontWeight: 700,
  textAlign: 'center', whiteSpace: 'nowrap', width: 18,
};

/* ── Data ─────────────────────────────────────────────── */

interface RecordRow {
  name: string;
  frequency: string;
  detailLabel?: string; // maps to CompletionData.indicators[].details[].label
}

interface IndicatorTable {
  code: string;
  title: string;
  color: string;
  indicatorIndex: number; // index in CompletionData.indicators
  records: RecordRow[];
}

const tables: IndicatorTable[] = [
  {
    code: '(\u0663-\u0661-\u0662-\u0661)',
    title: '\u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0645\u062F\u0631\u0633\u064A',
    color: '#1B3A6B',
    indicatorIndex: 0,
    records: [
      { name: '\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628 \u0627\u0644\u064A\u0648\u0645\u064A', frequency: '\u064A\u0648\u0645\u064A', detailLabel: '\u0633\u062C\u0644 \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628 \u0627\u0644\u064A\u0648\u0645\u064A\u0629 \u0645\u0646 \u0646\u0638\u0627\u0645 \u0646\u0648\u0631' },
      { name: '\u0633\u062C\u0644 \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629', frequency: '\u064A\u0648\u0645\u064A', detailLabel: '\u0633\u062C\u0644 \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629 \u0648\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0645\u062A\u062E\u0630\u0629' },
      { name: '\u0645\u062D\u0627\u0636\u0631 \u0627\u062C\u062A\u0645\u0627\u0639\u0627\u062A \u0644\u062C\u0646\u0629 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637', frequency: '\u0623\u0633\u0628\u0648\u0639\u064A', detailLabel: '\u0645\u062D\u0627\u0636\u0631 \u0627\u062C\u062A\u0645\u0627\u0639\u0627\u062A \u0644\u062C\u0646\u0629 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0645\u062F\u0631\u0633\u064A' },
      { name: '\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0623\u0633\u0628\u0648\u0639\u064A\u0629', frequency: '\u0623\u0633\u0628\u0648\u0639\u064A' },
      { name: '\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0634\u0647\u0631\u064A\u0629', frequency: '\u0634\u0647\u0631\u064A' },
      { name: '\u0648\u062B\u064A\u0642\u0629 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0645\u062F\u0631\u0633\u064A', frequency: '\u0641\u0635\u0644\u064A' },
      { name: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0641\u0635\u0644\u064A\u0629', frequency: '\u0641\u0635\u0644\u064A', detailLabel: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0648\u0627\u0644\u0641\u0635\u0644\u064A\u0629' },
    ],
  },
  {
    code: '(\u0662-\u0661-\u0663-\u0661)',
    title: '\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0623\u0633\u0631\u0629',
    color: '#1A6B3C',
    indicatorIndex: 1,
    records: [
      { name: '\u0633\u062C\u0644 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631', frequency: '\u064A\u0648\u0645\u064A', detailLabel: '\u0633\u062C\u0644 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 (\u0631\u0633\u0627\u0626\u0644\u060C \u0645\u0643\u0627\u0644\u0645\u0627\u062A\u060C \u0632\u064A\u0627\u0631\u0627\u062A)' },
      { name: '\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u0631\u0633\u0644\u0629', frequency: '\u0634\u0647\u0631\u064A' },
      { name: '\u0645\u062D\u0627\u0636\u0631 \u0645\u062C\u0627\u0644\u0633 \u0627\u0644\u0622\u0628\u0627\u0621', frequency: '\u0641\u0635\u0644\u064A' },
      { name: '\u062E\u0637\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629', frequency: '\u0641\u0635\u0644\u064A', detailLabel: '\u062E\u0637\u0629 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629' },
      { name: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644', frequency: '\u0634\u0647\u0631\u064A', detailLabel: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631' },
      { name: '\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u0643\u0629', frequency: '\u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629' },
    ],
  },
  {
    code: '(\u0661-\u0661-\u0665-\u0661)',
    title: '\u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646',
    color: '#C05B00',
    indicatorIndex: 2,
    records: [
      { name: '\u0633\u062C\u0644 \u0628\u0644\u0627\u063A\u0627\u062A \u0627\u0644\u062A\u0646\u0645\u0631 \u0648\u0627\u0644\u0639\u0646\u0641', frequency: '\u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629', detailLabel: '\u0633\u062C\u0644 \u0628\u0644\u0627\u063A\u0627\u062A \u0627\u0644\u062A\u0646\u0645\u0631 \u0648\u0627\u0644\u0639\u0646\u0641 \u0648\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0645\u062A\u062E\u0630\u0629' },
      { name: '\u0648\u062B\u064A\u0642\u0629 \u062D\u0642\u0648\u0642 \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646', frequency: '\u0641\u0635\u0644\u064A' },
      { name: '\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u062A\u0648\u0639\u0648\u064A\u0629', frequency: '\u0634\u0647\u0631\u064A' },
      { name: '\u0633\u062C\u0644 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629', frequency: '\u064A\u0648\u0645\u064A', detailLabel: '\u0633\u062C\u0644 \u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629 \u0645\u0639 \u0627\u0644\u0645\u0648\u062C\u0647 \u0627\u0644\u0637\u0644\u0627\u0628\u064A' },
      { name: '\u0627\u0633\u062A\u0628\u064A\u0627\u0646\u0627\u062A \u0642\u064A\u0627\u0633 \u0627\u0644\u0623\u0645\u0627\u0646', frequency: '\u0641\u0635\u0644\u064A' },
    ],
  },
  {
    code: '(\u0665-\u0661-\u0662-\u0663)',
    title: '\u0627\u0644\u062A\u0632\u0627\u0645 \u0627\u0644\u0645\u062A\u0639\u0644\u0645\u064A\u0646',
    color: '#B8860B',
    indicatorIndex: 3,
    records: [
      { name: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629', frequency: '\u0634\u0647\u0631\u064A', detailLabel: '\u0625\u062D\u0635\u0627\u0626\u064A\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629 \u0627\u0644\u0634\u0647\u0631\u064A\u0629 \u0648\u0627\u0644\u0641\u0635\u0644\u064A\u0629' },
      { name: '\u0633\u062C\u0644 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u062A\u0648\u0639\u0648\u064A\u0629 \u0648\u0627\u0644\u0625\u0631\u0634\u0627\u062F\u064A\u0629', frequency: '\u0634\u0647\u0631\u064A' },
      { name: '\u0634\u0647\u0627\u062F\u0627\u062A \u062A\u0643\u0631\u064A\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062A\u0645\u064A\u0632\u064A\u0646', frequency: '\u0634\u0647\u0631\u064A' },
      { name: '\u0627\u0644\u062E\u0637\u0637 \u0627\u0644\u0639\u0644\u0627\u062C\u064A\u0629 \u0644\u0644\u0637\u0644\u0627\u0628', frequency: '\u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629' },
    ],
  },
];

/* ── Types ─────────────────────────────────────────────── */

interface RequiredRecordsSectionProps {
  completionData?: CompletionData;
}

/* ── Helpers ─────────────────────────────────────────────── */

type RecordStatus = 'exists' | 'partial' | 'missing' | 'unknown';

function resolveStatus(
  record: RecordRow,
  indicator: CompletionData['indicators'][number] | undefined,
): RecordStatus {
  if (!indicator) return 'unknown';
  if (!record.detailLabel) return 'unknown';

  const detail = indicator.details.find(
    (d) => d.label === record.detailLabel || d.label.includes(record.detailLabel!),
  );
  if (!detail) return 'unknown';
  if (detail.exists && detail.count > 0) return 'exists';
  if (detail.count > 0) return 'partial';
  return 'missing';
}

function StatusBadge({ status }: { status: RecordStatus }) {
  if (status === 'unknown') {
    return <span style={{ fontSize: 14, color: '#9ca3af' }}>{'\u2610'}</span>;
  }
  if (status === 'exists') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#16a34a', fontWeight: 700, fontSize: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#16a34a' }}>check_circle</span>
        {'\u0645\u0648\u062C\u0648\u062F'}
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#ea8c00', fontWeight: 700, fontSize: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#ea8c00' }}>timelapse</span>
        {'\u062C\u0627\u0631\u064D'}
      </span>
    );
  }
  // missing
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#dc2626', fontWeight: 700, fontSize: 12 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#dc2626' }}>cancel</span>
      {'\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F'}
    </span>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function RequiredRecordsSection({ completionData }: RequiredRecordsSectionProps) {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>
        {'\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0633\u0627\u0628\u0639'} {'\u2014'} {'\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629 \u0644\u0643\u0644 \u0645\u0624\u0634\u0631'}
      </div>

      {tables.map((tbl, ti) => {
        const indicator = completionData?.indicators?.[tbl.indicatorIndex];

        return (
          <div key={ti} style={{ marginBottom: 16 }}>
            {/* Banner */}
            <div style={{
              background: tbl.color, color: '#fff', padding: '7px 14px',
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              marginTop: 10, marginBottom: 6,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{tbl.title}</span>
              <span style={{ fontSize: 11, opacity: 0.85 }}>{tbl.code}</span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 10 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, ...numCell, background: tbl.color, color: '#fff' }}>{'\u0645'}</th>
                  <th style={thStyle}>{'\u0627\u0644\u0633\u062C\u0644'}</th>
                  <th style={{ ...thStyle, width: 100, textAlign: 'center' }}>{'\u062F\u0648\u0631\u064A\u0629 \u0627\u0644\u062A\u062D\u062F\u064A\u062B'}</th>
                  <th style={{ ...thStyle, width: 110, textAlign: 'center' }}>{'\u0627\u0644\u062D\u0627\u0644\u0629'}</th>
                </tr>
              </thead>
              <tbody>
                {tbl.records.map((rec, ri) => {
                  const status = resolveStatus(rec, indicator);
                  return (
                    <tr key={ri} style={{ background: ri % 2 === 1 ? '#F7F9FC' : '#fff' }}>
                      <td style={{ ...tdStyle, ...numCell, background: tbl.color }}>{toIndic(ri + 1)}</td>
                      <td style={tdStyle}>{rec.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: 11, color: '#6b7280' }}>{rec.frequency}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
