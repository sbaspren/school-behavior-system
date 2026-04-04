// ===== Form: ishar_wali_amr =====
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_ishar_wali_amr(): string {
  return `<div class="page-container">${H}
  <div class="confidential-mark">(سري)</div>
  <div class="form-title">إشعار ولي أمر الطالب بمشكلة سلوكية</div>
  <div class="form-body">
  <div class="section-block align-right" style="margin-bottom:15px;">المكرم ولي أمر الطالب: <span class="data-field with-dots" id="studentName" style="min-width:60px;"></span> الصف: <span class="data-field with-dots" id="grade" style="min-width:40px;"></span> في يوم: <span class="data-field with-dots" id="violationDay" style="min-width:40px;"></span> الموافق: <span class="data-field with-dots indic-num" id="violationDate" style="min-width:60px;"></span> هـ</div>
  <div class="section-block">السلام عليكم ورحمة الله وبركاته،،</div>
  <div class="section-block align-right" style="line-height:1.6;">نشعركم بأن الطالب المذكور أعلاه قام
  بارتكاب مخالفة سلوكية من الدرجة ( <span class="data-field indic-num" id="violationDegree"
  style="font-weight:bold;"></span> )، وهي: <span class="data-field with-dots align-right"
  style="width: 80%; display:inline-block" id="violationText"></span></div>
  <div class="section-block" style="line-height:1.6;">وقد قررت إدارة المدرسة اتخاذ الإجراءات التالية حياله
  وفق ما ورد في قواعد السلوك والمواظبة:
  <div style="margin-right: 15px; margin-top: 5px;">
  <div style="margin-bottom: 5px; display:flex;"><span class="indic-num"
  style="min-width:20px;">١.</span> <span class="data-field with-dots align-right"
  style="flex:1;" id="proc_1"></span></div>
  <div style="margin-bottom: 5px; display:flex;"><span class="indic-num"
  style="min-width:20px;">٢.</span> <span class="data-field with-dots align-right"
  style="flex:1;" id="proc_2"></span></div>
  <div style="margin-bottom: 5px; display:flex;"><span class="indic-num"
  style="min-width:20px;">٣.</span> <span class="data-field with-dots align-right"
  style="flex:1;" id="proc_3"></span></div>
  </div>
  </div>
  <div class="section-block">لذا يرجى منكم المتابعة والتعاون مع المدرسة بما يسهم في انضباط سلوك ابنكم،
  وتفضلوا بقبول التحية.</div>
  <table class="footer-table"><tr><td style="width:100%;text-align:left;padding-left:30px;"><div style="display:inline-block;text-align:center;"><strong style="display:block;margin-bottom:0.5em;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;">الاسم: <span class="data-field with-dots" id="managerName" style="min-width:150px;"></span></div><div>التوقيع: <span class="with-dots" style="min-width:150px;"></span></div></div></td></tr></table>
  </div>
  <div class="cut-line">( قص من هنا وإعادة الجزء الأسفل )</div>
  <div style="margin-top: 15px;">
  <div class="form-title" style="text-decoration: underline; margin-top: 5px;">إيصال استلام إشعار</div>
  <div class="section-block" style="margin-bottom: 4mm;">أقر أنا ولي أمر الطالب: <span
  class="data-field with-dots" id="studentName_2"></span> بأنني استلمت الإشعار الخاص بالمخالفة
  السلوكية، وسأقوم بمتابعة ابني.</div>
  <div style="display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold;">
  <div>الاسم: ........................</div>
  <div>التوقيع: ........................</div>
  <div>التاريخ: <span class="with-dots indic-num" style="min-width: 120px;"></span></div>
  </div>
  </div>
  </div>`;
}

export function fillFormData_ishar_wali_amr(doc: Document, data: PrintFormData): void {
  fillField(doc, 'studentName', data.studentName);
      fillField(doc, 'studentName_2', data.studentName);
      fillField(doc, 'grade', data.grade, true);
      fillField(doc, 'violationDay', data.violationDay);
      fillField(doc, 'violationDate', data.violationDate, true);
      fillField(doc, 'violationDegree', data.violationDegree, true);
      fillField(doc, 'violationText', '\u25CF ' + (data.violationText || ''));
      fillField(doc, 'managerName', data.managerName);
      if (data.procedures) {
        for (let i = 0; i < Math.min(data.procedures.length, 3); i++) {
          fillField(doc, 'proc_' + (i + 1), data.procedures[i]);
        }
      }
}
