# تحسين إضافة نور — خطة التنفيذ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 confirmed bugs in the Noor Chrome extension and harden it for reliability, accuracy, and speed.

**Architecture:** Targeted fixes to the existing state-machine engine in noor-bridge.js, plus API/UI changes to merge tardiness into violations. No architectural rewrites — surgical fixes at the exact failure points.

**Tech Stack:** Chrome Extension MV3 (vanilla JS), ASP.NET Core (C#), React (TypeScript)

**Spec:** `docs/superpowers/specs/2026-03-26-noor-extension-fix-design.md`

**Important paths:**
- Extension: `d:\وكيل شؤون الطلاب\اضافات الكروم\اضافة التطبيق شؤو ن الطلاب\‏‏noor-extension-v6\`
- App: `d:\SchoolBehaviorSystem\school-behavior-system-23-main\school-behavior-system-23-main\`

---

### Task 1: إضافة ثوابت الحقول وإصلاح أسماء الحقول — noor-bridge.js

**Files:**
- Modify: `noor-bridge.js:25-29` (after GRADE_MAP)
- Modify: `noor-bridge.js:489,774,951` (rec['الصف'] → rec[F.grade])
- Modify: `noor-bridge.js:1046,1080,1137,1227` (rec['اسم_الطالب'] → rec[F.studentName])

- [ ] **Step 1: Add field constants after GRADE_MAP (line 29)**

Add after line 29:

```javascript
  // ★ v5.4: ثوابت أسماء الحقول — مطابقة لـ API (camelCase)
  var F = {
    studentName: 'studentName',
    grade: 'grade',
    className: 'class',
    noorValue: '_noorValue',
    noorText: '_noorText',
    noorMode: '_noorMode',
    type: '_type',
    rowIndex: '_rowIndex',
    absenceOverride: '_absenceOverride'
  };
```

- [ ] **Step 2: Fix grade field — 3 locations**

Line 489 in `executeDocumentation`:
```javascript
// Before:
var key = rec['الصف'] || 'غير محدد';
// After:
var key = rec[F.grade] || 'غير محدد';
```

Line 774 in `runStep` (step 6):
```javascript
// Before:
if ((rec['الصف'] || '') === st.gradeText) grp.push(rec);
// After:
if ((rec[F.grade] || '') === st.gradeText) grp.push(rec);
```

Line 951 in `moveToNextGroup`:
```javascript
// Before:
if ((rec['الصف'] || '') === groupKeys[nextIdx]) newGrp.push(rec);
// After:
if ((rec[F.grade] || '') === groupKeys[nextIdx]) newGrp.push(rec);
```

- [ ] **Step 3: Fix studentName field — 4 locations**

Line 1046 in `testBatchSupport`:
```javascript
// Before:
var studentName = firstRec['اسم_الطالب'] || firstRec['اسم الطالب'] || '';
// After:
var studentName = firstRec[F.studentName] || '';
```

Line 1080 in `processBatch`:
```javascript
// Before:
var studentName = rec['اسم_الطالب'] || rec['اسم الطالب'] || '';
// After:
var studentName = rec[F.studentName] || '';
```

Line 1137 in `processSequential`:
```javascript
// Before:
var studentName = rec['اسم_الطالب'] || rec['اسم الطالب'] || '';
// After:
var studentName = rec[F.studentName] || '';
```

Line 1227 in `processStudentsLecture`:
```javascript
// Before:
var studentName = rec['اسم_الطالب'] || rec['اسم الطالب'] || '';
// After:
var studentName = rec[F.studentName] || '';
```

- [ ] **Step 4: Update version header**

Line 2:
```javascript
// Before:
// noor-bridge.js v5.3 — تسريع 3-5x + دعم المواظبة بالحصة
// After:
// noor-bridge.js v5.4 — إصلاح أسماء الحقول + تحصين الاعتمادية
```

- [ ] **Step 5: Verify — search for any remaining Arabic field access**

Run grep for `rec['` and `firstRec['` in noor-bridge.js. Expected: zero results with Arabic text.

---

### Task 2: إصلاح جسر التواصل — manifest.json + app-bridge.js

**Files:**
- Modify: `manifest.json:15-35` (content_scripts)
- Modify: `app-bridge.js:20-22` (hostname guard)

- [ ] **Step 1: Add localhost to manifest.json content_scripts**

Add `http://localhost/*` to the second content_scripts entry:

```json
{
  "matches": [
    "https://script.google.com/*",
    "https://*.googleusercontent.com/*",
    "http://localhost/*"
  ],
  "js": [
    "app-bridge.js"
  ],
  "run_at": "document_idle",
  "all_frames": true
}
```

- [ ] **Step 2: Add localhost to host_permissions**

```json
"host_permissions": [
    "https://noor.moe.gov.sa/*",
    "https://script.google.com/*",
    "https://*.googleusercontent.com/*",
    "http://localhost/*"
],
```

- [ ] **Step 3: Fix hostname guard in app-bridge.js**

Lines 20-22 — replace the early-exit logic:
```javascript
// Before:
  // تخطي script.google.com (الإطار الخارجي الرئيسي)
  if (window.location.hostname === 'script.google.com') return;
  if (window.location.hostname.indexOf('googleusercontent.com') === -1) return;

// After:
  // تخطي script.google.com (الإطار الخارجي الرئيسي)
  if (window.location.hostname === 'script.google.com') return;
  // السماح بـ googleusercontent (Google Apps Script) و localhost (React dev)
  var host = window.location.hostname;
  var allowed = host.indexOf('googleusercontent.com') >= 0 || host === 'localhost';
  if (!allowed) return;
```

- [ ] **Step 4: Verify — reload extension in Chrome**

1. Open `chrome://extensions`
2. Click refresh on the extension
3. Open React app on localhost
4. Check DevTools console for `[جسر]` messages
5. Check that `noor-bridge-inbox` and `noor-bridge-outbox` elements exist in DOM

**Note:** `http://localhost/*` is for development only. When deploying to a production server, add the production URL to both `manifest.json` (content_scripts matches + host_permissions) and `app-bridge.js` (allowed hostname check).

---

### Task 3: Keepalive + زيادة مهلة الاستئناف — noor-bridge.js + background.js

**Files:**
- Modify: `noor-bridge.js:40` (add keepalive timer variable)
- Modify: `noor-bridge.js:482-516` (start keepalive in executeDocumentation)
- Modify: `noor-bridge.js:536-539` (stop keepalive in cleanupExec)
- Modify: `noor-bridge.js:929-940` (stop keepalive in moveToNextGroup final)
- Modify: `noor-bridge.js:1373,1428` (increase timeout)
- Modify: `background.js:80-165` (handle keepalive)

- [ ] **Step 1: Add keepalive functions in noor-bridge.js**

After line 40 (`var alive = true;`), add:

```javascript
  // ★ v5.4: Keepalive — يبقي Service Worker نشطاً أثناء التوثيق
  var keepaliveTimer = null;

  function startKeepalive() {
    stopKeepalive();
    keepaliveTimer = setInterval(function() {
      try {
        chrome.runtime.sendMessage({ source: MSG_SRC, type: 'keepalive' }, function() {
          if (chrome.runtime.lastError) {
            // SW كان نائماً — أُعيد alive لأن sendMessage نجح بإيقاظه
          } else {
            alive = true; // ★ إعادة تعيين alive إذا كان false من خطأ سابق
          }
        });
      } catch(e) { /* ignore */ }
    }, 25000);
  }

  function stopKeepalive() {
    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
  }
```

- [ ] **Step 2: Start keepalive when execution begins**

In `executeDocumentation` (line ~514, after `STATE.working = true;`):
```javascript
    STATE.working = true;
    startKeepalive(); // ★ v5.4
    sendProgress(0, records.length, 'جاري التحضير...');
```

- [ ] **Step 3: Stop keepalive on cleanup and completion**

In `cleanupExec` (line ~536):
```javascript
  function cleanupExec(errorMsg) {
    STATE.working = false;
    stopKeepalive(); // ★ v5.4
    chrome.storage.local.remove('noorExecState');
```

In `moveToNextGroup` — the completion branch (line ~929):
```javascript
    if (nextIdx >= groupKeys.length) {
      chrome.storage.local.remove('noorExecState');
      STATE.working = false;
      stopKeepalive(); // ★ v5.4
      safeSend({
```

- [ ] **Step 4: Handle keepalive in background.js**

In the `onMessage` listener, **inside** the `if (msg.source === 'school-noor-bridge')` block (line 85), add before the closing `}` at line 106:

```javascript
    // ─── keepalive من نور ───
    if (msg.type === 'keepalive') {
      console.log(LOG, '♥ keepalive');
      return;
    }
```

Must be **inside** the `if (msg.source === 'school-noor-bridge')` block, after the `noor-progress/noor-complete` handler (line 104-105) and before the block's closing `}` (line 106).

- [ ] **Step 5: Increase resume timeout — 2 locations**

Line 1373 in `checkResumeExecution`:
```javascript
// Before:
      if (age > 300000) {
// After:
      if (age > 900000) {
```

Line 1428 in `boot`:
```javascript
// Before:
        if (age > 300000 || !data.noorExecState.timestamp) {
// After:
        if (age > 900000 || !data.noorExecState.timestamp) {
```

- [ ] **Step 6: Verify**

Open DevTools on Noor tab → check for `♥ keepalive` messages in background console every ~25 seconds during execution.

---

### Task 4: نظام إعادة المحاولة — noor-bridge.js

**Files:**
- Modify: `noor-bridge.js` (add retry wrapper function)
- Modify: `noor-bridge.js:1173-1203` (wrap checkbox+dropdown in retry)

- [ ] **Step 1: Add retry utility function**

Add after the keepalive functions:

```javascript
  // ★ v5.4: إعادة محاولة مع انتظار تصاعدي
  function withRetry(fn, maxAttempts, label) {
    var delays = [1000, 2000, 4000];
    function attempt(n) {
      return fn().then(function(result) {
        if (result.ok || n >= maxAttempts) return result;
        console.log(LOG, '  ↻ إعادة محاولة', label, '(' + (n+1) + '/' + maxAttempts + ')');
        return delay(delays[n] || 4000).then(function() { return attempt(n + 1); });
      });
    }
    return attempt(0);
  }
```

- [ ] **Step 2: Wrap dropdown selection in processSequential with retry**

In `processSequential`, replace the dropdown selection logic (lines ~1188-1200) to use retry:

```javascript
          // ★ v5.4: إعادة محاولة اختيار القيمة
          function trySetDropdown() {
            var freshGrid2 = document.getElementById(NID.grid) || document.querySelector('table[id*="Attendance"]');
            if (!freshGrid2) return Promise.resolve({ ok: false, error: 'الجدول اختفى' });
            var fr = findStudentInMap(buildStudentMap(freshGrid2), studentName);
            if (!fr) return Promise.resolve({ ok: false, error: 'اختفى بعد checkbox' });
            var d = fr.querySelector('select[id*="ddlDegreeDeductAmount"]');
            if (!d || d.disabled) return Promise.resolve({ ok: false, error: 'dropdown معطّل' });
            var ok = setDropdownValue(d, noorText, noorValue);
            return Promise.resolve({ ok: ok, error: ok ? '' : 'قيمة غير موجودة' });
          }

          return withRetry(trySetDropdown, 3, studentName).then(function(res) {
            results.push({ rowIndex: rec._rowIndex, name: studentName, ok: res.ok, error: res.error || '' });
          });
```

- [ ] **Step 3: Verify**

During execution, if a dropdown fails, check DevTools console for `↻ إعادة محاولة` messages.

---

### Task 5: ملخص النتائج المفصل — noor-bridge.js + app-bridge.js

**Files:**
- Modify: `noor-bridge.js:902-911` (handleResults — collect per-grade summary)
- Modify: `noor-bridge.js:929-938` (moveToNextGroup — send summary)
- Modify: `app-bridge.js:81-83` (translate — pass summary)

- [ ] **Step 1: Collect per-grade errors in handleResults**

**Replace lines 902-913** of `handleResults` with the following. Lines 915-921 (the `if (success > 0)` branching) remain unchanged:

```javascript
  function handleResults(results, st) {
    var success = 0, failed = 0, updates = [], errors = [];
    results.forEach(function(r) {
      if (r.ok) success++; else {
        failed++;
        errors.push(r.name + ': ' + (r.error || 'خطأ'));
      }
      updates.push({ rowIndex: r.rowIndex, status: r.ok ? 'تم' : 'فشل', type: st.type, error: r.error || '' });
    });

    st.totalSuccess = (st.totalSuccess || 0) + success;
    st.totalFailed = (st.totalFailed || 0) + failed;
    st.allUpdates = (st.allUpdates || []).concat(updates);

    // ★ v5.4: ملخص لكل صف
    if (!st.gradeSummary) st.gradeSummary = [];
    st.gradeSummary.push({
      grade: st.gradeText || '',
      success: success,
      failed: failed,
      errors: errors
    });

    console.log(LOG, '★ نتائج — نجح:', success, 'فشل:', failed);
```

- [ ] **Step 2: Include summary in noor-complete message**

In `moveToNextGroup` (line ~932):

```javascript
      safeSend({
        type: 'noor-complete',
        success: st.totalSuccess || 0,
        failed: st.totalFailed || 0,
        total: (st.totalSuccess || 0) + (st.totalFailed || 0),
        updates: st.allUpdates || [],
        summary: st.gradeSummary || []
      });
```

- [ ] **Step 3: Pass summary through app-bridge.js translate**

In `translate` function (line ~82):

```javascript
      case 'noor-complete':
        return { source: 'noor-extension', action: 'done',
          results: { success: msg.success||0, failed: msg.failed||0, updates: msg.updates||[], summary: msg.summary||[] } };
```

- [ ] **Step 4: Verify**

After execution completes, check that NoorPage receives the summary in the `done` event results.

---

### Task 6: دمج التأخر ضمن المخالفات — NoorController.cs

**Files:**
- Modify: `src/API/Controllers/NoorController.cs:99-129` (delete standalone tardiness section)
- Modify: `src/API/Controllers/NoorController.cs:42-97` (add tardiness query inside violations section)
- Modify: `src/API/Controllers/NoorController.cs:289-338` (GetStats — merge tardiness into violations)
- Modify: `src/API/Controllers/NoorController.cs:342-378` (CountPendingByType — merge count)
- Modify: `src/API/Controllers/NoorController.cs:479-486` (NoorPendingStats — remove tardiness property)

**Critical note:** Records keep `_type = "tardiness"` (NOT `"violation"`) so that `update-status` endpoint (line 413-425) can still route to `TardinessRecords` table correctly. The merge is for display only — tardiness records appear under the violations tab.

- [ ] **Step 1: Remove the standalone tardiness section**

Delete lines 99-129 (the entire `// ═══ 2. التأخر الصباحي ═══` section, including `stats.tardiness = items.Count`).

- [ ] **Step 2: Add tardiness query inside the violations section**

After the violations foreach loop (inside `if (type is "all" or "violations")`), add:

```csharp
            // ★ دمج التأخر الصباحي — يظهر مع المخالفات لكن يبقى _type = "tardiness" لتوجيه update-status
            var tardQ = _db.TardinessRecords.Where(t => t.NoorStatus == "" || t.NoorStatus == "معلق");
            if (stageEnum != null) tardQ = tardQ.Where(t => t.Stage == stageEnum);
            if (filterMode == "today") tardQ = tardQ.Where(t => t.RecordedAt >= today);

            var tardItems = await tardQ.Select(t => new
            {
                t.Id,
                t.StudentName, t.Grade, t.Class,
                stage = t.Stage.ToString(),
                date = t.RecordedAt.ToString("yyyy-MM-dd"),
                t.NoorStatus
            }).OrderBy(t => t.Class).ThenBy(t => t.StudentName).ToListAsync();

            foreach (var item in tardItems)
            {
                var mapping = NoorMappings.GetViolationByStage("101", item.stage ?? "");
                records.Add(new
                {
                    item.Id, _type = "tardiness",  // ★ يبقى tardiness لتوجيه update-status
                    item.StudentName, item.Grade, item.Class, item.stage,
                    violationCode = "101",
                    description = "التأخر الصباحي",
                    degree = 1,
                    degreeName = "الدرجة الأولى",
                    item.date, item.NoorStatus,
                    _noorValue = mapping.noorValue,
                    _noorText = mapping.noorText,
                    _noorMode = new { mowadaba = "1", deductType = "1" }
                });
            }
            stats.violations += tardItems.Count;
```

- [ ] **Step 3: Update CountPendingByType — merge tardiness count into violations**

In `CountPendingByType` (line ~367-368), change:
```csharp
// Before:
        stats.violations = await vQ.CountAsync();
        stats.tardiness = await tQ.CountAsync();

// After:
        stats.violations = await vQ.CountAsync() + await tQ.CountAsync();
```

- [ ] **Step 4: Update GetStats — remove tardiness from response**

In `GetStats` (lines 311, 327, 334), remove `pending.tardiness` and `todayPending.tardiness` and `allPending.tardiness` from the anonymous objects. Also update `total` calculations to remove `+ pending.tardiness`.

Line ~309-315:
```csharp
// Before:
                pending = new
                {
                    pending.violations, pending.tardiness, pending.compensation,
                    pending.excellent, pending.absence,
                    total = pending.violations + pending.tardiness + pending.compensation + pending.excellent + pending.absence,
                    documentedToday
                }
// After:
                pending = new
                {
                    pending.violations, pending.compensation,
                    pending.excellent, pending.absence,
                    total = pending.violations + pending.compensation + pending.excellent + pending.absence,
                    documentedToday
                }
```

Apply same pattern at lines ~325-336 (both `todayPending` and `allPending` objects).

- [ ] **Step 5: Update NoorPendingStats class**

Line ~479-486, remove `tardiness` property:
```csharp
// Before:
public class NoorPendingStats
{
    public int violations { get; set; }
    public int tardiness { get; set; }
    public int compensation { get; set; }
    public int excellent { get; set; }
    public int absence { get; set; }
}

// After:
public class NoorPendingStats
{
    public int violations { get; set; }
    public int compensation { get; set; }
    public int excellent { get; set; }
    public int absence { get; set; }
}
```

- [ ] **Step 6: Verify — call API**

```
GET /api/noor/pending?type=violations
```
Expected: tardiness records appear with `_type: "tardiness"` but shown under violations, with correct `_noorValue`.

```
GET /api/noor/stats
```
Expected: no `tardiness` field, tardiness count included in `violations`.

- [ ] **Step 7: Commit**

```bash
git add src/API/Controllers/NoorController.cs
git commit -m "fix: دمج التأخر الصباحي ضمن المخالفات السلوكية (كود 101)"
```

---

### Task 7: حذف تبويب التأخر — NoorPage.tsx

**Files:**
- Modify: `client/src/pages/NoorPage.tsx:17-18` (remove _TARD_LABELS, tardLabel)
- Modify: `client/src/pages/NoorPage.tsx:27-34` (remove tardiness from NOOR_TABS and TAB_ORDER)

- [ ] **Step 1: Remove tardiness constants**

Delete lines 17-18:
```typescript
// DELETE:
const _TARD_LABELS: Record<string, string> = { Morning: 'تأخر صباحي', Period: 'تأخر عن الحصة', Assembly: 'تأخر عن الاصطفاف' };
const tardLabel = (t?: string) => (t && _TARD_LABELS[t]) || t || 'تأخر صباحي';
```

- [ ] **Step 2: Remove tardiness from NOOR_TABS**

Remove the tardiness entry:
```typescript
// DELETE this line:
  tardiness:    { id: 'tardiness',    icon: 'hourglass_empty', label: 'تأخر',          color: '#f59e0b', desc: 'سجلات التأخر الصباحي — تُدخل كمخالفة الدرجة الأولى' },
```

- [ ] **Step 3: Remove tardiness from TAB_ORDER**

```typescript
// Before:
const TAB_ORDER = ['violations', 'tardiness', 'compensation', 'excellent', 'absence'];
// After:
const TAB_ORDER = ['violations', 'compensation', 'excellent', 'absence'];
```

- [ ] **Step 4: Remove tardiness from NoorStats interface**

Line ~56: remove `tardiness: number;` from the `NoorStats` interface.

- [ ] **Step 5: Remove tardiness stat card**

Line ~405: delete the tardiness stat entry:
```typescript
// DELETE:
          { icon: 'timer_off', label: 'تأخر', value: stats?.tardiness ?? '-', color: '#f59e0b' },
```

- [ ] **Step 6: Remove tardLabel usage in record display**

Line ~353: remove `tardLabel(rec.tardinessType) ||` from the type expression:
```typescript
// Before:
          type: rec.description || tardLabel(rec.tardinessType) || rec.behaviorType || rec.excuseType || '',
// After:
          type: rec.description || rec.behaviorType || rec.excuseType || '',
```

- [ ] **Step 7: Remove tardiness table headers and cells**

Line ~659: delete the tardiness header row:
```typescript
// DELETE:
                  {activeTab === 'tardiness' && <><th>نوع التأخر</th><th>التاريخ</th></>}
```

Lines ~710-714: delete the tardiness cell render block:
```typescript
// DELETE:
                        {activeTab === 'tardiness' && (
                          <>
                            <td style={{ fontSize: '13px', color: '#374151' }}>{tardLabel(rec.tardinessType)}</td>
                            <td style={{ fontSize: '12px', color: '#6b7280' }}>{rec.date}</td>
                          </>
                        )}
```

- [ ] **Step 8: Remove tardiness from column count helper**

Line ~917: delete the tardiness case:
```typescript
// DELETE:
    case 'tardiness': return 7;
```

- [ ] **Step 9: Verify — open the Noor page in React app**

Expected: 4 tabs only (مخالفات، تعويضية، سلوك متمايز، غياب يومي). No tardiness tab. No build errors.

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/NoorPage.tsx
git commit -m "fix: حذف تبويب التأخر — التأخر مخالفة سلوكية وليس قسماً مستقلاً"
```

---

### Task 8: اختبار شامل مع موقع نور

**Prerequisites:** Tasks 1-7 complete.

- [ ] **Step 1: Reload the extension**

1. `chrome://extensions` → refresh the extension
2. Verify no errors in Service Worker console

- [ ] **Step 2: Test connection**

1. Open Noor in one tab → login
2. Open React app in another tab
3. Go to Noor documentation page
4. Expected: "تم الاتصال بنور" notification appears

- [ ] **Step 3: Test violations documentation**

1. Select pending violations (choose 2-3 students)
2. Click "توثيق في نور"
3. Watch Noor tab — verify:
   - Dropdowns selected correctly (mowadaba=1, deductType=1)
   - Grade dropdown matches student's grade
   - Student found in grid
   - Violation value selected correctly
   - Save button clicked
4. Expected: progress bar updates, completion message with summary

- [ ] **Step 4: Test absence documentation**

1. Switch to absence tab
2. Select pending absences
3. Click "توثيق في نور"
4. Verify mowadaba=2 path works correctly

- [ ] **Step 5: Test positive behavior (compensation + excellent)**

1. Test compensation tab (mowadaba=1, deductType=2)
2. Test excellent tab (same path, different noorValue)

- [ ] **Step 6: Test keepalive**

1. Start a documentation batch with 10+ students
2. Open background.js DevTools (chrome://extensions → Service Worker → inspect)
3. Verify `♥ keepalive` messages appear every ~25 seconds
4. Verify no disconnection during long operation

- [ ] **Step 7: Test resume after page reload**

1. Start documentation
2. Before it completes, refresh the Noor tab (F5)
3. Expected: after page loads, execution resumes from where it stopped

- [ ] **Step 8: Final commit**

```bash
git commit -m "feat: تحسين إضافة نور v5.4 — إصلاح 8 ثغرات + تحصين الاعتمادية"
```
