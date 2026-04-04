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

/* ── ٥-١ النماذج والسجلات ── */
const records: [string, string][] = [
  ['سجل تأخر الطلاب', 'توثيق حالات التأخر الصباحي مع التاريخ والوقت وإجراء المتابعة'],
  ['نموذج تحويل الحالة', 'تحويل حالات الغياب المتكرر للمرشد الطلابي مع بيان الإجراءات السابقة'],
  ['سجل غياب الطلاب', 'توثيق حالات الغياب اليومي مع العذر والمستند والإجراء المتخذ'],
  ['سجل استئذان الطلاب', 'توثيق حالات الاستئذان مع بيان السبب والمستلم وموافقة ولي الأمر'],
];

/* ── ٥-٢ إجراءات متابعة التأخر ── */
const tardinessProcedures = [
  'رصد الطالب المتأخر عند بوابة المدرسة وتوثيق وقت الحضور في السجل',
  'إشعار ولي الأمر هاتفياً أو عبر الرسائل النصية بتأخر ابنه',
  'عند تكرار التأخر ({count} مرات): استدعاء ولي الأمر وتوقيع تعهد خطي',
  'تحويل الحالة للمرشد الطلابي عند استمرار التأخر لدراسة الأسباب',
  'تطبيق إجراءات لائحة السلوك والمواظبة في حال عدم الاستجابة',
];

/* ── ٥-٣ إجراءات متابعة الغياب ── */
const absenceProcedures = [
  'رصد الغياب يومياً في الحصة الأولى وتسجيله في نظام نور',
  'التواصل مع ولي الأمر هاتفياً في نفس يوم الغياب للاستفسار عن السبب',
  'عند الغياب بدون عذر ({count} أيام): إرسال إشعار رسمي لولي الأمر',
  'عند تكرار الغياب ({count} أيام): استدعاء ولي الأمر وتوقيع تعهد',
  'تحويل الحالة للمرشد الطلابي لدراسة الأسباب ووضع خطة علاجية',
  'رفع الحالة لمدير المدرسة عند استنفاد جميع الإجراءات لاتخاذ القرار المناسب',
];

/* ── ٥-٤ إجراءات الاستئذان ── */
const permissionProcedures = [
  'تقديم ولي الأمر طلب الاستئذان مسبقاً (هاتفياً أو حضورياً)',
  'التحقق من هوية مستلم الطالب ومطابقتها مع بيانات ولي الأمر',
  'توثيق الاستئذان في السجل مع بيان: الاسم، الوقت، السبب، المستلم',
  'تسليم الطالب للمستلم المعتمد فقط وتوقيعه على سجل الاستلام',
  'إشعار المعلم بخروج الطالب من الفصل',
  'أرشفة طلبات الاستئذان ضمن ملف الطالب',
];

/* ── ٥-٥ إجراءات حسم درجات الغياب ── */
const deductionProcedures = [
  'التأكد من استكمال جميع إجراءات المتابعة قبل حسم الدرجات',
  'مراجعة سجل الغياب والتحقق من دقة البيانات والمستندات',
  'فرز حالات الغياب بعذر مقبول واستثناؤها من الحسم',
  'احتساب أيام الغياب بدون عذر مقبول وفق ضوابط اللائحة',
  'إعداد كشف حسم الدرجات ومراجعته مع مدير المدرسة',
  'إشعار ولي الأمر بالحسم قبل اعتماده رسمياً',
  'اعتماد كشف الحسم من مدير المدرسة',
  'توثيق الحسم في نظام نور وملف الطالب',
  'حفظ نسخة من كشف الحسم في سجلات المدرسة',
];

/* ── ٥-٦ حالات الغياب بعذر مقبول ── */
const acceptableAbsences: [string, string][] = [
  ['المرض المثبت بتقرير طبي', 'تقرير طبي من جهة صحية معتمدة'],
  ['وفاة أحد الأقارب من الدرجة الأولى', 'شهادة وفاة أو إفادة رسمية'],
  ['مراجعة مستشفى أو طوارئ', 'تقرير مراجعة من المستشفى مع التاريخ'],
  ['ظروف أمنية أو كوارث طبيعية', 'إفادة من الجهة المختصة (الدفاع المدني)'],
  ['مرافقة مريض من الأقارب من الدرجة الأولى', 'تقرير طبي يثبت الحالة وإفادة بالمرافقة'],
  ['أداء اختبارات رسمية خارج المدرسة', 'خطاب رسمي من الجهة المنظمة للاختبار'],
];

/* ── Helpers ── */
function StepTable({ title, num, steps }: { title: string; num: string; steps: string[] }) {
  return (
    <>
      <div style={h2Style}>{num} {title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{step.replace(/\{count\}/g, toIndic(3))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function GuideSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>القسم الخامس — الدليل الإجرائي لمتابعة الغياب والتأخر</div>

      {/* Source reference */}
      <div style={{
        background: '#EFF3F9', border: '1.5px solid #1B3A6B', borderRadius: 8,
        padding: '10px 14px', margin: '8px 0', fontSize: 12,
        fontWeight: 600, color: '#1B3A6B', textAlign: 'center',
      }}>
        المصدر: الدليل الإجرائي — العملية رقم {toIndic(8)} — الإصدار الثالث {toIndic(1437)}هـ
      </div>

      {/* ٥-١ النماذج والسجلات */}
      <div style={h2Style}>{toIndic(5)}-{toIndic(1)} النماذج والسجلات الرسمية</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={{ ...thStyle, width: 160 }}>السجل / النموذج</th>
            <th style={thStyle}>الوصف</th>
          </tr>
        </thead>
        <tbody>
          {records.map(([name, desc], i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{name}</td>
              <td style={tdStyle}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ٥-٢ to ٥-٥ */}
      <StepTable
        title="إجراءات متابعة التأخر"
        num={`${toIndic(5)}-${toIndic(2)}`}
        steps={tardinessProcedures}
      />
      <StepTable
        title="إجراءات متابعة الغياب"
        num={`${toIndic(5)}-${toIndic(3)}`}
        steps={absenceProcedures}
      />
      <StepTable
        title="إجراءات الاستئذان"
        num={`${toIndic(5)}-${toIndic(4)}`}
        steps={permissionProcedures}
      />
      <StepTable
        title="إجراءات حسم درجات الغياب"
        num={`${toIndic(5)}-${toIndic(5)}`}
        steps={deductionProcedures}
      />

      {/* ٥-٦ حالات الغياب بعذر مقبول */}
      <div style={h2Style}>{toIndic(5)}-{toIndic(6)} حالات الغياب والاستئذان بعذر مقبول</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4, marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>الحالة</th>
            <th style={{ ...thStyle, width: 220 }}>المستند المطلوب</th>
          </tr>
        </thead>
        <tbody>
          {acceptableAbsences.map(([caseName, doc], i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{caseName}</td>
              <td style={tdStyle}>{doc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
