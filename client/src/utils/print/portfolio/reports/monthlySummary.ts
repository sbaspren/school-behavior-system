/**
 * ملخص الإنجاز الشهري — النموذج ٥
 */
import { toIndic, buildLetterheadHtml } from '../../../printUtils';
import { getPortfolioPrintCSS } from '../portfolioStyles';

export interface MonthlySummaryData {
  month: string;
  academicYear: string;
  wakeelName: string;
  indicators: {
    name: string;
    code: string;
    color: string;
    activities: string[];
    evidence: string[];
    notes: string[];
  }[];
  strengths: string[];
  improvements: string[];
}

/* ── main ── */

export function printMonthlySummary(
  data: MonthlySummaryData,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const letterhead = buildLetterheadHtml(settings as any);

  const indicatorRows = data.indicators
    .map(
      (ind, i) => `
      <tr>
        <td class="num">${toIndic(i + 1)}</td>
        <td style="font-weight:700;color:${ind.color};white-space:nowrap;">
          <div>${ind.name}</div>
          <div style="font-size:9pt;color:#4A5568;font-weight:400;">${ind.code}</div>
        </td>
        <td>
          ${ind.activities.length ? ind.activities.map((a) => `<div style="margin-bottom:2pt;">- ${a}</div>`).join('') : '<span style="color:#999;">—</span>'}
        </td>
        <td>
          ${ind.evidence.length ? ind.evidence.map((e) => `<div style="margin-bottom:2pt;">- ${e}</div>`).join('') : '<span style="color:#999;">—</span>'}
        </td>
        <td>
          ${ind.notes.length ? ind.notes.map((n) => `<div style="margin-bottom:2pt;">- ${n}</div>`).join('') : '<span style="color:#999;">—</span>'}
        </td>
      </tr>`,
    )
    .join('');

  const strengthsList = data.strengths.length
    ? data.strengths.map((s) => `<div style="margin-bottom:3pt;">&#10003; ${s}</div>`).join('')
    : '<span style="color:#999;">لا توجد بيانات</span>';

  const improvementsList = data.improvements.length
    ? data.improvements.map((s) => `<div style="margin-bottom:3pt;">&#10003; ${s}</div>`).join('')
    : '<span style="color:#999;">لا توجد بيانات</span>';

  const body = `
${letterhead}

<div style="text-align:center;margin:14pt 0 6pt;">
  <div style="font-size:14pt;font-weight:700;color:#1B3A6B;">ملخص الإنجاز الشهري لوكيل شؤون الطلاب</div>
  <div style="font-size:11pt;color:#4A5568;margin-top:4pt;">النموذج ٥</div>
</div>

<!-- بيانات الشهر -->
<table style="width:80%;margin:0 auto 14pt;">
  <tbody>
    <tr>
      <td class="lbl" style="width:30%;">الشهر</td>
      <td class="cnt">${data.month}</td>
      <td class="lbl" style="width:30%;">العام الدراسي</td>
      <td class="cnt">${toIndic(data.academicYear)}</td>
    </tr>
    <tr>
      <td class="lbl">اسم الوكيل</td>
      <td class="cnt" colspan="3">${data.wakeelName}</td>
    </tr>
  </tbody>
</table>

<!-- جدول المؤشرات -->
<h2 class="h2">المؤشرات والأنشطة المنفذة</h2>
<table>
  <thead>
    <tr>
      <th style="text-align:center;width:18pt;">م</th>
      <th style="width:20%;">المؤشر</th>
      <th style="width:28%;">الأنشطة المنفذة</th>
      <th style="width:25%;">الشواهد الموثقة</th>
      <th style="width:22%;">ملاحظات وخطوات قادمة</th>
    </tr>
  </thead>
  <tbody>
    ${indicatorRows}
  </tbody>
</table>

<!-- جوانب القوة وفرص التحسين -->
<div style="display:flex;gap:12pt;margin-top:14pt;">
  <div style="flex:1;">
    <div class="box g">
      <div style="font-size:12pt;font-weight:700;color:#1A6B3C;margin-bottom:6pt;border-bottom:1pt solid #C5CFE0;padding-bottom:4pt;">جوانب القوة</div>
      <div style="font-size:11pt;">
        ${strengthsList}
      </div>
    </div>
  </div>
  <div style="flex:1;">
    <div class="box o">
      <div style="font-size:12pt;font-weight:700;color:#C05B00;margin-bottom:6pt;border-bottom:1pt solid #C5CFE0;padding-bottom:4pt;">فرص التحسين</div>
      <div style="font-size:11pt;">
        ${improvementsList}
      </div>
    </div>
  </div>
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
