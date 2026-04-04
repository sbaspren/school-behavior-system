// ===== Form: ehalat_talib =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_ehalat_talib(): string {
  return `<div class="page-container referral-container">${H}
<div class="confidential-mark">(سري)</div>
<div class="form-title">نموذج إحالة طالب إلى الموجه الطلابي</div>
<div class="form-body">
  <div class="section-block"><strong>المكرم الموجه الطلابي بالمدرسة .. وفقكم الله</strong></div>
  <div class="section-block">السلام عليكم ورحمة الله وبركاته،،</div>
  <div class="section-block align-right">نحيل إليكم الطالب: <span class="data-field with-dots" style="min-width:250px;" id="ehala_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:120px;" id="ehala_grade"></span></div>
  <div class="section-block align-right">حيث لوحظ عليه: <span class="data-field with-dots align-right" style="width:100%;display:inline-block;" id="ehala_text"></span></div>
  <div class="section-block align-right">تاريخ المشكلة: <span class="data-field with-dots indic-num" style="min-width:250px;" id="ehala_date"></span> درجة المخالفة: <span class="data-field with-dots indic-num" style="min-width:120px;" id="ehala_degree"></span></div>
  <div class="section-block" style="margin-top:15px;">نأمل منكم دراسة حالة الطالب، واتخاذ الإجراءات التربوية والعلاجية المناسبة، وإفادتنا بما تم.</div>
  <table class="footer-table"><tr>
    <td><div style="border:2px dashed #ccc;width:80px;height:80px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;">الختم</div></td>
    <td></td>
    <td><div class="signature-block"><strong style="display:block;margin-bottom:0.8em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span class="data-field with-dots" id="ehala_deputyName" style="min-width:200px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:200px;"></span></div></div></td>
  </tr></table>
  <div class="internal-section">
    <div class="section-block" style="font-weight:bold;text-decoration:underline;">إفادة الموجه الطلابي (للاستخدام الداخلي):</div>
    <div class="section-block">تم الاطلاع على الحالة واتخاذ الإجراءات التالية:</div>
    <div class="feedback-box"></div>
    <div style="display:flex;justify-content:space-between;margin-top:20px;font-weight:bold;">
      <div>الاسم: <span class="data-field with-dots" id="ehala_counselorName" style="min-width:180px;"></span></div>
      <div>التوقيع: <span class="with-dots" style="min-width:180px;"></span></div>
      <div>التاريخ: <span class="indic-num with-dots" style="min-width:120px;"></span></div>
    </div>
  </div>
</div></div>`;
}

export function fillFormData_ehalat_talib(doc: Document, data: PrintFormData): void {
  fillField(doc, 'ehala_studentName', data.studentName);
      fillField(doc, 'ehala_grade', data.grade, true);
      fillField(doc, 'ehala_text', '\u25CF ' + (data.violationText || ''));
      fillField(doc, 'ehala_date', data.violationDate || new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura'), true);
      fillField(doc, 'ehala_degree', data.violationDegree, true);
      if (data.deputyName) fillField(doc, 'ehala_deputyName', data.deputyName);
      if (data.counselorName) fillField(doc, 'ehala_counselorName', data.counselorName);
}
