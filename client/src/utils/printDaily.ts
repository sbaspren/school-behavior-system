// ===== طباعة الكشوف اليومية (6 أنواع) — موحّد عبر printListReport =====
import {
  toIndic, escapeHtml, formatClass, getTodayDates, extractTime, sortByClass, tardinessTypeLabel,
} from './printUtils';
import { printListReport, ListReportRow } from './printTemplates';

interface SchoolSettings {
  letterheadMode: string;
  letterheadImageUrl?: string;
  schoolName?: string;
  eduAdmin?: string;
  eduDept?: string;
  letterhead?: string;
}

// ===== تكوين كل نوع كشف =====

interface DailyConfig {
  titlePrefix: string;
  totalLabel: string;
  nameField: string;
  gradeField: string;
  classField: string;
  headers: { label: string; width?: string }[];
  buildCells: (rec: Record<string, unknown>, i: number, g: { grade: string; cls: string }, stage?: string) => string[];
}

function getField(rec: Record<string, unknown>, name: string): string {
  if (rec[name] !== undefined && rec[name] !== null) return String(rec[name]);
  const alt = name.replace(/ /g, '_');
  if (rec[alt] !== undefined && rec[alt] !== null) return String(rec[alt]);
  return '';
}

function sentIcon(isSent: boolean): string {
  return `<span style="color:${isSent ? 'green' : '#999'};font-weight:bold">${isSent ? 'تم' : '-'}</span>`;
}

const DAILY_CONFIGS: Record<string, DailyConfig> = {
  violations: {
    titlePrefix: 'سجل المخالفات السلوكية ليوم ',
    totalLabel: 'مخالفة',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' }, { label: 'الصف', width: '10%' },
      { label: 'المخالفة', width: '25%' }, { label: 'د', width: '5%' }, { label: 'الإجراءات', width: '20%' }, { label: 'التواصل', width: '7%' },
    ],
    buildCells: (rec, i, g) => [
      toIndic(i + 1),
      `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
      formatClass(g.grade, g.cls),
      `<span style="text-align:right;font-size:12pt">${escapeHtml(getField(rec, 'description') || '-')}</span>`,
      toIndic(getField(rec, 'degree') || '-'),
      `<span style="text-align:right;font-size:12pt">${escapeHtml(getField(rec, 'procedures') || '-')}</span>`,
      sentIcon(rec.isSent === true),
    ],
  },

  absence: {
    titlePrefix: 'كشف الغياب اليومي ليوم ',
    totalLabel: 'طالب',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' }, { label: 'الصف', width: '10%' },
      { label: 'المسجّل', width: '15%' }, { label: 'العذر', width: '15%' }, { label: 'التواصل', width: '7%' },
    ],
    buildCells: (rec, i, g) => {
      let teacher = getField(rec, 'recordedBy') || '-';
      if (teacher === '-' || teacher === 'مدير_النظام' || teacher === 'يدوي') teacher = 'الوكيل';
      return [
        toIndic(i + 1),
        `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
        formatClass(g.grade, g.cls),
        escapeHtml(teacher),
        escapeHtml(getField(rec, 'excuseType') || '-'),
        sentIcon(rec.isSent === true),
      ];
    },
  },

  tardiness: {
    titlePrefix: 'سجل المتأخرين ليوم ',
    totalLabel: 'متأخر',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '28%' }, { label: 'الصف', width: '10%' },
      { label: 'نوع التأخر', width: '15%' }, { label: 'الحصة', width: '8%' }, { label: 'الوقت', width: '12%' }, { label: 'التواصل', width: '7%' },
    ],
    buildCells: (rec, i, g) => [
      toIndic(i + 1),
      `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
      formatClass(g.grade, g.cls),
      escapeHtml(tardinessTypeLabel(getField(rec, 'tardinessType'))),
      toIndic(getField(rec, 'period') || '-'),
      toIndic(extractTime(getField(rec, 'recordedAt'))),
      sentIcon(rec.isSent === true),
    ],
  },

  permissions: {
    titlePrefix: 'سجل المستأذنين ليوم ',
    totalLabel: 'مستأذن',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '25%' }, { label: 'الصف', width: '10%' },
      { label: 'وقت الخروج', width: '10%' }, { label: 'السبب', width: '18%' }, { label: 'المستلم', width: '12%' },
      { label: 'التأكيد', width: '10%' }, { label: 'التواصل', width: '7%' },
    ],
    buildCells: (rec, i, g) => {
      const confirmTime = getField(rec, 'confirmTime');
      return [
        toIndic(i + 1),
        `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
        formatClass(g.grade, g.cls),
        toIndic(getField(rec, 'exitTime') || '-'),
        `<span style="text-align:right;font-size:12pt">${escapeHtml(getField(rec, 'reason') || '-')}</span>`,
        escapeHtml(getField(rec, 'receiver') || '-'),
        `<span style="font-size:11pt">${confirmTime ? 'خرج ' + toIndic(confirmTime) : 'معلق'}</span>`,
        sentIcon(rec.isSent === true),
      ];
    },
  },

  notes: {
    titlePrefix: 'سجل الملاحظات التربوية ليوم ',
    totalLabel: 'ملاحظة',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'اسم الطالب', width: '25%' }, { label: 'الصف', width: '10%' },
      { label: 'نوع الملاحظة', width: '12%' }, { label: 'التفاصيل', width: '25%' }, { label: 'المسجّل', width: '13%' }, { label: 'التواصل', width: '7%' },
    ],
    buildCells: (rec, i, g) => [
      toIndic(i + 1),
      `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
      formatClass(g.grade, g.cls),
      escapeHtml(getField(rec, 'noteType') || '-'),
      `<span style="text-align:right;font-size:12pt">${escapeHtml(getField(rec, 'details') || '-')}</span>`,
      escapeHtml(getField(rec, 'teacherName') || getField(rec, 'recordedBy') || '-'),
      sentIcon(rec.isSent === true),
    ],
  },

  communication: {
    titlePrefix: 'سجل التواصل مع أولياء الأمور',
    totalLabel: 'رسالة',
    nameField: 'studentName',
    gradeField: 'grade',
    classField: 'className',
    headers: [
      { label: 'م', width: '5%' }, { label: 'التاريخ', width: '12%' }, { label: 'اسم الطالب', width: '24%' },
      { label: 'الصف', width: '10%' }, { label: 'الجوال', width: '14%' }, { label: 'النوع', width: '18%' }, { label: 'الحالة', width: '7%' },
    ],
    buildCells: (rec, i, g) => {
      const statusDone = String(rec.sendStatus || '').indexOf('sent') >= 0;
      return [
        toIndic(i + 1),
        toIndic(getField(rec, 'hijriDate') || getField(rec, 'miladiDate') || ''),
        `<span style="font-weight:bold;text-align:right">${escapeHtml(getField(rec, 'studentName') || '-')}</span>`,
        formatClass(g.grade, g.cls),
        `<span style="direction:ltr;font-size:11pt">${escapeHtml(getField(rec, 'mobile') || '')}</span>`,
        escapeHtml(getField(rec, 'messageType') || ''),
        `<span style="color:${statusDone ? 'green' : '#999'};font-weight:bold">${statusDone ? '\u2713' : '\u2717'}</span>`,
      ];
    },
  },
};

// ===== الدالة الرئيسية — موحّدة عبر printListReport =====
export type DailyReportType = 'violations' | 'absence' | 'tardiness' | 'permissions' | 'notes' | 'communication';

export function printDailyReport(
  type: DailyReportType,
  records: Record<string, unknown>[],
  settings: SchoolSettings,
  stage?: string,
): void {
  if (!records || records.length === 0) return;

  const config = DAILY_CONFIGS[type];
  if (!config) return;

  const STAGE_NAMES: Record<string, string> = {
    'متوسط': 'المرحلة المتوسطة',
    'ثانوي': 'المرحلة الثانوية',
    'ابتدائي': 'المرحلة الابتدائية',
    'طفولة مبكرة': 'مرحلة الطفولة المبكرة',
  };
  const stageName = stage ? (STAGE_NAMES[stage] || stage) : '';

  const { hijri, miladi, dayName } = getTodayDates();

  const sorted = sortByClass(
    records,
    config.nameField as keyof Record<string, unknown>,
    config.gradeField as keyof Record<string, unknown>,
    config.classField as keyof Record<string, unknown>,
  );

  // بناء الصفوف باستخدام ListReportRow
  const rows: ListReportRow[] = [];
  let lastKey = '';
  sorted.forEach((rec, i) => {
    const grade = getField(rec, config.gradeField);
    const cls = getField(rec, config.classField);
    const key = `${grade}|${cls}`;
    if (key !== lastKey && i > 0) {
      rows.push({ cells: [], isSeparator: true });
    }
    lastKey = key;
    rows.push({ cells: config.buildCells(rec, i, { grade, cls }, stage) });
  });

  let title = config.titlePrefix;
  if (type !== 'communication') title += dayName;

  let dateText: string;
  if (type === 'communication') {
    dateText = `${hijri} | عدد الرسائل: ${toIndic(records.length)}`;
  } else {
    dateText = `${hijri} \u00A0الموافق\u00A0 ${miladi} م`;
  }

  printListReport({
    title,
    subtitle: stageName || undefined,
    dateText,
    headers: config.headers,
    rows,
    summary: `المجموع: ${toIndic(records.length)} ${config.totalLabel}`,
  }, settings);
}
