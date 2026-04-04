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

/* ── ٣-٢ إجراءات العمل للانضباط المدرسي ── */
const workProcedures: [string, string, string][] = [
  ['إعداد خطة الانضباط المدرسي للعام الدراسي', 'وكيل شؤون الطلاب', 'قبل بداية العام الدراسي'],
  ['تشكيل لجنة الانضباط المدرسي واعتمادها', 'مدير المدرسة', 'الأسبوع الأول'],
  ['توزيع وثيقة الانضباط على الطلاب وأولياء الأمور', 'وكيل شؤون الطلاب', 'الأسبوع الأول'],
  ['عقد اجتماع توعوي للطلاب بقواعد السلوك والانضباط', 'وكيل شؤون الطلاب', 'الأسبوع الثاني'],
  ['تفعيل نظام رصد الحضور والغياب اليومي', 'وكيل شؤون الطلاب', 'يومياً'],
  ['التواصل مع أولياء أمور الطلاب المتغيبين', 'وكيل شؤون الطلاب', 'يومياً'],
  ['رصد المخالفات السلوكية وتوثيقها', 'وكيل شؤون الطلاب', 'يومياً'],
  ['عقد اجتماع لجنة الانضباط الدوري', 'وكيل شؤون الطلاب', 'أسبوعياً'],
  ['إعداد التقرير الأسبوعي للانضباط', 'وكيل شؤون الطلاب', 'نهاية كل أسبوع'],
  ['تكريم الطلاب المنضبطين', 'وكيل شؤون الطلاب', 'شهرياً'],
  ['إعداد التقرير الشهري للانضباط', 'وكيل شؤون الطلاب', 'نهاية كل شهر'],
  ['مراجعة خطة الانضباط وتحديثها', 'وكيل شؤون الطلاب', 'نهاية كل فصل'],
  ['إعداد التقرير الفصلي الشامل', 'وكيل شؤون الطلاب', 'نهاية كل فصل'],
  ['تنفيذ برامج التوعية السلوكية', 'وكيل شؤون الطلاب', 'على مدار العام'],
  ['أرشفة جميع السجلات والتقارير', 'وكيل شؤون الطلاب', 'نهاية العام الدراسي'],
];

/* ── ٣-٣ الإجراءات التفصيلية لتعزيز الانضباط ١٤٤٦هـ ── */
const detailedProcedures: [string, string, string][] = [
  ['إعداد قاعدة بيانات شاملة لجميع الطلاب وتحديثها', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['توزيع استمارة التعهد على أولياء الأمور وجمعها', 'وكيل شؤون الطلاب', 'المرشد الطلابي'],
  ['تعليق لوحات قواعد السلوك في جميع الفصول والممرات', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['تفعيل الإذاعة المدرسية للتوعية بأهمية الانضباط', 'رائد النشاط', 'وكيل شؤون الطلاب'],
  ['تنفيذ حصص إرشادية عن الانضباط في الفصول', 'المرشد الطلابي', 'وكيل شؤون الطلاب'],
  ['إعداد لوحة شرف شهرية للطلاب المنضبطين', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['تفعيل برنامج التحفيز الإيجابي للانضباط', 'وكيل شؤون الطلاب', 'المرشد الطلابي'],
  ['متابعة تطبيق المعلمين لسجل المتابعة السلوكية', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['تنظيم لقاءات دورية مع أولياء أمور الطلاب المتكرر غيابهم', 'وكيل شؤون الطلاب', 'المرشد الطلابي'],
  ['إعداد خطط علاجية فردية للطلاب ذوي المشكلات السلوكية', 'المرشد الطلابي', 'وكيل شؤون الطلاب'],
  ['تفعيل دور مجلس الآباء في دعم الانضباط', 'مدير المدرسة', 'وكيل شؤون الطلاب'],
  ['تنفيذ برامج التعزيز الإيجابي (شهادات، جوائز، رحلات)', 'وكيل شؤون الطلاب', 'رائد النشاط'],
  ['إعداد نشرات توعوية إلكترونية لأولياء الأمور', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['تقييم أثر البرامج التنفيذية على مستوى الانضباط', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['إعداد التقرير الختامي وتوصيات التطوير', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
  ['أرشفة الملف الإلكتروني والورقي لجميع الوثائق', 'وكيل شؤون الطلاب', 'مدير المدرسة'],
];

export default function ProceduresSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>القسم الثالث — لجنة الانضباط وإجراءات العمل</div>

      {/* ٣-٢ */}
      <div style={h2Style}>{toIndic(3)}-{toIndic(2)} إجراءات العمل للانضباط المدرسي</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>الإجراء</th>
            <th style={{ ...thStyle, width: 130 }}>مسؤول التنفيذ</th>
            <th style={{ ...thStyle, width: 120 }}>موعد التنفيذ</th>
          </tr>
        </thead>
        <tbody>
          {workProcedures.map(([proc, resp, time], i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{proc}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{resp}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{time}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ٣-٣ */}
      <div style={h2Style}>{toIndic(3)}-{toIndic(3)} الإجراءات التفصيلية لتعزيز الانضباط {toIndic(1446)}هـ</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>الإجراء</th>
            <th style={{ ...thStyle, width: 130 }}>مسؤول التنفيذ</th>
            <th style={{ ...thStyle, width: 130 }}>مسؤول المتابعة</th>
          </tr>
        </thead>
        <tbody>
          {detailedProcedures.map(([proc, exec, followup], i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{proc}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{exec}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{followup}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
