// ===== Form: iltizam_madrasi =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_iltizam_madrasi(): string {
  return `<div class="page-container">${H}
<div class="form-title">نموذج الالتزام المدرسي</div>
<div class="form-body">
  <div style="border:2px solid #333;padding:15px;margin-bottom:30px;border-radius:8px;">
    <div style="font-weight:bold;text-decoration:underline;margin-bottom:15px;font-size:14pt;">خاص بالطالب:</div>
    <div class="section-block align-right" style="margin-bottom:15px;">الاسم: <span class="data-field with-dots" style="min-width:60px;border-bottom:1px solid #000;" id="iltizam_name"></span> الصف: <span class="data-field with-dots" style="min-width:40px;border-bottom:1px solid #000;" id="iltizam_grade"></span></div>
    <div class="section-block" style="text-align:justify;line-height:2;margin-bottom:20px;">
      نعم أنا الطالب الموضح اسمه وبياناته أعلاه. قد اطلعت على محتوى قواعد السلوك والمواظبة. وبناء عليه أتعهد أن ألتزم بالأنظمة والتعليمات الخاصة بقواعد السلوك والمواظبة.
    </div>
    <div style="display:flex;gap:30px;align-items:flex-end;">
      <div style="flex:1;">التوقيع: <span class="data-field with-dots" style="display:inline-block;width:70%;border-bottom:1px solid #000;min-height:10px;" id="iltizam_student_sign"></span></div>
      <div style="flex:1;">التاريخ: <span class="data-field indic-num" style="display:inline-block;width:70%;border-bottom:1px solid #000;text-align:center;" id="iltizam_date"></span></div>
    </div>
  </div>
  <div style="border:2px solid #333;padding:15px;border-radius:8px;">
    <div style="font-weight:bold;text-decoration:underline;margin-bottom:15px;font-size:14pt;">خاص بولي الأمر:</div>
    <div class="section-block" style="text-align:justify;line-height:2;margin-bottom:15px;">
      نعم أنا ولي أمر الطالب الموضح اسمه وبياناته أعلاه. قد اطلعت على محتوى قواعد السلوك والمواظبة. وبناء عليه أتعهد أن أتعاون مع إدارة المدرسة في سبيل مصلحة ابني، ليكون ملتزماً بالأنظمة والتعليمات الخاصة بقواعد السلوك والمواظبة، وأتحمل مسؤولية صحة أرقام التواصل التالية:
    </div>
    <div style="display:flex;gap:30px;margin-bottom:25px;">
      <div style="flex:1;">جوال (١): <span style="display:inline-block;width:70%;border-bottom:1px solid #000;height:20px;"></span></div>
      <div style="flex:1;">جوال (٢): <span style="display:inline-block;width:70%;border-bottom:1px solid #000;height:20px;"></span></div>
    </div>
    <div style="display:flex;gap:15px;align-items:center;">
      <div style="flex:1.5;white-space:nowrap;">اسم ولي الأمر: <span style="display:inline-block;width:60%;border-bottom:1px solid #000;height:20px;"></span></div>
      <div style="flex:1;white-space:nowrap;">التوقيع: <span style="display:inline-block;width:60%;border-bottom:1px solid #000;height:20px;"></span></div>
      <div style="flex:0.8;white-space:nowrap;">التاريخ: <span class="indic-num" style="display:inline-block;width:50%;border-bottom:1px solid #000;text-align:center;height:20px;"></span></div>
    </div>
  </div>
</div></div>`;
}

export function fillFormData_iltizam_madrasi(doc: Document, data: PrintFormData): void {
  fillField(doc, 'iltizam_name', data.studentName);
      fillField(doc, 'iltizam_grade', data.grade, true);
      fillField(doc, 'iltizam_date', data.violationDate, true);
      fillField(doc, 'iltizam_student_sign', data.studentName);
}
