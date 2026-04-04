/**
 * تقرير التزام المتعلمين بالسلوك — المؤشر (٥-١-٢-٣)
 */
import { toIndic, buildLetterheadHtml } from '../../../printUtils';
import { getPortfolioPrintCSS } from '../portfolioStyles';

export interface BehaviorComplianceData {
  periodFrom: string;
  periodTo: string;
  totalPositive: number;
  totalViolations: number;
  complianceRate: number;
  positiveByType: { type: string; count: number }[];
  topPositiveStudents: { name: string; grade: string; count: number }[];
  monthlyComparison: { month: string; positive: number; violations: number }[];
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

function buildDualBarChart(
  items: { label: string; positive: number; violations: number }[],
  maxValue: number,
): string {
  if (!items.length) return '';
  const safe = maxValue || 1;
  return items
    .map(
      (it) => `
        <div style="margin-bottom:6pt;">
          <div style="font-size:10pt;font-weight:700;margin-bottom:2pt;">${it.label}</div>
          <div class="chart-bar">
            <span class="chart-bar-label" style="min-width:60pt;">إيجابي</span>
            <div class="chart-bar-fill" style="width:${Math.round((it.positive / safe) * 100)}%;background:#1A6B3C;"></div>
            <span class="chart-bar-value">${toIndic(it.positive)}</span>
          </div>
          <div class="chart-bar">
            <span class="chart-bar-label" style="min-width:60pt;">مخالفات</span>
            <div class="chart-bar-fill" style="width:${Math.round((it.violations / safe) * 100)}%;background:#C0392B;"></div>
            <span class="chart-bar-value">${toIndic(it.violations)}</span>
          </div>
        </div>`,
    )
    .join('');
}

const POSITIVE_COLORS: string[] = [
  '#1A6B3C', '#0891B2', '#1B3A6B', '#B8860B', '#8B5CF6', '#C05B00', '#2563EB',
];

function buildRecommendations(data: BehaviorComplianceData): string {
  const items: string[] = [];

  if (data.complianceRate >= 90) {
    items.push('نسبة الالتزام ممتازة — يوصى بتعزيز البرامج التحفيزية وتكريم الطلاب المتميزين');
  } else if (data.complianceRate >= 75) {
    items.push('نسبة الالتزام جيدة — يوصى بالتركيز على الفئات الأقل التزاماً');
  } else {
    items.push('نسبة الالتزام تحتاج تحسين — يوصى بتفعيل برامج التوعية والمتابعة المكثفة');
  }

  if (data.totalPositive > data.totalViolations) {
    items.push('مؤشرات السلوك الإيجابي تفوق المخالفات — بيئة مدرسية صحية');
  } else if (data.totalViolations > 0) {
    items.push('يوصى بزيادة برامج السلوك الإيجابي لتحسين النسبة مقارنة بالمخالفات');
  }

  if (data.topPositiveStudents.length > 0) {
    items.push(
      `تم رصد ${toIndic(data.topPositiveStudents.length)} طالب متميز — يوصى بتكريمهم في الإذاعة المدرسية`,
    );
  }

  return items
    .map((t) => `<div style="margin-bottom:4pt;">- ${t}</div>`)
    .join('');
}

/* ── main ── */

export function printBehaviorComplianceReport(
  data: BehaviorComplianceData,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const letterhead = buildLetterheadHtml(settings as any);

  const maxPositiveType = Math.max(...data.positiveByType.map((p) => p.count), 1);
  const maxMonthly = Math.max(
    ...data.monthlyComparison.map((m) => Math.max(m.positive, m.violations)),
    1,
  );
  const topStudents = data.topPositiveStudents.slice(0, 10);

  const body = `
${letterhead}

<div style="text-align:center;margin:14pt 0 6pt;">
  <div style="font-size:14pt;font-weight:700;color:#1B3A6B;">تقرير التزام المتعلمين بالسلوك — المؤشر (٥-١-٢-٣)</div>
  <div style="font-size:11pt;color:#4A5568;margin-top:4pt;">الفترة: من ${data.periodFrom} إلى ${data.periodTo}</div>
</div>

<p class="body" style="font-size:12pt;text-align:justify;margin-bottom:12pt;">
يقيّم هذا التقرير مستوى التزام المتعلمين بقواعد السلوك والانضباط المدرسي، ويقارن بين مؤشرات السلوك الإيجابي والمخالفات السلوكية، مع رصد نسب التحسن وتكريم الطلاب المتميزين.
</p>

<!-- ١. ملخص السلوك -->
<h2 class="h2">ملخص السلوك</h2>
<table>
  <tbody>
    <tr><td class="lbl">إجمالي السلوك الإيجابي</td><td class="cnt">${toIndic(data.totalPositive)}</td></tr>
    <tr><td class="lbl">إجمالي المخالفات</td><td class="cnt">${toIndic(data.totalViolations)}</td></tr>
    <tr><td class="lbl">نسبة الالتزام</td><td class="cnt">${toIndic(data.complianceRate)}٪</td></tr>
  </tbody>
</table>

<!-- ٢. السلوك الإيجابي حسب النوع -->
<h2 class="h2" style="margin-top:14pt;">السلوك الإيجابي حسب النوع</h2>
<table>
  <thead><tr><th>النوع</th><th style="text-align:center;">العدد</th></tr></thead>
  <tbody>
    ${data.positiveByType.map((p) => `<tr><td>${p.type}</td><td class="cnt">${toIndic(p.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.positiveByType.map((p, i) => ({
      label: p.type,
      value: p.count,
      color: POSITIVE_COLORS[i % POSITIVE_COLORS.length],
    })),
    maxPositiveType,
  )}
</div>

<!-- ٣. أكثر الطلاب تميزاً -->
<h2 class="h2" style="margin-top:14pt;">أكثر الطلاب تميزاً في السلوك الإيجابي</h2>
<table>
  <thead><tr><th style="text-align:center;width:18pt;">م</th><th>اسم الطالب</th><th>الصف</th><th style="text-align:center;">عدد مرات التميز</th></tr></thead>
  <tbody>
    ${topStudents.map((s, i) => `<tr><td class="num">${toIndic(i + 1)}</td><td>${s.name}</td><td class="cnt">${s.grade}</td><td class="cnt">${toIndic(s.count)}</td></tr>`).join('')}
  </tbody>
</table>

<!-- ٤. المقارنة الشهرية -->
<h2 class="h2" style="margin-top:14pt;">المقارنة الشهرية (إيجابي / مخالفات)</h2>
<table>
  <thead><tr><th>الشهر</th><th style="text-align:center;">سلوك إيجابي</th><th style="text-align:center;">مخالفات</th></tr></thead>
  <tbody>
    ${data.monthlyComparison.map((m) => `<tr><td>${m.month}</td><td class="cnt">${toIndic(m.positive)}</td><td class="cnt">${toIndic(m.violations)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildDualBarChart(
    data.monthlyComparison.map((m) => ({
      label: m.month,
      positive: m.positive,
      violations: m.violations,
    })),
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
