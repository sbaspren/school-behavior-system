// ===== Form: tawid_darajat =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_tawid_darajat(): string {
  return `<div class="page-container">${H}
  <div class="form-title">استمارة فرص تعويض درجات السلوك الإيجابي</div>
  <div class="form-body">
  <div class="section-block align-right" style="margin-bottom:10px;">اسم الطالب: <span class="data-field with-dots" style="min-width:60px;" id="tawid_studentName"></span> الصف: <span class="data-field with-dots" style="min-width:40px;" id="tawid_grade"></span> الفصل: <span class="data-field with-dots" style="min-width:40px;" id="tawid_class"></span></div>
  <div
  style="border: 2px solid #333; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; border-radius: 5px;">
  <div style="font-weight: bold; text-decoration: underline; margin-bottom: 8px;">بيانات المخالفة
  السلوكية المراد تعويضها:</div>
  <table style="width: 100%; border: none;">
  <tr>
  <td style="border: none; padding: 5px; text-align: right;"><strong>المشكلة
  السلوكية:</strong> <span id="tawid_v_name" class="data-field with-dots"
  style="min-width: 200px;"></span></td>
  <td style="border: none; padding: 5px; text-align: right;"><strong>نوعها/درجتها:</strong>
  <span id="tawid_v_degree" class="data-field with-dots indic-num"
  style="min-width: 50px;"></span>
  </td>
  </tr>
  <tr>
  <td style="border: none; padding: 5px; text-align: right;"><strong>تاريخ وقوعها:</strong>
  <span id="tawid_v_date" class="data-field with-dots indic-num"
  style="min-width: 100px;"></span>
  </td>
  <td style="border: none; padding: 5px; text-align: right;"><strong>الدرجات
  المحسومة:</strong> <span id="tawid_v_points" class="data-field with-dots indic-num"
  style="min-width: 50px; color: #c0392b;"></span></td>
  </tr>
  </table>
  </div>
  <table class="tracking-table">
  <thead>
  <tr>
  <th style="width: 5%;">م</th>
  <th style="width: 45%;">فرص التعويض للدرجات المحسومة من السلوك</th>
  <th style="width: 15%;">مقدار درجات التعويض</th>
  <th style="width: 15%;">التاريخ</th>
  <th style="width: 20%;">الدرجات المكتسبة</th>
  </tr>
  </thead>
  <tbody>
  <tr>
  <td class="indic-num">١</td>
  <td style="text-align: right; padding-right: 5px;">انضباط الطالب وعدم غيابه دون عذر خلال
  الفصل الدراسي</td>
  <td class="indic-num">٣ درجات</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٢</td>
  <td style="text-align: right; padding-right: 5px;">المحافظة على الهوية الوطنية (اللباس
  والمظهر العام، الالتزام بقيم الولاء)</td>
  <td class="indic-num">٣ درجات</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٣</td>
  <td style="text-align: right; padding-right: 5px;">المشاركة في المبادرات والأعمال التطوعية
  داخل المدرسة</td>
  <td class="indic-num">٣ درجات</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٤</td>
  <td style="text-align: right; padding-right: 5px;">المشاركة في الإذاعة والأنشطة المدرسية
  </td>
  <td class="indic-num">٣ درجات</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٥</td>
  <td style="text-align: right; padding-right: 5px;">المحافظة على ممتلكات المدرسة</td>
  <td class="indic-num">درجتان</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٦</td>
  <td style="text-align: right; padding-right: 5px;">التعاون مع الزملاء والمعلمين وإدارة
  المدرسة</td>
  <td class="indic-num">درجتان</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٧</td>
  <td style="text-align: right; padding-right: 5px;">الالتحاق ببرامج ودورات في مجال التطوير
  الشخصي</td>
  <td class="indic-num">درجتان</td>
  <td></td>
  <td></td>
  </tr>
  <tr>
  <td class="indic-num">٨</td>
  <td style="text-align: right; padding-right: 5px;">تقديم المقترحات التطويرية لصالح المجتمع
  المدرسي</td>
  <td class="indic-num">درجتان</td>
  <td></td>
  <td></td>
  </tr>
  </tbody>
  </table>
  <div class="section-block" style="margin-top: 10px; font-size: 12pt;">
  <strong>ملاحظة:</strong> إحضار الشواهد التي تثبت مشاركة الطالب من الجهات ذات العلاقة سواء داخل
  المدرسة أو خارجها.
  </div>
  <table class="footer-table" style="margin-top: 30px;">
  <tr>
  <td style="width: 50%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.5em;">الطالب</strong>
  <div style="white-space: nowrap;">التوقيع: <span class="with-dots"
  style="min-width: 120px;"></span></div>
  </div>
  </td>
  <td style="width: 50%;">
  <div class="signature-block">
  <strong style="display: block; margin-bottom: 0.5em;">وكيل شؤون الطلاب</strong>
  <div style="margin-bottom: 5px; white-space: nowrap;">
  الاسم: <span id="tawid_deputy" class="with-dots" style="min-width: 150px;"></span>
  </div>
  <div style="white-space: nowrap;">
  التوقيع: <span class="with-dots" style="min-width: 120px;"></span>
  </div>
  </div>
  </td>
  </tr>
  </table>
  </div>
  </div>`;
}

export function fillFormData_tawid_darajat(doc: Document, data: PrintFormData): void {
  fillField(doc, 'tawid_studentName', data.studentName);
      fillField(doc, 'tawid_grade', data.grade, true);
      fillField(doc, 'tawid_class', data.class, true);
      if (data.violationInfo) {
        fillField(doc, 'tawid_v_name', data.violationInfo.name);
        fillField(doc, 'tawid_v_degree', data.violationInfo.degree, true);
        fillField(doc, 'tawid_v_date', data.violationInfo.date, true);
        fillField(doc, 'tawid_v_points', data.violationInfo.points, true);
      }
      if (data.counselorName) fillField(doc, 'tawid_guide', data.counselorName);
      if (data.deputyName) fillField(doc, 'tawid_deputy', data.deputyName);
}
