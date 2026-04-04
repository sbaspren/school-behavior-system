import React, { useState } from 'react';
import { toIndic } from '../../../utils/printUtils';

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1B3A6B', textAlign: 'center',
  paddingBottom: 7, marginBottom: 14, marginTop: 6,
  borderBottom: '2pt solid #1B3A6B',
};
const h2Style: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: '#1B3A6B',
  margin: '12px 0 6px', paddingRight: 8, borderRight: '3px solid #1B3A6B',
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

const defaultData = [
  {
    program: '\u063A\u064A\u0627\u0628 \u0627\u0644\u0637\u0644\u0627\u0628',
    methods: '\u0631\u0633\u0627\u0626\u0644 \u0648\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u062A\u0648\u0639\u0648\u064A\u0629 \u0639\u0628\u0631 \u0642\u0646\u0648\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u062E\u062A\u0644\u0641\u0629',
    responsible: '\u0645\u0633\u0624\u0648\u0644 \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628',
    percentage: 95,
  },
  {
    program: '\u0639\u062F\u0645 \u0648\u0639\u064A \u0627\u0644\u0623\u0633\u0631',
    methods: '\u062D\u0635\u0631 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0643\u062B\u0631 \u063A\u064A\u0627\u0628\u0627\u064B \u0648\u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0623\u0645\u0648\u0631\u0647\u0645',
    responsible: '\u0627\u0644\u0645\u0648\u062C\u0647 + \u0627\u0644\u0645\u0639\u0644\u0645 + \u0645\u0633\u0624\u0648\u0644 \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628',
    percentage: 96,
  },
  {
    program: '\u0627\u0644\u0623\u0645\u0631\u0627\u0636 \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629',
    methods: '\u0631\u0633\u0627\u0626\u0644 \u0648\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u0635\u062D\u064A\u0629',
    responsible: '\u0627\u0644\u0645\u0648\u062C\u0647 \u0627\u0644\u0635\u062D\u064A + \u0645\u0633\u0624\u0648\u0644 \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628',
    percentage: 92,
  },
];

const guidanceSymbols = [
  ['\u0661 - \u0627\u0644\u0646\u0635\u062D \u0648\u0627\u0644\u0625\u0631\u0634\u0627\u062F', '\u0662 - \u0627\u0633\u062A\u062F\u0639\u0627\u0621 \u0648\u0644\u064A \u0627\u0644\u0623\u0645\u0631', '\u0663 - \u0625\u0631\u0634\u0627\u062F \u062C\u0645\u0639\u064A', '\u0664 - \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639 \u0645\u0639 \u0627\u0644\u0637\u0627\u0644\u0628', '\u0665 - \u0627\u0644\u062A\u062D\u0641\u064A\u0632 \u0648\u0627\u0644\u062A\u0631\u063A\u064A\u0628'],
  ['\u0666 - \u0625\u0634\u0631\u0627\u0643 \u0627\u0644\u0637\u0627\u0644\u0628 \u0641\u064A \u0627\u0644\u0642\u064A\u0627\u062F\u0629', '\u0667 - \u062C\u0644\u0633\u0629 \u0641\u0631\u062F\u064A\u0629', '\u0668 - \u062A\u063A\u0630\u064A\u0629 \u0631\u0627\u062C\u0639\u0629', '\u0669 - \u062A\u062D\u0641\u064A\u0632 \u0645\u0646 \u0627\u0644\u0625\u062F\u0627\u0631\u0629', '\u0661\u0660 - \u062F\u0631\u0627\u0633\u0629 \u062D\u0627\u0644\u0629'],
];

/* ── Types ─────────────────────────────────────────────── */

interface TreatmentRow {
  program: string;
  methods: string;
  responsible: string;
  percentage: number;
}

interface TreatmentSectionProps {
  improvementData?: TreatmentRow[];
  onPercentageChange?: (index: number, newValue: number) => void;
}

/* ── Percentage Badge ─────────────────────────────────── */

function percentColor(val: number): string {
  if (val >= 90) return '#16a34a';
  if (val >= 80) return '#ea8c00';
  return '#dc2626';
}

function PercentageCell({
  value,
  onChange,
}: {
  value: number;
  onChange?: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const color = percentColor(value);
  const icon = value >= 90 ? 'check_circle' : value >= 80 ? 'warning' : 'cancel';

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onChange?.(parsed);
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <td style={{ ...tdStyle, textAlign: 'center', padding: '3px 4px' }}>
        <input
          autoFocus
          type="number"
          min={0}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
          }}
          style={{
            width: 52, textAlign: 'center', fontSize: 12, fontWeight: 700,
            border: `1.5px solid ${color}`, borderRadius: 4, padding: '2px 4px',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
      </td>
    );
  }

  return (
    <td
      style={{ ...tdStyle, textAlign: 'center', cursor: onChange ? 'pointer' : 'default' }}
      onClick={() => { if (onChange) { setDraft(String(value)); setEditing(true); } }}
      title={onChange ? '\u0627\u0636\u063A\u0637 \u0644\u0644\u062A\u0639\u062F\u064A\u0644' : undefined}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 14, color }}
        >
          {icon}
        </span>
        <span style={{ fontWeight: 700, color }}>{toIndic(value)}%</span>
      </span>
    </td>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function TreatmentSection({
  improvementData,
  onPercentageChange,
}: TreatmentSectionProps) {
  const rows = improvementData ?? defaultData;

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>
        {'\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u0633\u0627\u062F\u0633'} {'\u2014'} {'\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0639\u0644\u0627\u062C \u0648\u0627\u0644\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0631\u0633\u0645\u064A\u0629'}
      </div>

      {/* Treatment plan table */}
      <div style={h2Style}>
        {'\u062E\u0637\u0629 \u0627\u0644\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u0639\u0644\u0627\u062C\u064A\u0629 \u0648\u0646\u0633\u0628 \u0627\u0644\u062A\u062D\u0633\u0646'}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>{'\u0645'}</th>
            <th style={thStyle}>{'\u0627\u0644\u0628\u0631\u0646\u0627\u0645\u062C'}</th>
            <th style={thStyle}>{'\u0623\u0633\u0627\u0644\u064A\u0628 \u0627\u0644\u0639\u0644\u0627\u062C'}</th>
            <th style={{ ...thStyle, width: 160 }}>{'\u0645\u0633\u0624\u0648\u0644 \u0627\u0644\u062A\u0646\u0641\u064A\u0630'}</th>
            <th style={{ ...thStyle, width: 90, textAlign: 'center' }}>{'\u0646\u0633\u0628\u0629 \u0627\u0644\u062A\u062D\u0633\u0646'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{row.program}</td>
              <td style={tdStyle}>{row.methods}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{row.responsible}</td>
              <PercentageCell
                value={row.percentage}
                onChange={onPercentageChange ? (v) => onPercentageChange(i, v) : undefined}
              />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Guidance symbols box */}
      <div style={h2Style}>
        {'\u0631\u0645\u0648\u0632 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0625\u0631\u0634\u0627\u062F\u064A\u0629'}
      </div>
      <div style={{
        background: '#F7F9FC', border: '1px solid #C5CFE0', borderRadius: 8,
        padding: '10px 14px', marginTop: 4,
      }}>
        {guidanceSymbols.map((line, li) => (
          <div key={li} style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            justifyContent: 'center', marginBottom: li < guidanceSymbols.length - 1 ? 6 : 0,
          }}>
            {line.map((item, ii) => (
              <span key={ii} style={{
                display: 'inline-block', background: '#fff',
                border: '1px solid #C5CFE0', borderRadius: 6,
                padding: '4px 12px', fontSize: 12, fontWeight: 600,
                color: '#1B3A6B', whiteSpace: 'nowrap',
              }}>
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
