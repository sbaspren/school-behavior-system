# وثيقة تصميم إعادة الهيكلة - نظام السلوك المدرسي

**التاريخ:** 2026-03-23
**الهدف:** إعادة هيكلة الكود لتسهيل الصيانة والتعديل مستقبلاً بدون تغيير أي وظيفة أو شكل ظاهر

---

## المبدأ الأساسي

**لن يتغير أي شيء يراه المستخدم.** كل التعديلات داخلية فقط - نفس الشكل، نفس الوظائف، نفس النتائج.

## الواجهات المطلوب الحفاظ عليها (بدون أي تغيير)

### واجهات الجوال العامة (بدون تسجيل دخول)
| الواجهة | المسار | الملف |
|---------|--------|-------|
| المعلم | `/form` | TeacherFormPage.tsx |
| الوكيل | `/wakeel-form` | WakeelFormPage.tsx |
| الموجه الطلابي | `/counselor-form` | CounselorFormPage.tsx |
| الحارس | `/guard` | GuardDisplayPage.tsx |
| الموظف | `/staff-form` | StaffFormPage.tsx |
| الإداري | `/admin-tardiness` | AdminTardinessPage.tsx |
| ولي الأمر | `/parent-excuse-form` | ParentExcusePublicPage.tsx |

### واجهة سطح المكتب (تسجيل دخول مطلوب)
16+ صفحة داخلية: لوحة المتابعة، المخالفات، الغياب، التأخر، الاستئذان، السلوك المتمايز، الملاحظات التربوية، التحصيل الدراسي، التقارير، الإعدادات، سجل المراجعة، واتساب، التواصل، نور، النماذج العامة، أعذار أولياء الأمور

---

## الإصلاح 1: توحيد كود الصفحات المكرر

### المشكلة
5 صفحات رئيسية (المخالفات، الغياب، التأخر، الاستئذان، السلوك المتمايز) تكرر ~80% من كودها:
- تحميل البيانات والمراحل
- فلترة حسب المرحلة
- فلترة حسب اليوم
- البحث والتحديد
- حالات التحميل والخطأ

### الحل
إنشاء `client/src/hooks/usePageData.ts` - كود مشترك يستخدمه كل صفحة:

```typescript
usePageData({
  apiGetAll: violationsApi.getAll,
  apiGetStats: violationsApi.getDailyStats,
})
// يرجع: records, stages, loading, stageFilter, setStageFilter,
//        filteredByStage, todayRecords, refresh
```

### الملفات المتأثرة
- **جديد:** `client/src/hooks/usePageData.ts`
- **تعديل:** ViolationsPage, AbsencePage, TardinessPage, PermissionsPage, PositiveBehaviorPage, EducationalNotesPage

---

## الإصلاح 2: توحيد نوافذ الإدخال

### المشكلة
كل صفحة تبني نافذة إدخال من الصفر (~200 سطر × 5 = ~1000 سطر مكرر)

### الحل
توسيع InputModal + StudentSelector الموجودين ليغطيا كل الحالات. النوافذ الحالية تُستبدل بتركيب المكونات المشتركة.

### الملفات المتأثرة
- **تعديل:** InputModal.tsx, StudentSelector.tsx (توسيع بسيط)
- **تعديل:** الصفحات الخمس (استبدال النوافذ المحلية بالمكونات المشتركة)

---

## الإصلاح 3: تقسيم ملفات المطبوعات

### المشكلة
23 نموذج طباعة في ملف واحد (1,989 سطر) + أدوات طباعة ضخمة

### الحل
```
client/src/utils/print/
├── index.ts              (تصدير كل شيء)
├── printCore.ts          (الأدوات الأساسية: toIndic, formatClass, escapeHtml)
├── printStyles.ts        (CSS المشترك)
├── printLetterhead.ts    (ترويسة المدرسة)
├── printDaily.ts         (التقارير اليومية - موجود)
├── forms/
│   ├── index.ts
│   ├── isharWaliAmr.ts   (إشعار ولي الأمر)
│   ├── tahoodSlooki.ts   (تعهد سلوكي)
│   ├── dawatWaliAmr.ts   (دعوة ولي الأمر)
│   └── ... (20 ملف آخر)
```

### الملفات المتأثرة
- **حذف:** printTemplates.ts (يُستبدل بالمجلد الجديد)
- **تقسيم:** printUtils.ts → printCore.ts + printStyles.ts + printLetterhead.ts
- **جديد:** 23 ملف نموذج + 2 ملف index

---

## الإصلاح 4: تقسيم الصفحات الكبيرة

### المشكلة
ViolationsPage (2,189 سطر)، AbsencePage (2,075 سطر) - صعبة القراءة والصيانة

### الحل
كل صفحة تتقسم لأجزاء:
```
client/src/pages/violations/
├── index.tsx              (الصفحة الرئيسية - تجمع الأجزاء)
├── ViolationsTodayTab.tsx (تبويب اليوم)
├── ViolationsApprovedTab.tsx (تبويب المعتمد)
├── ViolationsReportsTab.tsx (تبويب التقارير)
├── ViolationsModals.tsx   (النوافذ الخاصة بالمخالفات)
└── constants.ts           (ثوابت خاصة بالمخالفات)
```

### الملفات المتأثرة
- **تقسيم:** ViolationsPage.tsx, AbsencePage.tsx, TardinessPage.tsx, PermissionsPage.tsx, DashboardPage.tsx

---

## الإصلاح 5: توحيد التنسيق

### المشكلة
ألوان وأحجام مكتوبة مباشرة في كل مكان بدل مكان واحد مركزي

### الحل
توسيع `theme.ts` ليشمل كل الأنماط المتكررة، واستبدال القيم المباشرة بمراجع للثيم.

### الملفات المتأثرة
- **تعديل:** theme.ts (إضافة أنماط مشتركة)
- **تعديل:** كل الصفحات (استبدال القيم المباشرة)

---

## الإصلاح 6: توحيد فلترة الخادم

### المشكلة
4 ملفات في الخادم تكرر نفس كود الفلترة

### الحل
إنشاء `RecordControllerBase` كقاعدة مشتركة:

```csharp
// src/API/Controllers/Base/RecordControllerBase.cs
public abstract class RecordControllerBase<TEntity> : ControllerBase
{
    protected IQueryable<TEntity> ApplyCommonFilters(IQueryable<TEntity> query,
        string? stage, string? grade, string? className,
        int? studentId, string? dateFrom, string? dateTo,
        bool? isSent, string? search) { ... }

    protected async Task<ActionResult> UpdateSentStatus<T>(...) { ... }
    protected async Task<ActionResult> DeleteRecord<T>(...) { ... }
    protected async Task<ActionResult> SendWhatsApp<T>(...) { ... }
}
```

### الملفات المتأثرة
- **جديد:** `src/API/Controllers/Base/RecordControllerBase.cs`
- **تعديل:** ViolationsController, AbsenceController, TardinessController, PermissionsController, EducationalNotesController

---

## الإصلاح 7: قوالب بيانات الخادم

### المشكلة
البيانات ترجع بشكل حر بدون قالب ثابت

### الحل
إنشاء قوالب واضحة في `src/Application/DTOs/Responses/`:

```csharp
public class ViolationResponse { ... }
public class AbsenceResponse { ... }
public class TardinessResponse { ... }
public class PermissionResponse { ... }
```

### الملفات المتأثرة
- **جديد:** 4+ ملفات DTOs
- **تعديل:** Controllers (استبدال الكائنات المجهولة بالقوالب)

---

## الإصلاح 8: إدارة حالة مركزية

### المشكلة
كل صفحة تحمل بياناتها من الصفر عند كل زيارة

### الحل
إنشاء `AppContext` لتخزين البيانات المشتركة:
- إعدادات المدرسة
- المراحل والصفوف
- معلومات المستخدم الحالي

```
client/src/contexts/
├── AppContext.tsx      (البيانات المشتركة)
└── AppProvider.tsx     (مزود البيانات)
```

### الملفات المتأثرة
- **جديد:** `client/src/contexts/AppContext.tsx`
- **تعديل:** App.tsx (إضافة المزود)
- **تعديل:** الصفحات (استخدام السياق بدل التحميل المتكرر)

---

## الإصلاح 9: إضافة اختبارات أساسية

### الحل
اختبارات للأدوات المشتركة فقط (أقل خطر، أعلى قيمة):

```
client/src/__tests__/
├── utils/
│   ├── printCore.test.ts
│   ├── hijriDate.test.ts
│   └── constants.test.ts
└── hooks/
    └── usePageData.test.ts
```

---

## ترتيب التنفيذ

الترتيب مصمم لتقليل المخاطر - كل إصلاح مستقل ويمكن اختباره بمفرده:

1. الإصلاح 5 (توحيد التنسيق) - أبسط تغيير، لا يكسر شيء
2. الإصلاح 1 (توحيد كود الصفحات) - الأساس لباقي الإصلاحات
3. الإصلاح 2 (توحيد النوافذ) - يعتمد على الإصلاح 1
4. الإصلاح 3 (تقسيم المطبوعات) - مستقل تماماً
5. الإصلاح 4 (تقسيم الصفحات) - يعتمد على 1 و 2
6. الإصلاح 8 (إدارة حالة مركزية) - تحسين الأداء
7. الإصلاح 6 (توحيد فلترة الخادم) - الباكند مستقل
8. الإصلاح 7 (قوالب البيانات) - يعتمد على 6
9. الإصلاح 9 (الاختبارات) - بعد استقرار كل شيء

---

## ملاحظة المجلد المكرر

بعد اكتمال كل الإصلاحات، يُحذف المجلد القديم:
```
d:\SchoolBehaviorSystem\school-behavior-system\
```
لأن كل محتواه موجود في المسار الحالي + 10 تحديثات إضافية.
