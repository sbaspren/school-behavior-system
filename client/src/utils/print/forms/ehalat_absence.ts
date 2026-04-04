// ===== Form: ehalat_absence =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_ehalat_absence(): string {
  return `<div class="page-container referral-container">${H}
<div class="confidential-mark">(سري)</div>
<div class="form-title">نموذج إحالة طالب إلى الموجه الطلابي<br><span style="font-size:14pt;font-weight:normal;">(غياب وتأخر دراسي)</span></div>
<div class="form-body">
  <div class="section-block"><strong>المكرم الموجه الطلابي بالمدرسة .. وفقكم الله</strong></div>
  <div class="section-block">السلام عليكم ورحمة الله وبركاته،،</div>
  <div class="section-block align-right">نحيل إليكم الطالب: <span class="data-field with-dots" style="min-width:250px;" id="ehala_abs_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:120px;" id="ehala_abs_grade"></span></div>
  <div class="section-block align-right" style="margin-top:10px;">
    <strong>سبب الإحالة:</strong> تكرار غياب الطالب وتأثيره السلبي على مستواه الدراسي والسلوكي.
  </div>
  <div style="border:2px solid #ccc;padding:10px;margin:15px 0;background-color:#f9f9f9;display:flex;justify-content:space-around;">
    <div><strong>غياب بدون عذر:</strong> <span class="data-field indic-num" style="font-size:16pt;color:#000;" id="ehala_abs_unexcused"></span> أيام</div>
    <div style="border-right:1px solid #ccc;"></div>
    <div><strong>غياب بعذر:</strong> <span class="data-field indic-num" style="font-size:16pt;color:#000;" id="ehala_abs_excused"></span> أيام</div>
  </div>
  <div class="section-block" style="margin-top:15px;">نأمل منكم دراسة حالة الطالب، واتخاذ الإجراءات التربوية والعلاجية المناسبة، وإفادتنا بما تم.</div>
  <table class="footer-table"><tr>
    <td><div style="border:2px dashed #ccc;width:80px;height:80px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12pt;">الختم</div></td>
    <td></td>
    <td><div class="signature-block"><strong style="display:block;margin-bottom:0.8em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span class="with-dots" style="min-width:200px;"></span></div><div style="white-space:nowrap;">التوقيع: <span class="with-dots" style="min-width:200px;"></span></div></div></td>
  </tr></table>
  <div class="internal-section">
    <div class="section-block" style="font-weight:bold;text-decoration:underline;">إفادة الموجه الطلابي (للاستخدام الداخلي):</div>
    <div class="section-block">تم الاطلاع على حالة الطالب واتخاذ الإجراءات التالية:</div>
    <div class="feedback-box" style="height:120px;"></div>
    <div style="display:flex;justify-content:space-between;margin-top:20px;font-weight:bold;">
      <div style="white-space:nowrap;">الاسم: <span class="with-dots" style="min-width:180px;"></span></div>
      <div style="white-space:nowrap;">التوقيع: <span class="with-dots" style="min-width:180px;"></span></div>
      <div style="white-space:nowrap;">التاريخ: <span class="indic-num with-dots" style="min-width:120px;"></span></div>
    </div>
  </div>
</div></div>`;
}

export function fillFormData_ehalat_absence(doc: Document, data: PrintFormData): void {
  fillField(doc, 'ehala_abs_studentName', data.studentName);
      fillField(doc, 'ehala_abs_grade', data.grade, true);
      fillField(doc, 'ehala_abs_unexcused', data.unexcusedDays, true);
      fillField(doc, 'ehala_abs_excused', data.excusedDays, true);
}
