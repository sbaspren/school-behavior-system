// ===== Form: mashajara =====
import { toIndic, escapeHtml } from '../../printUtils';
import { PrintFormData, fillField } from '../printTypes';

const H = `<div class="header-container"><img src="" class="header-logo" alt="\u0627\u0644\u0634\u0639\u0627\u0631"></div>`;

export function getTemplateHtml_mashajara(): string {
  return `<div class="page-container">${H}
<div class="confidential-mark">(سري)</div>
<div class="form-title">محضر إثبات واقعة (سلوك غير تربوي)</div>
<div class="form-body">
  <div class="section-block" style="text-align:justify;line-height:1.8;">
    في يوم (<span class="data-field with-dots" style="min-width:40px;" id="mashajara_day"></span>) الموافق (<span class="data-field with-dots indic-num" style="min-width:60px;" id="mashajara_date"></span> هـ)، وعند الساعة (<span class="data-field with-dots" style="min-width:40px;" id="mashajara_time"></span>)، جرى تحرير هذا المحضر لإثبات واقعة مشاجرة بدنية حدثت في (<span class="data-field with-dots" style="min-width:80px;" id="mashajara_location"></span>) بين كلٍّ من:
  </div>
  <div id="mashajara_students_list"></div>
  <div class="section-block align-right" style="line-height:1.8;">
    وبحسب ما تم رصده وملاحظته، فقد بادر الطالب (<span class="data-field with-dots" style="min-width:60px;" id="mashajara_initiator"></span>) إلى القيام بالتالي:
  </div>
  <div class="section-block align-right" style="line-height:1.8;">
    <span class="data-field with-dots align-right" style="min-width:100px;" id="mashajara_desc"></span>، في سلوك يخالف الضوابط التربوية والتعليمية المعتمدة، مما أدى إلى نشوب مشاجرة بين <span id="mashajara_parties_word">الطرفين</span>.
  </div>
  <div class="section-block align-right" style="line-height:1.8;">وقد نتج عن هذه الواقعة ما يلي:</div>
  <div class="section-block align-right" style="line-height:1.8;">
    <strong>أولاً: الأضرار الجسدية</strong>
    <span class="data-field with-dots" style="width:100%;display:block;text-align:right;" id="mashajara_physical"></span>
  </div>
  <div class="section-block align-right" style="line-height:1.8;">
    <strong>ثانياً: الأضرار المادية</strong>
    <span class="data-field with-dots" style="width:100%;display:block;text-align:right;" id="mashajara_material"></span>
  </div>
  <div class="section-block" style="text-align:justify;line-height:1.8;margin-top:10px;">
    وعليه تم تدوين هذا المحضر لإثبات ما حدث، واستكمال الإجراءات النظامية وفق اللوائح والتعليمات المعتمدة.
  </div>
  <div class="section-block align-right" style="margin-top:20px;">اسم مُحرِّر المحضر: <span class="data-field with-dots" style="min-width:60px;" id="mashajara_author"></span> الصفة: <span class="data-field with-dots" style="min-width:60px;" id="mashajara_author_role"></span> التوقيع: <span class="with-dots" style="min-width:60px;"></span> التاريخ: <span class="data-field with-dots indic-num" style="min-width:60px;" id="mashajara_author_date"></span></div>
</div></div>`;
}

export function fillFormData_mashajara(doc: Document, data: PrintFormData): void {
  fillField(doc, 'mashajara_day', data.day);
      fillField(doc, 'mashajara_date', data.date, true);
      fillField(doc, 'mashajara_time', data.time, true);
      fillField(doc, 'mashajara_location', data.location);
      fillField(doc, 'mashajara_initiator', data.initiator);
      fillField(doc, 'mashajara_desc', data.description);
      // ★ الأضرار الجسدية (مصفوفة أو نص)
      if (Array.isArray(data.physicalDamage) && data.physicalDamage.length > 0) {
        const el = doc.getElementById('mashajara_physical');
        if (el) el.innerHTML = data.physicalDamage.map((d, i) => toIndic(i + 1) + '- ' + escapeHtml(d)).join('<br>');
      } else if (data.physicalDamage) {
        fillField(doc, 'mashajara_physical', data.physicalDamage as string);
      }
      // ★ الأضرار المادية (مصفوفة أو نص)
      if (Array.isArray(data.materialDamage) && data.materialDamage.length > 0) {
        const el = doc.getElementById('mashajara_material');
        if (el) el.innerHTML = data.materialDamage.map((d, i) => toIndic(i + 1) + '- ' + escapeHtml(d)).join('<br>');
      } else if (data.materialDamage) {
        fillField(doc, 'mashajara_material', data.materialDamage as string);
      }
      // ★ محرر/محررو المحضر (دعم متعدد) — مطابق للأصلي
      if (data.authors && data.authors.length > 0) {
        fillField(doc, 'mashajara_author', data.authors[0].name);
        fillField(doc, 'mashajara_author_role', data.authors[0].role);
        fillField(doc, 'mashajara_author_date', data.date, true);
        // إذا أكثر من محرر، إضافة بقية المحررين
        if (data.authors.length > 1) {
          const authEl = doc.getElementById('mashajara_author');
          const authContainer = authEl?.parentElement;
          if (authContainer) {
            for (let ai = 1; ai < data.authors.length; ai++) {
              const authDiv = doc.createElement('div');
              authDiv.className = 'section-block align-right';
              authDiv.style.marginTop = '5px';
              authDiv.innerHTML = 'اسم مُحرِّر المحضر: <span class="data-field with-dots" style="min-width:60px;">' + escapeHtml(data.authors[ai].name) + '</span> الصفة: <span class="data-field with-dots" style="min-width:60px;">' + escapeHtml(data.authors[ai].role || '') + '</span> التوقيع: <span class="with-dots" style="min-width:60px;"></span>';
              authContainer.parentNode?.insertBefore(authDiv, authContainer.nextSibling);
            }
          }
        }
      } else {
        fillField(doc, 'mashajara_author', data.authorName || '');
        fillField(doc, 'mashajara_author_role', data.authorRole || '');
        fillField(doc, 'mashajara_author_date', data.date, true);
      }
      // ★ قائمة الطلاب ديناميكياً (حتى 12 طالب) مع أعمدة حسب العدد — مطابق للأصلي
      {
        const sc = doc.getElementById('mashajara_students_list');
        if (sc && data.students && data.students.length > 0) {
          const cnt = data.students.length;
          const cols = cnt <= 3 ? 1 : (cnt <= 6 ? 2 : 3);
          const minN = cols === 1 ? '60px' : (cols === 2 ? '40px' : '30px');
          const minG = cols === 1 ? '40px' : (cols === 2 ? '25px' : '20px');
          const fs = cols === 3 ? 'font-size:12pt;' : '';
          let html = '<div style="display:flex;flex-wrap:wrap;gap:0;">';
          data.students.forEach((s) => {
            const w = cols === 1 ? '100%' : (cols === 2 ? '50%' : '33.33%');
            html += '<div style="width:' + w + ';box-sizing:border-box;padding:2px 5px 2px 0;' + fs + '">';
            html += 'الطالب: <span class="data-field with-dots" style="min-width:' + minN + ';">' + escapeHtml(s.name || '') + '</span> ';
            html += 'الصف: <span class="data-field with-dots" style="min-width:' + minG + ';">' + toIndic(escapeHtml(s.grade || '')) + '</span>';
            html += '</div>';
          });
          html += '</div>';
          sc.innerHTML = html;
          // الطرفين أو الأطراف حسب العدد
          const pw = doc.getElementById('mashajara_parties_word');
          if (pw) pw.innerText = cnt > 2 ? 'الأطراف' : 'الطرفين';
        }
      }
}
