/**
 * تقرير مشاركة الأسرة — المؤشر (٢-١-٣-١)
 */
import { toIndic, buildLetterheadHtml } from '../../../printUtils';
import { getPortfolioPrintCSS } from '../portfolioStyles';

export interface FamilyReportData {
  periodFrom: string;
  periodTo: string;
  totalMessages: number;
  sentCount: number;
  failedCount: number;
  parentExcuses: number;
  messagesByType: { type: string; count: number }[];
  monthlyMessages: { month: string; count: number }[];
}

/* ── helpers ── */

function buildBarChart(
  items: { label: string; value: number; color: string }[],
  maxValue: number,
): string {
  if (!items.length) return '';
  const safe = maxValue || 1;
  return items
    .map(
      (it) =>
        `<div class="chart-bar">
          <span class="chart-bar-label">${it.label}</span>
          <div class="chart-bar-fill" style="width:${Math.round((it.value / safe) * 100)}%;background:${it.color};"></div>
          <span class="chart-bar-value">${toIndic(it.value)}</span>
        </div>`,
    )
    .join('');
}

const TYPE_COLORS: string[] = [
  '#1B3A6B', '#1A6B3C', '#C05B00', '#B8860B', '#8B5CF6', '#0891B2', '#C0392B',
];

function buildRecommendations(data: FamilyReportData): string {
  const items: string[] = [];
  const sendRate = data.totalMessages ? (data.sentCount / data.totalMessages) * 100 : 0;

  if (sendRate >= 90) {
    items.push('نسبة الإرسال ممتازة — يوصى بالاستمرار في نهج التواصل الحالي');
  } else if (sendRate >= 75) {
    items.push('نسبة الإرسال جيدة — يوصى بمراجعة أسباب فشل الإرسال ومعالجتها');
  } else {
    items.push('نسبة الإرسال تحتاج تحسين — يوصى بمراجعة بيانات أولياء الأمور وتحديثها');
  }

  if (data.parentExcuses > 0) {
    items.push(
      `تفاعل أولياء الأمور إيجابي — ${toIndic(data.parentExcuses)} عذر مقدم خلال الفترة`,
    );
  } else {
    items.push('يوصى بتنويع قنوات التواصل وتفعيل آلية الاستجابة لأولياء الأمور');
  }

  return items
    .map((t) => `<div style="margin-bottom:4pt;">- ${t}</div>`)
    .join('');
}

/* ── main ── */

export function printFamilyReport(
  data: FamilyReportData,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const letterhead = buildLetterheadHtml(settings as any);

  const sendRate = data.totalMessages
    ? Math.round((data.sentCount / data.totalMessages) * 100)
    : 0;

  const maxTypeCount = Math.max(...data.messagesByType.map((m) => m.count), 1);
  const maxMonthly = Math.max(...data.monthlyMessages.map((m) => m.count), 1);

  const body = `
${letterhead}

<div style="text-align:center;margin:14pt 0 6pt;">
  <div style="font-size:14pt;font-weight:700;color:#1B3A6B;">تقرير مشاركة الأسرة — المؤشر (٢-١-٣-١)</div>
  <div style="font-size:11pt;color:#4A5568;margin-top:4pt;">الفترة: من ${data.periodFrom} إلى ${data.periodTo}</div>
</div>

<p class="body" style="font-size:12pt;text-align:justify;margin-bottom:12pt;">
يوثق هذا التقرير جهود المدرسة في تعزيز مشاركة الأسرة في العملية التعليمية، ويشمل إحصائيات التواصل مع أولياء الأمور عبر مختلف القنوات، ونسب الاستجابة، والبرامج المنفذة لإشراك الأسرة.
</p>

<!-- ١. ملخص التواصل -->
<h2 class="h2">ملخص التواصل</h2>
<table>
  <tbody>
    <tr><td class="lbl">إجمالي الرسائل</td><td class="cnt">${toIndic(data.totalMessages)}</td></tr>
    <tr><td class="lbl">المرسل بنجاح</td><td class="cnt">${toIndic(data.sentCount)}</td></tr>
    <tr><td class="lbl">الفاشل</td><td class="cnt">${toIndic(data.failedCount)}</td></tr>
    <tr><td class="lbl">نسبة الإرسال</td><td class="cnt">${toIndic(sendRate)}٪</td></tr>
    <tr><td class="lbl">أعذار أولياء الأمور</td><td class="cnt">${toIndic(data.parentExcuses)}</td></tr>
  </tbody>
</table>

<!-- ٢. التواصل حسب النوع -->
<h2 class="h2" style="margin-top:14pt;">التواصل حسب النوع</h2>
<table>
  <thead><tr><th>نوع التواصل</th><th style="text-align:center;">العدد</th></tr></thead>
  <tbody>
    ${data.messagesByType.map((m) => `<tr><td>${m.type}</td><td class="cnt">${toIndic(m.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.messagesByType.map((m, i) => ({
      label: m.type,
      value: m.count,
      color: TYPE_COLORS[i % TYPE_COLORS.length],
    })),
    maxTypeCount,
  )}
</div>

<!-- ٣. التواصل الشهري -->
<h2 class="h2" style="margin-top:14pt;">التواصل الشهري</h2>
<table>
  <thead><tr><th>الشهر</th><th style="text-align:center;">عدد الرسائل</th></tr></thead>
  <tbody>
    ${data.monthlyMessages.map((m) => `<tr><td>${m.month}</td><td class="cnt">${toIndic(m.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.monthlyMessages.map((m) => ({ label: m.month, value: m.count, color: '#1B3A6B' })),
    maxMonthly,
  )}
</div>

<!-- التوصيات -->
<h2 class="h2" style="margin-top:14pt;">التوصيات</h2>
<div class="box b" style="font-size:12pt;">
  ${buildRecommendations(data)}
</div>

<!-- التوقيعات -->
<div class="sign-row" style="margin-top:24pt;">
  <div class="sign-box">
    <div class="sign-ttl">وكيل شؤون الطلاب</div>
    <div class="sign-line"></div>
    <div class="sign-sub">التوقيع</div>
  </div>
  <div class="sign-box">
    <div class="sign-ttl">مدير المدرسة</div>
    <div class="sign-line"></div>
    <div class="sign-sub">التوقيع</div>
  </div>
</div>
`;

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>${css}</style></head><body>${body}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}
