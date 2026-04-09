import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { communicationApi } from '../../../api/communication';
import { useAppContext } from '../../../hooks/useAppContext';
import { toIndic } from '../../../utils/printUtils';
import { printPortfolioReport } from '../../../utils/print/portfolio';
import MI from '../../../components/shared/MI';

interface CommRow {
  id: number;
  studentName: string;
  messageType: string;
  status: string;
  createdAt: string;
  stage?: string;
}

const card: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thS: React.CSSProperties = { background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px', fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const tdS: React.CSSProperties = { padding: '5px 10px', fontSize: 12, textAlign: 'right', border: '0.5px solid #C5CFE0' };
const inputS: React.CSSProperties = { padding: '8px 12px', border: '2px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' };

const CommunicationReport: React.FC = () => {
  const { activeStage: stage, schoolSettings } = useAppContext();
  const [rows, setRows] = useState<CommRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const s = stage || undefined;
      const res = await communicationApi.getAll({ stage: s, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
      setRows(res.data?.data || res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [stage, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const total = rows.length;

  // By type
  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      const t = r.messageType || 'غير محدد';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([t, c]) => ({ type: t, count: c })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const sent = useMemo(() => rows.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length, [rows]);
  const failed = total - sent;
  const maxType = Math.max(1, ...byType.map(t => t.count));

  const TYPE_COLORS: Record<string, string> = { 'WhatsApp': '#25D366', 'SMS': '#0ea5e9', 'whatsapp': '#25D366', 'sms': '#0ea5e9' };

  const handlePrint = () => {
    printPortfolioReport({
      title: 'تقرير التواصل مع أولياء الأمور',
      subtitle: 'ملف إنجاز وكيل شؤون الطلاب',
      summaryItems: [
        { label: 'إجمالي الرسائل', value: toIndic(total), color: '#6366f1' },
        { label: 'تم الإرسال', value: toIndic(sent), color: '#22c55e' },
        { label: 'فشل الإرسال', value: toIndic(failed), color: '#ef4444' },
      ],
      tableHeaders: ['م', 'نوع الرسالة', 'العدد'],
      tableRows: byType.map((t, i) => [
        toIndic(i + 1), t.type, toIndic(t.count),
      ]),
      settings: schoolSettings,
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>جاري التحميل...</div>;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputS} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputS} />
        <button onClick={handlePrint} style={{ padding: '8px 16px', background: '#1B3A6B', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <MI n="print" s={16} c="#fff" /> طباعة
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'إجمالي الرسائل', value: total, color: '#6366f1', icon: 'chat' },
          { label: 'تم الإرسال', value: sent, color: '#22c55e', icon: 'check_circle' },
          { label: 'فشل الإرسال', value: failed, color: '#ef4444', icon: 'error' },
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

      {/* By type bars */}
      {byType.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#374151' }}>التوزيع حسب النوع</h3>
          {byType.map((t, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{t.type}</span>
                <span style={{ color: '#6b7280' }}>{toIndic(t.count)}</span>
              </div>
              <div style={{ height: 22, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(t.count / maxType) * 100}%`, background: TYPE_COLORS[t.type] || `hsl(${220 + i * 30}, 60%, 50%)`, borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunicationReport;
