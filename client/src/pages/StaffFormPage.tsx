import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  staffInputApi, StaffVerifyData, StudentsMap, TodayEntries,
  FlatStudent, flattenGradeStudents
} from '../api/staffInput';
import { PERMISSION_REASONS, GUARDIANS } from '../utils/constants';
import { MF, ROLE_THEME, SEC_COLORS } from '../utils/mobileFormStyles';

type Tab = 'perm' | 'late';

export default function StaffFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [pageData, setPageData] = useState<StaffVerifyData | null>(null);
  const [studentsMap, setStudentsMap] = useState<StudentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState<Tab>('perm');
  const [stage, setStage] = useState('');
  const [grade, setGrade] = useState('');
  const [selected, setSelected] = useState<FlatStudent[]>([]);
  const [reason, setReason] = useState('');
  const [guardian, setGuardian] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; cls: string } | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [logData, setLogData] = useState<TodayEntries | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = useCallback((msg: string, cls: string) => {
    setToast({ msg, cls });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    if (!token) { setError('لا يوجد رمز'); setLoading(false); return; }
    try {
      const [vRes, sRes] = await Promise.all([
        staffInputApi.verify(token),
        staffInputApi.getStudents(token),
      ]);
      if (vRes.data?.data) setPageData(vRes.data.data);
      if (sRes.data?.data) setStudentsMap(sRes.data.data);
    } catch {
      setError('رابط غير صالح أو منتهي الصلاحية');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived ──
  const stages = useMemo(() => pageData?.gradeMap ? Object.keys(pageData.gradeMap) : [], [pageData]);
  const grades = useMemo(() => stage && pageData?.gradeMap?.[stage] ? pageData.gradeMap[stage] : [], [pageData, stage]);

  // ★ 2-level: flatten all classes under selected grade
  const allStudents = useMemo(() =>
    stage && grade ? flattenGradeStudents(studentsMap, stage, grade) : [],
    [studentsMap, stage, grade]
  );

  const filtered = useMemo(() => {
    if (!search) return allStudents;
    return allStudents.filter(s => s.name.includes(search));
  }, [allStudents, search]);

  const isSelected = useCallback((id: number) => selected.some(s => s.id === id), [selected]);

  // ── Auto-select single stage ──
  useEffect(() => {
    if (stages.length === 1 && !stage) setStage(stages[0]);
  }, [stages, stage]);

  // ── Reset on change ──
  useEffect(() => { setGrade(''); setSelected([]); setSearch(''); }, [stage]);
  useEffect(() => { setSelected([]); setSearch(''); }, [grade]);

  // ── Actions ──
  const toggleStudent = (s: FlatStudent) => {
    setSelected(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  };

  const selectAll = () => {
    const allOn = filtered.every(s => isSelected(s.id));
    if (allOn) {
      const ids = new Set(filtered.map(s => s.id));
      setSelected(prev => prev.filter(s => !ids.has(s.id)));
    } else {
      const toAdd = filtered.filter(s => !isSelected(s.id));
      setSelected(prev => [...prev, ...toAdd]);
    }
  };

  const removeStudent = (id: number) => setSelected(prev => prev.filter(s => s.id !== id));

  const canSubmit = useMemo(() => {
    if (selected.length === 0 || !stage || !grade) return false;
    if (tab === 'perm') return !!reason && !!guardian;
    return true;
  }, [selected, stage, grade, tab, reason, guardian]);

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const ids = selected.map(s => s.id);
      if (tab === 'perm') {
        const res = await staffInputApi.savePermission({ token, studentIds: ids, reason, guardian });
        showToast(`تم تسجيل الاستئذان — ${res.data?.data?.count || ids.length} طالب`, 'ts');
      } else {
        const res = await staffInputApi.saveTardiness({ token, studentIds: ids });
        showToast(`تم تسجيل التأخر — ${res.data?.data?.count || ids.length} طالب`, 'ts');
      }
      setSelected([]);
      setReason(''); setGuardian('');
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'te');
    } finally {
      setSubmitting(false);
    }
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await staffInputApi.getStudents(token);
      if (res.data?.data) { setStudentsMap(res.data.data); showToast('تم التحديث', 'ts'); }
    } catch { showToast('فشل التحديث', 'te'); }
    finally { setRefreshing(false); }
  };

  const openLog = async () => {
    setShowLog(true); setLogData(null);
    try {
      const res = await staffInputApi.getTodayEntries(token);
      if (res.data?.data) setLogData(res.data.data);
    } catch { /* empty */ }
  };

  const swTab = (t: Tab) => {
    setTab(t);
    setSelected([]); setSearch('');
  };

  // ── Render ──
  const tabColor = tab === 'perm' ? SEC_COLORS.permission : SEC_COLORS.tardiness;

  if (loading) return (
    <div style={MF.loadingPage}>
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: ROLE_THEME.staff.color }}>hourglass_empty</span>
      <div style={MF.loadingText}>جاري التحميل...</div>
    </div>
  );

  if (error || !pageData) return (
    <div style={MF.errorPage}>
      <span className="material-symbols-outlined" style={{ ...MF.errorIcon, fontSize: '48px' }}>lock</span>
      <div style={MF.errorTitle}>رابط غير صالح</div>
      <div style={MF.errorMsg}>{error || 'تأكد من صحة الرابط'}</div>
    </div>
  );

  const { staff } = pageData;

  return (
    <div style={MF.page}>
      {/* Accent strip */}
      <div style={{...MF.accentStrip, background: ROLE_THEME.staff.color}} />

      {/* Header */}
      <div style={MF.header}>
        <div style={MF.headerRow}>
          <div style={MF.headerInfo}>
            <div style={{...MF.headerIcon, background: ROLE_THEME.staff.bg, color: ROLE_THEME.staff.color}}>
              <span className="material-symbols-outlined" style={{fontSize: 22}}>shield_person</span>
            </div>
            <div>
              <h1 style={MF.headerTitle}>التأخر والاستئذان</h1>
              <div style={MF.headerSub}>{staff.name}{staff.role ? ` — ${staff.role}` : ''}</div>
            </div>
          </div>
          <button onClick={doRefresh} style={MF.refreshBtn}>
            <span style={refreshing ? { display: 'inline-flex', animation: 'spin .8s linear infinite' } : { display: 'inline-flex' }}>
              <span className="material-symbols-outlined" style={{fontSize: 16}}>refresh</span>
            </span>
            تحديث
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={MF.tabsBar}>
        <button onClick={() => swTab('perm')}
          style={{
            ...MF.tab,
            ...(tab === 'perm' ? { ...MF.tabActive, background: SEC_COLORS.permission } : {}),
          }}>
          <span className="material-symbols-outlined" style={{fontSize: 16}}>door_front</span>
          استئذان
        </button>
        <button onClick={() => swTab('late')}
          style={{
            ...MF.tab,
            ...(tab === 'late' ? { ...MF.tabActive, background: SEC_COLORS.tardiness } : {}),
          }}>
          <span className="material-symbols-outlined" style={{fontSize: 16}}>schedule</span>
          تأخر
        </button>
      </div>

      <div style={MF.content}>
        {/* Card: المرحلة والصف */}
        <div style={MF.card}>
          <div style={{...MF.cardAccent, background: tabColor}} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{fontSize: 16, color: tabColor}}>apartment</span>
              المرحلة والصف
            </div>
            <div style={MF.selectGrid2}>
              <div>
                <div style={MF.selectLabel}>المرحلة</div>
                <select value={stage} onChange={e => setStage(e.target.value)} style={MF.select}>
                  <option value="">اختر</option>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={MF.selectLabel}>الصف</div>
                <select value={grade} onChange={e => setGrade(e.target.value)} style={MF.select} disabled={!stage}>
                  <option value="">اختر</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Permission details */}
        {tab === 'perm' && (
          <div style={MF.card}>
            <div style={{...MF.cardAccent, background: SEC_COLORS.permission}} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{fontSize: 16, color: SEC_COLORS.permission}}>edit_note</span>
                تفاصيل الاستئذان
              </div>
              <div style={MF.selectGrid2}>
                <div>
                  <div style={MF.selectLabel}>السبب</div>
                  <select value={reason} onChange={e => setReason(e.target.value)} style={MF.select}>
                    <option value="">اختر</option>
                    {PERMISSION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={MF.selectLabel}>المستلم</div>
                  <select value={guardian} onChange={e => setGuardian(e.target.value)} style={MF.select}>
                    <option value="">اختر</option>
                    {GUARDIANS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card: Students */}
        <div style={MF.card}>
          <div style={{...MF.cardAccent, background: tabColor}} />
          <div style={MF.cardBody}>
            <div style={MF.studentHeader}>
              <div style={MF.studentHeaderTitle}>
                <span className="material-symbols-outlined" style={{fontSize: 16, color: tabColor}}>groups</span>
                {tab === 'perm' ? 'الطلاب' : 'المتأخرين'}
                {selected.length > 0 && (
                  <span style={{...MF.countBadge, background: tabColor}}>{selected.length}</span>
                )}
              </div>
            </div>

            {/* Search */}
            <div style={MF.searchBox}>
              <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن طالب..." style={MF.searchInput} />
            </div>

            {/* Student list */}
            <div style={MF.scrollList}>
              {!grade ? (
                <div style={MF.empty}>اختر المرحلة والصف أولا</div>
              ) : filtered.length === 0 ? (
                <div style={MF.empty}>لا يوجد طلاب</div>
              ) : (
                <>
                  <div style={{display:'flex',justifyContent:'flex-end',padding:'6px 12px',borderBottom:`1px solid #f0f2f7`}}>
                    <button onClick={selectAll} style={MF.selectAllBtn}>
                      تحديد الكل ({filtered.length})
                    </button>
                  </div>
                  {filtered.map(s => {
                    const on = isSelected(s.id);
                    return (
                      <div key={s.id} onClick={() => toggleStudent(s)}
                        style={{...MF.studentItem, background: on ? (tab === 'perm' ? '#eff6ff' : '#fff7ed') : '#fff'}}>
                        <div style={{
                          ...MF.checkbox,
                          ...(on ? {...MF.checkboxOn, background: tabColor} : {}),
                        }}>
                          {on && <span className="material-symbols-outlined" style={{fontSize: 14}}>check</span>}
                        </div>
                        <span style={MF.studentName}>{s.name}</span>
                        <span style={MF.studentClass}>{s.sec}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Chips */}
            {selected.length > 0 && (
              <div style={MF.chips}>
                {selected.map(s => (
                  <span key={s.id} style={{...MF.chip, background: tabColor, color: '#fff'}}>
                    {s.name}
                    <span style={{opacity: 0.75, fontSize: '10px'}}>({s.sec})</span>
                    <span style={{cursor:'pointer',display:'inline-flex'}} onClick={(e) => { e.stopPropagation(); removeStudent(s.id); }}>
                      <span className="material-symbols-outlined" style={{fontSize: 14}}>close</span>
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={MF.bottomBar}>
        <button onClick={handleSubmit} disabled={!canSubmit || submitting}
          style={{
            ...MF.submitBtn,
            background: canSubmit ? tabColor : '#d1d5db',
            opacity: submitting ? 0.6 : 1,
          }}>
          {submitting ? 'جاري الإرسال...' : (
            <>
              <span className="material-symbols-outlined" style={{fontSize: 18}}>send</span>
              {tab === 'perm' ? 'تسجيل الاستئذان' : 'تسجيل التأخر'}
            </>
          )}
        </button>
        <button onClick={openLog} style={MF.logBtn}>
          <span className="material-symbols-outlined" style={{fontSize: 18}}>history</span>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          ...MF.toast,
          ...(toast.cls === 'ts' ? MF.toastSuccess : toast.cls === 'te' ? MF.toastError : {}),
        }}>
          <span className="material-symbols-outlined" style={{fontSize: 18}}>
            {toast.cls === 'ts' ? 'check_circle' : 'error'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Log Modal */}
      {showLog && (
        <div style={MF.overlay} onClick={() => setShowLog(false)}>
          <div style={MF.modal} onClick={e => e.stopPropagation()}>
            <div style={MF.modalHandle} />
            <div style={MF.modalHeader}>
              <h3 style={MF.modalTitle}>
                <span className="material-symbols-outlined" style={{fontSize: 20}}>history</span>
                سجل اليوم
              </h3>
              <button onClick={() => setShowLog(false)} style={MF.modalClose}>
                <span className="material-symbols-outlined" style={{fontSize: 18}}>close</span>
              </button>
            </div>
            <div style={MF.modalBody}>
              {!logData ? (
                <div style={MF.empty}>
                  <span className="material-symbols-outlined" style={{fontSize: 16, verticalAlign: 'middle'}}>hourglass_empty</span>
                  {' '}جاري التحميل...
                </div>
              ) : (() => {
                const entries = logData.entries || {};
                const stageKeys = Object.keys(entries);
                const total = stageKeys.reduce((sum, k) => sum + entries[k].length, 0);
                if (total === 0) return (
                  <div style={MF.empty}>
                    <span className="material-symbols-outlined" style={{fontSize: 24, verticalAlign: 'middle'}}>inbox</span>
                    {' '}لا توجد سجلات
                  </div>
                );
                return stageKeys.map(st => {
                  const arr = entries[st];
                  if (!arr.length) return null;
                  return (
                    <div key={st}>
                      <div style={MF.logStageHeader}>
                        <span className="material-symbols-outlined" style={{fontSize: 16, color: '#6366f1'}}>square</span>
                        {st} ({arr.length})
                      </div>
                      {arr.map((e, i) => (
                        <div key={i} style={MF.logItem}>
                          <span style={MF.logName}>{e.name}</span>
                          <span style={{
                            ...MF.logBadge,
                            background: e.type === 'استئذان' ? SEC_COLORS.permission : SEC_COLORS.tardiness
                          }}>
                            {e.type} {e.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
