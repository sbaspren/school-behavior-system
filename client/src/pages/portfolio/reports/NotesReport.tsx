import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { educationalNotesApi } from '../../../api/educationalNotes';
import { useAppContext } from '../../../hooks/useAppContext';
import { toIndic } from '../../../utils/printUtils';
import { printPortfolioReport } from '../../../utils/print/portfolio';
import MI from '../../../components/shared/MI';
import type { NoteRow } from '../../../types';

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };

const NotesReport: React.FC = () => {
  const { activeStage: stage, schoolSettings } = useAppContext();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage || undefined;
      const res = await educationalNotesApi.getAll({ stage: s });
      setRows(res.data?.data || res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.length;
  const positive = useMemo(() => rows.filter(r => r.noteType === 'إيجابية' || r.noteType === 'positive').length, [rows]);
  const negative = total - positive;

  // By teacher
  const byTeacher = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const t = r.teacherName || 'غير محدد';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([t, c]) => ({ teacher: t, count: c })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const maxTeacher = Math.max(1, ...byTeacher.map(t => t.count));

  const handlePrint = () => {
    printPortfolioReport({
      title: 'تقرير الملاحظات التربوية',
      subtitle: 'ملف إنجاز وكيل شؤون الطلاب',
      summaryItems: [
        { label: 'إجمالي الملاحظات', value: toIndic(total), color: '#6366f1' },
        { label: 'ملاحظات إيجابية', value: toIndic(positive), color: '#22c55e' },
        { label: 'ملاحظات سلبية', value: toIndic(negative), color: '#ef4444' },
      ],
      tableHeaders: ['م', 'اسم المعلم', 'عدد الملاحظات'],
      tableRows: byTeacher.slice(0, 15).map((t, i) => [
        toIndic(i + 1), t.teacher, toIndic(t.count),
      ]),
      settings: schoolSettings,
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MI n="print" s={16} c="#fff" /> طباعة
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'إجمالي الملاحظات', value: total, color: '#6366f1', icon: 'sticky_note_2' },
          { label: 'ملاحظات إيجابية', value: positive, color: '#22c55e', icon: 'thumb_up' },
          { label: 'ملاحظات سلبية', value: negative, color: '#ef4444', icon: 'thumb_down' },
        ].map((c, i) => (
          <div key={i} style={{ ...card, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MI n={c.icon} s={22} c={c.color} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{toIndic(c.value)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* By teacher bars */}
      {byTeacher.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب المعلم</h3>
          {byTeacher.slice(0, 10).map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{t.teacher}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(t.count)}</span>
              </div>
              <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(t.count / maxTeacher) * 100}%`, background: `hsl(${200 + i * 18}, 60%, 50%)`, borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesReport;
