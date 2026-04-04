// ===== Form: group_ehala =====
import { toIndic, escapeHtml, shortenName } from '../../printUtils';
import { PrintFormData, fillField, emptyRows } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_group_ehala(): string {
  return `<div class="page-container">${H}
<div class="form-title">نموذج إحالة للموجه الطلابي</div>
<div class="form-body">
  <div class="section-block" style="text-align:center;">التاريخ: <span id="ge_date" class="data-field with-dots indic-num" style="min-width:120px;"></span></div>
  <div class="section-block align-right"><strong>المكرم الموجه الطلابي.. وفقكم الله</strong></div>
  <div class="section-block align-right">نحيل إليكم بيان بأسماء الطلاب الذين تجاوزوا حد الغياب المسموح، لمتابعة حالاتهم واتخاذ اللازم.</div>
  <table class="tracking-table"><thead><tr><th style="width:5%;">م</th><th style="width:22%;">اسم الطالب</th><th style="width:13%;">الصف</th><th style="width:10%;">بدون عذر</th><th style="width:10%;">بعذر</th><th style="width:40%;">ما تم حيال الطالب (من الموجه)</th></tr></thead>
  <tbody id="ge_table_body">${emptyRows(8, 6)}</tbody></table>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span id="ge_deputy" class="with-dots" style="min-width:150px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
</div></div>`;
}

export function fillFormData_group_ehala(doc: Document, data: PrintFormData): void {
  const d = new Date();
      const dn = d.toLocaleDateString('ar-SA', { weekday: 'long' });
      const ds = data.violationDate || d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura');
      fillField(doc, 'ge_date', dn + ' ' + ds, true);
      if (data.deputyName) fillField(doc, 'ge_deputy', data.deputyName);
      if (data.studentsList && data.studentsList.length > 0) {
        const tbody = doc.getElementById('ge_table_body');
        if (tbody) {
          tbody.innerHTML = '';
          data.studentsList.forEach((s, i) => {
            const tr = doc.createElement('tr');
            tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td>`
              + `<td style="text-align:right;padding-right:5px;font-weight:bold;">${escapeHtml(shortenName(s.name))}</td>`
              + `<td>${escapeHtml(s.grade || '')}</td>`
              + `<td class="indic-num">${toIndic(s.unexcused || 0)}</td>`
              + `<td class="indic-num">${toIndic(s.excused || 0)}</td>`
              + `<td></td>`;
            tbody.appendChild(tr);
          });
        }
      }
}
