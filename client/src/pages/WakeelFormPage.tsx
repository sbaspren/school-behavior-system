import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffInputApi, StaffVerifyData, StaffStudent, StudentsMap, TodayEntries } from '../api/staffInput';
import { teacherInputApi } from '../api/teacherInput';
import { getTodayHijri } from '../utils/hijriDate';
import { DEGREE_LABEL_NAMES, PERMISSION_REASONS, GUARDIANS } from '../utils/constants';
import {
  VIOLATIONS, NOTES, POSITIVE_NOTES, POSITIVE,
  DEGREE_COLORS, DEGREE_TEXT, POS_DEG_COLORS, POS_DEG_TEXT,
  isViolAvailable, effectiveDeg,
  type ViolationItem, type NoteItem, type PositiveNoteItem, type PositiveItem,
} from '../utils/formData';
import { MF, ROLE_THEME, SEC_COLORS, SEC_ICONS } from '../utils/mobileFormStyles';

const DEGREE_LABELS = DEGREE_LABEL_NAMES;

// ═══════════════════════════════════════════
// Tab configs
// ═══════════════════════════════════════════

type TabId = 'violations' | 'absence' | 'positive' | 'notes' | 'permission' | 'tardiness';

const TABS: { id: TabId; label: string; color: string; icon: string }[] = [
  { id: 'violations', label: 'مخالفات', color: SEC_COLORS.violations, icon: SEC_ICONS.violations },
  { id: 'absence', label: 'غياب', color: SEC_COLORS.absence, icon: SEC_ICONS.absence },
  { id: 'positive', label: 'سلوك', color: SEC_COLORS.positive, icon: SEC_ICONS.positive },
  { id: 'notes', label: 'ملاحظات', color: SEC_COLORS.notes, icon: SEC_ICONS.notes },
  { id: 'permission', label: 'استئذان', color: SEC_COLORS.permission, icon: SEC_ICONS.permission },
  { id: 'tardiness', label: 'تأخر', color: SEC_COLORS.tardiness, icon: SEC_ICONS.tardiness },
];

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export default function WakeelFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  // Page state
  const [pageData, setPageData] = useState<StaffVerifyData | null>(null);
  const [studentsMap, setStudentsMap] = useState<StudentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [tab, setTab] = useState<TabId>('violations');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StaffStudent[]>([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Tab-specific state
  const [violSubType, setViolSubType] = useState('حضوري');
  const [violSearch, setViolSearch] = useState('');
  const [selectedViol, setSelectedViol] = useState<ViolationItem | null>(null);
  const [absenceType, setAbsenceType] = useState('');
  const [selectedPositive, setSelectedPositive] = useState<PositiveItem | null>(null);
  const [positiveDetails, setPositiveDetails] = useState('');
  const [noteSubType, setNoteSubType] = useState('سلبية');
  const [selectedNote, setSelectedNote] = useState<{ id: number; text: string } | null>(null);
  const [noteDetails, setNoteDetails] = useState('');
  const [reason, setReason] = useState('');
  const [guardian, setGuardian] = useState('');

  // Log modal
  const [showLog, setShowLog] = useState(false);
  const [logData, setLogData] = useState<TodayEntries | null>(null);

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
      setError('رابط غير صالح أو حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Derived data ──
  const stages = useMemo(() => Object.keys(studentsMap), [studentsMap]);
  const grades = useMemo(() =>
    selectedStage && studentsMap[selectedStage] ? Object.keys(studentsMap[selectedStage]) : [],
    [studentsMap, selectedStage]);
  const classes = useMemo(() =>
    selectedStage && selectedGrade && studentsMap[selectedStage]?.[selectedGrade]
      ? Object.keys(studentsMap[selectedStage][selectedGrade]) : [],
    [studentsMap, selectedStage, selectedGrade]);

  const currentStudents = useMemo(() => {
    if (!selectedStage || !selectedGrade) return [];
    if (tab === 'permission' || tab === 'tardiness') {
      const gradeData = studentsMap[selectedStage]?.[selectedGrade];
      if (!gradeData) return [];
      const result: (StaffStudent & { _cls?: string; _sec?: string })[] = [];
      for (const cls of Object.keys(gradeData).sort()) {
        for (const s of gradeData[cls]) {
          result.push({ ...s, _cls: `${selectedGrade} ${cls}`, _sec: cls });
        }
      }
      result.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      return result;
    }
    if (!selectedClass) return [];
    return studentsMap[selectedStage]?.[selectedGrade]?.[selectedClass] || [];
  }, [studentsMap, selectedStage, selectedGrade, selectedClass, tab]);

  const filteredStudents = useMemo(() => {
    if (!search) return currentStudents;
    const q = search.toLowerCase();
    return currentStudents.filter(s => s.name.toLowerCase().includes(q));
  }, [currentStudents, search]);

  const isSelected = useCallback((id: number) =>
    selectedStudents.some(s => s.id === id), [selectedStudents]);

  const toggleStudent = useCallback((s: StaffStudent) => {
    setSelectedStudents(prev =>
      prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]
    );
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents([...filteredStudents]);
    }
  }, [filteredStudents, selectedStudents]);

  // ── Tab change ──
  const handleTabChange = useCallback((newTab: TabId) => {
    setTab(newTab);
    setSelectedStudents([]);
    setSelectedViol(null);
    setSelectedPositive(null);
    setSelectedNote(null);
    setSearch('');
    setMsg(null);
  }, []);

  // ── Stage/grade/class change ──
  const handleStageChange = useCallback((s: string) => {
    setSelectedStage(s);
    setSelectedGrade('');
    setSelectedClass('');
    setSelectedStudents([]);
  }, []);

  const handleGradeChange = useCallback((g: string) => {
    setSelectedGrade(g);
    setSelectedClass('');
    setSelectedStudents([]);
  }, []);

  // ── Violations list ──
  const filteredViolations = useMemo(() => {
    let list = VIOLATIONS.filter(v => v.type === violSubType && isViolAvailable(v, selectedStage));
    if (violSearch) {
      const q = violSearch.toLowerCase();
      list = list.filter(v => v.text.toLowerCase().includes(q));
    }
    return list;
  }, [violSubType, selectedStage, violSearch]);

  // ── Notes list ──
  const currentNotes = useMemo(() => {
    if (noteSubType === 'سلبية') return NOTES;
    return POSITIVE_NOTES[selectedStage] || POSITIVE_NOTES['متوسط'] || [];
  }, [noteSubType, selectedStage]);

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    if (selectedStudents.length === 0) return;
    setSubmitting(true);
    setMsg(null);
    try {
      if (tab === 'permission') {
        await staffInputApi.savePermission({
          token,
          studentIds: selectedStudents.map(s => s.id),
          reason,
          guardian,
        });
      } else if (tab === 'tardiness') {
        await staffInputApi.saveTardiness({
          token,
          studentIds: selectedStudents.map(s => s.id),
        });
      } else {
        const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const today = new Date();
        const dayName = dayNames[today.getDay()];

        let inputType = '';
        let itemId = '';
        let itemText = '';
        let itemDegree = '';
        let violationType = '';
        let noteClassification = '';
        let details = '';

        if (tab === 'violations' && selectedViol) {
          inputType = 'violation';
          itemId = String(selectedViol.id);
          itemText = selectedViol.text;
          itemDegree = String(effectiveDeg(selectedViol, selectedStage));
          violationType = selectedViol.type;
        } else if (tab === 'absence') {
          inputType = 'absence';
        } else if (tab === 'positive' && selectedPositive) {
          inputType = 'positive';
          itemId = String(selectedPositive.id);
          itemText = selectedPositive.text;
          itemDegree = String(selectedPositive.degree);
          details = positiveDetails;
        } else if (tab === 'notes' && selectedNote) {
          inputType = noteSubType === 'سلبية' ? 'note' : 'positive-note';
          itemId = String(selectedNote.id);
          itemText = selectedNote.text;
          noteClassification = noteSubType;
          details = noteDetails;
        } else {
          setMsg({ text: 'يرجى اختيار عنصر', type: 'error' });
          setSubmitting(false);
          return;
        }

        await teacherInputApi.submit({
          token,
          teacherName: pageData?.staff.name || '',
          className: selectedClass ? `${selectedGrade} ${selectedClass}` : selectedGrade,
          inputType,
          itemId,
          itemText,
          itemDegree,
          violationType,
          absenceType: tab === 'absence' ? absenceType : undefined,
          details,
          noteClassification,
          hijriDate: getTodayHijri(),
          dayName,
          noAbsence: false,
          notifyDeputy: false,
          stage: selectedStage,
          students: selectedStudents.map(s => ({ id: s.num || String(s.id), name: s.name, phone: s.phone })),
        });
      }

      setMsg({ text: `تم التسجيل بنجاح (${selectedStudents.length} طالب)`, type: 'success' });
      setSelectedStudents([]);
      if (tab === 'permission') { setReason(''); setGuardian(''); }
      if (tab === 'violations') setSelectedViol(null);
      if (tab === 'positive') { setSelectedPositive(null); setPositiveDetails(''); }
      if (tab === 'notes') { setSelectedNote(null); setNoteDetails(''); }
      if (tab === 'absence') setAbsenceType('');
    } catch {
      setMsg({ text: 'حدث خطأ أثناء الحفظ', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }, [tab, token, selectedStudents, selectedViol, selectedStage, selectedClass, selectedGrade,
    selectedPositive, positiveDetails, selectedNote, noteSubType, noteDetails, reason, guardian,
    absenceType, pageData]);

  // ── Log ──
  const loadLog = useCallback(async () => {
    try {
      const res = await staffInputApi.getTodayEntries(token);
      if (res.data?.data) setLogData(res.data.data);
    } catch { /* empty */ }
    setShowLog(true);
  }, [token]);

  // ── Auto-hide message ──
  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  // ── Render: Loading ──
  if (loading) return (
    <div style={MF.loadingPage}>
      <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#9da3b8' }}>hourglass_empty</span>
      <span style={MF.loadingText}>جاري التحميل...</span>
    </div>
  );

  // ── Render: Error ──
  if (error) return (
    <div style={MF.errorPage}>
      <span className="material-symbols-outlined" style={MF.errorIcon}>lock</span>
      <div style={MF.errorTitle}>{error}</div>
    </div>
  );

  const tabColor = TABS.find(t => t.id === tab)?.color || '#3b82f6';
  const needsClass = tab !== 'permission' && tab !== 'tardiness';
  const theme = ROLE_THEME.wakeel;

  return (
    <div style={MF.page}>
      {/* Accent strip */}
      <div style={{ ...MF.accentStrip, background: theme.color }} />

      {/* Header */}
      <div style={MF.header}>
        <div style={MF.headerRow}>
          <div style={MF.headerInfo}>
            <div style={{ ...MF.headerIcon, background: theme.bg }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: theme.color }}>{theme.icon}</span>
            </div>
            <div>
              <h1 style={MF.headerTitle}>نموذج الوكيل</h1>
              <div style={MF.headerSub}>{pageData?.staff.name} — {pageData?.sn}</div>
            </div>
          </div>
          <button onClick={() => loadData()} style={MF.refreshBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>sync</span>
            تحديث
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={MF.tabsBar}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            ...MF.tab,
            ...(tab === t.id ? { ...MF.tabActive, background: t.color } : {}),
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tab === t.id ? '#fff' : t.color }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Message */}
      {msg && (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px' }}>
          <div style={msg.type === 'success' ? MF.msgSuccess : MF.msgError}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{msg.type === 'success' ? 'check_circle' : 'error'}</span>
            {msg.text}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={MF.content}>
        {/* Stage/Grade/Class selectors */}
        <div style={MF.card}>
          <div style={{ ...MF.cardAccent, background: tabColor }} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>apartment</span>
              المرحلة والصف
            </div>
            <div style={needsClass ? MF.selectGrid3 : MF.selectGrid2}>
              <div>
                <div style={MF.selectLabel}>المرحلة</div>
                <select value={selectedStage} onChange={e => handleStageChange(e.target.value)} style={MF.select}>
                  <option value="">اختر</option>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={MF.selectLabel}>الصف</div>
                <select value={selectedGrade} onChange={e => handleGradeChange(e.target.value)} style={MF.select}>
                  <option value="">اختر</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {needsClass && (
                <div>
                  <div style={MF.selectLabel}>الفصل</div>
                  <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudents([]); }} style={MF.select}>
                    <option value="">اختر</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab-specific content */}
        {tab === 'violations' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>gavel</span>
                اختر المخالفة
              </div>
              <div style={MF.pillRow}>
                {[
                  { id: 'حضوري', icon: 'person' },
                  { id: 'رقمي', icon: 'devices' },
                  { id: 'هيئة تعليمية', icon: 'groups' },
                ].map(t => (
                  <button key={t.id} onClick={() => setViolSubType(t.id)} style={{
                    ...MF.pill,
                    ...(violSubType === t.id ? { ...MF.pillActive, background: SEC_COLORS.violations } : {}),
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{t.icon}</span>
                    {t.id}
                  </button>
                ))}
              </div>
              <div style={MF.searchBox}>
                <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                <input placeholder="بحث في المخالفات..." value={violSearch}
                  onChange={e => setViolSearch(e.target.value)} style={MF.searchInput} />
              </div>
              <div style={MF.scrollList}>
                {filteredViolations.map(v => {
                  const deg = effectiveDeg(v, selectedStage);
                  const active = selectedViol?.id === v.id;
                  return (
                    <div key={v.id} onClick={() => setSelectedViol(active ? null : v)} style={{
                      ...MF.listItem,
                      background: active ? '#fef2f2' : '#fff',
                      borderRight: `4px solid ${active ? SEC_COLORS.violations : DEGREE_COLORS[deg]}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{v.text}</span>
                      <span style={{
                        ...MF.degreeBadge,
                        background: DEGREE_COLORS[deg], color: DEGREE_TEXT[deg],
                      }}>{DEGREE_LABELS[deg]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'absence' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>event_busy</span>
                نوع الغياب
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {['يوم كامل', 'حصة'].map(t => (
                  <div key={t} onClick={() => setAbsenceType(t)} style={{
                    padding: '20px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${absenceType === t ? SEC_COLORS.absence : '#e8ebf2'}`,
                    background: absenceType === t ? '#fffbeb' : '#fff',
                    fontWeight: 700, fontSize: '15px',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: absenceType === t ? SEC_COLORS.absence : '#9da3b8', display: 'block', marginBottom: '4px' }}>
                      {t === 'يوم كامل' ? 'calendar_today' : 'hourglass_empty'}
                    </span>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'positive' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>star</span>
                اختر السلوك المتمايز
              </div>
              <div style={MF.scrollList}>
                {POSITIVE.map(p => {
                  const active = selectedPositive?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setSelectedPositive(active ? null : p)} style={{
                      ...MF.listItem,
                      background: active ? '#f0fdf4' : '#fff',
                      borderRight: `4px solid ${active ? SEC_COLORS.positive : POS_DEG_COLORS[p.degree] || '#e8ebf2'}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{p.text}</span>
                      <span style={{
                        ...MF.degreeBadge,
                        background: POS_DEG_COLORS[p.degree], color: POS_DEG_TEXT[p.degree],
                      }}>{p.degree} درجات</span>
                    </div>
                  );
                })}
              </div>
              {selectedPositive && (
                <textarea placeholder="تفاصيل إضافية (اختياري)..." value={positiveDetails}
                  onChange={e => setPositiveDetails(e.target.value)} style={MF.textarea} rows={2} />
              )}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>menu_book</span>
                اختر الملاحظة
              </div>
              <div style={MF.pillRow}>
                {['سلبية', 'إشادة'].map(t => (
                  <button key={t} onClick={() => { setNoteSubType(t); setSelectedNote(null); }} style={{
                    ...MF.pill,
                    ...(noteSubType === t ? { ...MF.pillActive, background: SEC_COLORS.notes } : {}),
                  }}>{t === 'سلبية' ? 'ملاحظات سلبية' : 'إشادة'}</button>
                ))}
              </div>
              <div style={MF.scrollList}>
                {currentNotes.map((n: any) => {
                  const active = selectedNote?.id === n.id;
                  return (
                    <div key={n.id} onClick={() => setSelectedNote(active ? null : n)} style={{
                      ...MF.listItem,
                      background: active ? '#ecfeff' : '#fff',
                      borderRight: `4px solid ${active ? SEC_COLORS.notes : '#e8ebf2'}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{n.text}</span>
                      {'cat' in n && <span style={{ fontSize: '11px', color: '#9ca3af' }}>{(n as PositiveNoteItem).cat}</span>}
                    </div>
                  );
                })}
              </div>
              {selectedNote && (
                <textarea placeholder="تفاصيل إضافية (اختياري)..." value={noteDetails}
                  onChange={e => setNoteDetails(e.target.value)} style={MF.textarea} rows={2} />
              )}
            </div>
          </div>
        )}

        {tab === 'permission' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>door_front</span>
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

        {/* Student selector */}
        {(selectedStage && selectedGrade && (!needsClass || selectedClass)) && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.studentHeader}>
                <span style={MF.studentHeaderTitle}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: tabColor }}>groups</span>
                  اختر الطلاب
                  {selectedStudents.length > 0 && (
                    <span style={{ ...MF.countBadge, background: tabColor }}>{selectedStudents.length}</span>
                  )}
                </span>
                <button onClick={toggleAll} style={MF.selectAllBtn}>
                  {selectedStudents.length === filteredStudents.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>
              <div style={MF.searchBox}>
                <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                <input placeholder="بحث عن طالب..." value={search}
                  onChange={e => setSearch(e.target.value)} style={MF.searchInput} />
              </div>

              {/* Selected chips */}
              {selectedStudents.length > 0 && (
                <div style={MF.chips}>
                  {selectedStudents.map(s => {
                    const sec = (s as any)._sec;
                    return (
                      <span key={s.id} onClick={() => toggleStudent(s)} style={{
                        ...MF.chip, background: tabColor + '15', color: tabColor,
                      }}>
                        {s.name.split(' ').slice(0, 2).join(' ')}{sec ? ` (${sec})` : ''}
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                      </span>
                    );
                  })}
                </div>
              )}

              <div style={MF.scrollList}>
                {filteredStudents.map(s => {
                  const sec = (s as any)._sec;
                  return (
                    <div key={s.id} onClick={() => toggleStudent(s)} style={{
                      ...MF.studentItem,
                      background: isSelected(s.id) ? tabColor + '08' : '#fff',
                    }}>
                      <div style={{
                        ...MF.checkbox,
                        ...(isSelected(s.id) ? { ...MF.checkboxOn, background: tabColor } : {}),
                      }}>
                        {isSelected(s.id) && <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#fff' }}>check</span>}
                      </div>
                      <span style={MF.studentName}>{s.name}</span>
                      {sec && <span style={MF.studentClass}>{sec}</span>}
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div style={MF.empty}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', color: '#9da3b8' }}>
                      {currentStudents.length === 0 ? 'group_off' : 'search_off'}
                    </span>
                    {currentStudents.length === 0 ? 'اختر المرحلة والصف' : 'لا توجد نتائج'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={MF.bottomBar}>
        <button onClick={handleSubmit} disabled={submitting || selectedStudents.length === 0
          || (tab === 'violations' && !selectedViol)
          || (tab === 'absence' && !absenceType)
          || (tab === 'positive' && !selectedPositive)
          || (tab === 'notes' && !selectedNote)
          || (tab === 'permission' && (!reason || !guardian))
        } style={{
          ...MF.submitBtn,
          background: selectedStudents.length > 0 ? tabColor : '#d1d5db',
          opacity: submitting ? 0.6 : 1,
          boxShadow: selectedStudents.length > 0 ? `0 4px 14px ${tabColor}40` : 'none',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          {submitting ? 'جاري الإرسال...' : `إرسال (${selectedStudents.length})`}
        </button>
        <button onClick={loadLog} style={MF.logBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
          سجل اليوم
        </button>
      </div>

      {/* Log modal */}
      {showLog && (
        <div style={MF.overlay} onClick={() => setShowLog(false)}>
          <div style={MF.modal} onClick={e => e.stopPropagation()}>
            <div style={MF.modalHandle} />
            <div style={MF.modalHeader}>
              <span style={MF.modalTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: theme.color }}>history</span>
                سجل اليوم
              </span>
              <button onClick={() => setShowLog(false)} style={MF.modalClose}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>
            <div style={MF.modalBody}>
              {logData?.entries ? (() => {
                const entries = logData.entries;
                const stageKeys = Object.keys(entries);
                const total = stageKeys.reduce((sum, k) => sum + entries[k].length, 0);
                if (total === 0) return (
                  <div style={MF.empty}>
                    <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', color: '#9da3b8' }}>inbox</span>
                    لا توجد سجلات
                  </div>
                );
                return stageKeys.map(st => {
                  const arr = entries[st];
                  if (!arr?.length) return null;
                  return (
                    <div key={st}>
                      <div style={MF.logStageHeader}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: theme.color }}>square</span>
                        {st} ({arr.length})
                      </div>
                      {arr.map((e, i) => (
                        <div key={i} style={MF.logItem}>
                          <span style={MF.logName}>{e.name}</span>
                          <span style={{
                            ...MF.logBadge,
                            background: e.type === 'استئذان' ? SEC_COLORS.permission : SEC_COLORS.tardiness,
                          }}>
                            {e.type} {e.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                });
              })() : (
                <div style={MF.empty}>لا توجد سجلات اليوم</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
