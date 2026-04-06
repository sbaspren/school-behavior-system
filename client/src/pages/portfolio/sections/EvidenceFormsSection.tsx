import React from 'react';
import { toIndic, buildLetterheadHtml } from '../../../utils/printUtils';
import { useAppContext } from '../../../hooks/useAppContext';
import { printSection } from '../../../utils/print/portfolio';

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

function FormCard({ form, settings }: { form: FormInfo; settings: Record<string, string> }) {
  const handlePrintBlank = () => {
    const blankContent = getBlankFormHtml(form.number);
    printSection(`النموذج ${toIndic(form.number)}: ${form.title}`, blankContent, settings);
  };
  const handlePrintWithData = () => {
    // TODO: fetch real data and populate — for now prints blank with header
    const blankContent = getBlankFormHtml(form.number);
    printSection(`النموذج ${toIndic(form.number)}: ${form.title}`, blankContent, settings);
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

/* ── Blank form HTML generators ── */
function getBlankFormHtml(formNumber: number): string {
  const emptyRows = (count: number, cols: number) => {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<tr>';
      html += `<td class="num">${toIndic(i + 1)}</td>`;
      for (let j = 1; j < cols; j++) html += '<td style="height:24pt"></td>';
      html += '</tr>';
    }
    return html;
  };

  switch (formNumber) {
    case 1: // وثيقة إجراءات الانضباط
      return `
        <div class="box b" style="margin-bottom:10pt;font-size:11pt;">
          المؤشر المرتبط: <strong>(٣-١-٢-١) الانضباط المدرسي</strong> | المعيار: قيادة العملية التعليمية
        </div>
        <div style="background:#1B3A6B;color:#fff;padding:7pt 14pt;font-weight:700;font-size:12pt;">المستوى الأول — الإجراءات الوقائية</div>
        <table><tbody>${emptyRows(5, 2)}</tbody></table>
        <div style="background:#1A6B3C;color:#fff;padding:7pt 14pt;font-weight:700;font-size:12pt;margin-top:10pt;">المستوى الثاني — الإجراءات العلاجية</div>
        <table><tbody>${emptyRows(5, 2)}</tbody></table>
        <div style="background:#C05B00;color:#fff;padding:7pt 14pt;font-weight:700;font-size:12pt;margin-top:10pt;">المستوى الثالث — الإجراءات التصحيحية</div>
        <table><tbody>${emptyRows(4, 2)}</tbody></table>
        <div class="sign-row" style="margin-top:18pt;">
          <div class="sign-box"><div class="sign-ttl">مدير المدرسة</div><div class="sign-line"></div><div class="sign-sub">الاسم: .............. التوقيع: ..............</div></div>
          <div class="sign-box"><div class="sign-ttl">وكيل شؤون الطلاب</div><div class="sign-line"></div><div class="sign-sub">الاسم: .............. التوقيع: ..............</div></div>
          <div class="sign-box"><div class="sign-ttl">الموجه الطلابي</div><div class="sign-line"></div><div class="sign-sub">الاسم: .............. التوقيع: ..............</div></div>
        </div>`;

    case 2: // سجل المتابعة اليومية
      return `
        <table>
          <thead><tr><th style="width:18pt;text-align:center">م</th><th style="width:70pt">التاريخ</th><th style="width:25%">اسم الطالب</th><th style="width:50pt">الصف</th><th>المخالفة / السلوك</th><th>الإجراء المتخذ</th></tr></thead>
          <tbody>${emptyRows(12, 6)}</tbody>
        </table>
        <div class="sign-row" style="margin-top:14pt;">
          <div class="sign-box"><div class="sign-ttl">إجمالي المخالفات: ............</div></div>
          <div class="sign-box"><div class="sign-ttl">توقيع وكيل شؤون الطلاب</div><div class="sign-line"></div></div>
        </div>`;

    case 3: // سجل التواصل مع أولياء الأمور
      return `
        <table>
          <thead><tr><th style="width:18pt;text-align:center">م</th><th style="width:55pt">التاريخ</th><th style="width:25%">ولي الأمر / الطالب</th><th style="width:55pt">الوسيلة</th><th>موضوع التواصل</th><th style="width:50pt">النتيجة</th></tr></thead>
          <tbody>${emptyRows(10, 6)}</tbody>
        </table>
        <div class="sign-row" style="margin-top:14pt;">
          <div class="sign-box"><div class="sign-ttl">توقيع وكيل شؤون الطلاب</div><div class="sign-line"></div></div>
          <div class="sign-box"><div class="sign-ttl">اطلع عليه مدير المدرسة</div><div class="sign-line"></div></div>
        </div>`;

    case 4: // سجل حوافز الطلاب المتميزين
      return `
        <table>
          <thead><tr><th style="width:18pt;text-align:center">م</th><th style="width:55pt">التاريخ</th><th style="width:25%">اسم الطالب</th><th style="width:40pt">الصف</th><th>سبب التكريم</th><th style="width:70pt">نوع الحافز</th></tr></thead>
          <tbody>${emptyRows(10, 6)}</tbody>
        </table>
        <div class="sign-row" style="margin-top:14pt;">
          <div class="sign-box"><div class="sign-ttl">توقيع وكيل شؤون الطلاب</div><div class="sign-line"></div></div>
          <div class="sign-box"><div class="sign-ttl">اطلع عليه مدير المدرسة</div><div class="sign-line"></div></div>
        </div>`;

    case 5: // ملخص الإنجاز الشهري
      return `
        <div style="display:flex;gap:0;border:0.5pt solid #C5CFE0;">
          <div style="flex:1;padding:6pt 10pt;border-left:0.5pt solid #C5CFE0;"><span style="font-size:9pt;color:#777;">الشهر</span><div style="border-bottom:0.5pt solid #C5CFE0;height:16pt;"></div></div>
          <div style="flex:1;padding:6pt 10pt;border-left:0.5pt solid #C5CFE0;"><span style="font-size:9pt;color:#777;">العام الدراسي</span><div style="border-bottom:0.5pt solid #C5CFE0;height:16pt;"></div></div>
          <div style="flex:2;padding:6pt 10pt;"><span style="font-size:9pt;color:#777;">اسم الوكيل</span><div style="border-bottom:0.5pt solid #C5CFE0;height:16pt;"></div></div>
        </div>
        <table style="margin-top:8pt;">
          <thead><tr><th>المؤشر</th><th>الأنشطة المنفذة</th><th>الشواهد الموثقة</th><th>ملاحظات</th></tr></thead>
          <tbody>
            <tr><td style="font-weight:700;color:#1B3A6B;">الانضباط (٣-١-٢-١)</td><td style="height:30pt"></td><td></td><td></td></tr>
            <tr><td style="font-weight:700;color:#1A6B3C;">مشاركة الأسرة (٢-١-٣-١)</td><td style="height:30pt"></td><td></td><td></td></tr>
            <tr><td style="font-weight:700;color:#C05B00;">حقوق المتعلمين (١-١-٥-١)</td><td style="height:30pt"></td><td></td><td></td></tr>
            <tr><td style="font-weight:700;color:#B8860B;">التزام السلوك (٥-١-٢-٣)</td><td style="height:30pt"></td><td></td><td></td></tr>
          </tbody>
        </table>
        <div style="display:flex;gap:0;margin-top:8pt;">
          <div style="flex:1;padding:6pt 10pt;border:0.5pt solid #C5CFE0;"><span style="font-size:9pt;font-weight:700;color:#1B3A6B;">جوانب القوة:</span><div style="height:30pt;border-bottom:0.5pt dashed #C5CFE0;"></div></div>
          <div style="flex:1;padding:6pt 10pt;border:0.5pt solid #C5CFE0;border-right:none;"><span style="font-size:9pt;font-weight:700;color:#1B3A6B;">فرص التحسين:</span><div style="height:30pt;border-bottom:0.5pt dashed #C5CFE0;"></div></div>
        </div>
        <div class="sign-row" style="margin-top:14pt;">
          <div class="sign-box"><div class="sign-ttl">توقيع وكيل شؤون الطلاب</div><div class="sign-line"></div></div>
          <div class="sign-box"><div class="sign-ttl">اطلع عليه مدير المدرسة</div><div class="sign-line"></div></div>
        </div>`;

    default:
      return '<p>النموذج غير متاح</p>';
  }
}

export default function EvidenceFormsSection() {
  const { schoolSettings } = useAppContext();
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>
        {'\u0627\u0644\u0642\u0633\u0645 \u0627\u0644\u062B\u0627\u0645\u0646'} {'\u2014'} {'\u0646\u0645\u0627\u0630\u062C \u0627\u0644\u0634\u0648\u0627\u0647\u062F \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645\u0629'}
      </div>

      {forms.map((form) => (
        <FormCard key={form.number} form={form} settings={schoolSettings} />
      ))}
    </div>
  );
}
