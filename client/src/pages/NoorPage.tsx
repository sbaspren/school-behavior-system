import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHero from '../components/shared/PageHero';
import { noorApi, NoorStatusUpdate } from '../api/noor';
import { showSuccess, showError } from '../components/shared/Toast';
import { DEGREE_LABELS } from '../utils/constants';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { classToLetter, toIndic, escapeHtml, getTodayDates } from '../utils/printUtils';
import { printListReport } from '../utils/printTemplates';
import { useSignalR } from '../hooks/useSignalR';
import FloatingBar from '../components/shared/FloatingBar';
import { useAppContext } from '../hooks/useAppContext';

// ════════════════════════════════════════════════════════════
// تعريفات التبويبات الأربعة
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
};
const TAB_ORDER = ['violations', 'compensation', 'excellent', 'absence'];

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

// استخراج المرحلة من صلاحية المستخدم
function getUserStage(): string | undefined {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return undefined;
  // الأدمن يرى الكل
  if (user.role === 'Admin') return undefined;
  // الوكيل بصلاحية مرحلة محددة
  if (user.scopeType === 'stage' && user.scopeValue) return user.scopeValue;
  return undefined;
}

const STAGE_LABELS: Record<string, string> = {
  'ابتدائي': 'المرحلة الابتدائية',
  'متوسط': 'المرحلة المتوسطة',
  'ثانوي': 'المرحلة الثانوية',
};

const NoorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('violations');
  const [filterMode, setFilterMode] = useState<'today' | 'all' | 'documented'>('today');
  const [docPeriod, setDocPeriod] = useState<'today' | 'all'>('today');
  // المرحلة — تلقائية للوكيل، undefined للأدمن (يرى الكل)
  const userStage = getUserStage();
  const { schoolSettings } = useAppContext();
  const [stats, setStats] = useState<NoorStats | null>(null);
  const [records, setRecords] = useState<NoorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultDetails, setResultDetails] = useState<{ name: string; grade: string; className: string; type: string; ok: boolean }[] | null>(null);
  const [absenceOverrides, setAbsenceOverrides] = useState<Record<number, string>>({});
  const [excludedRecords, setExcludedRecords] = useState<NoorRecord[]>([]);
  const [excludedOpen, setExcludedOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: { id: number; type: string }[]; count: number } | null>(null);
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
      const res = await noorApi.getStats(userStage, filterMode);
      const d = res.data?.data;
      if (d?.pending) setStats(d.pending);
    } catch { /* empty */ }
  }, [filterMode, userStage]);

  // ════════════════════════════════════════
  // جلب السجلات
  // ════════════════════════════════════════
  const loadRecords = useCallback(async (type: string) => {
    setLoading(true);
    setSelected(new Set());
    setAbsenceOverrides({});
    try {
      if (filterMode === 'documented') {
        const res = await noorApi.getDocumentedToday(type, docPeriod, userStage);
        if (res.data?.data?.records) {
          setRecords(res.data.data.records);
        } else {
          setRecords([]);
        }
      } else {
        const res = await noorApi.getPendingRecords(userStage, type, filterMode);
        if (res.data?.data?.records) {
          setRecords(res.data.data.records);
        } else {
          setRecords([]);
        }
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterMode, docPeriod, userStage]);


  const loadExcluded = useCallback(async (type: string) => {
    try {
      const res = await noorApi.getPendingRecords(userStage, type, 'excluded');
      if (res.data?.data?.records) {
        setExcludedRecords(res.data.data.records);
      } else {
        setExcludedRecords([]);
      }
    } catch {
      setExcludedRecords([]);
    }
  }, [userStage]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    loadRecords(activeTab);
    if (filterMode !== 'documented') {
      loadExcluded(activeTab);
    }
  }, [activeTab, loadRecords, loadExcluded, filterMode]);

  // ★ SignalR: تحديث تلقائي عند تلقي إشعار noor-status-updated
  useEffect(() => {
    if (lastNotification?.type === 'noor-status-updated') {
      setSelected(new Set());
      loadRecords(activeTab);
      if (filterMode !== 'documented') loadExcluded(activeTab);
      loadStats();
      setLastUpdated(new Date());
    }
  }, [lastNotification, activeTab, loadRecords, loadExcluded, loadStats, filterMode]);

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
  };

  // ════════════════════════════════════════
  // تبديل الفلتر
  // ════════════════════════════════════════
  const switchFilter = (mode: 'today' | 'all' | 'documented') => {
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
  // طباعة السجلات الموثقة
  // ════════════════════════════════════════
  const handlePrintDocumented = () => {
    if (records.length === 0) return;
    const { hijri, miladi } = getTodayDates();
    const isAbsencePrint = activeTab === 'absence';
    const descLabelPrint = activeTab === 'violations' ? 'المخالفة'
      : activeTab === 'compensation' ? 'السلوك التعويضي'
      : activeTab === 'excellent' ? 'السلوك المتمايز'
      : 'نوع الغياب';
    const printTitle = activeTab === 'violations' ? 'كشف المخالفات الموثقة في نور'
      : activeTab === 'compensation' ? 'كشف السلوك التعويضي الموثق في نور'
      : activeTab === 'excellent' ? 'كشف السلوك المتمايز الموثق في نور'
      : 'كشف الغياب الموثق في نور';

    const TARDINESS_AR_P: Record<string, string> = { Morning: 'تأخر صباحي', Period: 'تأخر عن الحصة', Assembly: 'تأخر عن الاصطفاف' };
    const translateDescP = (rec: NoorRecord) => {
      const raw = rec.description || rec.behaviorType || '';
      if (raw === 'FullDay') return 'غياب يوم كامل';
      if (raw === 'Period' && isAbsencePrint) return 'غياب حصة';
      return TARDINESS_AR_P[raw] || raw;
    };
    const translateExcuseP = (rec: NoorRecord) => {
      const raw = rec.excuseType || '';
      if (raw === 'Excused') return 'بعذر';
      if (raw === 'Unexcused') return 'بدون عذر';
      if (raw === 'PlatformExcused') return 'منصة بعذر';
      if (raw === 'PlatformUnexcused') return 'منصة بدون عذر';
      return raw;
    };
    const clsKeyP = (rec: NoorRecord) => rec.className || rec.class || '';
    const GRADE_ORDER_PRINT: Record<string, number> = { 'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6 };
    const gradeOrdinalP = (g: string) => { for (const [k, v] of Object.entries(GRADE_ORDER_PRINT)) { if (g.includes(k)) return v; } return 99; };
    const sorted = [...records].sort((a, b) =>
      gradeOrdinalP(a.grade || '') - gradeOrdinalP(b.grade || '') ||
      clsKeyP(a).localeCompare(clsKeyP(b), 'ar')
    );
    const groups: { grade: string; cls: string; items: NoorRecord[] }[] = [];
    sorted.forEach(rec => {
      const key = `${rec.grade}|${clsKeyP(rec)}`;
      const last = groups[groups.length - 1];
      const lastKey = last ? `${last.grade}|${last.cls}` : '';
      if (lastKey !== key) groups.push({ grade: rec.grade || '', cls: clsKeyP(rec), items: [] });
      groups[groups.length - 1].items.push(rec);
    });
    let rowNum = 0;
    const rows: import('../utils/print/printTypes').ListReportRow[] = [];
    groups.forEach(group => {
      rows.push({ cells: [], isGroupHeader: true, groupLabel: `${group.grade} / ${classToLetter(group.cls)}`, groupCount: group.items.length });
      group.items.forEach(rec => {
        rowNum++;
        const baseCells = [
          toIndic(rowNum),
          `<span style="font-weight:bold;text-align:right">${escapeHtml(rec.studentName || '')}</span>`,
          escapeHtml(rec.grade || ''),
          escapeHtml(classToLetter(clsKeyP(rec))),
          escapeHtml(translateDescP(rec)),
        ];
        if (isAbsencePrint) baseCells.push(escapeHtml(translateExcuseP(rec)));
        baseCells.push(rec.result === 'فشل'
          ? '<span style="color:#dc2626;font-weight:bold">فشل</span>'
          : '<span style="color:#15803d;font-weight:bold">نجح</span>');
        rows.push({ cells: baseCells });
      });
    });
    const baseHeaders = [
      { label: 'م', width: '4%' }, { label: 'اسم الطالب', width: isAbsencePrint ? '29%' : '35%' },
      { label: 'الصف', width: '14%' }, { label: 'الفصل', width: '7%' },
      { label: descLabelPrint, width: isAbsencePrint ? '17%' : '25%' },
    ];
    if (isAbsencePrint) baseHeaders.push({ label: 'حالة الغياب', width: '16%' });
    baseHeaders.push({ label: 'حالة التوثيق', width: '15%' });
    printListReport({
      title: printTitle,
      dateText: `${hijri} الموافق ${miladi} م`,
      headers: baseHeaders,
      rows,
      summary: `إجمالي: ${toIndic(records.length)} سجل`,
      signatures: false,
    }, schoolSettings as unknown as import('../utils/print/printTypes').SchoolSettings);
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
        showSuccess(`تم تحديث ${updated} سجل${failed > 0 ? ` (${failed} فشل)` : ''}`);
        setSelected(new Set());
        loadRecords(activeTab);
        loadExcluded(activeTab);
        loadStats();
      }
    } catch {
      showError('خطأ في تحديث الحالة');
    } finally {
      setUpdating(false);
    }
  };

  // ════════════════════════════════════════
  // إجراءات الاستبعاد والحذف والإرجاع
  // ════════════════════════════════════════
  const handleExclude = async (items: { id: number; type: string }[]) => {
    try {
      await noorApi.exclude(items);
      showSuccess(`تم استبعاد ${items.length} سجل`);
      setSelected(new Set());
      loadRecords(activeTab);
      loadExcluded(activeTab);
      loadStats();
    } catch {
      showError('خطأ في الاستبعاد');
    }
  };

  const handleRestore = async (items: { id: number; type: string }[]) => {
    try {
      await noorApi.restore(items);
      showSuccess(`تم إرجاع ${items.length} سجل`);
      loadRecords(activeTab);
      loadExcluded(activeTab);
      loadStats();
    } catch {
      showError('خطأ في الإرجاع');
    }
  };

  const requestDelete = (items: { id: number; type: string }[]) => {
    setDeleteTarget({ ids: items, count: items.length });
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setDeleteConfirmOpen(false);
    try {
      const updates: NoorStatusUpdate[] = deleteTarget.ids.map(item => ({
        id: item.id, type: item.type, status: 'لا يحتاج',
      }));
      await noorApi.updateStatus(updates);
      showSuccess(`تم حذف ${deleteTarget.count} سجل من التوثيق نهائياً`);
      setSelected(new Set());
      setDeleteTarget(null);
      loadRecords(activeTab);
      loadExcluded(activeTab);
      loadStats();
    } catch {
      showError('خطأ في الحذف');
    }
  };

  // ════════════════════════════════════════
  // تجميع السجلات حسب الصف/الفصل
  // ════════════════════════════════════════
  const groupedRecords = useMemo(() => {
    const GRADE_ORDER: Record<string, number> = { '\u0627\u0644\u0623\u0648\u0644': 1, '\u0627\u0644\u062b\u0627\u0646\u064a': 2, '\u0627\u0644\u062b\u0627\u0644\u062b': 3, '\u0627\u0644\u0631\u0627\u0628\u0639': 4, '\u0627\u0644\u062e\u0627\u0645\u0633': 5, '\u0627\u0644\u0633\u0627\u062f\u0633': 6 };
    const gradeOrd = (g: string) => { for (const [k, v] of Object.entries(GRADE_ORDER)) { if (g.includes(k)) return v; } return 99; };

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

    // ★ ترتيب المجموعات: الأول→الثاني→الثالث ثم أ→ب
    groups.sort((a, b) =>
      gradeOrd(a.grade) - gradeOrd(b.grade) ||
      a.className.localeCompare(b.className, 'ar')
    );

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
        title={userStage ? `التوثيق في نور — ${STAGE_LABELS[userStage] || userStage}` : 'التوثيق في نور'}
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

      {/* ═══ فلتر العرض: اليوم / كل غير الموثق / الموثق ═══ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
        background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb', padding: '8px 16px',
        flexWrap: 'wrap',
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
        <button
          onClick={() => switchFilter('documented')}
          style={{
            padding: '6px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
            background: filterMode === 'documented' ? '#00695c' : '#f3f4f6',
            color: filterMode === 'documented' ? '#fff' : '#6b7280',
            border: 'none', cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</span> الموثق
        </button>
        {/* فلتر فرعي للموثق */}
        {filterMode === 'documented' && (
          <>
            <span style={{ width: '1px', height: '20px', background: '#e5e7eb', margin: '0 4px' }} />
            <button
              onClick={() => setDocPeriod('today')}
              style={{
                padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                background: docPeriod === 'today' ? '#e0f2f1' : '#f9fafb',
                color: docPeriod === 'today' ? '#00695c' : '#9ca3af',
                border: docPeriod === 'today' ? '1.5px solid #00695c' : '1.5px solid #e5e7eb',
                cursor: 'pointer',
              }}
            >
              اليوم
            </button>
            <button
              onClick={() => setDocPeriod('all')}
              style={{
                padding: '4px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                background: docPeriod === 'all' ? '#e0f2f1' : '#f9fafb',
                color: docPeriod === 'all' ? '#00695c' : '#9ca3af',
                border: docPeriod === 'all' ? '1.5px solid #00695c' : '1.5px solid #e5e7eb',
                cursor: 'pointer',
              }}
            >
              الكل
            </button>
          </>
        )}
      </div>

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
              loadRecords(activeTab);
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
            {records.length > 0 ? `${records.length} سجل` : ''}
          </span>
          {lastUpdatedText && (
            <span style={{ fontSize: '12px', color: '#9da3b8' }}>
              آخر تحديث: {lastUpdatedText}
            </span>
          )}
        </div>
        {filterMode !== 'documented' && (
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

      {/* ═══ شريط نوع الغياب للجميع (لتبويب الغياب — السجلات المعلقة فقط) ═══ */}
      {activeTab === 'absence' && filterMode !== 'documented' && records.length > 0 && (
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
          display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{filterMode === 'documented' ? 'check_circle' : currentTabDef.icon}</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '14px', color: '#1f2937' }}>{filterMode === 'documented' ? 'السجلات الموثقة' : currentTabDef.label}</span>
              <span style={{ fontSize: '12px', color: '#9ca3af', marginRight: '8px' }}>
                {filterMode === 'documented'
                  ? (docPeriod === 'today' ? 'السجلات التي تم توثيقها في نور اليوم' : 'جميع السجلات الموثقة في نور')
                  : currentTabDef.desc}
              </span>
            </div>
          </div>
          {filterMode === 'documented' && records.length > 0 && (
            <button
              onClick={handlePrintDocumented}
              style={{
                padding: '7px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                background: '#1f2937', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span> طباعة
            </button>
          )}
        </div>

        {filterMode === 'documented' ? (
          /* ═══ جدول الموثق ═══ */
          loading ? (
            <LoadingSpinner />
          ) : records.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
              <p style={{ margin: '0 0 8px' }}><span className="material-symbols-outlined" style={{fontSize:36,color:'#9ca3af'}}>inbox</span></p>
              <p style={{ fontSize: '16px', fontWeight: 500 }}>{docPeriod === 'today' ? 'لا توجد سجلات موثقة اليوم' : 'لا توجد سجلات موثقة'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {(() => {
                // إعداد الأعمدة حسب التبويب
                const isAbsence = activeTab === 'absence';
                const descLabel = activeTab === 'violations' ? 'المخالفة'
                  : activeTab === 'compensation' ? 'السلوك التعويضي'
                  : activeTab === 'excellent' ? 'السلوك المتمايز'
                  : 'نوع الغياب';
                const colCount = isAbsence ? 7 : 6;

                // ترجمة الوصف (مشتركة لكل الأنواع)
                const TARDINESS_AR: Record<string, string> = { Morning: 'تأخر صباحي', Period: 'تأخر عن الحصة', Assembly: 'تأخر عن الاصطفاف' };
                const translateDesc = (rec: NoorRecord) => {
                  const raw = rec.description || rec.behaviorType || '';
                  if (raw === 'FullDay') return 'غياب يوم كامل';
                  if (raw === 'Period' && isAbsence) return 'غياب حصة';
                  return TARDINESS_AR[raw] || raw;
                };
                // ترجمة حالة العذر — للغياب فقط
                const translateExcuse = (rec: NoorRecord) => {
                  const raw = rec.excuseType || '';
                  if (raw === 'Excused') return 'بعذر';
                  if (raw === 'Unexcused') return 'بدون عذر';
                  if (raw === 'PlatformExcused') return 'منصة بعذر';
                  if (raw === 'PlatformUnexcused') return 'منصة بدون عذر';
                  return raw;
                };

                // تجميع + ترتيب حسب الصف والفصل
                const GRADE_ORDER: Record<string, number> = { 'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5, 'السادس': 6 };
                const gradeOrdinal = (g: string) => { for (const [k, v] of Object.entries(GRADE_ORDER)) { if (g.includes(k)) return v; } return 99; };
                const clsKey = (rec: NoorRecord) => rec.className || rec.class || '';
                const sorted = [...records].sort((a, b) =>
                  gradeOrdinal(a.grade || '') - gradeOrdinal(b.grade || '') ||
                  clsKey(a).localeCompare(clsKey(b), 'ar')
                );
                const groups: { key: string; grade: string; cls: string; items: NoorRecord[] }[] = [];
                sorted.forEach(rec => {
                  const key = `${rec.grade}|${clsKey(rec)}`;
                  const last = groups[groups.length - 1];
                  if (!last || last.key !== key)
                    groups.push({ key, grade: rec.grade || '', cls: clsKey(rec), items: [] });
                  groups[groups.length - 1].items.push(rec);
                });
                let rowNum = 0;
                return (
                  <table className="data-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ background: '#00695c', color: '#fff' }}>
                        <th style={{ width: 36 }}>#</th>
                        <th>اسم الطالب</th>
                        <th>الصف</th>
                        <th>الفصل</th>
                        <th>{descLabel}</th>
                        {isAbsence && <th>حالة الغياب</th>}
                        <th>حالة التوثيق</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((group) => (
                        <React.Fragment key={group.key}>
                          <tr style={{ background: '#f0fdf4' }}>
                            <td colSpan={colCount} style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 700, color: '#065f46' }}>
                              <span style={{ color: '#00695c' }}>{group.grade}</span>
                              {group.cls && <span style={{ color: '#9ca3af' }}> / {classToLetter(group.cls)}</span>}
                              <span style={{ marginRight: 10, fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 100 }}>
                                {group.items.length} سجل
                              </span>
                            </td>
                          </tr>
                          {group.items.map((rec) => {
                            rowNum++;
                            return (
                              <tr key={`doc-${rec._type}-${rec.id}`} style={{ background: rowNum % 2 === 0 ? '#fff' : '#fafafa' }}>
                                <td style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>{rowNum}</td>
                                <td style={{ fontWeight: 600, color: '#1f2937' }}>{rec.studentName}</td>
                                <td style={{ fontSize: '13px', color: '#4b5563' }}>{rec.grade}</td>
                                <td style={{ fontSize: '13px', color: '#4b5563' }}>{classToLetter(clsKey(rec))}</td>
                                <td style={{ fontSize: '13px', color: '#374151' }}>{translateDesc(rec)}</td>
                                {isAbsence && <td style={{ fontSize: '13px', color: '#374151' }}>{translateExcuse(rec)}</td>}
                                <td>
                                  {rec.result === 'فشل' ? (
                                    <span style={{ display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fee2e2', color: '#dc2626' }}>فشل</span>
                                  ) : (
                                    <span style={{ display: 'inline-block', padding: '2px 10px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#dcfce7', color: '#15803d' }}>نجح</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )
        ) : (
          /* ═══ الجدول الأساسي (السجلات المعلقة) ═══ */
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
                      <th style={{ width: '80px' }}>إجراء</th>
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
                          <tr key={`${rec._type}-${rec.id}`} style={{ background: (!rec._noorValue && !absenceOverrides[idx]) ? '#fef2f2' : (idx % 2 === 0 ? '#fff' : '#fafafa') }}>
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
                                  {rec._type === 'tardiness' ? 'تأخر صباحي' : (rec.description || rec.violationCode)}
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
                              {(() => {
                                const status = rec.NoorStatus || rec.noorStatus || '';
                                if (status === 'failed') return (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fef2f2', color: '#ef4444' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span> فشل
                                  </span>
                                );
                                if (!rec._noorValue && !absenceOverrides[idx]) return (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fef2f2', color: '#ef4444' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span> غير مطابق
                                  </span>
                                );
                                return (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#f3f4f6', color: '#6b7280' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span> معلق
                                  </span>
                                );
                              })()}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  onClick={() => handleExclude([{ id: rec.id, type: rec._type }])}
                                  title="استبعاد"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#9ca3af' }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
                                </button>
                                <button
                                  onClick={() => requestDelete([{ id: rec.id, type: rec._type }])}
                                  title="حذف من التوثيق"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', color: '#9ca3af' }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                                </button>
                              </div>
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

      {/* ═══ قسم المستبعد ═══ */}
      {filterMode !== 'documented' && excludedRecords.length > 0 && (
        <div style={{
          marginTop: '16px', background: '#fffbeb', borderRadius: '12px',
          border: '1px solid #fde68a', overflow: 'hidden',
        }}>
          <button
            onClick={() => setExcludedOpen(!excludedOpen)}
            style={{
              width: '100%', padding: '12px 16px', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '14px', fontWeight: 700, color: '#92400e',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
            المستبعد ({excludedRecords.length})
            <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: 'auto' }}>
              {excludedOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          {excludedOpen && (
            <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ background: '#fef3c7', color: '#92400e' }}>
                    <th>اسم الطالب</th>
                    <th>الصف</th>
                    <th>الفصل</th>
                    <th>الوصف</th>
                    <th style={{ width: '100px' }}>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {excludedRecords.map((rec, i) => (
                    <tr key={`excl-${rec._type}-${rec.id}`} style={{ background: i % 2 === 0 ? '#fffbeb' : '#fef9e7' }}>
                      <td style={{ fontWeight: 600 }}>{rec.studentName}</td>
                      <td>{rec.grade}</td>
                      <td>{classToLetter(rec.className || rec.class)}</td>
                      <td style={{ fontSize: '13px' }}>{rec.description || rec.behaviorType || rec.tardinessType || ''}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => handleRestore([{ id: rec.id, type: rec._type }])} title="إرجاع"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#10b981' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>undo</span>
                          </button>
                          <button onClick={() => requestDelete([{ id: rec.id, type: rec._type }])} title="حذف نهائياً"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ شريط الإجراءات العائم ═══ */}
      {filterMode !== 'documented' && (
        <FloatingBar
          count={selected.size}
          actions={[
            {
              icon: 'block',
              label: 'استبعاد المحدد',
              color: '#f59e0b',
              onClick: () => {
                const items = Array.from(selected).map(idx => ({
                  id: records[idx].id, type: records[idx]._type,
                }));
                handleExclude(items);
              },
            },
            {
              icon: 'delete_forever',
              label: 'حذف من التوثيق',
              color: '#ef4444',
              onClick: () => {
                const items = Array.from(selected).map(idx => ({
                  id: records[idx].id, type: records[idx]._type,
                }));
                requestDelete(items);
              },
            },
            {
              icon: 'check_circle',
              label: 'تحديث كـ "تم"',
              color: '#10b981',
              onClick: markAsDone,
            },
          ]}
          onCancel={() => setSelected(new Set())}
        />
      )}

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

      {/* مربع تأكيد الحذف */}
      {deleteConfirmOpen && deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div style={{ marginBottom: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ef4444' }}>warning</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>حذف من التوثيق نهائياً</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
              سيتم إزالة <strong style={{ color: '#ef4444' }}>{deleteTarget.count}</strong> سجل من صفحة التوثيق نهائياً.
              السجلات ستبقى في النظام لكن لن تظهر هنا مرة أخرى.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
                style={{ padding: '8px 24px', borderRadius: '12px', border: '2px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                إلغاء
              </button>
              <button onClick={executeDelete}
                style={{ padding: '8px 24px', borderRadius: '12px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>
                حذف نهائياً
              </button>
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
    case 'violations': return 9;
    case 'excellent': return 9;
    case 'compensation': return 8;
    case 'absence': return 8;
    default: return 9;
  }
}

export default NoorPage;
