import React, { useEffect, useState, useCallback } from 'react';
import { committeesApi, CommitteeSummary, CommitteeMember, CommitteeMeeting } from '../../api/committees';
import { showSuccess, showError } from '../../components/shared/Toast';
import MI from '../../components/shared/MI';
import MeetingModal from './MeetingModal';

/* ── colour map per committee type ── */
const borderColors: Record<string, string> = {
  Discipline: '#1B3A6B',
  Guidance: '#1A6B3C',
  Academic: '#C05B00',
};

const emptyMember = { personName: '', personRole: 'عضو', jobTitle: '' };

/* ════════════════════════════════════════════════════════════════ */
export default function CommitteesTab() {
  const [committees, setCommittees] = useState<CommitteeSummary[]>([]);
  const [meetings, setMeetings] = useState<Record<number, CommitteeMeeting[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCommittee, setExpandedCommittee] = useState<number | null>(null);

  /* members editing */
  const [editingMembers, setEditingMembers] = useState<number | null>(null);
  const [memberDraft, setMemberDraft] = useState<CommitteeMember[]>([]);
  const [newMember, setNewMember] = useState({ ...emptyMember });

  /* meeting modal */
  const [meetingModal, setMeetingModal] = useState<{
    open: boolean;
    committeeId: number;
    committeeType: string;
    committeeName: string;
    meeting?: CommitteeMeeting | null;
  } | null>(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data: CommitteeSummary[] = await committeesApi.getAll();
      setCommittees(data);
    } catch {
      showError('فشل تحميل اللجان');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMeetings = useCallback(async (committeeId: number) => {
    try {
      const data: CommitteeMeeting[] = await committeesApi.getMeetings(committeeId);
      setMeetings(prev => ({ ...prev, [committeeId]: data }));
    } catch {
      showError('فشل تحميل الاجتماعات');
    }
  }, []);

  /* ── expand / collapse ── */
  const toggleExpand = (id: number) => {
    if (expandedCommittee === id) {
      setExpandedCommittee(null);
    } else {
      setExpandedCommittee(id);
      if (!meetings[id]) loadMeetings(id);
    }
  };

  /* ── members ── */
  const startEditMembers = (c: CommitteeSummary) => {
    setEditingMembers(c.id);
    setMemberDraft([...c.members]);
    setNewMember({ ...emptyMember });
  };

  const cancelEditMembers = () => {
    setEditingMembers(null);
    setMemberDraft([]);
  };

  const removeMember = (idx: number) => {
    setMemberDraft(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMemberField = (idx: number, field: keyof CommitteeMember, value: string) => {
    setMemberDraft(prev => prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)));
  };

  const addMember = () => {
    if (!newMember.personName.trim()) return;
    setMemberDraft(prev => [
      ...prev,
      { id: 0, personName: newMember.personName, personRole: newMember.personRole, jobTitle: newMember.jobTitle, sortOrder: prev.length + 1 },
    ]);
    setNewMember({ ...emptyMember });
  };

  const saveMembers = async () => {
    if (editingMembers == null) return;
    try {
      await committeesApi.updateMembers(
        editingMembers,
        memberDraft.map(m => ({ personName: m.personName, personRole: m.personRole, jobTitle: m.jobTitle })),
      );
      showSuccess('تم حفظ الأعضاء');
      cancelEditMembers();
      load();
    } catch {
      showError('فشل حفظ الأعضاء');
    }
  };

  /* ── meeting actions ── */
  const openMeetingModal = (committee: CommitteeSummary, meeting?: CommitteeMeeting | null) => {
    setMeetingModal({ open: true, committeeId: committee.id, committeeType: committee.committeeType, committeeName: committee.name, meeting });
  };

  const handleDeleteMeeting = async (committeeId: number, meetingId: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الاجتماع؟')) return;
    try {
      await committeesApi.deleteMeeting(committeeId, meetingId);
      showSuccess('تم حذف الاجتماع');
      loadMeetings(committeeId);
      load();
    } catch {
      showError('فشل حذف الاجتماع');
    }
  };

  const handlePrint = (meetingId: number) => {
    console.log('Print meeting', meetingId);
  };

  /* ── status badge ── */
  const statusBadge = (status: string) => {
    const isDraft = status === 'Draft';
    return (
      <span style={{
        display: 'inline-block', fontSize: 12, padding: '2px 10px', borderRadius: 8,
        background: isDraft ? '#FFF3E0' : '#E8F5E9',
        color: isDraft ? '#E65100' : '#2E7D32',
        fontWeight: 600,
      }}>
        {isDraft ? 'مسودة' : 'نهائي'}
      </span>
    );
  };

  /* ── count badge ── */
  const countBadge = (label: string, count: number, bg: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 13, padding: '2px 10px', borderRadius: 8,
      background: bg, color: '#fff', fontWeight: 500,
    }}>
      {label} {count}
    </span>
  );

  /* ── small action button ── */
  const actionBtn = (icon: string, label: string, onClick: () => void, color = '#555') => (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'none', border: '1px solid #ddd', borderRadius: 6,
        padding: '4px 10px', cursor: 'pointer', fontSize: 13, color,
      }}
    >
      <MI n={icon} s={16} c={color} /> {label}
    </button>
  );

  /* ════════════════════════  RENDER  ════════════════════════════ */

  if (loading && committees.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>جاري التحميل...</div>;
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {committees.map(c => {
        const borderColor = borderColors[c.committeeType] || '#1B3A6B';
        const isExpanded = expandedCommittee === c.id;
        const cmeetings = meetings[c.id] || [];
        const isEditingThis = editingMembers === c.id;

        return (
          <div
            key={c.id}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 6px rgba(0,0,0,.08)',
              padding: 20,
              marginBottom: 16,
              borderRight: `4px solid ${borderColor}`,
            }}
          >
            {/* ── header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1B3A6B' }}>{c.name}</span>
                {countBadge('أعضاء', c.membersCount, '#546E7A')}
                {countBadge('اجتماعات', c.meetingsCount, '#6D4C41')}
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>
                {c.lastMeeting
                  ? <>آخر اجتماع: رقم {c.lastMeeting.meetingNumber} - {c.lastMeeting.hijriDate}</>
                  : 'لا يوجد اجتماعات'}
              </div>
            </div>

            {/* ── action buttons ── */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => (isEditingThis ? cancelEditMembers() : startEditMembers(c))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: isEditingThis ? '#f5f5f5' : '#EEF2F7', border: '1px solid #ccc',
                  borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                  fontSize: 14, color: '#1B3A6B', fontWeight: 500,
                }}
              >
                <MI n="group" s={18} c="#1B3A6B" />
                {isEditingThis ? 'إلغاء' : 'إدارة الأعضاء'}
              </button>

              <button
                onClick={() => openMeetingModal(c)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#EEF2F7', border: '1px solid #ccc',
                  borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                  fontSize: 14, color: '#1B3A6B', fontWeight: 500,
                }}
              >
                <MI n="add" s={18} c="#1B3A6B" />
                اجتماع جديد
              </button>

              <button
                onClick={() => toggleExpand(c.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'none', border: '1px solid #ddd',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 13, color: '#888',
                }}
              >
                <MI n={isExpanded ? 'expand_less' : 'expand_more'} s={18} c="#888" />
                {isExpanded ? 'إخفاء الاجتماعات' : 'عرض الاجتماعات'}
              </button>
            </div>

            {/* ── members editing panel ── */}
            {isEditingThis && (
              <div style={{ marginTop: 16, background: '#FAFBFC', borderRadius: 8, padding: 16, border: '1px solid #e0e0e0' }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1B3A6B', marginBottom: 12 }}>أعضاء اللجنة</div>

                {memberDraft.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <input
                      value={m.personName}
                      onChange={e => updateMemberField(idx, 'personName', e.target.value)}
                      placeholder="الاسم"
                      style={{ flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 120 }}
                    />
                    <select
                      value={m.personRole}
                      onChange={e => updateMemberField(idx, 'personRole', e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 100 }}
                    >
                      <option value="الرئيس">الرئيس</option>
                      <option value="أمين السر">أمين السر</option>
                      <option value="عضو">عضو</option>
                    </select>
                    <input
                      value={m.jobTitle}
                      onChange={e => updateMemberField(idx, 'jobTitle', e.target.value)}
                      placeholder="المسمى الوظيفي"
                      style={{ flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 120 }}
                    />
                    <button onClick={() => removeMember(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <MI n="delete" s={18} c="#C62828" />
                    </button>
                  </div>
                ))}

                {/* add new member row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px dashed #ccc' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>إضافة عضو:</span>
                  <input
                    value={newMember.personName}
                    onChange={e => setNewMember(p => ({ ...p, personName: e.target.value }))}
                    placeholder="الاسم"
                    style={{ flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 120 }}
                  />
                  <select
                    value={newMember.personRole}
                    onChange={e => setNewMember(p => ({ ...p, personRole: e.target.value }))}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 100 }}
                  >
                    <option value="الرئيس">الرئيس</option>
                    <option value="أمين السر">أمين السر</option>
                    <option value="عضو">عضو</option>
                  </select>
                  <input
                    value={newMember.jobTitle}
                    onChange={e => setNewMember(p => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="المسمى الوظيفي"
                    style={{ flex: 2, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, minWidth: 120 }}
                  />
                  <button
                    onClick={addMember}
                    style={{
                      background: '#1B3A6B', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <MI n="add" s={16} c="#fff" /> إضافة
                  </button>
                </div>

                {/* save */}
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button
                    onClick={cancelEditMembers}
                    style={{ padding: '6px 20px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 }}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={saveMembers}
                    style={{
                      padding: '6px 20px', borderRadius: 6, border: 'none',
                      background: '#1B3A6B', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    }}
                  >
                    حفظ الأعضاء
                  </button>
                </div>
              </div>
            )}

            {/* ── meetings list ── */}
            {isExpanded && (
              <div style={{ marginTop: 16 }}>
                {cmeetings.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 16, color: '#999', fontSize: 13 }}>لا يوجد اجتماعات مسجلة</div>
                )}
                {cmeetings.map(mt => (
                  <div
                    key={mt.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 8,
                      padding: '10px 14px', marginBottom: 6,
                      background: '#FAFBFC', borderRadius: 8, border: '1px solid #eee',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>اجتماع {mt.meetingNumber}</span>
                      <span style={{ fontSize: 13, color: '#777' }}>{mt.hijriDate}</span>
                      {statusBadge(mt.status)}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {actionBtn('visibility', 'عرض', () => openMeetingModal(c, mt))}
                      {actionBtn('print', 'طباعة', () => handlePrint(mt.id))}
                      {actionBtn('edit', 'تعديل', () => openMeetingModal(c, mt), '#1B3A6B')}
                      {actionBtn('delete', 'حذف', () => handleDeleteMeeting(c.id, mt.id), '#C62828')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── meeting modal ── */}
      {meetingModal?.open && (
        <MeetingModal
          committeeId={meetingModal.committeeId}
          committeeType={meetingModal.committeeType}
          committeeName={meetingModal.committeeName}
          meeting={meetingModal.meeting}
          onClose={() => setMeetingModal(null)}
          onSaved={() => { setMeetingModal(null); load(); if (meetingModal.committeeId) loadMeetings(meetingModal.committeeId); }}
        />
      )}
    </div>
  );
}
