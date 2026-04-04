// ===== Form: rasd_slooki =====
import { toIndic, escapeHtml } from '../../printUtils';
import { PrintFormData, fillField, emptyRows } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_rasd_slooki(): string {
  return `<div class="page-container">${H}
<div class="form-title">استمارة رصد المخالفات السلوكية (ملف الطالب)</div>
<div class="form-body">
  <div class="section-block align-right" style="margin-bottom:15px;">اسم الطالب: <span class="data-field with-dots" style="min-width:60px;" id="rasd_s_studentName"></span> الصف: <span class="data-field with-dots" style="min-width:40px;" id="rasd_s_grade"></span> الفصل: <span class="data-field with-dots" style="min-width:40px;" id="rasd_s_class"></span></div>
  <table class="tracking-table"><thead><tr><th style="width:5%;">م</th><th style="width:25%;">المخالفة</th><th style="width:10%;">الدرجة</th><th style="width:15%;">التاريخ</th><th style="width:45%;">الإجراء المتخذ</th></tr></thead>
  <tbody id="rs_table_body">${emptyRows(8, 5)}</tbody></table>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span id="rs_deputy" class="with-dots" style="min-width:150px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
</div></div>`;
}

export function fillFormData_rasd_slooki(doc: Document, data: PrintFormData): void {
  fillField(doc, 'rasd_s_studentName', data.studentName);
      fillField(doc, 'rasd_s_grade', data.grade, true);
      fillField(doc, 'rasd_s_class', data.class, true);
      if (data.deputyName) fillField(doc, 'rs_deputy', data.deputyName);
      if (data.violationsList && data.violationsList.length > 0) {
        const tbody = doc.getElementById('rs_table_body');
        if (tbody) {
          tbody.innerHTML = '';
          data.violationsList.forEach((v, i) => {
            const tr = doc.createElement('tr');
            tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td>`
              + `<td style="text-align:right;padding-right:5px;">${escapeHtml(v.description)}</td>`
              + `<td class="indic-num">${toIndic(v.degree)}</td>`
              + `<td class="indic-num">${toIndic(v.date)}</td>`
              + `<td style="text-align:right;padding-right:5px;">${escapeHtml(v.procedures)}</td>`;
            tbody.appendChild(tr);
          });
        }
      }
}
