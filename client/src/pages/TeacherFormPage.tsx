import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { teacherInputApi, TeacherPageData, ClassInfo, StudentInfo } from '../api/teacherInput';
import { DEGREE_LABEL_NAMES } from '../utils/constants';
import {
  VIOLATIONS, NOTES, POSITIVE_NOTES, POSITIVE,
  DEGREE_COLORS, DEGREE_TEXT,
  isViolAvailable, effectiveDeg,
  type ViolationItem, type NoteItem, type PositiveNoteItem, type PositiveItem,
} from '../utils/formData';
import { MF, ROLE_THEME, SEC_COLORS } from '../utils/mobileFormStyles';

const DEGREE_LABELS = DEGREE_LABEL_NAMES;
const TC = ROLE_THEME.teacher.color;
const TB = ROLE_THEME.teacher.bg;

const INPUT_TYPES = [
  { id: 'absence', label: 'غياب', color: SEC_COLORS.absence, icon: 'event_busy' },
  { id: 'violation', label: 'مخالفة سلوكية', color: SEC_COLORS.violations, icon: 'gavel' },
  { id: 'note', label: 'ملاحظة تربوية', color: SEC_COLORS.notes, icon: 'menu_book' },
  { id: 'positive', label: 'سلوك متمايز', color: SEC_COLORS.positive, icon: 'star' },
];
const STAGE_LABELS: Record<string, string> = { 'متوسط': 'المرحلة المتوسطة', 'ثانوي': 'المرحلة الثانوية', 'ابتدائي': 'المرحلة الابتدائية', 'طفولة مبكرة': 'مرحلة الطفولة المبكرة' };
const STAGE_SHORT: Record<string, string> = { 'متوسط': 'المتوسطة', 'ثانوي': 'الثانوية', 'ابتدائي': 'الابتدائية', 'طفولة مبكرة': 'الطفولة المبكرة' };
const DEPUTY_LABELS: Record<string, string> = { 'متوسط': 'وكيل المتوسط', 'ثانوي': 'وكيل الثانوي', 'ابتدائي': 'وكيل الابتدائي', 'طفولة مبكرة': 'وكيل الطفولة المبكرة' };
const CLASS_ICONS = ['person', 'school', 'groups', 'diversity_3', 'group_work', 'family_restroom', 'badge', 'groups_2'];

/* Wizard-specific layout (not in MF) */
const S = {
  step: {
    position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const,
    background: '#f4f5f9', opacity: 0, pointerEvents: 'none' as const,
    transition: 'opacity .2s ease',
  },
  stepActive: {
    position: 'absolute' as const, inset: 0, display: 'flex', flexDirection: 'column' as const,
    background: '#f4f5f9', opacity: 1, pointerEvents: 'auto' as const, zIndex: 1,
  },
  stepHead: { padding: '16px 16px 12px', flexShrink: 0 as const },
  stepTitle: {
    fontSize: '18px', fontWeight: 800, color: '#1a1d2e',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  stepNum: {
    width: '30px', height: '30px', background: TC, color: '#fff',
    borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: '14px', fontWeight: 800, flexShrink: 0 as const,
  },
  stepSub: { fontSize: '13px', color: '#5c6178', marginTop: '4px', marginRight: '40px' },
  stepBody: { flex: 1, overflowY: 'auto' as const, padding: '0 16px 16px' },
  stepFooter: {
    padding: '12px 16px', flexShrink: 0 as const, background: '#fff',
    borderTop: '1px solid #e8ebf2',
  },
  btn: {
    width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
    background: TC, color: '#fff', fontSize: '16px', fontWeight: 700,
    fontFamily: "'Cairo', sans-serif", cursor: 'pointer',
    boxShadow: `0 4px 14px ${TC}55`,
  },
};

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

type Step = 1 | 2 | 3 | 'note-details' | 'positive-details' | 4 | 5 | 'success';
interface SelectedItem { id: number | string; text: string; degree: number; type?: string; }

export default function TeacherFormPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pageData, setPageData] = useState<TeacherPageData | null>(null);
  const [step, setStep] = useState<Step>(1);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [violSubType, setViolSubType] = useState('حضوري');
  const [detectedStage, setDetectedStage] = useState('');
  const [noteSubType, setNoteSubType] = useState('سلبية');
  const [absenceType, setAbsenceType] = useState('');
  const [noteDetails, setNoteDetails] = useState('');
  const [positiveDetails, setPositiveDetails] = useState('');
  const [noAbsence, setNoAbsence] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!token) { setError('الرمز مطلوب'); setLoading(false); return; }
    teacherInputApi.verify(token)
      .then(res => {
        const d = (res.data as any).data || res.data;
        if (!d || !d.t || !d.cl) { setError('البيانات غير مكتملة'); return; }
        setPageData(d);
      })
      .catch(() => setError('رابط غير صالح أو منتهي'))
      .finally(() => setLoading(false));
  }, [token]);

  const classInfo = useCallback((name: string): ClassInfo | undefined => {
    return pageData?.cl.find(c => c.d === name || c.k === name);
  }, [pageData]);

  const students = useMemo((): StudentInfo[] => {
    if (!pageData || !selectedClass) return [];
    return pageData.st[selectedClass] || [];
  }, [pageData, selectedClass]);

  const goBack = useCallback(() => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 'note-details') setStep(3);
    else if (step === 'positive-details') setStep(3);
    else if (step === 4) setStep(selectedType === 'note' ? 'note-details' : selectedType === 'positive' ? 'positive-details' : 3);
    else if (step === 5) setStep(4);
  }, [step, selectedType]);

  const handleSelectClass = (name: string) => {
    setSelectedClass(name);
    setSelectedType(''); setSelectedItem(null); setSelectedStudents([]);
    const ci = classInfo(name);
    setDetectedStage(ci?.s || '');
    setStep(2);
  };

  const handleSelectType = (id: string) => {
    setSelectedType(id); setSelectedItem(null); setViolSubType('حضوري');
    setNoteSubType('سلبية'); setAbsenceType(''); setNoteDetails(''); setPositiveDetails('');
    setNoAbsence(false); setSearchQuery('');
    setStep(3);
  };

  const handleSelectAbsenceType = (t: string) => {
    setAbsenceType(t);
    setSelectedItem({ id: 'absence', text: t === 'حصة' ? 'غياب حصة' : 'غياب يوم كامل', degree: 0 });
    setSelectedStudents([]); setStep(4);
  };

  const handleSelectViolation = (v: ViolationItem) => {
    const ed = effectiveDeg(v, detectedStage);
    setSelectedItem({ id: v.id, text: v.text, degree: ed, type: v.type });
    setSelectedStudents([]); setStep(4);
  };

  const handleSelectNote = (item: NoteItem | PositiveNoteItem) => {
    setSelectedItem({ id: item.id, text: item.text, degree: 0 });
    setStep('note-details');
  };

  const handleSelectPositive = (p: PositiveItem) => {
    setSelectedItem({ id: p.id, text: p.text, degree: p.degree });
    setStep('positive-details');
  };

  const handleConfirmNoteDetails = () => { setSelectedStudents([]); setStep(4); };
  const handleConfirmPositiveDetails = () => { setSelectedStudents([]); setStep(4); };

  const handleToggleStudent = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) setSelectedStudents([]);
    else setSelectedStudents(students.map(s => s.i));
  };

  const handleConfirmNoAbsence = () => {
    setNoAbsence(true); setSelectedStudents([]); setStep(5);
  };

  const handleConfirmStudents = () => {
    if (selectedStudents.length > 0) setStep(5);
  };

  const handleSubmit = async () => {
    if (!pageData) return;
    setSubmitting(true);
    try {
      const ci = classInfo(selectedClass);
      const classSub = ci?.sub || pageData.t.s || '';
      const sd = students.filter(s => selectedStudents.includes(s.i))
        .map(s => ({ id: s.i, name: s.n, phone: s.p }));

      const res = await teacherInputApi.submit({
        token,
        teacherName: pageData.t.n,
        className: selectedClass,
        inputType: selectedType,
        itemId: selectedItem ? String(selectedItem.id) : undefined,
        itemText: selectedItem?.text,
        itemDegree: selectedItem?.degree ? String(selectedItem.degree) : undefined,
        violationType: selectedType === 'violation' ? violSubType : undefined,
        absenceType: absenceType || 'يوم كامل',
        teacherSubject: classSub,
        details: selectedType === 'note' ? noteDetails : selectedType === 'positive' ? positiveDetails : undefined,
        noteClassification: noteSubType || 'سلبي',
        noAbsence,
        notifyDeputy: true,
        students: noAbsence ? [] : sd,
      });
      const d = (res.data as any).data || res.data;
      setSuccessMsg(d.message || 'تم الإرسال بنجاح');
      setStep('success');
    } catch {
      alert('حدث خطأ أثناء الإرسال');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedClass(''); setSelectedType(''); setSelectedItem(null);
    setSelectedStudents([]); setViolSubType('حضوري'); setDetectedStage('');
    setNoteSubType('سلبية'); setAbsenceType(''); setNoteDetails('');
    setPositiveDetails(''); setNoAbsence(false); setSearchQuery('');
    setSubmitting(false); setSuccessMsg('');
    setStep(1);
  };

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════

  if (loading) return (
    <div style={MF.loadingPage}>
      <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#9da3b8' }}>hourglass_empty</span>
      <div style={MF.loadingText}>جاري التحميل...</div>
    </div>
  );

  if (error) return (
    <div style={MF.errorPage}>
      <span className="material-symbols-outlined" style={MF.errorIcon}>error</span>
      <div style={MF.errorTitle}>خطأ</div>
      <div style={MF.errorMsg}>{error}</div>
    </div>
  );

  if (!pageData) return null;

  const deputyLabel = DEPUTY_LABELS[detectedStage] || 'الوكيل';
  const typeLabel = INPUT_TYPES.find(t => t.id === selectedType)?.label || '';
  const stageShort = STAGE_SHORT[detectedStage] || detectedStage;
  const stageFull = STAGE_LABELS[detectedStage] || detectedStage;
  const classGridCols = pageData.cl.length >= 4 ? 'repeat(2, 1fr)' : '1fr';
  const filteredStudents = students.filter(s =>
    !searchQuery || s.n.includes(searchQuery) || s.i.includes(searchQuery)
  );

  return (
    <div style={{ ...MF.page, maxWidth: '480px', margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Accent Strip */}
      <div style={{ ...MF.accentStrip, background: TC }} />

      {/* Header */}
      <div style={{ ...MF.header, flexShrink: 0 }}>
        <div style={{ ...MF.headerRow, maxWidth: 'none' }}>
          <div style={MF.headerInfo}>
            <div style={{ ...MF.headerIcon, background: TB }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: TC }}>school</span>
            </div>
            <div>
              <h1 style={MF.headerTitle}>{pageData.sn || 'نموذج إدخال المعلم'}</h1>
              <div style={MF.headerSub}>{pageData.t.n} — {pageData.t.s}</div>
            </div>
          </div>
          {detectedStage && (
            <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: TB, color: TC }}>
              {detectedStage}
            </span>
          )}
        </div>
      </div>

      {/* Back bar */}
      {step !== 1 && step !== 'success' && (
        <div style={{ padding: '8px 16px', background: '#fff', flexShrink: 0, borderBottom: '1px solid #e8ebf2' }}>
          <button style={{ ...MF.refreshBtn, display: 'inline-flex' }} onClick={goBack}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
            رجوع
          </button>
        </div>
      )}

      {/* Steps Container */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Step 1: Choose Class */}
        <div style={step === 1 ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>1</span> اختر الفصل</div>
            <div style={S.stepSub}>اختر فصلك لبدء الإدخال</div>
          </div>
          <div style={S.stepBody}>
            <div style={{ display: 'grid', gridTemplateColumns: classGridCols, gap: '10px' }}>
              {pageData.cl.map((c, i) => {
                const isActive = selectedClass === (c.d || c.k);
                const color = [TC, '#3b82f6', '#8b5cf6', '#4f46e5', '#667eea'][i % 5];
                return (
                  <div key={c.k} style={{
                    ...MF.card, marginBottom: 0,
                    padding: '20px 12px', textAlign: 'center', cursor: 'pointer',
                    ...(isActive ? { borderColor: TC, background: TB, boxShadow: `0 0 0 3px ${TC}22` } : {}),
                  }} onClick={() => handleSelectClass(c.d || c.k)}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: color + '18', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', margin: '0 auto 10px',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '26px', color }}>{CLASS_ICONS[i % CLASS_ICONS.length]}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1d2e' }}>{c.d}</div>
                  </div>
                );
              })}
              {pageData.cl.length === 0 && <div style={MF.empty}>لا توجد فصول</div>}
            </div>
          </div>
        </div>

        {/* Step 2: Choose Type */}
        <div style={step === 2 ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>2</span> نوع الإدخال</div>
            <div style={S.stepSub}>اختر نوع البيانات التي تريد إدخالها</div>
          </div>
          <div style={S.stepBody}>
            <div style={{ display: 'grid', gap: '10px' }}>
              {INPUT_TYPES.map(t => {
                const isActive = selectedType === t.id;
                return (
                  <div key={t.id} style={{
                    ...MF.card, marginBottom: 0,
                    padding: '16px 20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    ...(isActive ? { borderColor: TC, background: TB, boxShadow: `0 0 0 3px ${TC}22` } : {}),
                  }} onClick={() => handleSelectType(t.id)}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: t.color + '18', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '26px', color: t.color }}>{t.icon}</span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1d2e' }}>{t.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Choose Item */}
        <div style={step === 3 ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>3</span> {
              selectedType === 'absence' ? 'نوع الغياب' :
              selectedType === 'violation' ? 'اختر المخالفة' :
              selectedType === 'note' ? 'اختر نوع الملاحظة' : 'اختر السلوك المتمايز'
            }</div>
          </div>
          <div style={S.stepBody}>
            {/* Absence */}
            {selectedType === 'absence' && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{
                  ...MF.card, marginBottom: 0, padding: '24px 20px',
                  textAlign: 'center', cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center',
                }} onClick={() => handleSelectAbsenceType('يوم كامل')}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: SEC_COLORS.absence + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: SEC_COLORS.absence, fontSize: '24px' }}>event_busy</span>
                  </div>
                  <p style={{ fontWeight: 700, color: '#1a1d2e', marginBottom: '6px' }}>غياب يوم كامل</p>
                  <p style={{ fontSize: '13px', color: '#5c6178' }}>لادخال الغياب الرسمي خلال الحصة الاولى</p>
                </div>
                <div style={{
                  ...MF.card, marginBottom: 0, padding: '24px 20px',
                  textAlign: 'center', cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center',
                }} onClick={() => handleSelectAbsenceType('حصة')}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: SEC_COLORS.absence + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: SEC_COLORS.absence, fontSize: '24px' }}>schedule</span>
                  </div>
                  <p style={{ fontWeight: 700, color: '#1a1d2e', marginBottom: '6px' }}>غياب حصة</p>
                  <p style={{ fontSize: '13px', color: '#5c6178' }}>لادخال غياب الطالب عن حصة معينه</p>
                </div>
              </div>
            )}

            {/* Violations */}
            {selectedType === 'violation' && (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {['حضوري', 'رقمي', 'هيئة تعليمية'].map(t => (
                    <div key={t} style={{
                      ...MF.pill, flex: 1, justifyContent: 'center', flexDirection: 'column',
                      ...(violSubType === t ? { ...MF.pillActive, background: TC } : {}),
                    }} onClick={() => { setViolSubType(t); setSearchQuery(''); }}>
                      {t}
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>
                        {VIOLATIONS.filter(v => v.type === t && isViolAvailable(v, detectedStage)).length}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={MF.searchBox}>
                  <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                  <input style={MF.searchInput} placeholder="ابحث في المخالفات..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <ViolationsList stage={detectedStage} subType={violSubType} query={searchQuery}
                  selectedId={selectedItem?.id} onSelect={handleSelectViolation} />
              </>
            )}

            {/* Notes */}
            {selectedType === 'note' && (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {['سلبية', 'إشادة'].map(t => (
                    <div key={t} style={{
                      ...MF.pill, flex: 1, justifyContent: 'center', flexDirection: 'column',
                      ...(noteSubType === t ? { ...MF.pillActive, background: TC } : {}),
                    }} onClick={() => { setNoteSubType(t); setSearchQuery(''); }}>
                      {t}
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>
                        {t === 'إشادة' ? (POSITIVE_NOTES[detectedStage] || []).length : NOTES.length}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={MF.searchBox}>
                  <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                  <input style={MF.searchInput}
                    placeholder={noteSubType === 'إشادة' ? 'ابحث في الإشادات...' : 'ابحث في الملاحظات السلبية...'}
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <NotesList stage={detectedStage} subType={noteSubType} query={searchQuery}
                  selectedId={selectedItem?.id} onSelect={handleSelectNote} />
              </>
            )}

            {/* Positive */}
            {selectedType === 'positive' && (
              <>
                <div style={MF.searchBox}>
                  <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
                  <input style={MF.searchInput} placeholder="ابحث في السلوك المتمايز..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <PositiveList query={searchQuery} selectedId={selectedItem?.id}
                  onSelect={handleSelectPositive} />
              </>
            )}
          </div>
        </div>

        {/* Step 3b: Note details */}
        <div style={step === 'note-details' ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>3ب</span> تفاصيل إضافية لولي الأمر (اختياري)</div>
            <div style={S.stepSub}>أضف أي تفاصيل تريد إرسالها لولي الأمر، أو اضغط التالي للمتابعة بدون تفاصيل</div>
          </div>
          <div style={{ ...S.stepBody, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <textarea style={{ ...MF.textarea, minHeight: '180px' }} placeholder="أضف أي تفاصيل تريد إرسالها لولي الأمر..."
              value={noteDetails} onChange={e => setNoteDetails(e.target.value)} />
          </div>
          <div style={S.stepFooter}>
            <button style={S.btn} onClick={handleConfirmNoteDetails}>التالي</button>
          </div>
        </div>

        {/* Step 3b: Positive details */}
        <div style={step === 'positive-details' ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>3ب</span> تفاصيل إضافية (اختياري)</div>
            <div style={S.stepSub}>أضف تفاصيل أو اكتب سلوكاً متمايزاً مخصصاً، أو اضغط التالي للمتابعة</div>
          </div>
          <div style={{ ...S.stepBody, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <textarea style={{ ...MF.textarea, minHeight: '180px' }} placeholder="أضف تفاصيل أو اكتب سلوكاً متمايزاً لم يكن في القائمة..."
              value={positiveDetails} onChange={e => setPositiveDetails(e.target.value)} />
          </div>
          <div style={S.stepFooter}>
            <button style={S.btn} onClick={handleConfirmPositiveDetails}>التالي</button>
          </div>
        </div>

        {/* Step 4: Select Students */}
        <div style={step === 4 ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}>
              <span style={S.stepNum}>4</span> اختر الطلاب
              <span style={{ marginRight: 'auto', fontSize: '13px', color: '#5c6178', fontWeight: 500 }}>({students.length} طالب)</span>
            </div>
          </div>
          <div style={S.stepBody}>
            {selectedType === 'absence' && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                padding: '14px', background: '#f0fdf4', border: '1.5px solid #86efac',
                borderRadius: '12px', cursor: 'pointer', marginBottom: '12px',
              }} onClick={handleConfirmNoAbsence}>
                <span className="material-symbols-outlined" style={{ color: '#22c55e', fontSize: '24px' }}>check_circle</span>
                <span style={{ fontWeight: 800, color: '#166534', fontSize: '15px' }}>لا يوجد غائب</span>
              </div>
            )}

            <div style={MF.searchBox}>
              <span className="material-symbols-outlined" style={MF.searchIcon}>search</span>
              <input style={MF.searchInput} placeholder="ابحث عن طالب..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: '#fff', borderRadius: '8px',
              marginBottom: '10px', border: '1px solid #e8ebf2',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>
                <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: TC, cursor: 'pointer' }}
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={handleSelectAll} />
                تحديد الكل
              </label>
              <span style={{ fontSize: '14px', color: TC, fontWeight: 700 }}>{selectedStudents.length} محدد</span>
            </div>

            <div>
              {filteredStudents.map(s => {
                const sel = selectedStudents.includes(s.i);
                return (
                  <div key={s.i} style={{
                    ...MF.studentItem, gap: '12px',
                    ...(sel ? { borderRight: `4px solid ${TC}`, background: TB } : {}),
                  }} onClick={() => handleToggleStudent(s.i)}>
                    <div style={{
                      width: '40px', height: '40px', background: TB, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: TC }}>person</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: '#1a1d2e', fontSize: '14px', margin: 0 }}>{s.n}</p>
                      <p style={{ fontSize: '12px', color: '#9da3b8', margin: 0 }}>{s.i}</p>
                    </div>
                    <div style={{
                      ...MF.checkbox, borderRadius: '50%',
                      ...(sel ? { ...MF.checkboxOn, background: TC } : {}),
                    }}>
                      {sel && <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#fff' }}>check</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={S.stepFooter}>
            <button style={{ ...S.btn, opacity: selectedStudents.length === 0 ? 0.5 : 1 }}
              disabled={selectedStudents.length === 0}
              onClick={handleConfirmStudents}>
              تأكيد الاختيار ({selectedStudents.length})
            </button>
          </div>
        </div>

        {/* Step 5: Summary & Submit */}
        <div style={step === 5 ? S.stepActive : S.step}>
          <div style={S.stepHead}>
            <div style={S.stepTitle}><span style={S.stepNum}>5</span> ملخص وإرسال</div>
          </div>
          <div style={{ ...S.stepBody, display: 'flex', flexDirection: 'column' }}>
            <div style={{ ...MF.card, padding: '16px', marginBottom: '16px' }}>
              {noAbsence ? (
                <>
                  <SummaryRow label="الحالة" value={<><span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</span> لا يوجد غائب</>} valueColor="#22c55e" />
                  <SummaryRow label="الفصل" value={selectedClass} />
                  <SummaryRow label="المرحلة" value={stageShort} />
                </>
              ) : (
                <>
                  <SummaryRow label="النوع" value={typeLabel} />
                  {selectedItem?.text && <SummaryRow label="التفاصيل" value={selectedItem.text} />}
                  {selectedItem?.degree ? <SummaryRow label="الدرجة" value={String(selectedItem.degree)} /> : null}
                  {selectedType === 'violation' && <SummaryRow label="نوع المخالفة" value={violSubType} />}
                  {selectedType === 'absence' && absenceType && <SummaryRow label="نوع الغياب" value={absenceType} />}
                  {selectedType === 'note' && <SummaryRow label="التصنيف" value={noteSubType} />}
                  {selectedType === 'note' && noteDetails && <SummaryRow label="التفاصيل الإضافية" value={noteDetails} />}
                  {selectedType === 'positive' && positiveDetails && <SummaryRow label="التفاصيل الإضافية" value={positiveDetails} />}
                  <SummaryRow label="الفصل" value={selectedClass} />
                  <SummaryRow label="المرحلة" value={stageFull} />
                  <SummaryRow label="عدد الطلاب" value={String(selectedStudents.length)} valueColor={TC} />
                </>
              )}
            </div>
            <button style={{ ...S.btn, opacity: submitting ? 0.5 : 1 }} disabled={submitting}
              onClick={handleSubmit}>
              {submitting ? (
                <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '20px', verticalAlign: 'middle' }}>sync</span> جاري الإرسال...</>
              ) : `إرسال إلى ${deputyLabel}`}
            </button>
          </div>
        </div>

        {/* Success */}
        <div style={step === 'success' ? S.stepActive : S.step}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '100%', padding: '32px 16px',
            textAlign: 'center', overflowY: 'auto',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%', background: TB,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', color: TC }}>check_circle</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1d2e', marginBottom: '8px' }}>تم الإرسال بنجاح!</h2>
            <p style={{ color: '#5c6178', marginBottom: '16px', fontSize: '14px' }}>{successMsg || 'تم إرسال البيانات للوكيل'}</p>
            <div style={{ ...MF.card, padding: '16px', width: '100%' }}>
              {noAbsence ? (
                <>
                  <SummaryRow label="الحالة" value={<><span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</span> لا يوجد غائب</>} valueColor="#22c55e" />
                  <SummaryRow label="الفصل" value={selectedClass} />
                  <SummaryRow label="المرحلة" value={stageShort} />
                </>
              ) : (
                <>
                  <SummaryRow label="النوع" value={typeLabel} />
                  <SummaryRow label="الفصل" value={selectedClass} />
                  <SummaryRow label="المرحلة" value={stageShort} />
                  <SummaryRow label="عدد الطلاب" value={String(selectedStudents.length)} valueColor={TC} />
                </>
              )}
            </div>
            <div style={{ width: '100%', flexShrink: 0, marginTop: '12px' }}>
              <button style={S.btn} onClick={resetForm}>إدخال مرة أخرى</button>
              <button style={{
                width: '100%', padding: '14px', border: '1.5px solid #ef4444',
                borderRadius: '12px', background: '#fef2f2', color: '#ef4444',
                fontSize: '15px', fontWeight: 700, fontFamily: "'Cairo', sans-serif",
                cursor: 'pointer', marginTop: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              }} onClick={() => {
                try { window.close(); } catch {}
                document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;font-family:Cairo,sans-serif;direction:rtl"><div style="width:80px;height:80px;background:#fef2f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><span class="material-symbols-outlined" style="font-size:40px;color:#dc2626">logout</span></div><h2 style="font-size:20px;font-weight:800;color:#1f2937;margin-bottom:8px">تم الخروج</h2><p style="color:#6b7280">يمكنك إغلاق هذه النافذة يدوياً</p></div>';
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                خروج
              </button>
            </div>
          </div>
        </div>

      </div>{/* end steps-container */}
    </div>
  );
}

// ═══════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════

function SummaryRow({ label, value, valueColor }: { label: string; value: string | React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '15px', borderBottom: '1px solid #e8ebf2' }}>
      <span style={{ color: '#5c6178' }}>{label}:</span>
      <span style={{ fontWeight: 700, color: valueColor || '#1a1d2e', fontSize: '13px' }}>{value}</span>
    </div>
  );
}

function ViolationsList({ stage, subType, query, selectedId, onSelect }: {
  stage: string; subType: string; query: string;
  selectedId?: number | string; onSelect: (v: ViolationItem) => void;
}) {
  const items = VIOLATIONS.filter(v =>
    v.type === subType && isViolAvailable(v, stage) &&
    (!query || v.text.includes(query))
  );

  const groups: Record<number, ViolationItem[]> = {};
  items.forEach(v => {
    const d = effectiveDeg(v, stage);
    if (!groups[d]) groups[d] = [];
    groups[d].push(v);
  });

  return (
    <div>
      {[1, 2, 3, 4, 5].map(deg => {
        if (!groups[deg]) return null;
        return (
          <div key={deg} style={{ marginBottom: '8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', marginBottom: '6px',
              background: DEGREE_COLORS[deg], color: DEGREE_TEXT[deg],
            }}>
              الدرجة {DEGREE_LABELS[deg]} ({groups[deg].length})
            </div>
            {groups[deg].map(v => {
              const ed = effectiveDeg(v, stage);
              const sel = selectedId === v.id;
              return (
                <div key={v.id} style={{
                  ...MF.card, marginBottom: '8px',
                  padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                  ...(sel ? { borderColor: TC, background: TB } : {}),
                }} onClick={() => onSelect(v)}>
                  <p style={{ fontWeight: 600, color: '#1a1d2e', fontSize: '13px', flex: 1, margin: 0 }}>{v.text}</p>
                  <span style={{
                    ...MF.degreeBadge,
                    background: DEGREE_COLORS[ed], color: DEGREE_TEXT[ed],
                  }}>{ed}</span>
                </div>
              );
            })}
          </div>
        );
      })}
      {items.length === 0 && <div style={MF.empty}>لا توجد نتائج</div>}
    </div>
  );
}

function NotesList({ stage, subType, query, selectedId, onSelect }: {
  stage: string; subType: string; query: string;
  selectedId?: number | string; onSelect: (n: NoteItem | PositiveNoteItem) => void;
}) {
  const items = subType === 'إشادة'
    ? (POSITIVE_NOTES[stage] || []).filter(n => !query || n.text.includes(query))
    : NOTES.filter(n => !query || n.text.includes(query));

  return (
    <div>
      {items.map(n => {
        const sel = selectedId === n.id;
        return (
          <div key={n.id} style={{
            ...MF.card, marginBottom: '8px',
            padding: '14px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            ...(sel ? { borderColor: TC, background: TB } : {}),
          }} onClick={() => onSelect(n)}>
            <p style={{ fontWeight: 600, color: '#1a1d2e', fontSize: '13px', flex: 1, margin: 0 }}>{n.text}</p>
            <span style={{
              ...MF.degreeBadge,
              background: subType === 'إشادة' ? '#bbf7d0' : '#fecaca',
              color: subType === 'إشادة' ? '#16a34a' : '#dc2626',
              border: `1px solid ${subType === 'إشادة' ? '#86efac' : '#fca5a5'}`,
            }}>{subType === 'إشادة' ? 'إشادة' : 'سلبية'}</span>
          </div>
        );
      })}
      {items.length === 0 && <div style={MF.empty}>لا توجد نتائج</div>}
    </div>
  );
}

function PositiveList({ query, selectedId, onSelect }: {
  query: string; selectedId?: number | string; onSelect: (p: PositiveItem) => void;
}) {
  const gColors: Record<number, string> = { 6: '#d1fae5', 4: '#fef3c7', 2: '#dbeafe' };
  const gText: Record<number, string> = { 6: '#065f46', 4: '#92400e', 2: '#1e40af' };

  const items = POSITIVE.filter(p => !query || p.text.includes(query));

  return (
    <div>
      {items.map(p => {
        const sel = selectedId === p.id;
        return (
          <div key={p.id} style={{
            ...MF.card, marginBottom: '8px',
            padding: '14px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
            ...(sel ? { borderColor: TC, background: TB } : {}),
          }} onClick={() => onSelect(p)}>
            <p style={{ fontWeight: 600, color: '#1a1d2e', fontSize: '13px', flex: 1, margin: 0 }}>{p.text}</p>
            <span style={{
              ...MF.degreeBadge,
              background: gColors[p.degree] || '#d1fae5',
              color: gText[p.degree] || '#065f46',
              border: `1px solid ${(gText[p.degree] || '#065f46') + '33'}`,
            }}>{p.degree}</span>
          </div>
        );
      })}
      {items.length === 0 && <div style={MF.empty}>لا توجد نتائج</div>}
    </div>
  );
}
