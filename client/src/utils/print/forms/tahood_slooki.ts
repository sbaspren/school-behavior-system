// ===== Form: tahood_slooki =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_tahood_slooki(): string {
  return `<div class="page-container">${H}
  <div class="form-title">إقرار وتعهد سلوكي</div>
  <div class="form-body">
  <div class="section-block align-right" style="margin-bottom:10px;">أقر أنا الطالب: <span class="data-field with-dots" style="min-width:60px;" id="tahood_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:40px;" id="tahood_grade"></span> قمت في يوم: <span class="data-field with-dots" style="min-width:40px;" id="tahood_day"></span> الموافق: <span class="data-field with-dots indic-num" style="min-width:60px;" id="tahood_date"></span> هـ</div>
  <div class="section-block align-right">
  بارتكاب مخالفة سلوكية من الدرجة ( <strong><span class="data-field indic-num"
  id="tahood_degree"></span></strong> )، وهي: <span class="data-field with-dots align-right"
  style="width: 100%; display:inline-block" id="tahood_text"></span>
  </div>
  <div class="section-block"
  style="margin-top: 20px; font-weight: bold; text-align: justify; line-height:1.8;">
  وأتعهد بعدم تكرار هذه المخالفة أو أي مخالفة سلوكية أخرى مستقبلاً، والالتزام بالأنظمة المدرسية
  واحترام توجيهات المعلمين وإدارة المدرسة، وفي حال تكرار المخالفة أتحمل كافة الإجراءات النظامية
  المترتبة على ذلك.
  </div>
  <div class="section-block" style="text-align: center; margin-top: 15px;">وعلى ذلك جرى التوقيع والعلم.
  </div>
  <table class="footer-table" style="margin-top: 40px;">
  <tr>
  <td style="width:33%; text-align:center;">
  <div class="signature-block" style="display:inline-block; text-align:right;">
  <strong style="display: block; margin-bottom: 0.8em; text-align:center;">الطالب
  المقر</strong>
  <div style="margin-bottom: 5px; white-space:nowrap;">الاسم: <span
  class="data-field with-dots"
  style="display:inline-block; min-width:150px; text-align:center;"></span></div>
  <div style="white-space:nowrap;">التوقيع: <span
  style="display:inline-block; border-bottom:1px dotted #000; min-width:150px;"></span>
  </div>
  </div>
  </td>
  <td style="width:33%; text-align:center;">
  <div class="signature-block" style="display:inline-block; text-align:right;">
  <strong style="display: block; margin-bottom: 0.8em; text-align:center;">ولي أمر
  الطالب</strong>
  <div style="margin-bottom: 5px; white-space:nowrap;">الاسم: <span
  class="data-field with-dots"
  style="display:inline-block; min-width:150px; text-align:center;"></span></div>
  <div style="white-space:nowrap;">التوقيع: <span
  style="display:inline-block; border-bottom:1px dotted #000; min-width:150px;"></span>
  </div>
  </div>
  </td>
  <td style="width:33%; text-align:center;">
  <div class="signature-block" style="display:inline-block; text-align:right;">
  <strong style="display: block; margin-bottom: 0.8em; text-align:center;">وكيل شؤون الطلاب</strong>
  <div style="margin-bottom: 5px; white-space:nowrap;">الاسم: <span
  class="data-field with-dots"
  style="display:inline-block; min-width:150px; text-align:center;"></span></div>
  <div style="white-space:nowrap;">التوقيع: <span
  style="display:inline-block; border-bottom:1px dotted #000; min-width:150px;"></span>
  </div>
  </div>
  </td>
  </tr>
  </table>
  </div>
  </div>`;
}

export function fillFormData_tahood_slooki(doc: Document, data: PrintFormData): void {
  fillField(doc, 'tahood_studentName', data.studentName);
      fillField(doc, 'tahood_grade', data.grade, true);
      fillField(doc, 'tahood_day', data.violationDay);
      fillField(doc, 'tahood_date', data.violationDate, true);
      fillField(doc, 'tahood_degree', data.violationDegree, true);
      fillField(doc, 'tahood_text', '\u25CF ' + (data.violationText || ''));
}
