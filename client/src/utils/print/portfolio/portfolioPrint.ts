/**
 * طباعة صفحات ملف الإنجاز — الغلاف، الأقسام، الصور، الفواصل
 */
import { toIndic } from '../../printUtils';
import { getPortfolioPrintCSS } from './portfolioStyles';

/* ───── helpers ───── */

function openPrintWin(html: string): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function buildDoc(css: string, body: string): string {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>${css}</style></head><body>${body}</body></html>`;
}

/** الحصول على العام الهجري الحالي */
function currentHijriYear(): string {
  const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year: 'numeric' });
  const parts = fmt.formatToParts(new Date());
  const yearPart = parts.find((p) => p.type === 'year');
  return yearPart ? yearPart.value : '';
}

/** ترقيم عربي ١ ٢ ٣ ... */
const ARABIC_NUMS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];

/* ───── printCover ───── */

export function printCover(settings: Record<string, string>): void {
  const css = getPortfolioPrintCSS();
  const eduAdmin = settings.eduAdmin || 'الإدارة العامة للتعليم';
  const schoolName = settings.schoolName || '';
  const wakeelName = settings.wakeelName || settings.deputyName || '';
  const academicYear = settings.academicYear || '';
  const hijriYear = currentHijriYear();

  const tags = [
    'تعريف الدور',
    '٤ مؤشرات كاملة',
    'السجلات والشواهد',
    'لجنة الانضباط',
    'الدليل الإجرائي',
    'نماذج رسمية',
  ];

  const body = `
<div class="page cover-page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;text-align:center;">
  <!-- التسلسل الحكومي -->
  <div style="margin-bottom:24pt;line-height:2.2;">
    <div style="font-size:13pt;font-weight:700;">المملكة العربية السعودية</div>
    <div style="font-size:13pt;font-weight:700;">وزارة التعليم</div>
    <div style="font-size:13pt;font-weight:700;">${eduAdmin}</div>
    <div style="font-size:13pt;font-weight:700;">الشؤون التعليمية</div>
    <div style="font-size:13pt;font-weight:700;">${schoolName}</div>
  </div>

  <!-- العنوان الرئيسي -->
  <div style="font-size:22pt;font-weight:800;color:#1B3A5C;margin:18pt 0 8pt;">ملف إنجاز وكيل شؤون الطلاب</div>
  <div style="font-size:13pt;color:#555;margin-bottom:20pt;">توثيق أعمال عام ${toIndic(hijriYear)} هـ</div>

  <!-- الوسوم -->
  <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:6pt;margin-bottom:28pt;">
    ${tags.map((t) => `<span style="background:#EDF2F7;border:1pt solid #C5CFE0;border-radius:12pt;padding:3pt 10pt;font-size:10pt;color:#2D4A6F;">${t}</span>`).join('\n    ')}
  </div>

  <!-- جدول البيانات -->
  <table style="border-collapse:collapse;width:70%;margin:0 auto 24pt;font-size:12pt;">
    <tr>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;background:#F7FAFC;font-weight:700;width:40%;">اسم المدرسة</td>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;">${schoolName}</td>
    </tr>
    <tr>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;background:#F7FAFC;font-weight:700;">العام الدراسي</td>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;">${academicYear ? toIndic(academicYear) : toIndic(hijriYear) + ' هـ'}</td>
    </tr>
    <tr>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;background:#F7FAFC;font-weight:700;">اسم الوكيل</td>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;">${wakeelName}</td>
    </tr>
  </table>

  <!-- المراجع -->
  <div style="font-size:9pt;color:#999;margin-top:auto;padding-top:18pt;">
    المراجع: الدليل الإجرائي لوكيل شؤون الطلاب — وزارة التعليم
  </div>
</div>`;

  openPrintWin(buildDoc(css, body));
}

/* ───── printSection ───── */

export function printSection(
  title: string,
  htmlContent: string,
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const body = `
<div class="page" style="padding:20pt;">
  <div class="sec-title" style="font-size:16pt;font-weight:700;color:#1B3A5C;border-bottom:2pt solid #2D6BBF;padding-bottom:6pt;margin-bottom:14pt;">${title}</div>
  ${htmlContent}
</div>`;

  openPrintWin(buildDoc(css, body));
}

/* ───── printPhotos ───── */

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxPx = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;
      if (w > maxPx || h > maxPx) {
        const ratio = Math.min(maxPx / w, maxPx / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function buildPhotoGrid(images: string[], layout: 1 | 2 | 3 | 4 | 6, startIdx: number): string {
  const photoFrame = (src: string, idx: number) => `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <img src="${src}" style="max-width:100%;max-height:100%;object-fit:contain;border:1pt solid #C5CFE0;border-radius:3pt;" />
      <div style="font-size:10pt;color:#666;margin-top:4pt;">${ARABIC_NUMS[idx] || toIndic(idx + 1)}</div>
    </div>`;

  const gridStyles: Record<number, string> = {
    1: 'display:flex;justify-content:center;align-items:center;height:85%;',
    2: 'display:flex;flex-direction:column;gap:14pt;align-items:center;height:85%;justify-content:center;',
    3: 'display:grid;grid-template-columns:1fr 1fr;gap:14pt;align-items:center;justify-items:center;',
    4: 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:14pt;align-items:center;justify-items:center;',
    6: 'display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr 1fr;gap:10pt;align-items:center;justify-items:center;',
  };

  let html = `<div style="${gridStyles[layout] || gridStyles[4]}">`;

  images.forEach((src, i) => {
    const globalIdx = startIdx + i;
    // For layout=3, center the last image across 2 columns
    if (layout === 3 && i === 2) {
      html += `<div style="grid-column:1/3;display:flex;justify-content:center;">${photoFrame(src, globalIdx)}</div>`;
    } else {
      html += photoFrame(src, globalIdx);
    }
  });

  html += '</div>';
  return html;
}

export async function printPhotos(
  title: string,
  files: File[],
  layout: 1 | 2 | 3 | 4 | 6,
): Promise<void> {
  const css = getPortfolioPrintCSS();

  // Read and compress all files
  const compressed: string[] = [];
  for (const file of files) {
    const dataUrl = await readFileAsDataURL(file);
    const result = await compressImage(dataUrl);
    compressed.push(result);
  }

  // Split into pages based on layout
  const perPage = layout;
  const pages: string[] = [];

  for (let i = 0; i < compressed.length; i += perPage) {
    const chunk = compressed.slice(i, i + perPage);
    const grid = buildPhotoGrid(chunk, layout, i);
    pages.push(`
<div class="page" style="padding:20pt;min-height:100vh;">
  <div style="font-size:16pt;font-weight:700;color:#1B3A5C;text-align:center;margin-bottom:14pt;">${title}</div>
  ${grid}
</div>`);
  }

  openPrintWin(buildDoc(css, pages.join('\n')));
}

/* ───── printSeparator ───── */

export function printSeparator(
  title: string,
  indicatorCode: string,
  fields: { label: string; value: string }[],
  settings: Record<string, string>,
): void {
  const css = getPortfolioPrintCSS();
  const schoolName = settings.schoolName || '';

  const fieldsRows = fields
    .map(
      (f) => `
    <tr>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;background:#F7FAFC;font-weight:700;width:35%;">${f.label}</td>
      <td style="border:1pt solid #C5CFE0;padding:6pt 10pt;">${f.value}</td>
    </tr>`,
    )
    .join('');

  const body = `
<div class="page" style="padding:30pt 20pt;min-height:100vh;display:flex;flex-direction:column;">
  <!-- ترويسة المدرسة -->
  <div style="text-align:center;font-size:14pt;font-weight:700;color:#1B3A5C;margin-bottom:28pt;">${schoolName}</div>

  <!-- العنوان -->
  <div style="text-align:center;font-size:16pt;font-weight:700;color:#1B3A5C;margin-bottom:8pt;">${title}</div>
  <div style="text-align:center;font-size:12pt;color:#555;margin-bottom:24pt;">${indicatorCode}</div>

  <!-- جدول الحقول -->
  <table style="border-collapse:collapse;width:80%;margin:0 auto 28pt;font-size:12pt;">
    ${fieldsRows}
  </table>

  <!-- الملاحظة -->
  <div style="text-align:center;font-size:10pt;color:#888;margin-top:20pt;">
    * يُرفق بعد هذه الصفحة التقرير التفصيلي من المنفذ
  </div>

  <!-- التوقيع -->
  <div style="margin-top:auto;display:flex;justify-content:space-between;padding:0 40pt;font-size:11pt;">
    <div style="text-align:center;">
      <div style="font-weight:700;">وكيل شؤون الطلاب</div>
      <div style="margin-top:30pt;border-top:1pt solid #999;width:140pt;display:inline-block;"></div>
    </div>
    <div style="text-align:center;">
      <div style="font-weight:700;">التاريخ</div>
      <div style="margin-top:30pt;border-top:1pt solid #999;width:140pt;display:inline-block;"></div>
    </div>
  </div>
</div>`;

  openPrintWin(buildDoc(css, body));
}
