import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MI from '../components/shared/MI';
import PageHero from '../components/shared/PageHero';
import TabBar from '../components/shared/TabBar';
import EmptyState from '../components/shared/EmptyState';
import ActionIcon from '../components/shared/ActionIcon';
import { noorApi, NoorStatusUpdate } from '../api/noor';
import { showSuccess, showError } from '../components/shared/Toast';
import { DEGREE_LABELS } from '../utils/constants';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { classToLetter } from '../utils/printUtils';
import { useSignalR } from '../hooks/useSignalR';
import FloatingBar from '../components/shared/FloatingBar';

// ════════════════════════════════════════════════════════════
// تعريفات التبويبات الخمسة — مطابق للأصلي NOOR_TABS
// ════════════════════════════════════════════════════════════

interface TabDef {
  id: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
}

const NOOR_TABS: Record<string, TabDef> = {
  violations:   { id: 'violations',   icon: 'balance', label: 'مخالفات',       color: '#ef4444', desc: 'المخالفات السلوكية المعلقة للتوثيق في نور (تشمل التأخر الصباحي)' },
  compensation: { id: 'compensation', icon: 'sync', label: 'تعويضية',       color: '#3b82f6', desc: 'درجات التعويض — فرص تعويض للطلاب المخصوم منهم' },
  excellent:    { id: 'excellent',    icon: 'auto_awesome', label: 'سلوك متمايز',   color: '#22c55e', desc: 'السلوك المتمايز للطلاب المتميزين' },
  absence:      { id: 'absence',     icon: 'event_busy', label: 'غياب يومي',     color: '#f97316', desc: 'سجلات الغياب اليومي — يُدخل في نفس اليوم فقط' },
  documented:   { id: 'documented',  icon: 'check_circle', label: 'الموثق اليوم', color: '#00695c', desc: 'السجلات التي تم توثيقها في نور اليوم' },
};
const TAB_ORDER = ['violations', 'compensation', 'excellent', 'absence', 'documented'];

const DEGREE_COLORS: Record<string, { bg: string; color: string }> = Object.fromEntries(
  Object.entries(DEGREE_LABELS).map(([k, v]) => [k, { bg: v.bg, color: v.color }])
);
const DEGREE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(DEGREE_LABELS).map(([k, v]) => [k, v.label])
);

// خيارات نوع الغياب — مطابق للأصلي ABSENCE_TYPE_OPTIONS
const ABSENCE_TYPE_OPTIONS = [
  { label: 'غياب بعذر', value: '141,' },
  { label: 'غياب بدون عذر', value: '48,' },
  { label: 'غياب منصة بعذر', value: '800667,' },
  { label: 'غياب منصة بدون عذر', value: '1201153,' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NoorRecord = Record<string, any>;

interface NoorStats {
  violations: number;
  compensation: number;
  excellent: number;
  absence: number;
  total: number;
  documentedToday: number;
}

const NoorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('violations');
  const [filterMode, setFilterMode] = useState<'today' | 'all'>('today');
  const [stats, setStats] = useState<NoorStats | null>(null);
  const [records, setRecords] = useState<NoorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState<{ name: string; grade: string; className: string; type: string; ok: boolean }[] | null>(null);
  const [absenceOverrides, setAbsenceOverrides] = useState<Record<number, string>>({});
  const [documentedRecords, setDocumentedRecords] = useState<NoorRecord[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastUpdatedText, setLastUpdatedText] = useState('');

  // ════════════════════════════════════════
  // ★ SignalR — تحديثات مباشرة
  // ════════════════════════════════════════
  const { lastNotification } = useSignalR();

  // ════════════════════════════════════════
  // جلب الإحصائيات
  // ════════════════════════════════════════
  const loadStats = useCallback(async () => {
    try {
      const res = await noorApi.getStats(undefined, filterMode);
      const d = res.data?.data;
      if (d?.pending) setStats(d.pending);
    } catch { /* empty */ }
  }, [filterMode]);

  // ════════════════════════════════════════
  // جلب السجلات
  // ════════════════════════════════════════
  const loadRecords = useCallback(async (type: string) => {
    setLoading(true);
    setSelected(new Set());
    setAbsenceOverrides({});
    try {
      const res = await noorApi.getPendingRecords(undefined, type, filterMode);
      if (res.data?.data?.records) {
        setRecords(res.data.data.records);
      } else {
        setRecords([]);
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  // ════════════════════════════════════════
  // جلب الموثق اليوم
  // ════════════════════════════════════════
  const loadDocumentedToday = useCallback(async () => {
    try {
      const res = await noorApi.getDocumentedToday('all');
      if (res.data?.data?.records) {
        setDocumentedRecords(res.data.data.records);
      }
    } catch {
      setDocumentedRecords([]);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'documented') {
      loadDocumentedToday();
    } else {
      loadRecords(activeTab);
    }
  }, [activeTab, loadRecords, loadDocumentedToday]);

  // ★ SignalR: تحديث تلقائي عند تلقي إشعار noor-status-updated
  useEffect(() => {
    if (lastNotification?.type === 'noor-status-updated') {
      loadRecords(activeTab);
      loadStats();
      if (activeTab === 'documented') loadDocumentedToday();
      setLastUpdated(new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastNotification]);

  // ★ مؤقت آخر تحديث
  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) setLastUpdatedText('الآن');
      else if (seconds < 60) setLastUpdatedText(`قبل ${seconds} ثانية`);
      else setLastUpdatedText(`قبل ${Math.floor(seconds / 60)} دقيقة`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // ════════════════════════════════════════
  // تبديل التبويب
  // ════════════════════════════════════════
  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'documented') loadDocumentedToday();
  };

  // ════════════════════════════════════════
  // تبديل الفلتر
  // ════════════════════════════════════════
  const switchFilter = (mode: 'today' | 'all') => {
    setFilterMode(mode);
  };

  // ════════════════════════════════════════
  // تحديد / إلغاء الكل
  // ════════════════════════════════════════
  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(records.map((_, i) => i)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleOne = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ════════════════════════════════════════
  // تجاوز نوع الغياب — مطابق للأصلي noorSetAbsenceOverride_ / noorApplyAbsenceTypeAll_
  // ════════════════════════════════════════
  const setAbsenceOverride = (idx: number, value: string) => {
    setAbsenceOverrides(prev => ({ ...prev, [idx]: value }));
    setSelected(prev => { const next = new Set(prev); next.add(idx); return next; });
  };

  const applyAbsenceTypeAll = (value: string) => {
    if (!value) return;
    const overrides: Record<number, string> = {};
    const newSelected = new Set(selected);
    records.forEach((_, idx) => {
      overrides[idx] = value;
      newSelected.add(idx);
    });
    setAbsenceOverrides(prev => ({ ...prev, ...overrides }));
    setSelected(newSelected);
    showSuccess('تم تطبيق نوع الغياب على جميع السجلات');
  };

  // ════════════════════════════════════════
  // تحديث حالة نور (تم)
  // ════════════════════════════════════════
  const markAsDone = async () => {
    if (selected.size === 0) {
      showError('لم يتم تحديد أي سجل');
      return;
    }
    setConfirmOpen(true);
  };

  const executeMarkAsDone = async () => {
    setConfirmOpen(false);
    const selectedRecs = Array.from(selected).map(idx => records[idx]);
    setUpdating(true);
    try {
      const updates: NoorStatusUpdate[] = selectedRecs.map(rec => ({
        id: rec.id, type: rec._type, status: 'تم',
      }));
      const res = await noorApi.updateStatus(updates);
      if (res.data?.data) {
        const { updated, failed } = res.data.data;
        const details = selectedRecs.map((rec, i) => ({
          name: rec.studentName || '',
          grade: rec.grade || '',
          className: rec.className || rec.class || '',
          type: rec.description || rec.tardinessType || rec.behaviorType || rec.excuseType || '',
          ok: i < updated,
        }));
        setResultDetails(details);
        showSuccess(`تم تحديث ${updated} سجل${failed > 0 ? ` (${failed} فشل)` : ''}`);
        loadRecords(activeTab);
        loadStats();
      }
    } catch {
      showError('خطأ في تحديث الحالة');
    } finally {
      setUpdating(false);
    }
  };

  // ════════════════════════════════════════
  // تجميع السجلات حسب الصف/الفصل
  // ════════════════════════════════════════
  const groupedRecords = useMemo(() => {
    const groups: { key: string; grade: string; className: string; records: { rec: NoorRecord; idx: number }[] }[] = [];
    const map = new Map<string, typeof groups[0]>();

    records.forEach((rec, idx) => {
      const key = `${rec.grade || ''}|${rec.className || rec.class || ''}`;
      let group = map.get(key);
      if (!group) {
        group = { key, grade: rec.grade || '', className: rec.className || rec.class || '', records: [] };
        map.set(key, group);
        groups.push(group);
      }
      group.records.push({ rec, idx });
    });

    return groups;
  }, [records]);

  const matchStats = useMemo(() => {
    const matched = records.filter((r, i) => r._noorValue || absenceOverrides[i]).length;
    return { matched, unmatched: records.length - matched };
  }, [records, absenceOverrides]);

  const currentTabDef = NOOR_TABS[activeTab] || NOOR_TABS['violations'];

  return (
    <div className="sec-noor">
      {/* Hero Banner — مطابق لـ .page-hero: gradient أخضر غامق نور */}
      <PageHero
        title="التوثيق في نور"
        subtitle="إدارة المخالفات والتأخر والسلوك الإيجابي والغياب — ربط مباشر مع نظام نور"
        gradient="linear-gradient(135deg, #00695c, #00897b)"
        stats={[
          { icon: 'gavel', label: 'مخالفات', value: stats?.violations ?? '-', color: '#ef4444' },
          { icon: 'autorenew', label: 'تعويضية', value: stats?.compensation ?? '-', color: '#60a5fa' },
          { icon: 'stars', label: 'متمايز', value: stats?.excellent ?? '-', color: '#86efac' },
          { icon: 'event_busy', label: 'غياب', value: stats?.absence ?? '-', color: '#f97316' },
          { icon: 'check_circle', label: 'موثق اليوم', value: stats?.documentedToday ?? '-', color: '#10b981' },
        ]}
      />

      {/* ═══ فلتر العرض: اليوم / كل غير الموثق ═══ */}
      {activeTab !== 'documented' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
          background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb', padding: '8px 16px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', marginLeft: '8px' }}>عرض:</span>
          <button
            onClick={() => switchFilter('today')}
            style={{
              padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
              background: filterMode === 'today' ? '#4f46e5' : '#f3f4f6',
              color: filterMode === 'today' ? '#fff' : '#6b7280',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>calendar_today</span> اليوم
          </button>
          <button
            onClick={() => switchFilter('all')}
            style={{
              padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
              background: filterMode === 'all' ? '#4f46e5' : '#f3f4f6',
              color: filterMode === 'all' ? '#fff' : '#6b7280',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>schedule</span> كل غير الموثق
          </button>
        </div>
      )}

      {/* ═══ التبويبات (5 تبويبات) ═══ */}
      <div style={{
        display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '16px', padding: '4px',
        marginBottom: '16px', overflowX: 'auto',
      }}>
        {TAB_ORDER.map(key => {
          const t = NOOR_TABS[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => switchTab(key)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: isActive ? t.color : 'transparent',
                color: isActive ? '#fff' : '#6b7280',
                boxShadow: isActive ? `0 2px 8px ${t.color}40` : 'none',
                border: isActive ? `2px solid ${t.color}` : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{t.icon}</span> {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ شريط إجراءات ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb',
        padding: '12px 16px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              if (activeTab === 'documented') { loadDocumentedToday(); }
              else { loadRecords(activeTab); }
              loadStats();
            }}
            style={{
              padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
              background: '#f3f4f6', color: '#374151', border: '2px solid #d1d5db', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>refresh</span> تحديث السجلات
          </button>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {activeTab === 'documented'
              ? (documentedRecords.length > 0 ? `${documentedRecords.length} سجل` : '')
              : (records.length > 0 ? `${records.length} سجل` : '')}
          </span>
          {lastUpdatedText && (
            <span style={{ fontSize: '12px', color: '#9da3b8' }}>
              آخر تحديث: {lastUpdatedText}
            </span>
          )}
        </div>
        {activeTab !== 'documented' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selected.size > 0 && (
              <span style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 700 }}>
                {selected.size} محدد
              </span>
            )}
            <button
              onClick={markAsDone}
              disabled={selected.size === 0 || updating}
              style={{
                padding: '8px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                background: selected.size > 0 ? '#22c55e' : '#e5e7eb',
                color: selected.size > 0 ? '#fff' : '#9ca3af',
                border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: updating ? 0.7 : 1,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</span> {updating ? 'جاري التحديث...' : 'تحديث كـ "تم"'}
            </button>
          </div>
        )}
      </div>

      {/* ═══ شريط نوع الغياب للجميع (لتبويب الغياب فقط) ═══ */}
      {activeTab === 'absence' && records.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb',
          padding: '10px 16px', marginBottom: '12px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_box</span> نوع الغياب للجميع:
          </span>
          <select
            onChange={(e) => applyAbsenceTypeAll(e.target.value)}
            defaultValue=""
            style={{
              padding: '6px 12px', border: '2px solid #d1d5db', borderRadius: '12px',
              fontSize: '13px', minWidth: '170px', background: '#fff',
            }}
          >
            <option value="">— الافتراضي حسب البيانات —</option>
            {ABSENCE_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>يُطبّق على جميع الطلاب</span>
        </div>
      )}

      {/* ═══ حاوية الجدول ═══ */}
      <div style={{
        background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb', overflow: 'hidden',
      }}>
        {/* رأس القسم */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{currentTabDef.icon}</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>{currentTabDef.label}</span>
            <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '8px' }}>{currentTabDef.desc}</span>
          </div>
        </div>

        {/* ═══ جدول الموثق اليوم ═══ */}
        {activeTab === 'documented' ? (
          documentedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p style={{ margin: '0 0 8px' }}><span className="material-symbols-outlined" style={{fontSize:36,color:'#9ca3af'}}>inbox</span></p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>لا توجد سجلات موثقة اليوم</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#00695c', color: '#fff' }}>
                    <th>اسم الطالب</th>
                    <th>الصف</th>
                    <th>الفصل</th>
                    <th>النوع</th>
                    <th>الوصف</th>
                    <th>النتيجة</th>
                  </tr>
                </thead>
                <tbody>
                  {documentedRecords.map((rec, idx) => (
                    <tr key={`doc-${rec._type}-${rec.id}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ fontWeight: 600, color: '#1f2937' }}>{rec.studentName}</td>
                      <td style={{ fontSize: '13px', color: '#4b5563' }}>{rec.grade}</td>
                      <td style={{ fontSize: '13px', color: '#4b5563' }}>{classToLetter(rec.className || rec.class)}</td>
                      <td style={{ fontSize: '13px', color: '#4b5563' }}>{rec._type}</td>
                      <td style={{ fontSize: '13px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rec.description || rec.behaviorType || rec.tardinessType || rec.excuseType || ''}
                      </td>
                      <td>
                        {rec.noorStatus === 'فشل' ? (
                          <span style={{ display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fee2e2', color: '#dc2626' }}>فشل</span>
                        ) : (
                          <span style={{ display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#dcfce7', color: '#15803d' }}>نجح</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ═══ الجدول الأساسي (تبويبات السجلات المعلقة) ═══ */
          <>
            {loading ? (
              <LoadingSpinner />
            ) : records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                <p style={{ margin: '0 0 8px' }}><span className="material-symbols-outlined" style={{fontSize:36,color:'#15803d'}}>check_circle</span></p>
                <p style={{ fontSize: '16px', fontWeight: 500 }}>لا توجد سجلات معلقة</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ background: '#00695c', color: '#fff' }}>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selected.size === records.length && records.length > 0}
                          onChange={(e) => toggleAll(e.target.checked)}
                        />
                      </th>
                      <th>اسم الطالب</th>
                      <th>الصف</th>
                      <th>الفصل</th>
                      {activeTab === 'violations' && <><th>المخالفة</th><th>الدرجة</th><th>التاريخ</th></>}
                      {activeTab === 'compensation' && <><th>السلوك التعويضي</th><th>التاريخ</th></>}
                      {activeTab === 'excellent' && <><th>السلوك المتمايز</th><th>المعلم</th><th>التاريخ</th></>}
                      {activeTab === 'absence' && <><th>نوع الغياب</th><th>التاريخ</th></>}
                      <th>نور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedRecords.map(group => (
                      <React.Fragment key={group.key}>
                        {/* صف المجموعة */}
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan={getColSpan(activeTab)} style={{
                            padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: '#4b5563',
                          }}>
                            <span style={{ color: currentTabDef.color }}>{group.grade}</span>
                            {group.className && <span style={{ color: '#9ca3af' }}> / {classToLetter(group.className)}</span>}
                            <span style={{
                              marginRight: '12px', fontSize: '11px', color: '#9ca3af',
                              background: '#f3f4f6', padding: '2px 8px', borderRadius: '100px',
                            }}>
                              {group.records.length} سجل
                            </span>
                          </td>
                        </tr>
                        {/* صفوف البيانات */}
                        {group.records.map(({ rec, idx }) => (
                          <tr key={`${rec._type}-${rec.id}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected.has(idx)}
                                onChange={() => toggleOne(idx)}
                              />
                            </td>
                            <td style={{ fontWeight: 600, color: '#1f2937' }}>{rec.studentName}</td>
                            <td style={{ fontSize: '13px', color: '#4b5563' }}>{rec.grade}</td>
                            <td style={{ fontSize: '13px', color: '#4b5563' }}>{classToLetter(rec.className || rec.class)}</td>

                            {activeTab === 'violations' && (
                              <>
                                <td style={{ fontSize: '13px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rec.description || rec.violationCode}
                                </td>
                                <td>
                                  <DegreeBadge degree={String(rec.degree)} />
                                </td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{rec.date}</td>
                              </>
                            )}

                            {activeTab === 'compensation' && (
                              <>
                                <td style={{ fontSize: '13px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rec.behaviorType || rec.details}
                                </td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{rec.date}</td>
                              </>
                            )}

                            {activeTab === 'excellent' && (
                              <>
                                <td style={{ fontSize: '13px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {rec.behaviorType || rec.details}
                                </td>
                                <td style={{ fontSize: '13px', color: '#6b7280' }}>{rec.recordedBy}</td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{rec.date}</td>
                              </>
                            )}

                            {activeTab === 'absence' && (
                              <>
                                <td>
                                  <select
                                    value={absenceOverrides[idx] || getDefaultAbsenceValue(rec)}
                                    onChange={(e) => setAbsenceOverride(idx, e.target.value)}
                                    style={{
                                      fontSize: '12px', padding: '4px 8px', border: '2px solid #ddd',
                                      borderRadius: '12px', minWidth: '130px', background: '#fff',
                                    }}
                                  >
                                    {ABSENCE_TYPE_OPTIONS.map(o => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ fontSize: '12px', color: '#6b7280' }}>{rec.hijriDate || rec.date}</td>
                              </>
                            )}

                            <td>
                              {(absenceOverrides[idx] || rec._noorValue) ? (
                                <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#dcfce7', color: '#15803d' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>check</span> مطابق</span>
                              ) : (
                                <span style={{ display: 'inline-block', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fee2e2', color: '#dc2626' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>close</span> غير مطابق</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* فوتر */}
            {records.length > 0 && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid #f3f4f6',
                display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#6b7280',
              }}>
                <span>الإجمالي: <strong style={{ color: '#1f2937' }}>{records.length}</strong> سجل</span>
                <span>المحدد: <strong style={{ color: '#4f46e5' }}>{selected.size}</strong></span>
                <span style={{ marginRight: 'auto', display: 'flex', gap: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    مطابق ({matchStats.matched})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                    غير مطابق ({matchStats.unmatched})
                  </span>
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* مربع تأكيد التوثيق */}
      {confirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>cloud</span></div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>تأكيد التوثيق في نور</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              سيتم تحديث <strong style={{ color: '#4f46e5' }}>{selected.size}</strong> سجل كـ "تم" في نور
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmOpen(false)}
                style={{ padding: '8px 24px', borderRadius: '12px', border: '2px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>إلغاء</button>
              <button onClick={executeMarkAsDone}
                style={{ padding: '8px 24px', borderRadius: '12px', border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>بدء التوثيق</button>
            </div>
          </div>
        </div>
      )}

      {/* جدول نتائج التوثيق */}
      {resultDetails && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '600px', width: '95%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>نتائج التوثيق</h3>
              <button onClick={() => setResultDetails(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span></button>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '13px' }}>
                نجح: {resultDetails.filter(r => r.ok).length}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: '100px', background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '13px' }}>
                فشل: {resultDetails.filter(r => !r.ok).length}
              </span>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead><tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الطالب</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>الصف</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>النوع</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>الحالة</th>
                </tr></thead>
                <tbody>
                  {resultDetails.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ padding: '8px' }}>{r.grade} ({classToLetter(r.className)})</td>
                      <td style={{ padding: '8px' }}>{r.type}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {r.ok ? <span style={{ color: '#15803d' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>check</span></span> : <span style={{ color: '#dc2626' }}><span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle' }}>close</span></span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════
// مكونات مساعدة
// ════════════════════════════════════════════════════════════

const StatBadge: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <div style={{
    background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  }}>
    <span style={{ fontSize: '20px' }}>{icon}</span>
    <span style={{ fontSize: '22px', fontWeight: 800, color }}>{value}</span>
    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{label}</span>
  </div>
);

const DegreeBadge: React.FC<{ degree: string }> = ({ degree }) => {
  const info = DEGREE_COLORS[degree] || DEGREE_COLORS['1'];
  const name = DEGREE_NAMES[degree] || degree;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
      background: info.bg, color: info.color,
    }}>
      {name}
    </span>
  );
};

// حساب قيمة الغياب الافتراضية حسب البيانات — مطابق للأصلي noorMapAbsence_
function getDefaultAbsenceValue(rec: NoorRecord): string {
  // ★ أولاً: استخدم _noorValue من السيرفر إذا موجود
  if (rec._noorValue) return rec._noorValue;

  const absType = String(rec.absenceType || '').trim();
  const excType = String(rec.excuseType || '').trim();

  // فحص enum (من ASP.NET)
  if (excType === 'PlatformExcused') return '800667,';
  if (excType === 'PlatformUnexcused') return '1201153,';
  if (excType === 'Excused') return '141,';
  if (excType === 'Unexcused') return '48,';

  // فحص النصوص العربية (fallback — من GAS الأصلي)
  if (excType.includes('منصة') || excType.includes('مدرستي') || absType.includes('منصة')) {
    if (excType.includes('بدون') || absType.includes('بدون')) return '1201153,';
    return '800667,';
  }

  if (excType === 'مقبول' || excType === 'بعذر' || excType === 'معذور' || absType.includes('بعذر')) {
    return '141,';
  }

  return '48,'; // غياب بدون عذر — القيمة الافتراضية
}

function getColSpan(tab: string): number {
  switch (tab) {
    case 'violations': return 8;
    case 'excellent': return 8;
    case 'compensation': return 7;
    case 'absence': return 7;
    case 'documented': return 6;
    default: return 8;
  }
}

export default NoorPage;
