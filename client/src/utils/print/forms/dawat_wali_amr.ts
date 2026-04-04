// ===== Form: dawat_wali_amr =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_dawat_wali_amr(): string {
  return `<div class="page-container">${H}
<div class="form-title">خطاب دعوة ولي أمر طالب</div>
<div class="form-body">
  <div class="section-block align-right" style="margin-bottom:10px;">المكرم ولي أمر الطالب: <span class="data-field with-dots" style="min-width:60px;" id="dawat_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:40px;" id="dawat_grade"></span></div>
  <div class="section-block">السلام عليكم ورحمة الله وبركاته،،</div>
  <div class="section-block align-right">نأمل منكم التكرم بالحضور إلى المدرسة في يوم: <span class="data-field with-dots" style="min-width:60px;" id="dawat_day"></span> الموافق: <span class="data-field with-dots indic-num" style="min-width:80px;" id="dawat_date"></span> هـ الساعة: <span class="data-field with-dots indic-num" style="min-width:40px;" id="dawat_time"></span> صباحاً.</div>
  <div class="section-block">وذلك لمقابلة: <span class="data-field with-dots" style="width:50%;" id="dawat_meeting"></span></div>
  <div class="section-block align-right">الهدف من الزيارة: <span class="data-field with-dots align-right" style="width:100%;display:inline-block;" id="dawat_visitReason"></span></div>
  <div class="section-block" style="margin-top:8mm;">شاكرين لكم تعاونكم وحرصكم على مصلحة ابنكم التعليمية والتربوية.</div>
  <table class="footer-table"><tr>
    <td style="width:33%;text-align:center;"><div style="border:2px dashed #ccc;width:80px;height:80px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12pt;">الختم</div></td>
    <td style="width:33%;"></td>
    <td style="width:33%;text-align:center;"><div class="signature-block" style="display:inline-block;text-align:right;"><strong style="display:block;margin-bottom:0.8em;text-align:center;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span class="data-field with-dots" id="dawat_deputyName" style="display:inline-block;min-width:200px;text-align:center;"></span></div><div style="white-space:nowrap;">التوقيع: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:200px;"></span></div></div></td>
  </tr></table>
</div>
<div class="cut-line">( قص من هنا وإعادة الجزء الأسفل )</div>
<div style="margin-top:15px;">
  <div class="form-title" style="text-decoration:underline;margin-top:5px;">رد ولي الأمر</div>
  <div class="section-block"><span class="manual-checkbox"></span> اطلعت، وسأحضر في الموعد المحدد إن شاء الله.</div>
  <div class="section-block"><span class="manual-checkbox"></span> اطلعت، وأرغب بتغيير الموعد ليوم: <span class="with-dots" style="min-width:100px;"></span> الموافق: <span class="indic-num with-dots" style="min-width:120px;"></span> هـ</div>
  <div style="display:flex;justify-content:space-between;margin-top:20px;font-weight:bold;">
    <div style="white-space:nowrap;">الاسم: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:180px;"></span></div>
    <div style="white-space:nowrap;">التوقيع: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:180px;"></span></div>
    <div style="white-space:nowrap;">التاريخ: <span class="indic-num with-dots" style="min-width:120px;"></span> هـ</div>
  </div>
</div></div>`;
}

export function fillFormData_dawat_wali_amr(doc: Document, data: PrintFormData): void {
  fillField(doc, 'dawat_studentName', data.studentName);
      fillField(doc, 'dawat_grade', data.grade, true);
      fillField(doc, 'dawat_deputyName', data.deputyName);
      if (data.visitDay) fillField(doc, 'dawat_day', data.visitDay);
      if (data.visitDate) fillField(doc, 'dawat_date', data.visitDate, true);
      if (data.visitTime) fillField(doc, 'dawat_time', data.visitTime);
      if (data.visitMeeting) fillField(doc, 'dawat_meeting', data.visitMeeting);
      fillField(doc, 'dawat_visitReason', '\u25CF ' + (data.visitReason || 'لمناقشة المستوى السلوكي للطالب.'));
}
