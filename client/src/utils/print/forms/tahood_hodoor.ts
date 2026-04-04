// ===== Form: tahood_hodoor =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_tahood_hodoor(): string {
  return `<div class="page-container">${H}
  <div class="form-title">تعهد الالتزام بالحضور</div>
  <div class="form-body">
  <div class="section-block" style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
  أقر أنا الطالب: <span class="data-field with-dots" style="min-width: 60px; font-weight: bold;"
  id="tahood_h_studentName"></span>
  بالصف: <span class="data-field with-dots" style="min-width: 40px;" id="tahood_h_grade"></span>
  بأنني قد تغيّبت عن الدوام المدرسي خلال الفترة الماضية، وذلك على النحو التالي:
  </div>
  <div
  style="border: 2px solid #ccc; padding: 15px; margin: 25px 0; background-color: #f9f9f9; display: flex; justify-content: space-around; align-items: center;">
  <div>
  <strong>عدد أيام الغياب (بدون عذر):</strong>
  <span class="data-field indic-num" style="font-size: 16pt; color: #000; font-weight: bold;"
  id="tahood_h_unexcused"></span>
  </div>
  <div style="border-left: 2px solid #ccc; height: 30px;"></div>
  <div>
  <strong>عدد أيام الغياب (بعذر):</strong>
  <span class="data-field indic-num" style="font-size: 16pt; color: #000; font-weight: bold;"
  id="tahood_h_excused"></span>
  </div>
  </div>
  <div class="section-block"
  style="text-align: justify; line-height: 1.8; margin-top: 20px; margin-bottom: 50px;">
  وأتعهد بالالتزام بالخطة التربوية والعلاجية المقدمة لتحسين الحضور، وعدم تكرار الغياب مستقبلاً، والحرص
  على الانضباط المدرسي، وعلى ذلك جرى التوقيع.
  </div>
  <table class="footer-table" style="margin-top: 60px;">
  <tr>
  <td style="width: 33%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.8em;">الطالب</strong>
  <div style="margin-bottom: 5px; white-space: nowrap;">الاسم: <span
  class="data-field with-dots" style="min-width: 150px;"
  id="tahood_h_sig_student"></span></div>
  <div style="white-space: nowrap;">التوقيع: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  </div>
  </td>
  <td style="width: 33%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.8em;">ولي الأمر</strong>
  <div style="margin-bottom: 5px; white-space: nowrap;">الاسم: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  <div style="white-space: nowrap;">التوقيع: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  </div>
  </td>
  <td style="width: 33%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.8em;">وكيل شؤون الطلاب</strong>
  <div style="margin-bottom: 5px; white-space: nowrap;">الاسم: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  <div style="white-space: nowrap;">التوقيع: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  </div>
  </td>
  </tr>
  </table>
  </div>
  </div>`;
}

export function fillFormData_tahood_hodoor(doc: Document, data: PrintFormData): void {
  fillField(doc, 'tahood_h_studentName', data.studentName);
      fillField(doc, 'tahood_h_grade', data.grade, true);
      fillField(doc, 'tahood_h_unexcused', data.unexcusedDays, true);
      fillField(doc, 'tahood_h_excused', data.excusedDays, true);
      fillField(doc, 'tahood_h_sig_student', data.studentName);
}
