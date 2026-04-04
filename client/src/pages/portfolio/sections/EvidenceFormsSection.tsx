import React from 'react';
import { toIndic } from '../../../utils/printUtils';

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1B3A6B', textAlign: 'center',
  paddingBottom: 7, marginBottom: 14, marginTop: 6,
  borderBottom: '2pt solid #1B3A6B',
};

/* ── Data ─────────────────────────────────────────────── */

interface FormInfo {
  number: number;
  title: string;
  description: string;
  indicators: string[];
  accentColor: string;
  icon: string;
}

const forms: FormInfo[] = [
  {
    number: 1,
    title: '\u0648\u062B\u064A\u0642\u0629 \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0645\u062F\u0631\u0633\u064A',
    description: '\u0648\u062B\u064A\u0642\u0629 \u0634\u0627\u0645\u0644\u0629 \u062A\u0648\u0636\u062D \u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0627\u0644\u0645\u062F\u0631\u0633\u064A \u0648\u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0633\u0644\u0648\u0643 \u0648\u0627\u0644\u0645\u0648\u0627\u0638\u0628\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629',
    indicators: ['(\u0663-\u0661-\u0662-\u0661)', '(\u0665-\u0661-\u0662-\u0663)'],
    accentColor: '#1B3A6B',
    icon: 'description',
  },
  {
    number: 2,
    title: '\u0633\u062C\u0644 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629',
    description: '\u0633\u062C\u0644 \u064A\u0648\u0645\u064A \u0644\u0631\u0635\u062F \u0627\u0644\u062D\u0636\u0648\u0631 \u0648\u0627\u0644\u063A\u064A\u0627\u0628 \u0648\u0627\u0644\u062A\u0623\u062E\u0631 \u0648\u0627\u0644\u0645\u062E\u0627\u0644\u0641\u0627\u062A \u0627\u0644\u0633\u0644\u0648\u0643\u064A\u0629 \u0648\u0627\u0644\u0625\u062C\u0631\u0627\u0621\u0627\u062A \u0627\u0644\u0645\u062A\u062E\u0630\u0629',
    indicators: ['(\u0663-\u0661-\u0662-\u0661)'],
    accentColor: '#2563eb',
    icon: 'event_note',
  },
  {
    number: 3,
    title: '\u0633\u062C\u0644 \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631',
    description: '\u0633\u062C\u0644 \u0645\u0648\u062B\u0642 \u0644\u062C\u0645\u064A\u0639 \u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0623\u0648\u0644\u064A\u0627\u0621 \u0627\u0644\u0623\u0645\u0648\u0631 (\u0631\u0633\u0627\u0626\u0644\u060C \u0645\u0643\u0627\u0644\u0645\u0627\u062A\u060C \u0632\u064A\u0627\u0631\u0627\u062A)',
    indicators: ['(\u0662-\u0661-\u0663-\u0661)'],
    accentColor: '#16a34a',
    icon: 'forum',
  },
  {
    number: 4,
    title: '\u0633\u062C\u0644 \u062D\u0648\u0627\u0641\u0632 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u062A\u0645\u064A\u0632\u064A\u0646',
    description: '\u0633\u062C\u0644 \u062A\u0643\u0631\u064A\u0645 \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0645\u0646\u0636\u0628\u0637\u064A\u0646 \u0648\u0627\u0644\u0645\u062A\u0645\u064A\u0632\u064A\u0646 \u0633\u0644\u0648\u0643\u064A\u0627\u064B \u0648\u0628\u0631\u0627\u0645\u062C \u0627\u0644\u062A\u0639\u0632\u064A\u0632 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A',
    indicators: ['(\u0665-\u0661-\u0662-\u0663)'],
    accentColor: '#B8860B',
    icon: 'emoji_events',
  },
  {
    number: 5,
    title: '\u0645\u0644\u062E\u0635 \u0627\u0644\u0625\u0646\u062C\u0627\u0632 \u0627\u0644\u0634\u0647\u0631\u064A',
    description: '\u062A\u0642\u0631\u064A\u0631 \u0634\u0647\u0631\u064A \u0634\u0627\u0645\u0644 \u064A\u0644\u062E\u0635 \u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0627\u0646\u0636\u0628\u0627\u0637 \u0648\u0627\u0644\u0625\u0646\u062C\u0627\u0632\u0627\u062A \u0648\u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A',
    indicators: ['(\u0663-\u0661-\u0662-\u0661)', '(\u0662-\u0661-\u0663-\u0661)', '(\u0661-\u0661-\u0665-\u0661)', '(\u0665-\u0661-\u0662-\u0663)'],
    accentColor: '#1e3a5f',
    icon: 'summarize',
  },
];

/* ── Card ─────────────────────────────────────────────── */

function FormCard({ form }: { form: FormInfo }) {
  const handlePrintBlank = () => {
    console.log(`Print blank form: ${form.title}`);
  };
  const handlePrintWithData = () => {
    console.log(`Print form with data: ${form.title}`);
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 8,
      border: '1px solid #E5E7EB',
      borderRight: `3px solid ${form.accentColor}`,
      padding: '14px 16px', marginBottom: 10,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: `${form.accentColor}14`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: form.accentColor }}>
          {form.icon}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1B3A6B', marginBottom: 4 }}>
          {'\u0627\u0644\u0646\u0645\u0648\u0630\u062C'} {toIndic(form.number)}: {form.title}
        </div>

        {/* Description */}
        <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7, marginBottom: 6 }}>
          {form.description}
        </div>

        {/* Indicator codes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {form.indicators.map((code, i) => (
            <span key={i} style={{
              display: 'inline-block', background: `${form.accentColor}14`,
              color: form.accentColor, fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 4, border: `1px solid ${form.accentColor}33`,
            }}>
              {code}
            </span>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handlePrintBlank}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: '#F3F4F6', border: '1px solid #D1D5DB',
              borderRadius: 6, padding: '4px 12px', fontSize: 11,
              fontWeight: 600, color: '#374151', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span>
            {'\u0637\u0628\u0627\u0639\u0629 \u0641\u0627\u0631\u063A'}
          </button>
          <button
            onClick={handlePrintWithData}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: form.accentColor, border: 'none',
              borderRadius: 6, padding: '4px 12px', fontSize: 11,
              fontWeight: 600, color: '#fff', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>print</span>
            {'\u0637\u0628\u0627\u0639\u0629 \u0628\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function EvidenceFormsSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>
        {'\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u062B\u0627\u0645\u0646'} {'\u2014'} {'\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0634\u0648\u0627\u0647\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629'}
      </div>

      {forms.map((form) => (
        <FormCard key={form.number} form={form} />
      ))}
    </div>
  );
}
