// ===== Form: eblagh_etha =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_eblagh_etha(): string {
  return `<div class="page-container">${H}
<div class="confidential-mark">(سري للغاية)</div>
<div class="form-title">نموذج رصد وإبلاغ عن حالة إيذاء (حماية)</div>
<div class="form-body">
  <div class="section-block align-right">التاريخ: <span class="data-field with-dots indic-num" style="min-width:120px;" id="eblagh_date"></span></div>
  <div class="info-box"><span class="box-title">أولاً: بيانات المُبَلِّغ (المدرسة):</span>
    <div class="section-block align-right">الاسم: <span class="data-field with-dots" style="min-width:60px;" id="eblagh_reporter"></span> صفته: <span class="data-field with-dots" style="min-width:60px;" id="eblagh_role"></span></div>
  </div>
  <div class="info-box"><span class="box-title">ثانياً: بيانات الضحية:</span>
    <div class="section-block align-right">الاسم: <span class="data-field with-dots" style="min-width:60px;" id="eblagh_victim_name"></span> الصف: <span class="data-field with-dots" style="min-width:40px;" id="eblagh_grade"></span></div>
  </div>
  <div class="section-block"><strong>ثالثاً: ملخص الحالة:</strong><br><span class="data-field with-dots" style="width:100%;margin-bottom:5px;" id="eblagh_summary"></span></div>
  <div class="section-block"><strong>رابعاً: الإجراءات المتخذة:</strong><br>
    <div style="margin-top:5px;margin-bottom:5px;"><span class="indic-num">١-</span> <span class="data-field with-dots" style="width:93%;" id="eblagh_proc_1"></span></div>
    <div style="margin-bottom:5px;"><span class="indic-num">٢-</span> <span class="data-field with-dots" style="width:93%;" id="eblagh_proc_2"></span></div>
    <div style="margin-bottom:10px;"><span class="indic-num">٣-</span> <span class="data-field with-dots" style="width:93%;" id="eblagh_proc_3"></span></div>
    <div style="margin-top:5px;"><span style="font-weight:bold;">تم التواصل مع مركز البلاغات 1919؟</span> <span style="margin-right:20px;"><span class="manual-checkbox"></span> نعم (رقم البلاغ: <span class="indic-num with-dots" style="min-width:80px;"></span>)</span><span style="margin-right:20px;"><span class="manual-checkbox"></span> لا</span></div>
  </div>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span class="data-field with-dots" style="min-width:150px;" id="eblagh_manager"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
</div></div>`;
}

export function fillFormData_eblagh_etha(doc: Document, data: PrintFormData): void {
  fillField(doc, 'eblagh_victim_name', data.studentName);
      fillField(doc, 'eblagh_grade', data.grade, true);
      fillField(doc, 'eblagh_date', data.violationDate || new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura'), true);
      if (data.eblaghReporter) fillField(doc, 'eblagh_reporter', data.eblaghReporter);
      if (data.eblaghRole) fillField(doc, 'eblagh_role', data.eblaghRole);
      if (data.eblaghSummary) fillField(doc, 'eblagh_summary', data.eblaghSummary);
      if (data.eblaghProcedures) {
        for (let i = 0; i < Math.min(data.eblaghProcedures.length, 3); i++) {
          fillField(doc, 'eblagh_proc_' + (i + 1), data.eblaghProcedures[i]);
        }
      }
      if (data.counselorName) fillField(doc, 'eblagh_counselor', data.counselorName);
      if (data.managerName) fillField(doc, 'eblagh_manager', data.managerName);
}
