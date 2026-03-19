import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MI from '../components/shared/MI';
import PageHero from '../components/shared/PageHero';
import TabBar from '../components/shared/TabBar';
import ActionBar from '../components/shared/ActionBar';
import FloatingBar from '../components/shared/FloatingBar';
import EmptyState from '../components/shared/EmptyState';
import ActionIcon from '../components/shared/ActionIcon';
import { absenceApi, AbsenceData } from '../api/absence';
import { parentExcuseApi, ParentExcuseRow } from '../api/parentExcuse';
import { studentsApi } from '../api/students';
import { settingsApi, StageConfigData } from '../api/settings';
import { showSuccess, showError } from '../components/shared/Toast';
import { SETTINGS_STAGES } from '../utils/constants';
import { printForm, PrintFormData, FormId, printListReport, ListReportRow } from '../utils/printTemplates';
import { toIndic, escapeHtml, getTodayDates, formatClass, sortByClass, sortGrades, sortByGradeClass } from '../utils/printUtils';

const SCHOOL_DAYS = 180;
const BASE_URL = window.location.origin;

// ============================== Types ==============================
interface AbsenceRow {
  id: number; studentId: number; studentNumber: string; studentName: string;
  grade: string; className: string; stage: string; mobile: string;
  absenceType: string; period: string; hijriDate: string; dayName: string;
  recordedBy: string; recordedAt: string; status: string; excuseType: string;
  isSent: boolean; tardinessStatus: string; arrivalTime: string; notes: string;
}

interface CumulativeRow {
  studentId: number; studentNumber: string; studentName: string;
  grade: string; className: string; stage: string;
  excusedDays: number; unexcusedDays: number; lateDays: number;
  totalDays: number;
}

interface StudentOption { id: number; studentNumber: string; name: string; stage: string; grade: string; className: string; }

type TabType = 'today' | 'approved' | 'excuses' | 'reports';

// ============================== Main Component ==============================
const AbsencePage: React.FC = () => {
  const [records, setRecords] = useState<AbsenceRow[]>([]);
  const [cumulativeRecords, setCumulativeRecords] = useState<CumulativeRow[]>([]);
  const [excuses, setExcuses] = useState<ParentExcuseRow[]>([]);
  const [stages, setStages] = useState<StageConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('__all__');
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [modalOpen, setModalOpen] = useState(false);

  const enabledStages = useMemo(() =>
    stages.filter((s) => s.isEnabled && s.grades.some((g) => g.isEnabled && g.classCount > 0)), [stages]);

  const currentStageId = useMemo(() => {
    if (stageFilter === '__all__') return undefined;
    return SETTINGS_STAGES.find((s) => s.name === stageFilter)?.id || stageFilter;
  }, [stageFilter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes, cRes, eRes] = await Promise.all([
        absenceApi.getAll(),
        settingsApi.getStructure(),
        absenceApi.getAllCumulative(currentStageId),
        parentExcuseApi.getAll(currentStageId),
      ]);
      if (rRes.data?.data) setRecords(rRes.data.data);
      if (sRes.data?.data?.stages) setStages(Array.isArray(sRes.data.data.stages) ? sRes.data.data.stages : []);
      if (cRes.data?.data) setCumulativeRecords(cRes.data.data);
      if (eRes.data?.data) setExcuses(eRes.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, [currentStageId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredByStage = useMemo(() => {
    if (stageFilter === '__all__') return records;
    const stageId = SETTINGS_STAGES.find((s) => s.name === stageFilter)?.id || stageFilter;
    return records.filter((r) => r.stage === stageId);
  }, [records, stageFilter]);

  const todayDate = new Date().toISOString().split('T')[0];
  const todayRecords = useMemo(() =>
    filteredByStage.filter((r) => r.recordedAt?.startsWith(todayDate)), [filteredByStage, todayDate]);

  const pendingExcuses = useMemo(() => excuses.filter(e => e.status === 'معلق').length, [excuses]);

  const schoolSettings = useMemo(() => ({
    letterheadMode: 'default', schoolName: 'متوسطة وثانوية العرين', eduAdmin: 'إدارة تعليم أبها', eduDept: 'الشؤون التعليمية'
  }), []);

  if (loading) {
    return (<div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /><p style={{ color: '#666', marginTop: 16 }}>جاري التحميل...</p></div>);
  }

  return (
    <div className="sec-absence">
      {/* Hero Banner — مطابق لـ .page-hero: gradient برتقالي + 3 عدادات */}
      <PageHero
        title={`الغياب${currentStageId ? ' — ' + stageFilter : ''}`}
        subtitle={`${getTodayDates().dayName} - ${getTodayDates().hijri}`}
        gradient="linear-gradient(135deg, #ea580c, #f97316)"
        stats={[
          { icon: 'event_busy', label: 'غياب اليوم', value: todayRecords.length, color: '#f97316' },
          { icon: 'description', label: 'أعذار معلقة', value: pendingExcuses, color: '#8b5cf6' },
          { icon: 'shield', label: 'حماية (10+)', value: cumulativeRecords.filter(r => r.unexcusedDays >= 10).length, color: '#ef4444' },
        ]}
      />

      {/* Tabs — مطابق لـ .tabs-bar: 4 tabs مع Material Symbols بلون برتقالي */}
      <TabBar
        tabs={[
          { id: 'today', label: 'الغياب اليومي', icon: 'today' },
          { id: 'approved', label: 'المعتمد', icon: 'verified' },
          { id: 'excuses', label: 'الأعذار', icon: 'assignment_late', badge: pendingExcuses },
          { id: 'reports', label: 'التقارير', icon: 'bar_chart' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        sectionColor="#ea580c"
      />

      {/* Stage Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>المرحلة:</span>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          <FilterBtn label="الكل" count={records.length} active={stageFilter === '__all__'} onClick={() => setStageFilter('__all__')} color="#ea580c" />
          {enabledStages.map((stage) => {
            const info = SETTINGS_STAGES.find((s) => s.id === stage.stage);
            const count = records.filter((r) => r.stage === stage.stage).length;
            return <FilterBtn key={stage.stage} label={info?.name || stage.stage} count={count} active={stageFilter === (info?.name || stage.stage)} onClick={() => setStageFilter(info?.name || stage.stage)} color="#ea580c" />;
          })}
        </div>
      </div>

      {activeTab === 'today' && <TodayTab records={todayRecords} allRecords={filteredByStage} onRefresh={loadData} stageFilter={stageFilter} settings={schoolSettings} onAdd={() => setModalOpen(true)} />}
      {activeTab === 'approved' && <ApprovedTab records={cumulativeRecords} dailyRecords={filteredByStage} onRefresh={loadData} settings={schoolSettings} />}
      {activeTab === 'excuses' && <ExcusesTab excuses={excuses} onRefresh={loadData} settings={schoolSettings} />}
      {activeTab === 'reports' && <ReportsTab records={filteredByStage} cumulativeRecords={cumulativeRecords} settings={schoolSettings} />}

      {modalOpen && <AddAbsenceModal stages={enabledStages} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); loadData(); }} />}
    </div>
  );
};

// ============================================================
// Today Tab — Enhanced with grouped table, platform import, late modal, all print forms
// ============================================================
const TodayTab: React.FC<{ records: AbsenceRow[]; allRecords: AbsenceRow[]; onRefresh: () => void; stageFilter: string; settings: any; onAdd: () => void }> = ({ records, allRecords, onRefresh, stageFilter, settings, onAdd }) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AbsenceRow | null>(null);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [msgEditorRow, setMsgEditorRow] = useState<AbsenceRow | null>(null);
  const [lateModal, setLateModal] = useState<AbsenceRow | null>(null);
  const [lateStatus, setLateStatus] = useState('غائب');
  const [lateTime, setLateTime] = useState('');
  const [includeLink, setIncludeLink] = useState(true);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, total: 0 });
  const noorFileRef = useRef<HTMLInputElement>(null);
  const platformFileRef = useRef<HTMLInputElement>(null);
  const [excelPreview, setExcelPreview] = useState<{ students: { studentNumber?: string; name?: string; absenceType?: string }[]; source: string } | null>(null);

  // Excel import handler (Noor + Platform)
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>, isPlatform = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (sheet['!merges']) {
        for (const merge of sheet['!merges']) {
          const srcRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
          const srcCell = sheet[srcRef];
          if (srcCell) {
            for (let r = merge.s.r + 1; r <= merge.e.r; r++) {
              const tRef = XLSX.utils.encode_cell({ r, c: merge.s.c });
              if (!sheet[tRef]) sheet[tRef] = { t: srcCell.t, v: srcCell.v };
            }
          }
        }
      }
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const hdrIdx = rows.findIndex(r => r.some(c => String(c).includes('الإسم') || String(c).includes('الاسم')));
      if (hdrIdx < 0) { showError('لم يتم التعرف على هيكل الملف'); return; }
      const hdrs = rows[hdrIdx].map(String);
      const nameCol = hdrs.findIndex(h => h.includes('الإسم') || h.includes('الاسم'));
      const idCol = hdrs.findIndex(h => h.includes('الهوية'));
      const phoneCol = hdrs.findIndex(h => h.includes('الجوال'));
      const stageCol = hdrs.findIndex(h => h.includes('المرحلة'));
      const classCol = hdrs.findIndex(h => h.includes('الفصل'));
      const typeCol = hdrs.findIndex(h => h.includes('نوع'));
      // Fill down empty cells
      const fillCols = hdrs.map((h, i) => (h.includes('الفصل') || h.includes('المرحلة') || h.includes('نوع')) ? i : -1).filter(i => i >= 0);
      for (const ci of fillCols) {
        let last = '';
        for (let r = hdrIdx + 1; r < rows.length; r++) {
          const v = String(rows[r]?.[ci] || '').trim();
          if (v) last = v; else if (last && rows[r]) rows[r][ci] = last;
        }
      }
      const students: { studentNumber?: string; name?: string; absenceType?: string }[] = [];
      for (let i = hdrIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row[nameCol]) continue;
        students.push({
          studentNumber: idCol >= 0 ? String(row[idCol]).trim() : '',
          name: String(row[nameCol]).trim(),
          absenceType: typeCol >= 0 && String(row[typeCol]).includes('حصة') ? 'Period' : 'FullDay',
        });
      }
      if (students.length === 0) { showError('لا يوجد طلاب في الملف'); return; }
      const source = isPlatform ? 'platform' : 'noor';
      setExcelPreview({ students, source });
    } catch (err: any) { showError('خطأ في الاستيراد: ' + (err?.message || '')); }
    finally { setImporting(false); e.target.value = ''; }
  };

  const confirmExcelImport = async () => {
    if (!excelPreview) return;
    const { students, source } = excelPreview;
    setExcelPreview(null);
    showSuccess('جاري حفظ البيانات...');
    try {
      const res = await absenceApi.importFromExcel(students, source);
      if (res.data?.data) showSuccess(res.data.data.message || `تم استيراد ${students.length} طالب`);
      onRefresh();
    } catch (err: any) { showError('خطأ: ' + (err?.message || '')); }
  };

  const filtered = useMemo(() => {
    if (!search) return records;
    const q = search.toLowerCase();
    return records.filter(r => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q));
  }, [records, search]);

  // Group records by class
  const groupedRecords = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      return sortByGradeClass(a, b) || a.studentName.localeCompare(b.studentName, 'ar');
    });
    const groups: { key: string; label: string; records: AbsenceRow[] }[] = [];
    let currentKey = '';
    sorted.forEach(r => {
      const key = `${r.grade}/${r.className}`;
      if (key !== currentKey) {
        groups.push({ key, label: `${r.grade} / ${r.className}`, records: [] });
        currentKey = key;
      }
      groups[groups.length - 1].records.push(r);
    });
    return groups;
  }, [filtered]);

  const toggleSelect = (id: number) => setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(r => r.id))); };

  const handleDelete = async () => { if (!confirmDelete) return; try { await absenceApi.delete(confirmDelete.id); showSuccess('تم الحذف'); setConfirmDelete(null); onRefresh(); } catch { showError('خطأ'); } };

  const handleToggleExcuse = async (r: AbsenceRow) => {
    const newType = r.excuseType === 'Excused' ? 'Unexcused' : 'Excused';
    try { await absenceApi.updateExcuseType(r.id, newType); showSuccess(`تم تغيير العذر إلى: ${newType === 'Excused' ? 'بعذر' : 'بدون عذر'}`); onRefresh(); } catch { showError('فشل'); }
  };

  // Late status modal
  const openLateModal = (r: AbsenceRow) => {
    setLateModal(r);
    setLateStatus(r.tardinessStatus || 'غائب');
    setLateTime(r.arrivalTime || '');
  };

  const saveLateStatus = async () => {
    if (!lateModal) return;
    try {
      await absenceApi.updateLateStatus(lateModal.id, lateStatus, lateStatus === 'متأخر' ? lateTime : '');
      showSuccess('تم التحديث');
      setLateModal(null);
      onRefresh();
    } catch { showError('فشل التحديث'); }
  };

  // WhatsApp send with excuse link
  const handleSendWhatsApp = (r: AbsenceRow) => {
    setMsgEditorRow(r);
  };

  const handleConfirmSend = async (message: string) => {
    if (!msgEditorRow) return;
    setSendingId(msgEditorRow.id);
    try {
      const res = await absenceApi.sendWhatsApp(msgEditorRow.id, { message });
      if (res.data?.data?.success) { showSuccess('تم الإرسال ✓'); setMsgEditorRow(null); onRefresh(); }
      else showError(res.data?.message || 'فشل');
    } catch { showError('خطأ'); }
    finally { setSendingId(null); }
  };

  // Bulk send with progress
  const handleSendAll = async () => {
    const unsent = filtered.filter(r => !r.isSent);
    if (unsent.length === 0) { showError('تم إرسال جميع الإشعارات سابقاً'); return; }
    if (!window.confirm(`سيتم إرسال إشعارات لـ ${unsent.length} ولي أمر.\nالتقدير: ~${Math.ceil(unsent.length * 10 / 60)} دقائق\n\nهل تريد المتابعة؟`)) return;
    setBulkSending(true);
    setBulkProgress({ sent: 0, total: unsent.length });
    let sentCount = 0;
    for (const r of unsent) {
      try { await absenceApi.sendWhatsApp(r.id, {}); sentCount++; } catch { /* skip */ }
      setBulkProgress({ sent: sentCount, total: unsent.length });
    }
    setBulkSending(false);
    showSuccess(`تم الإرسال: ${sentCount} ناجح من ${unsent.length}`);
    onRefresh();
  };

  // Bulk actions for selected
  const handleSendBulk = async () => {
    if (selected.size === 0) return;
    try { const res = await absenceApi.sendWhatsAppBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount} من ${res.data.data.total}`); setSelected(new Set()); onRefresh(); } }
    catch { showError('خطأ'); }
  };

  const handleDeleteBulk = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`حذف ${selected.size} سجل؟`)) return;
    try { const res = await absenceApi.deleteBulk(Array.from(selected)); if (res.data?.data) { showSuccess(`تم حذف ${res.data.data.deletedCount}`); setSelected(new Set()); onRefresh(); } }
    catch { showError('خطأ'); }
  };

  // Print today's absence list (selected only if any selected)
  const handlePrintToday = (forceAll = false) => {
    const printRecs = (!forceAll && selected.size > 0) ? filtered.filter(r => selected.has(r.id)) : filtered;
    if (printRecs.length === 0) { showError('لا يوجد بيانات للطباعة'); return; }
    const { hijri, miladi, dayName } = getTodayDates();
    const sorted = [...printRecs].sort((a, b) => sortByGradeClass(a, b));
    let prevClass = '';
    const rows: ListReportRow[] = [];
    sorted.forEach((r, i) => {
      const key = `${r.grade} / ${r.className}`;
      const keyAr = `${r.grade} / ${toIndic(r.className)}`;
      if (key !== prevClass) {
        if (i > 0) rows.push({ cells: [], isSeparator: true });
        rows.push({ cells: [], isGroupHeader: true, groupLabel: keyAr, groupCount: sorted.filter(x => `${x.grade} / ${x.className}` === key).length });
        prevClass = key;
      }
      const teacher = (!r.recordedBy || r.recordedBy === 'يدوي' || r.recordedBy === 'مدير_النظام') ? 'الوكيل' : r.recordedBy;
      const excuseLabel = r.excuseType === 'Excused' ? 'بعذر' : 'بدون عذر';
      const platform = r.notes?.includes('منصة') ? ' <span style="color:#0891b2;font-size:10pt;font-weight:bold">(منصة)</span>' : '';
      rows.push({ cells: [
        toIndic(i + 1),
        `<span style="font-weight:bold;text-align:right">${escapeHtml(r.studentName)}${platform}</span>`,
        escapeHtml(keyAr),
        `<span style="font-size:11pt">${escapeHtml(teacher)}</span>`,
        excuseLabel,
        `<span style="color:${r.isSent ? 'green' : '#999'};font-weight:bold">${r.isSent ? 'تم' : '-'}</span>`,
      ] });
    });
    printListReport({
      title: `كشف الغياب اليومي ليوم ${dayName}`,
      dateText: `${hijri} الموافق ${miladi} م`,
      headers: [
        { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' }, { label: 'الصف', width: '10%' },
        { label: 'المسجّل', width: '15%' }, { label: 'العذر', width: '15%' }, { label: 'التواصل', width: '7%' },
      ],
      rows,
      summary: `إجمالي: ${toIndic(sorted.length)} طالب`,
    }, settings);
  };

  // Print official form from today tab
  const handlePrintForm = (formId: FormId, r: AbsenceRow) => {
    const today = new Date();
    const data: PrintFormData = {
      studentName: r.studentName,
      grade: `${r.grade} / ${r.className}`,
      violationDate: today.toLocaleDateString('ar-SA-u-ca-islamic-umalqura'),
      violationDay: today.toLocaleDateString('ar-SA', { weekday: 'long' }),
      unexcusedDays: 1,
      excusedDays: 0,
      contactType: 'غياب',
      contactReason: 'غياب عن الحضور',
      contactResult: 'تم التواصل بنجاح',
    };
    printForm(formId, data, settings);
  };

  const cntAbsent = filtered.filter(r => r.tardinessStatus !== 'متأخر').length;
  const cntLate = filtered.filter(r => r.tardinessStatus === 'متأخر').length;
  const cntSent = filtered.filter(r => r.isSent).length;

  return (
    <>
      <input ref={noorFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleExcelImport(e, false)} />
      <input ref={platformFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleExcelImport(e, true)} />

      {/* Action bar — مطابق لـ .action-bar + .btn-hero classes */}
      <div className="action-bar">
        <div className="action-group">
          <ImportDropdown onNoor={() => noorFileRef.current?.click()} onPlatform={() => platformFileRef.current?.click()} />
          <button className="btn-hero btn-hero-primary" onClick={onAdd}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>add_circle</span> تسجيل يدوي
          </button>
          <button className="btn-hero btn-hero-outline" onClick={onRefresh}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>refresh</span> تحديث
          </button>
        </div>
        <div className="action-group">
          <button className="btn-hero btn-hero-success" onClick={handleSendAll} disabled={bulkSending} id="btn-send-all">
            {bulkSending
              ? <><span className="material-symbols-outlined" style={{fontSize:18}}>hourglass_empty</span> {bulkProgress.sent}/{bulkProgress.total}</>
              : <><span className="material-symbols-outlined" style={{fontSize:18}}>send</span> إرسال للجميع</>}
          </button>
          <button className="btn-hero btn-hero-outline" onClick={() => handlePrintToday(true)}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>print</span> طباعة الكشف
          </button>
        </div>
      </div>

      {/* Table with grouped display */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 72, color: '#d1d5db' }}>event_available</span>
          <p style={{ color: '#6b7280', marginTop: 16, fontSize: 18 }}>لا يوجد غياب مسجل اليوم</p>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>قم باستيراد ملف Excel من نظام نور أو أضف يدوياً</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
            <button onClick={() => noorFileRef.current?.click()} style={{ padding: '8px 16px', background: '#059669', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>upload_file</span> استيراد Excel
            </button>
            <button onClick={onAdd} style={{ padding: '8px 16px', background: '#ea580c', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>add_circle</span> تسجيل يدوي
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl" style={{ overflow: 'hidden' }}>
          <table className="sht">
            <thead>
              <tr style={{ background: '#ea580c' }}>
                <th style={{ width: 36 }}>#</th>
                <th style={{ minWidth: 120 }}>اسم الطالب</th>
                <th>المعلم</th>
                <th style={{ width: 80 }}>الحالة</th>
                <th style={{ minWidth: 160 }}>الإجراءات والتواصل</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {groupedRecords.map((group, gIdx) => (
                <React.Fragment key={group.key}>
                  {gIdx > 0 && <tr className="sht-sep"><td colSpan={6}></td></tr>}
                  <tr className="sht-gh">
                    <td colSpan={6}><span className="sht-gl">{group.label}</span> <span className="sht-gc">({group.records.length})</span></td>
                  </tr>
                  {group.records.map((r, idx) => {
                    const teacher = (!r.recordedBy || r.recordedBy === 'يدوي' || r.recordedBy === 'مدير_النظام') ? 'الوكيل' : r.recordedBy;
                    const isExcused = r.excuseType === 'Excused';
                    const isLate = r.tardinessStatus === 'متأخر';
                    const globalIdx = filtered.indexOf(r);
                    return (
                      <tr key={r.id} className={idx % 2 === 0 ? 'rw' : 'rg'}>
                        <td>{globalIdx + 1}</td>
                        <td className="nm">
                          {r.studentName}
                          {r.notes?.includes('منصة') && <span style={{ fontSize: 10, color: '#0891b2', fontWeight: 700, marginRight: 4 }}>(منصة)</span>}
                        </td>
                        <td style={{ fontSize: 12, color: teacher === '-' ? '#9ca3af' : '#374151' }}>{teacher}</td>
                        <td>
                          {isLate ? (
                            <button onClick={() => openLateModal(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: '#fef3c7', color: '#a16207', borderRadius: 9999, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span> متأخر {r.arrivalTime}
                            </button>
                          ) : (
                            <button onClick={() => handleToggleExcuse(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: isExcused ? '#dcfce7' : '#fee2e2', color: isExcused ? '#15803d' : '#b91c1c', borderRadius: 9999, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isExcused ? 'check_circle' : 'block'}</span>
                              {isExcused ? 'بعذر' : 'بدون عذر'}
                            </button>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button onClick={() => handleSendWhatsApp(r)} disabled={sendingId === r.id} className="cnt-badge-btn" style={{ padding: '4px 10px', background: r.isSent ? '#16a34a' : '#16a34a', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{r.isSent ? 'check_circle' : 'send'}</span> {r.isSent ? 'تم' : 'إرسال'}
                            </button>
                            <button onClick={() => handlePrintForm('tahood_hodoor', r)} className="tbl-action-btn" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', borderRadius: 8 }} title="تعهد حضور">
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified</span>
                            </button>
                            <button onClick={() => handlePrintForm('ehalat_absence', r)} className="tbl-action-btn" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', borderRadius: 8 }} title="إحالة غياب">
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>forward_to_inbox</span>
                            </button>
                            <button onClick={() => handlePrintForm('tawtheeq_tawasol', r)} className="tbl-action-btn" style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', borderRadius: 8 }} title="توثيق تواصل">
                              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>contact_phone</span>
                            </button>
                          </div>
                        </td>
                        <td>
                          <button onClick={() => setConfirmDelete(r)} style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', borderRadius: 8 }} title="حذف">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="tbl-footer">
            <div className="s"><div className="d" style={{ background: '#fee2e2', borderColor: '#fca5a5' }}></div> غائب: {cntAbsent}</div>
            <div className="s"><div className="d" style={{ background: '#fef3c7', borderColor: '#fde68a' }}></div> متأخر: {cntLate}</div>
            <div className="s" style={{ marginRight: 'auto' }}><div className="d" style={{ background: '#d1fae5' }}></div> تم: {cntSent}</div>
            <div className="s"><div className="d" style={{ background: '#fef3c7' }}></div> لم يُرسل: {filtered.length - cntSent}</div>
          </div>
        </div>
      )}

      {/* Auto-migrate note */}
      <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
        <span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>info</span> سيتم ترحيل بيانات اليوم تلقائياً إلى السجل التراكمي الساعة 12:00 صباحاً
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', background: 'rgba(31,41,55,0.95)', color: '#fff', padding: '12px 24px', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 50, backdropFilter: 'blur(8px)' }}>
          <span><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle',color:'#a7f3d0'}}>check_circle</span> <strong>{selected.size}</strong> محدد</span>
          <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.3)' }} />
          <button onClick={() => handlePrintToday()} style={{ color: '#c4b5fd', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>print</span> طباعة</button>
          <button onClick={handleSendBulk} style={{ color: '#86efac', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> إرسال</button>
          {selected.size === 1 && (() => {
            const r = filtered.find(x => selected.has(x.id));
            return r ? (<>
              <button onClick={() => handlePrintForm('tahood_hodoor', r)} style={{ color: '#fde68a', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>assignment</span> تعهد فردي</button>
              <button onClick={() => handlePrintForm('ehalat_absence', r)} style={{ color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>upload</span> إحالة فردي</button>
            </>) : null;
          })()}
          <button onClick={handleDeleteBulk} style={{ color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>delete</span> حذف</button>
          <button onClick={() => setSelected(new Set())} style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Late Modal */}
      {lateModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setLateModal(null); }}>
          <div style={{ ...modalBox, maxWidth: 380 }}>
            <div style={{ padding: '16px 20px', background: '#fef3c7', borderBottom: '1px solid #fde68a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>تعديل حالة الطالب</h3>
              <button onClick={() => setLateModal(null)} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, color: '#1f2937' }}>{lateModal.studentName}</p>
                <p style={{ fontSize: 13, color: '#6b7280' }}>{lateModal.grade} {lateModal.className}</p>
              </div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>الحالة</label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                {['غائب', 'متأخر'].map(s => (
                  <label key={s} style={{ flex: 1, cursor: 'pointer' }}>
                    <input type="radio" name="lateSt" value={s} checked={lateStatus === s} onChange={() => setLateStatus(s)} style={{ display: 'none' }} />
                    <div style={{ padding: 12, border: `2px solid ${lateStatus === s ? (s === 'غائب' ? '#ef4444' : '#f59e0b') : '#d1d5db'}`, borderRadius: 10, textAlign: 'center', background: lateStatus === s ? (s === 'غائب' ? '#fef2f2' : '#fffbeb') : '#fff' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{s === 'غائب' ? 'cancel' : 'schedule'}</span>
                      <p style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{s}</p>
                    </div>
                  </label>
                ))}
              </div>
              {lateStatus === 'متأخر' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>وقت الحضور</label>
                  <input type="time" value={lateTime} onChange={(e) => setLateTime(e.target.value)} style={{ width: '100%', padding: 10, border: '2px solid #d1d5db', borderRadius: 8 }} />
                </div>
              )}
            </div>
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setLateModal(null)} style={{ padding: '8px 16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={saveLateStatus} style={{ padding: '8px 20px', background: '#f59e0b', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Editor Modal */}
      {msgEditorRow && <AdvancedMessageEditor row={msgEditorRow} onSend={handleConfirmSend} onClose={() => setMsgEditorRow(null)} sending={sendingId === msgEditorRow.id} includeLink={includeLink} onToggleLink={() => setIncludeLink(!includeLink)} settings={settings} />}

      {/* Delete Confirm */}
      {confirmDelete && <ConfirmModal title="حذف السجل" message={`هل أنت متأكد من حذف سجل ${confirmDelete.studentName}؟`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}

      {/* Excel Preview Modal */}
      {excelPreview && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setExcelPreview(null); }}>
          <div style={{ ...modalBox, maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>visibility</span> معاينة البيانات المستوردة</h3>
              <button onClick={() => setExcelPreview(null)} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>info</span> <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>تم العثور على <strong>{excelPreview.students.length}</strong> طالب في الملف ({excelPreview.source === 'platform' ? 'منصة مدرستي' : 'نظام نور'})</span>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ background: '#f3f4f6', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#4b5563', width: 30 }}>#</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#4b5563' }}>الاسم</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#4b5563' }}>الرقم</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#4b5563' }}>النوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelPreview.students.slice(0, 20).map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px 10px', fontSize: 12, color: '#6b7280' }}>{i + 1}</td>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{s.name}</td>
                        <td style={{ padding: '6px 10px', fontSize: 12 }}>{s.studentNumber || '-'}</td>
                        <td style={{ padding: '6px 10px', fontSize: 12 }}>{s.absenceType === 'Period' ? 'حصة' : 'يوم كامل'}</td>
                      </tr>
                    ))}
                    {excelPreview.students.length > 20 && (
                      <tr><td colSpan={4} style={{ padding: 10, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>... و {excelPreview.students.length - 20} طالب آخر</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ padding: '14px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setExcelPreview(null)} style={{ padding: '8px 16px', color: '#6b7280', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>إلغاء</button>
              <button onClick={confirmExcelImport} style={{ padding: '8px 20px', background: '#16a34a', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>save</span> استيراد {excelPreview.students.length} طالب</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// Advanced Message Editor — with templates, link toggle, save/restore
// ============================================================
const AdvancedMessageEditor: React.FC<{
  row: AbsenceRow; onSend: (msg: string) => void; onClose: () => void;
  sending: boolean; includeLink: boolean; onToggleLink: () => void; settings: any;
}> = ({ row, onSend, onClose, sending, includeLink, onToggleLink, settings }) => {
  const { hijri, dayName } = getTodayDates();
  const schoolName = settings?.schoolName || 'المدرسة';
  const [excuseLink, setExcuseLink] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Load saved template
  const savedTemplate = useMemo(() => {
    try { return localStorage.getItem('absence_msg_template') || ''; } catch { return ''; }
  }, []);

  const buildMessage = useCallback((withLink: boolean, link: string) => {
    let msg = `*إشعار غياب*\n\nالسلام عليكم ورحمة الله وبركاته\nولي أمر الطالب: *${row.studentName}*\n\nنفيدكم بأن ابنكم *${row.studentName}* غائب اليوم\nالتاريخ: ${dayName} - ${hijri}\nالصف: ${row.grade} - الفصل: ${row.className}`;
    if (withLink && link) {
      msg += `\n\n*لتقديم عذر الغياب:*\nاضغط على الرابط التالي لكتابة عذر الغياب:\n${link}\nالرابط صالح لمدة ٢٤ ساعة فقط`;
    }
    msg += `\n\nمع تحيات إدارة مدرسة ${schoolName}`;
    return msg;
  }, [row, dayName, hijri, schoolName]);

  const [message, setMessage] = useState(() => {
    if (savedTemplate) {
      // Replace placeholders in template with actual data
      return savedTemplate
        .replace(/\{اسم_الطالب\}/g, row.studentName)
        .replace(/\{الصف\}/g, row.grade)
        .replace(/\{الفصل\}/g, row.className)
        .replace(/\{اليوم\}/g, dayName)
        .replace(/\{التاريخ\}/g, hijri);
    }
    return buildMessage(false, '');
  });
  const defaultMsg = useMemo(() => buildMessage(false, ''), [buildMessage]);

  const handleSaveTemplate = () => {
    // Convert current message back to template by replacing data with placeholders
    let tmpl = message;
    const replacements = [
      { val: row.studentName, key: 'اسم_الطالب' },
      { val: row.grade, key: 'الصف' },
      { val: row.className, key: 'الفصل' },
      { val: dayName, key: 'اليوم' },
      { val: hijri, key: 'التاريخ' },
    ];
    replacements.sort((a, b) => b.val.length - a.val.length);
    replacements.forEach(r => { if (r.val.trim()) tmpl = tmpl.split(r.val).join(`{${r.key}}`); });
    try { localStorage.setItem('absence_msg_template', tmpl); setTemplateSaved(true); showSuccess('تم حفظ القالب كافتراضي ✓'); } catch { showError('فشل حفظ القالب'); }
  };

  const handleResetTemplate = () => {
    try { localStorage.removeItem('absence_msg_template'); } catch { /* skip */ }
    setMessage(defaultMsg);
    setTemplateSaved(false);
    showSuccess('تم استعادة القالب الافتراضي');
  };

  // Fetch excuse link
  useEffect(() => {
    if (!includeLink || !row.studentNumber) return;
    setLoadingLink(true);
    parentExcuseApi.generateLink(row.studentNumber, row.stage).then(res => {
      const code = res.data?.data?.code || res.data?.data?.accessCode;
      if (code) {
        const link = `${BASE_URL}/parent-excuse-form?token=${code}`;
        setExcuseLink(link);
        setMessage(buildMessage(true, link));
      }
    }).catch(() => { /* skip */ }).finally(() => setLoadingLink(false));
  }, [includeLink, row.studentNumber, row.stage, buildMessage]);

  const handleToggle = () => {
    onToggleLink();
    if (includeLink) {
      // Turning off
      setMessage(buildMessage(false, ''));
    } else if (excuseLink) {
      setMessage(buildMessage(true, excuseLink));
    }
  };

  return (
    <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...modalBox, maxWidth: 520 }}>
        <div style={{ padding: '12px 20px', background: '#25d366', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>edit</span> تعديل الرسالة قبل الإرسال</h3>
          <button onClick={onClose} style={{ ...closeBtn, color: 'rgba(255,255,255,0.8)' }}>✕</button>
        </div>
        <div style={{ padding: '10px 20px', background: '#f0fdf4', borderBottom: '1px solid #d1fae5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{row.studentName}</span>
            <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>إشعار غياب</span>
          </div>
          <span style={{ fontSize: 11, color: '#9ca3af', direction: 'ltr' }}>{row.mobile || '-'}</span>
        </div>
        {/* Link Toggle */}
        <div style={{ padding: '8px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: includeLink && excuseLink ? '#f0fdf4' : '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: includeLink ? '#16a34a' : '#9ca3af' }}>link</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: includeLink ? '#15803d' : '#6b7280' }}>
              {loadingLink ? 'جاري جلب الرابط...' : (excuseLink ? 'إرفاق رابط إدخال العذر' : 'الرابط غير متاح')}
            </span>
          </div>
          <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={includeLink} onChange={handleToggle} style={{ width: 40, height: 22, appearance: 'none', background: includeLink ? '#22c55e' : '#d1d5db', borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s' }} />
          </label>
        </div>
        <div style={{ padding: 20 }}>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={14}
            style={{ width: '100%', padding: 12, border: '2px solid #d1d5db', borderRadius: 10, fontSize: 13, lineHeight: 1.7, resize: 'vertical', fontFamily: 'Traditional Arabic, Tahoma, serif', direction: 'rtl', boxSizing: 'border-box' }} />
        </div>
        <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSaveTemplate} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>bookmark</span> حفظ كقالب افتراضي</button>
            <button onClick={handleResetTemplate} style={{ padding: '6px 12px', background: '#e5e7eb', color: '#4b5563', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>refresh</span> استعادة</button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '8px 16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
            <button onClick={() => onSend(message)} disabled={sending || !message.trim()} style={{ padding: '8px 20px', background: '#25d366', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1 }}>
              {sending ? 'جاري الإرسال...' : <><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> إرسال</>}
            </button>
          </div>
        </div>
        {templateSaved && <div style={{ padding: '6px 20px', background: '#eff6ff', borderTop: '1px solid #bfdbfe', fontSize: 11, color: '#2563eb' }}><span className="material-symbols-outlined" style={{fontSize:12,verticalAlign:'middle'}}>info</span> يتم استخدام قالبك المحفوظ</div>}
      </div>
    </div>
  );
};

// ============================================================
// Excuses Tab — Full implementation matching original
// ============================================================
const ExcusesTab: React.FC<{ excuses: ParentExcuseRow[]; onRefresh: () => void; settings: any }> = ({ excuses, onRefresh, settings }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedExcuse, setSelectedExcuse] = useState<ParentExcuseRow | null>(null);
  const [rejectModal, setRejectModal] = useState<ParentExcuseRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [sendRejectMsg, setSendRejectMsg] = useState(false);
  const [messageModal, setMessageModal] = useState<ParentExcuseRow | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = excuses;
    if (statusFilter !== 'all') {
      const map: Record<string, string> = { pending: 'معلق', approved: 'مقبول', rejected: 'مرفوض' };
      list = list.filter(e => e.status === map[statusFilter]);
    }
    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const start = new Date();
      if (dateFilter === 'week') { start.setDate(now.getDate() - now.getDay()); }
      else if (dateFilter === 'month') { start.setDate(1); }
      start.setHours(0, 0, 0, 0);
      list = list.filter(e => {
        try { const d = new Date(e.submittedAt); return !isNaN(d.getTime()) && d >= start; } catch { return true; }
      });
    }
    // Sort: newest first, parent excuses first
    return [...list].sort((a, b) => {
      const da = a.submittedAt || '0000', db = b.submittedAt || '0000';
      if (da !== db) return db.localeCompare(da);
      if (a.source === 'parent' && b.source !== 'parent') return -1;
      if (b.source === 'parent' && a.source !== 'parent') return 1;
      return 0;
    });
  }, [excuses, statusFilter, dateFilter]);

  const counts = useMemo(() => ({
    all: excuses.length,
    pending: excuses.filter(e => e.status === 'معلق').length,
    approved: excuses.filter(e => e.status === 'مقبول').length,
    rejected: excuses.filter(e => e.status === 'مرفوض').length,
  }), [excuses]);

  // Group by day when week filter
  const groupedByDay = useMemo(() => {
    if (dateFilter !== 'week') return null;
    const dayOrder = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const days: Record<string, ParentExcuseRow[]> = {};
    filtered.forEach(e => {
      let dn = e.day || '';
      if (!dn) {
        try {
          const d = new Date(e.submittedAt || '');
          if (!isNaN(d.getTime())) dn = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()] || 'غير محدد';
          else dn = 'غير محدد';
        } catch { dn = 'غير محدد'; }
      }
      if (!days[dn]) days[dn] = [];
      days[dn].push(e);
    });
    const sorted: { day: string; items: ParentExcuseRow[] }[] = [];
    dayOrder.forEach(d => { if (days[d]) sorted.push({ day: d, items: days[d] }); });
    Object.keys(days).forEach(k => { if (!dayOrder.includes(k)) sorted.push({ day: k, items: days[k] }); });
    return sorted;
  }, [filtered, dateFilter]);

  // Days badge
  const getDaysBadge = (e: ParentExcuseRow) => {
    if (!e.submittedAt) return null;
    try {
      const submitted = new Date(e.submittedAt);
      const now = new Date(); now.setHours(0, 0, 0, 0); submitted.setHours(0, 0, 0, 0);
      const diff = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0 || diff > 5) return null;
      const color = diff <= 1 ? 'green' : diff <= 3 ? 'amber' : 'red';
      const colors: Record<string, { bg: string; text: string }> = {
        green: { bg: '#dcfce7', text: '#15803d' },
        amber: { bg: '#fef3c7', text: '#a16207' },
        red: { bg: '#fee2e2', text: '#dc2626' },
      };
      const label = diff === 0 ? 'اليوم' : diff === 1 ? 'أمس' : `مضى ${diff} أيام`;
      return <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, background: colors[color].bg, color: colors[color].text, display: 'inline-flex', alignItems: 'center', gap: 2 }}>{diff === 0 && <span className="material-symbols-outlined" style={{fontSize:10,verticalAlign:'middle'}}>fiber_new</span>}{label}</span>;
    } catch { return null; }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try { await parentExcuseApi.updateStatus(id, 'مقبول'); showSuccess('تم قبول العذر'); setSelectedExcuse(null); onRefresh(); }
    catch { showError('فشل'); } finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    try { await parentExcuseApi.updateStatus(rejectModal.id, 'مرفوض', rejectReason, sendRejectMsg); showSuccess('تم رفض العذر'); setRejectModal(null); setRejectReason(''); onRefresh(); }
    catch { showError('فشل'); } finally { setActionLoading(false); }
  };

  const handleSendMessage = async () => {
    if (!messageModal || !customMessage.trim()) { showError('يرجى كتابة الرسالة'); return; }
    setActionLoading(true);
    try { await parentExcuseApi.sendCustomMessage(messageModal.id, customMessage); showSuccess('تم إرسال الرسالة'); setMessageModal(null); setCustomMessage(''); }
    catch { showError('فشل الإرسال'); } finally { setActionLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('حذف هذا العذر نهائياً؟')) return;
    try { await parentExcuseApi.delete(id); showSuccess('تم الحذف'); setSelectedExcuse(null); onRefresh(); }
    catch { showError('فشل'); }
  };

  // Print excuses report
  const handlePrint = () => {
    if (filtered.length === 0) { showError('لا يوجد أعذار للطباعة'); return; }
    const { hijri, miladi } = getTodayDates();
    const withExcuse = filtered.filter(e => e.status === 'معلق' || e.status === 'مقبول');
    const rows: ListReportRow[] = withExcuse.map((e, i) => {
      const statusColor = e.status === 'معلق' ? '#d97706' : '#16a34a';
      const source = e.source === 'parent' ? 'ولي أمر' : 'يومي';
      return { cells: [
        toIndic(i + 1),
        escapeHtml(e.studentName),
        `${escapeHtml(e.grade)} / ${toIndic(e.class)}`,
        escapeHtml(e.excuseText?.substring(0, 60) || '-'),
        escapeHtml(e.absenceDate || '-'),
        `<span style="color:${statusColor};font-weight:bold">${e.status}</span>`,
        source,
      ] };
    });
    printListReport({
      title: 'كشف الأعذار المقدمة',
      dateText: `${hijri} الموافق ${miladi} م`,
      headerBg: '#7c3aed',
      headers: [
        { label: 'م', width: '5%' }, { label: 'الطالب', width: '22%' }, { label: 'الفصل', width: '10%' },
        { label: 'العذر', width: '25%' }, { label: 'تاريخ الغياب', width: '13%' }, { label: 'الحالة', width: '10%' }, { label: 'المصدر', width: '8%' },
      ],
      rows,
      summary: `إجمالي: ${toIndic(withExcuse.length)} طالب`,
    }, settings);
  };

  const statusBtns = [
    { id: 'all', label: 'الكل', count: counts.all, bg: '#f3f4f6', color: '#374151' },
    { id: 'pending', label: 'معلق', count: counts.pending, bg: '#fef3c7', color: '#a16207' },
    { id: 'approved', label: 'مقبول', count: counts.approved, bg: '#dcfce7', color: '#15803d' },
    { id: 'rejected', label: 'مرفوض', count: counts.rejected, bg: '#fee2e2', color: '#dc2626' },
  ];

  return (
    <>
      {/* Filters — مطابق: بطاقة بيضاء مع فلاتر الحالة */}
      <div className="bg-white rounded-xl" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {statusBtns.map(b => (
              <button key={b.id} onClick={() => setStatusFilter(b.id)} style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                background: statusFilter === b.id ? b.bg : '#f9fafb',
                color: statusFilter === b.id ? b.color : '#6b7280',
                border: statusFilter === b.id ? `2px solid ${b.color}` : '1px solid #e5e7eb',
              }}>
                {b.label} <span style={{ fontSize: 12, background: `${b.color}20`, padding: '1px 8px', borderRadius: 9999, marginRight: 4 }}>{b.count}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }}>
              <option value="all">كل الفترات</option>
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
            </select>
            <button onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: '#7c3aed', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{fontSize:16}}>print</span> طباعة
            </button>
            <button onClick={onRefresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: '#f9fafb', color: '#4b5563', borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{fontSize:16}}>refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Excuses list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl" style={{ textAlign: 'center', padding: '64px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 72, color: '#d1d5db' }}>assignment_late</span>
          <p style={{ color: '#6b7280', marginTop: 16, fontSize: 18 }}>لا توجد أعذار</p>
          <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 8 }}>ستظهر هنا الأعذار المقدمة من أولياء الأمور</p>
        </div>
      ) : groupedByDay ? (
        /* Grouped by day view (when week filter) */
        <div>
          {groupedByDay.map(group => (
            <div key={group.day} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7c3aed' }}>calendar_today</span>
                <h3 style={{ fontWeight: 700, color: '#7c3aed', fontSize: 14, margin: 0 }}>{group.day} <span style={{ color: '#9ca3af', fontWeight: 400 }}>({group.items.length})</span></h3>
                <div style={{ flex: 1, height: 1, background: '#e9d5ff' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                {group.items.map(excuse => <ExcuseCard key={excuse.id} excuse={excuse} getDaysBadge={getDaysBadge} onSelect={setSelectedExcuse} onApprove={handleApprove} onReject={(e) => { setRejectModal(e); setRejectReason(''); }} onMessage={(e) => { setMessageModal(e); setCustomMessage(''); }} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat grid view */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map(excuse => <ExcuseCard key={excuse.id} excuse={excuse} getDaysBadge={getDaysBadge} onSelect={setSelectedExcuse} onApprove={handleApprove} onReject={(e) => { setRejectModal(e); setRejectReason(''); }} onMessage={(e) => { setMessageModal(e); setCustomMessage(''); }} />)}
        </div>
      )}

      {/* Detail Modal */}
      {selectedExcuse && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setSelectedExcuse(null); }}>
          <div style={{ ...modalBox, maxWidth: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>assignment</span> تفاصيل العذر</h3>
              <button onClick={() => setSelectedExcuse(null)} style={closeBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, background: '#f3e8ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="material-symbols-outlined" style={{fontSize:20,color:'#7c3aed'}}>person</span></div>
                  <div>
                    <h4 style={{ fontWeight: 700, color: '#1f2937', fontSize: 16, margin: 0 }}>{selectedExcuse.studentName}</h4>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{selectedExcuse.grade} / {selectedExcuse.class}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: '#fff', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>تاريخ الغياب</span><br />
                    <strong>{selectedExcuse.absenceDate || '-'}</strong>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>الحالة</span><br />
                    <strong style={{ color: selectedExcuse.status === 'مقبول' ? '#16a34a' : selectedExcuse.status === 'مرفوض' ? '#dc2626' : '#d97706' }}>{selectedExcuse.status}</strong>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>edit</span> سبب الغياب / العذر</label>
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 16, color: '#1f2937', lineHeight: 1.6 }}>{selectedExcuse.excuseText || 'لم يُحدد'}</div>
              </div>
              {selectedExcuse.attachments !== 'لا' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{fontSize:16,color:'#1e40af'}}>attach_file</span> <div><p style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', margin: 0 }}>يوجد مرفقات</p><p style={{ fontSize: 11, color: '#3b82f6', margin: 0 }}>ستُسلم ورقياً مع الطالب</p></div>
                </div>
              )}
              <p style={{ fontSize: 11, color: '#9ca3af' }}>تاريخ التقديم: {selectedExcuse.submittedAt || '-'}</p>
            </div>
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {selectedExcuse.status === 'معلق' && (
                <>
                  <button onClick={() => handleApprove(selectedExcuse.id)} disabled={actionLoading} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>check_circle</span> قبول</button>
                  <button onClick={() => { setRejectModal(selectedExcuse); setSelectedExcuse(null); }} style={{ padding: '8px 16px', background: '#dc2626', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>cancel</span> رفض</button>
                </>
              )}
              <button onClick={() => handleDelete(selectedExcuse.id)} style={{ padding: '8px 16px', color: '#dc2626', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 12 }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>delete</span> حذف</button>
              <button onClick={() => setSelectedExcuse(null)} style={{ padding: '8px 16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}>
          <div style={{ ...modalBox, maxWidth: 420 }}>
            <div style={{ padding: '16px 20px', background: '#fee2e2', borderBottom: '1px solid #fecaca' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>رفض العذر</h3>
            </div>
            <div style={{ padding: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>سبب الرفض (اختياري)</label>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="أدخل سبب الرفض ليُرسل لولي الأمر..."
                style={{ width: '100%', padding: 10, border: '2px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 13, color: '#4b5563', cursor: 'pointer' }}>
                <input type="checkbox" checked={sendRejectMsg} onChange={() => setSendRejectMsg(!sendRejectMsg)} style={{ accentColor: '#dc2626' }} />
                إرسال رسالة لولي الأمر
              </label>
            </div>
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setRejectModal(null)} style={{ padding: '8px 16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleReject} disabled={actionLoading} style={{ padding: '8px 20px', background: '#dc2626', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>رفض</button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Message Modal */}
      {messageModal && (
        <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setMessageModal(null); }}>
          <div style={{ ...modalBox, maxWidth: 420 }}>
            <div style={{ padding: '16px 20px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>إرسال رسالة لولي الأمر</h3>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                <p style={{ fontWeight: 700, margin: 0 }}>{messageModal.studentName}</p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>ولي الأمر: {messageModal.parentName || '-'}</p>
              </div>
              <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={4} placeholder="اكتب رسالتك هنا..."
                style={{ width: '100%', padding: 10, border: '2px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setMessageModal(null)} style={{ padding: '8px 16px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
              <button onClick={handleSendMessage} disabled={actionLoading} style={{ padding: '8px 20px', background: '#2563eb', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>smartphone</span> إرسال</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// Approved Tab — Enhanced with excused filters, sort, all print types
// ============================================================
const ApprovedTab: React.FC<{ records: CumulativeRow[]; dailyRecords: AbsenceRow[]; onRefresh: () => void; settings: any }> = ({ records, dailyRecords, onRefresh, settings }) => {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortMode, setSortMode] = useState('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let list = records;
    if (gradeFilter) list = list.filter(r => r.grade === gradeFilter);
    if (classFilter) list = list.filter(r => r.className === classFilter);
    if (search) { const q = search.toLowerCase(); list = list.filter(r => r.studentName.toLowerCase().includes(q) || r.studentNumber.includes(q)); }
    // Date range filter: only show students who had absences in the range
    if (dateFrom || dateTo) {
      const studentIdsInRange = new Set(
        dailyRecords.filter(d => {
          const date = d.recordedAt?.split('T')[0] || d.hijriDate || '';
          if (dateFrom && date < dateFrom) return false;
          if (dateTo && date > dateTo) return false;
          return true;
        }).map(d => d.studentId)
      );
      list = list.filter(r => studentIdsInRange.has(r.studentId));
    }
    switch (levelFilter) {
      case 'zero': return list.filter(r => r.unexcusedDays === 0 && r.excusedDays === 0);
      case 'warning': return list.filter(r => r.unexcusedDays >= 3 && r.unexcusedDays <= 4);
      case 'danger': return list.filter(r => r.unexcusedDays >= 5 && r.unexcusedDays <= 9);
      case 'critical': return list.filter(r => r.unexcusedDays >= 10);
      case 'mo_ref': return list.filter(r => r.excusedDays >= 3 && r.excusedDays <= 4);
      case 'mo_com': return list.filter(r => r.excusedDays >= 5 && r.excusedDays <= 9);
      case 'mo_risk': return list.filter(r => r.excusedDays >= 10);
      default: return list;
    }
  }, [records, gradeFilter, classFilter, search, levelFilter, dateFrom, dateTo, dailyRecords]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortMode === 'alpha') return a.studentName.localeCompare(b.studentName, 'ar');
      const tA = a.unexcusedDays + a.excusedDays, tB = b.unexcusedDays + b.excusedDays;
      return sortMode === 'asc' ? tA - tB : tB - tA;
    });
  }, [filtered, sortMode]);

  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map(r => r.grade)))), [records]);
  const classes = useMemo(() => Array.from(new Set(records.filter(r => !gradeFilter || r.grade === gradeFilter).map(r => r.className))).sort(), [records, gradeFilter]);

  const getAttendance = (r: CumulativeRow) => Math.max(0, Math.round(((SCHOOL_DAYS - r.totalDays) / SCHOOL_DAYS) * 100));
  const getBadge = (u: number) => {
    if (u >= 10) return { text: 'حماية', color: '#dc2626', bg: '#fee2e2' };
    if (u >= 5) return { text: 'لجنة', color: '#ea580c', bg: '#ffedd5' };
    if (u >= 3) return { text: 'إنذار', color: '#ca8a04', bg: '#fef9c3' };
    return null;
  };

  const toggleSelect = (id: number) => setSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selected.size === sorted.length) setSelected(new Set()); else setSelected(new Set(sorted.map(r => r.studentId))); };
  const selectedRecords = useMemo(() => sorted.filter(r => selected.has(r.studentId)), [sorted, selected]);

  // Print functions
  const handlePrint = () => {
    if (sorted.length === 0) { showError('لا توجد بيانات'); return; }
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = sorted.map((r, i) => ({ cells: [
      toIndic(i + 1),
      escapeHtml(r.studentName),
      formatClass(r.grade, r.className),
      `<span style="font-weight:bold;color:#dc2626">${toIndic(r.unexcusedDays)}</span>`,
      `<span style="color:#2563eb">${toIndic(r.excusedDays)}</span>`,
      `<span style="font-weight:bold">${toIndic(r.totalDays)}</span>`,
      `${toIndic(getAttendance(r))}%`,
    ] }));
    printListReport({
      title: 'كشف متابعة الغياب',
      dateText: `${hijri} | العدد: ${toIndic(sorted.length)}`,
      headers: [
        { label: 'م' }, { label: 'الطالب' }, { label: 'الصف' },
        { label: 'بدون عذر' }, { label: 'بعذر' }, { label: 'الإجمالي' }, { label: 'المواظبة' },
      ],
      rows,
    }, settings);
  };

  const handlePrintDiscipline = () => {
    const disciplined = sorted.filter(r => r.unexcusedDays === 0 && r.excusedDays === 0);
    if (disciplined.length === 0) { showError('لا يوجد طلاب بصفر غياب'); return; }
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = disciplined.map((r, i) => ({ cells: [
      toIndic(i + 1), escapeHtml(r.studentName), formatClass(r.grade, r.className),
    ] }));
    printListReport({
      title: 'كشف المتميزين بالانضباط',
      dateText: hijri,
      headerBg: '#16a34a',
      headers: [
        { label: 'م', width: '8%' }, { label: 'الطالب', width: '55%' }, { label: 'الصف', width: '20%' },
      ],
      rows,
      summary: `إجمالي: ${toIndic(disciplined.length)} طالب`,
    }, settings);
  };

  const handlePrintContactReport = () => {
    const sent = sorted.filter(r => (r as any).sentCount > 0 || dailyRecords.some(d => d.studentId === r.studentId && d.isSent));
    if (sent.length === 0) { showError('لا يوجد سجلات تم إرسالها'); return; }
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = sent.map((r, i) => ({ cells: [
      toIndic(i + 1), escapeHtml(r.studentName), formatClass(r.grade, r.className),
      toIndic(r.totalDays), toIndic(r.unexcusedDays), toIndic(r.excusedDays),
      '<span style="color:green;font-weight:bold">تم</span>',
    ] }));
    printListReport({
      title: 'تقرير التواصل مع أولياء الأمور',
      dateText: hijri,
      headerBg: '#0891b2',
      headers: [
        { label: 'م' }, { label: 'الطالب' }, { label: 'الصف' },
        { label: 'إجمالي' }, { label: 'بدون عذر' }, { label: 'بعذر' }, { label: 'التواصل' },
      ],
      rows,
    }, settings);
  };

  // Print individual forms
  const handlePrintForm = (formId: FormId, r: CumulativeRow) => {
    const data: PrintFormData = {
      studentName: r.studentName, grade: `${r.grade} / ${r.className}`,
      unexcusedDays: r.unexcusedDays, excusedDays: r.excusedDays,
      violationDate: new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura'),
      violationDay: new Date().toLocaleDateString('ar-SA', { weekday: 'long' }),
    };
    printForm(formId, data, settings);
  };

  // Group print
  const handleGroupPrint = (formId: FormId) => {
    if (selectedRecords.length === 0) { showError('حدد طلاب أولاً'); return; }
    const data: PrintFormData = {
      studentsList: selectedRecords.map(s => ({ name: s.studentName, grade: s.grade, cls: s.className, unexcused: s.unexcusedDays, excused: s.excusedDays })),
    };
    printForm(formId, data, settings);
  };

  // Bulk WhatsApp
  const handleBulkSend = async () => {
    if (selectedRecords.length === 0) return;
    const studentIds = new Set(selectedRecords.map(r => r.studentId));
    const unsentIds = dailyRecords.filter(r => studentIds.has(r.studentId) && !r.isSent).map(r => r.id);
    if (unsentIds.length === 0) { showError('لا توجد سجلات غير مرسلة'); return; }
    setSending(true);
    try { const res = await absenceApi.sendWhatsAppBulk(unsentIds); if (res.data?.data) { showSuccess(`تم إرسال ${res.data.data.sentCount}`); setSelected(new Set()); onRefresh(); } }
    catch { showError('خطأ'); } finally { setSending(false); }
  };

  const filterBtns = [
    { id: 'all', label: 'الكل', bg: '#f3f4f6', color: '#374151' },
    { id: 'zero', label: 'المنضبطين', bg: '#dcfce7', color: '#15803d' },
    null, // separator
    { id: 'warning', label: 'إنذار (3-4)', bg: '#fef9c3', color: '#a16207', group: 'بدون عذر' },
    { id: 'danger', label: 'لجنة (5-9)', bg: '#ffedd5', color: '#c2410c' },
    { id: 'critical', label: 'حماية (10+)', bg: '#fee2e2', color: '#dc2626' },
    null,
    { id: 'mo_ref', label: 'إحالة موجه (3-4)', bg: '#e0f2fe', color: '#0369a1', group: 'بعذر' },
    { id: 'mo_com', label: 'لجنة توجيه (5-9)', bg: '#dbeafe', color: '#1d4ed8' },
    { id: 'mo_risk', label: 'اشتباه إهمال (10+)', bg: '#e0e7ff', color: '#4338ca' },
  ];

  return (
    <>
      {/* Toolbar — مطابق: 4 أزرار ملونة (indigo/blue/emerald/teal) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#4f46e5', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>print</span> طباعة القوائم
        </button>
        <button onClick={handleBulkSend} disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#2563eb', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>send</span> إرسال
        </button>
        <button onClick={handlePrintDiscipline} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#059669', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>upload_file</span> استيراد ملف نور
        </button>
        <button onClick={handlePrintContactReport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#0d9488', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <span className="material-symbols-outlined" style={{fontSize:16}}>contact_phone</span> تقرير التواصل
        </button>
      </div>

      {/* Filters — مطابق: بطاقة بيضاء sticky مع بحث + فلاتر + حالة */}
      <div className="bg-white rounded-xl" style={{ padding: 12, marginBottom: 16, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>search</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم..."
              style={{ width: 192, paddingRight: 36, paddingLeft: 8, height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
          </div>
          <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setClassFilter(''); }}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, background: '#f9fafb', flexShrink: 0 }}>
            <option value="">كل الصفوف</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, background: '#f9fafb', flexShrink: 0 }}>
            <option value="">كل الفصول</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}
            style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12, background: '#f9fafb', flexShrink: 0 }}>
            <option value="desc">الأكثر غياباً (تنازلي)</option><option value="asc">الأقل غياباً</option><option value="alpha">أبجدياً</option>
          </select>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2, flexShrink: 0 }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: 4, borderRadius: 4, border: 'none', cursor: 'pointer', background: viewMode === 'cards' ? '#fff' : 'transparent', color: viewMode === 'cards' ? '#4f46e5' : '#9ca3af' }}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>grid_view</span>
            </button>
            <button onClick={() => setViewMode('table')} style={{ padding: 4, borderRadius: 4, border: 'none', cursor: 'pointer', background: viewMode === 'table' ? '#fff' : 'transparent', color: viewMode === 'table' ? '#4f46e5' : '#9ca3af' }}>
              <span className="material-symbols-outlined" style={{fontSize:18}}>table_rows</span>
            </button>
          </div>
        </div>
        {/* فلاتر الحالة — 9 أزرار مع فواصل وتصنيفات */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
          <button onClick={() => setLevelFilter('all')} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'all' ? '#f3f4f6' : 'transparent', color: '#4b5563', border: '1px solid #e5e7eb' }}>الكل</button>
          <button onClick={() => setLevelFilter('zero')} style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'zero' ? '#dcfce7' : '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{fontSize:14}}>stars</span> المنضبطين
          </button>
          <span style={{ width: 1, height: 20, background: '#d1d5db' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '2px 6px', borderRadius: 4, border: '1px solid #fecaca' }}>بدون عذر:</span>
          <button onClick={() => setLevelFilter('warning')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'warning' ? '#fef9c3' : 'transparent', color: '#a16207', border: '1px solid #fde68a' }}>إنذار (3-4)</button>
          <button onClick={() => setLevelFilter('danger')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'danger' ? '#ffedd5' : 'transparent', color: '#c2410c', border: '1px solid #fdba74' }}>لجنة (5-9)</button>
          <button onClick={() => setLevelFilter('critical')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'critical' ? '#fee2e2' : 'transparent', color: '#dc2626', border: '1px solid #fca5a5' }}>حماية (10+)</button>
          <span style={{ width: 1, height: 20, background: '#d1d5db' }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: 4, border: '1px solid #bfdbfe' }}>بعذر:</span>
          <button onClick={() => setLevelFilter('mo_ref')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'mo_ref' ? '#e0f2fe' : 'transparent', color: '#0369a1', border: '1px solid #7dd3fc' }}>إحالة موجه (3-4)</button>
          <button onClick={() => setLevelFilter('mo_com')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'mo_com' ? '#dbeafe' : 'transparent', color: '#1d4ed8', border: '1px solid #93c5fd' }}>لجنة توجيه (5-9)</button>
          <button onClick={() => setLevelFilter('mo_risk')} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: levelFilter === 'mo_risk' ? '#e0e7ff' : 'transparent', color: '#4338ca', border: '1px solid #a5b4fc' }}>اشتباه إهمال (10+)</button>
        </div>
      </div>

      {/* Bulk bar — مطابق: fixed bottom full-width bg-gray-900 */}
      {selected.size > 0 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#111827', color: '#fff', padding: '12px 24px', zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#f97316' }}>{selected.size}</span>
              <span style={{ fontSize: 14, color: '#d1d5db' }}>طالب محدد</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>تاريخ النماذج (اختياري):</span>
              <input type="date" style={{ padding: '4px 8px', borderRadius: 4, background: '#1f2937', border: '1px solid #4b5563', color: '#fff', fontSize: 12 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => handleGroupPrint('group_tahood')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#059669', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>checklist</span> كشف تعهد
              </button>
              <button onClick={() => handleGroupPrint('group_ehala')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#2563eb', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>forward_to_inbox</span> كشف إحالة
              </button>
              <button onClick={() => { if (selectedRecords.length > 0) handlePrintForm('tahood_hodoor', selectedRecords[0]); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#d97706', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>person</span> تعهد فردي
              </button>
              <button onClick={() => { if (selectedRecords.length > 0) handlePrintForm('ehalat_absence', selectedRecords[0]); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#7c3aed', borderRadius: 8, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>assignment_ind</span> إحالة غياب
              </button>
              <button onClick={() => setSelected(new Set())} style={{ padding: '6px 8px', background: '#374151', borderRadius: 8, border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{fontSize:14}}>close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 72, color: '#d1d5db' }}>assignment</span>
          <p style={{ color: '#6b7280', marginTop: 12, fontSize: 16 }}>لا توجد سجلات مطابقة</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {sorted.map(r => {
            const u = r.unexcusedDays, e = r.excusedDays, l = r.lateDays;
            const att = getAttendance(r);
            const badge = getBadge(u);
            let actions: React.ReactNode[] = [];
            if (u >= 3 || e >= 3) actions.push(<button key="ref" onClick={() => handlePrintForm('ehalat_absence', r)} style={cardBtn('#3b82f6', '#eff6ff')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>upload</span> تحويل للموجه</button>);
            if (u >= 3) {
              actions.push(<button key="rec" onClick={() => handlePrintForm('ghiab_bidon_ozr', r)} style={cardBtn('#4b5563', '#f9fafb')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>assignment</span> سجل بدون عذر</button>);
              actions.push(<button key="com" onClick={() => handlePrintForm('tahood_hodoor', r)} style={cardBtn('#16a34a', '#dcfce7')}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>check_circle</span> نموذج عذر</button>);
            }
            if (e >= 3) actions.push(<button key="exc" onClick={() => handlePrintForm('ghiab_ozr', r)} style={cardBtn('#0891b2', '#ecfeff')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>assignment</span> سجل بعذر</button>);
            if (u >= 5) actions.push(<button key="laj" onClick={() => handlePrintForm('mahdar_lajnah_absence', r)} style={cardBtn('#7c3aed', '#f3e8ff')}><span className="material-symbols-outlined" style={{fontSize:16,verticalAlign:'middle'}}>groups</span> لجنة توجيه</button>);

            return (
              <div key={r.studentId} style={{ background: '#fff', borderRadius: 14, border: `2px solid ${badge ? badge.color + '40' : '#e5e7eb'}`, padding: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: att >= 95 ? '#16a34a' : att >= 90 ? '#ca8a04' : '#dc2626' }}>%{att}</span>
                </div>
                {badge && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, padding: '2px 8px', borderRadius: 10, border: `1px solid ${badge.color}40` }}>{badge.text}</span>}
                <div style={{ marginTop: 32, marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{r.studentName}</h3>
                  <p style={{ fontSize: 12, color: '#6b7280' }}>{r.grade}/{r.className}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center', marginBottom: 12 }}>
                  <div><p style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{u}</p><p style={{ fontSize: 9, color: '#6b7280' }}>بدون عذر</p></div>
                  <div><p style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>{e}</p><p style={{ fontSize: 9, color: '#6b7280' }}>بعذر</p></div>
                  <div><p style={{ fontSize: 18, fontWeight: 800, color: '#f59e0b' }}>{l}</p><p style={{ fontSize: 9, color: '#6b7280' }}>تأخر</p></div>
                </div>
                {actions.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{actions}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: 8, width: 30 }}><input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll} /></th>
              <th style={{ padding: 8, textAlign: 'right' }}>الطالب</th><th style={{ padding: 8 }}>الصف</th>
              <th style={{ padding: 8, textAlign: 'center', color: '#dc2626', width: 60 }}>بدون عذر</th>
              <th style={{ padding: 8, textAlign: 'center', color: '#2563eb', width: 60 }}>بعذر</th>
              <th style={{ padding: 8, textAlign: 'center', width: 60 }}>المواظبة</th>
              <th style={{ padding: 8, textAlign: 'center', width: 70 }}>إجراء</th>
            </tr></thead>
            <tbody>
              {sorted.map(r => {
                const att = getAttendance(r);
                let action = '-';
                if (r.unexcusedDays >= 10) action = 'حماية';
                else if (r.unexcusedDays >= 5) action = 'لجنة';
                else if (r.unexcusedDays >= 3) action = 'تعهد';
                return (
                  <tr key={r.studentId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: 8 }}><input type="checkbox" checked={selected.has(r.studentId)} onChange={() => toggleSelect(r.studentId)} /></td>
                    <td style={{ padding: 8, fontWeight: 700 }}>{r.studentName}</td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.grade} / {r.className}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: r.unexcusedDays > 0 ? '#dc2626' : '#d1d5db' }}>{r.unexcusedDays}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: r.excusedDays > 0 ? '#2563eb' : '#d1d5db' }}>{r.excusedDays}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontWeight: 700, color: att >= 95 ? '#16a34a' : att >= 90 ? '#ca8a04' : '#dc2626', fontSize: 12 }}>%{att}</td>
                    <td style={{ padding: 8, textAlign: 'center', fontSize: 11, fontWeight: 700, color: r.unexcusedDays >= 10 ? '#dc2626' : r.unexcusedDays >= 5 ? '#ea580c' : r.unexcusedDays >= 3 ? '#ca8a04' : '#9ca3af' }}>{action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

// ============================================================
// Reports Tab — Enhanced with grade/class filters
// ============================================================
const ReportsTab: React.FC<{ records: AbsenceRow[]; cumulativeRecords: CumulativeRow[]; settings: any }> = ({ records, cumulativeRecords, settings }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const grades = useMemo(() => sortGrades(Array.from(new Set(records.map(r => r.grade)))), [records]);
  const classes = useMemo(() => Array.from(new Set(records.filter(r => !gradeFilter || r.grade === gradeFilter).map(r => r.className))).sort(), [records, gradeFilter]);

  const filteredRecords = useMemo(() => {
    let list = records;
    if (gradeFilter) list = list.filter(r => r.grade === gradeFilter);
    if (classFilter) list = list.filter(r => r.className === classFilter);
    if (typeFilter) list = list.filter(r => typeFilter === 'Excused' ? r.excuseType === 'Excused' : r.excuseType === 'Unexcused');
    if (dateFrom) list = list.filter(r => r.hijriDate >= dateFrom);
    if (dateTo) list = list.filter(r => r.hijriDate <= dateTo);
    return list;
  }, [records, dateFrom, dateTo, gradeFilter, classFilter, typeFilter]);

  const unexcusedCount = filteredRecords.filter(r => r.excuseType === 'Unexcused').length;
  const excusedCount = filteredRecords.filter(r => r.excuseType === 'Excused').length;
  const lateCount = filteredRecords.filter(r => r.tardinessStatus === 'متأخر').length;

  const byDay = useMemo(() => {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const map: Record<string, number> = {};
    days.forEach(d => map[d] = 0);
    filteredRecords.forEach(r => { if (r.dayName && map[r.dayName] !== undefined) map[r.dayName]++; });
    return days.map(d => ({ day: d, count: map[d] }));
  }, [filteredRecords]);

  const byClass = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => { const k = `${r.grade} (${r.className})`; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [filteredRecords]);
  const maxByClass = Math.max(...byClass.map(c => c.count), 1);

  const topStudents = useMemo(() => {
    return [...cumulativeRecords].sort((a, b) => b.totalDays - a.totalDays).slice(0, 15);
  }, [cumulativeRecords]);

  const handlePrint = () => {
    const { hijri } = getTodayDates();
    const rows: ListReportRow[] = topStudents.map((s, i) => ({ cells: [
      toIndic(i + 1), escapeHtml(s.studentName), formatClass(s.grade, s.className),
      `<span style="color:#dc2626;font-weight:bold">${toIndic(s.unexcusedDays)}</span>`,
      `<span style="color:#2563eb">${toIndic(s.excusedDays)}</span>`,
      `<span style="font-weight:bold">${toIndic(s.totalDays)}</span>`,
    ] }));
    printListReport({
      title: 'تقرير الغياب',
      dateText: hijri,
      statsBar: `إجمالي: ${toIndic(filteredRecords.length)} | بدون عذر: ${toIndic(unexcusedCount)} | بعذر: ${toIndic(excusedCount)}`,
      headers: [
        { label: '#' }, { label: 'الطالب' }, { label: 'الصف' },
        { label: 'بدون عذر' }, { label: 'بعذر' }, { label: 'الإجمالي' },
      ],
      rows,
    }, settings);
  };

  return (
    <>
      {/* Filters — مطابق: بطاقة بيضاء مع labels */}
      <div className="bg-white rounded-xl" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>الصف</label>
            <select value={gradeFilter} onChange={(e) => { setGradeFilter(e.target.value); setClassFilter(''); }} style={{ width: 160, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, height: 40 }}><option value="">كل الصفوف</option>{grades.map(g => <option key={g} value={g}>{g}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>الفصل</label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ width: 160, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, height: 40 }}><option value="">كل الفصول</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>من تاريخ</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, height: 40 }} /></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>إلى تاريخ</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, height: 40 }} /></div>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4 }}>نوع الغياب</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 144, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, height: 40 }}><option value="">الكل</option><option value="Excused">بعذر</option><option value="Unexcused">بدون عذر</option></select></div>
          <button onClick={handlePrint} style={{ height: 40, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', background: '#7c3aed', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
            <span className="material-symbols-outlined" style={{fontSize:18}}>print</span> طباعة
          </button>
        </div>
      </div>

      {/* Stats cards — مطابق: border-r-4 ملون */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'إجمالي الغياب', value: filteredRecords.length, color: '#ea580c', borderColor: '#f97316' },
          { label: 'بدون عذر', value: unexcusedCount, color: '#dc2626', borderColor: '#ef4444' },
          { label: 'بعذر', value: excusedCount, color: '#2563eb', borderColor: '#3b82f6' },
          { label: 'تأخير', value: lateCount, color: '#d97706', borderColor: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl" style={{ padding: 20, borderRight: `4px solid ${s.borderColor}` }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* By Day — مطابق لتصميم v22: خلفية برتقالية + أرقام كبيرة + خط سفلي للأعلى */}
      {byDay.some(d => d.count > 0) && (() => {
        const max = Math.max(...byDay.map(x => x.count), 1);
        const total = byDay.reduce((s, d) => s + d.count, 0);
        return (
          <div style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', borderRadius: 12, border: '1px solid #fed7aa', padding: 20, marginBottom: 20 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ea580c' }}>calendar_today</span> الغياب حسب اليوم
            </h4>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {byDay.map(d => {
                const isMax = d.count === max && d.count > 0;
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <div key={d.day} style={{ textAlign: 'center', padding: 16, background: '#fff', borderRadius: 12, minWidth: 80, border: isMax ? '2px solid #ea580c' : '1px solid #e5e7eb', position: 'relative' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: isMax ? '#ea580c' : '#15803d' }}>{d.count}</div>
                    <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginTop: 2 }}>{d.day}</div>
                    {pct > 0 && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{pct}%</div>}
                    {isMax && <div style={{ position: 'absolute', bottom: -1, left: '25%', right: '25%', height: 3, background: '#ea580c', borderRadius: '3px 3px 0 0' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* By Class */}
      {byClass.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ea580c' }}>apartment</span> الغياب حسب الفصل
          </h4>
          {byClass.slice(0, 10).map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ width: 120, fontSize: 13, fontWeight: 600, color: '#4b5563' }}>{c.name}</span>
              <div style={{ flex: 1, height: 20, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ width: `${(c.count / maxByClass) * 100}%`, height: '100%', background: '#ea580c', borderRadius: 6 }} />
              </div>
              <span style={{ width: 30, fontSize: 13, fontWeight: 700 }}>{c.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Top Students — مطابق لتصميم v22: أرقام دائرية + بادجات أيام */}
      {topStudents.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#ea580c' }}>trending_up</span>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>أكثر الطلاب غياباً</h4>
          </div>
          <div style={{ padding: '8px 0' }}>
            {topStudents.map((s, i) => {
              const badgeColors = ['#16a34a', '#16a34a', '#16a34a', '#ca8a04', '#ca8a04', '#ea580c', '#ea580c', '#dc2626', '#dc2626', '#dc2626'];
              const bc = badgeColors[Math.min(i, badgeColors.length - 1)];
              return (
                <div key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < topStudents.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: bc, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#1f2937' }}>{s.studentName}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>{s.grade} / {s.className}</span>
                  </div>
                  <span style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', borderRadius: 10, fontSize: 12, fontWeight: 700, border: '1px solid #fecaca' }}>{s.totalDays} يوم</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

// ============================================================
// Excuse Card Component (extracted for reuse in grouped/flat views)
// ============================================================
const ExcuseCard: React.FC<{
  excuse: ParentExcuseRow;
  getDaysBadge: (e: ParentExcuseRow) => React.ReactNode;
  onSelect: (e: ParentExcuseRow) => void;
  onApprove: (id: number) => void;
  onReject: (e: ParentExcuseRow) => void;
  onMessage: (e: ParentExcuseRow) => void;
}> = ({ excuse, getDaysBadge, onSelect, onApprove, onReject, onMessage }) => {
  const isPending = excuse.status === 'معلق';
  const isApproved = excuse.status === 'مقبول';
  const statusColor = isPending ? '#f59e0b' : isApproved ? '#22c55e' : '#ef4444';
  const statusIconName = isPending ? 'hourglass_empty' : isApproved ? 'check_circle' : 'cancel';
  const isParent = excuse.source === 'parent';
  const daysBadge = getDaysBadge(excuse);
  return (
    <div onClick={() => onSelect(excuse)}
      style={{ background: '#fff', borderRadius: 14, border: `2px solid ${statusColor}30`, padding: 16, cursor: 'pointer', position: 'relative', transition: 'box-shadow 0.2s' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{statusIconName}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>{excuse.status}</span>
      </div>
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4 }}>
        {daysBadge}
        <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, background: isParent ? '#f3e8ff' : '#f3f4f6', color: isParent ? '#7c3aed' : '#6b7280', border: `1px solid ${isParent ? '#d8b4fe' : '#d1d5db'}` }}>{isParent ? 'ولي أمر' : 'يومي'}</span>
        {excuse.attachments !== 'لا' && <span style={{ padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}><span className="material-symbols-outlined" style={{fontSize:10,verticalAlign:'middle'}}>attach_file</span> مرفق</span>}
      </div>
      <div style={{ marginTop: 36, marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, color: '#1f2937', fontSize: 14, lineHeight: 1.4 }}>{excuse.studentName}</h3>
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{excuse.grade} / {excuse.class}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 8, textAlign: 'center' }}><p style={{ fontSize: 11, fontWeight: 700, color: '#1f2937' }}>{excuse.absenceDate || '-'}</p><p style={{ fontSize: 9, color: '#6b7280' }}>التاريخ</p></div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 8, textAlign: 'center' }}><p style={{ fontSize: 11, fontWeight: 700, color: '#1f2937' }}>{excuse.day || '-'}</p><p style={{ fontSize: 9, color: '#6b7280' }}>اليوم</p></div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: 8, textAlign: 'center' }}><p style={{ fontSize: 11, fontWeight: 700, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{excuse.excuseText?.substring(0, 20) || '-'}</p><p style={{ fontSize: 9, color: '#6b7280' }}>العذر</p></div>
      </div>
      {isPending && (
        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onApprove(excuse.id)} style={{ flex: 1, padding: '6px 8px', background: '#dcfce7', color: '#15803d', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #bbf7d0', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>check_circle</span> قبول</button>
          <button onClick={() => onReject(excuse)} style={{ flex: 1, padding: '6px 8px', background: '#fee2e2', color: '#dc2626', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #fecaca', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>cancel</span> رفض</button>
          <button onClick={() => onMessage(excuse)} style={{ flex: 1, padding: '6px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 8, fontSize: 11, fontWeight: 700, border: '1px solid #bfdbfe', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{fontSize:14,verticalAlign:'middle'}}>chat</span> رسالة</button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Shared Components
// ============================================================
const StatCard: React.FC<{ label: string; value: number; color: string; icon?: string }> = ({ label, value, color, icon }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
    {icon && <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>{icon}</span>}
    <span style={{ fontSize: 26, fontWeight: 800, color }}>{value}</span>
    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{label}</span>
  </div>
);

const FilterBtn: React.FC<{ label: string; count: number; active: boolean; onClick: () => void; color: string }> = ({ label, count, active, onClick, color }) => (
  <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, background: active ? '#fff' : 'transparent', color: active ? color : '#6b7280', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}>
    {label} <span style={{ fontSize: 11, color: active ? color : '#9ca3af' }}>({count})</span>
  </button>
);

const ConfirmModal: React.FC<{ title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ title, message, onConfirm, onCancel }) => (
  <div style={modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
    <div style={{ ...modalBox, maxWidth: 400, padding: 24 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: '0 0 24px', color: '#4b5563' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button onClick={onCancel} style={{ padding: '8px 16px', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer' }}>إلغاء</button>
        <button onClick={onConfirm} style={{ padding: '8px 24px', background: '#dc2626', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}>تأكيد</button>
      </div>
    </div>
  </div>
);

const ImportDropdown: React.FC<{ onNoor: () => void; onPlatform: () => void }> = ({ onNoor, onPlatform }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`dropdown-wrapper${open ? ' open' : ''}`}>
      <button className="btn-hero btn-hero-primary" onClick={() => setOpen(!open)}>
        <span className="material-symbols-outlined" style={{fontSize:18}}>upload_file</span> استيراد <span className="material-symbols-outlined" style={{fontSize:16}}>expand_more</span>
      </button>
      <div className="dropdown-menu">
        <button className="dropdown-item" onClick={() => { onNoor(); setOpen(false); }}>
          <span className="material-symbols-outlined">cloud_upload</span> استيراد Excel (نور)
        </button>
        <button className="dropdown-item" onClick={() => { onPlatform(); setOpen(false); }}>
          <span className="material-symbols-outlined">table_view</span> استيراد منصة (Excel)
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Add Absence Modal
// ============================================================
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const PERIODS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];

const AddAbsenceModal: React.FC<{ stages: StageConfigData[]; onClose: () => void; onSaved: () => void }> = ({ onClose, onSaved }) => {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [absenceType, setAbsenceType] = useState('FullDay');
  const [saving, setSaving] = useState(false);

  useEffect(() => { studentsApi.getAll().then(res => { if (res.data?.data) setStudents(res.data.data); }); }, []);

  const grades = useMemo(() => {
    const g = [...new Set(students.map(s => s.grade))];
    return g.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students]);

  const classes = useMemo(() => {
    if (!selectedGrade) return [];
    const c = [...new Set(students.filter(s => s.grade === selectedGrade).map(s => s.className))];
    return c.sort((a, b) => a.localeCompare(b, 'ar'));
  }, [students, selectedGrade]);

  const classStudents = useMemo(() => {
    if (!selectedGrade || !selectedClass) return [];
    return students.filter(s => s.grade === selectedGrade && s.className === selectedClass);
  }, [students, selectedGrade, selectedClass]);

  const handleGradeChange = (g: string) => {
    setSelectedGrade(g);
    setSelectedClass('');
    setSelectedStudents(new Set());
  };

  const handleClassChange = (c: string) => {
    setSelectedClass(c);
    setSelectedStudents(new Set());
  };

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleSave = async () => {
    if (selectedStudents.size === 0) return showError('يرجى اختيار طالب واحد على الأقل');
    setSaving(true);
    try {
      const ids = Array.from(selectedStudents);
      if (ids.length === 1) {
        const data: AbsenceData = { studentId: ids[0], absenceType, period: '', dayName: '', notes: '' };
        const res = await absenceApi.add(data);
        if (res.data?.success) { showSuccess('تم تسجيل الغياب'); onSaved(); } else showError(res.data?.message || 'فشل');
      } else {
        const res = await absenceApi.addBatch(ids, { absenceType, period: '', dayName: '', notes: '' });
        if (res.data?.data) { showSuccess(res.data.data.message || 'تم'); onSaved(); } else showError(res.data?.message || 'فشل');
      }
    } catch { showError('فشل التسجيل'); }
    finally { setSaving(false); }
  };

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalBox, maxWidth: 520 }}>
        {/* Header — bg-orange-50 + event_busy icon */}
        <div style={{ padding: '16px 24px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#1f2937' }}>
            <span className="material-symbols-outlined" style={{ color: '#ea580c', fontSize: 22 }}>event_busy</span> تسجيل غياب يدوي
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Grade + Class — grid-cols-2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>الصف</label>
              <select value={selectedGrade} onChange={(e) => handleGradeChange(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">اختر الصف</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>الفصل</label>
              <select value={selectedClass} onChange={(e) => handleClassChange(e.target.value)} disabled={!selectedGrade}
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
                <option value="">اختر الفصل</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* Students — checkboxes list max-h-48 */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>الطلاب</label>
            <div style={{ maxHeight: 192, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, background: '#f9fafb' }}>
              {classStudents.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
                  {!selectedGrade ? 'اختر الصف والفصل أولاً' : !selectedClass ? 'اختر الفصل' : 'لا يوجد طلاب'}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {classStudents.map(s => (
                    <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: selectedStudents.has(s.id) ? '#fff7ed' : 'transparent' }}>
                      <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)}
                        style={{ width: 16, height: 16, accentColor: '#ea580c', cursor: 'pointer' }} />
                      <span style={{ fontSize: 14 }}>{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Absence type — dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 4 }}>نوع الغياب</label>
            <select value={absenceType} onChange={(e) => setAbsenceType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}>
              <option value="FullDay">يوم كامل</option>
              <option value="Period">حصة</option>
            </select>
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', color: '#374151', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>إلغاء</button>
          <button onClick={handleSave} disabled={saving || selectedStudents.size === 0}
            style={{ padding: '8px 24px', background: '#ea580c', color: '#fff', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Shared styles
// ============================================================
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: '#fff', borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', overflow: 'hidden' };
const closeBtn: React.CSSProperties = { padding: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af' };
const selectStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '2px solid #d1d5db', fontSize: 13, background: '#fff' };

function btnStyle(color: string, outline = false): React.CSSProperties {
  return outline
    ? { padding: '6px 14px', background: '#fff', color, borderRadius: 8, border: `2px solid ${color}30`, fontWeight: 700, cursor: 'pointer', fontSize: 12 }
    : { padding: '6px 14px', background: color, color: '#fff', borderRadius: 8, border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12, boxShadow: `0 2px 8px ${color}40` };
}

function miniBtn(color: string): React.CSSProperties {
  return { padding: '4px 6px', background: `${color}10`, color, borderRadius: 6, border: `1px solid ${color}30`, cursor: 'pointer', fontSize: 12, lineHeight: 1 };
}

function cardBtn(color: string, bg: string): React.CSSProperties {
  return { flex: 1, padding: '5px 6px', background: bg, color, borderRadius: 8, fontSize: 10, fontWeight: 700, border: `1px solid ${color}30`, cursor: 'pointer', textAlign: 'center' as const };
}

export default AbsencePage;
