# WhatsApp Per-Wakeel Linking Implementation Plan

> **ملاحظة:** هذه الخطة تم استبدالها بخطة أشمل: `2026-03-26-whatsapp-scope-redesign.md` التي تدعم 4 سيناريوهات + فلترة بالمرحلة. الأجزاء المشتركة (scope filtering, sidebar visibility, stage teachers) تم تنفيذها في الخطة الجديدة.

> **Status:** SUPERSEDED by `2026-03-26-whatsapp-scope-redesign.md`

**Goal:** Enable each deputy (wakeel) to link their own WhatsApp phone from the WhatsApp tools page, with role-based visibility and admin-controlled fallback to admin's number.

**Architecture:** Add `CanUseAdminWhatsApp` field to User entity, modify sidebar/routing to hide WhatsApp page for deputies in Unified mode, filter WhatsApp page stages by deputy's scope, and add fallback messaging logic when deputy hasn't linked their phone but admin approved them.

**Tech Stack:** React 19 + TypeScript (frontend), .NET 8 + EF Core + MariaDB (backend)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/Domain/Entities/User.cs` | Add `CanUseAdminWhatsApp` bool field |
| Create | `src/Infrastructure/Migrations/[timestamp]_AddCanUseAdminWhatsApp.cs` | EF migration for new column |
| Modify | `src/API/Controllers/UsersController.cs` | DTO + POST/PUT/GET for new field (admin-only write) |
| Modify | `src/API/Controllers/WhatsAppController.cs` | Fallback logic in `send-with-log`, expose `canUseAdminWhatsApp` in all 3 GetStatus return paths |
| Modify | `client/src/api/users.ts` | Add `canUseAdminWhatsApp` to `UserData` interface |
| Modify | `client/src/components/Sidebar.tsx` | Add `whatsAppMode` prop, hide WhatsApp for Deputy in Unified mode |
| Modify | `client/src/components/MobileNav.tsx` | Add `whatsAppMode` prop, same filtering as Sidebar |
| Modify | `client/src/App.tsx` | Pass `whatsAppMode` to Sidebar/MobileNav, route guard for Unified mode |
| Modify | `client/src/components/settings/DeputiesSection.tsx` | Toggle in DeputyModal + display in deputy list |
| Modify | `client/src/pages/WhatsAppPage.tsx` | Stage filtering by scope + admin fallback message (reads from status API) |

**Note:** `canUseAdminWhatsApp` is sourced from the `/whatsapp/status` API response (not localStorage). The WhatsApp page already calls this endpoint on load.

**Note:** EF migration is auto-applied at startup via `db.Database.Migrate()` in `Program.cs:97`. No manual `dotnet ef database update` needed.

**Note:** `AppDbContext` has global query filters on `TenantId` for all entities — no need to filter by tenant in queries manually.

---

## Task 1: Backend — Add `CanUseAdminWhatsApp` to User Entity

**Files:**
- Modify: `src/Domain/Entities/User.cs:22` (add new property after `WhatsAppPhone`)

- [ ] **Step 1: Add property to User entity**

In `src/Domain/Entities/User.cs`, add after line 22 (`public string WhatsAppPhone { get; set; } = "";`):

```csharp
public bool CanUseAdminWhatsApp { get; set; }
```

- [ ] **Step 2: Create EF migration**

```bash
cd src/Infrastructure
dotnet ef migrations add AddCanUseAdminWhatsApp --startup-project ../API
```

- [ ] **Step 3: Verify migration file was created**

Check `src/Infrastructure/Migrations/` for a new file `*_AddCanUseAdminWhatsApp.cs` containing `AddColumn<bool>("CanUseAdminWhatsApp", ...)`.

- [ ] **Step 4: Commit**

```bash
git add src/Domain/Entities/User.cs src/Infrastructure/Migrations/
git commit -m "feat: add CanUseAdminWhatsApp field to User entity"
```

---

## Task 2: Backend — Update UsersController for New Field

**Files:**
- Modify: `src/API/Controllers/UsersController.cs`

- [ ] **Step 1: Add field to AddUserRequest DTO**

In `UsersController.cs`, add to `AddUserRequest` class (after `WhatsAppPhone` property):

```csharp
public bool? CanUseAdminWhatsApp { get; set; }
```

- [ ] **Step 2: Handle in AddUser (POST) endpoint**

In the `AddUser` method, inside the User object initializer (where `HasWhatsApp` and `WhatsAppPhone` are set), add:

```csharp
CanUseAdminWhatsApp = req.CanUseAdminWhatsApp ?? false,
```

- [ ] **Step 3: Handle in UpdateUser (PUT) endpoint**

In the `UpdateUser` method, after the `WhatsAppPhone` handling, add with admin-only guard:

```csharp
if (req.CanUseAdminWhatsApp.HasValue)
{
    var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
    if (callerRole == "Admin")
        user.CanUseAdminWhatsApp = req.CanUseAdminWhatsApp.Value;
}
```

- [ ] **Step 4: Include in GetAll response**

In the anonymous object returned in GetAll, add:

```csharp
canUseAdminWhatsApp = u.CanUseAdminWhatsApp,
```

- [ ] **Step 5: Commit**

```bash
git add src/API/Controllers/UsersController.cs
git commit -m "feat: expose CanUseAdminWhatsApp in users API (admin-only write)"
```

---

## Task 3: Backend — WhatsApp Controller Fallback Logic

**Files:**
- Modify: `src/API/Controllers/WhatsAppController.cs`

**Important:** Add `using System.Security.Claims;` at the top of the file if not already present.

- [ ] **Step 1: Modify send-with-log phone resolution**

In the `sendWithLog` method, find the block where `senderPhone` is null and an error is returned (the `if (string.IsNullOrEmpty(senderPhone))` check). **Replace** that error return with fallback logic then a final null check:

```csharp
// Fallback: if deputy can use admin's phone
if (string.IsNullOrEmpty(senderPhone))
{
    var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
    var currentUser = await _db.Users.FindAsync(currentUserId);

    if (currentUser?.CanUseAdminWhatsApp == true)
    {
        var adminUser = await _db.Users
            .Where(u => u.Role == UserRole.Admin && u.IsActive && u.HasWhatsApp && u.WhatsAppPhone != "")
            .FirstOrDefaultAsync();

        if (adminUser != null)
        {
            senderPhone = adminUser.WhatsAppPhone;
            senderUserType = "مدير (نيابة)";
        }
        else
        {
            return Ok(new { success = false, message = "المدير فعّل لك الإرسال من رقمه لكن لم يربط رقمه بعد" });
        }
    }
}

// Final check — no phone available at all
if (string.IsNullOrEmpty(senderPhone))
{
    return Ok(new { success = false, message = "لا يوجد رقم واتساب — يجب ربط الواتساب أولاً" });
}
```

- [ ] **Step 2: Add canUseAdminWhatsApp to ALL GetStatus return paths**

The `GetStatus` method has 3 return paths. At the top of the method (after existing variable declarations), add:

```csharp
var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
var currentUser = await _db.Users.FindAsync(userId);
var adminHasPhone = await _db.Users.AnyAsync(u => u.Role == UserRole.Admin && u.IsActive && u.HasWhatsApp && u.WhatsAppPhone != "");
```

Then add these two fields to **each** of the 3 anonymous response objects:

```csharp
canUseAdminWhatsApp = currentUser?.CanUseAdminWhatsApp ?? false,
adminHasWhatsApp = adminHasPhone,
```

- [ ] **Step 3: Commit**

```bash
git add src/API/Controllers/WhatsAppController.cs
git commit -m "feat: fallback to admin WhatsApp phone for approved deputies"
```

---

## Task 4: Frontend — Update UserData Interface

**Files:**
- Modify: `client/src/api/users.ts:3-14` (UserData interface)

- [ ] **Step 1: Add to UserData interface**

In `client/src/api/users.ts`, add to `UserData`:

```typescript
canUseAdminWhatsApp?: boolean;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/api/users.ts
git commit -m "feat: add canUseAdminWhatsApp to UserData interface"
```

---

## Task 5: Frontend — DeputiesSection Toggle

**Files:**
- Modify: `client/src/components/settings/DeputiesSection.tsx`

- [ ] **Step 1: Add state to DeputyModal**

In `DeputyModal` component, add state after `whatsAppPhone` state (line 724):

```typescript
const [canUseAdminWA, setCanUseAdminWA] = useState(deputy?.canUseAdminWhatsApp || false);
```

- [ ] **Step 2: Add toggle UI in DeputyModal form**

Inside the `{!isUnified && (...)}` block (lines 857-870), add BEFORE the closing `</div>` at line 869 (must stay inside the `!isUnified` conditional):

```tsx
{/* السماح بالإرسال من رقم المدير */}
<label style={{
  display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
  padding: '10px 14px', background: canUseAdminWA ? '#f0fdf4' : '#f9fafb',
  borderRadius: 10, border: `1px solid ${canUseAdminWA ? '#bbf7d0' : '#e5e7eb'}`,
  cursor: 'pointer', transition: 'all 0.15s',
}}>
  <input type="checkbox" checked={canUseAdminWA} onChange={e => setCanUseAdminWA(e.target.checked)} />
  <div>
    <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>
      السماح بالإرسال من رقم المدير
    </span>
    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>
      إذا لم يربط الوكيل رقمه، يمكنه الإرسال عبر رقم المدير
    </p>
  </div>
</label>
```

- [ ] **Step 3: Include in save data**

In `handleSave` (lines 737-747), add to the `data` object:

```typescript
canUseAdminWhatsApp: !isUnified ? canUseAdminWA : false,
```

- [ ] **Step 4: Show status in deputy list cards**

In the deputy list rendering (lines 388-395), replace the existing `{!isUnified && !d.whatsAppPhone && (...)}` badge block with:

```tsx
{!isUnified && !d.whatsAppPhone && d.canUseAdminWhatsApp && (
  <span style={{ padding: '4px 10px', fontSize: 12, borderRadius: 9999, fontWeight: 700, background: '#f0fdf4', color: '#16a34a', flexShrink: 0 }}>
    يرسل من رقم المدير
  </span>
)}
{!isUnified && !d.whatsAppPhone && !d.canUseAdminWhatsApp && (
  <span style={{ padding: '4px 10px', fontSize: 12, borderRadius: 9999, fontWeight: 700, background: '#f3f4f6', color: '#9ca3af', flexShrink: 0 }}>
    بدون واتساب
  </span>
)}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/settings/DeputiesSection.tsx
git commit -m "feat: add CanUseAdminWhatsApp toggle in deputy settings"
```

---

## Task 6: Frontend — Sidebar + MobileNav Visibility

**Files:**
- Modify: `client/src/components/Sidebar.tsx:4-8,69-75`
- Modify: `client/src/components/MobileNav.tsx:4-6,35,45-47`
- Modify: `client/src/App.tsx:85,148,163`

- [ ] **Step 1: Add whatsAppMode prop to Sidebar**

In `Sidebar.tsx`, update Props interface (line 4-8):

```typescript
interface Props {
  open: boolean;
  role?: string;
  schoolName?: string;
  whatsAppMode?: string;
}
```

Update component signature (line 69):

```typescript
const Sidebar: React.FC<Props> = ({ open, role, schoolName, whatsAppMode }) => {
```

Update filtering logic (lines 72-75):

```typescript
const visibleGroups = NAV_ITEMS.map(group => ({
  ...group,
  items: group.items.filter(item => {
    if (item.roles && (!role || !item.roles.includes(role))) return false;
    if (item.path === '/whatsapp' && role === 'Deputy' && whatsAppMode === 'Unified') return false;
    return true;
  }),
})).filter(group => group.items.length > 0);
```

- [ ] **Step 2: Add whatsAppMode prop to MobileNav**

In `MobileNav.tsx`, update Props interface (line 4-6):

```typescript
interface Props {
  role?: string;
  whatsAppMode?: string;
}
```

Update component signature (line 35):

```typescript
const MobileNav: React.FC<Props> = ({ role, whatsAppMode }) => {
```

Update filtering logic (lines 45-47):

```typescript
const visibleItems = ALL_NAV_ITEMS.filter(item => {
  if (item.roles && (!role || !item.roles.includes(role))) return false;
  if (item.path === '/whatsapp' && role === 'Deputy' && whatsAppMode === 'Unified') return false;
  return true;
});
```

- [ ] **Step 3: Pass whatsAppMode from App.tsx**

In `App.tsx` `AuthenticatedLayout` (which has `schoolSettings` via `useAppContext()` at line 74):

Line 85 — update Sidebar:

```tsx
<Sidebar open={true} role={user.role} schoolName={schoolName} whatsAppMode={schoolSettings.whatsAppMode} />
```

Line 163 — update MobileNav:

```tsx
<MobileNav role={user.role} whatsAppMode={schoolSettings.whatsAppMode} />
```

- [ ] **Step 4: Route guard for Unified mode**

In `App.tsx`, update the WhatsApp route (line 148). `AuthenticatedLayout` already has `schoolSettings`:

```tsx
<Route path="/whatsapp" element={
  user.role === 'Deputy' && schoolSettings.whatsAppMode === 'Unified'
    ? <Navigate to="/" replace />
    : <ProtectedRoute role={user.role} path="/whatsapp"><WhatsAppPage /></ProtectedRoute>
} />
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/Sidebar.tsx client/src/components/MobileNav.tsx client/src/App.tsx
git commit -m "feat: hide WhatsApp page for deputies in Unified mode"
```

---

## Task 7: Frontend — WhatsApp Page Scope Filtering

**Files:**
- Modify: `client/src/pages/WhatsAppPage.tsx`

- [ ] **Step 1: Get user scope from localStorage**

At the top of `WhatsAppPage` component (after line 51), read user scope:

```typescript
const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
const userRole = storedUser?.role;
const userScopeValue = storedUser?.scopeValue || '';
const userScopes = userScopeValue ? userScopeValue.split(',').filter(Boolean) : [];
```

- [ ] **Step 2: Add stage filtering helper**

After the STAGES constant (after line 35), add:

```typescript
function getVisibleStages(role?: string, scopes?: string[]) {
  if (role === 'Deputy' && scopes && scopes.length > 0) {
    return STAGES.filter(s => scopes.some(scope => scope === s.id || scope.includes(s.id)));
  }
  return STAGES;
}
```

Inside the component, compute visible stages:

```typescript
const visibleStages = getVisibleStages(userRole, userScopes);
```

- [ ] **Step 3: Set initial stage to first visible stage**

Replace the `currentStage` initialization (line 53):

```typescript
const [currentStage, setCurrentStage] = useState(() => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const scopes = user?.scopeValue?.split(',').filter(Boolean) || [];
  const vs = getVisibleStages(user?.role, scopes);
  return vs.length > 0 ? vs[0].id : 'متوسط';
});
```

- [ ] **Step 4: Update stage tabs rendering**

Find where stage tabs are rendered in JSX. Replace `STAGES.map(...)` with `visibleStages.map(...)`. Only show the tabs bar if `visibleStages.length > 1`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/WhatsAppPage.tsx
git commit -m "feat: filter WhatsApp page stages by deputy scope"
```

---

## Task 8: Frontend — Admin Fallback Message in WhatsApp Page

**Files:**
- Modify: `client/src/pages/WhatsAppPage.tsx` (disconnected view area)

**Source of truth:** `canUseAdminWhatsApp` and `adminHasWhatsApp` come from the `/whatsapp/status` API response (added in Task 3 Step 2). They are stored in the existing `status` state.

- [ ] **Step 1: Update StatusResult interface**

In the `StatusResult` interface (lines 8-21), add:

```typescript
canUseAdminWhatsApp?: boolean;
adminHasWhatsApp?: boolean;
```

- [ ] **Step 2: Add fallback message in disconnected view**

In the `disconnected` mainView rendering, after the existing "ربط الرقم الرئيسي" button, add:

```tsx
{/* Admin approved — deputy can send via admin's number */}
{status?.canUseAdminWhatsApp && status?.adminHasWhatsApp && (
  <div style={{
    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
    padding: 16, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: 24 }}>check_circle</span>
    <div>
      <p style={{ margin: 0, fontWeight: 700, color: '#15803d', fontSize: 14 }}>
        الأدمن فعّل لك الإرسال من رقمه
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
        يمكنك إرسال الرسائل حتى بدون ربط رقمك الخاص
      </p>
    </div>
  </div>
)}

{/* Not connected + not approved — must link */}
{userRole === 'Deputy' && !status?.canUseAdminWhatsApp && (
  <div style={{
    background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12,
    padding: 16, marginTop: 16, display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <span className="material-symbols-outlined" style={{ color: '#b45309', fontSize: 24 }}>warning</span>
    <div>
      <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: 14 }}>
        يجب ربط الواتساب أولاً
      </p>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
        اربط رقمك بمسح الباركود لتتمكن من إرسال الرسائل
      </p>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/WhatsAppPage.tsx
git commit -m "feat: show admin fallback and warning messages for deputies"
```

---

## Task 9: Manual Integration Testing

- [ ] **Test 1: Unified mode — Deputy sidebar**
1. Login as Admin → Settings → set mode to "رقم واحد"
2. Logout → Login as Deputy
3. Verify: "أدوات واتساب" NOT in sidebar and NOT in mobile nav
4. Verify: navigating to `/whatsapp` directly redirects to `/`

- [ ] **Test 2: PerStage mode — Deputy scope**
1. Login as Admin → Settings → set mode to "أرقام متعددة"
2. Assign deputy to "متوسط + ثانوي" only
3. Logout → Login as Deputy → WhatsApp page
4. Verify: only "متوسط" and "ثانوي" stage tabs appear

- [ ] **Test 3: CanUseAdminWhatsApp ON**
1. Login as Admin → Settings → edit deputy → enable "السماح بالإرسال من رقم المدير"
2. Logout → Login as Deputy → WhatsApp page (not connected)
3. Verify: green message "الأدمن فعّل لك الإرسال من رقمه" appears

- [ ] **Test 4: CanUseAdminWhatsApp OFF**
1. Disable the toggle for a deputy
2. Login as Deputy → WhatsApp page (not connected)
3. Verify: warning "يجب ربط الواتساب أولاً" appears

- [ ] **Test 5: QR linking as deputy**
1. Login as Deputy → WhatsApp page → security setup → QR scan
2. Verify: phone gets linked to deputy's stage

- [ ] **Test 6: Send with admin fallback**
1. Deputy with `canUseAdminWhatsApp=true`, no own phone, admin has linked phone
2. Try sending a message from another page (e.g., violations)
3. Verify: message sent via admin's phone with sender type "مدير (نيابة)"
