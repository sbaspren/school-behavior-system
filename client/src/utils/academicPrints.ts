import { printListReport, ListReportRow } from './printTemplates';
import { toIndic, shortenStudentName, escapeHtml } from './printUtils';
import { settingsApi } from '../api/settings';

let _s: any = null;
async function gs() {
  if (_s) return _s;
  try { const r = await settingsApi.getSettings(); _s = r.data?.data || {}; return _s; } catch { return { letterheadMode: 'text' }; }
}
const pl = (sem: string, per: string) => `${sem || ''} — ${per || ''}`.replace(/^—\s*/, '').replace(/\s*—$/, '');
const td = () => new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', calendar: 'islamic-umalqura' });

function openPrint(html: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => w.print(), 300);
}

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
body{font-family:'Amiri',serif;direction:rtl;margin:25px;font-size:12pt;color:#333;line-height:1.7}
h2{color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:4px;margin-top:24px}
h3{color:#2563eb;margin-top:16px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11pt}
th{background:#f2f2f2;border:1px solid #000;padding:6px;font-weight:700}
td{border:1px solid #000;padding:5px}
.page{page-break-after:always}.page:last-child{page-break-after:auto}
.red{color:#dc2626}.green{color:#16a34a}.blue{color:#2563eb}.amber{color:#d97706}
.sig{margin-top:35px;text-align:left;font-weight:700}
.stat-box{display:inline-block;text-align:center;border:1px solid #ccc;border-radius:8px;padding:8px 16px;margin:4px}
.stat-val{font-size:18pt;font-weight:700}
.alert{background:#fef2f2;border:1px solid #fecaca;padding:8px;border-radius:6px;margin:8px 0}
.msg{background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:6px;margin:16px 0}
.section{margin-top:14px;border:1px solid #ccc;border-radius:6px;padding:10px}
.section h4{color:#7c3aed;margin:0 0 8px 0}
.cb{display:inline-block;width:14px;height:14px;border:1px solid #333;margin-left:4px;vertical-align:middle}`;

// 1. التقرير الإحصائي الشامل
export async function printAdvancedReport(d: any, stage: string, sem: string, per: string) {
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>التقرير الإحصائي الشامل</title><style>${CSS}</style></head><body>`;
  h += `<div style="text-align:center;margin-bottom:20px"><h1 style="color:#0d9488">التقرير الإحصائي الشامل</h1><p>${escapeHtml(pl(sem, per))} | ${td()}</p></div>`;
  h += `<h2>المؤشرات العامة</h2><div style="text-align:center">`;
  [['الطلاب', d.overall.totalStudents], ['المتوسط', d.overall.mean + '%'], ['الوسيط', d.overall.median + '%'], ['الانحراف', d.overall.sd], ['م.الاختلاف', d.overall.cv + '%']].forEach(([l, v]) => { h += `<div class="stat-box"><div class="stat-val">${toIndic(v as any)}</div><div>${l}</div></div>`; });
  h += `</div>`;
  h += `<h2>الصفوف</h2><table><tr><th>الصف</th><th>العدد</th><th>المتوسط</th><th>الوسيط</th><th>الانحراف</th><th>ممتاز</th><th>جيد جداً</th><th>جيد</th><th>مقبول</th><th>ضعيف</th></tr>`;
  (d.gradeStats || []).forEach((g: any) => { h += `<tr><td><b>${g.grade}</b></td><td>${toIndic(g.count)}</td><td class="blue"><b>${toIndic(g.mean)}%</b></td><td>${toIndic(g.median)}%</td><td${g.sd > 10 ? ' class="red"' : ''}>${toIndic(g.sd)}</td><td class="green">${toIndic(g.distribution.excellent)}</td><td class="blue">${toIndic(g.distribution.veryGood)}</td><td class="amber">${toIndic(g.distribution.good)}</td><td>${toIndic(g.distribution.pass)}</td><td class="red">${toIndic(g.distribution.fail)}</td></tr>`; });
  h += `</table>`;
  const bg = (d.gapAnalysis || []).filter((g: any) => g.gap > 3);
  if (bg.length) { h += `<h2>فجوات > ٣%</h2><table><tr><th>المادة</th><th>الصف</th><th>الفجوة</th><th>التصنيف</th><th>الفصول</th></tr>`; bg.forEach((g: any) => { h += `<tr><td><b>${g.subject}</b></td><td>${g.grade}</td><td class="${g.gap > 10 ? 'red' : 'amber'}"><b>${toIndic(g.gap)}%</b></td><td>${g.severity}</td><td>${g.classes.map((c: any) => `ف${toIndic(c.classNum)}: ${toIndic(c.avg)}%`).join(' | ')}</td></tr>`; }); h += `</table>`; }
  h += `<h2>الغياب والتحصيل</h2><p>معامل بيرسون: <b>${toIndic(d.correlation.pearsonR)}</b> — ${d.correlation.interpretation}</p><p>غائبون: <span class="red">${toIndic(d.correlation.absentAvg)}%</span> | غير غائبين: <span class="green">${toIndic(d.correlation.nonAbsentAvg)}%</span> | الفرق: <b>${toIndic(d.correlation.difference)}%</b></p>`;
  h += `<h2>الملخص</h2>`;
  if (d.executiveSummary.weakestSubjects?.length) h += `<div class="alert"><b>أضعف المواد:</b> ${d.executiveSummary.weakestSubjects.map((s: any) => `${s.subject} (${toIndic(s.mean)}%)`).join(' — ')}</div>`;
  h += `<p><b>طلاب الخطر:</b> ${toIndic(d.executiveSummary.totalAtRisk)} (${toIndic(d.executiveSummary.atRiskPercent)}%)</p>`;
  h += `<div class="sig">وكيل شؤون الطلاب: _______________</div></body></html>`;
  openPrint(h);
}

// 2. كشف النتائج
export async function printGradeResults(summary: any[], stage: string, sem: string, per: string) {
  const s = await gs();
  const sorted = [...summary].sort((a, b) => (b.average || b.Average || 0) - (a.average || a.Average || 0));
  const grouped: Record<string, any[]> = {};
  sorted.forEach(r => { const k = `${r.grade || r.Grade} فصل ${r.classNum || r.ClassNum}`; if (!grouped[k]) grouped[k] = []; grouped[k].push(r); });
  const rows: ListReportRow[] = [];
  let idx = 0;
  for (const [label, sts] of Object.entries(grouped)) {
    if (idx > 0) rows.push({ isSeparator: true, cells: [] });
    rows.push({ isGroupHeader: true, groupLabel: label, groupCount: sts.length, cells: [] });
    sts.forEach((st, i) => { rows.push({ cells: [toIndic(i + 1), shortenStudentName(st.studentName || st.StudentName || ''), st.classNum || st.ClassNum || '', toIndic(((st.average || st.Average || 0) as number).toFixed(1)) + '%', st.generalGrade || st.GeneralGrade || '', toIndic(st.absence || st.Absence || 0), ''] }); });
    idx++;
  }
  printListReport({ title: 'كشف نتائج الطلاب', subtitle: pl(sem, per), dateText: td(), statsBar: `إجمالي: ${toIndic(sorted.length)}`, headers: [{ label: 'م', width: '5%' }, { label: 'الطالب', width: '30%' }, { label: 'الفصل', width: '8%' }, { label: 'المعدل', width: '12%' }, { label: 'التقدير', width: '15%' }, { label: 'الغياب', width: '8%' }, { label: 'ملاحظات', width: '22%' }], rows }, s);
}

// 3. العشرة الأوائل
export async function printTopPerClass(topData: any[], stage: string, sem: string, per: string) {
  const s = await gs();
  const grouped: Record<string, any[]> = {};
  topData.forEach(t => { if (!grouped[t.label]) grouped[t.label] = []; grouped[t.label].push(t); });
  const rows: ListReportRow[] = [];
  let idx = 0;
  for (const [label, sts] of Object.entries(grouped)) {
    if (idx > 0) rows.push({ isSeparator: true, cells: [] });
    rows.push({ isGroupHeader: true, groupLabel: '🏆 ' + label, cells: [] });
    sts.forEach((st, i) => { rows.push({ cells: [i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : toIndic(i + 1), shortenStudentName(st.name), toIndic((st.average || 0).toFixed(1)) + '%', st.generalGrade || ''] }); });
    idx++;
  }
  printListReport({ title: 'العشرة الأوائل', subtitle: pl(sem, per), dateText: td(), headers: [{ label: 'الترتيب', width: '12%' }, { label: 'الطالب', width: '48%' }, { label: 'المعدل', width: '20%' }, { label: 'التقدير', width: '20%' }], rows }, s);
}

// 4. الراسبين
export async function printFailingStudents(data: any[], stage: string, sem: string, per: string) {
  const s = await gs();
  const rows: ListReportRow[] = data.map((st, i) => ({ cells: [toIndic(i + 1), shortenStudentName(st.name), `${st.grade} ف${st.classNum}`, toIndic((st.average || 0).toFixed(1)) + '%', toIndic(st.failCount), st.failSubjects.map((f: any) => f.subject).join('، '), toIndic(st.absence)] }));
  printListReport({ title: 'قائمة الطلاب الراسبين', subtitle: pl(sem, per), dateText: td(), statsBar: `الإجمالي: ${toIndic(data.length)}`, headers: [{ label: 'م', width: '5%' }, { label: 'الطالب', width: '20%' }, { label: 'الصف', width: '12%' }, { label: 'المعدل', width: '10%' }, { label: 'مواد', width: '8%' }, { label: 'المواد الراسب فيها', width: '33%' }, { label: 'الغياب', width: '7%' }], rows }, s);
}

// 5. الضعاف
export async function printWeakStudents(data: any[], stage: string, sem: string, per: string) {
  const s = await gs();
  const rows: ListReportRow[] = data.map((st: any, i: number) => ({ cells: [toIndic(i + 1), shortenStudentName(st.name), `${st.grade} ف${st.classNum}`, toIndic((st.average || 0).toFixed(1)) + '%', st.failSubjects?.join('، ') || '', st.weakSubjects?.join('، ') || '', `${st.riskLevel} (${toIndic(st.riskScore)})`, toIndic(st.absence)] }));
  printListReport({ title: 'الضعاف ومؤشر الخطر', subtitle: pl(sem, per), dateText: td(), statsBar: `إجمالي: ${toIndic(data.length)} | 🔴 ${toIndic(data.filter((s: any) => s.riskLevel === 'عالي').length)} | 🟠 ${toIndic(data.filter((s: any) => s.riskLevel === 'متوسط').length)} | 🟡 ${toIndic(data.filter((s: any) => s.riskLevel === 'منخفض').length)}`, headers: [{ label: 'م', width: '4%' }, { label: 'الطالب', width: '18%' }, { label: 'الصف', width: '10%' }, { label: 'المعدل', width: '8%' }, { label: '<٦٠', width: '17%' }, { label: '<٧٠', width: '17%' }, { label: 'الخطر', width: '12%' }, { label: 'غياب', width: '7%' }], rows }, s);
}

// 6. الفجوات
export async function printGapReport(data: any[], stage: string, sem: string, per: string) {
  const s = await gs();
  const rows: ListReportRow[] = data.map((g: any, i: number) => ({ cells: [toIndic(i + 1), g.subject, g.grade, toIndic(g.gap) + '%', g.severity, g.classes.map((c: any) => `ف${toIndic(c.classNum)}: ${toIndic(c.avg)}%`).join(' | ')] }));
  printListReport({ title: 'فجوات الفصول حسب المادة', subtitle: pl(sem, per), dateText: td(), headers: [{ label: 'م', width: '5%' }, { label: 'المادة', width: '25%' }, { label: 'الصف', width: '15%' }, { label: 'الفجوة', width: '10%' }, { label: 'التصنيف', width: '12%' }, { label: 'الفصول', width: '33%' }], rows }, s);
}

// 7. الارتباط
export async function printCorrelationReport(corr: any, overall: any, stage: string, sem: string, per: string) {
  const s = await gs();
  const rows: ListReportRow[] = [
    { cells: ['معامل بيرسون', toIndic(corr.pearsonR), corr.interpretation] },
    { cells: ['متوسط الغائبين', toIndic(corr.absentAvg) + '%', `${toIndic(corr.absentCount)} طالب`] },
    { cells: ['متوسط غير الغائبين', toIndic(corr.nonAbsentAvg) + '%', `${toIndic(corr.nonAbsentCount)} طالب`] },
    { cells: ['الفرق', toIndic(corr.difference) + '%', 'دليل على تأثير الغياب'] },
  ];
  printListReport({ title: 'الغياب والتحصيل', subtitle: pl(sem, per), dateText: td(), summary: `النتيجة: ${corr.interpretation} — فرق ${toIndic(corr.difference)}%`, headers: [{ label: 'المؤشر', width: '35%' }, { label: 'القيمة', width: '25%' }, { label: 'التفسير', width: '40%' }], rows }, s);
}

// 8. خطاب المعلم
export async function printTeacherLetter(weak: any[], grades: any[], stage: string, sem: string, per: string) {
  const bySubj: Record<string, any[]> = {};
  weak.forEach(st => { (st.allSubjects || []).forEach((subj: any) => { if (!bySubj[subj.subject]) bySubj[subj.subject] = []; bySubj[subj.subject].push({ ...st, subjectTotal: subj.total }); }); });
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>خطاب المعلم</title><style>${CSS}</style></head><body>`;
  for (const [subject, students] of Object.entries(bySubj)) {
    h += `<div class="page"><div style="text-align:center"><h2 style="color:#0d9488">خطاب للمعلم</h2><p>${pl(sem, per)}</p></div>`;
    h += `<p><b>سعادة الأستاذ / _____________________ معلم مادة ${subject}</b></p>`;
    h += `<div class="msg">نظراً لحرص المدرسة على رفع مستوى التحصيل الدراسي، نأمل الاطلاع على قائمة الطلاب أدناه والعناية بهم من خلال تكثيف المتابعة وتقديم الدعم اللازم.</div>`;
    h += `<table><tr><th>م</th><th>الطالب</th><th>الفصل</th><th>الدرجة</th><th>المعدل</th></tr>`;
    students.sort((a: any, b: any) => a.subjectTotal - b.subjectTotal);
    students.forEach((st: any, i: number) => { h += `<tr><td style="text-align:center">${toIndic(i + 1)}</td><td>${shortenStudentName(st.name)}</td><td style="text-align:center">${st.grade} ف${st.classNum}</td><td style="text-align:center;color:${st.subjectTotal < 60 ? '#dc2626' : '#d97706'};font-weight:700">${toIndic(st.subjectTotal)}</td><td style="text-align:center">${toIndic((st.average || 0).toFixed(1))}%</td></tr>`; });
    h += `</table><div class="sig">وكيل شؤون الطلاب: _______________</div></div>`;
  }
  h += `</body></html>`;
  openPrint(h);
}

// 9. استدعاء ولي الأمر
export async function printParentSummon(weak: any[], stage: string, sem: string, per: string) {
  const hi = weak.filter((s: any) => s.riskLevel === 'عالي' || s.riskLevel === 'متوسط');
  if (!hi.length) { alert('لا يوجد طلاب بخطر عالي أو متوسط'); return; }
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>استدعاء</title><style>${CSS}</style></head><body>`;
  hi.forEach((st: any) => {
    h += `<div class="page"><div style="text-align:center"><h2 style="color:#dc2626">خطاب استدعاء ولي أمر</h2><p>${td()}</p></div>`;
    h += `<p><b>ولي أمر الطالب / ${shortenStudentName(st.name)}</b> — ${st.grade} فصل ${st.classNum}</p>`;
    h += `<p>أظهر ابنكم تراجعاً في مستواه الدراسي خلال ${pl(sem, per)}:</p>`;
    h += `<table><tr><th>المادة</th><th>الدرجة</th></tr>`;
    (st.allSubjects || []).forEach((s: any) => { h += `<tr><td>${s.subject}</td><td style="text-align:center;color:${s.total < 60 ? '#dc2626' : '#d97706'};font-weight:700">${toIndic(s.total)}</td></tr>`; });
    h += `</table><p><b>المعدل:</b> ${toIndic((st.average || 0).toFixed(1))}% — <b>الغياب:</b> ${toIndic(st.absence)} يوم</p>`;
    h += `<p>نأمل مراجعة المدرسة يوم <b>__________</b> الموافق <b>___/___/___</b></p>`;
    h += `<div style="border:1px solid #ccc;padding:12px;margin:16px 0;border-radius:6px"><b>إقرار ولي الأمر:</b> اطلعت على المستوى وأتعهد بالمتابعة.<br><br>الاسم: _____________ التوقيع: _____________ التاريخ: ___/___/___</div>`;
    h += `<div class="sig">وكيل شؤون الطلاب: _______________</div></div>`;
  });
  h += `</body></html>`;
  openPrint(h);
}

// 10. محضر اجتماع جمعي
export async function printGroupMeeting(weak: any[], stage: string, sem: string, per: string) {
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>محضر اجتماع</title><style>${CSS}</style></head><body>`;
  h += `<div style="text-align:center"><h2 style="color:#4338ca">محضر اجتماع الإرشاد الجمعي</h2></div>`;
  h += `<p><b>التاريخ:</b> ___/___/___ &nbsp; <b>المكان:</b> مكتب التوجيه &nbsp; <b>المرشد:</b> _______________</p>`;
  h += `<p><b>الهدف:</b> مناقشة أسباب التأخر الدراسي (${pl(sem, per)})</p>`;
  h += `<table><tr><th>م</th><th>الطالب</th><th>الصف</th><th>المعدل</th><th>التوقيع</th></tr>`;
  weak.slice(0, 30).forEach((st: any, i: number) => { h += `<tr><td style="text-align:center">${toIndic(i + 1)}</td><td>${shortenStudentName(st.name)}</td><td style="text-align:center">${st.grade} ف${st.classNum}</td><td style="text-align:center">${toIndic((st.average || 0).toFixed(1))}%</td><td></td></tr>`; });
  h += `</table><h3>التوصيات:</h3><div style="border:1px solid #ccc;min-height:80px;padding:10px"></div>`;
  h += `<table style="border:none;margin-top:25px"><tr><td style="border:none;width:50%"><b>المرشد:</b> ___________</td><td style="border:none;text-align:left"><b>وكيل الشؤون:</b> ___________</td></tr></table></body></html>`;
  openPrint(h);
}

// 11. سجل متابعة حسب الفصل
export async function printClassFollowUp(weak: any[], stage: string, sem: string, per: string) {
  const byClass: Record<string, any[]> = {};
  weak.forEach(st => { const k = `${st.grade} فصل ${st.classNum}`; if (!byClass[k]) byClass[k] = []; byClass[k].push(st); });
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل متابعة</title><style>${CSS} th,td{font-size:10pt;padding:4px}</style></head><body>`;
  for (const [label, sts] of Object.entries(byClass)) {
    h += `<div class="page"><div style="text-align:center"><h2 style="color:#166534">سجل متابعة الضعاف</h2><p><b>${label}</b> — ${pl(sem, per)}</p></div>`;
    h += `<table><tr><th rowspan="2">م</th><th rowspan="2">الطالب</th><th rowspan="2">مواد الضعف</th><th rowspan="2">المعدل</th><th colspan="3">متابعة ١</th><th colspan="3">متابعة ٢</th><th colspan="3">متابعة ٣</th><th colspan="3">متابعة ٤</th></tr>`;
    h += `<tr>${'<th>تاريخ</th><th>إجراء</th><th>نتيجة</th>'.repeat(4)}</tr>`;
    sts.forEach((st: any, i: number) => { h += `<tr><td style="text-align:center">${toIndic(i + 1)}</td><td>${shortenStudentName(st.name)}</td><td style="font-size:9pt">${[...(st.failSubjects || []), ...(st.weakSubjects || [])].join('، ')}</td><td style="text-align:center">${toIndic((st.average || 0).toFixed(1))}%</td>${'<td></td><td></td><td></td>'.repeat(4)}</tr>`; });
    h += `</table><div class="sig">وكيل شؤون الطلاب: _______________</div></div>`;
  }
  h += `</body></html>`;
  openPrint(h);
}

// 12. سجل متابعة فردي
export async function printIndividualFollowUp(weak: any[], stage: string, sem: string, per: string) {
  const hi = weak.filter((s: any) => s.riskLevel === 'عالي' || s.riskLevel === 'متوسط');
  if (!hi.length) { alert('لا يوجد طلاب بخطر عالي أو متوسط'); return; }
  let h = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل فردي</title><style>${CSS}</style></head><body>`;
  hi.forEach((st: any) => {
    const rc = st.riskLevel === 'عالي' ? '#dc2626' : '#f97316';
    h += `<div class="page"><div style="text-align:center"><h2 style="color:#9333ea">سجل متابعة فردي — طالب ضعيف</h2></div>`;
    h += `<div class="section"><h4>بيانات الطالب</h4><p><b>الاسم:</b> ${st.name} | <b>الصف:</b> ${st.grade} / ${st.classNum} | <b>المعدل:</b> ${toIndic((st.average || 0).toFixed(1))}% | <b>الخطر:</b> <span style="color:${rc}">${st.riskLevel} (${toIndic(st.riskScore)})</span> | <b>الغياب:</b> ${toIndic(st.absence)}</p></div>`;
    h += `<div class="section"><h4>البيانات الاجتماعية</h4><p><b>ولي الأمر:</b> _______________ <b>الجوال:</b> _______________ <b>الإخوة:</b> _____ <b>ترتيبه:</b> _____</p><p><b>الحالة:</b> <span class="cb"></span> مستقرة <span class="cb"></span> منفصلين <span class="cb"></span> يتيم <span class="cb"></span> أخرى: _____</p></div>`;
    h += `<div class="section"><h4>مواد الضعف</h4><table><tr><th>المادة</th><th>الدرجة</th><th>المعلم</th></tr>`;
    (st.allSubjects || []).forEach((s: any) => { h += `<tr><td>${s.subject}</td><td style="text-align:center;color:${s.total < 60 ? '#dc2626' : '#d97706'};font-weight:700">${toIndic(s.total)}</td><td></td></tr>`; });
    h += `</table></div>`;
    h += `<div class="section"><h4>أسباب الضعف</h4><p><span class="cb"></span> أكاديمي <span class="cb"></span> سلوكي <span class="cb"></span> أسري <span class="cb"></span> صحي <span class="cb"></span> نفسي <span class="cb"></span> أخرى: _____</p></div>`;
    h += `<div class="section"><h4>مقترحات التحسين</h4><p><span class="cb"></span> حصص تقوية <span class="cb"></span> متابعة ولي الأمر <span class="cb"></span> جلسات إرشاد <span class="cb"></span> مجموعة دراسية <span class="cb"></span> تحويل أخصائي</p></div>`;
    h += `<div class="section"><h4>جدول المتابعة</h4><table><tr><th>التاريخ</th><th>الإجراء</th><th>المنفذ</th><th>النتيجة</th><th>ملاحظات</th></tr>`;
    for (let r = 0; r < 5; r++) h += `<tr><td style="height:25px"></td><td></td><td></td><td></td><td></td></tr>`;
    h += `</table></div>`;
    h += `<div class="section"><h4>مآل الحالة</h4><p><span class="cb"></span> تحسّن ملحوظ <span class="cb"></span> تحسّن جزئي <span class="cb"></span> لم يتحسن <span class="cb"></span> تراجع</p><p><b>التوصية:</b> _________________________ <b>إغلاق الملف:</b> ___/___/___</p></div>`;
    h += `<table style="border:none;margin-top:15px"><tr><td style="border:none;width:50%"><b>المرشد:</b> ___________</td><td style="border:none;text-align:left"><b>وكيل الشؤون:</b> ___________</td></tr></table></div>`;
  });
  h += `</body></html>`;
  openPrint(h);
}
