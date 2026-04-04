// ===== Form: tawtheeq_tawasol =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_tawtheeq_tawasol(): string {
  return `<div class="page-container">${H}
  <div class="form-title">نموذج توثيق التواصل مع ولي الأمر</div>
  <div class="form-body">
  <!-- بيانات الطالب -->
  <div class="section-block align-right">اسم الطالب: <span class="data-field with-dots" style="min-width:60px;" id="tawtheeq_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:40px;" id="tawtheeq_grade"></span> في يوم: <span class="data-field with-dots" style="min-width:40px;" id="tawtheeq_day"></span> الموافق: <span class="data-field with-dots indic-num" style="min-width:60px;" id="tawtheeq_date"></span></div>
  <!-- بيانات التواصل -->
  <table class="tracking-table" style="margin-top: 20px;">
  <thead>
  <tr>
  <th style="width: 25%;">نوع التواصل</th>
  <th style="width: 75%;">التفاصيل</th>
  </tr>
  </thead>
  <tbody>
  <tr style="height: 45px;">
  <td style="font-weight: bold; background-color: #f5f5f5;">نوع الإشعار</td>
  <td style="text-align: right; padding-right: 10px;" id="tawtheeq_contactType"></td>
  </tr>
  <tr style="height: 60px;">
  <td style="font-weight: bold; background-color: #f5f5f5;">سبب التواصل</td>
  <td style="text-align: right; padding-right: 10px;" id="tawtheeq_contactReason"></td>
  </tr>
  <tr style="height: 45px;">
  <td style="font-weight: bold; background-color: #f5f5f5;">وسيلة التواصل</td>
  <td>
  <div style="display: flex; gap: 25px; justify-content: center; padding: 5px;">
  <span><span class="manual-checkbox"></span> واتساب</span>
  <span><span class="manual-checkbox"></span> اتصال هاتفي</span>
  <span><span class="manual-checkbox"></span> حضور شخصي</span>
  <span><span class="manual-checkbox"></span> أخرى</span>
  </div>
  </td>
  </tr>
  <tr style="height: 45px;">
  <td style="font-weight: bold; background-color: #f5f5f5;">نتيجة التواصل</td>
  <td style="text-align: right; padding-right: 10px; font-weight: bold;"
  id="tawtheeq_contactResult"></td>
  </tr>
  </tbody>
  </table>
  <!-- ملاحظات -->
  <div class="section-block" style="margin-top: 20px;">
  <strong>ملاحظات:</strong>
  <div style="border: 1px solid #999; min-height: 80px; margin-top: 5px; padding: 8px;"
  id="tawtheeq_notes"></div>
  </div>
  <!-- التوقيعات -->
  <table class="footer-table" style="margin-top: 40px;">
  <tr>
  <td style="width: 50%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.8em;">ولي الأمر</strong>
  <div style="margin-bottom: 5px; white-space: nowrap;">الاسم: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  <div style="white-space: nowrap;">التوقيع: <span class="with-dots"
  style="min-width: 150px;"></span></div>
  </div>
  </td>
  <td style="width: 50%;">
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
  </div>
  </div>
  <!-- ===== نموذج 23: محضر إثبات واقعة (سلوك غير تربوي) ===== -->
  <div`;
}

export function fillFormData_tawtheeq_tawasol(doc: Document, data: PrintFormData): void {
  fillField(doc, 'tawtheeq_studentName', data.studentName);
      fillField(doc, 'tawtheeq_grade', data.grade, true);
      fillField(doc, 'tawtheeq_day', data.contactDay || data.violationDay);
      fillField(doc, 'tawtheeq_date', data.contactDate || data.violationDate, true);
      fillField(doc, 'tawtheeq_contactType', data.contactType);
      fillField(doc, 'tawtheeq_contactReason', data.contactReason);
      fillField(doc, 'tawtheeq_contactResult', data.contactResult || 'تم التواصل بنجاح');
      fillField(doc, 'tawtheeq_notes', data.contactNotes || data.notes || '');
}
