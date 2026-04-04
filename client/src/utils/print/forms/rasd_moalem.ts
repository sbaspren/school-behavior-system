// ===== Form: rasd_moalem =====
import { toIndic, escapeHtml } from '../../printUtils';
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_rasd_moalem(): string {
  return `<div class="page-container">${H}
  <div class="form-title">سجل متابعة ورصد مخالفات الطلاب (للمعلم)</div>
  <div class="form-body">
  <div class="section-block align-right" style="margin-bottom:15px;">المادة: <span class="data-field with-dots" style="min-width:80px;" id="rasd_m_subject"></span> الصف: <span class="data-field with-dots" style="min-width:80px;" id="rasd_m_grade"></span> المعلم: <span class="data-field with-dots" style="min-width:100px;" id="rasd_m_teacher"></span></div>
  <table class="tracking-table">
  <thead>
  <tr>
  <th style="width: 5%;">م</th>
  <th style="width: 25%;">اسم الطالب</th>
  <th style="width: 20%;">المخالفة</th>
  <th style="width: 20%;">الإجراء المتخذ</th>
  <th style="width: 15%;">التاريخ</th>
  <th style="width: 15%;">توقيع الطالب</th>
  </tr>
  </thead>
  <tbody id="rasd_m_tbody">
  <tr>
  <td class="indic-num">١</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٢</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٣</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٤</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٥</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٦</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٧</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٨</td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  </tbody>
  </table>
  <div class="section-block align-right" style="margin-top: 20px; font-size: 14pt;">
  <strong>ملاحظة:</strong> يتم تحويل الطالب للموجه الطلابي في حال تكرار المخالفة أو ارتكاب مخالفة
  تستوجب التدخل.
  </div>
  </div>
  </div>`;
}

export function fillFormData_rasd_moalem(doc: Document, data: PrintFormData): void {
  if (data.subject) fillField(doc, 'rasd_m_subject', data.subject);
      if (data.grade) fillField(doc, 'rasd_m_grade', data.grade, true);
      if (data.teacherName) fillField(doc, 'rasd_m_teacher', data.teacherName);
      if (data.violations && data.violations.length > 0) {
        const tbody = doc.getElementById('rasd_m_tbody');
        if (tbody) {
          tbody.innerHTML = '';
          const maxRows = Math.max(data.violations.length, 8);
          for (let i = 0; i < maxRows; i++) {
            const tr = doc.createElement('tr');
            if (i < data.violations.length) {
              const v = data.violations[i];
              tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td>`
                + `<td style="text-align:right;padding-right:5px;font-weight:bold;">${escapeHtml(v.studentName || '')}</td>`
                + `<td style="text-align:right;padding-right:5px;">${escapeHtml(v.violation || '')}</td>`
                + `<td style="text-align:right;padding-right:5px;">${escapeHtml(v.action || '')}</td>`
                + `<td class="indic-num">${toIndic(v.date || '')}</td>`
                + `<td></td>`;
            } else {
              tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td><td></td><td></td><td></td><td></td><td></td>`;
            }
            tbody.appendChild(tr);
          }
        }
      }
}
