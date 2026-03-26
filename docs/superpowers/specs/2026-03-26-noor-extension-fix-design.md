# تحسين إضافة كروم لتوثيق نور — إصلاح + تحصين

**التاريخ:** 2026-03-26
**المنهج:** إصلاح مستهدف + تحصين بنيوي (المنهج ب)

## السياق

إضافة كروم تربط بين تطبيق شؤون الطلاب وموقع نور (noor.moe.gov.sa) لتوثيق المخالفات والغياب والسلوك الإيجابي تلقائياً. الإضافة تعمل بمحرك حالة (state machine) يتنقل بين منسدلات صفحة ManageAttendance.aspx في نور.

المراجعة الشاملة كشفت 8 ثغرات تمنع أو تضعف عملية التوثيق.

## الملفات المعنية

| الملف | الموقع | الدور |
|-------|--------|-------|
| `noor-bridge.js` | إضافة كروم | محرك التوثيق على صفحة نور (~1465 سطر) |
| `background.js` | إضافة كروم | Service Worker — توجيه الرسائل (225 سطر) |
| `app-bridge.js` | إضافة كروم | جسر التواصل مع التطبيق (149 سطر) |
| `manifest.json` | إضافة كروم | إعدادات الإضافة |
| `NoorPage.tsx` | client/src/pages/ | واجهة التوثيق في React (~923 سطر) |
| `NoorController.cs` | src/API/Controllers/ | API التوثيق (~930 سطر) |

## مسار البيانات

```
NoorPage.tsx → DOM inbox → app-bridge.js → chrome.runtime → background.js → chrome.tabs → noor-bridge.js → صفحة نور
                                                                                                              ↓
NoorPage.tsx ← DOM outbox ← app-bridge.js ← chrome.runtime ← background.js ← chrome.runtime ← noor-bridge.js (نتائج)
```

## المسارات الثلاثة في نور

| المسار | المنسدلة الأولى (mowadaba) | المنسدلة الثانية (deductType) | الاستخدام |
|--------|---------------------------|-------------------------------|-----------|
| سلوك → خصم | 1 (سلوك) | 1 (خصم) | جميع المخالفات السلوكية بما فيها التأخر |
| سلوك → إيجابي | 1 (سلوك) | 2 (إيجابي) | تعويضية + متمايز |
| مواظبة | 2 (مواظبة) | — | الغياب بأنواعه الأربعة |

---

## القسم 1: إصلاح الأخطاء الحرجة

### 1.1 أسماء الحقول في noor-bridge.js

**المشكلة:** الإضافة تستخدم أسماء عربية بينما الـ API يرسل أسماء إنجليزية (camelCase).

| الموقع في noor-bridge.js | الخطأ | الصحيح |
|--------------------------|-------|--------|
| سطر 489 (executeDocumentation) | `rec['الصف']` | `rec.grade` |
| سطر 951 (moveToNextGroup) | `rec['الصف']` | `rec.grade` |
| سطر 1046 (testBatchSupport) | `rec['اسم_الطالب']` | `rec.studentName` |
| سطر 1080 (processBatch) | `rec['اسم_الطالب']` | `rec.studentName` |
| سطر 1137 (processSequential) | `rec['اسم_الطالب']` | `rec.studentName` |

**السبب الجذري:** الـ API في NoorController.cs يرسل `StudentName`, `Grade`, `Class` → ASP.NET JSON serializer يحولها لـ `studentName`, `grade`, `class`.

### 1.2 حقن app-bridge.js في تطبيق React

**المشكلة:** manifest.json يحقن app-bridge.js فقط في:
- `script.google.com/*`
- `*.googleusercontent.com/*`

لا يشمل عنوان تطبيق React — فلا يُنشأ الجسر (inbox/outbox) على صفحة التطبيق.

**الحل — جزءان:**

1. **manifest.json:** إضافة عنوان التطبيق لقسم `content_scripts`. يحتاج تأكيد العنوان من المستخدم.

2. **app-bridge.js (سطر 21-22):** حارس الـ hostname يرفض أي نطاق غير `googleusercontent.com`:
   ```javascript
   if (window.location.hostname === 'script.google.com') return;
   if (window.location.hostname.indexOf('googleusercontent.com') === -1) return;
   ```
   يجب تعديله للسماح بنطاق تطبيق React أيضاً. بدون هذا التعديل، حتى لو حُقن الملف لن يعمل — سيخرج فوراً.

**ملاحظة:** app-bridge.js يترجم `noor-complete` → `action: 'done'` (سطر 81-82)، وNoorPage.tsx يستمع لـ `case 'done'` (سطر 122). الترجمة صحيحة — المشكلة أن الجسر لا يوجد أصلاً بسبب عدم الحقن + حارس الـ hostname.

### 1.3 دمج التأخر الصباحي ضمن المخالفات

**المشكلة:**
- التأخر الصباحي له تبويب وقسم API منفصل (`_type = "tardiness"`)
- يستخدم قيمة ثابتة `"1601174,الدرجة الأولى"` لجميع أنواع التأخر — خطأ
- حسب الدليل الرسمي: التأخر الصباحي مخالفة سلوكية كود 101

**الحل — NoorController.cs:**
- حذف قسم التأخر المنفصل (سطور 99-129)
- التأخر الصباحي يُسجل كمخالفة سلوكية (كود 101) في قسم المخالفات مع `_type = "violation"`
- تأخر الحصة (104) وعدم الاصطفاف (102) يُسجلان أصلاً في المخالفات

**الحل — NoorPage.tsx:**
- حذف تبويب `tardiness` من `NOOR_TABS`
- حذف `_TARD_LABELS` و `tardLabel`
- `TAB_ORDER` يصبح: `['violations', 'compensation', 'excellent', 'absence']`

**تأكيد:** لا يوجد تفريع بناءً على `_type` في `noor-bridge.js` — المحرك يعتمد على `_noorMode` (mowadaba/deductType) لاختيار المسار في نور، و`_noorValue`/`_noorText` لاختيار القيمة. لكن `_type` يُستخدم في `update-status` endpoint (سطر 413-425) لتوجيه التحديث للجدول الصحيح (`TardinessRecords` أو `Violations`). لذا السجلات المدمجة تبقى `_type = "tardiness"` لكنها تُعرض تحت تبويب المخالفات.

---

## القسم 2: تحصين التواصل

### 2.1 Service Worker Keepalive

**المشكلة:** Service Worker في MV3 ينام بعد 30 ثانية. عملية التوثيق قد تستغرق دقائق — إذا نام background.js تنقطع الرسائل.

**الحل في noor-bridge.js:**
```
عند بدء التنفيذ (executeDocumentation):
  → تشغيل timer كل 25 ثانية يرسل { type: 'keepalive' } لـ background.js

عند الانتهاء (moveToNextGroup آخر مجموعة) أو الخطأ (cleanupExec):
  → إيقاف timer
```

**ملاحظة مهمة:** الـ keepalive يجب أن يستخدم `chrome.runtime.sendMessage` مباشرة وليس `safeSend`، لأن `safeSend` تضع `alive = false` عند أي خطأ (سطر 50) مما يقتل الجسر نهائياً. الـ keepalive يحتاج آلية إرسال مستقلة مع إعادة تعيين `alive = true` إذا نجح الإرسال بعد فشل سابق.

**الحل في background.js:**
```
استقبال رسالة keepalive → console.log فقط (الاستقبال نفسه يبقي SW نشطاً)
```

### 2.2 زيادة مهلة الاستئناف

**المشكلة:** المهلة 5 دقائق فقط (القيمة `300000` في الكود). إنترنت بطيء يعني تحميل صفحة نور قد يأخذ وقتاً أطول.

**الحل:** زيادة من `300000` إلى `900000` (15 دقيقة) في **موقعين**:
- `checkResumeExecution` (سطر ~1373)
- `boot` (سطر ~1428)

### 2.3 عقد بيانات موحد (Field Constants)

**المشكلة الجذرية:** أسماء الحقول مبعثرة كنصوص في عدة ملفات — تغيير في مكان يكسر الباقي بصمت.

**الحل:** تعريف ثوابت في أعلى noor-bridge.js:
```javascript
var F = {
  studentName: 'studentName',
  grade: 'grade',
  className: 'class',
  noorValue: '_noorValue',
  noorText: '_noorText',
  noorMode: '_noorMode',
  type: '_type',
  rowIndex: '_rowIndex'
};
```

استخدامها في كل الملف: `rec[F.grade]` بدلاً من `rec.grade`. إذا تغير اسم الحقل في الـ API، يكفي تعديل مكان واحد.

---

## القسم 3: تحسين الاعتمادية

### 3.1 نظام إعادة المحاولة

**الحالات التي تحتاج إعادة محاولة:**
- فشل اختيار قيمة من منسدلة (PostBack لم يكتمل)
- فشل حفظ الصفحة (زر الحفظ لم يستجب)

**الآلية:**
```
عند فشل عملية:
  محاولة 1 → انتظار 1 ثانية → إعادة
  محاولة 2 → انتظار 2 ثانية → إعادة
  محاولة 3 → انتظار 4 ثوانٍ → إعادة
  فشل نهائي → تسجيل الطالب كـ "فشل" + الانتقال للطالب التالي
```

**المبدأ:** لا تتوقف العملية بالكامل بسبب طالب واحد.

### 3.2 ~~تحسين التحقق من جاهزية الصفحة~~ (ملغى — موجود فعلاً)

**ملاحظة:** v5.3 يتضمن فعلاً `waitForPostBack` و`doPostBackAndWait` مع `add_endRequest` + timeout fallback (سطور 294-350). لا حاجة لتغيير إضافي.

### 3.3 تسجيل أوضح للنتائج

إضافة ملخص مفصل يُرسل مع `noor-complete`:
```javascript
{
  type: 'noor-complete',
  success: 15,
  failed: 2,
  updates: [...],
  // جديد:
  summary: [
    { grade: 'الأول', success: 8, failed: 1, errors: ['أحمد محمد: قيمة غير مطابقة'] },
    { grade: 'الثاني', success: 7, failed: 1, errors: ['خالد علي: غير موجود في الجدول'] }
  ]
}
```

**يتطلب تحديث في ملفين إضافيين:**
- **app-bridge.js:** تعديل دالة `translate` (سطر 82) لتمرير حقل `summary` الجديد
- **NoorPage.tsx:** تعديل `case 'done'` (سطر 122) لاستقبال وعرض الملخص

---

## القسم 4: تبسيط الواجهة

### 4.1 حذف تبويب التأخر

**NoorPage.tsx:**
- حذف `tardiness` من `NOOR_TABS`
- حذف `_TARD_LABELS` و `tardLabel`
- `TAB_ORDER`: `['violations', 'compensation', 'excellent', 'absence']`

### 4.2 تحديث الإحصائيات

**NoorController.cs:**
- حذف `stats.tardiness` من الاستجابة
- أو دمجه مع `stats.violations`

---

## ملخص التغييرات حسب الملف

| الملف | التغييرات |
|-------|-----------|
| **noor-bridge.js** | إصلاح 5 أسماء حقول + إضافة ثوابت F + keepalive timer مستقل عن safeSend + إعادة محاولة 3x + زيادة مهلة لـ 15 دقيقة (موقعين) + ملخص نتائج مفصل |
| **manifest.json** | إضافة عنوان تطبيق React لـ content_scripts |
| **app-bridge.js** | تعديل حارس hostname للسماح بنطاق React + تمرير حقل summary في translate |
| **background.js** | استقبال keepalive |
| **NoorPage.tsx** | حذف تبويب التأخر + ثوابته + عرض ملخص النتائج |
| **NoorController.cs** | دمج التأخر الصباحي ضمن المخالفات (كود 101) + حذف قسم التأخر المنفصل |

## المخاطر والتخفيف

| المخاطر | التخفيف |
|---------|---------|
| تغيير أسماء الحقول يكسر توافقية قديمة | لا يوجد — النظام الحالي لا يعمل أصلاً بالأسماء الخطأ |
| دمج التأخر يفقد سجلات معلقة | التأخر الصباحي الحالي (NoorStatus = معلق) يُعاد تصنيفه كمخالفة |
| keepalive يزيد استهلاك الموارد | رسالة صغيرة كل 25 ثانية — تأثير لا يُذكر |
| عنوان التطبيق قد يتغير | يحتاج تحديث manifest.json يدوياً |
