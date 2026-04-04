// ===== Form: group_tahood =====
import { toIndic, escapeHtml, shortenName } from '../../printUtils';
import { PrintFormData, fillField, emptyRows } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_group_tahood(): string {
  return `<div class="page-container">${H}
<div class="form-title">تعهد بعدم غياب والتزام بالحضور</div>
<div class="form-body">
  <div class="section-block" style="text-align:center;">التاريخ: <span id="gt_date" class="data-field with-dots indic-num" style="min-width:120px;"></span></div>
  <div class="section-block align-right">نحن الموقعون أدناه نتعهد بالالتزام بالحضور يومياً للمدرسة وعدم الغياب إلا لعذر قهري.</div>
  <table class="tracking-table"><thead><tr><th style="width:5%;">م</th><th style="width:25%;">اسم الطالب</th><th style="width:13%;">الصف</th><th style="width:10%;">بدون عذر</th><th style="width:10%;">بعذر</th><th style="width:20%;">توقيع الطالب</th><th style="width:17%;">توقيع ولي الأمر</th></tr></thead>
  <tbody id="gt_table_body">${emptyRows(10, 7)}</tbody></table>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span id="gt_deputy" class="with-dots" style="min-width:150px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
</div></div>`;
}

export function fillFormData_group_tahood(doc: Document, data: PrintFormData): void {
  const d = new Date();
      const dn = d.toLocaleDateString('ar-SA', { weekday: 'long' });
      const ds = data.violationDate || d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura');
      fillField(doc, 'gt_date', dn + ' ' + ds, true);
      if (data.deputyName) fillField(doc, 'gt_deputy', data.deputyName);
      if (data.studentsList && data.studentsList.length > 0) {
        const tbody = doc.getElementById('gt_table_body');
        if (tbody) {
          tbody.innerHTML = '';
          data.studentsList.forEach((s, i) => {
            const tr = doc.createElement('tr');
            tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td>`
              + `<td style="text-align:right;padding-right:5px;font-weight:bold;">${escapeHtml(shortenName(s.name))}</td>`
              + `<td>${escapeHtml(s.grade || '')}</td>`
              + `<td class="indic-num">${toIndic(s.unexcused || 0)}</td>`
              + `<td class="indic-num">${toIndic(s.excused || 0)}</td>`
              + `<td></td><td></td>`;
            tbody.appendChild(tr);
          });
        }
      }
}
