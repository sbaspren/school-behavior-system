import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FilterBtn from '../components/shared/FilterBtn';
import { dashboardApi } from '../api/dashboard';
import { SETTINGS_STAGES, CLASS_LETTERS } from '../utils/constants';
import { useAppContext } from '../hooks/useAppContext';
import { classToLetter } from '../utils/printUtils';

// ═══════ Types ═══════
interface TodayStats {
  absence: number; tardiness: number; permissions: number;
  permissionsOut: number; permissionsWaiting: number;
  violations: number; notes: number; pendingExcuses: number;
}
interface StageStatsItem {
  absence: number; tardiness: number; permissions: number;
  violations: number; notes: number;
}
interface PendingItem { name: string; violation?: string; type?: string; detail?: string; teacher?: string; grade?: string; cls?: string; degree?: number; date?: string; stage?: string; }
interface NotSentData { absence: number; tardiness: number; violations: number; }
interface AbsenceClassItem { stage: string; grade: string; className: string; count: number; }
interface RecentItem { type: string; teacher: string; detail: string; student: string; cls: string; recordedAt: string; stage: string; section: string; actionTaken: boolean; }
interface NeedsPrintItem { type: string; name: string; studentId: number; detail: string; degree: number; grade: string; cls: string; date: string; stage: string; section: string; neededForms?: string[]; }
interface TopViolator { studentId: number; studentName: string; studentNumber: string; grade: string; className: string; count: number; totalDeduction: number; }
interface CalendarEvent { d: number; m: number; label: string; type: string; holiday: boolean; }
interface SemesterInfo { name: string; start: number[]; end: number[]; weeks: number; }

interface DashboardData {
  hijriDate: string;
  today: TodayStats;
  stageStats: Record<string, StageStatsItem>;
  pending: {
    violationsNoAction: PendingItem[];
    notesPending: PendingItem[];
    notSent: NotSentData;
    notSentByStage: Record<string, NotSentData>;
  };
  absenceByClass: AbsenceClassItem[];
  recentActivity: RecentItem[];
  semesterTotals: { violations: number; absence: number; permissions: number; tardiness: number; };
  needsPrinting: NeedsPrintItem[];
  students: { total: number };
  violations: { total: number; totalDeduction: number; byDegree: { degree: number; count: number }[] };
  topViolators: TopViolator[];
}

// ═══════ Constants ═══════
const STAT_CARDS = [
  { key: 'absence', icon: 'event_busy', label: 'غياب اليوم', color: '#f97316', bg: '#fff7ed' },
  { key: 'tardiness', icon: 'timer_off', label: 'تأخر صباحي', color: '#ef4444', bg: '#fef2f2' },
  { key: 'permissions', icon: 'exit_to_app', label: 'استئذان', color: '#8b5cf6', bg: '#faf5ff' },
  { key: 'violations', icon: 'gavel', label: 'مخالفات', color: '#3b82f6', bg: '#eff6ff' },
  { key: 'notes', icon: 'menu_book', label: 'ملاحظات', color: '#22c55e', bg: '#f0fdf4' },
  { key: 'pendingExcuses', icon: 'family_restroom', label: 'أعذار', color: '#f59e0b', bg: '#fffbeb' },
];

const SEMESTER_DATES: { name: string; start: number[]; end: number[]; weeks: number; events: { week: number; label: string; type: string }[] }[] = [
  {
    name: 'الفصل الأول', start: [2025, 7, 24], end: [2026, 0, 8], weeks: 18,
    events: [
      { week: 5, label: 'اليوم الوطني', type: 'national' },
      { week: 5, label: 'يوم المعلم', type: 'event' },
      { week: 8, label: 'إجازة إضافية', type: 'holiday' },
      { week: 13, label: 'إجازة الخريف', type: 'holiday' },
      { week: 16, label: 'إجازة إضافية', type: 'holiday' },
      { week: 17, label: 'اللغة العربية', type: 'event' },
    ]
  },
  {
    name: 'الفصل الثاني', start: [2026, 0, 18], end: [2026, 5, 25], weeks: 18,
    events: [
      { week: 1, label: 'يوم التعليم', type: 'event' },
      { week: 5, label: 'يوم التأسيس', type: 'national' },
      { week: 7, label: 'عيد الفطر', type: 'holiday' },
      { week: 8, label: 'يوم العلم', type: 'national' },
      { week: 12, label: 'يوم الصحة', type: 'event' },
      { week: 17, label: 'عيد الأضحى', type: 'holiday' },
    ]
  }
];

const EVENTS_DATA: CalendarEvent[] = [
  { d: 24, m: 8, label: 'بداية العام الدراسي', type: 'event', holiday: false },
  { d: 23, m: 9, label: 'إجازة اليوم الوطني', type: 'national', holiday: true },
  { d: 5, m: 10, label: 'يوم المعلم العالمي', type: 'event', holiday: false },
  { d: 12, m: 10, label: 'إجازة إضافية', type: 'holiday', holiday: true },
  { d: 16, m: 10, label: 'يوم الغذاء العالمي', type: 'event', holiday: false },
  { d: 16, m: 11, label: 'اليوم العالمي للتسامح', type: 'event', holiday: false },
  { d: 20, m: 11, label: 'اليوم العالمي للطفل', type: 'event', holiday: false },
  { d: 21, m: 11, label: 'بداية إجازة الخريف', type: 'holiday', holiday: true },
  { d: 3, m: 12, label: 'اليوم العالمي لذوي الإعاقة', type: 'event', holiday: false },
  { d: 11, m: 12, label: 'إجازة إضافية', type: 'holiday', holiday: true },
  { d: 18, m: 12, label: 'اليوم العالمي للغة العربية', type: 'event', holiday: false },
  { d: 9, m: 1, label: 'بداية إجازة منتصف العام', type: 'holiday', holiday: true },
  { d: 18, m: 1, label: 'بداية الفصل الثاني', type: 'event', holiday: false },
  { d: 24, m: 1, label: 'اليوم الدولي للتعليم', type: 'event', holiday: false },
  { d: 22, m: 2, label: 'يوم التأسيس السعودي', type: 'national', holiday: true },
  { d: 6, m: 3, label: 'بداية إجازة عيد الفطر', type: 'holiday', holiday: true },
  { d: 28, m: 3, label: 'نهاية إجازة عيد الفطر', type: 'event', holiday: false },
  { d: 11, m: 3, label: 'يوم العلم السعودي', type: 'national', holiday: false },
  { d: 7, m: 4, label: 'اليوم العالمي للصحة', type: 'event', holiday: false },
  { d: 22, m: 5, label: 'بداية إجازة عيد الأضحى', type: 'holiday', holiday: true },
  { d: 1, m: 6, label: 'نهاية إجازة عيد الأضحى', type: 'event', holiday: false },
  { d: 25, m: 6, label: 'بداية إجازة نهاية العام', type: 'holiday', holiday: true },
];

// ═══════ جدول حصص المعلمين ═══════
// المفتاح: "يوم_حصة" — 0=أحد..4=خميس — الحصة 1..7
// القيمة: مصفوفة [اسم المعلم, الفصل, المادة, "م"|"ث"]
const SCHEDULE_DATA: Record<string, string[][]> = {"0_1":[["إبراهيم العاصمي","1ث-أ","الكفايات اللغوية","ث"],["ابراهيم الدريمي","1م-أ","الإسلامية","م"],["احمد الهلالي","3ث-أ","الدراسات النفسية","ث"],["تركي العصيمي","2م-أ","البدنية","م"],["توفيق فايع","1ث-ب","التربية البدنية","ث"],["طارق الأحمري","2ث-أ","الإنجليزية","ث"],["عبدالعزيز رفدان","3ث-ب","الأرض والفضاء","ث"],["عبدالله الحيدي","1م-ب","الإنجليزية","م"],["محمد البشري","2م-ب","الإسلامية","م"],["محمد ابوطالب","3م-أ","الإنجليزية","م"],["محمد أبوحذيفة","2ث-ب","الكيمياء","ث"],["محمد الغرابي","3م-ب","العلوم","م"]],"0_2":[["إبراهيم العاصمي","3ث-أ","الدراسات الأدبية","ث"],["احمد الهلالي","3ث-ب","الدراسات النفسية","ث"],["تركي العصيمي","1م-ب","البدنية","م"],["توفيق فايع","1ث-أ","التربية البدنية","ث"],["خالد آل ماطر","2ث-ب","الرياضيات","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["عبدالله الحيدي","1م-أ","الإنجليزية","م"],["على فايع","3م-ب","العربية","م"],["محمد الأحمري","1ث-ب","المعرفة المالية","ث"],["محمد البشري","2م-أ","الإسلامية","م"],["محمد أبوحذيفة","2ث-أ","الكيمياء","ث"],["محمد الغرابي","3م-أ","العلوم","م"]],"0_3":[["ابراهيم الدريمي","1م-ب","الإسلامية","م"],["تركي العصيمي","3م-ب","البدنية","م"],["سعد آل مداوي","2م-أ","الرياضيات","م"],["طارق الأحمري","2ث-ب","الإنجليزية","ث"],["عبدالرحمن زامل","2م-ب","العلوم","م"],["عبدالله التيهاني","3ث-ب","الحياتية","ث"],["على فايع","3م-أ","العربية","م"],["محمد ال شيبان","3ث-أ","الفقه","ث"],["محمد الأحمري","1ث-أ","المعرفة المالية","ث"],["محمد آل عيسى","1ث-ب","الإنجليزية","ث"],["مسفر الوادعي","1م-أ","العربية","م"],["موسى سعيد","2ث-أ","الفنون","ث"]],"0_4":[["احمد حفاف","3ث-ب","رياضيات","ث"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["خالد الشهراني","1ث-ب","الدراسات الاجتماعية","ث"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["سعيد آل فايع","3ث-أ","انجليزي","ث"],["عامر آل مضواح","1ث-أ","الرياضيات","ث"],["عبدالرحمن زامل","2م-أ","العلوم","م"],["على فايع","1م-ب","العربية","م"],["علي الشهري","2ث-أ","الأحياء","ث"],["محمد زامل","3م-أ","الإسلامية","م"],["مسفر الوادعي","2م-ب","العربية","م"],["موسى سعيد","2ث-ب","الفنون","ث"]],"0_5":[["احمد حفاف","3ث-أ","رياضيات","ث"],["خالد آل ماطر","2ث-أ","الرياضيات","ث"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["سعيد آل فايع","3ث-ب","انجليزي","ث"],["عامر آل مضواح","1ث-ب","الرياضيات","ث"],["عبدالله مشبب","2م-ب","الاجتماعية","م"],["عبدالله التيهاني","1م-أ","الاجتماعية","م"],["علي الشهري","2ث-ب","الأحياء","ث"],["محمد آل فرحان","3م-أ","الاجتماعية","م"],["محمد آل عيسى","1ث-أ","الإنجليزية","ث"],["محمد ابوطالب","3م-ب","الإنجليزية","م"],["مسفر الوادعي","2م-أ","العربية","م"]],"0_6":[["احمد حفاف","3م-أ","الرياضيات","م"],["حاتم سعد","1ث-أ","التقنية الرقمية","ث"],["خالد الشهراني","3ث-ب","الجغرافيا","ث"],["سعيد آل مبارك","2ث-أ","التوحيد","ث"],["عبدالله مشبب","2م-أ","الاجتماعية","م"],["عبدالله التيهاني","1م-ب","الاجتماعية","م"],["عبدالله آل حموض","2ث-ب","التقنية الرقمية","ث"],["محمد ال شيبان","1ث-ب","الحديث","ث"],["محمد المالكي","2م-ب","الرقمية","م"],["محمد آل فرحان","3ث-أ","المواطنة الرقمية","ث"],["محمد ال مسلط","1م-أ","العلوم","م"],["موسى سعيد","3م-ب","الفنية","م"]],"0_7":[["حاتم سعد","3م-أ","الرقمية","م"],["خالد الشهراني","1ث-أ","الدراسات الاجتماعية","ث"],["سعيد آل مبارك","2ث-ب","التوحيد","ث"],["سعيد آل فايع","2م-ب","الإنجليزية","م"],["عايض الساكتي","1ث-ب","الفيزياء","ث"],["عبدالله آل حموض","2ث-أ","التقنية الرقمية","ث"],["علي ابو فايده","3ث-ب","فيزياء","ث"],["علي آل ماطر","3ث-أ","فيزياء","ث"],["محمد المالكي","2م-أ","الرقمية","م"],["محمد زامل","3م-ب","الإسلامية","م"],["محمد ال مسلط","1م-ب","العلوم","م"],["موسى سعيد","1م-أ","الفنية","م"]],"1_1":[["تركي العصيمي","2م-ب","البدنية","م"],["توفيق فايع","2ث-أ","الصحية","ث"],["خالد الشهراني","3ث-أ","الجغرافيا","ث"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["سعيد آل فايع","3ث-ب","انجليزي","ث"],["عايض الساكتي","1ث-ب","الفيزياء","ث"],["عبدالله مشبب","2م-أ","الاجتماعية","م"],["عبدالله آل حموض","2ث-ب","التقنية الرقمية","ث"],["محمد ال شيبان","1ث-أ","الحديث","ث"],["محمد المالكي","1م-ب","الرقمية","م"],["محمد آل فرحان","3م-ب","الاجتماعية","م"],["محمد ابوطالب","3م-أ","الإنجليزية","م"]],"1_2":[["احمد حفاف","3ث-أ","رياضيات","ث"],["تركي العصيمي","1م-أ","البدنية","م"],["توفيق فايع","2ث-ب","الصحية","ث"],["حاتم سعد","1ث-ب","التقنية الرقمية","ث"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["خالد الشهراني","3ث-ب","الجغرافيا","ث"],["سعد آل مداوي","2م-أ","الرياضيات","م"],["عايض الساكتي","1ث-أ","الفيزياء","ث"],["عبدالله التيهاني","1م-ب","الاجتماعية","م"],["عبدالله آل حموض","2ث-أ","التقنية الرقمية","ث"],["على فايع","3م-أ","العربية","م"],["موسى سعيد","2م-ب","الفنية","م"]],"1_3":[["إبراهيم العاصمي","1ث-ب","الكفايات اللغوية","ث"],["احمد حفاف","3ث-ب","رياضيات","ث"],["تركي العصيمي","3م-أ","البدنية","م"],["خالد آل ماطر","2ث-ب","الرياضيات","ث"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["سعيد آل مبارك","2ث-أ","التوحيد","ث"],["سعيد آل فايع","2م-ب","الإنجليزية","م"],["على فايع","3م-ب","العربية","م"],["علي آل ماطر","3ث-أ","فيزياء","ث"],["محمد المالكي","1م-أ","الرقمية","م"],["محمد آل عيسى","1ث-أ","الإنجليزية","ث"],["موسى سعيد","2م-أ","الفنية","م"]],"1_4":[["إبراهيم العاصمي","1ث-أ","الكفايات اللغوية","ث"],["احمد حفاف","3م-أ","الرياضيات","م"],["حاتم سعد","3م-ب","الرقمية","م"],["خالد آل ماطر","2ث-أ","الرياضيات","ث"],["سعيد آل فايع","3ث-أ","انجليزي","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["عبدالله التيهاني","1م-أ","الاجتماعية","م"],["محمد آل فرحان","3ث-ب","المواطنة الرقمية","ث"],["محمد آل عيسى","1ث-ب","الإنجليزية","ث"],["محمد البشري","2م-أ","الإسلامية","م"],["محمد أبوحذيفة","2ث-ب","الكيمياء","ث"],["محمد ال مسلط","1م-ب","العلوم","م"]],"1_5":[["عامر آل مضواح","1ث-ب","الرياضيات","ث"],["عبدالعزيز رفدان","3ث-أ","الأرض والفضاء","ث"],["على فايع","1م-ب","العربية","م"],["علي ابو فايده","3ث-ب","فيزياء","ث"],["محمد الأحمري","1ث-أ","التربية المهنية","ث"],["محمد زامل","3م-ب","الإسلامية","م"],["محمد البشري","2م-ب","الإسلامية","م"],["محمد أبوحذيفة","2ث-أ","الكيمياء","ث"],["محمد ال مسلط","1م-أ","العلوم","م"],["محمد الغرابي","3م-أ","العلوم","م"],["مسفر الوادعي","2م-أ","العربية","م"],["موسى سعيد","2ث-ب","الفنون","ث"]],"1_6":[["إبراهيم العاصمي","3ث-ب","الدراسات الأدبية","ث"],["ابراهيم الدريمي","1م-أ","الإسلامية","م"],["احمد الهلالي","3ث-أ","الدراسات النفسية","ث"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["طارق الأحمري","2ث-ب","الإنجليزية","ث"],["عامر آل مضواح","1ث-أ","الرياضيات","ث"],["عبدالرحمن زامل","2م-أ","العلوم","م"],["عبدالله الحيدي","1م-ب","الإنجليزية","م"],["علي الشهري","2ث-أ","الأحياء","ث"],["محمد الأحمري","1ث-ب","التربية المهنية","ث"],["مسفر الوادعي","2م-ب","العربية","م"],["موسى سعيد","3م-أ","الفنية","م"]],"1_7":[["ابراهيم الدريمي","1م-ب","الإسلامية","م"],["احمد حسن","3ث-أ","مهارات إدارية","ث"],["حاتم سعد","1ث-أ","التقنية الرقمية","ث"],["حسن مسفر","1ث-ب","علم البيئة","ث"],["طارق الأحمري","2ث-أ","الإنجليزية","ث"],["عبدالرحمن زامل","2م-ب","العلوم","م"],["عبدالعزيز رفدان","3ث-ب","الأرض والفضاء","ث"],["عبدالله الحيدي","2م-أ","الإنجليزية","م"],["علي الشهري","2ث-ب","الأحياء","ث"],["محمد زامل","3م-أ","الإسلامية","م"],["محمد الغرابي","3م-ب","العلوم","م"],["مسفر الوادعي","1م-أ","العربية","م"]],"2_1":[["ابراهيم الدريمي","1م-ب","الإسلامية","م"],["خالد الشهراني","1ث-ب","الدراسات الاجتماعية","ث"],["سعيد آل مبارك","3ث-ب","الفقه","ث"],["طارق الأحمري","2ث-ب","الإنجليزية","ث"],["عبدالله مشبب","2م-أ","الاجتماعية","م"],["عبدالله الحيدي","1م-أ","الإنجليزية","م"],["علي الشهري","2ث-أ","الأحياء","ث"],["محمد ال شيبان","3ث-أ","الفقه","ث"],["محمد الأحمري","1ث-أ","المعرفة المالية","ث"],["محمد زامل","3م-ب","الإسلامية","م"],["محمد البشري","2م-ب","الإسلامية","م"],["محمد الغرابي","3م-أ","العلوم","م"]],"2_2":[["ابراهيم الدريمي","1م-أ","الإسلامية","م"],["احمد حسن","3ث-أ","مهارات إدارية","ث"],["احمد الهلالي","3م-ب","التفكير الناقد","م"],["خالد الشهراني","1ث-أ","الدراسات الاجتماعية","ث"],["طارق الأحمري","2ث-أ","الإنجليزية","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["عايض الساكتي","1ث-ب","الفيزياء","ث"],["عبدالله الحيدي","1م-ب","الإنجليزية","م"],["علي ابو فايده","3ث-ب","فيزياء","ث"],["علي الشهري","2ث-ب","الأحياء","ث"],["محمد زامل","3م-أ","الإسلامية","م"],["محمد البشري","2م-أ","الإسلامية","م"]],"2_3":[["إبراهيم العاصمي","3ث-أ","الدراسات الأدبية","ث"],["احمد حفاف","3م-أ","الرياضيات","م"],["احمد الهلالي","3ث-ب","الدراسات النفسية","ث"],["حسن مسفر","1ث-أ","علم البيئة","ث"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["عامر آل مضواح","1ث-ب","الرياضيات","ث"],["عبدالله مشبب","2م-ب","الاجتماعية","م"],["عبدالله التيهاني","1م-أ","الاجتماعية","م"],["عبدالله الحيدي","2م-أ","الإنجليزية","م"],["محمد أبوحذيفة","2ث-ب","الكيمياء","ث"],["محمد الغرابي","3م-ب","العلوم","م"],["موسى سعيد","2ث-أ","الفنون","ث"]],"2_4":[["إبراهيم العاصمي","1ث-ب","الكفايات اللغوية","ث"],["احمد حفاف","3م-أ","الرياضيات","م"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["سعد آل مداوي","2م-أ","الرياضيات","م"],["عبدالله مشبب","3ث-أ","الحياتية","ث"],["عبدالله آل حموض","2ث-ب","التقنية الرقمية","ث"],["محمد آل فرحان","3ث-ب","المواطنة الرقمية","ث"],["محمد آل عيسى","1ث-أ","الإنجليزية","ث"],["محمد أبوحذيفة","2ث-أ","الكيمياء","ث"],["محمد ال مسلط","1م-ب","العلوم","م"],["مسفر الوادعي","1م-أ","العربية","م"],["موسى سعيد","2م-ب","الفنية","م"]],"2_5":[["توفيق فايع","2ث-أ","الصحية","ث"],["حاتم سعد","1ث-ب","التقنية الرقمية","ث"],["خالد آل ماطر","2ث-ب","الرياضيات","ث"],["عامر آل مضواح","1ث-أ","الرياضيات","ث"],["عبدالرحمن زامل","2م-أ","العلوم","م"],["عبدالعزيز رفدان","3ث-ب","الأرض والفضاء","ث"],["عبدالله التيهاني","1م-ب","الاجتماعية","م"],["علي آل ماطر","3ث-أ","فيزياء","ث"],["محمد المالكي","1م-أ","الرقمية","م"],["محمد آل فرحان","3م-ب","حياتية","م"],["محمد ابوطالب","3م-أ","الإنجليزية","م"],["مسفر الوادعي","2م-ب","العربية","م"]],"2_6":[["احمد حفاف","3ث-ب","رياضيات","ث"],["تركي العصيمي","3م-ب","البدنية","م"],["توفيق فايع","2ث-ب","الصحية","ث"],["حاتم سعد","1ث-أ","التقنية الرقمية","ث"],["خالد آل ماطر","2ث-أ","الرياضيات","ث"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["سعيد آل فايع","3ث-أ","انجليزي","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["على فايع","3م-أ","العربية","م"],["محمد آل عيسى","1ث-ب","الإنجليزية","ث"],["مسفر الوادعي","2م-أ","العربية","م"],["موسى سعيد","1م-ب","الفنية","م"]],"2_7":[["تركي العصيمي","2م-أ","البدنية","م"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["سعيد آل فايع","2م-ب","الإنجليزية","م"],["على فايع","1م-ب","العربية","م"],["محمد آل فرحان","3م-أ","حياتية","م"],["محمد ابوطالب","3م-ب","الإنجليزية","م"]],"3_1":[["احمد الهلالي","3م-أ","التفكير الناقد","م"],["تركي العصيمي","2م-ب","البدنية","م"],["توفيق فايع","1ث-ب","التربية البدنية","ث"],["سعيد آل مبارك","2ث-ب","التوحيد","ث"],["عايض الساكتي","1ث-أ","الفيزياء","ث"],["عبدالله التيهاني","1م-أ","حياتية","م"],["عبدالله آل حموض","2ث-أ","التقنية الرقمية","ث"],["علي ابو فايده","3ث-ب","فيزياء","ث"],["علي آل ماطر","3ث-أ","فيزياء","ث"],["محمد المالكي","2م-أ","الرقمية","م"],["محمد زامل","3م-ب","الإسلامية","م"],["موسى سعيد","1م-ب","الفنية","م"]],"3_2":[["احمد حفاف","3ث-أ","رياضيات","ث"],["تركي العصيمي","3م-أ","البدنية","م"],["توفيق فايع","2ث-أ","الصحية","ث"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["سعيد آل فايع","2م-ب","الإنجليزية","م"],["عبدالرحمن زامل","2م-أ","العلوم","م"],["عبدالله التيهاني","3ث-ب","الحياتية","ث"],["محمد المالكي","1م-ب","الرقمية","م"],["محمد الأحمري","1ث-أ","التربية المهنية","ث"],["محمد آل عيسى","1ث-ب","الإنجليزية","ث"],["محمد أبوحذيفة","2ث-ب","الكيمياء","ث"],["محمد ال مسلط","1م-أ","العلوم","م"]],"3_3":[["سعد آل مداوي","2م-أ","الرياضيات","م"],["سعيد آل فايع","3ث-ب","انجليزي","ث"],["عامر آل مضواح","1ث-أ","الرياضيات","ث"],["عبدالعزيز رفدان","3ث-أ","الأرض والفضاء","ث"],["على فايع","1م-ب","العربية","م"],["علي الشهري","2ث-ب","الأحياء","ث"],["محمد آل فرحان","3م-ب","الاجتماعية","م"],["محمد الأحمري","1ث-ب","التربية المهنية","ث"],["محمد زامل","3م-أ","الإسلامية","م"],["محمد أبوحذيفة","2ث-أ","الكيمياء","ث"],["مسفر الوادعي","2م-ب","العربية","م"],["موسى سعيد","1م-أ","الفنية","م"]],"3_4":[["ابراهيم الدريمي","1م-ب","الإسلامية","م"],["احمد حسن","3ث-ب","مهارات إدارية","ث"],["احمد حفاف","3م-أ","الرياضيات","م"],["خالد آل ماطر","2ث-ب","الرياضيات","ث"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["طارق الأحمري","2ث-أ","الإنجليزية","ث"],["عامر آل مضواح","1ث-ب","الرياضيات","ث"],["عبدالرحمن زامل","2م-ب","العلوم","م"],["عبدالله مشبب","3ث-أ","الحياتية","ث"],["محمد آل عيسى","1ث-أ","الإنجليزية","ث"],["مسفر الوادعي","2م-أ","العربية","م"],["موسى سعيد","3م-ب","الفنية","م"]],"3_5":[["إبراهيم العاصمي","3ث-ب","الدراسات الأدبية","ث"],["حسن مسفر","1ث-أ","علم البيئة","ث"],["خالد آل ماطر","2ث-أ","الرياضيات","ث"],["خالد الشهراني","3ث-أ","الجغرافيا","ث"],["طارق الأحمري","2ث-ب","الإنجليزية","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["عبدالله مشبب","2م-أ","حياتية","م"],["عبدالله الحيدي","1م-ب","الإنجليزية","م"],["على فايع","3م-ب","العربية","م"],["محمد ال شيبان","1ث-ب","الحديث","ث"],["محمد ابوطالب","3م-أ","الإنجليزية","م"],["مسفر الوادعي","1م-أ","العربية","م"]],"3_6":[["ابراهيم الدريمي","1م-أ","الإسلامية","م"],["حاتم سعد","1ث-ب","التقنية الرقمية","ث"],["خالد الشهراني","1ث-أ","الدراسات الاجتماعية","ث"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["عبدالله آل حموض","2ث-ب","النشاط","ث"],["عبدالله الحيدي","2م-أ","الإنجليزية","م"],["على فايع","3م-أ","العربية","م"],["علي ابو فايده","3ث-ب","النشاط","ث"],["علي الشهري","2ث-أ","النشاط","ث"],["علي آل ماطر","3ث-أ","النشاط","ث"],["محمد البشري","2م-ب","الإسلامية","م"],["محمد ابوطالب","3م-ب","الإنجليزية","م"]],"3_7":[["حاتم سعد","3م-أ","الرقمية","م"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["عبدالله مشبب","2م-ب","الاجتماعية","م"],["عبدالله الحيدي","1م-أ","الإنجليزية","م"],["محمد البشري","2م-أ","الإسلامية","م"],["محمد الغرابي","3م-ب","العلوم","م"]],"4_1":[["إبراهيم العاصمي","1ث-أ","الكفايات اللغوية","ث"],["ابراهيم الدريمي","1م-ب","الإسلامية","م"],["عبدالله آل حموض","2ث-أ","التقنية الرقمية","ث"],["عبدالله الحيدي","1م-أ","الإنجليزية","م"],["علي ابو فايده","3ث-ب","فيزياء","ث"],["محمد المالكي","2م-ب","الرقمية","م"],["محمد آل فرحان","3ث-أ","المواطنة الرقمية","ث"],["محمد الأحمري","1ث-ب","المعرفة المالية","ث"],["محمد البشري","2م-أ","الإسلامية","م"],["محمد ابوطالب","3م-ب","الإنجليزية","م"],["محمد أبوحذيفة","2ث-ب","الكيمياء","ث"],["موسى سعيد","3م-أ","الفنية","م"]],"4_2":[["إبراهيم العاصمي","1ث-ب","الكفايات اللغوية","ث"],["ابراهيم الدريمي","1م-أ","الإسلامية","م"],["احمد حسن","3ث-ب","مهارات إدارية","ث"],["خالد آل ماطر","2ث-ب","الرياضيات","ث"],["سعد آل مداوي","1م-ب","الرياضيات","م"],["عبدالله مشبب","2م-ب","حياتية","م"],["عبدالله الحيدي","2م-أ","الإنجليزية","م"],["على فايع","3م-ب","العربية","م"],["علي آل ماطر","3ث-أ","فيزياء","ث"],["محمد ال شيبان","1ث-أ","الحديث","ث"],["محمد آل فرحان","3م-أ","الاجتماعية","م"],["محمد أبوحذيفة","2ث-أ","الكيمياء","ث"]],"4_3":[["احمد حفاف","3ث-ب","رياضيات","ث"],["توفيق فايع","2ث-ب","الصحية","ث"],["خالد آل ماطر","3م-ب","الرياضيات","م"],["خالد الشهراني","1ث-ب","الدراسات الاجتماعية","ث"],["سعد آل مداوي","1م-أ","الرياضيات","م"],["سعيد آل فايع","3ث-أ","انجليزي","ث"],["طارق الأحمري","2ث-أ","الإنجليزية","ث"],["عامر آل مضواح","1ث-أ","الرياضيات","ث"],["على فايع","1م-ب","العربية","م"],["محمد البشري","2م-ب","الإسلامية","م"],["محمد الغرابي","3م-أ","العلوم","م"],["موسى سعيد","2م-أ","الفنية","م"]],"4_4":[["احمد حفاف","3م-أ","الرياضيات","م"],["احمد الهلالي","3م-ب","التفكير الناقد","م"],["تركي العصيمي","1م-أ","البدنية","م"],["توفيق فايع","1ث-أ","التربية البدنية","ث"],["حسن مسفر","1ث-ب","علم البيئة","ث"],["خالد آل ماطر","2ث-أ","الرياضيات","ث"],["سعيد آل فايع","3ث-ب","انجليزي","ث"],["عامر آل مضواح","2م-ب","الرياضيات","م"],["عبدالعزيز رفدان","3ث-أ","الأرض والفضاء","ث"],["عبدالله آل حموض","2ث-ب","التقنية الرقمية","ث"],["محمد ال مسلط","1م-ب","العلوم","م"],["مسفر الوادعي","2م-أ","العربية","م"]],"4_5":[["احمد حفاف","3ث-أ","رياضيات","ث"],["احمد الهلالي","3م-أ","التفكير الناقد","م"],["تركي العصيمي","1م-ب","البدنية","م"],["سعد آل مداوي","2م-أ","الرياضيات","م"],["سعيد آل مبارك","3ث-ب","الفقه","ث"],["طارق الأحمري","2ث-ب","الإنجليزية","ث"],["عامر آل مضواح","1ث-ب","الرياضيات","ث"],["علي الشهري","2ث-أ","الأحياء","ث"],["محمد آل عيسى","1ث-أ","الإنجليزية","ث"],["محمد زامل","3م-ب","الإسلامية","م"],["محمد ال مسلط","1م-أ","العلوم","م"],["مسفر الوادعي","2م-ب","العربية","م"]],"4_6":[["حاتم سعد","3م-ب","الرقمية","م"],["سعد آل مداوي","2م-أ","الرياضيات","م"],["عايض الساكتي","1ث-أ","الفيزياء","ث"],["عبدالرحمن زامل","2م-ب","العلوم","م"],["عبدالله التيهاني","1م-ب","حياتية","م"],["عبدالله آل حموض","2ث-ب","النشاط","ث"],["علي ابو فايده","3ث-ب","النشاط","ث"],["علي الشهري","2ث-أ","النشاط","ث"],["علي آل ماطر","3ث-أ","النشاط","ث"],["محمد آل عيسى","1ث-ب","الإنجليزية","ث"],["محمد زامل","3م-أ","الإسلامية","م"],["مسفر الوادعي","1م-أ","العربية","م"]],"4_7":[["ابراهيم الدريمي","1م-ب","النشاط","م"],["حاتم سعد","3م-أ","النشاط","م"],["عبدالرحمن زامل","2م-ب","النشاط","م"],["محمد المالكي","2م-أ","النشاط","م"],["محمد ابوطالب","3م-ب","النشاط","م"],["محمد ال مسلط","1م-أ","النشاط","م"]]};

// ═══════ توقيت الحصص ═══════
interface PeriodTiming { p: number; s: string; e: string; }
const TIMING_REGULAR: Record<string, PeriodTiming[]> = {
  'م': [{p:1,s:'7:30',e:'8:15'},{p:2,s:'8:15',e:'9:00'},{p:3,s:'9:00',e:'9:45'},{p:4,s:'10:05',e:'10:50'},{p:5,s:'10:50',e:'11:35'},{p:6,s:'11:35',e:'12:20'},{p:7,s:'12:30',e:'13:15'}],
  'ث': [{p:1,s:'7:30',e:'8:15'},{p:2,s:'8:15',e:'9:00'},{p:3,s:'9:20',e:'10:05'},{p:4,s:'10:05',e:'10:50'},{p:5,s:'10:50',e:'11:35'},{p:6,s:'11:35',e:'12:20'},{p:7,s:'12:20',e:'13:05'}],
};
const TIMING_RAMADAN: Record<string, PeriodTiming[]> = {
  'م': [{p:1,s:'9:30',e:'10:05'},{p:2,s:'10:05',e:'10:40'},{p:3,s:'10:40',e:'11:15'},{p:4,s:'11:15',e:'11:50'},{p:5,s:'11:50',e:'12:25'},{p:6,s:'12:45',e:'13:20'},{p:7,s:'13:20',e:'13:55'}],
  'ث': [{p:1,s:'9:30',e:'10:05'},{p:2,s:'10:05',e:'10:40'},{p:3,s:'10:40',e:'11:15'},{p:4,s:'11:15',e:'11:50'},{p:5,s:'11:50',e:'12:25'},{p:6,s:'12:25',e:'13:00'},{p:7,s:'13:20',e:'13:55'}],
};

function isRamadan(): boolean {
  try {
    const now = new Date();
    const hijriStr = now.toLocaleDateString('en-u-ca-islamic-umalqura', { month: 'numeric' });
    const hijriMonth = parseInt(hijriStr.match(/\d+/)?.[0] || '0');
    return hijriMonth === 9;
  } catch {
    return false;
  }
}

function getCurrentTiming() { return isRamadan() ? TIMING_RAMADAN : TIMING_REGULAR; }

function timeToMin(t: string): number {
  const p = t.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function getCurrentPeriod(stageKey: string): PeriodTiming | null {
  const timing = getCurrentTiming();
  const stg = stageKey === 'Secondary' ? 'ث' : 'م';
  const periods = timing[stg];
  if (!periods || periods.length === 0) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  for (const p of periods) {
    const s = timeToMin(p.s), e = timeToMin(p.e);
    if (nowMin >= s && nowMin < e) return p;
  }
  for (const p of periods) {
    if (nowMin < timeToMin(p.s)) return p;
  }
  return periods[periods.length - 1];
}

function getTimeRemaining(period: PeriodTiming): string {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMin(period.s);
  const endMin = timeToMin(period.e);
  if (nowMin < startMin) return `تبدأ بعد ${startMin - nowMin} د`;
  const rem = endMin - nowMin;
  if (rem <= 0) return 'انتهت';
  return `باقي ${rem} د`;
}

function getNextEvent(): { ev: CalendarEvent; days: number } | null {
  const now = new Date();
  let best: { ev: CalendarEvent; days: number } | null = null;
  let bestDiff = 999;
  for (const e of EVENTS_DATA) {
    const evDate = new Date(now.getFullYear(), e.m - 1, e.d);
    const diff = Math.ceil((evDate.getTime() - now.getTime()) / 86400000);
    if (diff >= 0 && diff < bestDiff) { bestDiff = diff; best = { ev: e, days: diff }; }
  }
  return best;
}

function getScheduleForPeriod(dayIdx: number, periodNum: number, stageAbbr?: string): string[][] {
  const key = `${dayIdx}_${periodNum}`;
  const rows = SCHEDULE_DATA[key] || [];
  if (stageAbbr) return rows.filter(r => r[3] === stageAbbr);
  return rows;
}

// ═══════ Helpers ═══════
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'صباح الخير' : 'مساء الخير';
}

function getSemesterProgress() {
  const now = new Date();
  for (let i = 0; i < SEMESTER_DATES.length; i++) {
    const s = SEMESTER_DATES[i];
    const start = new Date(s.start[0], s.start[1], s.start[2]);
    const end = new Date(s.end[0], s.end[1], s.end[2]);
    if (now >= start && now <= end) {
      const total = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      const pct = Math.min(100, Math.round((elapsed / total) * 100));
      const remaining = Math.ceil((end.getTime() - now.getTime()) / 86400000);
      const week = Math.max(1, Math.min(s.weeks, Math.floor((now.getTime() - start.getTime()) / (7 * 86400000)) + 1));
      return { name: s.name, pct, remaining, semIdx: i, week, weeks: s.weeks };
    }
  }
  for (let j = 0; j < SEMESTER_DATES.length; j++) {
    const ns = new Date(SEMESTER_DATES[j].start[0], SEMESTER_DATES[j].start[1], SEMESTER_DATES[j].start[2]);
    if (ns > now) {
      const d2n = Math.ceil((ns.getTime() - now.getTime()) / 86400000);
      return { name: `إجازة — ${SEMESTER_DATES[j].name} بعد ${d2n} يوم`, pct: 100, remaining: d2n, semIdx: j > 0 ? j - 1 : 0, week: 18, weeks: 18 };
    }
  }
  return { name: 'انتهى العام', pct: 100, remaining: 0, semIdx: 1, week: 18, weeks: 18 };
}

// Section-to-route mapping for navigation
const SECTION_ROUTES: Record<string, string> = {
  'violations': '/violations', 'absence': '/absence', 'educational-notes': '/notes',
  'tardiness': '/tardiness', 'permissions': '/permissions', 'positive': '/positive',
};
const STAGE_ABBR: Record<string, string> = { 'EarlyChildhood': 'طم', 'Primary': 'اب', 'Intermediate': 'مت', 'Secondary': 'ثا' };

// ═══════ Main Component ═══════
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { stages, enabledStages, activeStage: stageFilter } = useAppContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timelineSem, setTimelineSem] = useState(() => getSemesterProgress().semIdx);
  const [dismissedPrints, setDismissedPrints] = useState<Set<string>>(new Set());

  const initialLoadDone = useRef(false);
  const loadData = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
    try {
      const dRes = await dashboardApi.get(stageFilter || undefined);
      if (dRes.data?.data) setData(dRes.data.data);
    } catch { /* empty */ }
    finally { setLoading(false); initialLoadDone.current = true; }
  }, [stageFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const timer = setInterval(loadData, 120000);
    return () => clearInterval(timer);
  }, [loadData]);

  const stageLabel = (id: string) => SETTINGS_STAGES.find(s => s.id === id)?.name || id;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>جاري التحميل...</div>;
  }

  if (!data) {
    return <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>لا توجد بيانات</div>;
  }

  const now = new Date();
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  let hijriStr = '';
  try { hijriStr = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { /* empty */ }
  let miladiStr = '';
  try { miladiStr = now.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { /* empty */ }

  const curStageStats = stageFilter ? (data.stageStats?.[stageFilter] || {} as StageStatsItem) : ({} as StageStatsItem);
  const defaultNotSent = { absence: 0, tardiness: 0, violations: 0 };
  const notSent = stageFilter
    ? (data.pending?.notSentByStage?.[stageFilter] || defaultNotSent)
    : (data.pending?.notSent || defaultNotSent);
  const totalNotSent = (notSent.absence || 0) + (notSent.tardiness || 0) + (notSent.violations || 0);

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Responsive CSS + Hover Effects */}
      <style>{`
        .dash-stats-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        .dash-stat-card{transition:transform .15s ease,box-shadow .15s ease}
        .dash-stat-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.08)}
        .dash-attention-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .dash-attention-row>div{transition:transform .15s ease,box-shadow .15s ease}
        .dash-attention-row>div:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.08)}
        .dash-row4{display:grid;grid-template-columns:55% 45%;gap:20px}
        .dash-row5{display:grid;grid-template-columns:280px 1fr;gap:20px}
        @media(max-width:1100px){
          .dash-stats-grid{grid-template-columns:repeat(3,1fr)}
          .dash-attention-row{grid-template-columns:repeat(2,1fr)}
          .dash-row4{grid-template-columns:1fr}
          .dash-row5{grid-template-columns:1fr 1fr}
        }
        @media(max-width:700px){
          .dash-stats-grid{grid-template-columns:repeat(2,1fr)}
          .dash-attention-row{grid-template-columns:1fr}
          .dash-row5{grid-template-columns:1fr}
          .dash-row4{grid-template-columns:1fr}
        }
      `}</style>
      {/* ═══════ Row 1: Greeting + Date ═══════ */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#1a1d2e', lineHeight: 1.4, margin: 0 }}>
            {getGreeting()}، <span style={{ background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>وكيل شؤون الطلاب</span>
          </h2>
          <p style={{ fontSize: 13, color: '#9da3b8', marginTop: 4, fontWeight: 500 }}>
            {stageLabel(stageFilter)}
          </p>
        </div>

        {/* Date card */}
        <div style={{
          minWidth: 240, background: 'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
          borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
          position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(79,70,229,.2)'
        }}>
          <div style={{ position: 'absolute', top: -20, left: -20, width: 80, height: 80, background: 'rgba(255,255,255,.08)', borderRadius: '50%' }} />
          <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'white' }}>calendar_today</span>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: 'white', lineHeight: 1.3 }}>{hijriStr}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.75)', marginTop: 2 }}>{dayNames[now.getDay()]} — {miladiStr}</div>
          </div>
        </div>
      </div>

      {/* ═══════ Row 2: Stats Cards ═══════ */}
      <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        {STAT_CARDS.map(sc => {
          const todayAny = (data.today || {}) as unknown as Record<string, number>;
          const allStageKeys = Object.keys(data.stageStats || {});
          const hasStageBreakdown = sc.key !== 'pendingExcuses' && allStageKeys.length > 0;
          const stageValues: { abbr: string; val: number }[] = [];
          let total = 0;
          if (hasStageBreakdown) {
            for (const sk of allStageKeys) {
              const ss = data.stageStats[sk] || {} as StageStatsItem;
              const v = ss[sc.key as keyof StageStatsItem] ?? 0;
              stageValues.push({ abbr: STAGE_ABBR[sk] || sk, val: v });
              total += v;
            }
          } else {
            total = todayAny[sc.key] ?? 0;
          }
          const displayTotal = stageFilter && hasStageBreakdown
            ? ((data.stageStats[stageFilter] || {} as StageStatsItem)[sc.key as keyof StageStatsItem] ?? 0)
            : total;
          // مؤشر الاتجاه
          const semKeys: Record<string, string> = { absence: 'absence', tardiness: 'tardiness', permissions: 'permissions', violations: 'violations' };
          const trendKey = semKeys[sc.key];
          let trendContent: React.ReactNode = null;
          if (trendKey && data.semesterTotals) {
            const semVal = (data.semesterTotals as Record<string, number>)[trendKey] ?? 0;
            const prog = getSemesterProgress();
            const di = now.getDay();
            const schoolDays = Math.max(1, (prog.week - 1) * 5 + Math.min(di === 6 ? 0 : di === 5 ? 0 : di + 1, 5));
            const avg = Math.round((semVal / schoolDays) * 10) / 10;
            const up = displayTotal > avg;
            const dn = displayTotal < avg;
            trendContent = (
              <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: '#9da3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <span>م.يومي {avg}</span>
                {up && <span style={{ color: '#ef4444', fontSize: 10 }}>▲</span>}
                {dn && <span style={{ color: '#22c55e', fontSize: 10 }}>▼</span>}
                {!up && !dn && <span style={{ fontSize: 10 }}>—</span>}
              </div>
            );
          }
          return (
            <div key={sc.key} className="dash-stat-card" style={{
              background: '#fff', borderRadius: 16, padding: '12px 10px',
              border: '1px solid #f0f2f7', boxShadow: '0 1px 4px rgba(0,0,0,.04)',
              position: 'relative', overflow: 'hidden', cursor: 'default',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: '100%', background: sc.color }} />
              {/* العنوان */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: sc.bg, flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: sc.color }}>{sc.icon}</span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>{sc.label}</span>
              </div>
              {/* مت / ثا — أو placeholder */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 4, minHeight: 16 }}>
                {hasStageBreakdown && !stageFilter && stageValues.length > 0 ? stageValues.map((sv, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 700, color: '#9da3b8' }}>
                    {sv.abbr} <span style={{ fontWeight: 800, color: '#475569' }}>{sv.val}</span>
                  </span>
                )) : null}
              </div>
              {/* خط فاصل */}
              <div style={{ borderTop: '1.5px solid #f1f5f9', marginTop: 2, paddingTop: 4 }} />
              {/* المجموع */}
              <div style={{ textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: '#1a1d2e' }}>{displayTotal}</span>
              </div>
              {/* مؤشر الاتجاه — أو placeholder */}
              <div style={{ minHeight: 14, marginTop: 2 }}>
                {trendContent}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ Row 3: يحتاج انتباهك ═══════ */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1d2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>notifications_active</span> يحتاج انتباهك
        </div>
        <div className="dash-attention-row">
          <AttentionCard icon="gavel" title="مخالفات بدون إجراء" count={data.pending?.violationsNoAction?.length ?? 0} color="#ef4444"
            items={(data.pending?.violationsNoAction || []).slice(0, 3).map(v => ({ text: v.name, tag: `${v.grade} ${classToLetter(v.cls)}` }))} />
          <AttentionCard icon="edit_note" title="ملاحظات معلقة" count={data.pending?.notesPending?.length ?? 0} color="#f97316"
            items={(data.pending?.notesPending || []).slice(0, 3).map(n => ({ text: `${n.name} — ${n.type}`, tag: classToLetter(n.cls) || '' }))} />
          <AttentionCard icon="sms_failed" title="لم يُبلّغ ولي الأمر" count={totalNotSent} color="#3b82f6"
            items={[
              ...(notSent.absence > 0 ? [{ text: `${notSent.absence} غياب`, tag: 'اليوم' }] : []),
              ...(notSent.tardiness > 0 ? [{ text: `${notSent.tardiness} تأخر`, tag: 'اليوم' }] : []),
              ...(notSent.violations > 0 ? [{ text: `${notSent.violations} مخالفة`, tag: 'اليوم' }] : []),
            ]} />
          <AttentionCard icon="pending_actions" title="أعذار بانتظار" count={data.today?.pendingExcuses ?? 0} color="#8b5cf6"
            items={data.today?.pendingExcuses ? [{ text: `${data.today.pendingExcuses} عذر بانتظار المراجعة`, tag: 'أعذار' }] : []} />
        </div>
      </div>

      {/* ═══════ Row 4: الحصة الحالية (55%) + متابعة الغياب (45%) ═══════ */}
      <div className="dash-row4" style={{ marginBottom: 20 }}>
        <PeriodCard stageFilter={stageFilter} />
        {/* متابعة إدخال الغياب */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #f0f2f7', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>fact_check</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1d2e' }}>متابعة إدخال الغياب</div>
          </div>
          {(() => {
            const absData = data.absenceByClass || [];
            const lookup: Record<string, number> = {};
            absData.forEach(a => { lookup[`${a.stage}|${a.grade}|${a.className}`] = a.count; });
            const SECTION_NAMES = CLASS_LETTERS;
            const targetStages = stageFilter ? enabledStages.filter(s => s.stage === stageFilter) : enabledStages;
            if (targetStages.length === 0) {
              return <div style={{ textAlign: 'center', padding: 16, color: '#9da3b8', fontSize: 12 }}>لا توجد مراحل مفعّلة</div>;
            }
            const rows: { stageId: string; stageName: string; gradeName: string; sections: { name: string; count: number | null }[] }[] = [];
            for (const st of targetStages) {
              const stgName = STAGE_ABBR[st.stage] || st.stage;
              for (const g of st.grades.filter(gr => gr.isEnabled && gr.classCount > 0)) {
                const secs: { name: string; count: number | null }[] = [];
                for (let c = 0; c < g.classCount; c++) {
                  const secName = SECTION_NAMES[c] || String(c + 1);
                  const key = `${st.stage}|${g.gradeName}|${secName}`;
                  const found = lookup[key];
                  secs.push({ name: secName, count: found !== undefined ? found : null });
                }
                rows.push({ stageId: st.stage, stageName: stgName, gradeName: g.gradeName, sections: secs });
              }
            }
            if (rows.length === 0) {
              return <div style={{ textAlign: 'center', padding: 16, color: '#9da3b8', fontSize: 12 }}>لا توجد بيانات</div>;
            }
            const maxSections = Math.max(...rows.map(r => r.sections.length));
            let lastStage = '';
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${maxSections}, 1fr)`, gap: 4, padding: '0 4px', marginBottom: 2 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#9da3b8', textAlign: 'right' }}>الصف</div>
                  {SECTION_NAMES.slice(0, maxSections).map(s => (
                    <div key={s} style={{ fontSize: 11, fontWeight: 800, color: '#9da3b8', textAlign: 'center' }}>{s}</div>
                  ))}
                </div>
                {rows.map((r, ri) => {
                  const isNewStage = r.stageName !== lastStage;
                  lastStage = r.stageName;
                  return (
                    <React.Fragment key={ri}>
                      {isNewStage && ri > 0 && (
                        <div style={{ height: 1, background: '#e5e7eb', margin: '4px 0' }} />
                      )}
                      <div style={{
                        display: 'grid', gridTemplateColumns: `80px repeat(${maxSections}, 1fr)`, gap: 4, alignItems: 'center',
                        padding: '6px 8px', borderRadius: 10,
                        background: ri % 2 === 0 ? '#fafbfc' : '#fff',
                        border: '1px solid #f0f2f7',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1d2e', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 4,
                            background: r.stageId === 'Secondary' ? '#eef2ff' : r.stageId === 'Intermediate' ? '#f0fdf4' : '#fffbeb',
                            color: r.stageId === 'Secondary' ? '#4f46e5' : r.stageId === 'Intermediate' ? '#16a34a' : '#d97706',
                          }}>{r.stageName}</span>
                          <span>{r.gradeName}</span>
                        </div>
                        {r.sections.map((s, si) => {
                          const isNull = s.count === null;
                          const isZero = s.count === 0;
                          const hasAbsence = s.count !== null && s.count > 0;
                          return (
                            <div key={si} style={{
                              textAlign: 'center', padding: '5px 0', borderRadius: 8,
                              background: isNull ? '#f1f5f9' : isZero ? '#ecfdf5' : '#fef2f2',
                              border: `1px solid ${isNull ? '#e2e8f0' : isZero ? '#bbf7d0' : '#fecaca'}`,
                              fontSize: 13, fontWeight: 800,
                              color: isNull ? '#cbd5e1' : isZero ? '#16a34a' : '#dc2626',
                              transition: 'all .15s ease',
                            }}>
                              {hasAbsence ? s.count : isZero ? '0' : '—'}
                            </div>
                          );
                        })}
                        {Array.from({ length: maxSections - r.sections.length }).map((_, i) => (
                          <div key={`e${i}`} />
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
          {(() => {
            const totalStudents = data.students?.total || 0;
            const todayAbsence = curStageStats ? (curStageStats.absence ?? 0) : (data.today?.absence ?? 0);
            const attendPct = totalStudents > 0 ? Math.round(((totalStudents - todayAbsence) / totalStudents) * 100) : 100;
            const pctColor = attendPct >= 95 ? '#22c55e' : attendPct >= 90 ? '#f59e0b' : '#ef4444';
            return (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 10, background: attendPct >= 95 ? '#ecfdf5' : attendPct >= 90 ? '#fffbeb' : '#fef2f2', border: `1px solid ${attendPct >= 95 ? '#bbf7d0' : attendPct >= 90 ? '#fef3c7' : '#fecaca'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>نسبة الحضور</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: pctColor }}>{attendPct}%</span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ═══════ Row 5: التقويم + تحويلات المعلمين ═══════ */}
      <div className="dash-row5" style={{ marginBottom: 20 }}>
        <CalendarCard />
        {/* تحويلات المعلمين */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #f0f2f7', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1d2e', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6366f1' }}>swap_horiz</span> تحويلات المعلمين
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280 }}>
            {(data.recentActivity?.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: 16, color: '#9da3b8', fontSize: 11 }}>لا توجد تحويلات اليوم</div>
            ) : data.recentActivity.map((it, i) => {
              const typeColors: Record<string, { bg: string; fg: string }> = {
                'مخالفة': { bg: '#fef2f2', fg: '#dc2626' },
                'ملاحظة': { bg: '#f0fdf4', fg: '#16a34a' },
              };
              const c = typeColors[it.type] || { bg: '#fffbeb', fg: '#d97706' };
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px',
                  borderBottom: i < data.recentActivity.length - 1 ? '1px solid #f8fafc' : 'none',
                  opacity: it.actionTaken ? 0.55 : 1
                }}>
                  {it.actionTaken ? (
                    <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', color: '#22c55e', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                    </div>
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: 'white', background: c.fg, flexShrink: 0 }}>
                      {(it.teacher || '').substring(0, 2)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: it.actionTaken ? '#94a3b8' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.teacher}</div>
                    <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.detail} — {it.student}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: it.actionTaken ? '#f0fdf4' : c.bg, color: it.actionTaken ? '#22c55e' : c.fg, flexShrink: 0 }}>
                    {it.actionTaken ? 'تم' : it.type}
                  </span>
                  {SECTION_ROUTES[it.section] && (
                    <button onClick={() => navigate(SECTION_ROUTES[it.section])} style={{
                      border: 'none', background: '#eef2ff', color: '#4f46e5', borderRadius: 6,
                      padding: '2px 6px', fontSize: 9, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════ Row 6: الخط الزمني ═══════ */}
      <SemesterTimeline semIdx={timelineSem} onSwitch={setTimelineSem} />

      {/* ═══════ Row 7: يحتاج توثيق ═══════ */}
      <div style={cardStyle}>
        <h3 style={{ ...cardTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>print</span>
          يحتاج توثيق
          <span style={{ fontSize: 11, fontWeight: 800, color: 'white', background: '#ef4444', padding: '1px 8px', borderRadius: 100 }}>
            {(data.needsPrinting || []).filter(x => !dismissedPrints.has(`${x.studentId}_${x.type}`)).length}
          </span>
        </h3>
        {(data.needsPrinting || []).filter(x => !dismissedPrints.has(`${x.studentId}_${x.type}`)).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, color: '#9da3b8', fontSize: 11 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#d1d5db', display: 'block', marginBottom: 2 }}>check_circle</span>لا يوجد ما يحتاج توثيق
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 180, overflowY: 'auto' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', marginBottom: 6 }}>مخالفات بدون نماذج</div>
              {data.needsPrinting.filter(x => x.type === 'مخالفة' && !dismissedPrints.has(`${x.studentId}_${x.type}`)).map((it, i) => (
                <PrintItem key={i} item={it} onDismiss={() => setDismissedPrints(prev => new Set([...prev, `${it.studentId}_${it.type}`]))} />
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#ea580c', marginBottom: 6 }}>غياب متكرر</div>
              {data.needsPrinting.filter(x => x.type === 'غياب' && !dismissedPrints.has(`${x.studentId}_${x.type}`)).map((it, i) => (
                <PrintItem key={i} item={it} onDismiss={() => setDismissedPrints(prev => new Set([...prev, `${it.studentId}_${it.type}`]))} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════ Sub-Components ═══════

const AttentionCard: React.FC<{ icon: string; title: string; count: number; color: string; items: { text: string; tag: string }[] }> = ({ icon, title, count, color, items }) => (
  <div style={{ background: '#fff', borderRadius: 16, padding: 14, border: '1px solid #f0f2f7', boxShadow: '0 1px 4px rgba(0,0,0,.04)', cursor: 'pointer' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1d2e', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color }}>{icon}</span> {title}
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, padding: '2px 10px', borderRadius: 100, color: 'white', background: color, minWidth: 28, textAlign: 'center' }}>{count}</div>
    </div>
    {items.length > 0 ? (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((it, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 0', borderBottom: '1px solid #f8fafc', fontSize: 11, color: '#475569', fontWeight: 500 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.text}</span>
            {it.tag && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 100, background: '#f1f5f9', color: '#64748b', flexShrink: 0 }}>{it.tag}</span>}
          </li>
        ))}
      </ul>
    ) : count === 0 ? (
      <div style={{ textAlign: 'center', padding: 8, color: '#9da3b8', fontSize: 11 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#d1d5db', display: 'block', marginBottom: 2 }}>check_circle</span>لا يوجد
      </div>
    ) : null}
  </div>
);

const SemesterTimeline: React.FC<{ semIdx: number; onSwitch: (idx: number) => void }> = ({ semIdx, onSwitch }) => {
  const [hoveredEvent, setHoveredEvent] = useState<number | null>(null);
  const sem = SEMESTER_DATES[semIdx];
  const now = new Date();
  const start = new Date(sem.start[0], sem.start[1], sem.start[2]);
  const end = new Date(sem.end[0], sem.end[1], sem.end[2]);
  const isCurrent = now >= start && now <= end;
  const curWeek = isCurrent ? Math.max(1, Math.min(sem.weeks, Math.floor((now.getTime() - start.getTime()) / (7 * 86400000)) + 1)) : (now > end ? sem.weeks : 0);
  const pct = isCurrent ? Math.min(100, Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)) : (now > end ? 100 : 0);
  const remaining = isCurrent ? Math.ceil((end.getTime() - now.getTime()) / 86400000) : 0;
  const holidayWeeks = new Set(sem.events.filter(e => e.type === 'holiday').map(e => e.week));
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const nextEvt = isCurrent ? sem.events.find(e => e.week >= curWeek) : null;
  const isHol = (type: string) => type === 'holiday';

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', border: '1px solid #f0f2f7', boxShadow: '0 1px 3px rgba(0,0,0,.05)', marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>timeline</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1d2e' }}>الخط الزمني</div>
            <div style={{ fontSize: 10, color: '#9da3b8', fontWeight: 600 }}>{sem.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#64748b' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: '#ef4444' }} /> إجازة
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#64748b' }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: '#4f46e5' }} /> مناسبة
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
            {[0, 1].map(idx => (
              <button key={idx} onClick={() => onSwitch(idx)} style={{
                padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: semIdx === idx ? '#4f46e5' : 'transparent',
                color: semIdx === idx ? 'white' : '#64748b',
                boxShadow: semIdx === idx ? '0 2px 6px rgba(79,70,229,.25)' : 'none',
                transition: 'all .2s ease',
              }}>{idx === 0 ? 'الأول' : 'الثاني'}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: '#f0f0ff', border: '1px solid #e0e0ff' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1' }}>الأسبوع</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#4f46e5' }}>{curWeek}/{sem.weeks}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: '#ecfdf5', border: '1px solid #d1fae5' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>مضى</span>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#059669' }}>{pct}%</span>
        </div>
        {remaining > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fef3c7' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>باقي</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#d97706' }}>{remaining} يوم</span>
          </div>
        )}
        {nextEvt && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, background: isHol(nextEvt.type) ? '#fef2f2' : '#f0f0ff', border: `1px solid ${isHol(nextEvt.type) ? '#fecaca' : '#e0e0ff'}` }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: isHol(nextEvt.type) ? '#dc2626' : '#4f46e5' }}>القادم</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: isHol(nextEvt.type) ? '#dc2626' : '#4f46e5' }}>{nextEvt.label}</span>
          </div>
        )}
      </div>

      {/* Timeline bar */}
      <div style={{ position: 'relative', paddingTop: 44 }}>
        {/* Current week needle */}
        {isCurrent && (
          <div style={{ position: 'absolute', top: 0, right: `${((curWeek - 0.5) / sem.weeks) * 100}%`, transform: 'translateX(50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'right .6s ease' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: 'white', padding: '4px 12px', borderRadius: 10, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(79,70,229,.35)', position: 'relative' }}>
              الأسبوع {curWeek} · {dayNames[now.getDay()]}
              <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 10, height: 10, background: '#5b52e8', borderRadius: 2 }} />
            </div>
            <div style={{ width: 2, height: 30, background: 'linear-gradient(to bottom, #4f46e5, #7c3aed)', marginTop: 3, borderRadius: 1 }} />
            <div style={{ width: 10, height: 10, background: '#4f46e5', border: '3px solid white', borderRadius: '50%', boxShadow: '0 0 0 2px #4f46e5, 0 2px 8px rgba(79,70,229,.4)', marginTop: -1 }} />
          </div>
        )}

        {/* Progress bar */}
        <div style={{ position: 'relative', height: 36, background: '#f1f5f9', borderRadius: 18, overflow: 'visible' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #4f46e5, #7c3aed, #8b5cf6)', borderRadius: 18, position: 'absolute', top: 0, right: 0, width: `${pct}%`, transition: 'width .8s cubic-bezier(.4,0,.2,1)', zIndex: 1 }} />
          <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 2 }}>
            {Array.from({ length: sem.weeks }, (_, i) => i + 1).map(w => {
              const cls = isCurrent ? (w > curWeek ? 'future' : w === curWeek ? 'current' : 'passed') : (now < start ? 'future' : 'passed');
              const wIsHol = holidayWeeks.has(w);
              const clr = cls === 'current' ? 'white' : cls === 'passed' ? 'rgba(255,255,255,.8)' : '#94a3b8';
              const bg = wIsHol ? (cls === 'future' ? '#fef2f2' : 'rgba(239,68,68,.15)') : 'transparent';
              const rad = w === 1 ? '0 18px 18px 0' : (w === sem.weeks ? '18px 0 0 18px' : undefined);
              return (
                <div key={w} style={{
                  flex: 1, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: cls === 'current' ? 900 : 600, color: clr, background: bg,
                  borderLeft: w < sem.weeks ? `1px solid ${cls === 'future' ? '#e2e8f0' : 'rgba(255,255,255,.15)'}` : undefined,
                  borderRadius: rad, transition: 'background .3s ease',
                }}>{w}</div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events as labeled pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, justifyContent: 'center' }}>
        {sem.events.map((ev, i) => {
          const evIsHol = isHol(ev.type);
          const hovered = hoveredEvent === i;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoveredEvent(i)}
              onMouseLeave={() => setHoveredEvent(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', borderRadius: 8,
                background: hovered ? (evIsHol ? '#fef2f2' : '#f0f0ff') : (evIsHol ? '#fff5f5' : '#fafaff'),
                border: `1px solid ${evIsHol ? '#fecaca' : '#e8e8ff'}`,
                cursor: 'default', transition: 'all .2s ease',
                transform: hovered ? 'translateY(-1px)' : 'none',
                boxShadow: hovered ? `0 4px 12px ${evIsHol ? 'rgba(239,68,68,.12)' : 'rgba(79,70,229,.12)'}` : 'none',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: evIsHol ? '#ef4444' : '#4f46e5', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: evIsHol ? '#dc2626' : '#4338ca', whiteSpace: 'nowrap' }}>{ev.label}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#9da3b8', whiteSpace: 'nowrap' }}>س{ev.week}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarCard: React.FC = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  let hijriMonth = '';
  try { hijriMonth = now.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', { month: 'long', year: 'numeric' }); } catch { /* empty */ }

  const holidays = EVENTS_DATA.filter(e => e.m === month + 1 && e.holiday).map(e => e.d);
  const monthEvents = EVENTS_DATA.filter(e => e.m === month + 1);
  const eventDays = new Map<number, CalendarEvent>();
  monthEvents.filter(e => !e.holiday).forEach(e => eventDays.set(e.d, e));

  const dns = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #f0f2f7', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1d2e', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4f46e5' }}>calendar_month</span> {monthNames[month]}
        </span>
        <span style={{ fontSize: 9, color: '#9da3b8', fontWeight: 700 }}>{hijriMonth}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, textAlign: 'center', marginBottom: 6 }}>
        {dns.map(d => <div key={d} style={{ fontSize: 8, fontWeight: 800, color: '#9da3b8', padding: 2 }}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
          const dow = (firstDay + d - 1) % 7;
          const isOff = dow === 5 || dow === 6;
          const isToday = d === todayDate;
          const isHol = holidays.includes(d);
          const isEv = eventDays.has(d);
          let style: React.CSSProperties = { fontSize: 10, fontWeight: 600, padding: '4px 1px', borderRadius: 6, cursor: 'default' };
          if (isToday) style = { ...style, background: 'linear-gradient(135deg,#4f46e5,#8b5cf6)', color: 'white', fontWeight: 800, boxShadow: '0 3px 10px rgba(79,70,229,.25)' };
          else if (isHol) style = { ...style, color: '#ef4444', textDecoration: 'line-through', fontWeight: 700, background: '#fef2f2' };
          else if (isEv) style = { ...style, color: '#4f46e5', fontWeight: 700, background: '#eef2ff' };
          else if (isOff) style = { ...style, color: '#d1d5db' };
          else style = { ...style, color: '#5c6178' };
          return <div key={d} style={style}>{d}</div>;
        })}
      </div>
      {monthEvents.length > 0 && (
        <div style={{ borderTop: '1px solid #f0f2f7', paddingTop: 6 }}>
          {monthEvents.slice(0, 3).map((ev, i) => {
            const dc = ev.holiday ? '#ef4444' : ev.type === 'national' ? '#10b981' : '#6366f1';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0', fontSize: 9, fontWeight: 600, color: '#5c6178' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: dc, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.label}</span>
                <span style={{ fontSize: 8, color: '#9da3b8', fontWeight: 700, flexShrink: 0 }}>{ev.d}/{ev.m}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PrintItem: React.FC<{ item: NeedsPrintItem; onDismiss?: () => void }> = ({ item, onDismiss }) => {
  const [expanded, setExpanded] = React.useState(false);
  const isViol = item.type === 'مخالفة';
  const degBg = isViol ? (item.degree >= 4 ? '#dc2626' : item.degree >= 3 ? '#f97316' : '#f59e0b') : '#ea580c';
  return (
    <div style={{ marginBottom: 4, background: '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 10, fontWeight: 900, color: 'white', background: degBg, padding: '1px 6px', borderRadius: 100, flexShrink: 0 }}>
          {isViol ? `د${item.degree}` : `${item.degree}x`}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1d2e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#9da3b8', flexShrink: 0 }}>{item.grade}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', transition: 'transform .15s', transform: expanded ? 'rotate(180deg)' : '' }}>▼</span>
      </div>
      {expanded && (
        <div style={{ padding: '6px 10px 8px', borderTop: '1px solid #e8ebf2', fontSize: 10, color: '#475569' }}>
          <div style={{ marginBottom: 4 }}><strong>التفاصيل:</strong> {item.detail}</div>
          <div style={{ marginBottom: 4 }}><strong>الفصل:</strong> {item.grade} {classToLetter(item.cls)}</div>
          {item.date && <div style={{ marginBottom: 4 }}><strong>التاريخ:</strong> {item.date}</div>}
          {item.neededForms && item.neededForms.length > 0 && (
            <div style={{ marginBottom: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <strong>النماذج:</strong>
              {item.neededForms.map((f, i) => (
                <span key={i} style={{ background: '#eef2ff', color: '#4f46e5', padding: '1px 6px', borderRadius: 100, fontSize: 9, fontWeight: 700 }}>{f}</span>
              ))}
            </div>
          )}
          {onDismiss && (
            <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} style={{
              display: 'flex', alignItems: 'center', gap: 3, padding: '3px 10px', marginTop: 4,
              background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer'
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>visibility_off</span> تجاهل
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════ بطاقة الحصة الحالية ═══════
const PeriodCard: React.FC<{ stageFilter: string }> = ({ stageFilter }) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState<number | null>(null);
  const [showStage, setShowStage] = React.useState<string>(''); // '' = both, 'م' or 'ث'
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  // Auto-refresh every minute
  React.useEffect(() => {
    const timer = setInterval(forceUpdate, 60000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const dayIdx = now.getDay(); // 0=Sun..6=Sat
  const isSchoolDay = dayIdx >= 0 && dayIdx <= 4; // Sun-Thu
  const stgKey = stageFilter === 'Secondary' ? 'ث' : 'م';
  const currentPeriod = isSchoolDay ? getCurrentPeriod(stageFilter || 'Intermediate') : null;
  const activePeriod = selectedPeriod ?? (currentPeriod?.p || 1);
  const timing = getCurrentTiming();
  const periods = timing[stgKey] || timing['م'];
  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const effectiveStageFilter = showStage || (stageFilter === 'Secondary' ? 'ث' : stageFilter === 'Intermediate' ? 'م' : '');
  const scheduleRows = isSchoolDay ? getScheduleForPeriod(dayIdx, activePeriod, effectiveStageFilter || undefined).sort((a, b) => {
    const stageOrder: Record<string, number> = { 'م': 0, 'ث': 1 };
    const sA = stageOrder[a[3]] ?? 2, sB = stageOrder[b[3]] ?? 2;
    if (sA !== sB) return sA - sB;
    const gA = parseInt(a[1]) || 0, gB = parseInt(b[1]) || 0;
    if (gA !== gB) return gA - gB;
    const secA = a[1].split('-')[1] || '', secB = b[1].split('-')[1] || '';
    return secA.localeCompare(secB, 'ar');
  }) : [];

  const nextEvt = getNextEvent();
  const ramadan = isRamadan();

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: '1px solid #f0f2f7', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'white' }}>schedule</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1d2e' }}>الحصة الحالية — {dayNames[dayIdx]}</div>
            {ramadan && <div style={{ fontSize: 9, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 2, marginTop: 1 }}><span className="material-symbols-outlined" style={{ fontSize: 11 }}>dark_mode</span> توقيت رمضان</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: '#f1f5f9', borderRadius: 8, padding: 3 }}>
          {['', 'م', 'ث'].map(s => (
            <button key={s} onClick={() => setShowStage(s)} style={{
              padding: '5px 12px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: showStage === s ? '#4f46e5' : 'transparent',
              color: showStage === s ? 'white' : '#64748b',
              transition: 'all .2s ease',
            }}>{s === '' ? 'الكل' : s === 'م' ? 'متوسط' : 'ثانوي'}</button>
          ))}
        </div>
      </div>

      {!isSchoolDay ? (
        <div style={{ textAlign: 'center', padding: 20, color: '#9da3b8', fontSize: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d1d5db', display: 'block', marginBottom: 4 }}>weekend</span>
          إجازة نهاية الأسبوع
          {nextEvt && <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>القادم: <strong>{nextEvt.ev.label}</strong> بعد {nextEvt.days} يوم</div>}
        </div>
      ) : (
        <>
          {/* Period selector - full-width grid */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${periods.length}, 1fr)`, gap: 4, marginBottom: 14 }}>
            {periods.map(p => {
              const isCur = currentPeriod?.p === p.p && selectedPeriod === null;
              const isSelected = activePeriod === p.p;
              return (
                <button key={p.p} onClick={() => setSelectedPeriod(p.p === selectedPeriod ? null : p.p)} style={{
                  padding: '8px 4px', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  border: isSelected && !isCur ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isCur ? 'linear-gradient(135deg,#4f46e5,#8b5cf6)' : isSelected ? '#eef2ff' : '#fafbfc',
                  color: isCur ? 'white' : isSelected ? '#4f46e5' : '#475569',
                  transition: 'all .2s ease',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                }}>
                  {p.p}
                  <div style={{ fontSize: 9, color: isCur ? 'rgba(255,255,255,.7)' : '#94a3b8', fontWeight: 600 }}>{p.s}</div>
                  {isCur && <div style={{ fontSize: 8, fontWeight: 700 }}>{getTimeRemaining(p)}</div>}
                </button>
              );
            })}
          </div>

          {/* Schedule - card rows */}
          {scheduleRows.length > 0 ? (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {scheduleRows.map((row, i) => {
                const isSec = row[3] === 'ث';
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 10,
                    background: i % 2 === 0 ? '#fafbfc' : '#fff',
                    border: '1px solid #f0f2f7',
                    transition: 'background .15s ease',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1a1d2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[0]}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 8,
                      background: isSec ? '#eef2ff' : '#f0fdf4',
                      color: isSec ? '#4f46e5' : '#16a34a',
                      whiteSpace: 'nowrap', textAlign: 'center',
                    }}>{row[1]}</span>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row[2]}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 16, color: '#9da3b8', fontSize: 11 }}>لا توجد حصص</div>
          )}

          {/* Current period footer */}
          {currentPeriod && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: '#f8f7ff', border: '1px solid #ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
              <span style={{ fontWeight: 600 }}>الحصة {currentPeriod.p}: {currentPeriod.s} — {currentPeriod.e}</span>
              <span style={{ fontWeight: 800, color: '#4f46e5', fontSize: 12 }}>{getTimeRemaining(currentPeriod)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ═══════ Styles ═══════
const cardStyle: React.CSSProperties = { background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #e5e7eb' };
const cardTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: '#111', margin: '0 0 12px' };

export default DashboardPage;
