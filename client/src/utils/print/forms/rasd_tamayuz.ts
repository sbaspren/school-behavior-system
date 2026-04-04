// ===== Form: rasd_tamayuz =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_rasd_tamayuz(): string {
  return `<div class="page-container">${H}
  <div class="form-title">سجل رصد السلوك المتميز والتعزيز</div>
  <div class="form-body">
  <div class="section-block align-right">اسم الطالب: <span class="data-field with-dots" style="min-width:250px;" id="rasd_studentName"></span> الصف: <span class="data-field with-dots" style="min-width:120px;" id="rasd_grade"></span></div>
  <table class="tracking-table">
  <thead>
  <tr>
  <th style="width: 40%;">السلوك الإيجابي</th>
  <th style="width: 15%;">التاريخ</th>
  <th style="width: 15%;">النقاط</th>
  <th style="width: 30%;">المعلم / المشرف</th>
  </tr>
  </thead>
  <tbody>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td style="height: 40px;"></td>
  <td></td>
  <td></td>
  <td></td>
  </tr>
  </tbody>
  </table>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span class="with-dots" style="min-width:150px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
  </div>
  </div>`;
}

export function fillFormData_rasd_tamayuz(doc: Document, data: PrintFormData): void {
  fillField(doc, 'rasd_studentName', data.studentName);
      fillField(doc, 'rasd_grade', data.grade, true);
}
