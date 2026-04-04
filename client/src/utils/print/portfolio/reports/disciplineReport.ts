/**
 * تقرير الانضباط المدرسي — المؤشر (٣-١-٢-١)
 */
import { toIndic, buildLetterheadHtml } from '../../../printUtils';
import { getPortfolioPrintCSS } from '../portfolioStyles';

export interface DisciplineReportData {
  periodFrom: string;
  periodTo: string;
  totalStudents: number;
  totalAbsences: number;
  totalTardiness: number;
  totalViolations: number;
  totalPermissions: number;
  attendanceRate: number;
  violationsByDegree: { degree: string; count: number; color: string }[];
  topAbsentStudents: { name: string; grade: string; days: number }[];
  monthlyAttendance: { month: string; rate: number }[];
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

function buildRecommendations(data: DisciplineReportData): string {
  const items: string[] = [];
  if (data.attendanceRate >= 95) {
    items.push('نسبة الحضور ممتازة — يوصى بالاستمرار في البرامج التحفيزية الحالية');
  } else if (data.attendanceRate >= 90) {
    items.push('نسبة الحضور جيدة — يوصى بتكثيف التواصل مع أسر الطلاب الغائبين');
  } else {
    items.push('نسبة الحضور تحتاج تحسين — يوصى بتفعيل الخطة العلاجية وإشراك الأسرة');
  }
  const highRisk = data.violationsByDegree.filter(
    (v) => v.degree.includes('عالية') || v.degree.includes('خطيرة') || v.degree.includes('كبرى'),
  );
  const highCount = highRisk.reduce((s, v) => s + v.count, 0);
  if (highCount > 0) {
    items.push(
      `يوجد ${toIndic(highCount)} مخالفة عالية الخطورة — يوصى بمتابعة الحالات مع الموجه الطلابي`,
    );
  }
  return items
    .map((t) => `<div style="margin-bottom:4pt;">- ${t}</div>`)
    .join('');
}

/* ── main ── */

export function printDisciplineReport(
  data: DisciplineReportData,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const letterhead = buildLetterheadHtml(settings as any);

  const maxViolation = Math.max(...data.violationsByDegree.map((v) => v.count), 1);

  const topStudents = data.topAbsentStudents.slice(0, 10);

  const body = `
${letterhead}

<div style="text-align:center;margin:14pt 0 6pt;">
  <div style="font-size:14pt;font-weight:700;color:#1B3A6B;">تقرير الانضباط المدرسي — المؤشر (٣-١-٢-١)</div>
  <div style="font-size:11pt;color:#4A5568;margin-top:4pt;">الفترة: من ${data.periodFrom} إلى ${data.periodTo}</div>
</div>

<p class="body" style="font-size:12pt;text-align:justify;margin-bottom:12pt;">
يتضمن هذا التقرير ملخصاً شاملاً لمستوى الانضباط المدرسي خلال الفترة المحددة، ويشمل إحصائيات الحضور والغياب والتأخر والمخالفات السلوكية والاستئذان، مع تحليل مقارن لنسب الانضباط ورصد الحالات التي تحتاج متابعة خاصة.
</p>

<!-- ١. ملخص الانضباط العام -->
<h2 class="h2">ملخص الانضباط العام</h2>
<table>
  <tbody>
    <tr><td class="lbl">إجمالي الطلاب</td><td class="cnt">${toIndic(data.totalStudents)}</td></tr>
    <tr><td class="lbl">إجمالي أيام الغياب</td><td class="cnt">${toIndic(data.totalAbsences)}</td></tr>
    <tr><td class="lbl">إجمالي حالات التأخر</td><td class="cnt">${toIndic(data.totalTardiness)}</td></tr>
    <tr><td class="lbl">إجمالي المخالفات</td><td class="cnt">${toIndic(data.totalViolations)}</td></tr>
    <tr><td class="lbl">إجمالي الاستئذان</td><td class="cnt">${toIndic(data.totalPermissions)}</td></tr>
    <tr><td class="lbl">نسبة الحضور</td><td class="cnt">${toIndic(data.attendanceRate)}٪</td></tr>
  </tbody>
</table>

<!-- ٢. توزيع المخالفات حسب الدرجة -->
<h2 class="h2" style="margin-top:14pt;">توزيع المخالفات حسب الدرجة</h2>
<table>
  <thead><tr><th>الدرجة</th><th style="text-align:center;">العدد</th></tr></thead>
  <tbody>
    ${data.violationsByDegree.map((v) => `<tr><td>${v.degree}</td><td class="cnt">${toIndic(v.count)}</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.violationsByDegree.map((v) => ({ label: v.degree, value: v.count, color: v.color })),
    maxViolation,
  )}
</div>

<!-- ٣. أكثر الطلاب غياباً -->
<h2 class="h2">أكثر الطلاب غياباً</h2>
<table>
  <thead><tr><th style="text-align:center;width:18pt;">م</th><th>اسم الطالب</th><th>الصف</th><th style="text-align:center;">أيام الغياب</th></tr></thead>
  <tbody>
    ${topStudents.map((s, i) => `<tr><td class="num">${toIndic(i + 1)}</td><td>${s.name}</td><td class="cnt">${s.grade}</td><td class="cnt">${toIndic(s.days)}</td></tr>`).join('')}
  </tbody>
</table>

<!-- ٤. نسبة الحضور الشهرية -->
<h2 class="h2" style="margin-top:14pt;">نسبة الحضور الشهرية</h2>
<table>
  <thead><tr><th>الشهر</th><th style="text-align:center;">النسبة</th></tr></thead>
  <tbody>
    ${data.monthlyAttendance.map((m) => `<tr><td>${m.month}</td><td class="cnt">${toIndic(m.rate)}٪</td></tr>`).join('')}
  </tbody>
</table>
<div style="margin:8pt 0 14pt;">
  ${buildBarChart(
    data.monthlyAttendance.map((m) => ({ label: m.month, value: m.rate, color: '#1A6B3C' })),
    100,
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
