// ===== Form: khota_tadeel =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_khota_tadeel(): string {
  return `<div
  style="padding: 3mm 8mm; font-family: 'Traditional Arabic', 'Amiri', serif; font-size: 14pt; line-height: 1.35;">
  ${H}
  <div style="text-align: center; font-size: 17pt; font-weight: bold; margin-top: 3px; margin-bottom: 8px;">
  نموذج خطة تعديل السلوك</div>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-bottom: 5px; text-decoration: underline;">
  أولاً: البيانات الأولية:</div>
  <div class="section-block align-right" style="margin-bottom:2mm;">اسم الطالب: <span class="data-field with-dots" style="min-width:60px;" id="khota_studentName"></span> الصف: <span class="data-field with-dots" style="min-width:40px;" id="khota_grade"></span> الفصل: <span class="data-field with-dots" style="min-width:30px;" id="khota_class"></span></div>
  <div class="section-block align-right" style="margin-bottom:4mm;">تاريخ الميلاد: <span class="data-field with-dots" style="min-width:50px;" id="khota_dob"></span> العمر: <span class="data-field with-dots" style="min-width:30px;" id="khota_age"></span> تاريخ البداية: <span class="data-field with-dots" style="min-width:50px;" id="khota_start"></span> تاريخ النهاية: <span class="data-field with-dots" style="min-width:50px;" id="khota_end"></span></div>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-top: 5px; margin-bottom: 5px; text-decoration: underline;">
  ثانياً: تحديد المشكلة السلوكية:</div>
  <div style="margin-bottom: 3mm;">المشكلة السلوكية: <span class="data-field"
  style="min-width: 200px; display: inline-block; border-bottom: 1px dotted #999; text-align: center;" id="khota_problem"></span>
  درجتها: <span class="data-field"
  style="min-width: 45px; display: inline-block; border-bottom: 1px dotted #999; text-align: center;" id="khota_degree"></span>
  </div>
  <div style="margin-bottom: 3mm;">وصف المشكلة السلوكية: <span class="data-field"
  style="width: 65%; display: inline-block; border-bottom: 1px dotted #999; text-align: center;" id="khota_desc"></span>
  </div>
  <div style="margin-bottom: 2mm;">المظاهر السلوكية التي تبدو عند الطالب:</div>
  <div style="margin-bottom: 2mm; margin-right: 10px;"><span style="font-weight: bold;">١-</span> <span class="data-field"
  style="width: 92%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;" id="khota_m1"></span>
  </div>
  <div style="margin-bottom: 4mm; margin-right: 10px;"><span style="font-weight: bold;">٢-</span> <span class="data-field"
  style="width: 92%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;" id="khota_m2"></span>
  </div>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-top: 5px; margin-bottom: 5px; text-decoration: underline;">
  ثالثاً: قياس شدة أو تكرار السلوك:</div>
  <table
  style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 3px; margin-bottom: 5px;">
  <thead>
  <tr>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 8%; background-color: #f2f2f2;">اليوم
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 14%; background-color: #f2f2f2;">التاريخ
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 14%; background-color: #f2f2f2;">فترة
  الملاحظة</th>
  <th colspan="5" style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">التكرار
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 10%; background-color: #f2f2f2;">المجموع
  </th>
  </tr>
  <tr>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">١</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٢</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٣</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٤</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٥</th>
  </tr>
  </thead>
  <tbody>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">١</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٢</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٣</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٤</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٥</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  </tbody>
  </table>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-top: 5px; margin-bottom: 5px; text-decoration: underline;">
  رابعاً: تحديد وظيفة السلوك (التحليل):</div>
  <div style="margin-bottom: 4mm;">
  <div style="font-weight: bold;">المثيرات القبلية: <span style="font-weight: normal;">(الأسباب التي تسبق
  السلوك غير المرغوب):</span></div>
  <div style="width: 100%; border-bottom: 1px dotted #999; height: 22px;"></div>
  </div>
  <div style="margin-bottom: 4mm;">
  <div style="font-weight: bold;">المثيرات البعدية: <span style="font-weight: normal;">(ماذا يحدث بعد
  السلوك؟):</span></div>
  <div style="width: 100%; border-bottom: 1px dotted #999; height: 22px;"></div>
  </div>
  <div style="margin-bottom: 4mm;">
  <div style="font-weight: bold;">ما الذي يحققه الطالب من خلال السلوك؟</div>
  <div style="width: 100%; border-bottom: 1px dotted #999; height: 22px;"></div>
  </div>
  <div style="margin-bottom: 0;">
  <div style="font-weight: bold;">الإجراءات السابقة المستخدمة للحد من السلوك:</div>
  <div style="width: 100%; border-bottom: 1px dotted #999; height: 22px;"></div>
  </div>
  </div>
  <div style="page-break-before: always;"></div>
  <div
  style="padding: 3mm 8mm; font-family: 'Traditional Arabic', 'Amiri', serif; font-size: 14pt; line-height: 1.35;">
  <div class="header-container"
  style="border-bottom: 2px solid #000; padding-bottom: 3px; margin-bottom: 5px;"><img src=""
  class="header-logo" alt="الشعار"></div>
  <div style="text-align: center; font-size: 17pt; font-weight: bold; margin-top: 3px; margin-bottom: 8px;">
  تابع: خطة تعديل السلوك</div>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-bottom: 5px; text-decoration: underline;">
  خامساً: تصميم خطة تعديل السلوك:</div>
  <div style="margin-bottom: 4mm;">
  <div style="font-weight: bold;">تعريف السلوك المرغوب إكسابه للطالب إجرائياً:</div>
  <div style="width: 100%; border-bottom: 1px dotted #999; height: 22px;"></div>
  </div>
  <div style="margin-bottom: 3mm;">
  <div style="font-weight: bold;">الإجراءات المستخدمة للحد من السلوك غير المرغوب وتحقيق السلوك المرغوب:
  </div>
  </div>
  <div style="margin-right: 10px; line-height: 1.4;">
  <div style="margin-bottom: 3mm;"><span style="font-weight: bold;">١-</span> الإجراء الأول: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  <div style="margin-bottom: 3mm;"><span style="font-weight: bold;">٢-</span> الإجراء الثاني: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  <div style="margin-bottom: 3mm;"><span style="font-weight: bold;">٣-</span> الإجراء الثالث: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  <div style="margin-bottom: 3mm;"><span style="font-weight: bold;">٤-</span> الإجراء الرابع: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  <div style="margin-bottom: 3mm;"><span style="font-weight: bold;">٥-</span> الإجراء الخامس: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  <div style="margin-bottom: 4mm;"><span style="font-weight: bold;">٦-</span> الإجراء السادس: <span
  style="width: 70%; display: inline-block; border-bottom: 1px dotted #999; height: 20px;"></span>
  </div>
  </div>
  <div style="margin-bottom: 3px; font-weight: bold;">متابعة السلوك (بعد التنفيذ):</div>
  <table
  style="width: 100%; border-collapse: collapse; font-size: 11pt; margin-top: 3px; margin-bottom: 5px;">
  <thead>
  <tr>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 8%; background-color: #f2f2f2;">اليوم
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 14%; background-color: #f2f2f2;">التاريخ
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 14%; background-color: #f2f2f2;">فترة
  الملاحظة</th>
  <th colspan="5" style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">التكرار
  </th>
  <th rowspan="2"
  style="border: 1px solid #000; padding: 3px; width: 10%; background-color: #f2f2f2;">المجموع
  </th>
  </tr>
  <tr>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">١</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٢</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٣</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٤</th>
  <th style="border: 1px solid #000; padding: 3px; background-color: #f2f2f2;">٥</th>
  </tr>
  </thead>
  <tbody>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">١</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٢</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٣</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٤</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  <tr style="height: 22px;">
  <td style="border: 1px solid #000; text-align: center;">٥</td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  <td style="border: 1px solid #000;"></td>
  </tr>
  </tbody>
  </table>
  <div
  style="background-color: #eee; padding: 3px 8px; border: 1px solid #000; font-size: 13pt; font-weight: bold; margin-top: 3px; margin-bottom: 3px; text-decoration: underline;">
  سادساً: تقييم فاعلية الخطة أو البرنامج:</div>
  <div style="margin-bottom: 2mm;">رأي وكيل / وكيلة المدرسة: <span
  style="width: 65%; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  <div style="margin-bottom: 2mm;">رأي معلم / معلمة الفصل: <span
  style="width: 67%; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  <div style="margin-bottom: 3mm;">رأي ولي الأمر: <span
  style="width: 75%; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  <div style="margin-bottom: 2mm; font-weight: bold;">القائم بتعديل السلوك (معلم / موجه طلابي):</div>
  <div style="margin-right: 20px; line-height: 1.3;">
  <div style="margin-bottom: 2mm;">الاسم: <span
  style="width: 160px; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  <div style="margin-bottom: 2mm;">التوقيع: <span
  style="width: 160px; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  <div>التاريخ: <span
  style="width: 110px; display: inline-block; border-bottom: 1px dotted #999; height: 18px;"></span>
  </div>
  </div>
  </div>`;
}

export function fillFormData_khota_tadeel(doc: Document, data: PrintFormData): void {
  fillField(doc, 'khota_studentName', data.studentName);
      fillField(doc, 'khota_grade', data.grade, true);
      fillField(doc, 'khota_class', data.class, true);
      if (data.khotaDob) fillField(doc, 'khota_dob', data.khotaDob, true);
      if (data.khotaAge) fillField(doc, 'khota_age', data.khotaAge, true);
      if (data.khotaStart) fillField(doc, 'khota_start', data.khotaStart, true);
      if (data.khotaEnd) fillField(doc, 'khota_end', data.khotaEnd, true);
      if (data.khotaProblem) fillField(doc, 'khota_problem', data.khotaProblem);
      if (data.khotaDegree) fillField(doc, 'khota_degree', data.khotaDegree, true);
      if (data.khotaDesc) fillField(doc, 'khota_desc', data.khotaDesc);
      if (data.khotaManifestations) {
        for (let i = 0; i < Math.min(data.khotaManifestations.length, 2); i++) {
          fillField(doc, 'khota_m' + (i + 1), data.khotaManifestations[i]);
        }
      }
}
