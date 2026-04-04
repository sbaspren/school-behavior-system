// ===== Form: mahdar_lajnah_absence =====
import { PrintFormData, fillField, fillCommitteeMembers, emptyRows } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_mahdar_lajnah_absence(): string {
  return `<div class="page-container">${H}
<div class="form-title">محضر اجتماع لجنة التوجيه الطلابي<br><span style="font-size:14pt;font-weight:normal;">(لدراسة حالة غياب طالب)</span></div>
<div class="form-body">
  <div class="section-block">إنه في يوم: <span class="data-field with-dots" style="min-width:80px;" id="lajnah_abs_day"></span> الموافق: <span class="data-field with-dots indic-num" style="min-width:120px;" id="lajnah_abs_date"></span> عقدت لجنة التوجيه الطلابي اجتماعاً طارئاً برئاسة مدير المدرسة.</div>
  <div class="section-block align-right">وذلك للنظر في موضوع الطالب: <span class="data-field with-dots" style="min-width:250px;" id="lajnah_abs_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:120px;" id="lajnah_abs_grade"></span></div>
  <div class="sub-header">أولاً: وصف الحالة:</div>
  <div class="section-block align-right">عدم انتظام الطالب في الحضور للمدرسة، ووصول غيابه إلى: <span class="data-field with-dots indic-num" id="lajnah_abs_unexcused" style="min-width:60px"></span> يوماً بدون عذر، و<span class="data-field with-dots indic-num" id="lajnah_abs_excused" style="min-width:60px"></span> يوماً بعذر.</div>
  <div class="sub-header">ثانياً: الإجراءات التربوية المتخذة سابقاً:</div>
  <div class="section-block align-right">
    <div style="margin-bottom:5px;"><span class="indic-num">١.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_prev_1"></span></div>
    <div style="margin-bottom:5px;"><span class="indic-num">٢.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_prev_2"></span></div>
    <div style="margin-bottom:5px;"><span class="indic-num">٣.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_prev_3"></span></div>
  </div>
  <div class="sub-header">ثالثاً: توصيات وقرارات اللجنة:</div>
  <div class="section-block align-right">
    <div style="margin-bottom:5px;"><span class="indic-num">١.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_rec_1"></span></div>
    <div style="margin-bottom:5px;"><span class="indic-num">٢.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_rec_2"></span></div>
    <div style="margin-bottom:5px;"><span class="indic-num">٣.</span> <span class="data-field with-dots align-right" style="width:90%;" id="lajnah_abs_rec_3"></span></div>
  </div>
  <div class="sub-header">أعضاء اللجنة:</div>
  <table class="tracking-table"><thead><tr><th style="width:5%;">م</th><th style="width:35%;">الاسم</th><th style="width:25%;">العمل المكلف به</th><th style="width:35%;">التوقيع</th></tr></thead>
  <tbody id="lajnah_abs_members_table">${emptyRows(7, 4)}</tbody></table>
</div></div>`;
}

export function fillFormData_mahdar_lajnah_absence(doc: Document, data: PrintFormData): void {
  fillField(doc, 'lajnah_abs_studentName', data.studentName);
      fillField(doc, 'lajnah_abs_grade', data.grade, true);
      fillField(doc, 'lajnah_abs_day', data.violationDay);
      fillField(doc, 'lajnah_abs_date', data.violationDate, true);
      fillField(doc, 'lajnah_abs_unexcused', data.unexcusedDays, true);
      fillField(doc, 'lajnah_abs_excused', data.excusedDays, true);
      fillCommitteeMembers(doc, 'lajnah_abs_members_table', data.committeeMembers);
      if (data.lajnahPrevProcedures) {
        const lines = data.lajnahPrevProcedures.split('\n').filter(l => l.trim());
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
          fillField(doc, 'lajnah_abs_prev_' + (i + 1), lines[i].replace(/^[\u0660-\u0669\d]+[.)\-]\s*/, ''));
        }
      }
      if (data.lajnahRecommendations) {
        const lines = data.lajnahRecommendations.split('\n').filter(l => l.trim());
        for (let i = 0; i < Math.min(lines.length, 3); i++) {
          fillField(doc, 'lajnah_abs_rec_' + (i + 1), lines[i].replace(/^[\u0660-\u0669\d]+[.)\-]\s*/, ''));
        }
      }
}
