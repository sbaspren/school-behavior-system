/**
 * ══════════════════════════════════════════════════════════════
 * مطبوعات التحصيل الدراسي — 16 تقرير/نموذج
 * ══════════════════════════════════════════════════════════════
 * جميع المطبوعات تستخدم printListReport / printSingleDetail
 */

import { toIndic, escapeHtml, shortenStudentName, classToLetter, getTodayDates } from './printUtils';
import { printListReport, printSingleDetail, ListReportRow, SchoolSettings } from './printTemplates';
import type {
  SummaryRow, GradeRow, AdvancedAnalysis, RiskStudent,
  TopStudent, SubjectAnalysis, ClassGapAnalysis, DescriptiveStats
} from './academicStats';

const D = () => { const d = getTodayDates(); return `${d.dayName} ${d.hijri}`; };
const N = (n: number) => toIndic(n.toFixed(1));
const NI = (n: number) => toIndic(Math.round(n));

// ══════════════════════════════════════════════════════
// 1. التقرير الإحصائي الشامل
// ══════════════════════════════════════════════════════
export function printStatisticalReport(analysis: AdvancedAnalysis, periodLabel: string, settings: SchoolSettings): void {
  const a = analysis;
  const rows: ListReportRow[] = [];

  // === المؤشرات الوصفية ===
  rows.push({ cells: [], isGroupHeader: true, groupLabel: '📊 المؤشرات الإحصائية الأساسية' });
  rows.push({ cells: ['', 'العدد', 'المتوسط', 'الوسيط', 'المنوال', 'الانحراف', 'المدى', 'معامل الاختلاف'] });

  const addStats = (label: string, s: DescriptiveStats) => {
    rows.push({ cells: [label, NI(s.count), N(s.mean) + '%', N(s.median) + '%', NI(s.mode) + '%', N(s.stdDev), N(s.range), N(s.cv) + '%'] });
  };
  addStats('المدرسة', a.overall);
  a.byGrade.forEach(g => addStats(g.grade, g.stats));
  a.byClass.forEach(c => addStats(c.label, c.stats));

  rows.push({ cells: [], isSeparator: true });

  // === توزيع التقديرات ===
  rows.push({ cells: [], isGroupHeader: true, groupLabel: '📈 توزيع التقديرات' });
  rows.push({ cells: ['', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', '', ''] });
  for (const gd of a.gradeDistByGrade) {
    const cells = [gd.grade, ...gd.dist.map(d => `${NI(d.count)} (${NI(d.pct)}%)`)];
    while (cells.length < 8) cells.push('');
    rows.push({ cells });
  }

  rows.push({ cells: [], isSeparator: true });

  // === فجوات الفصول ===
  rows.push({ cells: [], isGroupHeader: true, groupLabel: '🔍 فجوات الفصول (> ٥%)' });
  const critGaps = a.classGaps.filter(g => g.gap > 3);
  for (const g of critGaps) {
    const classStr = g.classes.map(c => `${c.classLabel}: ${N(c.avg)}%`).join(' | ');
    const color = g.gap > 10 ? '🔴' : g.gap > 5 ? '🟠' : '🟡';
    rows.push({ cells: [g.subject, `${color} فجوة ${N(g.gap)}%`, classStr, g.gapLevel, '', '', '', ''] });
  }

  rows.push({ cells: [], isSeparator: true });

  // === الارتباط ===
  rows.push({ cells: [], isGroupHeader: true, groupLabel: '📉 العلاقة بين الغياب والتحصيل' });
  rows.push({ cells: ['معامل بيرسون', toIndic(a.correlation.pearsonR.toString()), a.correlation.interpretation, '', '', '', '', ''] });
  rows.push({ cells: ['الغائبون (>٢ أيام)', `${N(a.correlation.absentAvg)}%`, `${NI(a.correlation.absentCount)} طالب`, '', '', '', '', ''] });
  rows.push({ cells: ['غير الغائبين', `${N(a.correlation.nonAbsentAvg)}%`, `${NI(a.correlation.nonAbsentCount)} طالب`, '', '', '', '', ''] });
  rows.push({ cells: ['الفرق', `${N(a.correlation.difference)}%`, '', '', '', '', '', ''] });

  const statsBar = `إجمالي الطلاب: ${NI(a.overall.count)} | المعدل العام: ${N(a.overall.mean)}% | أعلى: ${N(a.overall.max)}% | أقل: ${N(a.overall.min)}% | طلاب خطر: ${NI(a.riskSummary.high + a.riskSummary.medium)}`;

  const summary = `<b>الملخص التنفيذي:</b> أضعف المواد: ${a.weakestSubjects.map(s => s.name + ' ' + N(s.avg) + '%').join('، ')} | طلاب خطر عالي: ${NI(a.riskSummary.high)} | خطر متوسط: ${NI(a.riskSummary.medium)} | فجوات حرجة: ${NI(a.criticalGaps.length)}`;

  printListReport({
    title: 'التقرير الإحصائي الشامل للتحصيل الدراسي',
    subtitle: periodLabel,
    dateText: D(),
    statsBar,
    headers: [
      { label: 'البند', width: '18%' }, { label: 'القيمة', width: '12%' },
      { label: 'التفصيل', width: '20%' }, { label: 'الحالة', width: '10%' },
      { label: '', width: '10%' }, { label: '', width: '10%' },
      { label: '', width: '10%' }, { label: '', width: '10%' }
    ],
    rows, summary,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 2. كشف نتائج الصف / الفصل
// ══════════════════════════════════════════════════════
export function printGradeSheet(summary: SummaryRow[], periodLabel: string, settings: SchoolSettings): void {
  const sorted = [...summary].sort((a, b) => (b.average || 0) - (a.average || 0));
  const gradeGroups = new Map<string, SummaryRow[]>();
  sorted.forEach(s => {
    const key = `${s.grade} — فصل ${classToLetter(s.classNum)}`;
    if (!gradeGroups.has(key)) gradeGroups.set(key, []);
    gradeGroups.get(key)!.push(s);
  });

  const rows: ListReportRow[] = [];
  let globalIdx = 0;
  gradeGroups.forEach((students, label) => {
    rows.push({ cells: [], isGroupHeader: true, groupLabel: label, groupCount: students.length });
    students.forEach((s, i) => {
      globalIdx++;
      rows.push({ cells: [
        toIndic(globalIdx), shortenStudentName(s.studentName), classToLetter(s.classNum),
        s.average ? N(s.average) + '%' : '-', s.generalGrade || '-',
        s.absence > 0 ? `<span style="color:red">${toIndic(s.absence)}</span>` : toIndic(0), ''
      ] });
    });
    rows.push({ cells: [], isSeparator: true });
  });

  const avgs = summary.map(s => s.average || 0).filter(a => a > 0);
  const avg = avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '0';
  const statsBar = `إجمالي: ${toIndic(summary.length)} طالب | المعدل العام: ${toIndic(avg)}%`;

  printListReport({
    title: 'كشف نتائج الطلاب',
    subtitle: periodLabel,
    dateText: D(), statsBar,
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '30%' },
      { label: 'الفصل', width: '8%' }, { label: 'المعدل', width: '12%' },
      { label: 'التقدير', width: '15%' }, { label: 'الغياب', width: '10%' },
      { label: 'ملاحظات', width: '20%' }
    ],
    rows,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 3. العشرة الأوائل من كل فصل
// ══════════════════════════════════════════════════════
export function printTopTen(topTenByClass: { label: string; students: TopStudent[] }[], periodLabel: string, settings: SchoolSettings): void {
  const rows: ListReportRow[] = [];
  topTenByClass.forEach(cls => {
    rows.push({ cells: [], isGroupHeader: true, groupLabel: `🏆 ${cls.label}`, groupCount: cls.students.length });
    cls.students.forEach(s => {
      const medal = s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : toIndic(s.rank);
      rows.push({ cells: [medal, shortenStudentName(s.name), classToLetter(s.classNum), N(s.average) + '%', s.generalGrade || '-'] });
    });
    rows.push({ cells: [], isSeparator: true });
  });

  printListReport({
    title: 'العشرة الأوائل',
    subtitle: periodLabel,
    dateText: D(),
    headers: [
      { label: 'الترتيب', width: '10%' }, { label: 'اسم الطالب', width: '35%' },
      { label: 'الفصل', width: '10%' }, { label: 'المعدل', width: '15%' },
      { label: 'التقدير', width: '15%' }
    ],
    rows,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 6. قائمة الطلاب الراسبين
// ══════════════════════════════════════════════════════
export function printFailedStudents(students: RiskStudent[], periodLabel: string, settings: SchoolSettings): void {
  const rows: ListReportRow[] = students.map((s, i) => ({
    cells: [
      toIndic(i + 1), shortenStudentName(s.name), s.grade, classToLetter(s.classNum),
      N(s.average) + '%', toIndic(s.weakSubjects.length),
      `<span style="color:red">${s.weakSubjects.join('، ')}</span>`,
      s.absence > 0 ? toIndic(s.absence) : '-'
    ]
  }));

  printListReport({
    title: 'قائمة الطلاب الراسبين',
    subtitle: periodLabel,
    dateText: D(),
    statsBar: `إجمالي الراسبين: ${toIndic(students.length)} طالب`,
    headers: [
      { label: 'م', width: '4%' }, { label: 'اسم الطالب', width: '22%' },
      { label: 'الصف', width: '10%' }, { label: 'الفصل', width: '6%' },
      { label: 'المعدل', width: '8%' }, { label: 'عدد المواد', width: '8%' },
      { label: 'المواد الراسب فيها', width: '32%' }, { label: 'الغياب', width: '6%' }
    ],
    rows,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 7. الضعاف مع مواد الضعف
// ══════════════════════════════════════════════════════
export function printWeakStudents(students: RiskStudent[], periodLabel: string, settings: SchoolSettings): void {
  const rows: ListReportRow[] = students.map((s, i) => {
    const riskEmoji = s.riskLevel === 'خطر عالي' ? '🔴' : s.riskLevel === 'خطر متوسط' ? '🟠' : '🟡';
    const weakHtml = s.weakSubjects.length > 0 ? `<span style="color:red">${s.weakSubjects.join('، ')}</span>` : '-';
    const belowHtml = s.belowSubjects.length > 0 ? `<span style="color:#d97706">${s.belowSubjects.join('، ')}</span>` : '-';
    return {
      cells: [
        toIndic(i + 1), shortenStudentName(s.name), `${s.grade} / ${classToLetter(s.classNum)}`,
        N(s.average) + '%', weakHtml, belowHtml,
        `${riskEmoji} ${s.riskLevel}`, s.absence > 0 ? toIndic(s.absence) : '-'
      ]
    };
  });

  printListReport({
    title: 'قائمة الطلاب الضعاف دراسياً',
    subtitle: periodLabel,
    dateText: D(),
    statsBar: `الإجمالي: ${toIndic(students.length)} طالب | خطر عالي: ${toIndic(students.filter(s => s.riskLevel === 'خطر عالي').length)} | متوسط: ${toIndic(students.filter(s => s.riskLevel === 'خطر متوسط').length)}`,
    headers: [
      { label: 'م', width: '4%' }, { label: 'الطالب', width: '18%' },
      { label: 'الصف/الفصل', width: '10%' }, { label: 'المعدل', width: '8%' },
      { label: 'مواد < ٦٠%', width: '20%' }, { label: 'مواد < ٧٠%', width: '18%' },
      { label: 'مؤشر الخطر', width: '12%' }, { label: 'الغياب', width: '6%' }
    ],
    rows,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 9. خطاب المعلم — طلاب الضعف في مادته
// ══════════════════════════════════════════════════════
export function printTeacherLetter(
  subjectName: string,
  students: { name: string; classNum: string; grade: string; total: number; gradeLabel: string; average: number }[],
  periodLabel: string,
  settings: SchoolSettings
): void {
  const rows: ListReportRow[] = students.map((s, i) => ({
    cells: [toIndic(i + 1), shortenStudentName(s.name), `${s.grade} / ${classToLetter(s.classNum)}`, N(s.total), s.gradeLabel || '-', N(s.average) + '%']
  }));

  const message = `نظراً لحرص المدرسة على رفع مستوى التحصيل الدراسي، ولأهمية دور المعلم في رعاية الطلاب المتعثرين دراسياً، نأمل الاطلاع على قائمة الطلاب أدناه والعناية بهم من خلال تكثيف المتابعة وتقديم الدعم اللازم وتنويع أساليب التدريس بما يتناسب مع احتياجاتهم.`;

  printListReport({
    title: `خطاب متابعة الطلاب الضعاف — مادة ${subjectName}`,
    subtitle: periodLabel,
    dateText: D(),
    statsBar: `سعادة معلم مادة ${subjectName} &nbsp;&nbsp; المحترم | عدد الطلاب: ${toIndic(students.length)}`,
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' },
      { label: 'الصف/الفصل', width: '15%' }, { label: 'الدرجة', width: '12%' },
      { label: 'التقدير', width: '15%' }, { label: 'المعدل العام', width: '12%' }
    ],
    rows,
    summary: `<b>الرسالة التربوية:</b> ${message}`,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 10. استدعاء ولي الأمر (أكاديمي)
// ══════════════════════════════════════════════════════
export function printParentSummons(
  student: RiskStudent,
  grades: GradeRow[],
  periodLabel: string,
  settings: SchoolSettings
): void {
  const weakGrades = grades.filter(g => g.identityNo === student.identity && g.total < 70 && !['السلوك', 'المواظبة', 'النشاط'].includes(g.subject));

  const fields = [
    { label: 'ولي أمر الطالب', value: student.name },
    { label: 'الصف', value: student.grade },
    { label: 'الفصل', value: classToLetter(student.classNum) },
    { label: 'المعدل العام', value: `${student.average.toFixed(1)}%` },
    { label: 'الغياب', value: `${student.absence} يوم` },
  ];

  const tableHtml = weakGrades.length > 0
    ? `<table style="width:100%;border-collapse:collapse;margin:10px 0"><tr style="background:#f2f2f2"><th style="border:1px solid #000;padding:6px">المادة</th><th style="border:1px solid #000;padding:6px">الدرجة</th><th style="border:1px solid #000;padding:6px">التقدير</th></tr>`
      + weakGrades.map(g => `<tr><td style="border:1px solid #000;padding:6px">${escapeHtml(g.subject)}</td><td style="border:1px solid #000;padding:6px;text-align:center;color:red">${toIndic(g.total)}</td><td style="border:1px solid #000;padding:6px;text-align:center">${escapeHtml(g.gradeLabel)}</td></tr>`).join('')
      + '</table>'
    : '';

  const body = `يسر المدرسة إبلاغكم بأن ابنكم قد أظهر تراجعاً في مستواه الدراسي، حيث يعاني من ضعف في المواد التالية:`
    + tableHtml
    + `<p style="margin-top:15px">لذا نأمل التكرم بمراجعة المدرسة يوم .................. الموافق ...../...../..... لمناقشة الوضع الدراسي لابنكم.</p>`
    + `<p>مع التأكيد على أهمية التعاون بين المدرسة والأسرة لتحسين مستوى الطالب.</p>`
    + `<div style="border:1px solid #000;padding:10px;margin-top:20px"><b>إقرار ولي الأمر:</b><br>أقر أنا / ........................... ولي أمر الطالب بالاطلاع على المستوى الدراسي لابني وأتعهد بمتابعته.<br><br>التوقيع: ........................... &nbsp;&nbsp;&nbsp; التاريخ: ...../...../..... </div>`;

  printSingleDetail({
    title: 'خطاب استدعاء ولي أمر طالب',
    fields,
    messageTitle: 'السبب: تدني المستوى الدراسي',
    messageBody: body,
    dateText: D(),
  }, settings);
}

// ══════════════════════════════════════════════════════
// 11. محضر اجتماع جمعي
// ══════════════════════════════════════════════════════
export function printGroupMeeting(students: RiskStudent[], periodLabel: string, settings: SchoolSettings): void {
  const rows: ListReportRow[] = students.map((s, i) => ({
    cells: [toIndic(i + 1), shortenStudentName(s.name), `${s.grade} / ${classToLetter(s.classNum)}`, N(s.average) + '%', '']
  }));

  printListReport({
    title: 'محضر اجتماع الإرشاد الجمعي',
    subtitle: `${periodLabel} | الهدف: مناقشة أسباب التأخر الدراسي وتقديم الدعم اللازم`,
    dateText: D(),
    statsBar: `عدد الحضور: ${toIndic(students.length)} طالب | التاريخ: .................. | المكان: ..................`,
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '30%' },
      { label: 'الصف/الفصل', width: '15%' }, { label: 'المعدل', width: '12%' },
      { label: 'التوقيع', width: '20%' }
    ],
    rows,
    summary: `<b>محاور النقاش:</b><br>١. مراجعة المستوى الدراسي لكل طالب<br>٢. مناقشة أسباب الضعف (أكاديمية / سلوكية / أسرية)<br>٣. الاتفاق على خطة التحسين<br><br><b>التوصيات:</b><br>...............................................................................................................<br>...............................................................................................................<br><br><b>المرشد الطلابي:</b> ........................... &nbsp;&nbsp;&nbsp; <b>التوقيع:</b> ...........................`,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 12. سجل متابعة الطلاب الضعاف (حسب الفصل)
// ══════════════════════════════════════════════════════
export function printClassFollowUp(
  gradeLabel: string, classNum: string,
  students: RiskStudent[], periodLabel: string, settings: SchoolSettings
): void {
  const rows: ListReportRow[] = students.map((s, i) => {
    const weakAll = [...s.weakSubjects, ...s.belowSubjects].join('، ');
    return {
      cells: [
        toIndic(i + 1), shortenStudentName(s.name), N(s.average) + '%',
        `<span style="font-size:10pt">${weakAll}</span>`,
        '', '', '', '', ''  // 4 أعمدة متابعة + الحالة
      ]
    };
  });

  printListReport({
    title: 'سجل متابعة الطلاب الضعاف دراسياً',
    subtitle: `${gradeLabel} — فصل ${classToLetter(classNum)} | ${periodLabel}`,
    dateText: D(),
    statsBar: `عدد الطلاب: ${toIndic(students.length)} | المرشد: ....................`,
    headers: [
      { label: 'م', width: '3%' }, { label: 'الطالب', width: '15%' },
      { label: 'المعدل', width: '7%' }, { label: 'مواد الضعف', width: '18%' },
      { label: 'متابعة ١', width: '12%' }, { label: 'متابعة ٢', width: '12%' },
      { label: 'متابعة ٣', width: '12%' }, { label: 'متابعة ٤', width: '12%' },
      { label: 'الحالة', width: '9%' }
    ],
    rows,
    summary: `<b>الحالة النهائية:</b> ✅ تحسّن | ⚠️ مستمر في الضعف | 🔴 تراجع<br><b>ملاحظات:</b> ...............................................................................................................`,
  }, settings);
}

// ══════════════════════════════════════════════════════
// 13. سجل متابعة فردي للطالب الضعيف
// ══════════════════════════════════════════════════════
export function printIndividualFollowUp(
  student: RiskStudent,
  grades: GradeRow[],
  periodLabel: string,
  settings: SchoolSettings
): void {
  const weakGrades = grades.filter(g =>
    g.identityNo === student.identity && g.total < 70
    && !['السلوك', 'المواظبة', 'النشاط'].includes(g.subject)
  );

  const subjectRows = weakGrades.map((g, i) =>
    `<tr><td style="border:1px solid #000;padding:6px;text-align:center">${toIndic(i + 1)}</td>
     <td style="border:1px solid #000;padding:6px">${escapeHtml(g.subject)}</td>
     <td style="border:1px solid #000;padding:6px;text-align:center;color:${g.total < 60 ? 'red' : '#d97706'}">${toIndic(g.total)}</td>
     <td style="border:1px solid #000;padding:6px;text-align:center">${escapeHtml(g.gradeLabel)}</td>
     <td style="border:1px solid #000;padding:6px"></td></tr>`
  ).join('');

  const followUpRows = Array.from({ length: 6 }, (_, i) =>
    `<tr><td style="border:1px solid #000;padding:8px;text-align:center">${toIndic(i + 1)}</td>
     <td style="border:1px solid #000;padding:8px">...../...../..... </td>
     <td style="border:1px solid #000;padding:8px"></td>
     <td style="border:1px solid #000;padding:8px"></td>
     <td style="border:1px solid #000;padding:8px"></td>
     <td style="border:1px solid #000;padding:8px"></td></tr>`
  ).join('');

  const body = `
    <h3 style="text-align:center;margin:5px 0;font-size:16pt">سجل المتابعة الفردي للطالب الضعيف دراسياً</h3>
    <p style="text-align:center;font-size:12pt;color:#666">${periodLabel}</p>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="6" style="border:1px solid #000;padding:8px;font-size:13pt">بيانات الطالب</th></tr>
      <tr><td style="border:1px solid #000;padding:6px;width:15%;background:#f9f9f9"><b>الاسم</b></td><td style="border:1px solid #000;padding:6px;width:35%" colspan="2">${escapeHtml(student.name)}</td>
          <td style="border:1px solid #000;padding:6px;width:12%;background:#f9f9f9"><b>رقم الهوية</b></td><td style="border:1px solid #000;padding:6px" colspan="2">${toIndic(student.identity)}</td></tr>
      <tr><td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>الصف</b></td><td style="border:1px solid #000;padding:6px">${escapeHtml(student.grade)}</td>
          <td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>الفصل</b></td><td style="border:1px solid #000;padding:6px">${classToLetter(student.classNum)}</td>
          <td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>المعدل</b></td><td style="border:1px solid #000;padding:6px;color:red;font-weight:bold">${N(student.average)}%</td></tr>
      <tr><td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>الغياب</b></td><td style="border:1px solid #000;padding:6px">${toIndic(student.absence)} يوم</td>
          <td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>التأخر</b></td><td style="border:1px solid #000;padding:6px">${toIndic(student.tardiness)} مرة</td>
          <td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>مؤشر الخطر</b></td><td style="border:1px solid #000;padding:6px;font-weight:bold">${student.riskLevel}</td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="4" style="border:1px solid #000;padding:8px;font-size:13pt">البيانات الاجتماعية</th></tr>
      <tr><td style="border:1px solid #000;padding:6px;width:20%;background:#f9f9f9"><b>اسم ولي الأمر</b></td><td style="border:1px solid #000;padding:6px;width:30%"></td>
          <td style="border:1px solid #000;padding:6px;width:20%;background:#f9f9f9"><b>رقم الجوال</b></td><td style="border:1px solid #000;padding:6px;width:30%"></td></tr>
      <tr><td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>الحالة الأسرية</b></td><td style="border:1px solid #000;padding:6px">□ مستقرة &nbsp; □ منفصلين &nbsp; □ يتيم &nbsp; □ أخرى</td>
          <td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>المستوى التعليمي</b></td><td style="border:1px solid #000;padding:6px">الأب: ......... | الأم: .........</td></tr>
      <tr><td style="border:1px solid #000;padding:6px;background:#f9f9f9"><b>ملاحظات اجتماعية</b></td><td style="border:1px solid #000;padding:6px" colspan="3"></td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="5" style="border:1px solid #000;padding:8px;font-size:13pt">مواد الضعف</th></tr>
      <tr style="background:#f9f9f9"><th style="border:1px solid #000;padding:6px;width:5%">م</th><th style="border:1px solid #000;padding:6px;width:30%">المادة</th><th style="border:1px solid #000;padding:6px;width:15%">الدرجة</th><th style="border:1px solid #000;padding:6px;width:15%">التقدير</th><th style="border:1px solid #000;padding:6px;width:35%">المعلم</th></tr>
      ${subjectRows}
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="2" style="border:1px solid #000;padding:8px;font-size:13pt">تشخيص أسباب الضعف</th></tr>
      <tr><td style="border:1px solid #000;padding:10px" colspan="2">
        □ أكاديمي (صعوبة المادة) &nbsp;&nbsp; □ سلوكي (غياب/تأخر) &nbsp;&nbsp; □ أسري &nbsp;&nbsp; □ صحي &nbsp;&nbsp; □ نفسي &nbsp;&nbsp; □ أخرى: ....................
        <br><br><b>تفصيل الأسباب:</b> .......................................................................................................................................
      </td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="2" style="border:1px solid #000;padding:8px;font-size:13pt">مقترحات التحسين</th></tr>
      <tr><td style="border:1px solid #000;padding:10px" colspan="2">
        □ حصص تقوية &nbsp;&nbsp; □ متابعة ولي الأمر &nbsp;&nbsp; □ جلسات إرشاد &nbsp;&nbsp; □ تغيير المقعد &nbsp;&nbsp; □ مجموعة دراسية &nbsp;&nbsp; □ تحويل للأخصائي &nbsp;&nbsp; □ أخرى: ....................
      </td></tr>
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2">
        <th style="border:1px solid #000;padding:6px;width:5%">م</th>
        <th style="border:1px solid #000;padding:6px;width:12%">التاريخ</th>
        <th style="border:1px solid #000;padding:6px;width:25%">الإجراء المتخذ</th>
        <th style="border:1px solid #000;padding:6px;width:15%">الجهة المنفذة</th>
        <th style="border:1px solid #000;padding:6px;width:18%">النتيجة</th>
        <th style="border:1px solid #000;padding:6px;width:25%">ملاحظات</th>
      </tr>
      ${followUpRows}
    </table>

    <table style="width:100%;border-collapse:collapse;margin:10px 0">
      <tr style="background:#f2f2f2"><th colspan="2" style="border:1px solid #000;padding:8px;font-size:13pt">مآل الحالة</th></tr>
      <tr><td style="border:1px solid #000;padding:10px;width:30%;background:#f9f9f9"><b>التقييم النهائي</b></td>
          <td style="border:1px solid #000;padding:10px">□ تحسّن ملحوظ &nbsp;&nbsp; □ تحسّن جزئي &nbsp;&nbsp; □ لم يتحسن &nbsp;&nbsp; □ تراجع</td></tr>
      <tr><td style="border:1px solid #000;padding:10px;background:#f9f9f9"><b>التوصية</b></td>
          <td style="border:1px solid #000;padding:10px">..........................................................................................................................................</td></tr>
      <tr><td style="border:1px solid #000;padding:10px;background:#f9f9f9"><b>تاريخ إغلاق الملف</b></td>
          <td style="border:1px solid #000;padding:10px">...../...../..... </td></tr>
    </table>

    <table style="width:100%;margin-top:20px;border:none"><tr>
      <td style="border:none;text-align:right;width:50%"><b>المرشد الطلابي:</b> .............................</td>
      <td style="border:none;text-align:left;width:50%"><b>وكيل شؤون الطلاب:</b> .............................</td>
    </tr></table>
  `;

  // Use raw HTML print since this is a complex form
  const css = `@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    body{font-family:'Amiri','Traditional Arabic',serif;direction:rtl;font-size:12pt;margin:0;padding:10mm}
    table{font-family:inherit;font-size:inherit}
    h3{font-family:inherit}
    @media print{@page{size:A4 portrait;margin:5mm}body{padding:5mm 7mm}}`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>سجل متابعة فردي</title><style>${css}</style></head><body>${body}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 300);
}

// ══════════════════════════════════════════════════════
// 16. تقرير الغياب والتحصيل
// ══════════════════════════════════════════════════════
export function printAbsenceCorrelation(analysis: AdvancedAnalysis, periodLabel: string, settings: SchoolSettings): void {
  const c = analysis.correlation;
  const rows: ListReportRow[] = [
    { cells: ['معامل ارتباط بيرسون (r)', toIndic(c.pearsonR.toString()), c.interpretation, '', ''] },
    { cells: ['', '', '', '', ''], isSeparator: true },
    { cells: ['الفئة', 'العدد', 'المتوسط', '', ''], isGroupHeader: true, groupLabel: 'مقارنة الفئات' },
    { cells: ['طلاب بغياب > ٢ أيام', toIndic(c.absentCount), N(c.absentAvg) + '%', '', ''] },
    { cells: ['طلاب بدون غياب', toIndic(c.nonAbsentCount), N(c.nonAbsentAvg) + '%', '', ''] },
    { cells: ['الفرق', '', N(c.difference) + '%', '', ''] },
  ];

  printListReport({
    title: 'تقرير العلاقة بين الغياب والتحصيل الدراسي',
    subtitle: periodLabel,
    dateText: D(),
    headers: [
      { label: 'المؤشر', width: '25%' }, { label: 'القيمة', width: '15%' },
      { label: 'التفسير', width: '30%' }, { label: '', width: '15%' }, { label: '', width: '15%' }
    ],
    rows,
    summary: `<b>الخلاصة:</b> ${c.interpretation}. الفرق بين متوسط الطلاب الغائبين وغير الغائبين = ${N(c.difference)}% — ${c.difference > 5 ? 'دليل قوي على تأثير الغياب' : 'يحتاج مزيد من المتابعة'}.<br><b>التوصية:</b> تكثيف متابعة الطلاب ذوي الغياب المتكرر وإشراك أولياء الأمور.`,
  }, settings);
}
