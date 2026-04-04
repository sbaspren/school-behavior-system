/**
 * تقرير حقوق المتعلمين وحمايتهم — المؤشر (١-١-٥-١)
 */
import { toIndic, buildLetterheadHtml } from '../../../printUtils';
import { getPortfolioPrintCSS } from '../portfolioStyles';

export interface RightsReportData {
  periodFrom: string;
  periodTo: string;
  totalViolations: number;
  highRiskCount: number;
  resolvedCount: number;
  violationsByType: { type: string; count: number }[];
  proceduresTaken: { procedure: string; count: number }[];
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

const VIOLATION_COLORS: string[] = [
  '#C0392B', '#E67E22', '#B8860B', '#1B3A6B', '#8B5CF6', '#0891B2', '#1A6B3C',
];

const PROCEDURE_COLORS: string[] = [
  '#1A6B3C', '#1B3A6B', '#0891B2', '#B8860B', '#8B5CF6', '#C05B00', '#C0392B',
];

function buildRecommendations(data: RightsReportData): string {
  const items: string[] = [];
  const resolutionRate = data.totalViolations
    ? Math.round((data.resolvedCount / data.totalViolations) * 100)
    : 100;

  if (resolutionRate >= 90) {
    items.push('نسبة المعالجة ممتازة — يوصى بتوثيق الإجراءات كنماذج مرجعية');
  } else if (resolutionRate >= 70) {
    items.push('نسبة المعالجة جيدة — يوصى بتسريع متابعة الحالات المعلقة');
  } else {
    items.push('نسبة المعالجة تحتاج تحسين — يوصى بمراجعة آلية المتابعة وتوزيع المهام');
  }

  if (data.highRiskCount > 0) {
    items.push(
      `يوجد ${toIndic(data.highRiskCount)} حالة عالية الخطورة — يوصى بالتنسيق مع الجهات المختصة والموجه الطلابي`,
    );
  } else {
    items.push('لا توجد حالات عالية الخطورة — يوصى بالاستمرار في البرامج الوقائية');
  }

  if (data.totalViolations === 0) {
    items.push('لم تسجل أي مخالفات خلال الفترة — بيئة مدرسية آمنة');
  }

  return items
    .map((t) => `<div style="margin-bottom:4pt;">- ${t}</div>`)
    .join('');
}

/* ── main ── */

export function printRightsReport(
  data: RightsReportData,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const letterhead = buildLetterheadHtml(settings as any);

  const resolutionRate = data.totalViolations
    ? Math.round((data.resolvedCount / data.totalViolations) * 100)
    : 100;

  const maxViolationType = Math.max(...data.violationsByType.map((v) => v.count), 1);
  const maxProcedure = Math.max(...data.proceduresTaken.map((p) => p.count), 1);

  const body = `
${letterhead}

<div style="text-align:center;margin:14pt 0 6pt;">
  <div style="font-size:14pt;font-weight:700;color:#1B3A6B;">تقرير حقوق المتعلمين وحمايتهم — المؤشر (١-١-٥-١)</div>
  <div style="font-size:11pt;color:#4A5568;margin-top:4pt;">الفترة: من ${data.periodFrom} إلى ${data.periodTo}</div>
</div>

<p class="body" style="font-size:12pt;text-align:justify;margin-bottom:12pt;">
يرصد هذا التقرير جهود المدرسة في حماية حقوق المتعلمين وضمان بيئة تعليمية آمنة، ويشمل إحصائيات رصد المخالفات ومؤشرات الخطر والإجراءات المتخذة لمعالجة الحالات وفق الأنظمة المعتمدة.
</p>

<!-- ١. ملخص الحالات -->
<h2 class="h2">ملخص الحالات</h2>
<table>
  <tbody>
    <tr><td class="lbl">إجمالي المخالفات المرصودة</td><td class="cnt">${toIndic(data.totalViolations)}</td></tr>
    <tr><td class="lbl">حالات عالية الخطورة</td><td class="cnt">${toIndic(data.highRiskCount)}</td></tr>
    <tr><td class="lbl">الحالات المعالجة</td><td class="cnt">${toIndic(data.resolvedCount)}</td></tr>
    <tr><td class="lbl">نسبة المعالجة</td><td class="cnt">${toIndic(resolutionRate)}٪</td></tr>
  </tbody>
</table>

<!-- ٢. المخالفات حسب النوع -->
<h2 class="h2" style="margin-top:14pt;">المخالفات حسب النوع</h2>
<table>
  <thead><tr><th>نوع المخالفة</th><th style="text-align:center;">العدد</th></tr></thead>
  <tbody>
    ${data.violationsByType.map((v) => `<tr><td>${v.type}</td><td class="cnt">${toIndic(v.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.violationsByType.map((v, i) => ({
      label: v.type,
      value: v.count,
      color: VIOLATION_COLORS[i % VIOLATION_COLORS.length],
    })),
    maxViolationType,
  )}
</div>

<!-- ٣. الإجراءات المتخذة -->
<h2 class="h2" style="margin-top:14pt;">الإجراءات المتخذة</h2>
<table>
  <thead><tr><th>الإجراء</th><th style="text-align:center;">العدد</th></tr></thead>
  <tbody>
    ${data.proceduresTaken.map((p) => `<tr><td>${p.procedure}</td><td class="cnt">${toIndic(p.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.proceduresTaken.map((p, i) => ({
      label: p.procedure,
      value: p.count,
      color: PROCEDURE_COLORS[i % PROCEDURE_COLORS.length],
    })),
    maxProcedure,
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
