// ===== Form: high_risk =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_high_risk(): string {
  return `<div class="page-container">${H}
<div class="confidential-mark">(سري للغاية وعاجل)</div>
<div class="form-title">نموذج إبلاغ عن حالة عالية الخطورة</div>
<div class="form-body">
  <div class="section-block align-right">اسم الطالب: <span class="data-field with-dots" style="min-width:250px;" id="risk_studentName"></span> الصف الدراسي: <span class="data-field with-dots" style="min-width:120px;" id="risk_grade"></span></div>
  <div class="risk-box" style="margin-bottom:15px;" id="risk_types_box"><strong>نوع الخطر:</strong><br>
    <div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:15px;font-size:15pt;" id="risk_types_list">
      <span><span class="manual-checkbox" id="risk_chk_0"></span> حيازة سلاح</span>
      <span><span class="manual-checkbox" id="risk_chk_1"></span> مخدرات</span>
      <span><span class="manual-checkbox" id="risk_chk_2"></span> تهديد بالعنف</span>
      <span><span class="manual-checkbox" id="risk_chk_3"></span> مضاربة جماعية</span>
      <span><span class="manual-checkbox" id="risk_chk_4"></span> تحرش</span>
      <span><span class="manual-checkbox" id="risk_chk_5"></span> أخرى: <span class="data-field with-dots" style="min-width:100px;" id="risk_other_text"></span></span>
    </div>
  </div>
  <div class="section-block" style="margin-bottom:15px;"><strong>وصف الحالة:</strong><br><span class="data-field with-dots" style="width:100%;margin-bottom:5px;" id="risk_desc"></span></div>
  <div class="section-block align-right" style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:5px;margin-bottom:15px;">
    <div style="width:50%;">اسم راصد الحالة: <span class="data-field with-dots" style="width:60%;" id="risk_observer"></span></div>
    <div style="width:25%;">تاريخ الرصد: <span class="data-field with-dots indic-num" style="width:50%;" id="risk_date"></span></div>
    <div style="width:20%;">وقت الرصد: <span class="data-field with-dots indic-num" style="width:45%;" id="risk_time"></span></div>
  </div>
  <div class="section-block" style="margin-bottom:20px;"><strong>الإجراءات المتخذة مع الحالة:</strong><br>
    <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;font-size:14pt;">
      <span><span class="manual-checkbox"></span> تبليغ إدارة التعليم.</span>
      <span><span class="manual-checkbox"></span> تبليغ الجهات الأمنية.</span>
      <span><span class="manual-checkbox"></span> تبليغ الحماية من العنف الأسري وحماية الطفل.</span>
      <span><span class="manual-checkbox"></span> تبليغ وزارة الصحة.</span>
      <span><span class="manual-checkbox"></span> التواصل مع الأسرة لإخطارها بوضع الحالة.</span>
      <span><span class="manual-checkbox"></span> عقد اجتماع طارئ للجنة التوجيه الطلابي لدراسة الحالة ووضع خطة لمعالجتها بالتكامل مع الجهات ذات العلاقة.</span>
      <span><span class="manual-checkbox"></span> رفع بلاغ عن الحالة في الأنظمة التقنية الخاصة بالبلاغات.</span>
    </div>
  </div>
  <div class="section-block" style="display:flex;justify-content:flex-end;padding-top:20px;border-top:1px solid #ddd;">
    <div style="text-align:center;min-width:250px;"><strong style="display:block;margin-bottom:12px;font-size:15pt;">وكيل شؤون الطلاب</strong>
      <div style="margin-bottom:8px;text-align:right;">الاسم: <span class="data-field with-dots" style="min-width:180px;" id="risk_manager"></span></div>
      <div style="margin-bottom:8px;text-align:right;">التوقيع: <span class="with-dots" style="min-width:180px;"></span></div>
      <div style="text-align:right;">التاريخ: <span class="data-field with-dots indic-num" style="min-width:180px;" id="risk_manager_date"></span></div>
    </div>
  </div>
</div></div>`;
}

export function fillFormData_high_risk(doc: Document, data: PrintFormData): void {
  fillField(doc, 'risk_studentName', data.studentName);
      fillField(doc, 'risk_grade', data.grade, true);
      // ★ نوع الخطر — تفعيل ✓
      if (data.riskTypes) {
        const riskLabels = ['حيازة سلاح', 'مخدرات', 'تهديد بالعنف', 'مضاربة جماعية', 'تحرش'];
        data.riskTypes.forEach((rt) => {
          const idx = riskLabels.indexOf(rt);
          if (idx >= 0) {
            const chk = doc.getElementById('risk_chk_' + idx);
            if (chk) chk.textContent = '\u2713';
          } else {
            const chk5 = doc.getElementById('risk_chk_5');
            if (chk5) chk5.textContent = '\u2713';
            fillField(doc, 'risk_other_text', rt);
          }
        });
      }
      // ★ وصف الحالة
      if (data.riskDesc) fillField(doc, 'risk_desc', data.riskDesc);
      // ★ راصد الحالة
      if (data.riskObserver) fillField(doc, 'risk_observer', data.riskObserver);
      // ★ تاريخ ووقت الرصد
      if (data.riskDate) fillField(doc, 'risk_date', data.riskDate, true);
      if (data.riskTime) fillField(doc, 'risk_time', data.riskTime);
      // ★ اسم المدير
      if (data.managerName) {
        fillField(doc, 'risk_manager', data.managerName);
        fillField(doc, 'risk_manager_date', data.riskDate || '', true);
      }
}
