/**
 * CSS طباعة ملف الإنجاز — مطابق لإعدادات الملف المرجعي
 * A4, 1.27cm margins, Cairo font, RTL, Arabic numerals
 */
export function getPortfolioPrintCSS(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

@page {
  size: A4 portrait;
  margin: 1.27cm;
  @bottom-center {
    content: "― " counter(page) " ―";
    font-family: 'Cairo', Arial, sans-serif;
    font-size: 9pt;
    color: #888888;
  }
}
@page :first { @bottom-center { content: none; } }

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  direction: rtl;
  font-family: 'Cairo', 'Almarai', 'Tajawal', Arial, sans-serif;
  font-size: 14pt;
  color: #1A1A1A;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  line-height: 1.85;
  text-align: right;
  orphans: 2;
  widows: 2;
}

/* ── الصفحات ── */
.page {
  padding: 0; margin: 0;
  page-break-after: always;
  break-after: page;
  background: #ffffff;
}
.page:last-child { page-break-after: auto; break-after: auto; }

/* ── العناوين ── */
h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
.keep { break-inside: avoid; page-break-inside: avoid; }

.sec-title {
  font-size: 16pt; font-weight: 800; color: #1B3A6B;
  text-align: center; padding-bottom: 7pt; margin-bottom: 14pt; margin-top: 6pt;
  border-bottom: 2pt solid #1B3A6B;
  break-after: avoid; page-break-after: avoid;
}

h2.h2 {
  font-size: 14pt; font-weight: 700; color: #1B3A6B;
  margin: 12pt 0 6pt; padding-right: 8pt;
  border-right: 3pt solid #1B3A6B;
  break-after: avoid; page-break-after: avoid;
}

h3.h3 {
  font-size: 13pt; font-weight: 700; color: #1A1A1A;
  margin: 9pt 0 5pt;
  break-after: avoid; page-break-after: avoid;
}

/* ── الجداول ── */
table { width: 100%; border-collapse: collapse; break-inside: auto; font-size: 12pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; page-break-inside: avoid; }

table th {
  background: #E8ECF2; color: #1B3A6B; padding: 6pt 10pt;
  font-size: 12pt; font-weight: 700; text-align: right;
  border: 0.5pt solid #C5CFE0;
}
table td {
  padding: 5pt 10pt; font-size: 12pt; text-align: right;
  border: 0.5pt solid #C5CFE0; color: #1A1A1A; vertical-align: top;
  word-break: break-word; overflow-wrap: break-word; white-space: normal;
}
table tr:nth-child(even) td { background: #F5F7FB; }
table tr:nth-child(odd) td { background: #ffffff; }

td.num {
  background: #1B3A6B !important; color: #ffffff; font-weight: 700;
  text-align: center; white-space: nowrap; width: 18pt;
}
td.lbl {
  background: #EEF2F9 !important; font-weight: 700; color: #1B3A6B; white-space: nowrap;
}
td.code {
  background: #EEF2F9 !important; font-weight: 700; color: #1B3A6B;
  text-align: center; white-space: nowrap;
}
td.sml { font-size: 10pt; color: #4A5568; }
td.cnt { text-align: center; }

/* ── المربعات ── */
.box { padding: 8pt 12pt; margin-bottom: 8pt; font-size: 12pt; line-height: 1.9; }
.box.b   { background: #EEF3FA; border-right: 3pt solid #1B3A6B; }
.box.g   { background: #EEF8F2; border-right: 3pt solid #1A6B3C; }
.box.o   { background: #FFF3E8; border-right: 3pt solid #C05B00; }
.box.au  { background: #FFF8E8; border-right: 3pt solid #B8860B; }
.box.r   { background: #FFF0EE; border-right: 3pt solid #C0392B; font-weight: 700; }

.box-lbl { font-size: 9pt; color: #4A5568; margin-bottom: 3pt; }
.box-q { font-size: 13pt; font-weight: 700; line-height: 1.6; }
.box-q.blue { color: #1B3A6B; }
.box-q.green { color: #1A6B3C; }
.box-q.orange { color: #C05B00; }
.box-q.gold { color: #B8860B; }

/* ── بنر المؤشر ── */
.ind-banner { padding: 10pt 14pt; margin-bottom: 9pt; break-inside: avoid; }
.ind-banner.blue   { background: #1B3A6B; color: #fff; }
.ind-banner.green  { background: #1A6B3C; color: #fff; }
.ind-banner.orange { background: #C05B00; color: #fff; }
.ind-banner.gold   { background: #B8860B; color: #fff; }
.ind-n   { font-size: 9pt; opacity: .75; margin-bottom: 3pt; }
.ind-ttl { font-size: 15pt; font-weight: 800; line-height: 1.5; margin-bottom: 4pt; }
.ind-mt  { font-size: 8.5pt; opacity: .80; }

/* ── الغلاف ── */
.cover {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; min-height: 255mm; text-align: center; padding: 8mm 0;
}
.cover-govt { font-size: 10pt; color: #4A5568; line-height: 2.2; margin-bottom: 6pt; }
.cover-bar-thick { width: 110mm; height: 3pt; background: #1B3A6B; margin: 14pt auto; }
.cover-bar-thin  { width: 110mm; height: 1pt; background: #D0D8E8; margin: 14pt auto; }
.cover-title { font-size: 24pt; font-weight: 800; color: #1B3A6B; line-height: 1.5; margin-bottom: 8pt; }
.cover-year  { font-size: 16pt; font-weight: 700; color: #2E5FA3; margin-bottom: 8pt; }
.cover-tags { display: flex; flex-wrap: wrap; gap: 5pt; justify-content: center; margin-bottom: 24pt; }
.cover-tag  { border: 0.5pt solid #D0D8E8; padding: 3pt 10pt; font-size: 9pt; color: #4A5568; }
.cover-meta { width: 145mm; border-collapse: collapse; margin: 0 auto; font-size: 10pt; }
.cover-meta td { padding: 6pt 10pt; border: 0.5pt solid #D0D8E8; }
.cover-meta .lbl { background: #F0F4FB; font-weight: 700; color: #1B3A6B; width: 38mm; white-space: nowrap; }
.cover-ref { margin-top: 20pt; font-size: 8pt; color: #BBBBBB; line-height: 2; }

/* ── التوقيعات ── */
.sign-row { display: flex; border-top: 0.5pt solid #D0D8E8; margin-top: 10pt; break-inside: avoid; }
.sign-box { flex: 1; text-align: center; padding: 9pt 8pt; border-left: 0.5pt solid #D0D8E8; }
.sign-box:last-child { border-left: none; }
.sign-ttl  { font-size: 10pt; font-weight: 700; color: #1B3A6B; margin-bottom: 18pt; }
.sign-line { border-top: 0.5pt solid #1A1A1A; margin: 0 16pt; }
.sign-sub  { font-size: 8pt; color: #4A5568; margin-top: 3pt; }

/* ── فواصل ── */
.hr  { border: none; border-top: 0.5pt solid #D0D8E8; margin: 11pt 0; }
.hr2 { border: none; border-top: 2pt solid #1B3A6B; margin: 12pt 0; }
.sp4  { margin-top: 4pt; }
.sp8  { margin-top: 8pt; }
.sp12 { margin-top: 12pt; }
p.body { font-size: 14pt; line-height: 1.9; margin-bottom: 6pt; text-align: justify; }

.step-detail { font-size: 10pt; color: #4A5568; margin-top: 2pt; line-height: 1.7; }
.tbl-wrap { margin-bottom: 11pt; }

/* ── نماذج التعبئة ── */
.form-hdr { padding: 7pt 12pt; color: #ffffff; font-size: 13pt; font-weight: 700; break-after: avoid; }
.form-hdr.blue   { background: #1B3A6B; }
.form-hdr.green  { background: #1A6B3C; }
.form-hdr.gold   { background: #B8860B; }
.form-hdr.dkblue { background: #0D2545; }
table.form-tbl th { background: #E8ECF2; color: #1B3A6B; font-size: 10pt; padding: 5pt 9pt; }
table.form-tbl td { font-size: 10pt; padding: 0; height: 20pt; border: 0.5pt solid #C5CFE0; background: #ffffff !important; }

/* ── الفهرس ── */
.toc-table { width: 100%; border-collapse: collapse; margin-top: 10pt; }
.toc-table td { padding: 5pt 10pt; font-size: 12pt; border: 0.5pt solid #C5CFE0; }
.toc-s td { background: #EEF2F9; font-weight: 700; color: #1B3A6B; }
.toc-i td { background: #ffffff; }
.toc-i:nth-child(even) td { background: #F5F7FB; }
.toc-pg { text-align: center; width: 18mm; font-weight: 700; color: #1B3A6B; white-space: nowrap; }
.toc-indent { padding-right: 22pt !important; }

/* ── الصور ── */
.photo-grid { display: grid; gap: 10pt; }
.photo-grid.cols-1 { grid-template-columns: 1fr; }
.photo-grid.cols-2 { grid-template-columns: 1fr 1fr; }
.photo-grid.cols-3-top { grid-template-columns: 1fr 1fr; }
.photo-frame {
  border: 1pt solid #C5CFE0; border-radius: 3pt; overflow: hidden;
  display: flex; flex-direction: column; align-items: center;
}
.photo-frame img {
  max-width: 100%; max-height: 100%; object-fit: contain;
}
.photo-num {
  font-size: 10pt; color: #4A5568; text-align: center; padding: 4pt 0;
}

/* ── الرسوم البيانية (ملونة) ── */
.chart-bar {
  display: flex; align-items: center; gap: 8pt; margin-bottom: 4pt;
}
.chart-bar-label { font-size: 10pt; min-width: 80pt; text-align: right; }
.chart-bar-fill { height: 16pt; border-radius: 3pt; min-width: 2pt; }
.chart-bar-value { font-size: 10pt; font-weight: 700; }

@media print {
  body { background: #ffffff; padding: 0; }
  .no-print { display: none !important; }
}
`;
}
