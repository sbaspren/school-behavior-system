// ===== Print module barrel =====
// Re-exports every public symbol that was originally exported from printTemplates.ts.
// Existing imports like `from '../utils/printTemplates'` continue to work because
// printTemplates.ts is turned into a thin barrel that re-exports from this module.

import { toIndic, escapeHtml, adjustAllFields, buildLetterheadHtml, getFormTemplateCSS, getSharedPrintCSS } from '../printUtils';
import {
  type PrintFormData,
  type SchoolSettings,
  type FormId,
  FORM_NAMES,
  type ListReportRow,
  type ListReportConfig,
  type ReportSection,
  type SingleDetailConfig,
} from './printTypes';

// Import all per-form template & fill functions
import {
  getTemplateHtml_ishar_wali_amr, fillFormData_ishar_wali_amr,
  getTemplateHtml_tahood_slooki, fillFormData_tahood_slooki,
  getTemplateHtml_dawat_wali_amr, fillFormData_dawat_wali_amr,
  getTemplateHtml_mahdar_dab_wakea, fillFormData_mahdar_dab_wakea,
  getTemplateHtml_mahdar_lajnah, fillFormData_mahdar_lajnah,
  getTemplateHtml_mahdar_lajnah_absence, fillFormData_mahdar_lajnah_absence,
  getTemplateHtml_ehalat_talib, fillFormData_ehalat_talib,
  getTemplateHtml_group_ehala, fillFormData_group_ehala,
  getTemplateHtml_rasd_slooki, fillFormData_rasd_slooki,
  getTemplateHtml_tawid_darajat, fillFormData_tawid_darajat,
  getTemplateHtml_rasd_tamayuz, fillFormData_rasd_tamayuz,
  getTemplateHtml_ghiab_bidon_ozr, fillFormData_ghiab_bidon_ozr,
  getTemplateHtml_ghiab_ozr, fillFormData_ghiab_ozr,
  getTemplateHtml_tahood_hodoor, fillFormData_tahood_hodoor,
  getTemplateHtml_group_tahood, fillFormData_group_tahood,
  getTemplateHtml_iltizam_madrasi, fillFormData_iltizam_madrasi,
  getTemplateHtml_rasd_moalem, fillFormData_rasd_moalem,
  getTemplateHtml_high_risk, fillFormData_high_risk,
  getTemplateHtml_eblagh_etha, fillFormData_eblagh_etha,
  getTemplateHtml_khota_tadeel, fillFormData_khota_tadeel,
  getTemplateHtml_ehalat_absence, fillFormData_ehalat_absence,
  getTemplateHtml_tawtheeq_tawasol, fillFormData_tawtheeq_tawasol,
  getTemplateHtml_mashajara, fillFormData_mashajara,
} from './forms';

// ===== Re-export public types & constants =====
export type { PrintFormData, FormId, ListReportRow, ListReportConfig, ReportSection, SingleDetailConfig };
export { FORM_NAMES };

// Re-export SchoolSettings for internal use (not originally exported from printTemplates but needed)
export type { SchoolSettings };

// ===== Template dispatcher =====
function getTemplateHtml(formId: FormId): string {
  switch (formId) {
    case 'ishar_wali_amr': return getTemplateHtml_ishar_wali_amr();
    case 'tahood_slooki': return getTemplateHtml_tahood_slooki();
    case 'dawat_wali_amr': return getTemplateHtml_dawat_wali_amr();
    case 'mahdar_dab_wakea': return getTemplateHtml_mahdar_dab_wakea();
    case 'mahdar_lajnah': return getTemplateHtml_mahdar_lajnah();
    case 'mahdar_lajnah_absence': return getTemplateHtml_mahdar_lajnah_absence();
    case 'ehalat_talib': return getTemplateHtml_ehalat_talib();
    case 'group_ehala': return getTemplateHtml_group_ehala();
    case 'rasd_slooki': return getTemplateHtml_rasd_slooki();
    case 'tawid_darajat': return getTemplateHtml_tawid_darajat();
    case 'rasd_tamayuz': return getTemplateHtml_rasd_tamayuz();
    case 'ghiab_bidon_ozr': return getTemplateHtml_ghiab_bidon_ozr();
    case 'ghiab_ozr': return getTemplateHtml_ghiab_ozr();
    case 'tahood_hodoor': return getTemplateHtml_tahood_hodoor();
    case 'group_tahood': return getTemplateHtml_group_tahood();
    case 'iltizam_madrasi': return getTemplateHtml_iltizam_madrasi();
    case 'rasd_moalem': return getTemplateHtml_rasd_moalem();
    case 'high_risk': return getTemplateHtml_high_risk();
    case 'eblagh_etha': return getTemplateHtml_eblagh_etha();
    case 'khota_tadeel': return getTemplateHtml_khota_tadeel();
    case 'ehalat_absence': return getTemplateHtml_ehalat_absence();
    case 'tawtheeq_tawasol': return getTemplateHtml_tawtheeq_tawasol();
    case 'mashajara': return getTemplateHtml_mashajara();
    default:
      return `<div class="page-container"><div class="form-title">\u0646\u0645\u0648\u0630\u062C \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641: ${escapeHtml(formId)}</div></div>`;
  }
}

// ===== Fill dispatcher =====
function fillFormData(doc: Document, formId: FormId, data: PrintFormData): void {
  switch (formId) {
    case 'ishar_wali_amr': fillFormData_ishar_wali_amr(doc, data); break;
    case 'tahood_slooki': fillFormData_tahood_slooki(doc, data); break;
    case 'dawat_wali_amr': fillFormData_dawat_wali_amr(doc, data); break;
    case 'mahdar_dab_wakea': fillFormData_mahdar_dab_wakea(doc, data); break;
    case 'mahdar_lajnah': fillFormData_mahdar_lajnah(doc, data); break;
    case 'mahdar_lajnah_absence': fillFormData_mahdar_lajnah_absence(doc, data); break;
    case 'ehalat_talib': fillFormData_ehalat_talib(doc, data); break;
    case 'group_ehala': fillFormData_group_ehala(doc, data); break;
    case 'rasd_slooki': fillFormData_rasd_slooki(doc, data); break;
    case 'tawid_darajat': fillFormData_tawid_darajat(doc, data); break;
    case 'rasd_tamayuz': fillFormData_rasd_tamayuz(doc, data); break;
    case 'ghiab_bidon_ozr': fillFormData_ghiab_bidon_ozr(doc, data); break;
    case 'ghiab_ozr': fillFormData_ghiab_ozr(doc, data); break;
    case 'tahood_hodoor': fillFormData_tahood_hodoor(doc, data); break;
    case 'group_tahood': fillFormData_group_tahood(doc, data); break;
    case 'iltizam_madrasi': fillFormData_iltizam_madrasi(doc, data); break;
    case 'rasd_moalem': fillFormData_rasd_moalem(doc, data); break;
    case 'high_risk': fillFormData_high_risk(doc, data); break;
    case 'eblagh_etha': fillFormData_eblagh_etha(doc, data); break;
    case 'khota_tadeel': fillFormData_khota_tadeel(doc, data); break;
    case 'ehalat_absence': fillFormData_ehalat_absence(doc, data); break;
    case 'tawtheeq_tawasol': fillFormData_tawtheeq_tawasol(doc, data); break;
    case 'mashajara': fillFormData_mashajara(doc, data); break;
  }
}

// ===== makeEditable (toolbar + contenteditable) =====
function makeEditable(doc: Document): void {
  adjustAllFields(doc);

  doc.querySelectorAll('.data-field').forEach((el) => {
    (el as HTMLElement).setAttribute('contenteditable', 'true');
    (el as HTMLElement).style.cursor = 'text';
    (el as HTMLElement).style.outline = 'none';
  });

  const bar = doc.createElement('div');
  bar.id = 'edit-toolbar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:Tajawal,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3);direction:rtl';
  bar.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px;font-weight:700"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">edit</span> \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0623\u064A \u062D\u0642\u0644 \u0644\u062A\u0639\u062F\u064A\u0644\u0647 \u0642\u0628\u0644 \u0627\u0644\u0637\u0628\u0627\u0639\u0629</span></div>'
    + '<button onclick="document.getElementById(\'edit-toolbar\').style.display=\'none\';window.print()" style="padding:8px 24px;background:white;color:#4f46e5;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle">print</span> \u0637\u0628\u0627\u0639\u0629</button>';
  doc.body.insertBefore(bar, doc.body.firstChild);

  const style = doc.createElement('style');
  style.textContent = '@media print { #edit-toolbar { display:none !important; } }';
  doc.head.appendChild(style);
}

// ===== printListReport =====
/** بناء HTML صفوف جدول واحد */
function buildTableRows(rows: ListReportRow[], colCount: number): string {
  let html = '';
  let dataIdx = 0;
  for (const row of rows) {
    if (row.isSeparator) {
      html += `<tr class="sep-row"><td colspan="${colCount}"></td></tr>`;
      dataIdx = 0;
    } else if (row.isGroupHeader) {
      html += `<tr><td colspan="${colCount}" style="background:#eee;font-weight:700;padding:8px;font-size:12pt;border:1px solid #000;border-top:2px solid #333">${escapeHtml(row.groupLabel || '')}${row.groupCount !== undefined ? ' (' + toIndic(row.groupCount) + ')' : ''}</td></tr>`;
      dataIdx = 0;
    } else {
      const bgStyle = dataIdx % 2 === 1 ? ' style="background:#fafafa"' : '';
      html += `<tr${bgStyle}>` + row.cells.map(c => `<td class="data-cell">${c}</td>`).join('') + '</tr>';
      dataIdx++;
    }
  }
  return html;
}

export function printListReport(config: ListReportConfig, settings: SchoolSettings): void {
  const letterheadHtml = buildLetterheadHtml(settings);
  const css = getSharedPrintCSS();
  const showSigs = config.signatures !== false;

  const statsHtml = config.statsBar
    ? `<div style="border:2px solid #ccc;padding:8px 15px;margin:8px 0;font-size:13pt;font-weight:bold;text-align:center;background:#f9f9f9">${config.statsBar}</div>`
    : '';

  const summaryHtml = config.summary
    ? `<div style="border:2px solid #333;padding:10px 15px;margin-top:12px;font-weight:bold;font-size:13pt;background:#fafafa">${config.summary}</div>`
    : '';

  const signaturesHtml = showSigs
    ? `<div class="footer-block"><table style="width:100%;margin-top:30px;border:none"><tr>
        <td style="border:none;width:100%;text-align:left;padding-left:30px;vertical-align:top"><strong>\u0648\u0643\u064A\u0644 \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628</strong><br><span class="with-dots" style="min-width:150px"></span></td>
      </tr></table></div>`
    : '';

  // — حساب عدد الأعمدة للترويسة العلوية —
  const primaryColCount = config.sections
    ? Math.max(...config.sections.map(s => s.headers.length), 1)
    : config.headers.length;

  // — بناء محتوى الجداول —
  let tablesHtml: string;

  if (config.sections && config.sections.length > 0) {
    // ★ وضع الأقسام المنفصلة — كل قسم بجدوله وأعمدته
    tablesHtml = config.sections.map((sec, idx) => {
      const hCells = sec.headers.map(h =>
        `<th class="col-header" style="${h.width ? 'width:' + h.width : ''}">${escapeHtml(h.label)}</th>`
      ).join('');
      const bodyHtml = buildTableRows(sec.rows, sec.headers.length);
      return `<table class="main-table" style="${idx > 0 ? 'margin-top:18px' : ''}">`
        + `<thead><tr><td colspan="${sec.headers.length}" style="background:#f3f4f6;font-weight:700;padding:10px 12px;font-size:12pt;border:1px solid #000;border-bottom:2px solid #333">${escapeHtml(sec.title)}</td></tr>`
        + `<tr>${hCells}</tr></thead>`
        + `<tbody>${bodyHtml}</tbody></table>`;
    }).join('\n');
  } else {
    // ★ الوضع التقليدي — جدول موحّد (التوافق العكسي)
    const headerCells = config.headers.map(h =>
      `<th class="col-header" style="${h.width ? 'width:' + h.width : ''}">${escapeHtml(h.label)}</th>`
    ).join('');
    const rowsHtml = buildTableRows(config.rows, config.headers.length);
    tablesHtml = `<table class="main-table"><thead><tr>${headerCells}</tr></thead>`
      + `<tbody>${rowsHtml}</tbody></table>`;
  }

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">`
    + `<title>${escapeHtml(config.title)}</title>`
    + `<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Traditional+Arabic&display=swap" rel="stylesheet">`
    + `<style>${css}</style></head><body>`
    + `<table style="width:100%;border:none"><thead>`
    + `<tr><td colspan="${primaryColCount}" class="header-cell" style="border:none">`
    + letterheadHtml
    + `<div class="form-title">${escapeHtml(config.title)}</div>`
    + (config.subtitle ? `<div class="form-subtitle">${escapeHtml(config.subtitle)}</div>` : '')
    + `<div class="form-date">${escapeHtml(config.dateText)}</div>`
    + statsHtml
    + `</td></tr></thead></table>`
    + tablesHtml
    + summaryHtml
    + signaturesHtml
    + `</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ===== printSingleDetail =====
export function printSingleDetail(config: SingleDetailConfig, settings: SchoolSettings): void {
  const letterheadHtml = buildLetterheadHtml(settings);
  const css = getSharedPrintCSS();

  const fieldsHtml = config.fields.map(f =>
    `<tr><td style="background:#f5f5f5;font-weight:bold;width:25%;border:1px solid #ddd;padding:8px">${escapeHtml(f.label)}</td>`
    + `<td style="border:1px solid #ddd;padding:8px${f.ltr ? ';direction:ltr;text-align:right' : ''}">${escapeHtml(f.value)}</td></tr>`
  ).join('');

  const msgHtml = config.messageBody
    ? `<div style="border:1px solid #ccc;padding:15px;border-radius:5px;background:#fafafa;margin-top:15px">
        <div style="font-weight:bold;margin-bottom:10px;color:#555;font-size:14pt">${escapeHtml(config.messageTitle || '\u0646\u0635 \u0627\u0644\u0631\u0633\u0627\u0644\u0629:')}</div>
        <div style="white-space:pre-wrap;line-height:1.8;font-size:13pt">${escapeHtml(config.messageBody).replace(/\n/g, '<br>')}</div>
      </div>`
    : '';

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">`
    + `<title>${escapeHtml(config.title)}</title>`
    + `<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Traditional+Arabic&display=swap" rel="stylesheet">`
    + `<style>${css}
      @page{size:A4 portrait;margin:1.0cm}
      .page{max-width:210mm;margin:0 auto;padding:1.5cm}
    </style></head><body>`
    + `<div class="page">`
    + letterheadHtml
    + `<div class="form-title">${escapeHtml(config.title)}</div>`
    + `<table style="width:100%;margin-bottom:20px;font-size:14pt">${fieldsHtml}</table>`
    + msgHtml
    + `<div style="margin-top:40px;display:flex;justify-content:space-between;font-size:14pt;font-weight:bold">`
    + `<div>\u0648\u0643\u064A\u0644 \u0634\u0624\u0648\u0646 \u0627\u0644\u0637\u0644\u0627\u0628: <span class="with-dots" style="min-width:120px"></span></div>`
    + `<div>\u0627\u0644\u062A\u0627\u0631\u064A\u062E: ${escapeHtml(config.dateText)}</div>`
    + `</div></div></body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ===== printForm (main entry point) =====
export function printForm(formId: FormId, data: PrintFormData, settings: SchoolSettings): void {
  const templateHtml = getTemplateHtml(formId);
  const letterheadHtml = buildLetterheadHtml(settings);
  const css = getFormTemplateCSS();

  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">`
    + `<title>${escapeHtml(FORM_NAMES[formId] || formId)}</title>`
    + `<link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Traditional+Arabic&display=swap" rel="stylesheet">`
    + `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />`
    + `<style>${css}</style></head><body>${templateHtml}</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();

  win.document.querySelectorAll('.header-container').forEach((hc) => {
    if (settings.letterheadMode === 'text' || settings.letterheadMode === 'Text') {
      (hc as HTMLElement).style.border = 'none';
      (hc as HTMLElement).style.margin = '0';
      (hc as HTMLElement).style.padding = '0';
    }
    hc.innerHTML = letterheadHtml;
  });

  fillFormData(win.document, formId, data);

  setTimeout(() => {
    makeEditable(win.document);
  }, 300);
}
