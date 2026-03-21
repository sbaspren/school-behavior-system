/**
 * ══════════════════════════════════════════════════════════════
 * التحليل الإحصائي المتقدم للتحصيل الدراسي
 * ══════════════════════════════════════════════════════════════
 * يدعم: ابتدائي + متوسط + ثانوي
 * 6 فترات: (فترة1 + فترة2 + نهاية فصل) × فصلين دراسيين
 */

// ── Types ──
export interface SummaryRow {
  id: number; identityNo: string; studentName: string; grade: string; classNum: string;
  semester: string; period: string; average: number | null; generalGrade: string;
  rankGrade: string; rankClass: string; absence: number; tardiness: number;
  behaviorExcellent: string; behaviorPositive: string;
}
export interface GradeRow {
  id: number; identityNo: string; studentName: string; grade: string; classNum: string;
  semester: string; period: string; subject: string; total: number; finalExam: number;
  evalTools: number; shortTests: number; gradeLabel: string;
}

// ── المواد غير الأكاديمية ──
const NON_ACADEMIC = ['السلوك', 'المواظبة', 'النشاط'];

// ══════════════════════════════════════
// 1. مقاييس النزعة المركزية والتشتت
// ══════════════════════════════════════

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(values: number[]): number {
  if (values.length === 0) return 0;
  const freq: Record<number, number> = {};
  values.forEach(v => { const k = Math.round(v); freq[k] = (freq[k] || 0) + 1; });
  let maxFreq = 0, modeVal = 0;
  for (const k in freq) { if (freq[k] > maxFreq) { maxFreq = freq[k]; modeVal = Number(k); } }
  return modeVal;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

export function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

/** معامل الاختلاف (%) */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 0;
  return (stdDev(values) / m) * 100;
}

/** معامل ارتباط بيرسون */
export function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = mean(x.slice(0, n)), my = mean(y.slice(0, n));
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; denX += dx * dx; denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den > 0 ? num / den : 0;
}

// ══════════════════════════════════════
// 2. تصنيفات الطلاب
// ══════════════════════════════════════

export type GradeCategory = 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'ضعيف';

export function gradeCategory(avg: number): GradeCategory {
  if (avg >= 90) return 'ممتاز';
  if (avg >= 80) return 'جيد جداً';
  if (avg >= 70) return 'جيد';
  if (avg >= 60) return 'مقبول';
  return 'ضعيف';
}

export type RiskLevel = 'مستقر' | 'خطر منخفض' | 'خطر متوسط' | 'خطر عالي';

/** مؤشر الخطر المبكر — 5 عوامل */
export function riskScore(student: SummaryRow, grades: GradeRow[]): { score: number; level: RiskLevel; factors: string[] } {
  const academic = grades.filter(g => !NON_ACADEMIC.includes(g.subject) && g.total > 0);
  const weakSubjects = academic.filter(g => g.total < 60);
  const belowSubjects = academic.filter(g => g.total < 70);
  const avg = student.average || 0;
  const absence = student.absence || 0;
  const tardiness = student.tardiness || 0;

  let score = 0;
  const factors: string[] = [];

  // عدد المواد الضعيفة (< 60)
  score += weakSubjects.length * 3;
  if (weakSubjects.length > 0) factors.push(`${weakSubjects.length} مواد < 60%`);

  // عدد المواد المتدنية (< 70)
  const below70Only = belowSubjects.filter(g => g.total >= 60);
  score += below70Only.length * 1;
  if (below70Only.length > 0) factors.push(`${below70Only.length} مواد < 70%`);

  // المعدل العام
  if (avg > 0 && avg < 70) { score += 3; factors.push('معدل < 70%'); }
  else if (avg > 0 && avg < 80) { score += 1; factors.push('معدل < 80%'); }

  // الغياب
  if (absence > 5) { score += 3; factors.push(`غياب ${absence} أيام`); }
  else if (absence > 3) { score += 2; factors.push(`غياب ${absence} أيام`); }
  else if (absence > 0) { score += 1; factors.push(`غياب ${absence} يوم`); }

  // التأخر
  if (tardiness > 5) { score += 1; factors.push(`تأخر ${tardiness} مرات`); }

  let level: RiskLevel = 'مستقر';
  if (score >= 8) level = 'خطر عالي';
  else if (score >= 4) level = 'خطر متوسط';
  else if (score >= 1) level = 'خطر منخفض';

  return { score, level, factors };
}

// ══════════════════════════════════════
// 3. التحليل الشامل
// ══════════════════════════════════════

export interface DescriptiveStats {
  count: number; mean: number; median: number; mode: number;
  stdDev: number; range: number; cv: number; min: number; max: number;
}

export interface SubjectAnalysis {
  name: string; mean: number; stdDev: number; cv: number; median: number;
  failRate: number; belowRate: number; count: number; min: number; max: number;
}

export interface ClassGapAnalysis {
  subject: string;
  classes: { classLabel: string; avg: number; count: number }[];
  gap: number;
  gapLevel: 'طبيعي' | 'مراقبة' | 'تدخل' | 'خلل';
}

export interface RiskStudent {
  identity: string; name: string; grade: string; classNum: string;
  average: number; absence: number; tardiness: number;
  weakSubjects: string[]; belowSubjects: string[];
  riskScore: number; riskLevel: RiskLevel; riskFactors: string[];
  interventionType: 'أكاديمي' | 'سلوكي' | 'مزدوج';
}

export interface CorrelationResult {
  pearsonR: number;
  interpretation: string;
  absentAvg: number; absentCount: number;
  nonAbsentAvg: number; nonAbsentCount: number;
  difference: number;
}

export interface TopStudent {
  rank: number; identity: string; name: string; grade: string; classNum: string; average: number; generalGrade: string;
}

export interface AdvancedAnalysis {
  // وصفي
  overall: DescriptiveStats;
  byGrade: { grade: string; stats: DescriptiveStats }[];
  byClass: { label: string; grade: string; classNum: string; stats: DescriptiveStats }[];
  // توزيع التقديرات
  gradeDistribution: { category: GradeCategory; count: number; pct: number }[];
  gradeDistByGrade: { grade: string; dist: { category: GradeCategory; count: number; pct: number }[] }[];
  // مؤشر صعوبة المواد
  subjectAnalysis: SubjectAnalysis[];
  subjectByGrade: { grade: string; subjects: SubjectAnalysis[] }[];
  // فجوات الفصول
  classGaps: ClassGapAnalysis[];
  classGapsByGrade: { grade: string; gaps: ClassGapAnalysis[] }[];
  // العشرة الأوائل لكل فصل
  topTenByClass: { label: string; grade: string; classNum: string; students: TopStudent[] }[];
  // طلاب الخطر
  riskStudents: RiskStudent[];
  riskSummary: { total: number; high: number; medium: number; low: number; stable: number };
  // الراسبون
  failedStudents: RiskStudent[];
  // الضعاف
  weakStudents: RiskStudent[];
  // الارتباط
  correlation: CorrelationResult;
  // ملخص تنفيذي
  weakestSubjects: { name: string; avg: number }[];
  weakestClasses: { label: string; avg: number }[];
  criticalGaps: ClassGapAnalysis[];
}

/** الحساب الرئيسي — يأخذ بيانات فترة محددة ويُخرج التحليل الكامل */
export function computeAdvancedAnalysis(
  summary: SummaryRow[],
  grades: GradeRow[],
): AdvancedAnalysis {
  const avgs = summary.map(s => s.average || 0).filter(a => a > 0);
  const academicGrades = grades.filter(g => !NON_ACADEMIC.includes(g.subject));

  // ── 1. وصفي عام ──
  const overall = computeDescriptive(avgs);

  // ── بحسب الصف ──
  const gradeNames = [...new Set(summary.map(s => s.grade))].sort();
  const byGrade = gradeNames.map(g => {
    const ga = summary.filter(s => s.grade === g).map(s => s.average || 0).filter(a => a > 0);
    return { grade: g, stats: computeDescriptive(ga) };
  });

  // ── بحسب الفصل ──
  const classKeys = [...new Set(summary.map(s => `${s.grade}|${s.classNum}`))].sort();
  const byClass = classKeys.map(k => {
    const [grade, classNum] = k.split('|');
    const ca = summary.filter(s => s.grade === grade && s.classNum === classNum).map(s => s.average || 0).filter(a => a > 0);
    return { label: `${grade} - فصل ${classNum}`, grade, classNum, stats: computeDescriptive(ca) };
  });

  // ── 2. توزيع التقديرات ──
  const cats: GradeCategory[] = ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'];
  const gradeDistribution = cats.map(c => {
    const cnt = avgs.filter(a => gradeCategory(a) === c).length;
    return { category: c, count: cnt, pct: avgs.length > 0 ? Math.round(cnt / avgs.length * 100) : 0 };
  });
  const gradeDistByGrade = gradeNames.map(g => {
    const ga = summary.filter(s => s.grade === g).map(s => s.average || 0).filter(a => a > 0);
    return {
      grade: g,
      dist: cats.map(c => {
        const cnt = ga.filter(a => gradeCategory(a) === c).length;
        return { category: c, count: cnt, pct: ga.length > 0 ? Math.round(cnt / ga.length * 100) : 0 };
      })
    };
  });

  // ── 3. مؤشر صعوبة المواد ──
  const subjectAnalysis = computeSubjectAnalysis(academicGrades);
  const subjectByGrade = gradeNames.map(g => ({
    grade: g,
    subjects: computeSubjectAnalysis(academicGrades.filter(gr => gr.grade === g))
  }));

  // ── 4. فجوات الفصول ──
  const classGaps = computeClassGaps(academicGrades);
  const classGapsByGrade = gradeNames.map(g => ({
    grade: g,
    gaps: computeClassGaps(academicGrades.filter(gr => gr.grade === g))
  }));

  // ── 5. العشرة الأوائل لكل فصل ──
  const topTenByClass = classKeys.map(k => {
    const [grade, classNum] = k.split('|');
    const classSummary = summary
      .filter(s => s.grade === grade && s.classNum === classNum && (s.average || 0) > 0)
      .sort((a, b) => (b.average || 0) - (a.average || 0))
      .slice(0, 10);
    return {
      label: `${grade} - فصل ${classNum}`, grade, classNum,
      students: classSummary.map((s, i) => ({
        rank: i + 1, identity: s.identityNo, name: s.studentName,
        grade: s.grade, classNum: s.classNum, average: s.average || 0, generalGrade: s.generalGrade
      }))
    };
  });

  // ── 6. طلاب الخطر + الراسبون + الضعاف ──
  const allRisk: RiskStudent[] = summary.map(s => {
    const studentGrades = academicGrades.filter(g => g.identityNo === s.identityNo);
    const risk = riskScore(s, studentGrades);
    const weak = studentGrades.filter(g => g.total < 60).map(g => g.subject);
    const below = studentGrades.filter(g => g.total < 70 && g.total >= 60).map(g => g.subject);
    const hasAcademicIssue = weak.length > 0 || below.length > 0;
    const hasBehaviorIssue = (s.absence || 0) > 3 || (s.tardiness || 0) > 5;
    const interventionType: 'أكاديمي' | 'سلوكي' | 'مزدوج' =
      hasAcademicIssue && hasBehaviorIssue ? 'مزدوج' :
      hasBehaviorIssue ? 'سلوكي' : 'أكاديمي';

    return {
      identity: s.identityNo, name: s.studentName, grade: s.grade, classNum: s.classNum,
      average: s.average || 0, absence: s.absence || 0, tardiness: s.tardiness || 0,
      weakSubjects: weak, belowSubjects: below,
      riskScore: risk.score, riskLevel: risk.level, riskFactors: risk.factors,
      interventionType
    };
  });

  const riskStudents = allRisk.filter(s => s.riskLevel !== 'مستقر').sort((a, b) => b.riskScore - a.riskScore);
  const failedStudents = allRisk.filter(s => s.weakSubjects.length > 0).sort((a, b) => b.weakSubjects.length - a.weakSubjects.length);
  const weakStudents = allRisk.filter(s => s.weakSubjects.length > 0 || s.belowSubjects.length > 0).sort((a, b) => b.riskScore - a.riskScore);

  const riskSummary = {
    total: summary.length,
    high: riskStudents.filter(s => s.riskLevel === 'خطر عالي').length,
    medium: riskStudents.filter(s => s.riskLevel === 'خطر متوسط').length,
    low: riskStudents.filter(s => s.riskLevel === 'خطر منخفض').length,
    stable: summary.length - riskStudents.length,
  };

  // ── 7. الارتباط (غياب × تحصيل) ──
  const pairsAll = summary.filter(s => (s.average || 0) > 0);
  const absVals = pairsAll.map(s => s.absence || 0);
  const avgVals = pairsAll.map(s => s.average || 0);
  const r = pearsonCorrelation(absVals, avgVals);

  const absent = pairsAll.filter(s => (s.absence || 0) > 2);
  const nonAbsent = pairsAll.filter(s => (s.absence || 0) === 0);
  const absentAvg = absent.length > 0 ? mean(absent.map(s => s.average || 0)) : 0;
  const nonAbsentAvg = nonAbsent.length > 0 ? mean(nonAbsent.map(s => s.average || 0)) : 0;

  let interpretation = 'لا توجد علاقة واضحة';
  if (r < -0.5) interpretation = 'علاقة سلبية قوية — الغياب يؤثر سلباً بشكل كبير';
  else if (r < -0.3) interpretation = 'علاقة سلبية واضحة — الغياب يؤثر سلباً على التحصيل';
  else if (r < -0.1) interpretation = 'علاقة سلبية ضعيفة';

  const correlation: CorrelationResult = {
    pearsonR: Math.round(r * 1000) / 1000,
    interpretation,
    absentAvg: Math.round(absentAvg * 10) / 10, absentCount: absent.length,
    nonAbsentAvg: Math.round(nonAbsentAvg * 10) / 10, nonAbsentCount: nonAbsent.length,
    difference: Math.round((nonAbsentAvg - absentAvg) * 10) / 10,
  };

  // ── 8. ملخص تنفيذي ──
  const weakestSubjects = subjectAnalysis.slice(0, 3).map(s => ({ name: s.name, avg: s.mean }));
  const weakestClasses = byClass.sort((a, b) => a.stats.mean - b.stats.mean).slice(0, 3).map(c => ({ label: c.label, avg: c.stats.mean }));
  const criticalGaps = classGaps.filter(g => g.gap > 5).sort((a, b) => b.gap - a.gap);

  return {
    overall, byGrade, byClass,
    gradeDistribution, gradeDistByGrade,
    subjectAnalysis, subjectByGrade,
    classGaps, classGapsByGrade,
    topTenByClass,
    riskStudents, riskSummary, failedStudents, weakStudents,
    correlation,
    weakestSubjects, weakestClasses, criticalGaps,
  };
}

// ── Helper functions ──

function computeDescriptive(values: number[]): DescriptiveStats {
  if (values.length === 0) return { count: 0, mean: 0, median: 0, mode: 0, stdDev: 0, range: 0, cv: 0, min: 0, max: 0 };
  return {
    count: values.length,
    mean: Math.round(mean(values) * 10) / 10,
    median: Math.round(median(values) * 10) / 10,
    mode: mode(values),
    stdDev: Math.round(stdDev(values) * 10) / 10,
    range: Math.round(range(values) * 10) / 10,
    cv: Math.round(coefficientOfVariation(values) * 10) / 10,
    min: Math.round(Math.min(...values) * 10) / 10,
    max: Math.round(Math.max(...values) * 10) / 10,
  };
}

function computeSubjectAnalysis(grades: GradeRow[]): SubjectAnalysis[] {
  const subjects = [...new Set(grades.map(g => g.subject))];
  return subjects.map(name => {
    const scores = grades.filter(g => g.subject === name && g.total > 0).map(g => g.total);
    if (scores.length === 0) return { name, mean: 0, stdDev: 0, cv: 0, median: 0, failRate: 0, belowRate: 0, count: 0, min: 0, max: 0 };
    return {
      name,
      mean: Math.round(mean(scores) * 10) / 10,
      stdDev: Math.round(stdDev(scores) * 10) / 10,
      cv: Math.round(coefficientOfVariation(scores) * 10) / 10,
      median: Math.round(median(scores) * 10) / 10,
      failRate: Math.round(scores.filter(s => s < 60).length / scores.length * 100),
      belowRate: Math.round(scores.filter(s => s < 70).length / scores.length * 100),
      count: scores.length,
      min: Math.round(Math.min(...scores) * 10) / 10,
      max: Math.round(Math.max(...scores) * 10) / 10,
    };
  }).sort((a, b) => a.mean - b.mean); // الأصعب أولاً
}

function computeClassGaps(grades: GradeRow[]): ClassGapAnalysis[] {
  const subjects = [...new Set(grades.map(g => g.subject))];
  return subjects.map(subject => {
    const subGrades = grades.filter(g => g.subject === subject && g.total > 0);
    const classKeys = [...new Set(subGrades.map(g => `${g.grade}|${g.classNum}`))];
    const classes = classKeys.map(k => {
      const [grade, classNum] = k.split('|');
      const scores = subGrades.filter(g => g.grade === grade && g.classNum === classNum).map(g => g.total);
      return { classLabel: `${grade} فصل ${classNum}`, avg: Math.round(mean(scores) * 10) / 10, count: scores.length };
    });

    const avgs = classes.map(c => c.avg).filter(a => a > 0);
    const gap = avgs.length >= 2 ? Math.round((Math.max(...avgs) - Math.min(...avgs)) * 10) / 10 : 0;
    const gapLevel: ClassGapAnalysis['gapLevel'] =
      gap > 10 ? 'خلل' : gap > 5 ? 'تدخل' : gap > 3 ? 'مراقبة' : 'طبيعي';

    return { subject, classes, gap, gapLevel };
  }).sort((a, b) => b.gap - a.gap);
}

/** استخراج قائمة المعلمين ومواد ضعفهم (لخطاب المعلم) */
export function getTeacherWeakStudents(
  weakStudents: RiskStudent[],
  grades: GradeRow[]
): { subject: string; students: { name: string; classNum: string; grade: string; total: number; gradeLabel: string; average: number }[] }[] {
  const subjectMap = new Map<string, { name: string; classNum: string; grade: string; total: number; gradeLabel: string; average: number }[]>();

  for (const student of weakStudents) {
    const allWeak = [...student.weakSubjects, ...student.belowSubjects];
    for (const subj of allWeak) {
      const gradeRow = grades.find(g => g.identityNo === student.identity && g.subject === subj);
      if (!gradeRow) continue;
      if (!subjectMap.has(subj)) subjectMap.set(subj, []);
      subjectMap.get(subj)!.push({
        name: student.name, classNum: student.classNum, grade: student.grade,
        total: gradeRow.total, gradeLabel: gradeRow.gradeLabel, average: student.average
      });
    }
  }

  return Array.from(subjectMap.entries())
    .map(([subject, students]) => ({ subject, students: students.sort((a, b) => a.total - b.total) }))
    .sort((a, b) => b.students.length - a.students.length);
}
