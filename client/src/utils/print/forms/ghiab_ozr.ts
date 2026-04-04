// ===== Form: ghiab_ozr =====
// نموذج إجراءات الغياب بعذر — وفق اللائحة
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_ghiab_ozr(): string {
  return `<div class="page-container">${H}
<div class="form-title" style="margin-bottom:20px;">نموذج إجراءات الغياب بعذر</div>
<div class="form-body">
  <div class="section-block align-right" style="margin-bottom:15px;">اسم الطالب: <span class="data-field with-dots" style="min-width:250px;" id="ghiab_ozr_studentName"></span> الصف: <span class="data-field with-dots indic-num" style="min-width:120px;" id="ghiab_ozr_grade"></span></div>
  <table class="tracking-table">
    <thead>
      <tr>
        <th style="width:10%;">الغياب</th>
        <th style="width:40%;">الإجراء</th>
        <th style="width:15%;">التاريخ</th>
        <th style="width:17%;">توقيع الطالب</th>
        <th style="width:18%;">توقيع ولي الأمر</th>
      </tr>
    </thead>
    <tbody>
      <tr style="height:50px;">
        <td class="days-col">٣ أيام</td>
        <td style="text-align:right;padding-right:5px;">تحويل للموجه + خطة علاجية</td>
        <td></td><td></td><td></td>
      </tr>
      <tr style="height:50px;">
        <td class="days-col">٥ أيام</td>
        <td style="text-align:right;padding-right:5px;">لجنة توجيه (دراسة حالة)</td>
        <td></td><td></td><td></td>
      </tr>
      <tr style="height:50px;">
        <td class="days-col">١٠ أيام</td>
        <td style="text-align:right;padding-right:5px;">مخاطبة الجهات (اشتباه إهمال)</td>
        <td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>
  <table class="footer-table">
    <tr>
      <td style="width:100%;text-align:left;padding-left:30px;">
        <div style="display:inline-block;text-align:center;">
          <strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong>
          <div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span id="ghiab_ozr_deputy" class="with-dots" style="min-width:150px;"></span></div>
          <div style="white-space:nowrap;">التوقيع: <span class="with-dots" style="min-width:150px;"></span></div>
        </div>
      </td>
    </tr>
  </table>
</div></div>`;
}

export function fillFormData_ghiab_ozr(doc: Document, data: PrintFormData): void {
  fillField(doc, 'ghiab_ozr_studentName', data.studentName);
  fillField(doc, 'ghiab_ozr_grade', data.grade, true);
  if (data.deputyName) fillField(doc, 'ghiab_ozr_deputy', data.deputyName);
}
