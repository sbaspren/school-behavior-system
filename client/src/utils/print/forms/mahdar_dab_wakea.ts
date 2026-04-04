// ===== Form: mahdar_dab_wakea =====
import { toIndic, escapeHtml } from '../../printUtils';
import { PrintFormData, fillField, emptyRows } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_mahdar_dab_wakea(): string {
  return `<div class="page-container">${H}
<div class="confidential-mark">(سري)</div>
<div class="form-title">محضر ضبط واقعة / مخالفة</div>
<div class="form-body">
  <div class="section-block align-right">إنه في يوم: <span class="data-field with-dots" style="min-width:40px;" id="mahdar_day"></span> الموافق: <span class="data-field with-dots indic-num" style="min-width:60px;" id="mahdar_date"></span> هـ تم ضبط الطالب: <span class="data-field with-dots" style="min-width:60px;" id="mahdar_studentName"></span> بالصف: <span class="data-field with-dots" style="min-width:40px;" id="mahdar_grade"></span></div>
  <div class="section-block align-right">بسبب قيامه بـ: <span class="data-field with-dots align-right" style="width:100%;display:inline-block;" id="mahdar_problem"></span></div>
  <div class="section-block align-right">مكان الضبط: <span class="data-field with-dots" style="min-width:60%;" id="mahdar_location"></span></div>
  <div class="section-block" style="border:1px solid #999;padding:10px;margin-top:10px;" id="mahdar_obs_box"><strong>نوع المشاهدة / المضبوطات:</strong><br>
    <div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:20px;" id="mahdar_obs_list">
      <span><span class="manual-checkbox" id="mahdar_obs_0"></span> إفادة شاهد</span>
      <span><span class="manual-checkbox" id="mahdar_obs_1"></span> صور / فيديو</span>
      <span><span class="manual-checkbox" id="mahdar_obs_2"></span> أدوات مضبوطة</span>
      <span><span class="manual-checkbox" id="mahdar_obs_3"></span> تقرير طبي</span>
      <span><span class="manual-checkbox" id="mahdar_obs_4"></span> أخرى: <span class="data-field with-dots" style="min-width:100px;" id="mahdar_obs_other_text"></span></span>
    </div>
  </div>
  <div class="section-block" style="margin-top:15px;"><strong>شهود الواقعة:</strong>
    <table class="tracking-table"><thead><tr><th style="width:5%;">م</th><th style="width:35%;">الاسم</th><th style="width:25%;">الصفة / الوظيفة</th><th style="width:35%;">التوقيع</th></tr></thead>
    <tbody id="mahdar_witnesses_body">${emptyRows(2, 4)}</tbody></table>
  </div>
  <table class="footer-table" style="margin-top:20px;"><tr>
    <td style="width:33%;text-align:center;"><div class="signature-block" style="display:inline-block;text-align:right;"><strong style="display:block;margin-bottom:0.8em;text-align:center;">الطالب</strong><div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span class="data-field with-dots" style="display:inline-block;min-width:150px;text-align:center;"></span></div><div style="white-space:nowrap;">التوقيع: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:150px;"></span></div></div></td>
    <td style="width:33%;text-align:center;"><div class="signature-block" style="display:inline-block;text-align:right;"><strong style="display:block;margin-bottom:0.8em;text-align:center;">ولي الأمر (للعلم)</strong><div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span class="data-field with-dots" style="display:inline-block;min-width:150px;text-align:center;"></span></div><div style="white-space:nowrap;">التوقيع: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:150px;"></span></div></div></td>
    <td style="width:33%;text-align:center;"><div class="signature-block" style="display:inline-block;text-align:right;"><strong style="display:block;margin-bottom:0.8em;text-align:center;">وكيل شؤون الطلاب</strong><div style="margin-bottom:5px;white-space:nowrap;">الاسم: <span class="data-field with-dots" style="display:inline-block;min-width:150px;text-align:center;"></span></div><div style="white-space:nowrap;">التوقيع: <span style="display:inline-block;border-bottom:1px dotted #000;min-width:150px;"></span></div></div></td>
  </tr></table>
</div></div>`;
}

export function fillFormData_mahdar_dab_wakea(doc: Document, data: PrintFormData): void {
  fillField(doc, 'mahdar_studentName', data.studentName);
      fillField(doc, 'mahdar_grade', data.grade, true);
      fillField(doc, 'mahdar_day', data.violationDay);
      fillField(doc, 'mahdar_date', data.violationDate, true);
      fillField(doc, 'mahdar_problem', '\u25CF ' + (data.violationText || ''));
      if (data.mahdarLocation) fillField(doc, 'mahdar_location', data.mahdarLocation);
      // ★ المشاهدات / المضبوطات — تفعيل ✓ بدل □
      if (data.mahdarObservations) {
        const obsLabels = ['إفادة شاهد', 'صور / فيديو', 'أدوات مضبوطة', 'تقرير طبي', 'أخرى'];
        data.mahdarObservations.forEach((obs) => {
          const idx = obsLabels.indexOf(obs);
          if (idx >= 0 && idx < 5) {
            const chk = doc.getElementById('mahdar_obs_' + idx);
            if (chk) chk.textContent = '\u2713';
          } else {
            // نوع غير معروف = "أخرى"
            const chk4 = doc.getElementById('mahdar_obs_4');
            if (chk4) chk4.textContent = '\u2713';
            fillField(doc, 'mahdar_obs_other_text', obs);
          }
        });
      }
      // ★ شهود الواقعة — ديناميكي
      if (data.mahdarWitnesses && data.mahdarWitnesses.length > 0) {
        const wtb = doc.getElementById('mahdar_witnesses_body');
        if (wtb) {
          wtb.innerHTML = '';
          data.mahdarWitnesses.forEach((w, i) => {
            const tr = doc.createElement('tr');
            tr.innerHTML = `<td class="indic-num">${toIndic(i + 1)}</td>`
              + `<td style="text-align:right;padding-right:5px;font-weight:bold;">${escapeHtml(w.name)}</td>`
              + `<td>${escapeHtml(w.role || '')}</td><td></td>`;
            wtb.appendChild(tr);
          });
        }
      }
}
