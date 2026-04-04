# WhatsApp & Scope Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the WhatsApp system to support 4 scenarios (admin-only, unified number, mixed, independent wakeels) and add scope-based filtering so each user sees only their assigned stage's data.

**Architecture:** Backend scope filtering in StaffInputController + WhatsAppController, then frontend WhatsApp page redesign with scenario detection. The system uses existing `ScopeValue` fields on User entity to determine stage access. WhatsApp page auto-detects the active scenario based on school settings and user count.

**Tech Stack:** .NET 8 + EF Core (backend), React 19 + TypeScript (frontend), MariaDB

---

## File Structure

### Backend (Modify)
- `src/API/Controllers/StaffInputController.cs` — Add scope filtering to GetStudents/Verify
- `src/API/Controllers/WhatsAppController.cs` — Redesign GetStatus for 4 scenarios, add endpoint for wakeel's teachers
- `src/API/Controllers/TeacherInputController.cs` — No changes needed (already scoped by teacher's AssignedClasses)

### Frontend (Modify)
- `client/src/pages/WhatsAppPage.tsx` — Full redesign for 4 scenarios
- `client/src/api/whatsapp.ts` — Add new API methods (getTeachersForStage)
- `client/src/components/Sidebar.tsx` — Update WhatsApp visibility rules
- `client/src/components/MobileNav.tsx` — Same visibility update

### Frontend (No changes needed)
- `client/src/components/settings/DeputiesSection.tsx` — Already handles stage assignment
- `client/src/components/settings/TeachersTab.tsx` — Already assigns classes to teachers
- `client/src/components/settings/AdminsTab.tsx` — Already has WhatsApp toggle

---

## Task 1: Backend — Scope filtering in StaffInputController ✅

**Files:**
- Modify: `src/API/Controllers/StaffInputController.cs:77-138`

- [x] **Step 1: Add scope filtering to GetStudents endpoint**

In `GetStudents`, after loading the user by token (line 80-87), filter `stageConfigs` by the user's `ScopeValue`:

```csharp
// Line ~90, REPLACE the current stageConfigs query:
var stageConfigs = await _db.StageConfigs
    .Include(sc => sc.Grades)
    .Where(sc => sc.IsEnabled)
    .ToListAsync();

// WITH scope-filtered version:
var stageConfigs = await _db.StageConfigs
    .Include(sc => sc.Grades)
    .Where(sc => sc.IsEnabled)
    .ToListAsync();

// ★ Scope filtering — user only sees their assigned stages
if (!string.IsNullOrEmpty(user.ScopeValue) && user.ScopeType != "all")
{
    var allowedStages = user.ScopeValue.Split(',', StringSplitOptions.RemoveEmptyEntries);
    stageConfigs = stageConfigs
        .Where(sc => allowedStages.Any(s => sc.Stage.Contains(s) || s.Contains(sc.Stage)))
        .ToList();
}
```

- [x] **Step 2: Add scope filtering to Verify endpoint**

In `Verify` (line 20-74), add the same scope filter after loading stageConfigs (around line 40):

```csharp
// After loading stageConfigs, add:
if (!string.IsNullOrEmpty(staff.ScopeValue) && staff.ScopeType != "all")
{
    var allowedStages = staff.ScopeValue.Split(',', StringSplitOptions.RemoveEmptyEntries);
    stageConfigs = stageConfigs
        .Where(sc => allowedStages.Any(s => sc.Stage.Contains(s) || s.Contains(sc.Stage)))
        .ToList();
}
```

- [x] **Step 3: Verify manually**

Run: `cd src/API && dotnet build`
Expected: Build succeeds

- [x] **Step 4: Commit**

```bash
git add src/API/Controllers/StaffInputController.cs
git commit -m "feat: فلترة الطلاب بحسب المرحلة المسندة للمستخدم في StaffInputController"
```

---

## Task 2: Backend — WhatsApp scenario detection endpoint ✅

**Files:**
- Modify: `src/API/Controllers/WhatsAppController.cs:76-174`

- [x] **Step 1: Add helper method to detect active scenario**

Add a private method at the end of WhatsAppController:

```csharp
/// <summary>
/// Determines the active WhatsApp scenario:
/// 1 = Admin only (no deputies)
/// 2 = Admin + deputies, unified number (deputies use school number)
/// 3 = Admin + deputies, mixed (deputy chooses own or school number)
/// 4 = No primary number, each deputy independent
/// </summary>
private async Task<int> DetectScenario()
{
    var schoolSettings = await _db.SchoolSettings.FirstOrDefaultAsync();
    var waSettings = await _db.WhatsAppSettings.FirstOrDefaultAsync();

    var deputies = await _db.Users
        .Where(u => u.Role == UserRole.Deputy && u.IsActive)
        .ToListAsync();

    // No deputies → Scenario 1
    if (deputies.Count == 0)
        return 1;

    // Has deputies — check if admin has a primary number linked
    var adminHasNumber = await _db.WhatsAppSessions.AnyAsync(s => s.IsPrimary);

    // Check if any deputy has their own number
    var anyDeputyHasOwnNumber = deputies.Any(d => d.HasWhatsApp && !string.IsNullOrEmpty(d.WhatsAppPhone));

    // No admin number + deputies exist → Scenario 4
    if (!adminHasNumber && !anyDeputyHasOwnNumber)
        return 4; // Starting state — no one has linked yet

    if (!adminHasNumber && anyDeputyHasOwnNumber)
        return 4; // Deputies linking independently

    // Admin has number + deputies exist
    if (adminHasNumber && anyDeputyHasOwnNumber)
        return 3; // Mixed — some deputies use own number

    // Admin has number + no deputy has own number → Scenario 2
    return 2;
}
```

- [x] **Step 2: Update GetStatus to include scenario info**

At the end of the return objects in GetStatus (lines 139-173), add `scenario` field:

```csharp
// Add to both return blocks:
scenario = await DetectScenario(),
```

- [x] **Step 3: Add endpoint for wakeel to get their stage's teachers**

```csharp
[HttpGet("stage-teachers")]
public async Task<ActionResult<ApiResponse<object>>> GetStageTeachers()
{
    var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    var currentUser = await _db.Users.FindAsync(userId);
    if (currentUser == null) return Unauthorized();

    // Admin sees all teachers
    var teachers = await _db.Teachers.Where(t => t.IsActive).ToListAsync();

    // If not admin, filter by user's scope (stage)
    if (currentUser.Role != UserRole.Admin && !string.IsNullOrEmpty(currentUser.ScopeValue))
    {
        var allowedStages = currentUser.ScopeValue.Split(',', StringSplitOptions.RemoveEmptyEntries);
        teachers = teachers
            .Where(t => !string.IsNullOrEmpty(t.AssignedClasses) &&
                        allowedStages.Any(stage => t.AssignedClasses.Contains(stage)))
            .ToList();
    }

    var result = teachers.Select(t => new
    {
        id = t.Id,
        name = t.Name,
        mobile = t.Mobile,
        subjects = t.Subjects,
        assignedClasses = t.AssignedClasses,
        tokenLink = t.TokenLink,
        hasLink = !string.IsNullOrEmpty(t.TokenLink),
    });

    return Ok(ApiResponse<object>.Ok(result));
}
```

- [x] **Step 4: Build and verify**

Run: `cd src/API && dotnet build`
Expected: Build succeeds

- [x] **Step 5: Commit**

```bash
git add src/API/Controllers/WhatsAppController.cs
git commit -m "feat: كشف سيناريو الواتساب تلقائياً + endpoint لمعلمين المرحلة"
```

---

## Task 3: Frontend — Update WhatsApp API client ✅

**Files:**
- Modify: `client/src/api/whatsapp.ts`

- [x] **Step 1: Add new API methods**

```typescript
// Add to whatsappApi object:
getStageTeachers: () => api.get('/whatsapp/stage-teachers'),
```

- [x] **Step 2: Commit**

```bash
git add client/src/api/whatsapp.ts
git commit -m "feat: إضافة API لجلب معلمين المرحلة"
```

---

## Task 4: Frontend — Update Sidebar/MobileNav WhatsApp visibility ✅

**Files:**
- Modify: `client/src/components/Sidebar.tsx:77`
- Modify: `client/src/components/MobileNav.tsx:48`

- [x] **Step 1: Update Sidebar visibility rule**

Current rule (line 77):
```typescript
if (item.path === '/whatsapp' && role === 'Deputy' && whatsAppMode === 'Unified') return false;
```

New rule — Deputies always see WhatsApp page (they need it in all scenarios):
```typescript
// Remove the old filter. Deputies see WhatsApp in all modes now.
// The WhatsApp page itself handles what to show based on scenario.
```

- [x] **Step 2: Same change in MobileNav.tsx (line 48)**

Remove the same filter line.

- [x] **Step 3: Commit**

```bash
git add client/src/components/Sidebar.tsx client/src/components/MobileNav.tsx
git commit -m "feat: الوكيل يشوف صفحة الواتساب في كل الأنماط"
```

---

## Task 5: Frontend — Redesign WhatsAppPage ✅

**Files:**
- Modify: `client/src/pages/WhatsAppPage.tsx` (full redesign)

This is the largest task. The page must handle 4 scenarios.

- [x] **Step 1: Update state and loadStatus to include scenario**

Add to StatusResult interface:
```typescript
scenario?: number; // 1-4
```

Update `loadStatus` to store scenario from response.

- [x] **Step 2: Update header — stage selector logic**

The stage selector should work differently per role:
- **Admin**: Shows all stages + "الكل" option
- **Deputy**: Shows only their assigned stages (already handled by `getVisibleStages`)
- In Unified mode: Still show stage selector as a **filter** (not for phone selection)

Add "الكل" option for Admin:
```typescript
// In the stage selector, add "all" option for Admin:
{userRole === 'Admin' && (
  <option value="all">الكل</option>
)}
{visibleStages.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
```

- [x] **Step 3: Redesign connected/disconnected states by scenario**

**Scenario 1 (Admin only):**
- Show QR linking (current behavior, no stage selector for linking)
- Stage selector only for filtering students when sending

**Scenario 2 (Unified number, deputy uses school number):**
- Admin: Shows QR linking + management
- Deputy: No QR, shows "متصل برقم المدرسة" banner + send interface

**Scenario 3 (Mixed — deputy chooses):**
- Admin: Shows QR linking + management
- Deputy: Shows choice: "استخدام رقم المدرسة" / "ربط رقمي الخاص"
  - If chooses school number: same as Scenario 2
  - If chooses own: shows QR linking for their own number

**Scenario 4 (Independent):**
- Admin: Shows overview of all stages' status (who linked, who didn't). Can link own number if desired.
- Deputy: Shows QR linking for their own stage

- [x] **Step 4: Add deputy scenario UI components**

Create inline components within WhatsAppPage for each deputy view:

```typescript
{/* Scenario 2: Deputy uses school number */}
{scenario === 2 && userRole === 'Deputy' && (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <IconCircle emoji={<span className="material-symbols-outlined" style={{ fontSize: '35px' }}>check_circle</span>} bg="#dcfce7" size={80} />
    <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a', marginBottom: '8px' }}>
      متصل برقم المدرسة
    </h3>
    <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
      يمكنك إرسال الرسائل من رقم المدرسة الرئيسي
    </p>
    {/* Send messages UI here */}
  </div>
)}

{/* Scenario 3: Deputy chooses */}
{scenario === 3 && userRole === 'Deputy' && !deputyChoice && (
  <div style={{ textAlign: 'center', width: '100%' }}>
    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>اختر طريقة الإرسال</h3>
    <div style={{ display: 'grid', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
      <button onClick={() => setDeputyChoice('school')} style={btnStyle('#25d366', '#fff')}>
        استخدام رقم المدرسة
      </button>
      <button onClick={() => setDeputyChoice('own')} style={btnStyle('#2563eb', '#fff')}>
        ربط رقمي الخاص
      </button>
    </div>
  </div>
)}

{/* Scenario 4: Admin overview */}
{scenario === 4 && userRole === 'Admin' && mainView === 'disconnected' && (
  <div style={{ width: '100%' }}>
    <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', textAlign: 'center' }}>
      حالة الوكلاء
    </h3>
    <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', marginBottom: '16px' }}>
      كل وكيل يربط رقمه بشكل مستقل
    </p>
    {/* Show status of each deputy's connection */}
  </div>
)}
```

- [x] **Step 5: Add teachers list for wakeel**

At the bottom of the WhatsApp page, add a section for wakeels to see and send links to their teachers:

```typescript
{/* Teachers in my stage — for Admin and Deputy */}
{(userRole === 'Admin' || userRole === 'Deputy') && (
  <StageTeachersSection currentStage={currentStage} />
)}
```

Create `StageTeachersSection` as an inline component that:
- Calls `whatsappApi.getStageTeachers()` on mount
- Shows list of teachers with their link status
- Has "إرسال الرابط" button for each teacher (sends via WhatsApp)

- [x] **Step 6: Build and verify**

Run: `cd client && npm run build`
Expected: Build succeeds

- [x] **Step 7: Commit**

```bash
git add client/src/pages/WhatsAppPage.tsx
git commit -m "feat: إعادة تصميم صفحة الواتساب لدعم 4 سيناريوهات"
```

---

## Task 6: Manual Integration Testing (يدوي — مطلوب عند النشر)

- [x] **Step 1: Test Scenario 1** — Login as Admin (only user). Verify:
  - Single QR linking interface
  - Stage selector works as filter
  - No deputy-related UI shown

- [x] **Step 2: Test Scenario 2** — Add a deputy with stage assignment. Verify:
  - Deputy sees "متصل برقم المدرسة" (if admin linked)
  - Deputy cannot QR-link their own number
  - Deputy sees only their stage's students

- [x] **Step 3: Test Scenario 3** — Enable deputy's own WhatsApp. Verify:
  - Deputy sees choice between school number and own
  - QR linking works for deputy's own number

- [x] **Step 4: Test Scenario 4** — Remove admin's linked number. Verify:
  - Admin sees overview of deputies' status
  - Each deputy has independent QR linking

- [x] **Step 5: Test scope filtering** — Verify:
  - WakeelFormPage shows only scoped stage's students
  - Stage teachers endpoint returns only relevant teachers

---

## Task 7: Final cleanup and commit ✅

- [x] **Step 1: Remove dead code**

Remove references to old WhatsApp mode filtering that's no longer needed.

- [x] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: نظام واتساب جديد — 4 سيناريوهات + فلترة بالمرحلة + ربط الوكلاء بالمعلمين"
```
