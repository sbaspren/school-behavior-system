import React, { useState, useEffect, useCallback } from 'react';
import { academicApi } from '../api/academic';
import { showError } from './shared/Toast';
import { Bar, Doughnut } from 'react-chartjs-2';
import { printAdvancedReport, printTopPerClass, printFailingStudents, printWeakStudents, printTeacherLetter, printParentSummon, printGroupMeeting, printClassFollowUp, printIndividualFollowUp, printGapReport, printCorrelationReport, printGradeResults } from '../utils/academicPrints';

interface AdvancedStatsData {
  overall: { totalStudents: number; mean: number; median: number; mode: number; sd: number; cv: number; max: number; min: number; range: number };
  gradeStats: { grade: string; count: number; mean: number; median: number; mode: number; sd: number; cv: number; max: number; min: number; distribution: { excellent: number; veryGood: number; good: number; pass: number; fail: number } }[];
  classStats: { grade: string; classNum: string; label: string; count: number; mean: number; sd: number; max: number; min: number; excellent: number; weak: number }[];
  subjectStats: { subject: string; grade: string; count: number; mean: number; sd: number; median: number; failRate: number; weakRate: number; above90: number; below60: number; below50: number; finalExamMean: number }[];
  gapAnalysis: { subject: string; grade: string; gap: number; severity: string; classes: { classNum: string; avg: number }[] }[];
  topPerClass: { rank: number; name: string; identity: string; grade: string; classNum: string; average: number; generalGrade: string; label: string }[];
  failingStudents: { identity: string; name: string; grade: string; classNum: string; average: number; absence: number; failSubjects: { subject: string; total: number }[]; failCount: number }[];
  weakStudents: { identity: string; name: string; grade: string; classNum: string; average: number; generalGrade: string; absence: number; tardiness: number; failSubjects: string[]; weakSubjects: string[]; allSubjects: { subject: string; total: number }[]; riskScore: number; riskLevel: string; interventionType: string }[];
  correlation: { pearsonR: number; absentAvg: number; absentCount: number; nonAbsentAvg: number; nonAbsentCount: number; difference: number; interpretation: string };
  executiveSummary: { weakestSubjects: { subject: string; mean: number; failRate: number }[]; weakestClasses: { label: string; mean: number }[]; totalAtRisk: number; atRiskPercent: number; highRisk: number; mediumRisk: number; lowRisk: number; biggestGap: { subject: string; grade: string; gap: number } | null };
}

interface Props {
  stage: string;
  semester: string;
  period: string;
  summary: any[];
  grades: any[];
  periods: { semester: string; period: string }[];
  onStudentClick: (identity: string) => void;
}

const AcademicAnalysis: React.FC<Props> = ({ stage, semester, period, summary, grades, periods, onStudentClick }) => {
  const [data, setData] = useState<AdvancedStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<'overview' | 'subjects' | 'gaps' | 'risk' | 'correlation' | 'prints'>('overview');

  const loadData = useCallback(async () => {
    if (!stage) return;
    setLoading(true);
    try {
      const res = await academicApi.getAdvancedStats(stage, semester, period);
      if (res.data?.data && !res.data.data.empty) setData(res.data.data);
      else setData(null);
    } catch { showError('خطأ في تحميل الإحصائيات'); }
    finally { setLoading(false); }
  }, [stage, semester, period]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <span className="material-symbols-outlined animate-spin text-teal-500 text-4xl">sync</span>
      <p className="text-gray-500" style={{ marginTop: '8px' }}>جاري تحليل البيانات...</p>
    </div>
  );

  if (!data) return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '48px', textAlign: 'center' }}>
      <span className="material-symbols-outlined text-6xl text-gray-300">analytics</span>
      <p className="text-gray-400" style={{ marginTop: '12px' }}>لا توجد بيانات — استورد شهادات نور أولاً</p>
    </div>
  );

  const d = data;
  const sevColor = (s: string) => s === 'خلل' ? '#dc2626' : s === 'تدخل' ? '#f97316' : s === 'مراقبة' ? '#d97706' : '#16a34a';
  const riskColor = (l: string) => l === 'عالي' ? '#dc2626' : l === 'متوسط' ? '#f97316' : '#d97706';
  const riskBg = (l: string) => l === 'عالي' ? '#fef2f2' : l === 'متوسط' ? '#fff7ed' : '#fffbeb';
  const riskIcon = (l: string) => l === 'عالي' ? '🔴' : l === 'متوسط' ? '🟠' : '🟡';

  const sections = [
    { id: 'overview' as const, label: 'نظرة عامة', icon: 'dashboard' },
    { id: 'subjects' as const, label: 'تحليل المواد', icon: 'menu_book' },
    { id: 'gaps' as const, label: 'فجوات الفصول', icon: 'compare_arrows' },
    { id: 'risk' as const, label: 'طلاب الخطر', icon: 'warning' },
    { id: 'correlation' as const, label: 'غياب وتحصيل', icon: 'trending_down' },
    { id: 'prints' as const, label: 'طباعة التقارير', icon: 'print' },
  ];

  return (
    <div>
      {/* Sub-navigation */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`text-sm font-bold ${section === s.id ? 'text-white' : 'text-gray-600 hover:text-teal-600'}`}
            style={{ padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px', ...(section === s.id ? { background: '#0d9488', color: '#fff' } : { background: '#f3f4f6' }) }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ═══ Overview ═══ */}
      {section === 'overview' && (
        <>
          {/* Executive Summary */}
          <div style={{ background: 'linear-gradient(to left, #f0fdfa, #fff)', borderRadius: '12px', border: '1px solid #99f6e4', padding: '20px', marginBottom: '20px' }}>
            <h4 className="font-bold text-teal-700" style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
              <span className="material-symbols-outlined align-middle" style={{ marginLeft: '4px' }}>summarize</span> الملخص التنفيذي
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <StatBox label="إجمالي الطلاب" value={d.overall.totalStudents} color="#0d9488" />
              <StatBox label="المتوسط" value={d.overall.mean + '%'} color="#2563eb" />
              <StatBox label="الوسيط" value={d.overall.median + '%'} color="#7c3aed" />
              <StatBox label="الانحراف المعياري" value={d.overall.sd} color={d.overall.sd > 10 ? '#dc2626' : '#16a34a'} />
              <StatBox label="طلاب الخطر" value={`${d.executiveSummary.totalAtRisk} (${d.executiveSummary.atRiskPercent}%)`} color="#dc2626" />
              <StatBox label="معامل الارتباط" value={d.correlation.pearsonR} color={d.correlation.pearsonR < -0.3 ? '#dc2626' : '#6b7280'} />
            </div>

            {/* Weakest subjects */}
            {d.executiveSummary.weakestSubjects.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                <span className="text-sm font-bold text-red-700">أضعف المواد: </span>
                {d.executiveSummary.weakestSubjects.map((s, i) => (
                  <span key={i} className="text-sm text-red-600" style={{ marginRight: '8px' }}>
                    {s.subject} ({s.mean}%)
                    {i < d.executiveSummary.weakestSubjects.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            )}

            {d.executiveSummary.biggestGap && (
              <div style={{ marginTop: '8px', padding: '12px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                <span className="text-sm font-bold text-amber-700">أكبر فجوة: </span>
                <span className="text-sm text-amber-600">
                  {d.executiveSummary.biggestGap.subject} — {d.executiveSummary.biggestGap.grade} (فجوة {d.executiveSummary.biggestGap.gap}%)
                </span>
              </div>
            )}
          </div>

          {/* Per-grade descriptive stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {d.gradeStats.map((g, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <h5 className="font-bold text-gray-800" style={{ marginBottom: '12px' }}>{g.grade} ({g.count} طالب)</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.8rem' }}>
                  <MiniStat label="المتوسط" value={g.mean + '%'} />
                  <MiniStat label="الوسيط" value={g.median + '%'} />
                  <MiniStat label="المنوال" value={g.mode + '%'} />
                  <MiniStat label="الانحراف" value={g.sd} color={g.sd > 10 ? '#dc2626' : undefined} />
                  <MiniStat label="م.الاختلاف" value={g.cv + '%'} />
                  <MiniStat label="المدى" value={(g.max - g.min).toFixed(1)} />
                </div>
                {/* Distribution mini bar */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '12px', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                  {[
                    { val: g.distribution.excellent, color: '#10b981', label: 'ممتاز' },
                    { val: g.distribution.veryGood, color: '#3b82f6', label: 'جيد جداً' },
                    { val: g.distribution.good, color: '#f59e0b', label: 'جيد' },
                    { val: g.distribution.pass, color: '#f97316', label: 'مقبول' },
                    { val: g.distribution.fail, color: '#ef4444', label: 'ضعيف' },
                  ].filter(x => x.val > 0).map((x, j) => (
                    <div key={j} title={`${x.label}: ${x.val}`}
                      style={{ flex: x.val, backgroundColor: x.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {x.val > 3 && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>{x.val}</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Top 10 per class */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 className="font-bold text-gray-700">🏆 العشرة الأوائل (حسب الفصل)</h4>
              <button onClick={() => printTopPerClass(d.topPerClass, stage, semester, period)}
                className="text-xs bg-teal-500 text-white hover:bg-teal-600" style={{ padding: '6px 12px', borderRadius: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>print</span> طباعة
              </button>
            </div>
            {/* Group by class */}
            {Object.entries(
              d.topPerClass.reduce((acc, s) => {
                const key = s.label;
                if (!acc[key]) acc[key] = [];
                acc[key].push(s);
                return acc;
              }, {} as Record<string, typeof d.topPerClass>)
            ).map(([label, students]) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <h5 className="font-bold text-sm text-teal-600" style={{ marginBottom: '8px' }}>{label}</h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {students.map((s, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
                    return (
                      <div key={i} onClick={() => onStudentClick(s.identity)}
                        className="hover:bg-emerald-50" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}>
                        <span style={{ width: '28px', textAlign: 'center' }}>{medal}</span>
                        <span className="text-sm font-bold flex-1">{s.name}</span>
                        <span className="text-sm font-bold text-emerald-600">{(s.average || 0).toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ Subjects ═══ */}
      {section === 'subjects' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 className="font-bold text-gray-700">📚 مؤشر صعوبة المواد (الأصعب → الأسهل)</h4>
          </div>
          {/* Group by grade */}
          {Object.entries(
            d.subjectStats.reduce((acc, s) => {
              if (!acc[s.grade]) acc[s.grade] = [];
              acc[s.grade].push(s);
              return acc;
            }, {} as Record<string, typeof d.subjectStats>)
          ).map(([grade, subjects]) => (
            <div key={grade} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '16px' }}>
              <h5 className="font-bold text-blue-600" style={{ marginBottom: '12px' }}>{grade}</h5>
              <div style={{ overflowX: 'auto' }}>
                <table className="text-sm" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#f3f4f6' }}>
                      <th className="text-right font-bold" style={{ padding: '8px' }}>#</th>
                      <th className="text-right font-bold" style={{ padding: '8px' }}>المادة</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>المتوسط</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>الانحراف</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>الوسيط</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>رسوب%</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>تعثر%</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>≥90</th>
                      <th className="text-center font-bold" style={{ padding: '8px' }}>&lt;60</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => {
                      const isWeak = s.mean < 80;
                      return (
                        <tr key={i} className="border-b hover:bg-gray-50" style={isWeak ? { background: '#fef2f2' } : {}}>
                          <td className="text-center" style={{ padding: '8px' }}>{i + 1}</td>
                          <td className="font-bold" style={{ padding: '8px' }}>{s.subject}</td>
                          <td className="text-center font-bold" style={{ padding: '8px', color: s.mean >= 90 ? '#10b981' : s.mean >= 80 ? '#3b82f6' : s.mean >= 70 ? '#f59e0b' : '#ef4444' }}>{s.mean}%</td>
                          <td className="text-center" style={{ padding: '8px', color: s.sd > 12 ? '#dc2626' : undefined }}>{s.sd}</td>
                          <td className="text-center" style={{ padding: '8px' }}>{s.median}</td>
                          <td className="text-center font-bold" style={{ padding: '8px', color: s.failRate > 10 ? '#dc2626' : s.failRate > 0 ? '#f97316' : '#16a34a' }}>{s.failRate}%</td>
                          <td className="text-center" style={{ padding: '8px', color: s.weakRate > 20 ? '#dc2626' : undefined }}>{s.weakRate}%</td>
                          <td className="text-center text-emerald-600" style={{ padding: '8px' }}>{s.above90}</td>
                          <td className="text-center text-red-600" style={{ padding: '8px' }}>{s.below60}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ═══ Gaps ═══ */}
      {section === 'gaps' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 className="font-bold text-gray-700">🔍 فجوات الفصول حسب المادة</h4>
            <button onClick={() => printGapReport(d.gapAnalysis, stage, semester, period)}
              className="text-xs bg-teal-500 text-white hover:bg-teal-600" style={{ padding: '6px 12px', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>print</span> طباعة
            </button>
          </div>
          {d.gapAnalysis.length === 0 ? (
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
              <p className="text-green-600 font-bold" style={{ marginTop: '8px' }}>لا توجد فجوات كبيرة — أداء متجانس بين الفصول</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {d.gapAnalysis.map((g, i) => (
                <div key={i} style={{ background: '#fff', borderRadius: '8px', border: `1px solid ${g.severity === 'طبيعي' ? '#e5e7eb' : g.severity === 'مراقبة' ? '#fde68a' : g.severity === 'تدخل' ? '#fed7aa' : '#fecaca'}`, padding: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: g.gap > 10 ? '#fef2f2' : g.gap > 5 ? '#fff7ed' : '#f3f4f6' }}>
                    <span className="text-lg font-bold" style={{ color: sevColor(g.severity) }}>{g.gap}%</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="font-bold text-sm">{g.subject} — {g.grade}</div>
                    <div className="text-xs text-gray-500" style={{ marginTop: '2px' }}>
                      {g.classes.map(c => `ف${c.classNum}: ${c.avg}%`).join(' | ')}
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ padding: '4px 10px', borderRadius: '6px', color: sevColor(g.severity), background: g.severity === 'طبيعي' ? '#f0fdf4' : g.severity === 'مراقبة' ? '#fffbeb' : g.severity === 'تدخل' ? '#fff7ed' : '#fef2f2' }}>
                    {g.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══ Risk ═══ */}
      {section === 'risk' && (
        <>
          {/* Risk summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <StatBox label="خطر عالي" value={d.executiveSummary.highRisk} color="#dc2626" />
            <StatBox label="خطر متوسط" value={d.executiveSummary.mediumRisk} color="#f97316" />
            <StatBox label="خطر منخفض" value={d.executiveSummary.lowRisk} color="#d97706" />
            <StatBox label="إجمالي" value={`${d.executiveSummary.totalAtRisk} (${d.executiveSummary.atRiskPercent}%)`} color="#6b7280" />
          </div>

          {/* Print buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => printFailingStudents(d.failingStudents, stage, semester, period)}
              className="text-xs bg-red-500 text-white hover:bg-red-600" style={{ padding: '6px 12px', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>print</span> طباعة الراسبين
            </button>
            <button onClick={() => printWeakStudents(d.weakStudents, stage, semester, period)}
              className="text-xs bg-amber-500 text-white hover:bg-amber-600" style={{ padding: '6px 12px', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>print</span> طباعة الضعاف
            </button>
          </div>

          {/* Failing students */}
          {d.failingStudents.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #fecaca', padding: '20px', marginBottom: '16px' }}>
              <h4 className="font-bold text-red-700" style={{ marginBottom: '12px' }}>🔴 الطلاب الراسبون ({d.failingStudents.length})</h4>
              {d.failingStudents.map((s, i) => (
                <div key={i} onClick={() => onStudentClick(s.identity)}
                  className="hover:shadow" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#fef2f2', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer' }}>
                  <span className="text-xs text-gray-400 w-6 text-center">{i + 1}</span>
                  <span className="font-bold text-sm flex-1">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.grade} ف{s.classNum}</span>
                  <span className="text-xs text-red-600">{s.failCount} مواد</span>
                  <span className="text-xs text-red-500">{s.failSubjects.map(f => f.subject).join('، ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Weak students with risk index */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>⚠️ الضعاف ومؤشر الخطر ({d.weakStudents.length})</h4>
            {d.weakStudents.map((s, i) => (
              <div key={i} onClick={() => onStudentClick(s.identity)}
                className="hover:shadow" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', marginBottom: '4px', cursor: 'pointer', background: riskBg(s.riskLevel), border: `1px solid ${riskColor(s.riskLevel)}20` }}>
                <span style={{ fontSize: '1.2rem' }}>{riskIcon(s.riskLevel)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="font-bold text-sm">{s.name}</span>
                  <span className="text-xs text-gray-400" style={{ marginRight: '8px' }}>{s.grade} ف{s.classNum}</span>
                  <div className="text-xs text-gray-500" style={{ marginTop: '2px' }}>
                    {s.failSubjects.length > 0 && <span className="text-red-600">راسب: {s.failSubjects.join('، ')} · </span>}
                    {s.weakSubjects.length > 0 && <span className="text-amber-600">ضعيف: {s.weakSubjects.join('، ')}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div className="text-xs font-bold" style={{ color: riskColor(s.riskLevel) }}>{s.riskScore} نقطة</div>
                  <div className="text-xs" style={{ color: riskColor(s.riskLevel) }}>{s.riskLevel}</div>
                </div>
                <span className="text-xs" style={{ padding: '2px 6px', borderRadius: '4px', background: s.interventionType === 'مزدوج' ? '#fecaca' : s.interventionType === 'سلوكي' ? '#fed7aa' : '#dbeafe', color: s.interventionType === 'مزدوج' ? '#dc2626' : s.interventionType === 'سلوكي' ? '#f97316' : '#2563eb' }}>
                  {s.interventionType}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══ Correlation ═══ */}
      {section === 'correlation' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 className="font-bold text-gray-700">📉 العلاقة بين الغياب والتحصيل</h4>
            <button onClick={() => printCorrelationReport(d.correlation, d.overall, stage, semester, period)}
              className="text-xs bg-teal-500 text-white hover:bg-teal-600" style={{ padding: '6px 12px', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle' }}>print</span> طباعة
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: d.correlation.pearsonR < -0.3 ? '#fef2f2' : '#f3f4f6', borderRadius: '12px', padding: '20px', textAlign: 'center', border: `1px solid ${d.correlation.pearsonR < -0.3 ? '#fecaca' : '#e5e7eb'}` }}>
              <div className="text-3xl font-bold" style={{ color: d.correlation.pearsonR < -0.3 ? '#dc2626' : '#6b7280' }}>{d.correlation.pearsonR}</div>
              <div className="text-xs text-gray-500" style={{ marginTop: '4px' }}>معامل بيرسون (r)</div>
              <div className="text-sm font-bold" style={{ marginTop: '8px', color: d.correlation.pearsonR < -0.3 ? '#dc2626' : '#6b7280' }}>{d.correlation.interpretation}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div className="text-2xl font-bold text-red-600">{d.correlation.absentAvg}%</div>
              <div className="text-xs text-gray-500">متوسط الغائبين ({d.correlation.absentCount} طالب)</div>
            </div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
              <div className="text-2xl font-bold text-emerald-600">{d.correlation.nonAbsentAvg}%</div>
              <div className="text-xs text-gray-500">غير الغائبين ({d.correlation.nonAbsentCount} طالب)</div>
            </div>
            <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '20px', textAlign: 'center', border: '1px solid #fde68a' }}>
              <div className="text-2xl font-bold text-amber-600">{d.correlation.difference}%</div>
              <div className="text-xs text-gray-500">الفرق</div>
            </div>
          </div>
          {/* Bar chart comparison */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', maxWidth: '500px' }}>
            <h5 className="font-bold text-gray-700 text-sm" style={{ marginBottom: '12px' }}>مقارنة متوسط المعدل: الغائبين vs غير الغائبين</h5>
            <Bar data={{
              labels: ['غائبون (>2 أيام)', 'غير غائبين'],
              datasets: [{ label: 'المعدل', data: [d.correlation.absentAvg, d.correlation.nonAbsentAvg], backgroundColor: ['#ef4444', '#10b981'], borderRadius: 6 }]
            }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false, min: 50, max: 100, ticks: { font: { family: 'Cairo' } } }, x: { ticks: { font: { family: 'Cairo', size: 12 } } } } }} />
            <p className="text-xs text-gray-400" style={{ marginTop: '8px', textAlign: 'center' }}>يوضح الفرق في المعدل العام بين الطلاب الغائبين (أكثر من يومين) وغير الغائبين — دليل على تأثير الغياب السلبي</p>
          </div>
        </>
      )}

      {/* ═══ Prints ═══ */}
      {section === 'prints' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {[
            { label: 'التقرير الإحصائي الشامل', icon: 'analytics', color: '#0d9488', onClick: () => printAdvancedReport(d, stage, semester, period) },
            { label: 'كشف نتائج الصف', icon: 'format_list_numbered', color: '#2563eb', onClick: () => printGradeResults(summary, stage, semester, period) },
            { label: 'العشرة الأوائل (كل فصل)', icon: 'emoji_events', color: '#d97706', onClick: () => printTopPerClass(d.topPerClass, stage, semester, period) },
            { label: 'قائمة الراسبين', icon: 'error', color: '#dc2626', onClick: () => printFailingStudents(d.failingStudents, stage, semester, period) },
            { label: 'الضعاف مع مواد الضعف', icon: 'warning', color: '#f97316', onClick: () => printWeakStudents(d.weakStudents, stage, semester, period) },
            { label: 'تقرير فجوات الفصول', icon: 'compare_arrows', color: '#7c3aed', onClick: () => printGapReport(d.gapAnalysis, stage, semester, period) },
            { label: 'تقرير الغياب والتحصيل', icon: 'trending_down', color: '#be185d', onClick: () => printCorrelationReport(d.correlation, d.overall, stage, semester, period) },
            { label: 'خطاب المعلم (الضعاف)', icon: 'school', color: '#0369a1', onClick: () => printTeacherLetter(d.weakStudents, grades, stage, semester, period) },
            { label: 'استدعاء ولي الأمر', icon: 'contact_phone', color: '#b91c1c', onClick: () => printParentSummon(d.weakStudents, stage, semester, period) },
            { label: 'محضر اجتماع جمعي', icon: 'groups', color: '#4338ca', onClick: () => printGroupMeeting(d.weakStudents, stage, semester, period) },
            { label: 'سجل متابعة (حسب الفصل)', icon: 'fact_check', color: '#166534', onClick: () => printClassFollowUp(d.weakStudents, stage, semester, period) },
            { label: 'سجل متابعة فردي', icon: 'person_search', color: '#9333ea', onClick: () => printIndividualFollowUp(d.weakStudents, stage, semester, period) },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick}
              className="hover:shadow-md" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'right' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: btn.color + '15', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: btn.color, fontSize: '22px' }}>{btn.icon}</span>
              </div>
              <div>
                <div className="font-bold text-sm text-gray-800">{btn.label}</div>
                <div className="text-xs text-gray-400">طباعة</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Mini components ──
const StatBox: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px', textAlign: 'center' }}>
    <div className="text-xl font-bold" style={{ color }}>{value}</div>
    <div className="text-xs text-gray-500" style={{ marginTop: '2px' }}>{label}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', padding: '6px', background: '#f9fafb', borderRadius: '6px' }}>
    <div className="font-bold" style={{ fontSize: '0.85rem', color: color || '#374151' }}>{value}</div>
    <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>{label}</div>
  </div>
);

export default AcademicAnalysis;
