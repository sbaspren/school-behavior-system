import React from 'react';
import type { StageConfigData } from '../api/settings';

// Exact stage/grade mappings — أسماء مطابقة لنظام نور
export const SETTINGS_STAGES = [
  { id: 'Kindergarten', name: 'طفولة مبكرة', grades: ['الأول طفولة مبكرة', 'الثاني طفولة مبكرة', 'الثالث طفولة مبكرة'] },
  { id: 'Primary', name: 'ابتدائي', grades: ['الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'] },
  { id: 'Intermediate', name: 'متوسط', grades: ['الأول المتوسط', 'الثاني المتوسط', 'الثالث المتوسط'] },
  { id: 'Secondary', name: 'ثانوي', grades: ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'] },
];

export const SECONDARY_TRACKS: Record<string, string[]> = {
  Semester: ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'],
  Tracks: ['الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'الرابع الثانوي', 'الخامس الثانوي', 'السادس الثانوي'],
};

export const CLASS_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر'];

// ═══ ترتيب الصفوف والفصول — حل جذري مركزي ═══

/** ترتيب الأعداد العربية (الأول=1, الثاني=2, ...) */
const ARABIC_ORDER: Record<string, number> = {
  'الأول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4,
  'الخامس': 5, 'السادس': 6, 'السابع': 7, 'الثامن': 8,
};

/** ترتيب المراحل */
const STAGE_ORDER: Record<string, number> = {
  'طفولة': 1, 'مبكرة': 1,
  'الابتدائي': 2, 'ابتدائي': 2,
  'المتوسط': 3, 'متوسط': 3,
  'الثانوي': 4, 'ثانوي': 4,
};

/** استخراج رقم ترتيب الصف من اسمه (مثلاً "الثاني المتوسط" → [2, 3]) */
function gradeOrder(grade: string): [number, number] {
  const words = grade.split(' ');
  const numOrder = ARABIC_ORDER[words[0]] || 99;
  // آخر كلمة عادةً هي المرحلة
  const stageWord = words[words.length - 1];
  const stgOrder = STAGE_ORDER[stageWord] || 99;
  return [stgOrder, numOrder];
}

/** ترتيب الصفوف بالترتيب الصحيح: المرحلة أولاً ثم الرقم */
export function sortGrades(grades: string[]): string[] {
  return [...grades].sort((a, b) => {
    const [aStg, aNum] = gradeOrder(a);
    const [bStg, bNum] = gradeOrder(b);
    if (aStg !== bStg) return aStg - bStg;
    return aNum - bNum;
  });
}

/** ترتيب الفصول بالترتيب الصحيح (أ، ب، ج، ...) */
export function sortClasses(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const aIdx = CLASS_LETTERS.indexOf(a);
    const bIdx = CLASS_LETTERS.indexOf(b);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    return a.localeCompare(b, 'ar');
  });
}

export const STAGE_SUBJECTS: Record<string, { name: string; subjects: string[] }> = {
  Primary: {
    name: 'ابتدائي',
    subjects: [
      'القرآن الكريم والدراسات الإسلامية', 'اللغة العربية', 'الرياضيات', 'العلوم',
      'اللغة الإنجليزية', 'التربية الفنية', 'التربية البدنية والدفاع عن النفس',
      'المهارات الحياتية والأسرية', 'الدراسات الاجتماعية', 'المهارات الرقمية',
    ],
  },
  Intermediate: {
    name: 'متوسط',
    subjects: [
      'القرآن الكريم', 'الدراسات الإسلامية', 'اللغة العربية', 'اللغة الإنجليزية',
      'الرياضيات', 'العلوم', 'الدراسات الاجتماعية', 'المهارات الرقمية',
      'التربية الفنية', 'التربية البدنية والدفاع عن النفس', 'المهارات الحياتية والأسرية', 'التفكير الناقد',
    ],
  },
  Secondary: {
    name: 'ثانوي',
    subjects: [
      'القرآن الكريم', 'التوحيد', 'الدراسات الإسلامية', 'اللغة الإنجليزية',
      'الرياضيات', 'الكفايات اللغوية', 'الفيزياء', 'الكيمياء', 'الأحياء',
      'التقنية الرقمية', 'التفكير الناقد', 'التربية البدنية والدفاع عن النفس',
      'الهندسة', 'مبادئ العلوم الصحية', 'مقدمة في الأعمال', 'الإدارة المالية',
      'القانون', 'التفسير', 'الحديث', 'الفقه', 'التاريخ',
      'الذكاء الاصطناعي', 'الأمن السيبراني', 'علوم البيانات', 'الجيولوجيا',
      'الدراسات الاجتماعية', 'التسويق', 'أصول الفقه', 'البلاغة والنقد',
    ],
  },
};

export const USER_ROLES = [
  { value: 'Admin', label: 'مدير النظام' },
  { value: 'Deputy', label: 'الوكيل' },
  { value: 'Counselor', label: 'الموجه الطلابي' },
  { value: 'Teacher', label: 'معلم' },
  { value: 'Staff', label: 'موظف' },
  { value: 'Guard', label: 'حارس أمن' },
  { value: 'Parent', label: 'ولي أمر' },
];

// أدوار الهيئة الإدارية (وكيل شؤون الطلاب انتقل لبيانات المدرسة)
export const ADMIN_ROLES = [
  'مدير المدرسة',
  'وكيل الشؤون التعليمية',
  'وكيل الشؤون المدرسية',
  'موجه طلابي',
  'إداري',
  'حارس',
];

// وصف واجهة كل دور
export const ROLE_INTERFACE_DESC: Record<string, string> = {
  'مدير المدرسة': 'واجهة شاملة: مخالفات + غياب + استئذان + تأخر + سلوك + ملاحظات',
  'وكيل شؤون الطلاب': 'واجهة شاملة: مخالفات + غياب + استئذان + تأخر + سلوك + ملاحظات',
  'وكيل الشؤون التعليمية': 'واجهة شاملة: مخالفات + غياب + استئذان + تأخر + سلوك + ملاحظات',
  'وكيل الشؤون المدرسية': 'واجهة شاملة: مخالفات + غياب + استئذان + تأخر + سلوك + ملاحظات',
  'موجه طلابي': 'واجهة الموجه: استئذان + ملاحظات تربوية + سلوك متمايز',
  'إداري': 'تسجيل التأخر الصباحي فقط',
  'حارس': 'استعراض المستأذنين فقط',
};

// ربط أدوار الإدارة بأدوار النظام
export const ADMIN_ROLE_TO_SYSTEM_ROLE: Record<string, string> = {
  'مدير المدرسة': 'Admin',
  'وكيل شؤون الطلاب': 'Deputy',
  'وكيل الشؤون التعليمية': 'Deputy',
  'وكيل الشؤون المدرسية': 'Deputy',
  'موجه طلابي': 'Counselor',
  'إداري': 'Staff',
  'حارس': 'Guard',
};

// ═══ ثوابت مكررة سابقاً في الصفحات — الآن في مكان واحد ═══

/** تسميات درجات المخالفات وألوانها (كانت في ViolationsPage) */
export const DEGREE_LABELS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'الأولى', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  2: { label: 'الثانية', color: '#ca8a04', bg: '#fef9c3', border: '#fde68a' },
  3: { label: 'الثالثة', color: '#ea580c', bg: '#ffedd5', border: '#fdba74' },
  4: { label: 'الرابعة', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  5: { label: 'الخامسة', color: '#7c2d12', bg: '#fecaca', border: '#f87171' },
};

/** تسميات أنواع المخالفات (كانت في ViolationsPage) */
export const TYPE_LABELS: Record<string, string> = {
  InPerson: 'حضوري',
  Digital: 'رقمي',
  Educational: 'هيئة تعليمية',
};

/** أنماط التعرف على النماذج المطلوبة من نص الإجراءات (كانت في ViolationsPage) */
export type FormId = 'tahood_slooki' | 'ishar_wali_amr' | 'dawat_wali_amr' | 'ehalat_talib' | 'mahdar_lajnah' | 'mahdar_dab_wakea' | 'tawid_darajat';

export const FORM_PATTERNS: { id: FormId; pattern: RegExp }[] = [
  { id: 'dawat_wali_amr', pattern: /دعوة.*ولي|ولي.*أمر.*حضور/ },
  { id: 'tahood_slooki', pattern: /تعهد/ },
  { id: 'ishar_wali_amr', pattern: /إشعار.*ولي|إنذار.*بالنقل|إنذار.*كتاب/ },
  { id: 'ehalat_talib', pattern: /إحالة|تحويل.*للموجه|تحويل.*الموجه|تحويل.*لجنة.*التوجيه/ },
  { id: 'mahdar_lajnah', pattern: /لجنة.*التوجيه|اجتماع.*للجنة|عقد.*اجتماع/ },
  { id: 'mahdar_dab_wakea', pattern: /محضر.*ضبط|تدوين.*محضر/ },
  { id: 'tawid_darajat', pattern: /فرص.*التعويض|فرص.*تعويض|تمكين.*فرص/ },
];

/** استخراج النماذج المطلوبة من نص الإجراءات */
export const getRequiredForms = (procedures: string): Set<FormId> => {
  if (!procedures) return new Set();
  const forms = new Set<FormId>();
  for (const { id, pattern } of FORM_PATTERNS) {
    if (pattern.test(procedures)) forms.add(id);
  }
  return forms;
};

/** أنواع التأخر وألوانها (كانت في TardinessPage) */
export const TARDINESS_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  Morning: { label: 'تأخر صباحي', color: '#dc2626', bg: '#fee2e2' },
  Period: { label: 'تأخر عن الحصة', color: '#ea580c', bg: '#ffedd5' },
  Assembly: { label: 'تأخر عن الاصطفاف', color: '#ca8a04', bg: '#fef9c3' },
};

/** الحصص الدراسية (كانت في TardinessPage) */
export const PERIODS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة'];

/** أنواع السلوك المتمايز (كانت في PositiveBehaviorPage) */
export const BEHAVIOR_TYPES = [
  'المحافظة على الصلاة', 'التفوق الدراسي', 'حسن السلوك والأخلاق',
  'المشاركة في الأنشطة', 'التطوع وخدمة المجتمع', 'حفظ القرآن الكريم',
  'النظافة الشخصية والعامة', 'الالتزام بالزي المدرسي', 'التعاون مع الزملاء',
  'الانضباط والالتزام', 'الإبداع والابتكار', 'القيادة الطلابية',
  'المحافظة على الممتلكات', 'احترام المعلمين والطلاب', 'المبادرة الإيجابية',
];

/** أسباب الاستئذان */
export const PERMISSION_REASONS = ['ظرف صحي', 'ظرف أسري', 'موعد حكومي', 'طلب ولي الأمر'];

/** مستلمو الطالب */
export const GUARDIANS = ['الأب', 'الأخ', 'الأم', 'العم', 'الخال', 'الجد', 'السائق', 'أخرى'];

/** تسميات درجات المخالفات — نص فقط (بدون ألوان) */
export const DEGREE_LABEL_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(DEGREE_LABELS).map(([k, v]) => [Number(k), v.label])
);

/** عدد أيام الدراسة في السنة */
export const SCHOOL_DAYS = 180;

/** لون كل قسم — مفتاح مركزي (كانت مبعثرة في الصفحات) */
export const SECTION_THEMES = {
  violations: '#4f46e5',
  notes: '#059669',
  tardiness: '#dc2626',
  permissions: '#0891b2',
  absence: '#ea580c',
  positive: '#10b981',
  noor: '#00695c',
  academic: '#7c3aed',
  communication: '#2563eb',
  whatsapp: '#16a34a',
} as const;

export type SectionName = keyof typeof SECTION_THEMES;

/** فلترة المراحل المفعلة التي تحتوي على صفوف وفصول */
export function filterEnabledStages(stages: StageConfigData[]): StageConfigData[] {
  return stages.filter(s => s.isEnabled && s.grades.some(g => g.isEnabled && g.classCount > 0));
}

/** ستايل زر موحد — outline بلون القسم */
export function btnOutline(sectionColor: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 18px', borderRadius: 12, fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: '#fff', color: sectionColor, border: `1.5px solid ${sectionColor}`,
    transition: 'all 0.2s', whiteSpace: 'nowrap',
  };
}
