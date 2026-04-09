# Stage Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google-style stage tabs in the header for Admin users with multiple enabled stages, providing full stage isolation across all pages.

**Architecture:** Add `activeStage` to AppContext as the single source of truth. A new `StageTabs` component renders in the header. `usePageData` reads `activeStage` from context instead of local state. All per-page stage filter UI is removed.

**Tech Stack:** React, TypeScript, localStorage for persistence

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/contexts/AppContext.tsx` | Modify | Add `activeStage` + `setActiveStage` + initialization logic |
| `client/src/components/StageTabs.tsx` | Create | Google-style tabs component for the header |
| `client/src/App.tsx` | Modify | Render `StageTabs` in the header area |
| `client/src/hooks/usePageData.ts` | Modify | Read `activeStage` from context, remove local `stageFilter` |
| `client/src/pages/DashboardPage.tsx` | Modify | Remove stage filter UI, use context `activeStage` |
| `client/src/pages/violations/ViolationsPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/TardinessPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/AbsencePage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/PermissionsPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/EducationalNotesPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/PositiveBehaviorPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/AcademicPage.tsx` | Modify | Remove stage filter UI |
| `client/src/pages/CommunicationPage.tsx` | Modify | Remove stage filter UI, use context |
| `client/src/pages/AttendancePage.tsx` | Modify | Remove stage filter UI, use context |
| `client/src/pages/HistoryPage.tsx` | Modify | Remove stage filter select, use context |
| `client/src/pages/ReportsPage.tsx` | Modify | Remove stage filter select, use context |
| `client/src/pages/portfolio/reports/*.tsx` | Modify | Remove stage filter UI (7 files) |

---

### Task 1: Add `activeStage` to AppContext

**Files:**
- Modify: `client/src/contexts/AppContext.tsx`

- [ ] **Step 1: Add activeStage state and logic to AppContext**

Open `client/src/contexts/AppContext.tsx` and make these changes:

1. Add to `AppContextValue` interface (after `enabledStages`):

```typescript
  /** Currently selected stage ID (e.g., 'Primary', 'Intermediate') */
  activeStage: string;
  /** Change the active stage */
  setActiveStage: (stageId: string) => void;
  /** Whether stage tabs should be shown (Admin + 2+ stages) */
  showStageTabs: boolean;
```

2. Add a helper function before `AppProvider`:

```typescript
function resolveActiveStage(enabledStages: StageConfigData[], user: AppUser | null): string {
  // Deputy: use scopeValue
  if (user?.role !== 'Admin' && user?.scopeType === 'stage' && user?.scopeValue) {
    return user.scopeValue;
  }
  // Check localStorage
  const saved = localStorage.getItem('selectedStage');
  if (saved && enabledStages.some(s => s.stage === saved)) {
    return saved;
  }
  // Default: first enabled stage
  return enabledStages[0]?.stage || '';
}
```

3. Inside `AppProvider`, after `enabledStages` memo, add:

```typescript
  const [activeStage, setActiveStageRaw] = useState('');

  const setActiveStage = useCallback((stageId: string) => {
    setActiveStageRaw(stageId);
    localStorage.setItem('selectedStage', stageId);
  }, []);

  // Resolve active stage once enabledStages are loaded
  useEffect(() => {
    if (enabledStages.length > 0 && !activeStage) {
      setActiveStageRaw(resolveActiveStage(enabledStages, user));
    }
  }, [enabledStages, user, activeStage]);

  const showStageTabs = useMemo(
    () => user?.role === 'Admin' && enabledStages.length > 1,
    [user, enabledStages],
  );
```

4. Add `activeStage`, `setActiveStage`, `showStageTabs` to the `value` memo and its dependency array.

- [ ] **Step 2: Verify the app still compiles**

Run: `cd client && npm run build 2>&1 | head -20`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add client/src/contexts/AppContext.tsx
git commit -m "feat: add activeStage to AppContext with localStorage persistence"
```

---

### Task 2: Create StageTabs Component

**Files:**
- Create: `client/src/components/StageTabs.tsx`

- [ ] **Step 1: Create StageTabs component**

Create `client/src/components/StageTabs.tsx`:

```tsx
import React from 'react';
import { useAppContext } from '../hooks/useAppContext';
import { SETTINGS_STAGES } from '../utils/constants';

const StageTabs: React.FC = () => {
  const { enabledStages, activeStage, setActiveStage, showStageTabs } = useAppContext();

  if (!showStageTabs) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '0 4px',
    }}>
      {enabledStages.map((stage) => {
        const info = SETTINGS_STAGES.find(s => s.id === stage.stage);
        const label = info?.name || stage.stage;
        const isActive = activeStage === stage.stage;

        return (
          <button
            key={stage.stage}
            onClick={() => setActiveStage(stage.stage)}
            style={{
              position: 'relative',
              padding: '6px 18px',
              fontSize: '13px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#4f46e5' : '#6b7280',
              background: isActive ? '#eef2ff' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {label}
            {/* Google-style active indicator line */}
            {isActive && (
              <span style={{
                position: 'absolute',
                bottom: '-6px',
                left: '20%',
                right: '20%',
                height: '3px',
                background: '#4f46e5',
                borderRadius: '3px 3px 0 0',
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default StageTabs;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/StageTabs.tsx
git commit -m "feat: create StageTabs Google-style component"
```

---

### Task 3: Render StageTabs in the Header

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Import StageTabs and render in header**

In `client/src/App.tsx`:

1. Add import at top (after other component imports):

```typescript
import StageTabs from './components/StageTabs';
```

2. In `AuthenticatedLayout`, find the `<header>` element (around line 85). Inside the header, add `<StageTabs />` between the existing content. The header currently has items aligned to `flex-end`. We need to restructure it so the stage tabs are centered and other items are on the left:

Replace the header's inner content (lines ~91-111) with:

```tsx
        <header className="no-print" style={{
          background: '#fff', borderBottom: '1px solid #f0f2f7',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: '52px', minHeight: '52px',
          boxShadow: '0 1px 3px rgba(0,0,0,.04)', zIndex: 10,
        }}>
          {/* Left side: user info + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={onLogout} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', background: '#fef2f2', color: '#dc2626',
              borderRadius: '8px', border: '1px solid #fecaca', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              transition: 'all .2s ease',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>logout</span>
              خروج
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: '#fafbfc', borderRadius: '10px', border: '1px solid #f0f2f7' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6b7280' }}>person</span>
              <span style={{ fontSize: '13px', color: '#1a1d2e', fontWeight: 700 }}>{user.name}</span>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: user.role === 'Admin' ? '#eef2ff' : '#f0fdf4',
                color: user.role === 'Admin' ? '#4f46e5' : '#15803d',
              }}>
                {{ Admin: 'مدير', Teacher: 'معلم', Counselor: 'مرشد', Wakeel: 'وكيل' }[user.role] || user.role}
              </span>
            </div>
            <NotificationBell />
          </div>

          {/* Center: Stage Tabs */}
          <StageTabs />

          {/* Right side: empty spacer to balance layout (logo is in sidebar) */}
          <div style={{ width: '1px' }} />
        </header>
```

- [ ] **Step 2: Verify build**

Run: `cd client && npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: render StageTabs in the application header"
```

---

### Task 4: Update usePageData to Use Context activeStage

**Files:**
- Modify: `client/src/hooks/usePageData.ts`

- [ ] **Step 1: Replace local stageFilter with context activeStage**

In `client/src/hooks/usePageData.ts`:

1. Remove the local state `stageFilter` (line 68):
```typescript
// DELETE: const [stageFilter, setStageFilter] = useState('__all__');
```

2. Read `activeStage` from context instead. After `const appCtx = useAppContext();` add:
```typescript
  const stageFilter = appCtx.activeStage;
  const setStageFilter = appCtx.setActiveStage;
```

3. Update `currentStageId` memo — it should now always return the active stage (no `'__all__'` check):
```typescript
  const currentStageId = useMemo(() => {
    if (!stageFilter) return undefined;
    // stageFilter is already a stage ID like 'Primary', 'Intermediate', etc.
    return stageFilter;
  }, [stageFilter]);
```

4. Update `filteredByStage` memo — always filter by active stage:
```typescript
  const filteredByStage = useMemo(() => {
    if (!stageFilter || serverSideFilter) return records;
    return records.filter((r) => r.stage === stageFilter);
  }, [records, stageFilter, serverSideFilter]);
```

5. Keep the return shape the same so existing pages don't break — `stageFilter` and `setStageFilter` are still returned, they just come from context now.

- [ ] **Step 2: Verify build**

Run: `cd client && npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/usePageData.ts
git commit -m "refactor: usePageData reads activeStage from context instead of local state"
```

---

### Task 5: Remove Stage Filter UI from ViolationsPage

**Files:**
- Modify: `client/src/pages/violations/ViolationsPage.tsx`

- [ ] **Step 1: Remove the stage filter section**

In `client/src/pages/violations/ViolationsPage.tsx`:

1. Remove the FilterBtn import if no longer used elsewhere in the file:
```typescript
// Check if FilterBtn is used for other filters — if not, remove import
```

2. Remove the stage filter UI block (lines ~86-96) — the entire `<div>` containing "المرحلة:" label and FilterBtn buttons:
```tsx
// DELETE this entire block:
      {/* Stage Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#6b7280' }}>المرحلة:</span>
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
          <FilterBtn label="الكل" count={violations.length} active={stageFilter === '__all__'} onClick={() => setStageFilter('__all__')} color="#dc2626" />
          {enabledStages.map((stage) => {
            // ... stage buttons
          })}
        </div>
      </div>
```

3. The `stageName` variable (lines ~48-52) can be simplified since stageFilter always has a value now — or kept as-is since it's used in the PageHero title.

- [ ] **Step 2: Verify build**

Run: `cd client && npm run build 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/violations/ViolationsPage.tsx
git commit -m "refactor: remove stage filter UI from ViolationsPage"
```

---

### Task 6: Remove Stage Filter UI from TardinessPage

**Files:**
- Modify: `client/src/pages/TardinessPage.tsx`

- [ ] **Step 1: Remove stage filter UI**

Remove the stage filter `<div>` block (around lines 55-66) containing FilterBtn for stages. Keep everything else intact — the page still uses `stageFilter` and `filteredByStage` from usePageData, they just come from context now.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -5
git add client/src/pages/TardinessPage.tsx
git commit -m "refactor: remove stage filter UI from TardinessPage"
```

---

### Task 7: Remove Stage Filter UI from AbsencePage

**Files:**
- Modify: `client/src/pages/AbsencePage.tsx` (or `client/src/pages/absence/AbsencePage.tsx`)

- [ ] **Step 1: Remove stage filter UI**

Remove the stage filter `<div>` block (around lines 86-96) containing FilterBtn for stages.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -5
git add client/src/pages/absence/
git commit -m "refactor: remove stage filter UI from AbsencePage"
```

---

### Task 8: Remove Stage Filter UI from PermissionsPage

**Files:**
- Modify: `client/src/pages/PermissionsPage.tsx`

- [ ] **Step 1: Remove stage filter UI**

Remove the stage filter `<div>` block (around lines 67-77) containing FilterBtn for stages.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -5
git add client/src/pages/PermissionsPage.tsx
git commit -m "refactor: remove stage filter UI from PermissionsPage"
```

---

### Task 9: Remove Stage Filter UI from EducationalNotesPage

**Files:**
- Modify: `client/src/pages/EducationalNotesPage.tsx`

- [ ] **Step 1: Remove stage filter UI**

Remove the stage filter block (around lines 83-90) — the `enabledStages.length > 1` conditional and FilterBtn rendering.

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -5
git add client/src/pages/EducationalNotesPage.tsx
git commit -m "refactor: remove stage filter UI from EducationalNotesPage"
```

---

### Task 10: Remove Stage Filter UI from Remaining usePageData Pages

**Files:**
- Modify: `client/src/pages/PositiveBehaviorPage.tsx`
- Modify: `client/src/pages/AcademicPage.tsx`

- [ ] **Step 1: Remove stage filter from PositiveBehaviorPage**

Remove the stage filter block (around lines 142-149) — the `enabledStages.length > 1` conditional and FilterBtn rendering. The page uses local `stageFilter` state — replace it with `activeStage` from `useAppContext()`.

- [ ] **Step 2: Remove stage filter from AcademicPage**

Remove the stage filter block (around lines 356-367) — the `enabledStages.length > 1` conditional and FilterBtn rendering. Replace local stage state with `activeStage` from context.

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -5
git add client/src/pages/PositiveBehaviorPage.tsx client/src/pages/AcademicPage.tsx
git commit -m "refactor: remove stage filter UI from PositiveBehavior and Academic pages"
```

---

### Task 11: Remove Stage Filter from Pages with Local State (not usePageData)

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/pages/CommunicationPage.tsx`
- Modify: `client/src/pages/AttendancePage.tsx`
- Modify: `client/src/pages/HistoryPage.tsx`
- Modify: `client/src/pages/ReportsPage.tsx`

These pages use **local** `useState` for `stageFilter` instead of `usePageData`. They need to:
1. Remove the local `stageFilter`/`setStageFilter` state
2. Import and use `useAppContext` to get `activeStage`
3. Replace all references to `stageFilter` with `activeStage`
4. Remove the stage filter UI (FilterBtn buttons or `<select>` dropdown)

- [ ] **Step 1: Update DashboardPage**

In `client/src/pages/DashboardPage.tsx`:
- Line 232: Remove `const [stageFilter, setStageFilter] = useState('');`
- Add: `const activeStage = appCtx.activeStage;` (rename uses of `stageFilter` to `activeStage`, or alias: `const stageFilter = appCtx.activeStage;`)
- Lines 311-318: Remove the FilterBtn block (the "الكل" button and stage buttons)
- The `stageFilter` is used extensively in this page (lines 240, 272, 274, 275, 357, 398, 442, 456) — all these just need to use the context value instead. Since `stageFilter` was `''` for "all" and now it's always a stage ID, remove any `!stageFilter` / `stageFilter === ''` checks that showed "all stages" data.

- [ ] **Step 2: Update CommunicationPage**

In `client/src/pages/CommunicationPage.tsx`:
- Line 64: Remove `const [stageFilter, setStageFilter] = useState('__all__');`
- Add `const { activeStage } = useAppContext();` and use `activeStage` instead of `stageFilter`
- Lines 274-277: Remove FilterBtn stage filter UI
- Replace `stageFilter === '__all__'` checks — now `activeStage` is always a valid stage ID

- [ ] **Step 3: Update AttendancePage**

In `client/src/pages/AttendancePage.tsx`:
- Line 54: Remove `const [stageFilter, setStageFilter] = useState('__all__');`
- Add `const { activeStage } = useAppContext();` and use `activeStage`
- Lines 122-126: Remove FilterBtn stage filter UI

- [ ] **Step 4: Update HistoryPage**

In `client/src/pages/HistoryPage.tsx`:
- Line 67: Remove `const [stageFilter, setStageFilter] = useState('__all__');`
- Add `const { activeStage } = useAppContext();` and use `activeStage`
- Lines 249-252: Remove `<select>` stage filter dropdown

- [ ] **Step 5: Update ReportsPage**

In `client/src/pages/ReportsPage.tsx`:
- Line 26: Remove `const [stageFilter, setStageFilter] = useState('__all__');`
- Add `const { activeStage } = useAppContext();` and use `activeStage`
- Lines 72-76: Remove `<select>` stage filter dropdown

- [ ] **Step 6: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -20
git add client/src/pages/DashboardPage.tsx client/src/pages/CommunicationPage.tsx client/src/pages/AttendancePage.tsx client/src/pages/HistoryPage.tsx client/src/pages/ReportsPage.tsx
git commit -m "refactor: remove stage filter from Dashboard, Communication, Attendance, History, Reports pages — use context activeStage"
```

---

### Task 12: Remove Stage Filter from Portfolio Report Pages

**Files:**
- Modify: `client/src/pages/portfolio/reports/AbsenceReport.tsx`
- Modify: `client/src/pages/portfolio/reports/BehaviorReport.tsx`
- Modify: `client/src/pages/portfolio/reports/CommunicationReport.tsx`
- Modify: `client/src/pages/portfolio/reports/NotesReport.tsx`
- Modify: `client/src/pages/portfolio/reports/PermissionsReport.tsx`
- Modify: `client/src/pages/portfolio/reports/TardinessReport.tsx`
- Modify: `client/src/pages/portfolio/reports/ViolationsReport.tsx`

All 7 files follow the same pattern:
1. Remove local `stage`/`setStage` state
2. Import `useAppContext` and use `activeStage`
3. Remove FilterBtn stage filter UI from each

- [ ] **Step 1: Update all 7 portfolio report files**

For each file:
- Remove local `const [stage, setStage] = useState(...)` 
- Add `const { activeStage } = useAppContext();`
- Replace `stage` references with `activeStage`
- Remove the `enabledStages.map` FilterBtn block

- [ ] **Step 2: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -20
git add client/src/pages/portfolio/reports/
git commit -m "refactor: remove stage filter from all portfolio report pages — use context activeStage"
```

---

### Task 13: Update Remaining Pages with Stage References

**Files:**
- Modify: `client/src/pages/GeneralFormsPage.tsx`
- Modify: `client/src/pages/ParentExcusePage.tsx`

- [ ] **Step 1: Update GeneralFormsPage**

Replace local stage initialization (line ~97-121) with `activeStage` from context.

- [ ] **Step 2: Update ParentExcusePage**

Replace local stage initialization (lines ~17, 27-30) with `activeStage` from context.

- [ ] **Step 3: Verify build and commit**

```bash
cd client && npm run build 2>&1 | head -20
git add client/src/pages/GeneralFormsPage.tsx client/src/pages/ParentExcusePage.tsx
git commit -m "refactor: use context activeStage in GeneralForms and ParentExcuse pages"
```

---

### Task 14: Final Build Verification and Cleanup

- [ ] **Step 1: Full build check**

```bash
cd client && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Check for unused FilterBtn imports**

Search for any remaining FilterBtn imports that are no longer needed (only used for stage filtering):

```bash
grep -rn "FilterBtn" client/src/pages/ --include="*.tsx"
```

If FilterBtn is still used for other filters (like tab filters within pages), keep the import. If it's only used for stage filtering, remove the import.

- [ ] **Step 3: Check for remaining stageFilter references**

```bash
grep -rn "stageFilter\|setStageFilter" client/src/pages/ --include="*.tsx"
```

Any remaining references should be from usePageData return value (which is fine — it now comes from context). If there are local `useState` for `stageFilter` remaining, fix them.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: cleanup unused stage filter imports and references"
```
