import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { academicApi, AcademicStudentData, AcademicSubjectData } from '../api/academic';
import { showSuccess, showError } from '../components/shared/Toast';
import { SETTINGS_STAGES, sortGrades, sortClasses } from '../utils/constants';
import { useAppContext } from '../hooks/useAppContext';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, RadialLinearScale, PointElement, LineElement, Filler,
} from 'chart.js';
import { Doughnut, Bar, Radar } from 'react-chartjs-2';
import AcademicAnalysis from '../components/AcademicAnalysis';
import PageHero from '../components/shared/PageHero';
import TabBar from '../components/shared/TabBar';
import FilterBtn from '../components/shared/FilterBtn';
import { computeAdvancedAnalysis, getTeacherWeakStudents, type AdvancedAnalysis, type SummaryRow as StatSummaryRow, type GradeRow as StatGradeRow } from '../utils/academicStats';
import * as AcadPrint from '../utils/academicPrints';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, RadialLinearScale, PointElement, LineElement, Filler,
);

// ── Types ──
interface PeriodInfo { semester: string; period: string; count?: number }
interface SummaryRow {
  id: number; identityNo: string; studentName: string; grade: string; classNum: string;
  semester: string; period: string; average: number | null; generalGrade: string;
  rankGrade: string; rankClass: string; absence: number; tardiness: number;
  behaviorExcellent: string; behaviorPositive: string;
}
interface GradeRow {
  id: number; identityNo: string; studentName: string; grade: string; classNum: string;
  semester: string; period: string; subject: string; total: number; finalExam: number;
  evalTools: number; shortTests: number; gradeLabel: string;
}
interface StatsData {
  totalStudents: number; avgAll: number; maxAvg: number; minAvg: number;
  gradeDist: Record<string, number>;
  categories: { excellent: number; good: number; average: number; weak: number; danger: number };
  subjects: { name: string; avg: number; max: number; min: number; count: number; above90: number; below60: number; below50: number }[];
  topTen: SummaryRow[]; bottomTen: SummaryRow[];
  classSummary: { label: string; grade: string; classNum: string; count: number; avg: number; max: number; min: number; excellent: number; weak: number }[];
  dangerStudents: { identity: string; name: string; weakSubjects: string[]; weakCount: number }[];
  absence: { total: number; tardiness: number; studentsWithAbsence: number };
  periods: PeriodInfo[];
}
interface StudentReport {
  student: { name: string; identity: string; grade: string; classNum: string };
  summary: SummaryRow[]; grades: GradeRow[];
  analysis: {
    strengths: string[]; weaknesses: string[]; weaknessPattern: string;
    academicGrades: { name: string; total: number; grade: string }[];
    examVsWork: { name: string; finalExam: number; classWork: number }[];
    absence: number; tardiness: number; behaviorExcellent: string; behaviorPositive: string;
  };
}
interface ClassCompItem { subject: string; classes: { classLabel: string; avg: number; count: number; above90: number; below60: number }[] }

const PERIOD_OPTIONS = ['الفترة الاولى', 'الفترة الثانية', 'نهاية الفصل'];
const NON_ACADEMIC = ['السلوك', 'المواظبة', 'النشاط'];

const AcademicPage: React.FC = () => {
  // ── State ──
  const appCtx = useAppContext();
  const stages = appCtx.stages;
  const enabledStages = appCtx.enabledStages;
  const schoolSettings = appCtx.schoolSettings as any;
  const currentStage = appCtx.activeStage;
  const [tab, setTab] = useState<'dashboard' | 'reports' | 'charts' | 'analysis'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [advancedAnalysis, setAdvancedAnalysis] = useState<AdvancedAnalysis | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPeriod, setImportPeriod] = useState('نهاية الفصل');
  const [importStatus, setImportStatus] = useState<{ type: string; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);
  // Reports state
  const [filterName, setFilterName] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterAvgAbove, setFilterAvgAbove] = useState('');
  const [filterAvgBelow, setFilterAvgBelow] = useState('');
  const [filterGeneralGrade, setFilterGeneralGrade] = useState('');
  const [sortBy, setSortBy] = useState('avg_desc');
  // Student report
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  // Subject report
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjectReportData, setSubjectReportData] = useState<GradeRow[] | null>(null);
  // Class comparison
  const [classComparison, setClassComparison] = useState<ClassCompItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──
  const initialLoadDone = useRef(false);
  const loadData = useCallback(async () => {
    if (!currentStage) {
      setLoading(false);
      return;
    }
    if (!initialLoadDone.current) setLoading(true);
    setStudentReport(null);
    setSubjectReportData(null);
    setClassComparison(null);
    try {
      const res = await academicApi.getAll(currentStage);
      const d = res.data?.data;
      if (d) {
        setSummary(d.summary || []);
        setGrades(d.grades || []);
        setPeriods(d.periods || []);
        if (d.summary?.length > 0) {
          const lp = d.periods?.length > 0 ? d.periods[d.periods.length - 1] : null;
          const sRes = await academicApi.getStats(currentStage, lp?.semester, lp?.period);
          if (sRes.data?.data) setStats(sRes.data.data);
          // Compute advanced analysis
          try {
            const filtered = lp ? d.summary.filter((r: SummaryRow) => r.semester === lp.semester && r.period === lp.period) : d.summary;
            const filteredGrades = lp ? (d.grades || []).filter((g: GradeRow) => g.semester === lp.semester && g.period === lp.period) : (d.grades || []);
            const aa = computeAdvancedAnalysis(filtered as unknown as StatSummaryRow[], filteredGrades as unknown as StatGradeRow[]);
            setAdvancedAnalysis(aa);
          } catch { /* empty */ }
        } else {
          setStats(null);
          setImportOpen(true);
        }
      }
    } catch { /* empty */ }
    finally { setLoading(false); initialLoadDone.current = true; }
  }, [currentStage]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Header stats ──
  const headerStats = useMemo(() => {
    let ls = summary;
    if (periods.length > 0) {
      const lp = periods[periods.length - 1];
      ls = summary.filter(r => r.semester === lp.semester && r.period === lp.period);
    }
    const avgs = ls.map(r => r.average).filter((a): a is number => a !== null && a > 0);
    const avgAll = avgs.length > 0 ? (avgs.reduce((a, b) => a + b, 0) / avgs.length).toFixed(1) : '-';
    return { 
      students: ls.length > 0 ? ls.length : '-', 
      periods: periods.length > 0 ? periods.length : '-', 
      avg: avgAll 
    };
  }, [summary, periods]);

  // ── Excel import ──
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus({ type: 'info', msg: 'جاري قراءة الملف...' });
    const t0 = Date.now();

    try {
      const data = await file.arrayBuffer();
      setImportStatus({ type: 'info', msg: 'جاري تحليل الشهادات...' });
      const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
      const parseTime = ((Date.now() - t0) / 1000).toFixed(1);

      const students: AcademicStudentData[] = [];
      let detectedSemester = '';

      for (let i = 0; i < wb.SheetNames.length; i++) {
        try {
          const ws = wb.Sheets[wb.SheetNames[i]];
          const arr = sheetTo2DArray(ws);
          if (!arr || arr.length < 30) continue;
          const st = parseStudentFromArray(arr, detectedSemester);
          if (!st) continue;
          if (!detectedSemester && st.semester) detectedSemester = st.semester;
          if (!st.semester) st.semester = detectedSemester || 'غير محدد';
          students.push(st);
        } catch { /* skip sheet */ }
      }

      if (students.length === 0) {
        setImportStatus({ type: 'error', msg: `لم يتم العثور على بيانات طلاب (تم فحص ${wb.SheetNames.length} شيت)` });
        setImporting(false);
        return;
      }

      // ── التحقق من تطابق المرحلة ──
      const stageInfo = SETTINGS_STAGES.find(s => s.id === currentStage);
      if (stageInfo) {
        const importedGrades = [...new Set(students.map(s => s.grade).filter(Boolean))];
        const expectedGrades = stageInfo.grades;
        const mismatchedGrades = importedGrades.filter(g => !expectedGrades.includes(g));
        if (mismatchedGrades.length > 0) {
          const msg = `الشهادات تحتوي على صفوف (${mismatchedGrades.join('، ')}) غير متوافقة مع المرحلة "${stageInfo.name}" (${expectedGrades.join('، ')})\n\nهل تريد المتابعة؟`;
          if (!window.confirm(msg)) {
            setImportStatus({ type: 'error', msg: `تم إلغاء الاستيراد — صفوف غير متوافقة مع مرحلة ${stageInfo.name}` });
            setImporting(false);
            return;
          }
        }
      }

      setImportStatus({ type: 'info', msg: `تم تحليل ${students.length} طالب في ${parseTime} ثانية - جاري الحفظ...` });

      const res = await academicApi.import({ stage: currentStage, period: importPeriod, students });
      const totalTime = ((Date.now() - t0) / 1000).toFixed(1);
      if (res.data?.data) {
        const r = res.data.data;
        setImportStatus({ type: 'success', msg: `تم استيراد ${r.imported} طالب في ${totalTime} ثانية (${detectedSemester || 'غير محدد'} - ${importPeriod})` });
        showSuccess('تم الاستيراد بنجاح');
        loadData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
      setImportStatus({ type: 'error', msg });
      showError('فشل الاستيراد');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [currentStage, importPeriod, loadData]);

  // ── Student report ──
  const showStudentReport = useCallback(async (identityNo: string) => {
    setReportLoading(true);
    try {
      const res = await academicApi.getStudentReport(identityNo, currentStage);
      if (res.data?.data) setStudentReport(res.data.data);
      else showError('لم يتم العثور على الطالب');
    } catch { showError('خطأ في تحميل التقرير'); }
    finally { setReportLoading(false); }
  }, [currentStage]);

  // ── Delete period ──
  const deletePeriod = useCallback(async (semester: string, period: string) => {
    if (!window.confirm(`هل تريد حذف بيانات ${period} — ${semester}؟`)) return;
    try {
      await academicApi.deletePeriod(currentStage, semester, period);
      showSuccess('تم الحذف');
      loadData();
    } catch { showError('فشل الحذف'); }
  }, [currentStage, loadData]);

  // ── Class comparison ──
  const loadClassComparison = useCallback(async () => {
    const lp = periods.length > 0 ? periods[periods.length - 1] : null;
    try {
      const res = await academicApi.getClassComparison(currentStage, lp?.semester, lp?.period);
      if (res.data?.data) setClassComparison(res.data.data);
    } catch { showError('خطأ'); }
  }, [currentStage, periods]);

  // ── Filtered reports ──
  const filteredStudents = useMemo(() => {
    let res = [...summary];
    if (filterName) res = res.filter(r => r.studentName.includes(filterName));
    if (filterGrade) res = res.filter(r => r.grade === filterGrade);
    if (filterClass) res = res.filter(r => String(r.classNum) === filterClass);
    if (filterPeriod) {
      const [sem, per] = filterPeriod.split('|');
      res = res.filter(r => r.semester === sem && r.period === per);
    }
    if (filterGeneralGrade) res = res.filter(r => r.generalGrade === filterGeneralGrade);
    const aa = parseFloat(filterAvgAbove) || 0;
    const ab = parseFloat(filterAvgBelow) || 999;
    res = res.filter(r => {
      const avg = r.average || 0;
      return avg >= aa && avg <= ab;
    });
    if (sortBy === 'avg_desc') res.sort((a, b) => (b.average || 0) - (a.average || 0));
    else if (sortBy === 'avg_asc') res.sort((a, b) => (a.average || 0) - (b.average || 0));
    else res.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar'));
    return res.slice(0, 100);
  }, [summary, filterName, filterGrade, filterClass, filterPeriod, filterAvgAbove, filterAvgBelow, filterGeneralGrade, sortBy]);

  const gradeOptions = useMemo(() => sortGrades(Array.from(new Set(summary.map(r => r.grade)))), [summary]);
  const classOptions = useMemo(() => sortClasses(Array.from(new Set(summary.map(r => String(r.classNum))))), [summary]);
  const generalGradeOptions = useMemo(() => Array.from(new Set(summary.map(r => r.generalGrade).filter(Boolean))).sort(), [summary]);
  const subjectOptions = useMemo(() =>
    Array.from(new Set(grades.map(g => g.subject).filter(s => !NON_ACADEMIC.includes(s)))),
    [grades]
  );

  const filterByCategory = (cat: string) => {
    const ranges: Record<string, [string, string]> = {
      excellent: ['95', ''], good: ['80', '95'], average: ['65', '80'], weak: ['50', '65'], danger: ['0', '50']
    };
    const r = ranges[cat];
    if (!r) return;
    setFilterAvgAbove(r[0]);
    setFilterAvgBelow(r[1]);
    setTab('reports');
  };

  // ── If student report is open ──
  if (studentReport && !reportLoading) return <StudentReportView report={studentReport} onBack={() => setStudentReport(null)} />;

  // ── Default empty stats (show zeros like old version) ──
  const emptyStats: StatsData = {
    totalStudents: 0, avgAll: 0, maxAvg: 0, minAvg: 0,
    gradeDist: {}, categories: { excellent: 0, good: 0, average: 0, weak: 0, danger: 0 },
    subjects: [], topTen: [], bottomTen: [], classSummary: [], dangerStudents: [],
    absence: { total: 0, tardiness: 0, studentsWithAbsence: 0 }, periods: [],
  };
  const ds = stats || emptyStats;

  // ── Color helpers ──
  const avgColor = (avg: number) => avg >= 90 ? 'emerald' : avg >= 75 ? 'blue' : avg >= 60 ? 'amber' : 'red';
  const subjectColor = (avg: number) => avg >= 90 ? 'emerald' : avg >= 80 ? 'blue' : avg >= 70 ? 'amber' : 'red';

  const stageName = SETTINGS_STAGES.find(x => x.id === currentStage)?.name || '';
  let hijriDate = '';
  try { hijriDate = new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { /* empty */ }

  return (
    <div style={{ maxWidth: '100%', position: 'relative' }}>
      {/* Header — PageHero موحد مع باقي الصفحات */}
      <PageHero
        title={`التحصيل الدراسي${stageName ? ' — ' + stageName : ''}`}
        subtitle={hijriDate}
        gradient="linear-gradient(135deg, #0d9488, #14b8a6)"
        stats={[
          { icon: 'groups', label: 'طالب', value: headerStats.students },
          { icon: 'calendar_month', label: 'فترة', value: headerStats.periods },
          { icon: 'trending_up', label: 'المعدل العام', value: headerStats.avg !== '-' ? headerStats.avg + '%' : '-' },
        ]}
      />

      {/* Tabs — TabBar موحد */}
      <TabBar
        tabs={[
          { id: 'dashboard', label: 'لوحة المؤشرات', icon: 'dashboard' },
          { id: 'reports', label: 'تقارير تفصيلية', icon: 'description' },
          { id: 'charts', label: 'رسوم بيانية', icon: 'bar_chart' },
          { id: 'analysis', label: 'تحليل وطباعة', icon: 'analytics' },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as typeof tab)}
        sectionColor="#0d9488"
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <span className="material-symbols-outlined animate-spin text-teal-500 text-4xl">sync</span>
          <p className="text-gray-500" style={{ marginTop: '8px' }}>جاري تحميل البيانات...</p>
        </div>
      )}

      {!loading && tab === 'dashboard' && (
        <>
          {/* Import section MUST show even if empty */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: '24px', overflow: 'hidden' }}>
            <button onClick={() => setImportOpen(!importOpen)}
              className="hover:bg-gray-50" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined text-teal-500">upload_file</span>
                <span className="font-bold text-gray-700">استيراد شهادات نور</span>
                {periods.length > 0
                  ? <span className="text-xs text-gray-400 mr-2">({periods.length} فترة مستوردة)</span>
                  : <span className="text-xs text-amber-500 mr-2">لم يتم الاستيراد بعد</span>}
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform ${importOpen || summary.length === 0 ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {(importOpen || summary.length === 0) && (
              <div style={{ borderTop: '1px solid #e5e7eb' }}>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, minWidth: '160px' }}>
                      <label className="text-xs font-bold text-gray-500" style={{ display: 'block', marginBottom: '4px' }}>الفترة</label>
                      <select value={importPeriod} onChange={e => setImportPeriod(e.target.value)}
                        className="border border-gray-300 text-sm focus:ring-2 focus:ring-teal-300" style={{ width: '100%', borderRadius: '8px', padding: '8px 12px' }}>
                        {PERIOD_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="text-xs text-gray-400" style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>الفصل الدراسي يُستخرج تلقائيا من الشهادة</div>
                  </div>
                  <label htmlFor="academic-file-upload"
                    style={{ border: '2px dashed #5eead4', borderRadius: '12px', padding: '24px', textAlign: 'center', backgroundColor: 'rgba(240,253,250,0.3)', cursor: 'pointer', transition: 'all 0.2s', display: 'block' }}>
                    <span className="material-symbols-outlined text-4xl text-teal-400" style={{ marginBottom: '8px' }}>cloud_upload</span>
                    <p style={{ color: '#4b5563', fontWeight: 700, fontSize: '14px' }}>اضغط لرفع ملف Excel او اسحبه هنا</p>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>ملفات شهادات نور (.xlsx)</p>
                    <input id="academic-file-upload" ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                      onChange={handleFileSelect} disabled={importing} />
                  </label>
                  {importStatus && (
                    <div className={`${importStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
                      importStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}
                      style={{ marginTop: '16px', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <span className={`material-symbols-outlined ${importing ? 'animate-spin' : ''} ${importStatus.type === 'error' ? 'text-red-500' :
                        importStatus.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
                        {importStatus.type === 'error' ? 'error' : importStatus.type === 'success' ? 'check_circle' : 'sync'}
                      </span>
                      <p className={`font-bold mt-2 ${importStatus.type === 'error' ? 'text-red-700' :
                        importStatus.type === 'success' ? 'text-green-700' : 'text-blue-700'}`}>{importStatus.msg}</p>
                    </div>
                  )}
                  {periods.length > 0 && (() => {
                    // تنظيم الفترات حسب الفصل الدراسي
                    const bySemester: Record<string, typeof periods> = {};
                    periods.forEach(p => {
                      if (!bySemester[p.semester]) bySemester[p.semester] = [];
                      bySemester[p.semester].push(p);
                    });
                    const PERIOD_ORDER = ['الفترة الاولى', 'الفترة الثانية', 'نهاية الفصل'];
                    return (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.entries(bySemester).map(([sem, pList]) => (
                          <div key={sem} style={{ background: '#f0fdfa', borderRadius: 10, padding: '10px 14px', border: '1px solid #ccfbf1' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', marginBottom: 6 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginLeft: 4 }}>school</span>
                              {sem}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {pList.sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period)).map((p, i) => {
                                const cnt = summary.filter(r => r.semester === p.semester && r.period === p.period).length;
                                return (
                                  <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px',
                                    borderRadius: 8, fontSize: 12, fontWeight: 600,
                                    background: '#fff', color: '#115e59', border: '1px solid #99f6e4',
                                  }}>
                                    {p.period} ({cnt} طالب)
                                    <button onClick={(e) => { e.stopPropagation(); deletePeriod(p.semester, p.period); }}
                                      style={{ color: '#99f6e4', cursor: 'pointer', border: 'none', background: 'none', fontSize: 16, lineHeight: 1, padding: 0 }}
                                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                      onMouseLeave={e => (e.currentTarget.style.color = '#99f6e4')}
                                      title="حذف">&times;</button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Stats sections - always show (with zeros if no data, like old version) */}
            <>
              {/* Quick cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <QuickCard value={ds.totalStudents} label="اجمالي الطلاب" color="#0d9488" />
                <QuickCard value={ds.avgAll + '%'} label="المعدل العام" color="#2563eb" />
                <QuickCard value={ds.maxAvg + '%'} label="اعلى معدل" color="#16a34a" />
                <QuickCard value={ds.minAvg + '%'} label="اقل معدل" color="#dc2626" />
                <QuickCard value={ds.absence.studentsWithAbsence} label="طلاب لديهم غياب" color="#d97706" />
              </div>

              {/* Categories */}
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
                <h4 className="font-bold text-gray-700" style={{ marginBottom: '16px' }}>{'\uD83C\uDFF7\uFE0F'} تصنيف الطلاب</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <CatCard count={ds.categories.excellent} total={Object.values(ds.categories).reduce((a, b) => a + b, 0) || 1}
                    color="#059669" bg="#ecfdf5" label={'\uD83C\uDF1F متفوق (\u226595)'} onClick={() => filterByCategory('excellent')} />
                  <CatCard count={ds.categories.good} total={Object.values(ds.categories).reduce((a, b) => a + b, 0) || 1}
                    color="#2563eb" bg="#eff6ff" label={'\u2705 جيد (80-94)'} onClick={() => filterByCategory('good')} />
                  <CatCard count={ds.categories.average} total={Object.values(ds.categories).reduce((a, b) => a + b, 0) || 1}
                    color="#d97706" bg="#fffbeb" label={'\u26A0\uFE0F متوسط (65-79)'} onClick={() => filterByCategory('average')} />
                  <CatCard count={ds.categories.weak} total={Object.values(ds.categories).reduce((a, b) => a + b, 0) || 1}
                    color="#ea580c" bg="#fff7ed" label={'\uD83D\uDD34 ضعيف (50-64)'} onClick={() => filterByCategory('weak')} />
                  <CatCard count={ds.categories.danger} total={Object.values(ds.categories).reduce((a, b) => a + b, 0) || 1}
                    color="#dc2626" bg="#fef2f2" label={'\uD83D\uDEA8 خطر (<50)'} onClick={() => filterByCategory('danger')} />
                </div>
              </div>

              {/* Subjects & Classes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
                  <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCDA'} ترتيب المواد (الأصعب &larr; الأسهل)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ds.subjects.map((s, i) => {
                      const c = subjectColor(s.avg);
                      const hexColor = c === 'emerald' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'amber' ? '#f59e0b' : '#ef4444';
                      return (
                        <div key={i} className="hover:bg-gray-50" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px' }}>
                          <span className="text-xs font-bold text-gray-400" style={{ width: '20px' }}>{i + 1}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span className="text-sm font-bold">{s.name}</span>
                              <span className="text-sm font-bold" style={{ color: hexColor }}>{s.avg}%</span>
                            </div>
                            <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '8px' }}>
                              <div style={{ height: '8px', borderRadius: '9999px', width: `${s.avg}%`, backgroundColor: hexColor }} />
                            </div>
                            <div className="text-xs text-gray-400" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span>&ge;90: {s.above90}</span>
                              <span>&lt;60: {s.below60}</span>
                              <span>&lt;50: {s.below50}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
                  <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83C\uDFEB'} مقارنة الفصول</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ds.classSummary.map((c, i) => {
                      const co = c.avg >= 90 ? 'emerald' : c.avg >= 80 ? 'blue' : 'amber';
                      const hexColor = co === 'emerald' ? '#10b981' : co === 'blue' ? '#3b82f6' : '#f59e0b';
                      return (
                        <div key={i} className="bg-gray-50 hover:bg-gray-100" style={{ padding: '12px', borderRadius: '8px', transition: 'all 0.2s' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span className="font-bold text-gray-800">{c.label}</span>
                            <span className="text-xs text-gray-400">{c.count} طالب</span>
                          </div>
                          <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '10px', marginBottom: '8px' }}>
                            <div style={{ height: '10px', borderRadius: '9999px', width: `${c.avg}%`, backgroundColor: hexColor }} />
                          </div>
                          <div className="text-xs" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-bold" style={{ color: hexColor }}>المعدل: {c.avg}%</span>
                            <span className="text-emerald-600">متفوق: {c.excellent}</span>
                            <span className="text-red-600">ضعيف: {c.weak}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top/Bottom 10 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '20px' }}>
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
                  <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83C\uDFC6'} العشرة الأوائل</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {ds.topTen.map((s, i) => {
                      const avg = s.average || 0;
                      const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : String(i + 1);
                      return (
                        <div key={i} onClick={() => showStudentReport(s.identityNo)}
                          className="hover:bg-emerald-50" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <span style={{ width: '28px', textAlign: 'center' }} className="text-lg">{medal}</span>
                          <span className="text-sm font-bold text-gray-800" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studentName}</span>
                          <span className="text-xs text-gray-400">{s.grade} / {s.classNum}</span>
                          <span className="text-sm font-bold text-emerald-600">{avg.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
                  <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\u26A0\uFE0F'} أقل 10 طلاب</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {ds.bottomTen.map((s, i) => {
                      const avg = s.average || 0;
                      return (
                        <div key={i} onClick={() => showStudentReport(s.identityNo)}
                          className="hover:bg-red-50" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                          <span className="text-xs text-gray-400" style={{ width: '28px', textAlign: 'center' }}>{i + 1}</span>
                          <span className="text-sm font-bold text-gray-800" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.studentName}</span>
                          <span className="text-xs text-gray-400">{s.grade} / {s.classNum}</span>
                          <span className="text-sm font-bold text-red-600">{avg.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Danger students */}
              {ds.dangerStudents.length > 0 && (
                <div className="bg-red-50 border-red-200" style={{ borderRadius: '12px', border: '1px solid #fecaca', padding: '20px', marginBottom: '20px' }}>
                  <h4 className="font-bold text-red-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDEA8'} طلاب منطقة الخطر (3+ مواد أقل من 60%)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ds.dangerStudents.map((s, i) => (
                      <div key={i} onClick={() => showStudentReport(s.identity)}
                        className="hover:shadow" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: '#fff', borderRadius: '8px', border: '1px solid #fee2e2', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <span className="material-symbols-outlined text-red-500">warning</span>
                        <span className="font-bold text-sm">{s.name}</span>
                        <span className="text-xs text-red-600" style={{ flex: 1 }}>{s.weakCount} مواد: {s.weakSubjects.join('، ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
        </>
      )}

      {/* Reports Tab */}
      {!loading && tab === 'reports' && (
        <>
          {summary.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '48px', textAlign: 'center' }}>
              <span className="material-symbols-outlined text-6xl text-gray-300">inbox</span>
              <p className="text-gray-400" style={{ marginTop: '12px' }}>لا توجد بيانات</p>
            </div>
          ) : subjectReportData ? (
            <SubjectReportView data={subjectReportData} subject={selectedSubject}
              onBack={() => setSubjectReportData(null)} onStudent={showStudentReport} />
          ) : classComparison ? (
            <ClassComparisonView data={classComparison} onBack={() => setClassComparison(null)} />
          ) : (
            <>
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
                <h4 className="font-bold text-gray-700" style={{ marginBottom: '16px' }}>{'\uD83D\uDD0D'} بحث وفلترة</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <input value={filterName} onChange={e => setFilterName(e.target.value)}
                    placeholder="بحث بالاسم..." className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }} />
                  <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                    className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }}>
                    <option value="">كل الصفوف</option>
                    {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
                    className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }}>
                    <option value="">كل الفصول</option>
                    {classOptions.map(c => <option key={c} value={c}>فصل {c}</option>)}
                  </select>
                  <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
                    className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }}>
                    <option value="">كل الفترات</option>
                    {periods.map((p, i) => <option key={i} value={`${p.semester}|${p.period}`}>{p.semester} — {p.period}</option>)}
                  </select>
                  <select value={filterGeneralGrade} onChange={e => setFilterGeneralGrade(e.target.value)}
                    className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }}>
                    <option value="">كل التقديرات</option>
                    {generalGradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input value={filterAvgAbove} onChange={e => setFilterAvgAbove(e.target.value)}
                    type="number" placeholder="معدل اكثر من" className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }} />
                  <input value={filterAvgBelow} onChange={e => setFilterAvgBelow(e.target.value)}
                    type="number" placeholder="معدل اقل من" className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px' }}>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="border border-gray-300 text-sm" style={{ borderRadius: '8px', padding: '8px 12px' }}>
                    <option value="avg_desc">الاعلى معدلا</option>
                    <option value="avg_asc">الاقل معدلا</option>
                    <option value="name">ابجدي</option>
                  </select>
                  <button onClick={() => setSubjectModalOpen(true)}
                    className="bg-purple-500 text-white text-sm hover:bg-purple-600" style={{ padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}>
                    {'\uD83D\uDCCA'} تقرير مادة
                  </button>
                  <button onClick={() => { setClassComparison(null); loadClassComparison(); }}
                    className="bg-blue-500 text-white text-sm hover:bg-blue-600" style={{ padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}>
                    {'\uD83C\uDFEB'} مقارنة فصول
                  </button>
                  <button onClick={async () => {
                    try {
                      const lp = periods[periods.length - 1];
                      const res = await academicApi.exportCsv(currentStage, lp?.semester, lp?.period);
                      const blob = new Blob([res.data], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'academic_export.csv'; a.click();
                      URL.revokeObjectURL(url);
                    } catch { showError('خطأ في التصدير'); }
                  }}
                    className="bg-teal-500 text-white text-sm hover:bg-teal-600" style={{ padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}>
                    <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>download</span> تصدير CSV
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-500" style={{ marginBottom: '12px' }}>
                النتائج: <span className="font-bold text-purple-600">{filteredStudents.length}</span> طالب
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredStudents.map((s, i) => {
                  const avg = s.average || 0;
                  const c = avg >= 95 ? 'emerald' : avg >= 80 ? 'blue' : avg >= 65 ? 'amber' : avg >= 50 ? 'orange' : 'red';
                  const hexColor = c === 'emerald' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'amber' ? '#f59e0b' : c === 'orange' ? '#f97316' : '#ef4444';
                  const hexBg = c === 'emerald' ? '#ecfdf5' : c === 'blue' ? '#eff6ff' : c === 'amber' ? '#fffbeb' : c === 'orange' ? '#fff7ed' : '#fef2f2';
                  return (
                    <div key={s.id || i} onClick={() => showStudentReport(s.identityNo)}
                      className="hover:shadow-md" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <span className="text-sm font-bold text-gray-400" style={{ width: '32px', textAlign: 'center' }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="font-bold text-gray-800">{s.studentName}</span>
                        <span className="text-xs text-gray-400" style={{ marginRight: '8px' }}>{s.grade} / فصل {s.classNum}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <span className="text-xs text-gray-400">{s.generalGrade}</span>
                        <div className="font-bold text-sm" style={{ padding: '4px 12px', borderRadius: '8px', color: hexColor, backgroundColor: hexBg }}>
                          {avg.toFixed(1)}%
                        </div>
                        {s.absence > 0 && (
                          <span className="text-xs text-red-500 bg-red-50" style={{ padding: '2px 8px', borderRadius: '4px' }}>غياب {s.absence}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Subject select modal */}
          {subjectModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
              onClick={e => { if (e.target === e.currentTarget) setSubjectModalOpen(false); }}>
              <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: '24px', width: '384px', maxWidth: '90vw' }}>
                <h3 className="font-bold text-lg" style={{ marginBottom: '16px' }}>{'\uD83D\uDCCA'} اختر المادة</h3>
                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                  className="border" style={{ width: '100%', borderRadius: '8px', padding: '8px 12px', marginBottom: '16px' }}>
                  {subjectOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => {
                    const subj = selectedSubject || subjectOptions[0];
                    const filtered = grades.filter(g => g.subject === subj);
                    filtered.sort((a, b) => b.total - a.total);
                    setSubjectReportData(filtered);
                    setSelectedSubject(subj);
                    setSubjectModalOpen(false);
                  }} className="bg-purple-500 text-white hover:bg-purple-600" style={{ flex: 1, padding: '8px 16px', borderRadius: '8px' }}>عرض</button>
                  <button onClick={() => setSubjectModalOpen(false)}
                    className="border hover:bg-gray-50" style={{ padding: '8px 16px', borderRadius: '8px' }}>الغاء</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Charts Tab */}
      {!loading && tab === 'charts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Grade Distribution - Doughnut */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83C\uDF69'} توزيع التقديرات</h4>
            <div style={{ maxHeight: 320, display: 'flex', justifyContent: 'center' }}>
              <Doughnut
                data={{
                  labels: Object.keys(ds.gradeDist).length > 0 ? Object.keys(ds.gradeDist) : ['لا توجد بيانات'],
                  datasets: [{
                    data: Object.values(ds.gradeDist).length > 0 ? Object.values(ds.gradeDist) : [1],
                    backgroundColor: Object.values(ds.gradeDist).length > 0
                      ? ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280']
                      : ['#e5e7eb'],
                    borderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: true,
                  plugins: {
                    legend: { position: 'bottom', rtl: true, labels: { font: { family: 'Cairo' }, padding: 12 } },
                    tooltip: { rtl: true, titleFont: { family: 'Cairo' }, bodyFont: { family: 'Cairo' } },
                  },
                }}
              />
            </div>
          </div>

          {/* Student Categories - Bar */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCCA'} تصنيف الطلاب</h4>
            <Bar
              data={{
                labels: ['متفوق \u226595', 'جيد 80-94', 'متوسط 65-79', 'ضعيف 50-64', 'خطر <50'],
                datasets: [{
                  label: 'عدد الطلاب',
                  data: [ds.categories.excellent, ds.categories.good, ds.categories.average, ds.categories.weak, ds.categories.danger],
                  backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
                  borderRadius: 6,
                }],
              }}
              options={{
                responsive: true, indexAxis: 'x' as const,
                plugins: {
                  legend: { display: false },
                  tooltip: { rtl: true, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } },
                },
                scales: {
                  x: { ticks: { font: { family: 'Cairo', size: 11 } } },
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>

          {/* Subject Averages - Horizontal Bar */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCDA'} متوسط المواد</h4>
            <Bar
              data={{
                labels: ds.subjects.length > 0 ? ds.subjects.map(s => s.name) : ['لا توجد بيانات'],
                datasets: [{
                  label: 'المتوسط',
                  data: ds.subjects.length > 0 ? ds.subjects.map(s => s.avg) : [0],
                  backgroundColor: ds.subjects.length > 0
                    ? ds.subjects.map(s => s.avg >= 90 ? '#10b981' : s.avg >= 80 ? '#3b82f6' : s.avg >= 70 ? '#f59e0b' : '#ef4444')
                    : ['#e5e7eb'],
                  borderRadius: 4,
                }],
              }}
              options={{
                responsive: true, indexAxis: 'y' as const,
                plugins: {
                  legend: { display: false },
                  tooltip: { rtl: true, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } },
                },
                scales: {
                  x: { beginAtZero: true, max: 100 },
                  y: { ticks: { font: { family: 'Cairo', size: 11 } } },
                },
              }}
            />
          </div>

          {/* Class Comparison - Multi-dataset Bar */}
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83C\uDFEB'} مقارنة الفصول</h4>
            <Bar
              data={{
                labels: ds.classSummary.length > 0 ? ds.classSummary.map(c => c.label) : ['لا توجد بيانات'],
                datasets: [
                  { label: 'المعدل', data: ds.classSummary.length > 0 ? ds.classSummary.map(c => c.avg) : [0], backgroundColor: '#3b82f6', borderRadius: 4 },
                  { label: 'أعلى', data: ds.classSummary.length > 0 ? ds.classSummary.map(c => c.max) : [0], backgroundColor: '#10b981', borderRadius: 4 },
                  { label: 'أقل', data: ds.classSummary.length > 0 ? ds.classSummary.map(c => c.min) : [0], backgroundColor: '#ef4444', borderRadius: 4 },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom', rtl: true, labels: { font: { family: 'Cairo' }, padding: 12 } },
                  tooltip: { rtl: true, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } },
                },
                scales: {
                  x: { ticks: { font: { family: 'Cairo', size: 10 } } },
                  y: { beginAtZero: true, max: 100 },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {!loading && tab === 'analysis' && (
        <AcademicAnalysis
          stage={currentStage}
          semester={periods.length > 0 ? periods[periods.length - 1].semester : ''}
          period={periods.length > 0 ? periods[periods.length - 1].period : ''}
          summary={summary}
          grades={grades}
          periods={periods}
          onStudentClick={showStudentReport}
        />
      )}

      {reportLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', padding: '32px', textAlign: 'center' }}>
            <span className="material-symbols-outlined animate-spin text-teal-500 text-4xl">sync</span>
            <p className="text-gray-500" style={{ marginTop: '8px' }}>جاري تحميل تقرير الطالب...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ──

const QuickCard: React.FC<{ value: string | number; label: string; color: string; bg?: string }> = ({ value, label, color }) => (
  <div className="hover:shadow-md" style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '16px', textAlign: 'center', backgroundColor: '#ffffff', transition: 'all 0.2s' }}>
    <div style={{ fontSize: '1.875rem', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>{label}</div>
  </div>
);

const CatCard: React.FC<{ count: number; total: number; color: string; bg: string; label: string; onClick: () => void }> = ({ count, total, color, bg, label, onClick }) => {
  const pct = Math.round(count / total * 100);
  return (
    <div onClick={onClick}
      className="hover:shadow-md"
      style={{ textAlign: 'center', padding: '12px', border: `1px solid ${bg}`, borderRadius: '12px', cursor: 'pointer', backgroundColor: bg, transition: 'all 0.2s' }}>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: '4px' }}>{label}</div>
      <div style={{ width: '100%', background: '#e5e7eb', borderRadius: '9999px', height: '6px', marginTop: '8px' }}>
        <div style={{ height: '6px', borderRadius: '9999px', width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ── Student Report View ──
const StudentReportView: React.FC<{ report: StudentReport; onBack: () => void }> = ({ report, onBack }) => {
  const { student, summary, analysis } = report;
  const latest = summary[summary.length - 1];
  const avg = latest?.average || 0;
  const ac = avg >= 90 ? '#ecfdf5' : avg >= 75 ? '#eff6ff' : avg >= 60 ? '#fffbeb' : '#fef2f2';
  const acText = avg >= 90 ? '#10b981' : avg >= 75 ? '#3b82f6' : avg >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ maxWidth: '100%' }}>
      <button onClick={onBack} className="text-teal-600 hover:text-teal-800" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="material-symbols-outlined">arrow_forward</span> رجوع
      </button>

      {/* Student card */}
      <div style={{ borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '20px', background: `linear-gradient(to left, ${ac}, #ffffff)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">{student.name}</h2>
            <p className="text-sm text-gray-500" style={{ marginTop: '4px' }}>{student.grade} — فصل {student.classNum} | الهوية: {student.identity}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="text-4xl font-bold" style={{ color: acText }}>{avg.toFixed(1)}%</div>
            <div className="text-sm text-gray-500">{latest?.generalGrade}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginTop: '20px' }}>
          <MiniBox value={latest?.rankGrade || '-'} label="ترتيب الصف" />
          <MiniBox value={latest?.rankClass || '-'} label="ترتيب الفصل" />
          <MiniBox value={analysis.absence} label="الغياب" extraClass={analysis.absence > 0 ? 'text-red-600' : 'text-green-600'} />
          <MiniBox value={analysis.tardiness} label="التاخر" />
          <MiniBox value={analysis.strengths.length} label="مواد قوة" extraClass="text-emerald-600" />
          <MiniBox value={analysis.weaknesses.length} label="مواد ضعف" extraClass="text-red-600" />
          <MiniBox value={analysis.behaviorExcellent || '-'} label="سلوك متميز" />
          <MiniBox value={analysis.behaviorPositive || '-'} label="سلوك ايجابي" />
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCAA'} نقاط القوة ({'\u2265'}90%)</h4>
          {analysis.strengths.length > 0 ? analysis.strengths.map((x, i) => (
            <div key={i} className="bg-emerald-50" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', marginBottom: '4px' }}>
              <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
              <span className="text-sm">{x}</span>
            </div>
          )) : <p className="text-gray-400 text-sm">لا يوجد</p>}

          <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px', marginTop: '20px' }}>{'\u26A0\uFE0F'} نقاط الضعف (&lt;65%)</h4>
          {analysis.weaknesses.length > 0 ? analysis.weaknesses.map((x, i) => (
            <div key={i} className="bg-red-50" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', marginBottom: '4px' }}>
              <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
              <span className="text-sm">{x}</span>
            </div>
          )) : <p className="text-gray-400 text-sm">لا يوجد</p>}

          {analysis.weaknessPattern !== 'لا يوجد' && (
            <div className="bg-amber-50 border border-amber-200 text-sm" style={{ marginTop: '12px', padding: '12px', borderRadius: '8px' }}>
              <strong>نمط الضعف:</strong> {analysis.weaknessPattern}
            </div>
          )}
        </div>

        {/* Subject map - Radar */}
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCCA'} خريطة المواد</h4>
          {analysis.academicGrades.length > 0 ? (
            <div style={{ maxHeight: 350, display: 'flex', justifyContent: 'center' }}>
              <Radar
                data={{
                  labels: analysis.academicGrades.map(g => g.name),
                  datasets: [{
                    label: 'الدرجة',
                    data: analysis.academicGrades.map(g => g.total),
                    backgroundColor: 'rgba(13, 148, 136, 0.15)',
                    borderColor: '#0d9488',
                    borderWidth: 2,
                    pointBackgroundColor: analysis.academicGrades.map(g =>
                      g.total >= 90 ? '#10b981' : g.total >= 70 ? '#3b82f6' : g.total >= 50 ? '#f59e0b' : '#ef4444'
                    ),
                    pointRadius: 4,
                  }],
                }}
                options={{
                  responsive: true, maintainAspectRatio: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      beginAtZero: true, max: 100,
                      pointLabels: { font: { family: 'Cairo', size: 11 } },
                      ticks: { stepSize: 20, display: false },
                    },
                  },
                }}
              />
            </div>
          ) : <p className="text-gray-400 text-sm">لا توجد بيانات</p>}
        </div>
      </div>

      {/* Grades table */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
        <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCCB'} الدرجات التفصيلية</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="text-sm" style={{ width: '100%' }}>
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="text-right font-bold" style={{ padding: '10px' }}>المادة</th>
                <th className="text-center font-bold" style={{ padding: '10px' }}>المجموع</th>
                <th className="text-center font-bold" style={{ padding: '10px' }}>اختبار نهائي</th>
                <th className="text-center font-bold" style={{ padding: '10px' }}>ادوات تقييم</th>
                <th className="text-center font-bold" style={{ padding: '10px' }}>اختبارات قصيرة</th>
                <th className="text-center font-bold" style={{ padding: '10px' }}>التقدير</th>
              </tr>
            </thead>
            <tbody>
              {analysis.academicGrades.map((g, i) => {
                const gc = g.total >= 90 ? '#10b981' : g.total >= 70 ? '#3b82f6' : g.total >= 50 ? '#f59e0b' : '#ef4444';
                const fg = report.grades.find(gr =>
                  gr.subject === g.name && gr.semester === latest?.semester && gr.period === latest?.period
                );
                return (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="font-bold" style={{ padding: '10px' }}>{g.name}</td>
                    <td className="text-center font-bold" style={{ padding: '10px', color: gc }}>{g.total}</td>
                    <td className="text-center" style={{ padding: '10px' }}>{fg?.finalExam ?? '-'}</td>
                    <td className="text-center" style={{ padding: '10px' }}>{fg?.evalTools ?? '-'}</td>
                    <td className="text-center" style={{ padding: '10px' }}>{fg?.shortTests ?? '-'}</td>
                    <td className="text-center" style={{ padding: '10px' }}>{g.grade}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exam vs Classwork - Grouped Bar */}
      {analysis.examVsWork.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
          <h4 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{'\uD83D\uDCC8'} الاختبار النهائي مقابل أعمال السنة</h4>
          <Bar
            data={{
              labels: analysis.examVsWork.map(e => e.name),
              datasets: [
                { label: 'اختبار نهائي', data: analysis.examVsWork.map(e => e.finalExam), backgroundColor: '#3b82f6' },
                { label: 'اعمال السنة', data: analysis.examVsWork.map(e => e.classWork), backgroundColor: '#10b981' },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top', rtl: true, labels: { font: { family: 'Cairo' }, padding: 12 } },
                tooltip: { rtl: true, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } },
              },
              scales: {
                x: { ticks: { font: { family: 'Cairo', size: 10 } } },
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

const MiniBox: React.FC<{ value: string | number; label: string; extraClass?: string }> = ({ value, label, extraClass }) => (
  <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
    <div className={`font-bold ${extraClass || ''}`} style={{ fontSize: '1.125rem' }}>{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

// ── Subject Report View ──
const SubjectReportView: React.FC<{ data: GradeRow[]; subject: string; onBack: () => void; onStudent: (id: string) => void }> = ({ data, subject, onBack, onStudent }) => {
  const totals = data.map(r => r.total);
  const avg = totals.length > 0 ? (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1) : '0';
  return (
    <>
      <button onClick={onBack} className="text-purple-600 hover:text-purple-800 text-sm" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span className="material-symbols-outlined text-sm">arrow_forward</span> رجوع للتقارير
      </button>
      <div className="bg-purple-50 border-purple-200" style={{ borderRadius: '12px', border: '1px solid #e9d5ff', padding: '20px', marginBottom: '16px' }}>
        <h4 className="font-bold text-purple-700 text-lg" style={{ marginBottom: '12px' }}>{'\uD83D\uDCCA'} تقرير: {subject}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '8px', border: '1px solid #e5e7eb' }}><div className="text-xl font-bold text-purple-600">{data.length}</div><div className="text-xs">طالب</div></div>
          <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '8px', border: '1px solid #e5e7eb' }}><div className="text-xl font-bold text-blue-600">{avg}%</div><div className="text-xs">المتوسط</div></div>
          <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '8px', border: '1px solid #e5e7eb' }}><div className="text-xl font-bold text-emerald-600">{totals.filter(t => t >= 90).length}</div><div className="text-xs">&ge;90%</div></div>
          <div style={{ textAlign: 'center', background: '#fff', borderRadius: '8px', padding: '8px', border: '1px solid #e5e7eb' }}><div className="text-xl font-bold text-red-600">{totals.filter(t => t < 60).length}</div><div className="text-xs">&lt;60%</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.slice(0, 50).map((g, i) => {
          const c = g.total >= 90 ? '#10b981' : g.total >= 70 ? '#3b82f6' : g.total >= 50 ? '#f59e0b' : '#ef4444';
          const cb = g.total >= 90 ? '#ecfdf5' : g.total >= 70 ? '#eff6ff' : g.total >= 50 ? '#fffbeb' : '#fef2f2';
          return (
            <div key={i} onClick={() => onStudent(g.identityNo)}
              className="hover:shadow" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '12px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <span className="text-sm font-bold text-gray-400" style={{ width: '32px', textAlign: 'center' }}>{i + 1}</span>
              <span className="font-bold text-sm" style={{ flex: 1 }}>{g.studentName}</span>
              <span className="text-xs text-gray-400">{g.grade} / {g.classNum}</span>
              <div className="font-bold text-sm" style={{ padding: '4px 12px', borderRadius: '8px', backgroundColor: cb, color: c }}>{g.total}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

// ── Class Comparison View ──
const ClassComparisonView: React.FC<{ data: ClassCompItem[]; onBack: () => void }> = ({ data, onBack }) => (
  <>
    <button onClick={onBack} className="text-blue-600 hover:text-blue-800 text-sm" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span className="material-symbols-outlined text-sm">arrow_forward</span> رجوع للتقارير
    </button>
    <div className="bg-blue-50 border-blue-200" style={{ borderRadius: '12px', border: '1px solid #bfdbfe', padding: '20px', marginBottom: '16px' }}>
      <h4 className="font-bold text-blue-700 text-lg">{'\uD83C\uDFEB'} مقارنة الفصول حسب المادة</h4>
    </div>
    {data.map((item, idx) => (
      <div key={idx} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px', marginBottom: '12px' }}>
        <h5 className="font-bold text-gray-700" style={{ marginBottom: '12px' }}>{item.subject}</h5>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(item.classes.length, 4)}, 1fr)`, gap: '12px' }}>
          {item.classes.map((cl, ci) => {
            const co = cl.avg >= 85 ? '#10b981' : cl.avg >= 75 ? '#3b82f6' : '#f59e0b';
            const bg = cl.avg >= 85 ? '#ecfdf5' : cl.avg >= 75 ? '#eff6ff' : '#fffbeb';
            return (
              <div key={ci} style={{ textAlign: 'center', padding: '12px', borderRadius: '8px', border: `1px solid ${co}`, backgroundColor: bg }}>
                <div className="font-bold text-sm">{cl.classLabel}</div>
                <div className="text-2xl font-bold" style={{ color: co, margin: '4px 0' }}>{cl.avg}%</div>
                <div className="text-xs text-gray-500">{cl.count} طالب</div>
                <div className="text-xs" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                  <span className="text-emerald-600">&ge;90: {cl.above90}</span>
                  <span className="text-red-600">&lt;60: {cl.below60}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </>
);

// ══════════════════════════════════════════════════
// Excel parsing utilities (matching old system exactly)
// ══════════════════════════════════════════════════

function sheetTo2DArray(ws: XLSX.WorkSheet): string[][] | null {
  const ref = ws['!ref'];
  if (!ref) return null;
  const range = XLSX.utils.decode_range(ref);
  const maxR = Math.min(range.e.r, 69);
  const maxC = Math.min(range.e.c, 49);

  const mergeMap: Record<string, string> = {};
  const merges = ws['!merges'] || [];
  for (const mg of merges) {
    const tlAddr = XLSX.utils.encode_cell({ r: mg.s.r, c: mg.s.c });
    for (let mr = mg.s.r; mr <= mg.e.r; mr++) {
      for (let mc = mg.s.c; mc <= mg.e.c; mc++) {
        if (mr !== mg.s.r || mc !== mg.s.c) {
          mergeMap[mr + ',' + mc] = tlAddr;
        }
      }
    }
  }

  const rows: string[][] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const lookupAddr = mergeMap[r + ',' + c] || addr;
      const cell = ws[lookupAddr] as { v?: unknown } | undefined;
      row.push(cell && cell.v !== undefined ? String(cell.v) : '');
    }
    rows.push(row);
  }
  return rows;
}

function parseStudentFromArray(d: string[][], fallbackSemester: string): AcademicStudentData | null {
  const c = (row: number, col: number): string => {
    if (row < 1 || row > d.length || col < 1 || col > d[0].length) return '';
    return String(d[row - 1][col - 1] || '');
  };
  const toN = (v: string): number => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  let name = c(28, 35);
  if (name.includes('اسم الطالب:')) name = name.replace('اسم الطالب:', '').trim();
  if (!name) return null;

  const classNum = c(28, 27);
  const identity = c(30, 19);
  if (!identity || identity === '0' || identity === 'undefined') return null;

  const grade = c(19, 10).trim();

  let semester = fallbackSemester || '';
  if (!semester) {
    outerLoop:
    for (let r = 0; r < Math.min(d.length, 25); r++) {
      for (let cc = 0; cc < d[r].length; cc++) {
        const v = d[r][cc] || '';
        if (v.includes('الفصل الدراسي الأول') || v.includes('الفصل الأول')) { semester = 'الفصل الأول'; break outerLoop; }
        else if (v.includes('الفصل الدراسي الثاني') || v.includes('الفصل الثاني')) { semester = 'الفصل الثاني'; break outerLoop; }
        else if (v.includes('الفصل الدراسي الثالث') || v.includes('الفصل الثالث')) { semester = 'الفصل الثالث'; break outerLoop; }
      }
    }
  }

  const subjects: AcademicSubjectData[] = [];
  let average = 0, generalGrade = '';
  const maxSubjRow = Math.min(d.length, 60);
  for (let r = 35; r <= maxSubjRow; r++) {
    const auVal = c(r, 47).trim();
    if (!auVal || auVal === 'المواد الدراسية' || auVal === 'مجموع الدرجات الموزونة' || !isNaN(Number(auVal))) continue;
    if (auVal === 'المعدل') { average = parseFloat(c(r, 24).replace('%', '').trim()) || 0; continue; }
    if (auVal === 'التقدير العام') { generalGrade = c(r, 37) || c(r, 24); continue; }
    subjects.push({
      name: auVal,
      total: toN(c(r, 34)),
      finalExam: toN(c(r, 38)),
      evalTools: toN(c(r, 40)),
      shortTests: toN(c(r, 45)),
      grade: c(r, 24),
    });
  }

  let rankGrade = '', rankClass = '', absence = '0', tardiness = '0', behExc = '', behPos = '';
  const scanEnd = Math.min(d.length, 68);
  for (let r = 50; r <= scanEnd; r++) {
    for (let cc = 0; cc < (d[r - 1] || []).length; cc++) {
      const cv = d[r - 1][cc] || '';
      if (!cv) continue;
      if (cv.includes('الترتيب على الصف')) rankGrade = c(r, 7);
      if (cv.includes('الترتيب على الفصل')) rankClass = c(r, 7);
      if (cv.includes('غياب بدون عذر')) absence = c(r, 9) || '0';
      if (cv.includes('تأخر بدون عذر')) tardiness = c(r, 9) || '0';
      if (cv.includes('درجة السلوك المتميز')) behExc = c(r, 44);
      if (cv.includes('درجة السلوك الإيجابي')) behPos = c(r, 44);
    }
  }

  return {
    name, identity, grade, classNum, semester, average: average || undefined,
    generalGrade, rankGrade, rankClass,
    absence: parseInt(absence) || 0, tardiness: parseInt(tardiness) || 0,
    behaviorExcellent: behExc, behaviorPositive: behPos,
    subjects,
  };
}

export default AcademicPage;
