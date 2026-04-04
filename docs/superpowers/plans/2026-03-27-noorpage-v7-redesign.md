# إعادة تصميم صفحة التوثيق — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** تحويل NoorPage.tsx من "لوحة تحكم ترسل أوامر للإضافة عبر جسر DOM" إلى "لوحة مراقبة تعرض الحالة الحية وتتيح للمستخدم التحكم في السجلات"، مع تحديث تصميم الإضافة v7 ليطابق لغة التصميم.

**Architecture:** تعديل السيرفر (NoorController) لإضافة 3 نقاط API جديدة + حماية من التعارض + إشعار SignalR. تعديل الفرونتند (noor.ts + NoorPage.tsx) لحذف كود الجسر وإضافة التبويب الجديد والإجراءات. تحديث CSS الإضافة لمطابقة لغة التصميم.

**Tech Stack:** ASP.NET Core 8, EF Core, SignalR, React 18, TypeScript, Chrome Extension MV3

**Spec:** `docs/superpowers/specs/2026-03-27-noorpage-v7-redesign.md`

---

## هيكل الملفات

| الملف | التعديل | المسؤولية |
|-------|---------|-----------|
| `src/API/Controllers/NoorController.cs` | Modify | إضافة exclude/restore/documented-today + تعديل update-status + pending-records |
| `client/src/api/noor.ts` | Modify | إضافة exclude(), restore(), getDocumentedToday() |
| `client/src/pages/NoorPage.tsx` | Modify | إعادة هيكلة كاملة — حذف جسر + إضافة ميزات جديدة |
| `noor-extension-v7/ui.css` | Modify | تحديث الألوان والخط والزوايا والظل |
| `noor-extension-v7/ui.js` | Modify | استبدال الرموز النصية بـ Material Symbols |
| `noor-extension-v7/popup.html` | Modify | إضافة رابط خط Cairo + Material Symbols |
| `noor-extension-v7/popup.css` | Modify | تحديث الألوان والخط والحقول |

> **ملاحظة:** ملفات الإضافة v7 في:
> `d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7/`

---

### Task 1: السيرفر — حماية التعارض + إشعار SignalR في update-status

**Files:**
- Modify: `src/API/Controllers/NoorController.cs:1-23` (constructor + imports)
- Modify: `src/API/Controllers/NoorController.cs:416-465` (UpdateStatus endpoint)

**Context:** حالياً `update-status` يحدّث أي سجل بدون فحص حالته. يجب:
1. حقن `NotificationService` في NoorController (مسجل كـ Scoped في Program.cs سطر 38)
2. فحص الحالة قبل التحديث — رفض تحديث "مستبعد" و "لا يحتاج"
3. إرسال إشعار SignalR بعد التحديث

**Pattern:** `NotificationService` يغلّف `IHubContext<NotificationHub>` — يُستدعى بـ `SendAsync(type, data)`. مسجّل في `Program.cs` سطر 38. لم يُحقن في NoorController بعد — يجب إضافته للـ constructor.

- [ ] **Step 1: تعديل imports و constructor**

في `src/API/Controllers/NoorController.cs`، أضف import لـ NotificationService وحقنه:

```csharp
// أضف في الأعلى مع الـ usings الموجودة:
using SchoolBehaviorSystem.API.Services;

// غيّر الحقول والـ constructor:
public class NoorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHijriDateService _hijri;
    private readonly NotificationService _notifications;

    public NoorController(AppDbContext db, IHijriDateService hijri, NotificationService notifications)
    {
        _db = db;
        _hijri = hijri;
        _notifications = notifications;
    }
```

- [ ] **Step 2: تعديل UpdateStatus — إضافة فحص الحالة + SignalR**

استبدل محتوى method `UpdateStatus` (سطر 416-465) بالكامل:

```csharp
[HttpPost("update-status")]
public async Task<ActionResult<ApiResponse<object>>> UpdateStatus(
    [FromBody] NoorStatusUpdateRequest request)
{
    int updated = 0, failed = 0;

    foreach (var update in request.Updates)
    {
        try
        {
            string? currentStatus = null;

            switch (update.Type)
            {
                case "violation":
                    var v = await _db.Violations.FindAsync(update.Id);
                    if (v != null)
                    {
                        if (v.NoorStatus == "مستبعد" || v.NoorStatus == "لا يحتاج")
                        { failed++; continue; }
                        v.NoorStatus = update.Status;
                        updated++;
                    }
                    else failed++;
                    break;

                case "tardiness":
                    var t = await _db.TardinessRecords.FindAsync(update.Id);
                    if (t != null)
                    {
                        if (t.NoorStatus == "مستبعد" || t.NoorStatus == "لا يحتاج")
                        { failed++; continue; }
                        t.NoorStatus = update.Status;
                        updated++;
                    }
                    else failed++;
                    break;

                case "compensation":
                case "excellent":
                case "positive":
                    var p = await _db.PositiveBehaviors.FindAsync(update.Id);
                    if (p != null)
                    {
                        if (p.NoorStatus == "مستبعد" || p.NoorStatus == "لا يحتاج")
                        { failed++; continue; }
                        p.NoorStatus = update.Status;
                        updated++;
                    }
                    else failed++;
                    break;

                case "absence":
                    var a = await _db.DailyAbsences.FindAsync(update.Id);
                    if (a != null)
                    {
                        if (a.NoorStatus == "مستبعد" || a.NoorStatus == "لا يحتاج")
                        { failed++; continue; }
                        a.NoorStatus = update.Status;
                        updated++;
                    }
                    else failed++;
                    break;

                default:
                    failed++;
                    break;
            }
        }
        catch { failed++; }
    }

    await _db.SaveChangesAsync();

    // إشعار SignalR — الصفحة تستقبله وتعيد جلب السجلات
    await _notifications.SendAsync("noor-status-updated", new { updated, failed });

    return Ok(ApiResponse<object>.Ok(new { updated, failed }));
}
```

- [ ] **Step 3: تحقق يدوي**

Run: `dotnet build src/API/API.csproj`
Expected: Build succeeded (0 errors)

- [ ] **Step 4: Commit**

```bash
git add src/API/Controllers/NoorController.cs
git commit -m "feat(noor): add race-condition guard + SignalR notification to update-status"
```

---

### Task 2: السيرفر — نقاط API جديدة (exclude, restore, documented-today)

**Files:**
- Modify: `src/API/Controllers/NoorController.cs` (أضف 3 endpoints قبل closing brace of class)

**Context:** يجب إضافة:
1. `POST /api/noor/exclude` — يغيّر NoorStatus إلى "مستبعد"
2. `POST /api/noor/restore` — يرجع NoorStatus إلى "" (معلق)
3. `GET /api/noor/documented-today` — يرجع السجلات الموثقة اليوم

**Request/Response format:** نفس شكل update-status — body بـ `{ updates: [{ id, type }] }`

- [ ] **Step 1: إضافة request class لـ exclude/restore**

أضف قبل نهاية الملف (قبل `NoorMappings` static class) أو بعد `NoorStatusUpdateRequest`:

```csharp
public class NoorBulkRequest
{
    public List<NoorBulkItem> Updates { get; set; } = new();
}

public class NoorBulkItem
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
}
```

ابحث عن `NoorStatusUpdateRequest` (موجود في نهاية الملف تقريباً) وأضف الكلاس بعده.

- [ ] **Step 2: إضافة Exclude endpoint**

أضف بعد method `UpdateStatus` مباشرة:

```csharp
// ====================================================================
// استبعاد سجلات من التوثيق (مؤقت — قابل للإرجاع)
// ====================================================================
[HttpPost("exclude")]
public async Task<ActionResult<ApiResponse<object>>> Exclude(
    [FromBody] NoorBulkRequest request)
{
    int updated = 0;

    foreach (var item in request.Updates)
    {
        try
        {
            switch (item.Type)
            {
                case "violation":
                    var v = await _db.Violations.FindAsync(item.Id);
                    if (v != null && v.NoorStatus != "تم" && v.NoorStatus != "لا يحتاج")
                    { v.NoorStatus = "مستبعد"; updated++; }
                    break;
                case "tardiness":
                    var t = await _db.TardinessRecords.FindAsync(item.Id);
                    if (t != null && t.NoorStatus != "تم" && t.NoorStatus != "لا يحتاج")
                    { t.NoorStatus = "مستبعد"; updated++; }
                    break;
                case "compensation":
                case "excellent":
                case "positive":
                    var p = await _db.PositiveBehaviors.FindAsync(item.Id);
                    if (p != null && p.NoorStatus != "تم" && p.NoorStatus != "لا يحتاج")
                    { p.NoorStatus = "مستبعد"; updated++; }
                    break;
                case "absence":
                    var a = await _db.DailyAbsences.FindAsync(item.Id);
                    if (a != null && a.NoorStatus != "تم" && a.NoorStatus != "لا يحتاج")
                    { a.NoorStatus = "مستبعد"; updated++; }
                    break;
            }
        }
        catch { /* skip */ }
    }

    await _db.SaveChangesAsync();
    return Ok(ApiResponse<object>.Ok(new { updated }));
}
```

- [ ] **Step 3: إضافة Restore endpoint**

أضف بعد Exclude مباشرة:

```csharp
// ====================================================================
// إرجاع سجلات مستبعدة للقائمة الرئيسية
// ====================================================================
[HttpPost("restore")]
public async Task<ActionResult<ApiResponse<object>>> Restore(
    [FromBody] NoorBulkRequest request)
{
    int updated = 0;

    foreach (var item in request.Updates)
    {
        try
        {
            switch (item.Type)
            {
                case "violation":
                    var v = await _db.Violations.FindAsync(item.Id);
                    if (v != null && v.NoorStatus == "مستبعد")
                    { v.NoorStatus = ""; updated++; }
                    break;
                case "tardiness":
                    var t = await _db.TardinessRecords.FindAsync(item.Id);
                    if (t != null && t.NoorStatus == "مستبعد")
                    { t.NoorStatus = ""; updated++; }
                    break;
                case "compensation":
                case "excellent":
                case "positive":
                    var p = await _db.PositiveBehaviors.FindAsync(item.Id);
                    if (p != null && p.NoorStatus == "مستبعد")
                    { p.NoorStatus = ""; updated++; }
                    break;
                case "absence":
                    var a = await _db.DailyAbsences.FindAsync(item.Id);
                    if (a != null && a.NoorStatus == "مستبعد")
                    { a.NoorStatus = ""; updated++; }
                    break;
            }
        }
        catch { /* skip */ }
    }

    await _db.SaveChangesAsync();
    return Ok(ApiResponse<object>.Ok(new { updated }));
}
```

- [ ] **Step 4: إضافة DocumentedToday endpoint**

أضف بعد Restore:

```csharp
// ====================================================================
// السجلات الموثقة اليوم (نجح + فشل)
// ====================================================================
[HttpGet("documented-today")]
public async Task<ActionResult<ApiResponse<object>>> GetDocumentedToday(
    [FromQuery] string type = "all")
{
    var today = DateTime.Today;
    var records = new List<object>();

    // المخالفات + التأخر
    if (type is "all" or "violations")
    {
        var violations = await _db.Violations
            .Where(v => (v.NoorStatus == "تم" || v.NoorStatus == "failed") && v.RecordedAt >= today)
            .Select(v => new {
                v.Id, _type = "violation",
                v.StudentName, v.Grade, v.Class,
                description = v.Description ?? v.ViolationCode ?? "",
                date = v.RecordedAt.ToString("yyyy-MM-dd"),
                result = v.NoorStatus == "تم" ? "نجح" : "فشل"
            }).ToListAsync();
        records.AddRange(violations);

        var tardiness = await _db.TardinessRecords
            .Where(t => (t.NoorStatus == "تم" || t.NoorStatus == "failed") && t.RecordedAt >= today)
            .Select(t => new {
                t.Id, _type = "tardiness",
                t.StudentName, t.Grade, t.Class,
                description = t.TardinessType.ToString(),
                date = t.RecordedAt.ToString("yyyy-MM-dd"),
                result = t.NoorStatus == "تم" ? "نجح" : "فشل"
            }).ToListAsync();
        records.AddRange(tardiness);
    }

    // السلوك الإيجابي — نفس نمط pending-records: تصنيف compensation/excellent بعد الجلب
    if (type is "all" or "compensation" or "excellent")
    {
        var allPositive = await _db.PositiveBehaviors
            .Where(p => (p.NoorStatus == "تم" || p.NoorStatus == "failed") && p.RecordedAt >= today)
            .Select(p => new {
                p.Id, p.StudentName, p.Grade, p.Class,
                behaviorType = p.BehaviorType ?? "",
                details = p.Details ?? "",
                degree = p.Degree.ToString(),
                date = p.RecordedAt.ToString("yyyy-MM-dd"),
                p.NoorStatus
            }).ToListAsync();

        foreach (var p in allPositive)
        {
            var isComp = p.behaviorType.Contains("تعويض") || p.details.Contains("تعويض")
                         || p.degree.Contains("تعويض");
            var recType = isComp ? "compensation" : "excellent";

            if (type == "all" || type == recType)
            {
                records.Add(new {
                    p.Id, _type = recType,
                    p.StudentName, p.Grade, p.Class,
                    description = p.behaviorType != "" ? p.behaviorType : p.details,
                    p.date,
                    result = p.NoorStatus == "تم" ? "نجح" : "فشل"
                });
            }
        }
    }

    // الغياب
    if (type is "all" or "absence")
    {
        var absences = await _db.DailyAbsences
            .Where(a => (a.NoorStatus == "تم" || a.NoorStatus == "failed") && a.RecordedAt >= today)
            .Select(a => new {
                a.Id, _type = "absence",
                a.StudentName, a.Grade, a.Class,
                description = a.AbsenceType.ToString(),
                date = a.RecordedAt.ToString("yyyy-MM-dd"),
                result = a.NoorStatus == "تم" ? "نجح" : "فشل"
            }).ToListAsync();
        records.AddRange(absences);
    }

    return Ok(ApiResponse<object>.Ok(new { records }));
}
```

- [ ] **Step 5: تعديل pending-records لتشمل السجلات الفاشلة**

في method `GetPendingRecords`، عدّل كل فلتر NoorStatus ليشمل `"failed"`:

**المخالفات** (سطر 45 تقريباً):
```csharp
// من:
var q = _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق"));
// إلى:
var q = _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"));
```

**التأخر** (سطر 113 تقريباً):
```csharp
// من:
var tQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق");
// إلى:
var tQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق" || t.NoorStatus == "failed");
```

**السلوك الإيجابي** (سطر 148 تقريباً):
```csharp
// من:
var q = _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق");
// إلى:
var q = _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق" || p.NoorStatus == "failed");
```

**الغياب** (سطر 204 تقريباً):
```csharp
// من:
var q = _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق");
// إلى:
var q = _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق" || a.NoorStatus == "failed");
```

**الإحصائيات** (سطور 360-363 تقريباً):
```csharp
// نفس التعديل — أضف || v.NoorStatus == "failed" لكل فلتر في GetStats:
var vQ = _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"));
var tQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق" || t.NoorStatus == "failed");
var pQ = _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق" || p.NoorStatus == "failed");
var aQ = _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق" || a.NoorStatus == "failed");
```

- [ ] **Step 6: تحقق**

Run: `dotnet build src/API/API.csproj`
Expected: Build succeeded (0 errors)

- [ ] **Step 7: Commit**

```bash
git add src/API/Controllers/NoorController.cs
git commit -m "feat(noor): add exclude/restore/documented-today endpoints + include failed in pending"
```

---

### Task 3: الفرونتند API — إضافة الدوال الجديدة

**Files:**
- Modify: `client/src/api/noor.ts`

**Context:** الملف الحالي فيه 27 سطر مع 4 دوال: getPendingRecords, getStats, updateStatus, getMappings. نضيف 3 دوال ونحذف getMappings.

- [ ] **Step 1: تعديل noor.ts**

استبدل محتوى الملف بالكامل:

```typescript
import api from './client';

export interface NoorStatusUpdate {
  id: number;
  type: string;
  status: string;
}

export interface NoorBulkItem {
  id: number;
  type: string;
}

export const noorApi = {
  getPendingRecords: (stage?: string, type?: string, filterMode?: string) => {
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (type) params.set('type', type);
    if (filterMode) params.set('filterMode', filterMode);
    return api.get(`/noor/pending-records?${params.toString()}`);
  },

  getStats: (stage?: string, filterMode?: string) => {
    const params = new URLSearchParams();
    if (stage) params.set('stage', stage);
    if (filterMode) params.set('filterMode', filterMode);
    return api.get(`/noor/stats?${params.toString()}`);
  },

  updateStatus: (updates: NoorStatusUpdate[]) =>
    api.post('/noor/update-status', { updates }),

  exclude: (updates: NoorBulkItem[]) =>
    api.post('/noor/exclude', { updates }),

  restore: (updates: NoorBulkItem[]) =>
    api.post('/noor/restore', { updates }),

  getDocumentedToday: (type?: string) =>
    api.get(`/noor/documented-today?type=${type || 'all'}`),
};
```

- [ ] **Step 2: تحقق**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/api/noor.ts
git commit -m "feat(noor): add exclude/restore/documentedToday API + remove getMappings"
```

---

### Task 4: NoorPage — حذف كود الجسر والاتصال بالإضافة

**Files:**
- Modify: `client/src/pages/NoorPage.tsx`

**Context:** هذه أكبر مهمة — حذف كل كود الجسر (bridge) والحالات المرتبطة به. النص التالي يحدد بالضبط ما يُحذف. **انتبه:** لا تحذف الدوال التي ستبقى (loadRecords, loadStats, groupedRecords, etc.).

- [ ] **Step 1: حذف imports غير مطلوبة**

في السطر 1، أزل `useRef` من imports (لم يعد مطلوب):

```typescript
// من:
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// إلى:
import React, { useState, useEffect, useCallback, useMemo } from 'react';
```

أضف import لـ useSignalR و FloatingBar:

```typescript
import { useSignalR } from '../hooks/useSignalR';
import FloatingBar from '../components/shared/FloatingBar';
```

- [ ] **Step 2: حذف حالات الجسر**

احذف هذه الحالات (سطور 72-82 تقريباً):
```typescript
// احذف كل هذا:
const [noorMappings, setNoorMappings] = useState<Record<string, any> | null>(null);
const [extConnected, setExtConnected] = useState(false);
const [extUserName, setExtUserName] = useState('');
const [extWorking, setExtWorking] = useState(false);
const [extProgress, setExtProgress] = useState({ done: 0, total: 0, current: '' });
const bridgeInboxRef = useRef<HTMLDivElement | null>(null);
const bridgeOutboxRef = useRef<HTMLDivElement | null>(null);
```

- [ ] **Step 3: حذف دوال الجسر**

احذف هذه الدوال بالكامل (سطور 87-186 تقريباً):
- `findBridge` (87-97)
- `sendToExt` (99-104)
- `handleExtMessage` (107-145)
- `useEffect` للـ MutationObserver + postMessage (148-174)
- `noorConnect` (176-179)
- `noorDisconnect` (182-186)

- [ ] **Step 4: حذف useEffect لـ getMappings**

احذف (سطور 222-226):
```typescript
// احذف:
useEffect(() => {
  noorApi.getMappings().then(res => {
    if (res.data?.data) setNoorMappings(res.data.data);
  }).catch(() => {});
}, []);
```

- [ ] **Step 5: تبسيط executeMarkAsDone — حذف مسار الإضافة**

استبدل `executeMarkAsDone` (سطور 294-362) بـ:

```typescript
const executeMarkAsDone = async () => {
  setConfirmOpen(false);
  const selectedRecs = Array.from(selected).map(idx => records[idx]);

  setUpdating(true);
  try {
    const updates: NoorStatusUpdate[] = selectedRecs.map(rec => ({
      id: rec.id,
      type: rec._type,
      status: 'تم',
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
```

- [ ] **Step 6: حذف JSX الجسر — شريط الاتصال + شاشة التقدم**

احذف من JSX:
1. **شريط الاتصال بإضافة نور** (سطور 438-479 تقريباً) — الكتلة التي تبدأ بـ `{/* ═══ شريط الاتصال بإضافة نور ═══ */}`
2. **شاشة التقدم** (سطور 481-513 تقريباً) — الكتلة `{extWorking && (...)}`

- [ ] **Step 7: إزالة matchStats و إصلاح فوتر الجدول**

المتغير `matchStats` (سطور 385-388) سيُبقى مؤقتاً لأنه مستخدم في الفوتر. لكن أزل إشارة `absenceOverrides` من useMemo لأنه لن يُستخدم:

في الفوتر: `noorMappings` لم يعد موجوداً. تأكد أن كل إشارة لـ `extConnected` و `noorMappings` محذوفة من JSX.

- [ ] **Step 8: إزالة إشارات extConnected من زر التوثيق**

في شريط الإجراءات (سطر 575 تقريباً)، غيّر زر التوثيق:

```typescript
// من:
background: selected.size > 0 ? (extConnected ? '#4f46e5' : '#22c55e') : '#e5e7eb',
// إلى:
background: selected.size > 0 ? '#22c55e' : '#e5e7eb',

// والنص:
// من:
{extConnected ? <span>...</span> : <span>...</span>} {updating ? '...' : (extConnected ? '...' : '...')}
// إلى:
<span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</span>
{updating ? 'جاري التحديث...' : 'تحديث كـ "تم"'}
```

- [ ] **Step 9: تحقق**

Run: `cd client && npx tsc --noEmit`
Expected: No errors (أو أخطاء محدودة تُعالج)

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/NoorPage.tsx
git commit -m "refactor(noor): remove bridge code, simplify to monitoring-only page"
```

---

### Task 5: NoorPage — إضافة تبويب "الموثق اليوم" + SignalR

**Files:**
- Modify: `client/src/pages/NoorPage.tsx`

**Context:** بعد Task 4، الصفحة صارت بدون جسر. الآن نضيف:
1. تبويب "الموثق اليوم" (documented) — خامس تبويب
2. ربط SignalR لتحديث فوري
3. مؤشر "آخر تحديث"

- [ ] **Step 1: إضافة التبويب الجديد في NOOR_TABS و TAB_ORDER**

```typescript
const NOOR_TABS: Record<string, TabDef> = {
  violations:   { id: 'violations',   icon: 'balance', label: 'مخالفات',       color: '#ef4444', desc: 'المخالفات السلوكية المعلقة للتوثيق في نور (تشمل التأخر الصباحي)' },
  compensation: { id: 'compensation', icon: 'sync', label: 'تعويضية',       color: '#3b82f6', desc: 'درجات التعويض — فرص تعويض للطلاب المخصوم منهم' },
  excellent:    { id: 'excellent',    icon: 'auto_awesome', label: 'سلوك متمايز',   color: '#22c55e', desc: 'السلوك المتمايز للطلاب المتميزين' },
  absence:      { id: 'absence',     icon: 'event_busy', label: 'غياب يومي',     color: '#f97316', desc: 'سجلات الغياب اليومي — يُدخل في نفس اليوم فقط' },
  documented:   { id: 'documented',  icon: 'check_circle', label: 'الموثق اليوم', color: '#00695c', desc: 'السجلات التي تم توثيقها في نور اليوم' },
};
const TAB_ORDER = ['violations', 'compensation', 'excellent', 'absence', 'documented'];
```

- [ ] **Step 2: إضافة حالات جديدة — documentedRecords + lastUpdated**

بعد حالة `absenceOverrides`:

```typescript
const [documentedRecords, setDocumentedRecords] = useState<NoorRecord[]>([]);
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
const [lastUpdatedText, setLastUpdatedText] = useState('');
```

- [ ] **Step 3: إضافة useSignalR + تأثير التحديث الفوري**

بعد حالات الصفحة:

```typescript
const { lastNotification } = useSignalR();

// تحديث فوري عبر SignalR
useEffect(() => {
  if (lastNotification?.type === 'noor-status-updated') {
    loadRecords(activeTab);
    loadStats();
    if (activeTab === 'documented') loadDocumentedToday();
    setLastUpdated(new Date());
  }
}, [lastNotification]);
```

- [ ] **Step 4: إضافة دالة loadDocumentedToday**

بعد `loadRecords`:

```typescript
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
```

- [ ] **Step 5: تحديث loadRecords ليتعامل مع تبويب documented**

عدّل `switchTab` و `useEffect` لجلب documented عند اختياره:

```typescript
const switchTab = (tab: string) => {
  setActiveTab(tab);
  if (tab === 'documented') loadDocumentedToday();
};

// عدّل useEffect الموجود:
useEffect(() => {
  if (activeTab === 'documented') {
    loadDocumentedToday();
  } else {
    loadRecords(activeTab);
  }
}, [activeTab, loadRecords, loadDocumentedToday]);
```

- [ ] **Step 6: إضافة مؤشر "آخر تحديث"**

```typescript
// تحديث نص "آخر تحديث" كل ثانية
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
```

- [ ] **Step 7: إخفاء الفلتر في تبويب documented**

غلّف شريط الفلتر الموجود بشرط:

```typescript
{activeTab !== 'documented' && (
  <div style={{...}}>
    {/* ... الفلتر الحالي ... */}
  </div>
)}
```

- [ ] **Step 8: عرض جدول الموثق اليوم**

في JSX، بعد الجدول الحالي (داخل حاوية الجدول)، أضف عرضاً مشروطاً لتبويب documented:

```typescript
{activeTab === 'documented' ? (
  // جدول الموثق اليوم
  documentedRecords.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
      <p><span className="material-symbols-outlined" style={{fontSize:36,color:'#9ca3af'}}>inbox</span></p>
      <p style={{ fontSize: '16px', fontWeight: 500 }}>لا توجد سجلات موثقة اليوم بعد</p>
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
          {documentedRecords.map((rec, i) => (
            <tr key={`${rec._type}-${rec.id}`} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ fontWeight: 600, color: '#1f2937' }}>{rec.studentName}</td>
              <td style={{ fontSize: '13px', color: '#4b5563' }}>{rec.grade}</td>
              <td style={{ fontSize: '13px', color: '#4b5563' }}>{classToLetter(rec.class)}</td>
              <td style={{ fontSize: '13px', color: '#4b5563' }}>
                {rec._type === 'violation' ? 'مخالفة' : rec._type === 'tardiness' ? 'تأخر' :
                 rec._type === 'compensation' ? 'تعويضية' : rec._type === 'excellent' ? 'متمايز' :
                 rec._type === 'absence' ? 'غياب' : rec._type}
              </td>
              <td style={{ fontSize: '13px', color: '#374151', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rec.description}
              </td>
              <td>
                {rec.result === 'نجح' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#ecfdf5', color: '#10b981' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span> نجح
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '12px', fontWeight: 700, borderRadius: '8px', background: '#fef2f2', color: '#ef4444' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>cancel</span> فشل
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
) : (
  // الجدول الحالي للتبويبات 1-4 (الكود الموجود بالفعل)
  ...
)}
```

- [ ] **Step 9: تعديل شريط الإجراءات — إضافة مؤشر آخر تحديث**

أضف بعد عدد السجلات:

```typescript
{lastUpdatedText && (
  <span style={{ fontSize: '12px', color: '#9da3b8' }}>
    آخر تحديث: {lastUpdatedText}
  </span>
)}
```

- [ ] **Step 10: تعديل getColSpan**

```typescript
function getColSpan(tab: string): number {
  switch (tab) {
    case 'violations': return 9;  // +1 عمود إجراء
    case 'excellent': return 9;
    case 'compensation': return 8;
    case 'absence': return 8;
    case 'documented': return 6;
    default: return 9;
  }
}
```

- [ ] **Step 11: تحقق**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 12: Commit**

```bash
git add client/src/pages/NoorPage.tsx
git commit -m "feat(noor): add documented-today tab + SignalR live updates + last-updated indicator"
```

---

### Task 6: السيرفر — دعم filterMode=excluded في pending-records

**Files:**
- Modify: `src/API/Controllers/NoorController.cs` (GetPendingRecords method)

**Context:** قسم المستبعد في الفرونتند يحتاج جلب السجلات بحالة "مستبعد". أبسط حل: إضافة دعم `filterMode=excluded` في نفس endpoint الحالي.

- [ ] **Step 1: تعديل كل فلتر NoorStatus ليدعم excluded**

في GetPendingRecords، الفلاتر الحالية:
```csharp
.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"))
```

أضف شرطاً في بداية الـ method:
```csharp
// بعد تحويل stage و filterMode
bool isExcluded = filterMode == "excluded";
```

ثم غيّر كل فلتر NoorStatus:
```csharp
// المخالفات
var q = isExcluded
    ? _db.Violations.Where(v => v.NoorStatus == "مستبعد")
    : _db.Violations.Where(v => (v.NoorStatus == null || v.NoorStatus == "" || v.NoorStatus == "معلق" || v.NoorStatus == "failed"));

// التأخر
var tQ = isExcluded
    ? _db.TardinessRecords.Where(t => t.NoorStatus == "مستبعد")
    : _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق" || t.NoorStatus == "failed");

// السلوك الإيجابي
var q = isExcluded
    ? _db.PositiveBehaviors.Where(p => p.NoorStatus == "مستبعد")
    : _db.PositiveBehaviors.Where(p => p.NoorStatus == "" || p.NoorStatus == "معلق" || p.NoorStatus == "failed");

// الغياب
var q = isExcluded
    ? _db.DailyAbsences.Where(a => a.NoorStatus == "مستبعد")
    : _db.DailyAbsences.Where(a => a.NoorStatus == "" || a.NoorStatus == "معلق" || a.NoorStatus == "failed");
```

**ملاحظة:** عند filterMode=excluded، لا تطبّق فلتر التاريخ (today/all) — المستبعد يعرض كل الفترات.

- [ ] **Step 2: تحقق**

Run: `dotnet build src/API/API.csproj`
Expected: Build succeeded

- [ ] **Step 3: Commit**

```bash
git add src/API/Controllers/NoorController.cs
git commit -m "feat(noor): support filterMode=excluded in pending-records endpoint"
```

---

### Task 7: NoorPage — إجراءات الاستبعاد والحذف + قسم المستبعد

**Files:**
- Modify: `client/src/pages/NoorPage.tsx`

**Context:** إضافة:
1. حالة `excludedRecords` + دالة جلب المستبعد
2. أزرار إجراء فردية (استبعاد / حذف) في كل صف
3. إجراءات جماعية عبر FloatingBar
4. قسم المستبعد القابل للطي أسفل الجدول
5. مربع تأكيد الحذف النهائي

- [ ] **Step 1: إضافة حالات الاستبعاد والحذف**

```typescript
const [excludedRecords, setExcludedRecords] = useState<NoorRecord[]>([]);
const [excludedOpen, setExcludedOpen] = useState(false);
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<{ ids: { id: number; type: string }[]; count: number } | null>(null);
```

- [ ] **Step 2: دوال الاستبعاد والإرجاع والحذف**

```typescript
// استبعاد سجلات
const handleExclude = async (items: { id: number; type: string }[]) => {
  try {
    await noorApi.exclude(items);
    showSuccess(`تم استبعاد ${items.length} سجل`);
    setSelected(new Set());
    loadRecords(activeTab);
    loadStats();
  } catch {
    showError('خطأ في الاستبعاد');
  }
};

// إرجاع سجل من المستبعد
const handleRestore = async (items: { id: number; type: string }[]) => {
  try {
    await noorApi.restore(items);
    showSuccess(`تم إرجاع ${items.length} سجل`);
    loadRecords(activeTab);
    loadStats();
  } catch {
    showError('خطأ في الإرجاع');
  }
};

// حذف نهائي — يطلب تأكيد أولاً
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
    loadStats();
  } catch {
    showError('خطأ في الحذف');
  }
};
```

- [ ] **Step 3: إضافة عمود "إجراء" في thead و tbody (تبويبات 1-4)**

في `<thead>` بعد `<th>نور</th>`:
```typescript
{activeTab !== 'documented' && <th style={{ width: '80px' }}>إجراء</th>}
```

في `<tbody>` بعد خلية عمود "نور":
```typescript
{activeTab !== 'documented' && (
  <td>
    <div style={{ display: 'flex', gap: '4px' }}>
      <button
        onClick={() => handleExclude([{ id: rec.id, type: rec._type }])}
        title="استبعاد"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          borderRadius: '6px', color: '#9ca3af', transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>block</span>
      </button>
      <button
        onClick={() => requestDelete([{ id: rec.id, type: rec._type }])}
        title="حذف من التوثيق"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          borderRadius: '6px', color: '#9ca3af', transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete_forever</span>
      </button>
    </div>
  </td>
)}
```

- [ ] **Step 4: عمود "حالة نور" — عرض الحالة الفعلية**

استبدل محتوى خلية "نور" (حوالي سطر 743-749) بالعرض الجديد:

```typescript
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
```

- [ ] **Step 5: تلوين صفوف السجلات غير المطابقة**

عدّل خلفية الصف:
```typescript
// من:
style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}
// إلى:
style={{ background: (!rec._noorValue && !absenceOverrides[idx]) ? '#fef2f2' : (idx % 2 === 0 ? '#fff' : '#fafafa') }}
```

- [ ] **Step 6: إضافة FloatingBar**

بعد الـ JSX الرئيسي (قبل مربع تأكيد التوثيق)، أضف:

```typescript
{activeTab !== 'documented' && (
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
```

- [ ] **Step 7: قسم المستبعد — أسفل الجدول**

**ملاحظة:** السجلات المستبعدة تُجلب عبر `filterMode=excluded` المدعوم في Task 6 (الذي يُنفّذ قبل هذه المهمة).

أضف دالة جلب المستبعد:

```typescript
const loadExcluded = useCallback(async (type: string) => {
  try {
    const res = await noorApi.getPendingRecords(undefined, type, 'excluded');
    if (res.data?.data?.records) {
      setExcludedRecords(res.data.data.records);
    } else {
      setExcludedRecords([]);
    }
  } catch {
    setExcludedRecords([]);
  }
}, []);
```

أضف في JSX بعد نهاية حاوية الجدول الرئيسي وقبل FloatingBar:

```typescript
{/* ═══ قسم المستبعد ═══ */}
{activeTab !== 'documented' && excludedRecords.length > 0 && (
  <div style={{
    marginTop: '16px',
    background: '#fffbeb',
    borderRadius: '12px',
    border: '1px solid #fde68a',
    overflow: 'hidden',
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
                    <button
                      onClick={() => handleRestore([{ id: rec.id, type: rec._type }])}
                      title="إرجاع"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#10b981' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>undo</span>
                    </button>
                    <button
                      onClick={() => requestDelete([{ id: rec.id, type: rec._type }])}
                      title="حذف نهائياً"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                    >
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
```

- [ ] **Step 8: مربع تأكيد الحذف النهائي**

أضف في JSX (بجانب مربع تأكيد التوثيق الحالي):

```typescript
{/* مربع تأكيد الحذف النهائي */}
{deleteConfirmOpen && deleteTarget && (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
      <div style={{ marginBottom: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ef4444' }}>warning</span>
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#1f2937' }}>حذف من التوثيق نهائياً</h3>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: '1.6' }}>
        سيتم إزالة <strong style={{ color: '#ef4444' }}>{deleteTarget.count}</strong> سجل من صفحة التوثيق نهائياً.
        السجلات ستبقى في النظام (صفحة المخالفات/الغياب) لكن لن تظهر هنا مرة أخرى.
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
```

- [ ] **Step 9: جلب المستبعد عند تغيير التبويب**

عدّل useEffect الخاص بالتبويب:

```typescript
useEffect(() => {
  if (activeTab === 'documented') {
    loadDocumentedToday();
  } else {
    loadRecords(activeTab);
    loadExcluded(activeTab);
  }
}, [activeTab, loadRecords, loadDocumentedToday, loadExcluded]);
```

- [ ] **Step 10: تحقق**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 11: Commit**

```bash
git add client/src/pages/NoorPage.tsx
git commit -m "feat(noor): add exclude/restore/delete actions + excluded section + delete confirmation"
```

---

### Task 8: تحديث تصميم الإضافة — ui.css

**Files:**
- Modify: `d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7/ui.css`

**Context:** تحديث الألوان والخط والزوايا والظل ليطابق لغة تصميم التطبيق الرئيسي.

**التغييرات المحددة:**
- اللون الرئيسي: `#009688` → `#00695c`
- الخط: إضافة `Cairo` كأولوية
- الزوايا: توحيد بـ 8/12/16px
- الظل: نظام shadow-sm/md/lg

- [ ] **Step 1: إضافة import للخطوط في بداية الملف**

```css
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');
```

- [ ] **Step 2: تحديث المتغيرات والألوان**

استبدل كل `#009688` بـ `#00695c` في الملف.

تحديثات محددة:
```css
/* اللوحة الجانبية */
#noor-ext-panel {
  font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
  border-radius: 16px 0 0 16px; /* كبير */
  box-shadow: -4px 0 16px rgba(0,0,0,.08);
  background: #f4f5f9;
  border-left: 1px solid #e8ebf2;
}

/* زر التبديل */
#noor-ext-toggle {
  background: #00695c;
  border-radius: 8px 0 0 8px;
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
  font-size: 13px;
}

/* الرأس */
.nep-header {
  background: linear-gradient(135deg, #00695c, #00897b);
  border-radius: 0;
}

/* الأزرار */
.nep-btn {
  font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  transition: all .15s cubic-bezier(.4, 0, .2, 1);
}
.nep-btn-primary { background: #00695c; }
.nep-btn-primary:hover { background: #00796b; }

/* البطاقات */
.nep-content { border-radius: 12px; }

/* شريط التقدم */
.nep-progress-bar { border-radius: 8px; }
.nep-progress-fill { background: #00695c; border-radius: 8px; }
```

- [ ] **Step 3: تحديث ألوان النجاح/الفشل/التحذير**

```css
.nep-result-success { background: #ecfdf5; color: #10b981; }
.nep-result-partial { background: #fffbeb; color: #f59e0b; }
.nep-result-error { background: #fef2f2; color: #ef4444; }
```

- [ ] **Step 4: Commit**

```bash
cd "d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7"
git add ui.css
git commit -m "style(extension): update ui.css to match app design language"
```

> **ملاحظة:** إذا لم يكن المجلد مستودع git، انسخ الملف فقط (بدون commit).

---

### Task 9: تحديث تصميم الإضافة — popup.html + popup.css

**Files:**
- Modify: `noor-extension-v7/popup.html`
- Modify: `noor-extension-v7/popup.css`

- [ ] **Step 1: تحديث popup.html — إضافة خطوط**

أضف في `<head>` قبل `<link rel="stylesheet" href="popup.css">`:

```html
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
```

- [ ] **Step 2: تحديث popup.css**

التغييرات المحددة:

```css
body {
  font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
}

/* الحقول */
input {
  border: 1.5px solid #e8ebf2;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif;
}
input:focus {
  border-color: #00695c;
  box-shadow: 0 0 0 3px rgba(0, 105, 92, .15);
  outline: none;
}

/* زر تسجيل الدخول */
.btn-primary {
  background: #00695c;     /* بدل #009688 */
  border-radius: 8px;
  font-family: 'Cairo', sans-serif;
  font-weight: 700;
  font-size: 13px;
  padding: 9px 18px;
  transition: all .15s cubic-bezier(.4, 0, .2, 1);
}
.btn-primary:hover {
  background: #00796b;
}

/* بطاقة المعلومات */
.info-card {
  background: #e0f2f1;     /* اللون الرئيسي فاتح */
  border: 1px solid #b2dfdb;
  border-radius: 12px;
}
```

- [ ] **Step 3: Commit**

```bash
cd "d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7"
git add popup.html popup.css
git commit -m "style(extension): update popup design to match app design language"
```

---

### Task 10: تحديث تصميم الإضافة — ui.js (Material Symbols)

**Files:**
- Modify: `noor-extension-v7/ui.js`

**Context:** استبدال الرموز النصية (emoji) بأيقونات Material Symbols Outlined.

- [ ] **Step 1: استبدال الرموز**

ابحث واستبدل في ui.js:

| الرمز الحالي | البديل |
|-------------|--------|
| `🔑` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">key</span>` |
| `✓` أو `✅` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;color:#10b981">check_circle</span>` |
| `✗` أو `❌` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;color:#ef4444">cancel</span>` |
| `⏳` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">hourglass_top</span>` |
| `○` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">radio_button_unchecked</span>` |
| `📄` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">description</span>` |
| `👤` | `<span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle">person</span>` |

**ملاحظة:** عند استبدال الرموز في `innerHTML`، استخدم HTML tags بدلاً من text content. ابحث عن كل إيموجي في الملف واستبدله.

- [ ] **Step 2: تحديث الخط في العناصر المنشأة ديناميكياً**

في كل `createElement` أو `innerHTML` الذي يضيف نصوصاً، تأكد من أن `font-family` يستخدم `'Cairo', sans-serif`.

- [ ] **Step 3: Commit**

```bash
cd "d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7"
git add ui.js
git commit -m "style(extension): replace emoji icons with Material Symbols Outlined"
```

---

### Task 11: تكامل نهائي — تحقق وإصلاح

**Files:**
- All modified files

**Context:** بعد إكمال جميع المهام، تحقق من:
1. بناء السيرفر بنجاح
2. بناء الفرونتند بنجاح
3. لا أخطاء TypeScript
4. التأكد من عدم وجود إشارات متبقية لكود الجسر

- [ ] **Step 1: بناء السيرفر**

Run: `dotnet build src/API/API.csproj`
Expected: Build succeeded (0 errors)

- [ ] **Step 2: فحص TypeScript**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: فحص إشارات الجسر المتبقية**

Run: `grep -r "bridge\|findBridge\|sendToExt\|extConnected\|extWorking\|extProgress\|noorConnect\|noorDisconnect\|noorMappings\|getMappings" client/src/pages/NoorPage.tsx`
Expected: No matches

- [ ] **Step 4: فحص بناء React**

Run: `cd client && npm run build`
Expected: Build succeeded

- [ ] **Step 5: Commit نهائي (إذا كانت هناك إصلاحات)**

```bash
git add -A
git commit -m "fix(noor): final integration fixes for v7 redesign"
```
