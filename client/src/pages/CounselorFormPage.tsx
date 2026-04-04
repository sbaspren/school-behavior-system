import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffInputApi, StaffVerifyData, StaffStudent, StudentsMap, TodayEntries } from '../api/staffInput';
import { teacherInputApi } from '../api/teacherInput';
import { getTodayHijri } from '../utils/hijriDate';
import { PERMISSION_REASONS, GUARDIANS } from '../utils/constants';
import {
  NOTES, POSITIVE_NOTES, POSITIVE,
  POS_DEG_COLORS, POS_DEG_TEXT,
  type NoteItem, type PositiveNoteItem, type PositiveItem,
} from '../utils/formData';
import { MF, ROLE_THEME, SEC_COLORS } from '../utils/mobileFormStyles';

type TabId = 'permission' | 'notes' | 'positive';
const TABS: { id: TabId; label: string; color: string; icon: string }[] = [
  { id: 'permission', label: 'استئذان', color: '#3b82f6', icon: 'door_front' },
  { id: 'notes', label: 'ملاحظات', color: '#06b6d4', icon: 'menu_book' },
  { id: 'positive', label: 'سلوك متمايز', color: '#22c55e', icon: 'star' },
];

export default function CounselorFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [pageData, setPageData] = useState<StaffVerifyData | null>(null);
  const [studentsMap, setStudentsMap] = useState<StudentsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState<TabId>('permission');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<StaffStudent[]>([]);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [noteSubType, setNoteSubType] = useState('سلبية');
  const [selectedNote, setSelectedNote] = useState<{ id: number; text: string } | null>(null);
  const [noteDetails, setNoteDetails] = useState('');
  const [selectedPositive, setSelectedPositive] = useState<PositiveItem | null>(null);
  const [positiveDetails, setPositiveDetails] = useState('');
  const [reason, setReason] = useState('');
  const [guardian, setGuardian] = useState('');

  const [showLog, setShowLog] = useState(false);
  const [logData, setLogData] = useState<TodayEntries | null>(null);

  const loadData = useCallback(async () => {
    if (!token) { setError('لا يوجد رمز'); setLoading(false); return; }
    try {
      const [vRes, sRes] = await Promise.all([
        staffInputApi.verify(token), staffInputApi.getStudents(token),
      ]);
      if (vRes.data?.data) setPageData(vRes.data.data);
      if (sRes.data?.data) setStudentsMap(sRes.data.data);
    } catch { setError('رابط غير صالح أو حدث خطأ'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const stages = useMemo(() => Object.keys(studentsMap), [studentsMap]);
  const grades = useMemo(() =>
    selectedStage && studentsMap[selectedStage] ? Object.keys(studentsMap[selectedStage]) : [], [studentsMap, selectedStage]);
  const classes = useMemo(() =>
    selectedStage && selectedGrade && studentsMap[selectedStage]?.[selectedGrade]
      ? Object.keys(studentsMap[selectedStage][selectedGrade]) : [], [studentsMap, selectedStage, selectedGrade]);

  const needsClass = tab === 'notes' || tab === 'positive';

  const currentStudents = useMemo(() => {
    if (!selectedStage || !selectedGrade) return [];
    // ★ Permission: 2-level — مع معلومات الفصل
    if (tab === 'permission') {
      const gd = studentsMap[selectedStage]?.[selectedGrade];
      if (!gd) return [];
      const result: (StaffStudent & { _cls?: string; _sec?: string })[] = [];
      for (const cls of Object.keys(gd).sort()) {
        for (const s of gd[cls]) {
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

  const isSelected = useCallback((id: number) => selectedStudents.some(s => s.id === id), [selectedStudents]);
  const toggleStudent = useCallback((s: StaffStudent) => {
    setSelectedStudents(prev => prev.some(x => x.id === s.id) ? prev.filter(x => x.id !== s.id) : [...prev, s]);
  }, []);
  const toggleAll = useCallback(() => {
    setSelectedStudents(prev => prev.length === filteredStudents.length ? [] : [...filteredStudents]);
  }, [filteredStudents]);

  const handleTabChange = useCallback((newTab: TabId) => {
    setTab(newTab); setSelectedStudents([]); setSelectedNote(null); setSelectedPositive(null); setSearch(''); setMsg(null);
  }, []);

  const currentNotes = useMemo(() => {
    if (noteSubType === 'سلبية') return NOTES;
    return POSITIVE_NOTES[selectedStage] || POSITIVE_NOTES['متوسط'] || [];
  }, [noteSubType, selectedStage]);

  const handleSubmit = useCallback(async () => {
    if (selectedStudents.length === 0) return;
    setSubmitting(true); setMsg(null);
    try {
      if (tab === 'permission') {
        await staffInputApi.savePermission({ token, studentIds: selectedStudents.map(s => s.id), reason, guardian });
      } else {
        const dayNames = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
        const dayName = dayNames[new Date().getDay()];
        let inputType = '', itemId = '', itemText = '', itemDegree = '', noteClassification = '', details = '';

        if (tab === 'positive' && selectedPositive) {
          inputType = 'positive'; itemId = String(selectedPositive.id); itemText = selectedPositive.text;
          itemDegree = String(selectedPositive.degree); details = positiveDetails;
        } else if (tab === 'notes' && selectedNote) {
          inputType = noteSubType === 'سلبية' ? 'note' : 'positive-note';
          itemId = String(selectedNote.id); itemText = selectedNote.text;
          noteClassification = noteSubType; details = noteDetails;
        } else { setMsg({ text: 'يرجى اختيار عنصر', type: 'error' }); setSubmitting(false); return; }

        await teacherInputApi.submit({
          token, teacherName: pageData?.staff.name || '',
          className: selectedClass ? `${selectedGrade} ${selectedClass}` : selectedGrade,
          inputType, itemId, itemText, itemDegree, noteClassification, details,
          hijriDate: getTodayHijri(), dayName, noAbsence: false, notifyDeputy: false,
          stage: selectedStage,
          students: selectedStudents.map(s => ({ id: s.num || String(s.id), name: s.name, phone: s.phone })),
        });
      }
      setMsg({ text: `تم التسجيل بنجاح (${selectedStudents.length} طالب)`, type: 'success' });
      setSelectedStudents([]);
      // ★ Reset — مطابق لـ resetTab في الأصلي
      if (tab === 'permission') { setReason(''); setGuardian(''); }
      if (tab === 'notes') { setSelectedNote(null); setNoteDetails(''); }
      if (tab === 'positive') { setSelectedPositive(null); setPositiveDetails(''); }
    } catch { setMsg({ text: 'حدث خطأ أثناء الحفظ', type: 'error' }); }
    finally { setSubmitting(false); }
  }, [tab, token, selectedStudents, selectedPositive, positiveDetails, selectedNote, noteSubType,
    noteDetails, reason, guardian, selectedClass, selectedGrade, pageData]);

  const loadLog = useCallback(async () => {
    try { const res = await staffInputApi.getTodayEntries(token); if (res.data?.data) setLogData(res.data.data); } catch {}
    setShowLog(true);
  }, [token]);

  useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 4000); return () => clearTimeout(t); } }, [msg]);

  if (loading) return (
    <div style={MF.loadingPage}>
      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: ROLE_THEME.counselor.color }}>psychology</span>
      <span style={MF.loadingText}>جاري التحميل...</span>
    </div>
  );
  if (error) return (
    <div style={MF.errorPage}>
      <span className="material-symbols-outlined" style={MF.errorIcon}>lock</span>
      <div style={MF.errorTitle}>{error}</div>
      <div style={MF.errorMsg}>تحقق من صلاحية الرابط وحاول مرة أخرى</div>
    </div>
  );

  const tabColor = TABS.find(t => t.id === tab)?.color || '#3b82f6';

  return (
    <div style={MF.page}>
      {/* ── الشريط الملون ── */}
      <div style={{ ...MF.accentStrip, background: ROLE_THEME.counselor.color }} />

      {/* ── الهيدر ── */}
      <div style={MF.header}>
        <div style={MF.headerRow}>
          <div style={MF.headerInfo}>
            <div style={{ ...MF.headerIcon, background: ROLE_THEME.counselor.bg }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: ROLE_THEME.counselor.color }}>psychology</span>
            </div>
            <div>
              <div style={MF.headerTitle}>نموذج المرشد</div>
              <div style={MF.headerSub}>{pageData?.staff.name} — {pageData?.sn}</div>
            </div>
          </div>
          <button onClick={() => loadData()} style={MF.refreshBtn}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
            تحديث
          </button>
        </div>
      </div>

      {/* ── التبويبات ── */}
      <div style={MF.tabsBar}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
            ...MF.tab,
            ...(tab === t.id ? { ...MF.tabActive, background: t.color } : {}),
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── الرسائل ── */}
      {msg && (
        <div style={{ ...( msg.type === 'success' ? MF.msgSuccess : MF.msgError ), margin: '8px 16px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {msg.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {msg.text}
        </div>
      )}

      <div style={MF.content}>
        {/* ── بطاقة اختيار المرحلة / الصف / الفصل ── */}
        <div style={MF.card}>
          <div style={{ ...MF.cardAccent, background: tabColor }} />
          <div style={MF.cardBody}>
            <div style={MF.cardTitle}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tabColor }}>school</span>
              اختيار الفصل
            </div>
            <div style={needsClass ? MF.selectGrid3 : MF.selectGrid2}>
              <div>
                <div style={MF.selectLabel}>المرحلة</div>
                <select value={selectedStage} onChange={e => { setSelectedStage(e.target.value); setSelectedGrade(''); setSelectedClass(''); setSelectedStudents([]); }} style={MF.select}>
                  <option value="">المرحلة</option>
                  {stages.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={MF.selectLabel}>الصف</div>
                <select value={selectedGrade} onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); setSelectedStudents([]); }} style={MF.select}>
                  <option value="">الصف</option>
                  {grades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {needsClass && (
                <div>
                  <div style={MF.selectLabel}>الفصل</div>
                  <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudents([]); }} style={MF.select}>
                    <option value="">الفصل</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── بطاقة الاستئذان ── */}
        {tab === 'permission' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#3b82f6' }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#3b82f6' }}>door_front</span>
                بيانات الاستئذان
              </div>
              <div style={MF.selectGrid2}>
                <div>
                  <div style={MF.selectLabel}>السبب</div>
                  <select value={reason} onChange={e => setReason(e.target.value)} style={MF.select}>
                    <option value="">السبب</option>
                    {PERMISSION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <div style={MF.selectLabel}>المستلم</div>
                  <select value={guardian} onChange={e => setGuardian(e.target.value)} style={MF.select}>
                    <option value="">المستلم</option>
                    {GUARDIANS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── بطاقة الملاحظات ── */}
        {tab === 'notes' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#06b6d4' }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#06b6d4' }}>menu_book</span>
                اختيار الملاحظة
              </div>
              <div style={MF.pillRow}>
                {['سلبية', 'إشادة'].map(t => (
                  <button key={t} onClick={() => { setNoteSubType(t); setSelectedNote(null); }} style={{
                    ...MF.pill,
                    ...(noteSubType === t ? { ...MF.pillActive, background: '#06b6d4' } : {}),
                  }}>{t === 'سلبية' ? 'ملاحظات سلبية' : 'إشادة'}</button>
                ))}
              </div>
              <div style={MF.scrollList}>
                {currentNotes.map((n: any) => {
                  const active = selectedNote?.id === n.id;
                  return (
                    <div key={n.id} onClick={() => setSelectedNote(active ? null : n)} style={{
                      ...MF.listItem, background: active ? '#ecfeff' : '#fff',
                      borderRight: `4px solid ${active ? '#06b6d4' : '#e8ebf2'}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{n.text}</span>
                      {'cat' in n && <span style={{ fontSize: '11px', color: '#9da3b8' }}>{(n as PositiveNoteItem).cat}</span>}
                    </div>
                  );
                })}
              </div>
              {selectedNote && <textarea placeholder="تفاصيل إضافية..." value={noteDetails}
                onChange={e => setNoteDetails(e.target.value)} style={MF.textarea} rows={2} />}
            </div>
          </div>
        )}

        {/* ── بطاقة السلوك المتمايز ── */}
        {tab === 'positive' && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: '#22c55e' }} />
            <div style={MF.cardBody}>
              <div style={MF.cardTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#22c55e' }}>star</span>
                اختيار السلوك المتمايز
              </div>
              <div style={MF.scrollList}>
                {POSITIVE.map(p => {
                  const active = selectedPositive?.id === p.id;
                  return (
                    <div key={p.id} onClick={() => setSelectedPositive(active ? null : p)} style={{
                      ...MF.listItem, background: active ? '#f0fdf4' : '#fff',
                      borderRight: `4px solid ${active ? '#22c55e' : POS_DEG_COLORS[p.degree] || '#e8ebf2'}`,
                    }}>
                      <span style={{ flex: 1, fontSize: '13px' }}>{p.text}</span>
                      <span style={{ ...MF.degreeBadge,
                        background: POS_DEG_COLORS[p.degree], color: POS_DEG_TEXT[p.degree],
                      }}>{p.degree} درجات</span>
                    </div>
                  );
                })}
              </div>
              {selectedPositive && <textarea placeholder="تفاصيل إضافية..." value={positiveDetails}
                onChange={e => setPositiveDetails(e.target.value)} style={MF.textarea} rows={2} />}
            </div>
          </div>
        )}

        {/* ── بطاقة اختيار الطلاب ── */}
        {(selectedStage && selectedGrade && (!needsClass || selectedClass)) && (
          <div style={MF.card}>
            <div style={{ ...MF.cardAccent, background: tabColor }} />
            <div style={MF.cardBody}>
              <div style={MF.studentHeader}>
                <span style={MF.studentHeaderTitle}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: tabColor }}>group</span>
                  اختر الطلاب
                  {selectedStudents.length > 0 && <span style={{ ...MF.countBadge, background: tabColor }}>{selectedStudents.length}</span>}
                </span>
                <button onClick={toggleAll} style={MF.selectAllBtn}>
                  {selectedStudents.length === filteredStudents.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>
              <div style={MF.searchBox}>
                <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                <input placeholder="بحث عن طالب..." value={search} onChange={e => setSearch(e.target.value)} style={MF.searchInput} />
              </div>
              {selectedStudents.length > 0 && (
                <div style={MF.chips}>
                  {selectedStudents.map(s => {
                    const sec = (s as any)._sec;
                    return (
                    <span key={s.id} onClick={() => toggleStudent(s)} style={{
                      ...MF.chip, background: tabColor + '20', color: tabColor,
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
                  <div key={s.id} onClick={() => toggleStudent(s)} style={{ ...MF.studentItem, background: isSelected(s.id) ? tabColor + '10' : '#fff' }}>
                    <div style={{
                      ...MF.checkbox,
                      ...(isSelected(s.id) ? { ...MF.checkboxOn, background: tabColor } : {}),
                    }}>
                      {isSelected(s.id) && <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff' }}>check</span>}
                    </div>
                    <span style={MF.studentName}>{s.name}</span>
                    {sec && <span style={MF.studentClass}>{sec}</span>}
                  </div>
                  );
                })}
                {filteredStudents.length === 0 && <div style={MF.empty}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', color: '#9da3b8' }}>
                    {currentStudents.length === 0 ? 'person_search' : 'search_off'}
                  </span>
                  {currentStudents.length === 0 ? 'اختر المرحلة والصف' : 'لا توجد نتائج'}
                </div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── الشريط السفلي ── */}
      <div style={MF.bottomBar}>
        <button onClick={handleSubmit} disabled={submitting || selectedStudents.length === 0
          || (tab === 'permission' && (!reason || !guardian))
          || (tab === 'notes' && !selectedNote)
          || (tab === 'positive' && !selectedPositive)
        } style={{
          ...MF.submitBtn, background: selectedStudents.length > 0 ? tabColor : '#d1d5db', opacity: submitting ? 0.6 : 1,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
          {submitting ? 'جاري الإرسال...' : `إرسال (${selectedStudents.length})`}
        </button>
        <button onClick={loadLog} style={MF.logBtn}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>history</span>
          سجل اليوم
        </button>
      </div>

      {/* ── نافذة السجل ── */}
      {showLog && (
        <div style={MF.overlay} onClick={() => setShowLog(false)}>
          <div style={MF.modal} onClick={e => e.stopPropagation()}>
            <div style={MF.modalHandle} />
            <div style={MF.modalHeader}>
              <span style={MF.modalTitle}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: ROLE_THEME.counselor.color }}>history</span>
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
                        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: ROLE_THEME.counselor.color }}>square</span>
                        {st} ({arr.length})
                      </div>
                      {arr.map((e, i) => (
                        <div key={i} style={MF.logItem}>
                          <span style={MF.logName}>{e.name}</span>
                          <span style={{ ...MF.logBadge, background: e.type === 'استئذان' ? '#3b82f6' : '#ea580c' }}>
                            {e.type} {e.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                });
              })() : (
                <div style={MF.empty}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', display: 'block', marginBottom: '8px', color: '#9da3b8' }}>inbox</span>
                  لا توجد سجلات اليوم
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
