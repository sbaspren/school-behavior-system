import React, { useState, useEffect, useRef, useCallback } from 'react';
import { committeesApi, CommitteeMeeting, MeetingDto } from '../../api/committees';
import { getMeetingTemplate, MeetingTemplate } from '../../utils/meetingTemplates';
import { showSuccess, showError } from '../../components/shared/Toast';
import MI from '../../components/shared/MI';
import { toIndic } from '../../utils/printUtils';

interface MeetingModalProps {
  committeeId: number;
  committeeType: string;
  committeeName: string;
  meeting?: CommitteeMeeting | null;
  onClose: () => void;
  onSaved: () => void;
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

const sectionHeader: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: '#1B3A6B', marginBottom: 8,
  borderRight: '3px solid #1B3A6B', paddingRight: 8,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 13, boxSizing: 'border-box',
};
const btnBase: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', border: 'none',
};

interface CheckItem { text: string; checked: boolean; isCustom: boolean; }

function parseJsonItems(json: string | undefined): CheckItem[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return (arr as string[]).map(t => ({ text: t, checked: true, isCustom: false }));
  } catch { return []; }
}

function mergeTemplateItems(templateItems: string[], existing: CheckItem[]): CheckItem[] {
  const existingTexts = new Set(existing.map(e => e.text));
  const fromTemplate: CheckItem[] = templateItems.map(t => ({
    text: t, checked: existingTexts.has(t) || existing.length === 0, isCustom: false,
  }));
  const customs = existing.filter(e => !templateItems.includes(e.text)).map(e => ({ ...e, isCustom: true }));
  return [...fromTemplate, ...customs];
}

const DRAFT_KEY = (id: number) => `meeting_draft_${id}`;

const MeetingModal: React.FC<MeetingModalProps> = ({
  committeeId, committeeType, committeeName, meeting, onClose, onSaved,
}) => {
  const isEdit = !!meeting;

  const [meetingNumber, setMeetingNumber] = useState<number>(meeting?.meetingNumber ?? 0);
  const [template, setTemplate] = useState<MeetingTemplate | undefined>(undefined);

  const [hijriDate, setHijriDate] = useState(meeting?.hijriDate ?? '');
  const [dayName, setDayName] = useState(meeting?.dayName ?? DAYS[0]);
  const [startTime, setStartTime] = useState(meeting?.startTime ?? '');
  const [endTime, setEndTime] = useState(meeting?.endTime ?? '');
  const [location, setLocation] = useState(meeting?.location ?? 'المدرسة');

  const [goals, setGoals] = useState<CheckItem[]>([]);
  const [agenda, setAgenda] = useState<CheckItem[]>([]);
  const [decisions, setDecisions] = useState<CheckItem[]>([]);
  const [notes, setNotes] = useState(meeting?.notes ?? '');

  const [saving, setSaving] = useState(false);
  const [customGoal, setCustomGoal] = useState('');
  const [customAgenda, setCustomAgenda] = useState('');
  const [customDecision, setCustomDecision] = useState('');

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Draft restore on mount ---
  useEffect(() => {
    if (isEdit) return;
    const raw = localStorage.getItem(DRAFT_KEY(committeeId));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (window.confirm('يوجد مسودة محفوظة سابقاً، هل ترغب في استعادتها؟')) {
        setMeetingNumber(draft.meetingNumber ?? 0);
        setHijriDate(draft.hijriDate ?? '');
        setDayName(draft.dayName ?? DAYS[0]);
        setStartTime(draft.startTime ?? '');
        setEndTime(draft.endTime ?? '');
        setLocation(draft.location ?? 'المدرسة');
        setGoals(draft.goals ?? []);
        setAgenda(draft.agenda ?? []);
        setDecisions(draft.decisions ?? []);
        setNotes(draft.notes ?? '');
        if (draft.meetingNumber) {
          setTemplate(getMeetingTemplate(committeeType, draft.meetingNumber));
        }
      } else {
        localStorage.removeItem(DRAFT_KEY(committeeId));
      }
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Edit mode: pre-fill from meeting prop ---
  useEffect(() => {
    if (!meeting) return;
    const tpl = getMeetingTemplate(committeeType, meeting.meetingNumber);
    setTemplate(tpl);
    const tplGoals = tpl?.suggestedGoals ?? [];
    const tplAgenda = tpl?.suggestedAgenda ?? [];
    const tplDecisions = tpl?.suggestedDecisions ?? [];
    setGoals(mergeTemplateItems(tplGoals, parseJsonItems(meeting.goalsJson)));
    setAgenda(mergeTemplateItems(tplAgenda, parseJsonItems(meeting.agendaJson)));
    setDecisions(mergeTemplateItems(tplDecisions, parseJsonItems(meeting.decisionsJson)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  // --- Auto-save every 30s ---
  const getDraftData = useCallback(() => ({
    meetingNumber, hijriDate, dayName, startTime, endTime, location,
    goals, agenda, decisions, notes,
  }), [meetingNumber, hijriDate, dayName, startTime, endTime, location, goals, agenda, decisions, notes]);

  useEffect(() => {
    if (isEdit) return;
    autoSaveRef.current = setInterval(() => {
      localStorage.setItem(DRAFT_KEY(committeeId), JSON.stringify(getDraftData()));
    }, 30_000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [isEdit, committeeId, getDraftData]);

  // --- Meeting number selection ---
  const handlePickNumber = (n: number) => {
    setMeetingNumber(n);
    const tpl = getMeetingTemplate(committeeType, n);
    setTemplate(tpl);
    if (tpl) {
      setGoals(tpl.suggestedGoals.map(t => ({ text: t, checked: true, isCustom: false })));
      setAgenda(tpl.suggestedAgenda.map(t => ({ text: t, checked: true, isCustom: false })));
      setDecisions(tpl.suggestedDecisions.map(t => ({ text: t, checked: true, isCustom: false })));
    }
  };

  // --- Toggle / add / remove helpers ---
  const toggle = (arr: CheckItem[], idx: number, setter: React.Dispatch<React.SetStateAction<CheckItem[]>>) => {
    const copy = [...arr];
    copy[idx] = { ...copy[idx], checked: !copy[idx].checked };
    setter(copy);
  };

  const addCustom = (text: string, setter: React.Dispatch<React.SetStateAction<CheckItem[]>>, clearInput: () => void) => {
    if (!text.trim()) return;
    setter(prev => [...prev, { text: text.trim(), checked: true, isCustom: true }]);
    clearInput();
  };

  const removeCustom = (idx: number, setter: React.Dispatch<React.SetStateAction<CheckItem[]>>) => {
    setter(prev => prev.filter((_, i) => i !== idx));
  };

  // --- Save ---
  const handleSave = async (status: 'Draft' | 'Final') => {
    if (!meetingNumber) { showError('اختر رقم الاجتماع'); return; }
    setSaving(true);
    try {
      const checkedTexts = (items: CheckItem[]) =>
        JSON.stringify(items.filter(i => i.checked).map(i => i.text));

      const dto: MeetingDto = {
        meetingNumber,
        hijriDate: hijriDate || undefined,
        dayName,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        location,
        goalsJson: checkedTexts(goals),
        agendaJson: checkedTexts(agenda),
        decisionsJson: checkedTexts(decisions),
        notes: notes || undefined,
        status,
      };

      if (isEdit && meeting) {
        await committeesApi.updateMeeting(committeeId, meeting.id, dto);
      } else {
        await committeesApi.createMeeting(committeeId, dto);
        localStorage.removeItem(DRAFT_KEY(committeeId));
      }
      showSuccess(status === 'Draft' ? 'تم حفظ المسودة' : 'تم حفظ واعتماد الاجتماع');
      onSaved();
    } catch {
      showError('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  // --- Render checklist section ---
  const renderChecklist = (
    label: string,
    items: CheckItem[],
    setter: React.Dispatch<React.SetStateAction<CheckItem[]>>,
    customValue: string,
    setCustomValue: React.Dispatch<React.SetStateAction<string>>,
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={sectionHeader}>{label}</div>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: 1.8 }}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => toggle(items, idx, setter)}
            style={{ accentColor: '#1B3A6B' }}
          />
          <span style={{ flex: 1, opacity: item.checked ? 1 : 0.5 }}>{item.text}</span>
          {item.isCustom && (
            <button
              onClick={() => removeCustom(idx, setter)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
            >
              <MI n="close" s={14} />
            </button>
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={customValue}
          onChange={e => setCustomValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addCustom(customValue, setter, () => setCustomValue('')); }}
          placeholder="إضافة عنصر..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => addCustom(customValue, setter, () => setCustomValue(''))}
          style={{ ...btnBase, background: '#f3f4f6', color: '#1B3A6B', fontSize: 13, whiteSpace: 'nowrap' }}
        >
          <MI n="add" s={14} /> إضافة
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 700, maxHeight: '90vh', overflowY: 'auto',
          background: '#fff', borderRadius: 12, padding: 24, position: 'relative',
          direction: 'rtl',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1B3A6B' }}>
            {committeeName} — {isEdit ? 'تعديل الاجتماع' : 'اجتماع جديد'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#64748b' }}
          >
            <MI n="close" s={22} />
          </button>
        </div>

        {/* Step 1: Meeting number selection (create only) */}
        {!isEdit && (
          <div style={{ marginBottom: 20 }}>
            <div style={sectionHeader}>رقم الاجتماع</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => handlePickNumber(n)}
                  style={{
                    ...btnBase,
                    width: 48, height: 48, fontSize: 18,
                    background: meetingNumber === n ? '#1B3A6B' : '#f3f4f6',
                    color: meetingNumber === n ? '#fff' : '#1B3A6B',
                    border: meetingNumber === n ? 'none' : '1px solid #d1d5db',
                  }}
                >
                  {toIndic(n)}
                </button>
              ))}
            </div>
            {template && (
              <div style={{ marginTop: 10, padding: 12, background: '#f0f7ff', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#1B3A6B' }}>{template.title}</div>
                <div style={{ color: '#64748b' }}>
                  <MI n="schedule" s={14} /> التوقيت المقترح: {template.suggestedTiming}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Meeting details */}
        {(isEdit || meetingNumber > 0) && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={sectionHeader}>بيانات الاجتماع</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>التاريخ الهجري</label>
                  <input value={hijriDate} onChange={e => setHijriDate(e.target.value)} placeholder="مثال: ١٤٤٦/١٠/١٥" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>اليوم</label>
                  <select value={dayName} onChange={e => setDayName(e.target.value)} style={inputStyle}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>الوقت من</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>الوقت إلى</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', marginBottom: 4, display: 'block' }}>مكان الاجتماع</label>
                <input value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
              </div>
            </div>

            {/* Step 3: Goals */}
            {renderChecklist('أهداف الاجتماع', goals, setGoals, customGoal, setCustomGoal)}

            {/* Step 4: Agenda */}
            {renderChecklist('بنود الاجتماع', agenda, setAgenda, customAgenda, setCustomAgenda)}

            {/* Step 5: Decisions */}
            {renderChecklist('القرارات والتوصيات', decisions, setDecisions, customDecision, setCustomDecision)}

            {/* Step 6: Notes */}
            <div style={{ marginBottom: 20 }}>
              <div style={sectionHeader}>ملاحظات إضافية</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="ملاحظات اختيارية..."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-start', borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
              <button
                disabled={saving}
                onClick={() => handleSave('Final')}
                style={{ ...btnBase, background: '#1B3A6B', color: '#fff' }}
              >
                {saving ? 'جاري الحفظ...' : 'حفظ واعتماد'}
              </button>
              <button
                disabled={saving}
                onClick={() => handleSave('Draft')}
                style={{ ...btnBase, background: '#9ca3af', color: '#fff' }}
              >
                حفظ كمسودة
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MeetingModal;
