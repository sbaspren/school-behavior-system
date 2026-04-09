import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StageConfigData } from '../api/settings';
import { useAppContext } from './useAppContext';

// ═══ كود مشترك للصفحات الرئيسية ═══
// بدل ما كل صفحة تكرر نفس الكود، هذا الملف يوفر كل شيء مشترك

interface UsePageDataOptions<T> {
  /** دالة جلب السجلات من الخادم */
  fetchRecords: (stageId?: string) => Promise<{ data?: { data?: T[] } }>;
  /** هل نحتاج إعدادات المدرسة؟ */
  needsSettings?: boolean;
  /** دوال إضافية تُنفذ مع التحميل */
  extraLoaders?: (currentStageId?: string) => Promise<Record<string, any>>;
  /** هل الفلترة تعتمد على الخادم (يعيد التحميل عند تغيير المرحلة)؟ */
  serverSideFilter?: boolean;
}

interface UsePageDataReturn<T> {
  /** السجلات المحملة */
  records: T[];
  /** تعيين السجلات يدوياً */
  setRecords: React.Dispatch<React.SetStateAction<T[]>>;
  /** المراحل المفعلة */
  stages: StageConfigData[];
  /** حالة التحميل */
  loading: boolean;
  /** إعدادات المدرسة */
  schoolSettings: Record<string, string>;
  /** فلتر المرحلة الحالي */
  stageFilter: string;
  /** تغيير فلتر المرحلة */
  setStageFilter: (filter: string) => void;
  /** المراحل المفعلة فقط (فيها صفوف وفصول) */
  enabledStages: StageConfigData[];
  /** معرف المرحلة الحالية (للخادم) */
  currentStageId: string | undefined;
  /** السجلات المفلترة حسب المرحلة */
  filteredByStage: T[];
  /** سجلات اليوم فقط */
  todayRecords: T[];
  /** إعادة تحميل البيانات */
  refresh: () => void;
  /** بيانات إضافية من extraLoaders */
  extraData: Record<string, any>;
}

export function usePageData<T extends { stage?: string; recordedAt?: string; hijriDate?: string }>(
  options: UsePageDataOptions<T>
): UsePageDataReturn<T> {
  const { fetchRecords, needsSettings = true, extraLoaders, serverSideFilter = false } = options;

  const appCtx = useAppContext();

  // ★ تثبيت مرجع الدوال لمنع حلقة useCallback/useEffect اللانهائية
  // السبب: fetchRecords و extraLoaders تُنشأ كدوال جديدة في كل render
  // مما يغيّر هوية loadData ويعيد تنفيذ useEffect باستمرار
  const fetchRef = useRef(fetchRecords);
  fetchRef.current = fetchRecords;
  const extraRef = useRef(extraLoaders);
  extraRef.current = extraLoaders;

  const [records, setRecords] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, string>>({});
  const [extraData, setExtraData] = useState<Record<string, any>>({});

  // Stage filter now comes from central context
  const stageFilter = appCtx.activeStage;
  const setStageFilter = appCtx.setActiveStage;

  // المراحل من السياق المركزي (بدل تكرار الجلب)
  const stages = appCtx.stages;
  const enabledStages = appCtx.enabledStages;

  // معرف المرحلة الحالية — always set from context activeStage
  const currentStageId = useMemo(() => {
    if (!stageFilter) return undefined;
    return stageFilter;
  }, [stageFilter]);

  // تحميل البيانات — isInitial يمنع شاشة التحميل عند التحديث
  const initialLoadDone = useRef(false);
  const loadData = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      // ★ الحل الجذري: مرر المرحلة دائماً — السيرفر يرجع فقط بيانات المرحلة المختارة
      const result = await fetchRef.current(currentStageId);

      // السجلات
      if (result.data?.data) setRecords(result.data.data);

      // Use context data instead of re-fetching
      if (needsSettings) setSchoolSettings(appCtx.schoolSettings);

      // بيانات إضافية
      if (extraRef.current) {
        const extra = await extraRef.current(currentStageId);
        setExtraData(extra);
      }
    } catch { /* empty */ }
    finally { setLoading(false); initialLoadDone.current = true; }
  }, [needsSettings, currentStageId, appCtx.schoolSettings]);

  useEffect(() => { loadData(); }, [loadData]);

  // فلترة حسب المرحلة (في الواجهة)
  const filteredByStage = useMemo(() => {
    if (!stageFilter || serverSideFilter) return records;
    return records.filter((r) => r.stage === stageFilter);
  }, [records, stageFilter, serverSideFilter]);

  // سجلات اليوم — نقارن بالتاريخ الهجري بتوقيت الرياض لتجنب انحراف UTC/GMT+3
  const todayHijriKey = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        timeZone: 'Asia/Riyadh',
      }).formatToParts(new Date());
      const y = (parts.find(p => p.type === 'year')?.value ?? '').replace(/[^\d]/g, '');
      const m = (parts.find(p => p.type === 'month')?.value ?? '').replace(/[^\d]/g, '').padStart(2, '0');
      const d = (parts.find(p => p.type === 'day')?.value ?? '').replace(/[^\d]/g, '').padStart(2, '0');
      return `${y}/${m}/${d}`; // يطابق تنسيق الخادم: "1447/09/02"
    } catch {
      // احتياطي: UTC (قد يختلف ساعات عن توقيت الرياض)
      return new Date().toISOString().split('T')[0];
    }
  }, []);
  const todayRecords = useMemo(() =>
    filteredByStage.filter((r) =>
      r.hijriDate ? r.hijriDate === todayHijriKey : r.recordedAt?.startsWith(todayHijriKey)
    ),
    [filteredByStage, todayHijriKey]
  );

  return {
    records, setRecords, stages, loading, schoolSettings,
    stageFilter, setStageFilter, enabledStages, currentStageId,
    filteredByStage, todayRecords, refresh: loadData, extraData,
  };
}

/** حساب التاريخ الهجري */
export function getHijriDate(): string {
  try {
    return new Date().toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return ''; }
}
