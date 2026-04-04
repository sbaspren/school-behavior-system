import React from 'react';
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

const summaryRows = [
  { code: '(٣-١-٢-١)', name: 'الانضباط المدرسي', standard: 'قيادة العملية التعليمية', domain: 'الإدارة المدرسية' },
  { code: '(٢-١-٣-١)', name: 'مشاركة الأسرة في تعلم أبنائهم', standard: 'المجتمع المدرسي', domain: 'الإدارة المدرسية' },
  { code: '(١-١-٥-١)', name: 'حقوق المتعلمين وحمايتهم', standard: 'حقوق المتعلم وحمايته', domain: 'الإدارة المدرسية' },
  { code: '(٥-١-٢-٣)', name: 'التزام المتعلمين بقواعد السلوك والانضباط', standard: 'التطور الشخصي والصحي', domain: 'نواتج التعلم' },
];

interface IndicatorData {
  code: string;
  title: string;
  color: string;
  description: string;
  procedures: string[];
  evidence: string[];
}

const indicators: IndicatorData[] = [
  {
    code: '(٣-١-٢-١)',
    title: 'المؤشر الأول: الانضباط المدرسي',
    color: '#1B3A6B',
    description: 'يُقاس هذا المؤشر بمدى تطبيق إجراءات الانضباط المدرسي وفق لائحة السلوك والمواظبة، ومتابعة الحضور والغياب يومياً، واتخاذ الإجراءات التصحيحية المناسبة لكل حالة.',
    procedures: [
      'إعداد وثيقة الانضباط المدرسي وتوزيعها على الطلاب وأولياء الأمور في بداية العام الدراسي',
      'رصد الحضور والغياب يومياً عبر نظام نور وتوثيق المخالفات السلوكية',
      'تطبيق إجراءات لائحة السلوك والمواظبة بشكل عادل ومتسق على جميع الطلاب',
      'التواصل الفوري مع أولياء أمور الطلاب المتغيبين والمتأخرين',
      'عقد اجتماعات دورية مع لجنة الانضباط لمراجعة الحالات واتخاذ القرارات',
      'إعداد تقارير أسبوعية وشهرية عن مستوى الانضباط ورفعها لمدير المدرسة',
    ],
    evidence: [
      'وثيقة الانضباط المدرسي المعتمدة والموزعة',
      'سجلات الحضور والغياب اليومية من نظام نور',
      'محاضر اجتماعات لجنة الانضباط المدرسي',
      'خطابات التواصل مع أولياء الأمور بشأن الغياب والتأخر',
      'التقارير الدورية المرفوعة لمدير المدرسة',
      'سجل المخالفات السلوكية والإجراءات المتخذة',
      'إحصائيات الانضباط الشهرية والفصلية',
    ],
  },
  {
    code: '(٢-١-٣-١)',
    title: 'المؤشر الثاني: مشاركة الأسرة في تعلم أبنائهم',
    color: '#1A6B3C',
    description: 'يُقاس هذا المؤشر بمدى تفعيل قنوات التواصل مع أولياء الأمور وإشراكهم في متابعة المستوى الأكاديمي والسلوكي لأبنائهم، وتنفيذ برامج الشراكة المجتمعية.',
    procedures: [
      'إعداد خطة التواصل مع أولياء الأمور وتفعيل القنوات الرسمية (رسائل نصية، واتساب، بريد إلكتروني)',
      'إرسال تقارير دورية لأولياء الأمور عن المستوى الأكاديمي والسلوكي لأبنائهم',
      'تنظيم لقاءات دورية مع أولياء الأمور (مجالس الآباء، اللقاءات الفردية)',
      'توثيق جميع عمليات التواصل مع أولياء الأمور في سجل خاص',
      'تفعيل دور مجلس الآباء والأمهات في دعم البيئة التعليمية',
      'إشراك أولياء الأمور في الأنشطة والبرامج المدرسية',
    ],
    evidence: [
      'خطة التواصل مع أولياء الأمور المعتمدة',
      'سجل التواصل مع أولياء الأمور (رسائل، مكالمات، زيارات)',
      'تقارير المستوى الأكاديمي والسلوكي المرسلة لأولياء الأمور',
      'محاضر اجتماعات مجالس الآباء واللقاءات الفردية',
      'إحصائيات التواصل مع أولياء الأمور',
      'صور وتوثيق الأنشطة والبرامج بمشاركة أولياء الأمور',
    ],
  },
  {
    code: '(١-١-٥-١)',
    title: 'المؤشر الثالث: حقوق المتعلمين وحمايتهم',
    color: '#C05B00',
    description: 'يُقاس هذا المؤشر بمدى تطبيق إجراءات حماية حقوق المتعلمين وتوفير بيئة تعليمية آمنة خالية من العنف والتنمر، وتعزيز القيم الإيجابية لدى الطلاب.',
    procedures: [
      'نشر وثيقة حقوق المتعلمين وشرحها للطلاب في بداية العام الدراسي',
      'تفعيل آليات الإبلاغ عن حالات التنمر والعنف وضمان سرية البلاغات',
      'تنفيذ برامج توعوية عن حقوق المتعلمين ومكافحة التنمر',
      'التحقيق الفوري في أي بلاغ واتخاذ الإجراءات المناسبة وفق اللوائح',
      'متابعة الحالات السلوكية بالتنسيق مع الموجه الطلابي',
      'توفير بيئة صفية آمنة وداعمة لجميع الطلاب',
      'إعداد تقارير دورية عن حالات الحماية والإجراءات المتخذة',
    ],
    evidence: [
      'وثيقة حقوق المتعلمين المعتمدة والمعلنة',
      'سجل بلاغات التنمر والعنف والإجراءات المتخذة',
      'تقارير البرامج التوعوية عن حقوق المتعلمين',
      'محاضر التحقيق في البلاغات والقرارات المتخذة',
      'سجل متابعة الحالات السلوكية مع الموجه الطلابي',
      'استبيانات قياس شعور الطلاب بالأمان في البيئة المدرسية',
      'التقارير الدورية المرفوعة عن حالات الحماية',
    ],
  },
  {
    code: '(٥-١-٢-٣)',
    title: 'المؤشر الرابع: التزام المتعلمين بقواعد السلوك والانضباط',
    color: '#B8860B',
    description: 'يُقاس هذا المؤشر بمدى التزام الطلاب بقواعد السلوك والانضباط المدرسي، ومستوى الوعي بأهمية الانضباط، وتكريم المتميزين سلوكياً.',
    procedures: [
      'نشر قواعد السلوك والانضباط في جميع مرافق المدرسة والفصول الدراسية',
      'تنفيذ برامج توعوية وإرشادية لتعزيز السلوك الإيجابي لدى الطلاب',
      'تكريم الطلاب المنضبطين والمتميزين سلوكياً بشكل دوري',
      'رصد مستوى الالتزام وإعداد إحصائيات دورية عن المخالفات السلوكية',
      'تنفيذ خطط علاجية للطلاب ذوي المشكلات السلوكية المتكررة',
    ],
    evidence: [
      'لوحات قواعد السلوك المعلقة في المرافق والفصول',
      'سجل البرامج التوعوية والإرشادية المنفذة',
      'شهادات وجوائز تكريم الطلاب المتميزين سلوكياً',
      'إحصائيات المخالفات السلوكية الشهرية والفصلية',
      'الخطط العلاجية للطلاب ذوي المشكلات السلوكية',
      'تقارير مستوى التزام الطلاب بقواعد السلوك',
    ],
  },
];

/* ── Helper ─────────────────────────────────────────────── */

function renderTable(headers: string[], rows: string[][], color?: string) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 10 }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              ...thStyle,
              ...(i === 0 ? { ...numCell, background: color || '#1B3A6B', color: '#fff' } : {}),
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 1 ? '#F7F9FC' : '#fff' }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{
                ...tdStyle,
                ...(ci === 0 ? numCell : {}),
              }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IndicatorBlock({ ind, index }: { ind: IndicatorData; index: number }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Banner */}
      <div style={{
        background: ind.color, color: '#fff', padding: '8px 14px',
        borderRadius: 8, fontSize: 13, fontWeight: 700,
        marginTop: 12, marginBottom: 6,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{ind.title}</span>
        <span style={{ fontSize: 11, opacity: 0.85 }}>{ind.code}</span>
      </div>

      {/* Description */}
      <div style={{
        background: '#F7F9FC', border: `1px solid ${ind.color}33`,
        borderRadius: 6, padding: '8px 12px', fontSize: 12,
        lineHeight: 1.9, marginBottom: 8,
      }}>
        {ind.description}
      </div>

      {/* Procedures */}
      <div style={{ ...h2Style, borderRightColor: ind.color, fontSize: 12, margin: '8px 0 4px' }}>
        إجراءات تحقيق المؤشر
      </div>
      {renderTable(
        ['م', 'الإجراء'],
        ind.procedures.map((p, i) => [toIndic(i + 1), p]),
        ind.color,
      )}

      {/* Evidence */}
      <div style={{ ...h2Style, borderRightColor: ind.color, fontSize: 12, margin: '8px 0 4px' }}>
        الشواهد والأدلة
      </div>
      {renderTable(
        ['م', 'الشاهد / الدليل'],
        ind.evidence.map((e, i) => [toIndic(i + 1), e]),
        ind.color,
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────── */

export default function IndicatorsSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>القسم الثاني — ملخص المؤشرات الأربعة</div>

      {/* Summary table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>رمز المؤشر</th>
            <th style={thStyle}>اسم المؤشر</th>
            <th style={thStyle}>المعيار</th>
            <th style={thStyle}>المجال</th>
          </tr>
        </thead>
        <tbody>
          {summaryRows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{r.code}</td>
              <td style={tdStyle}>{r.name}</td>
              <td style={tdStyle}>{r.standard}</td>
              <td style={tdStyle}>{r.domain}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Detailed indicators */}
      {indicators.map((ind, i) => (
        <IndicatorBlock key={i} ind={ind} index={i} />
      ))}
    </div>
  );
}
