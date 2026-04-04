// ═══════════════════════════════════════════
// Shared form data — TeacherFormPage, WakeelFormPage, CounselorFormPage
// Extracted from duplicate definitions across 3 form pages
// ═══════════════════════════════════════════

export interface ViolationItem { id: number; stage: string; type: string; degree: number; degree_primary?: number; text: string; }
export interface NoteItem { id: number; text: string; }
export interface PositiveNoteItem { id: number; text: string; cat: string; }
export interface PositiveItem { id: number; text: string; degree: number; group: string; }

export const VIOLATIONS: ViolationItem[] = [
  // حضوري — الدرجة الأولى
  {id:101,stage:'الكل',type:'حضوري',degree:1,text:'التأخر الصباحي'},
  {id:102,stage:'الكل',type:'حضوري',degree:1,text:'عدم حضور الاصطفاف الصباحي'},
  {id:103,stage:'الكل',type:'حضوري',degree:1,text:'التأخر عن الاصطفاف الصباحي أو العبث أثناءه'},
  {id:104,stage:'الكل',type:'حضوري',degree:1,text:'التأخر في الدخول إلى الحصص'},
  {id:105,stage:'متوسط وثانوي',type:'حضوري',degree:1,text:'إعاقة سير الحصص الدراسية'},
  {id:106,stage:'الكل',type:'حضوري',degree:1,text:'النوم داخل الفصل'},
  {id:107,stage:'الكل',type:'حضوري',degree:1,text:'تكرار خروج ودخول الطلبة من البوابة قبل وقت الحضور والانصراف'},
  {id:108,stage:'الكل',type:'حضوري',degree:1,text:'التجمهر أمام بوابة المدرسة'},
  {id:109,stage:'ابتدائي',type:'حضوري',degree:1,text:'تناول الأطعمة أو المشروبات أثناء الدرس بدون استئذان'},
  // حضوري — الدرجة الثانية
  {id:201,stage:'الكل',type:'حضوري',degree:2,text:'عدم حضور الحصة الدراسية أو الهروب منها'},
  {id:202,stage:'الكل',type:'حضوري',degree:2,text:'الدخول أو الخروج من الفصل دون استئذان'},
  {id:203,stage:'الكل',type:'حضوري',degree:2,text:'دخول فصل آخر دون استئذان'},
  {id:204,stage:'الكل',type:'حضوري',degree:2,text:'إثارة الفوضى داخل الفصل أو المدرسة أو وسائل النقل المدرسي'},
  // حضوري — الدرجة الثالثة
  {id:301,stage:'الكل',type:'حضوري',degree:3,degree_primary:1,text:'عدم التقيد بالزي المدرسي'},
  {id:302,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'الشجار أو الاشتراك في مضاربة جماعية'},
  {id:303,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'الإشارة بحركات مخلة بالأدب تجاه الطلبة'},
  {id:304,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'التلفظ بكلمات نابية على الطلبة أو تهديدهم أو السخرية منهم'},
  {id:305,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'إلحاق الضرر المتعمد بممتلكات الطلبة'},
  {id:306,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'العبث بتجهيزات المدرسة أو مبانيها وحافلاتها'},
  {id:307,stage:'متوسط وثانوي',type:'حضوري',degree:3,text:'إحضار المواد أو الألعاب الخطرة دون استخدامها'},
  {id:308,stage:'الكل',type:'حضوري',degree:3,degree_primary:4,text:'حيازة السجائر بأنواعها'},
  {id:309,stage:'الكل',type:'حضوري',degree:3,degree_primary:4,text:'حيازة المواد الإعلامية الممنوعة'},
  {id:310,stage:'الكل',type:'حضوري',degree:3,text:'التوقيع عن ولي الأمر من غير علمه على المكاتبات'},
  {id:311,stage:'الكل',type:'حضوري',degree:3,degree_primary:2,text:'امتهان الكتب الدراسية'},
  // حضوري — الدرجة الرابعة
  {id:401,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'التعرض لأحد الطلبة بالضرب أو تعمد إصابته'},
  {id:402,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'سرقة شيء من ممتلكات الطلبة أو المدرسة'},
  {id:403,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'التصوير أو التسجيل الصوتي للطلبة'},
  {id:404,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'إلحاق الضرر المتعمد بتجهيزات المدرسة أو مبانيها'},
  {id:405,stage:'الكل',type:'حضوري',degree:4,text:'التدخين بأنواعه داخل المدرسة'},
  {id:406,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'الهروب من المدرسة'},
  {id:407,stage:'الكل',type:'حضوري',degree:4,degree_primary:3,text:'إحضار أو استخدام المواد أو الألعاب الخطرة'},
  {id:408,stage:'الكل',type:'حضوري',degree:4,text:'عرض أو توزيع المواد الإعلامية الممنوعة'},
  // حضوري — الدرجة الخامسة
  {id:501,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'الإساءة أو الاستهزاء بشيء من شعائر الإسلام'},
  {id:502,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'الإساءة للدولة أو رموزها'},
  {id:503,stage:'متوسط وثانوي',type:'حضوري',degree:5,text:'بث أو ترويج أفكار ومعتقدات متطرفة أو تكفيرية'},
  {id:504,stage:'متوسط وثانوي',type:'حضوري',degree:5,text:'الإساءة للأديان السماوية أو إثارة العنصرية والفتن'},
  {id:505,stage:'متوسط وثانوي',type:'حضوري',degree:5,text:'التزوير أو استخدام الوثائق والأختام الرسمية'},
  {id:506,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'التحرش الجنسي'},
  {id:507,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'المظاهر أو الصور أو الشعارات التي تدل على الشذوذ الجنسي أو الترويج لها'},
  {id:508,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'إشعال النار داخل المدرسة'},
  {id:509,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'حيازة آلة حادة أو أسلحة نارية'},
  {id:510,stage:'متوسط وثانوي',type:'حضوري',degree:5,text:'حيازة أو تعاطي أو ترويج المخدرات والمسكرات'},
  {id:511,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'الجرائم المعلوماتية بكافة أنواعها'},
  {id:512,stage:'متوسط وثانوي',type:'حضوري',degree:5,text:'ابتزاز الطلبة'},
  {id:513,stage:'الكل',type:'حضوري',degree:5,degree_primary:4,text:'التنمر بجميع أنواعه وأشكاله'},
  // رقمي — الدرجة الأولى
  {id:601,stage:'الكل',type:'رقمي',degree:1,text:'التأخر في حضور الحصة الافتراضية'},
  {id:602,stage:'الكل',type:'رقمي',degree:1,text:'الخروج المتكرر من الحصص الافتراضية بدون عذر'},
  {id:603,stage:'الكل',type:'رقمي',degree:1,text:'إعاقة سير الحصص الافتراضية'},
  // رقمي — الدرجة الثانية
  {id:604,stage:'الكل',type:'رقمي',degree:2,text:'الهروب من الحصة الافتراضية'},
  {id:605,stage:'الكل',type:'رقمي',degree:2,text:'الإرسال المتعمد لمواد أو روابط ليس لها علاقة بالمحتوى'},
  // رقمي — الدرجة الثالثة
  {id:606,stage:'الكل',type:'رقمي',degree:3,degree_primary:2,text:'استخدام صور منافية للقيم والذوق العام'},
  {id:607,stage:'الكل',type:'رقمي',degree:3,degree_primary:2,text:'التلفظ بكلمات نابية أو التهديد أو السخرية من الطلبة'},
  {id:608,stage:'متوسط وثانوي',type:'رقمي',degree:3,text:'تصوير أو تسجيل الدروس الافتراضية ونشرها'},
  {id:609,stage:'الكل',type:'رقمي',degree:3,text:'إساءة استخدام معلومات الدخول الشخصية'},
  // رقمي — الدرجة الرابعة
  {id:610,stage:'الكل',type:'رقمي',degree:4,degree_primary:3,text:'كتابة عبارات أو إرسال صور أو مقاطع مخلة بالآداب للمعلمين أو الطلبة'},
  {id:611,stage:'الكل',type:'رقمي',degree:4,degree_primary:3,text:'التصوير أو التسجيل الصوتي للمعلمين أو للطلبة'},
  // رقمي — الدرجة الخامسة
  {id:612,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'التنمر الإلكتروني'},
  {id:613,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'التحرش الجنسي الإلكتروني'},
  {id:614,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'الإساءة أو الاستهزاء بشيء من شعائر الإسلام (إلكتروني)'},
  {id:615,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'الإساءة للدولة أو رموزها (إلكتروني)'},
  {id:616,stage:'متوسط وثانوي',type:'رقمي',degree:5,text:'بث أو ترويج أفكار متطرفة أو الإساءة للأديان السماوية (إلكتروني)'},
  {id:617,stage:'متوسط وثانوي',type:'رقمي',degree:5,text:'ابتزاز الطلبة (إلكتروني)'},
  {id:618,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'المظاهر أو الشعارات الدالة على الشذوذ الجنسي (إلكتروني)'},
  {id:619,stage:'متوسط وثانوي',type:'رقمي',degree:5,text:'الترويج للمخدرات (إلكتروني)'},
  {id:620,stage:'الكل',type:'رقمي',degree:5,degree_primary:4,text:'الجرائم المعلوماتية بكافة أنواعها (إلكتروني)'},
  // هيئة تعليمية — الدرجة الرابعة
  {id:701,stage:'الكل',type:'هيئة تعليمية',degree:4,text:'تهديد المعلمين أو الإداريين'},
  {id:702,stage:'الكل',type:'هيئة تعليمية',degree:4,text:'التلفظ بألفاظ غير لائقة تجاه المعلمين أو الإداريين'},
  {id:706,stage:'الكل',type:'هيئة تعليمية',degree:4,text:'السخرية من المعلمين أو الإداريين قولاً أو فعلاً'},
  {id:707,stage:'الكل',type:'هيئة تعليمية',degree:4,text:'التوقيع عن أحد منسوبي المدرسة على المكاتبات'},
  {id:708,stage:'الكل',type:'هيئة تعليمية',degree:4,text:'تصوير المعلمين أو الإداريين أو التسجيل الصوتي لهم بدون إذن'},
  // هيئة تعليمية — الدرجة الخامسة
  {id:703,stage:'الكل',type:'هيئة تعليمية',degree:5,text:'الاعتداء بالضرب على المعلمين أو الإداريين'},
  {id:704,stage:'الكل',type:'هيئة تعليمية',degree:5,text:'ابتزاز المعلمين أو الإداريين'},
  {id:705,stage:'الكل',type:'هيئة تعليمية',degree:5,text:'الجرائم المعلوماتية تجاه المعلمين أو الإداريين'},
  {id:709,stage:'الكل',type:'هيئة تعليمية',degree:5,text:'إلحاق الضرر بممتلكات المعلمين أو الإداريين أو سرقتها'},
  {id:710,stage:'الكل',type:'هيئة تعليمية',degree:5,text:'الإشارة بحركات مخلة بالأدب تجاه المعلمين أو الإداريين'},
];

export const NOTES: NoteItem[] = [
  {id:1,text:'عدم حل الواجب'},{id:2,text:'عدم الحفظ'},
  {id:3,text:'عدم المشاركة والتفاعل'},{id:4,text:'عدم إحضار الكتاب الدراسي'},
  {id:5,text:'عدم إحضار الدفتر'},{id:6,text:'كثرة السرحان داخل الفصل'},
  {id:7,text:'عدم إحضار أدوات الرسم'},{id:8,text:'عدم إحضار الأدوات الهندسية'},
  {id:9,text:'عدم إحضار الملابس الرياضية'},{id:10,text:'النوم داخل الفصل'},
  {id:11,text:'عدم تدوين الملاحظات مع المعلم'},{id:12,text:'إهمال تسليم البحوث والمشاريع'},
  {id:13,text:'عدم المذاكرة للاختبارات القصيرة'},{id:14,text:'الانشغال بمادة أخرى أثناء الحصة'},
  {id:15,text:'عدم تصحيح الأخطاء في الدفتر'},{id:16,text:'عدم إحضار ملف الإنجاز'},
];

export const POSITIVE_NOTES: Record<string, PositiveNoteItem[]> = {
  'ابتدائي': [
    {id:101,text:'بطل الفصل اليوم، شكراً لدعمكم',cat:'عام'},
    {id:102,text:'ملتزم جداً بنظام الفصل اليوم',cat:'انضباط'},
    {id:103,text:'خلوق ومؤدب مع زملائه، بارك الله في تربيتكم',cat:'أخلاق'},
    {id:104,text:'مبدعنا مستمر في تميزه لليوم، استمر يا بطل!',cat:'إنجاز'},
  ],
  'متوسط': [
    {id:201,text:'حضور مميز وتفاعل ذكي اليوم',cat:'عام'},
    {id:202,text:'كل التقدير لانضباطه وحرصه العالي في الحصة',cat:'انضباط'},
    {id:203,text:'خُلقه الراقي اليوم نموذج يفتخر به',cat:'أخلاق'},
    {id:204,text:'مستمر في وتيرة الإنجاز العالية، فخورون به',cat:'إنجاز'},
  ],
  'ثانوي': [
    {id:301,text:'تقديري لتميزه وانضباطه خلال حصة اليوم',cat:'عام'},
    {id:302,text:'جديته وانضباطه الذاتي يجعله قدوة لزملائه',cat:'انضباط'},
    {id:303,text:'نموذج للشاب الخلوق والمحترم، فخور بوجوده',cat:'أخلاق'},
    {id:304,text:'ثبات مستواه وتطوره المستمر، إلى القمة دائماً',cat:'إنجاز'},
  ],
};

export const POSITIVE: PositiveItem[] = [
  {id:1,text:'انضباط الطالب وعدم غيابه بدون عذر خلال الفصل الدراسي',degree:6,group:'6 درجات'},
  {id:2,text:'المشاركة في الخدمة المجتمعية خارج المدرسة',degree:6,group:'6 درجات / مشاركة'},
  {id:3,text:'تقديم فعالية حوارية',degree:6,group:'6 درجات / مشاركة'},
  {id:4,text:'المشاركة في حملة توعوية',degree:6,group:'6 درجات / مشاركة'},
  {id:5,text:'عرض تجارب شخصية ناجحة',degree:6,group:'6 درجات / مشاركة'},
  {id:6,text:'الالتحاق ببرنامج أو دورة',degree:6,group:'6 درجات / مشاركة'},
  {id:7,text:'مهارات الاتصال (العمل الجماعي، التعلم بالأقران)',degree:4,group:'4 درجات / مشاركة'},
  {id:8,text:'مهارات القيادة والمسؤولية (التخطيط، التحفيز)',degree:4,group:'4 درجات / مشاركة'},
  {id:9,text:'المهارات الرقمية (إعداد العروض، تصميم المحتوى الإلكتروني)',degree:4,group:'4 درجات / مشاركة'},
  {id:10,text:'مهارة إدارة الوقت',degree:4,group:'4 درجات / مشاركة'},
  {id:11,text:'كتابة رسالة شكر (للوطن، للقيادة الرشيدة، للأسرة، للمعلم)',degree:2,group:'درجتان / مشاركة'},
  {id:12,text:'المشاركة في الإذاعة',degree:2,group:'درجتان / مشاركة'},
  {id:13,text:'تقديم مقترح لصالح المجتمع المدرسي',degree:2,group:'درجتان / مشاركة'},
  {id:14,text:'التعاون مع الزملاء والمعلمين وإدارة المدرسة',degree:2,group:'درجتان / مشاركة'},
];

// ═══ Color maps for degree badges ═══
export const DEGREE_COLORS: Record<number, string> = {1:'#d1fae5',2:'#fef3c7',3:'#fed7aa',4:'#fecaca',5:'#e9d5ff'};
export const DEGREE_TEXT: Record<number, string> = {1:'#065f46',2:'#92400e',3:'#9a3412',4:'#991b1b',5:'#6b21a8'};
export const POS_DEG_COLORS: Record<number, string> = {6:'#dcfce7',4:'#fef9c3',2:'#dbeafe'};
export const POS_DEG_TEXT: Record<number, string> = {6:'#166534',4:'#854d0e',2:'#1e40af'};

// ═══ Helpers ═══
export function isViolAvailable(v: ViolationItem, stage: string): boolean {
  if (!stage || v.stage === 'الكل') return true;
  if (stage === 'ابتدائي') return v.stage === 'ابتدائي' || v.stage === 'الكل';
  return v.stage === 'متوسط وثانوي' || v.stage === 'الكل';
}

export function effectiveDeg(v: ViolationItem, stage: string): number {
  return (stage === 'ابتدائي' && v.degree_primary) ? v.degree_primary : v.degree;
}
