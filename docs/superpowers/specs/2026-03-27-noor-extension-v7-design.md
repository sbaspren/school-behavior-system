# Noor Extension v7 — XHR Background Documentation Engine

## Overview

Redesign the Noor Chrome extension from UI automation (DOM manipulation on visible pages) to **background XHR requests** (same-origin POST requests without opening pages). This mirrors the technique used by Madrasati Plus, proven to process 198 students in 14 seconds.

The extension connects to a central SaaS server serving thousands of schools, fetches pending documentation records via JWT-authenticated API, and executes documentation in Noor invisibly.

## Scope

**In scope (Phase 1 — Documentation):**
- Violations (مخالفات سلوكية)
- Tardiness (تأخر صباحي)
- Daily absence (غياب يومي)
- Excellent behavior (سلوك متميز)
- Compensation opportunities (فرص تعويضية)

**Out of scope (Future phases):**
- Extracting student data from Noor
- Extracting teacher data from Noor
- Extracting academic achievement data from Noor

## Architecture

### File Structure

```
noor-extension-v7/
├── manifest.json          # Chrome MV3 config
├── background.js          # Service Worker — HTTP proxy for cross-origin
├── noor-content.js        # Content script — entry point on Noor pages
├── noor-xhr.js            # XHR engine — ViewState chain requests to Noor
├── noor-parser.js         # HTML parser — extracts ViewState, students, dropdowns
├── app-client.js          # App server client — JWT auth + API calls
├── ui.js                  # Side panel UI builder
├── ui.css                 # Side panel styles
├── popup.html             # Login/settings popup
├── popup.js               # Login logic
├── popup.css              # Popup styles
└── icons/                 # Extension icons (16, 48, 128)
```

### Component Responsibilities

| File | Responsibility |
|------|---------------|
| `manifest.json` | Permissions: `noor.moe.gov.sa/*`, `storage`. Content script injection on Noor. |
| `background.js` | Proxy fetch requests to app server (cross-origin). Handles `chrome.runtime.onMessage`. |
| `noor-content.js` | Entry point. Detects Noor login. Injects UI. Orchestrates documentation flow. |
| `noor-xhr.js` | Sends XHR POST requests to Noor pages. Manages ViewState chain. Groups students by class. |
| `noor-parser.js` | Parses HTML responses. Extracts `__VIEWSTATE`, `__EVENTVALIDATION`, student names, dropdown options. |
| `app-client.js` | App server API wrapper. All HTTP calls route through `background.js` via `chrome.runtime.sendMessage({ type: 'api-request', ... })`. Handles JWT auth, pending records fetch, status updates. |
| `ui.js` | Builds and manages the side panel DOM. Handles button clicks. Shows progress and results. |

### Data Flow

```
User opens Noor → noor-content.js injects side panel
                → checks chrome.storage for saved JWT

User clicks "Fetch Records"
    → app-client.js: GET /api/noor/pending-records (via background.js proxy)
    → Server returns records with _noorValue, _noorText, _noorMode
    → ui.js displays record counts by type

User clicks "Start Documentation"
    → noor-content.js groups records by (_type + grade)
    → For each group:
        → noor-xhr.js executes 6-step XHR chain on ManageAttendance.aspx
        → noor-parser.js extracts data from each HTML response
        → ui.js updates progress (class name + count)
    → app-client.js: POST /api/noor/update-status (via background.js proxy)
    → ui.js shows final results with per-class breakdown
```

## Authentication

### Extension ↔ App Server

1. **First-time setup (popup.html):**
   - User enters: server URL + mobile number + password
   - Extension calls: `POST {serverUrl}/api/auth/login`
   - Response: JWT token + user info (name, role, school)
   - Stored in: `chrome.storage.local` (persistent)
   - Role check: Only `Admin` and `Deputy` roles are allowed

2. **Subsequent sessions:**
   - JWT loaded from `chrome.storage.local`
   - If expired (401 response): prompt re-login
   - Server URL persists between sessions

3. **All API calls:**
   - Route through `background.js` (cross-origin proxy)
   - Header: `Authorization: Bearer {jwt}`

### Extension ↔ Noor

- No authentication needed — user is already logged into Noor in the browser
- XHR requests from content script are same-origin (`noor.moe.gov.sa`)
- Browser automatically includes Noor session cookies
- If session expired: Noor returns login page HTML → extension detects and shows message

## XHR Engine (noor-xhr.js)

### Full-Page POST vs UpdatePanel (AsyncPostBack)

Noor uses ASP.NET AJAX UpdatePanels for partial updates when navigating via browser. However, based on reverse-engineering Madrasati Plus, **full-page POST** (not async delta) is the approach used. Each response returns complete HTML (~240KB). This is simpler to parse and more reliable than handling delta responses.

All POST requests must include `Content-Type: application/x-www-form-urlencoded`.

### Hidden Form Fields

Every POST must include ALL hidden fields from the previous response, not just ViewState:

| Field | Description |
|-------|-------------|
| `__VIEWSTATE` | Complete page state (often 10-50KB encoded) |
| `__VIEWSTATEGENERATOR` | Short hash identifying the page |
| `__EVENTVALIDATION` | Server-side anti-tampering token |
| `__EVENTTARGET` | Which control triggered the postback |
| `__EVENTARGUMENT` | Additional argument for the control |
| `__LASTFOCUS` | Last focused element (can be empty) |

Plus all visible form field values (dropdowns, etc.) must be included in every POST.

### Request Chain Per Group

Each group = records sharing the same `(mowadaba + deductType + grade)`.

**Important:** Within a group, each student may have a different `_noorValue` (different violation codes). The `_noorValue` is set per-student in the save step, not per-group.

```
Step 0: Navigate to ManageAttendance.aspx
        Sub-steps:
          0a: GET → Noor home page (the page user is already on, or noor.moe.gov.sa/Noor/...)
              Purpose: Get the current page HTML with fresh ViewState
              Note: Content script can read current page's form state directly
                    from `document` (no XHR needed for the first page)
          0b: POST → current page URL
              Body: __EVENTTARGET=''
                    __EVENTARGUMENT={manageAttendanceBookmark from /api/noor/config}
                    + all hidden fields from 0a
              Purpose: Navigate to ManageAttendance.aspx via bookmark (server-side redirect)
              Response: Full ManageAttendance.aspx HTML
          For subsequent groups: POST to ManageAttendance.aspx URL directly with
              a fresh GET to reset form state (avoids stale ViewState from previous save)
        Extract: All hidden fields + dropdown options from response HTML

Step 1: POST → ManageAttendance.aspx
        Body: __EVENTTARGET=ctl00$PlaceHolderMain$ddlMowadaba
              ddlMowadaba={_noorMode.mowadaba}  // "1" (behavior) or "2" (attendance)
              + all hidden fields from Step 0
              + all other form field current values
        Extract: Updated hidden fields + dropdown options

Step 2: POST → ManageAttendance.aspx  (CONDITIONAL)
        For behavior (mowadaba=1):
          Body: __EVENTTARGET=ctl00$PlaceHolderMain$ddlDeductType
                ddlDeductType={_noorMode.deductType}  // "1" (violation) or "2" (positive)
        For attendance (mowadaba=2):
          Body: __EVENTTARGET=ctl00$PlaceHolderMain$ddlViolation
                ddlViolation="1"  // daily attendance mode
        Skip: only if the default value already matches
        Extract: Updated hidden fields

Step 3: POST → ManageAttendance.aspx
        Body: __EVENTTARGET=ctl00$PlaceHolderMain$oDistributionSearch$ddlClass
              ddlClass={grade value from dropdown options}
              ddlSpecialty= (leave default if present — for courses system)
              ddlSystemStyudy= (leave default — education system)
        Extract: Updated hidden fields + section dropdown populated

Step 4: POST → ManageAttendance.aspx
        Body: __EVENTTARGET=ctl00$PlaceHolderMain$ibtnSearch
              ddlSection="الكل"  // all sections
              clrAttendanceDay={hijri date or leave default for today}
        Extract: Hidden fields + student grid HTML (1+ MB)
        Parse: Student names → row indices → checkbox IDs → dropdown IDs

Step 5: POST → ManageAttendance.aspx
        Body: + all hidden fields from Step 4
              + __EVENTTARGET=ctl00$PlaceHolderMain$ibtnSave
              + For each matched student:
                  {checkboxId}=on
                  {dropdownId}={record._noorValue}  // per-student value
        Response: Confirmation HTML
        Verify: Check for success indicator in response
```

### Date Handling

- Noor defaults to today's Hijri date when the page loads
- The `pending-records` API defaults to `filterMode=today`, returning only today's records
- For today's records: leave the date field at its default value (no extra step needed)
- Future enhancement: support previous dates by setting `clrAttendanceDay` field

### Education System and Specialty Dropdowns

- `ddlSystemStyudy` (education system): Leave at default. Most schools have one system.
- `ddlSpecialty` (specialty/track): Leave at default. Appears only for secondary courses system.
- These are assumed safe to ignore for Phase 1. If issues arise during testing, add explicit steps.

### Form State Extraction (DOMParser-based)

All HTML parsing uses `DOMParser` (available in content scripts) instead of regex. This handles HTML encoding correctly and is robust against attribute ordering changes.

```javascript
function extractFormState(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const form = doc.querySelector('#aspnetForm') || doc.querySelector('form');
    const state = {};

    // 1. All hidden inputs (ViewState, EventValidation, etc.)
    form.querySelectorAll('input[type="hidden"]').forEach(input => {
        if (input.name) state[input.name] = input.value;
    });

    // 2. All <select> current values (dropdowns)
    form.querySelectorAll('select').forEach(select => {
        if (select.name) state[select.name] = select.value;
    });

    // 3. All visible <input> values (text, etc.)
    form.querySelectorAll('input[type="text"], input[type="hidden"]').forEach(input => {
        if (input.name && !state[input.name]) state[input.name] = input.value;
    });

    return state;
    // Returns: { __VIEWSTATE: "...", __EVENTVALIDATION: "...",
    //   __VIEWSTATEGENERATOR: "...", __EVENTTARGET: "", __EVENTARGUMENT: "",
    //   __LASTFOCUS: "", ctl00$...ddlMowadaba: "1", ... }
}
```

**Every POST sends the complete `state` object** as the body, with only the changed fields overwritten. This mirrors how a browser form submission works — all fields are always included.

### Student Grid Parsing

```javascript
function parseStudentGrid(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('[id*="gvClassStudentsAttendance"]');
    const students = new Map();

    table.querySelectorAll('tr').forEach((tr, rowIndex) => {
        const checkbox = tr.querySelector('input[type="checkbox"]');
        const dropdown = tr.querySelector('select');
        if (!checkbox || !dropdown) return; // header row or non-student row

        // Skip already-checked students (documented by someone else)
        if (checkbox.checked) return;

        // Student name: first <td> or <span> with text > 5 chars
        const nameCell = [...tr.querySelectorAll('td span, td')]
            .find(el => el.textContent.trim().length > 5);
        const name = nameCell ? nameCell.textContent.trim() : '';

        students.set(normalizeArabic(name), {
            name, rowIndex,
            checkboxId: checkbox.name,   // POST uses name, not id
            dropdownId: dropdown.name,
            alreadyChecked: false
        });
    });

    return students;
}
```

**Note:** Already-checked checkboxes are skipped (I1 — handles students documented by others).

### Save Request Body Construction

```javascript
function buildSaveBody(prevFormState, matchedStudents, records) {
    // Start from the COMPLETE form state of Step 4 response
    // This includes ALL hidden fields + ALL dropdown values
    const body = new URLSearchParams(prevFormState);

    // Override the event target to the save button
    body.set('__EVENTTARGET', 'ctl00$PlaceHolderMain$ibtnSave');
    body.set('__EVENTARGUMENT', '');

    // Set each matched student's checkbox and dropdown
    for (const record of records) {
        const student = findStudentByName(matchedStudents, record.studentName);
        if (student) {
            body.set(student.checkboxId, 'on');
            body.set(student.dropdownId, record._noorValue);
        }
    }

    return body.toString();
}
```

**Key:** `prevFormState` is the full output of `extractFormState(step4Html)`, containing every hidden field and dropdown value. This ensures ASP.NET receives the complete form state it expects.

## Record Grouping Strategy

Records are grouped to minimize XHR chains:

```
Input: 30 records (mixed types and grades)

Grouping: by (_noorMode.mowadaba + _noorMode.deductType + grade)

Result:
  Group 1: mowadaba=1, deductType=1, الأول ث → 8 violations + 3 tardiness
  Group 2: mowadaba=1, deductType=1, الثاني ث → 4 violations
  Group 3: mowadaba=1, deductType=2, الأول ث → 3 excellent + 2 compensation
  Group 4: mowadaba=2, الأول ث → 5 absences
  Group 5: mowadaba=2, الثاني ث → 3 absences
  ...

Each group = 1 XHR chain (6 requests) regardless of student count
```

This means 30 records might only need 5 XHR chains (30 requests) instead of 30 separate chains (180 requests).

**Compensation vs Excellent behavior:** Both share the same XHR chain path (`mowadaba=1, deductType=2`) and are grouped together. They are differentiated only by their per-student `_noorValue` — the dropdown value set in Step 5 for each individual student determines whether it's "excellent" or "compensation".

## HTML Parser (noor-parser.js)

### Functions

| Function | Input | Output |
|----------|-------|--------|
| `extractFormState(html)` | Full HTML response | `{ __VIEWSTATE, __EVENTVALIDATION, ddlMowadaba, ... }` (all form fields by name) |
| `extractDropdownOptions(html, selectId)` | HTML + element ID | `[{ value, text }]` |
| `extractStudentGrid(html)` | HTML with student table | `Map<name, { row, checkboxId, dropdownId }>` |
| `detectLoginPage(html)` | HTML response | `boolean` — true if Noor session expired |
| `detectSaveSuccess(html)` | HTML after save | `{ success: boolean, message: string }` — see Save Verification below |
| `normalizeArabic(text)` | Arabic string | Normalized string (remove diacritics, normalize ة→ه, ى→ي, إ/أ/آ→ا) |

### Save Verification

After submitting the save POST (Step 5), the response HTML must be checked to confirm success:

```javascript
function detectSaveSuccess(html) {
    // Success indicators (ASP.NET WebForms patterns):
    // 1. Alert script: Noor injects <script>alert('تم الحفظ بنجاح')</script>
    // 2. Success label: <span id="...lblSaveResult..." class="success">
    // 3. No error panel: absence of <div class="error-panel"> or validation summary

    const hasSuccessAlert = /alert\s*\(\s*['"].*(?:تم|بنجاح|success)/i.test(html);
    const hasErrorPanel = /class="(?:error|validation-summary|ErrorMessage)"/i.test(html);
    const hasErrorAlert = /alert\s*\(\s*['"].*(?:خطأ|فشل|error)/i.test(html);

    if (hasSuccessAlert && !hasErrorPanel) {
        return { success: true, message: 'تم الحفظ بنجاح' };
    }
    if (hasErrorAlert || hasErrorPanel) {
        // Try to extract the error message
        const errorMatch = html.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        return { success: false, message: errorMatch?.[1] || 'فشل الحفظ — سبب غير معروف' };
    }
    // Fallback: if the page reloaded with the same student grid, assume success
    // (some pages don't show explicit confirmation)
    return { success: false, message: 'لم يتم التحقق من نتيجة الحفظ', unconfirmed: true };
}
```

**Note:** The exact success/error patterns will be confirmed during first live test. The regex patterns above are best guesses based on ASP.NET WebForms conventions. If different patterns are found, update accordingly.

## UI Design (ui.js + ui.css)

### Side Panel — Injected into Noor page (RTL, right side)

**Design language:**
- Colors: Primary teal (#009688), success green (#4CAF50), error red (#f44336), background white
- Font: system Arabic font (Segoe UI, Tahoma)
- Width: 320px fixed, collapsible via floating button
- Position: fixed right, full height, z-index above Noor content
- Animations: slide-in/out, smooth progress bar, fade transitions

### States

**State 1: Not logged in**
- Message: "سجّل الدخول من أيقونة الإضافة أولاً" (Login via extension icon first)
- Login happens ONLY through `popup.html` (single login surface — avoids confusion)
- Side panel reads JWT from `chrome.storage.local` and shows this state if absent

**State 2: Logged in — Main screen**
- Header: app name + user info (name, role, school)
- Record counts table (type → count, with class/section breakdown)
- "Refresh Records" button
- "Start Documentation" button (disabled if no records)
- Logout link

**State 3: Documentation in progress**
- Overall progress bar (percentage + count)
- Per-group progress list:
  - Type label (مخالفات / غياب / etc.)
  - Class/section name
  - Status: ✓ done (count) / ⏳ in progress (current/total) / ○ pending
- Stop button

**State 4: Documentation complete**
- Summary: success count + failure count
- Per-type breakdown with class/section names and counts
- Failed students listed by name under their class
- "Retry Failed" button (if any failures)
- "Back" button

## Error Handling

### Network Errors (XHR to Noor)
- Retry 3 times with exponential backoff (2s, 4s, 8s)
- If all retries fail: mark students in current group as "failed", continue to next group
- Show failed student names in results

### Noor Session Expired
- Detect by checking if response HTML contains login form
- Stop documentation immediately
- Show message: "انتهت جلسة نور. سجّل دخولك في نور ثم حاول مرة أخرى"

### App Server Errors
- 401 Unauthorized: JWT expired → prompt re-login
- 403 Forbidden: Subscription expired → show message
- 500 Server Error: Show error message, allow retry
- Network unreachable: Show offline message

### Data Errors
- Student not found in Noor grid: Mark as "failed" with reason "لم يُعثر على الطالب"
- Dropdown value not found: Mark as "failed" with reason "القيمة غير موجودة"
- Save verification failed: Mark group as "failed"

### Concurrency Control

- A single `isRunning` flag in `noor-content.js` prevents concurrent documentation runs
- "Start Documentation" button is disabled while `isRunning === true`
- "Stop" button sets `isRunning = false`; the XHR chain checks this flag before each step and aborts cleanly if false
- If the user navigates away from Noor (page unload), the run is implicitly stopped (content script is destroyed)
- No persistence of in-progress state — if the page reloads, the user fetches records again and restarts
- Records that were partially processed (save POST not sent) remain in "pending" state on the server

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "نظام شؤون الطلاب — ربط نور",
  "version": "7.0.0",
  "description": "توثيق المخالفات والغياب والسلوك في نظام نور تلقائياً",
  "permissions": ["storage"],
  "host_permissions": [
    "https://noor.moe.gov.sa/*"
  ],
  "optional_host_permissions": [
    "https://*/*"
  ],
  "content_scripts": [{
    "matches": ["https://noor.moe.gov.sa/Noor/*"],
    "js": ["noor-parser.js", "noor-xhr.js", "app-client.js", "ui.js", "noor-content.js"],
    "css": ["ui.css"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "web_accessible_resources": [{
    "resources": ["icons/*"],
    "matches": ["https://noor.moe.gov.sa/*"]
  }]
}
```

**`run_at: document_idle`** — Injects after the page is fully loaded and idle. This is safer than `document_end` because Noor pages are heavy ASP.NET pages with async postbacks. Waiting for idle ensures all Noor scripts have initialized and the page is ready for interaction. The side panel doesn't need to appear instantly — a 1-2 second delay after page load is acceptable.

**Permissions notes:**
- `host_permissions: noor.moe.gov.sa/*` — Required for content script injection and same-origin XHR
- `optional_host_permissions: https://*/*` — App server URL is configured at login (each school may use a different server). At login time, the extension calls `chrome.permissions.request({ origins: [serverUrl + '/*'] })` to get permission for that specific domain. This avoids the overly broad wildcard in `host_permissions` and satisfies Chrome Web Store review requirements.

## background.js (Service Worker)

HTTP proxy for cross-origin requests to app server. Content scripts on `noor.moe.gov.sa` cannot directly call the app server (different origin), so all app API calls route through the service worker.

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'api-request') return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    fetch(msg.url, {
        method: msg.method || 'GET',
        headers: msg.headers || {},
        body: msg.body || null,
        signal: controller.signal
    })
    .then(async (res) => {
        clearTimeout(timeout);
        const text = await res.text();
        if (!res.ok) {
            sendResponse({ ok: false, status: res.status, error: text.substring(0, 500) });
            return;
        }
        try {
            sendResponse({ ok: true, data: JSON.parse(text) });
        } catch {
            sendResponse({ ok: false, error: 'Invalid JSON response', raw: text.substring(0, 500) });
        }
    })
    .catch(err => {
        clearTimeout(timeout);
        const isTimeout = err.name === 'AbortError';
        sendResponse({
            ok: false,
            error: isTimeout ? 'Request timed out (30s)' : err.message
        });
    });

    return true; // keep message channel open for async response
});
```

**Key behaviors:**
- 30-second timeout per request (prevents hung connections)
- Non-2xx responses return `{ ok: false, status, error }` with status code for caller to handle (401 → re-login, 403 → subscription expired)
- Non-JSON responses caught gracefully (server might return HTML error pages)
- AbortError distinguished from network errors for better user messages

### Service Worker Lifecycle (MV3)

Chrome MV3 service workers sleep after 30 seconds of inactivity. This affects v7 because:
- **XHR to Noor:** Happens in the content script (same-origin), so the service worker is NOT involved
- **API calls to app server:** Route through the service worker via `chrome.runtime.sendMessage`

The documentation flow only calls the app server at two points:
1. **Before documentation:** Fetch pending records + config
2. **After documentation:** Update record statuses

Both calls happen as discrete `sendMessage` calls which wake the service worker automatically. No keepalive needed because the long-running XHR chain (the actual documentation work) happens entirely in the content script without involving the service worker.

If the service worker is asleep when the content script sends a status update, the `sendMessage` call wakes it. This is a Chrome MV3 guarantee.

### Incremental Status Updates

To prevent data loss if the user closes the tab mid-documentation:
- After each **successful group save** (Step 5 confirmed), immediately send a status update to the app server for that group's records
- This means the service worker is woken per-group (every ~5-10 seconds), not just at the end
- If the tab closes after group 2 of 5, groups 1-2 are marked as documented on the server

## App Server Changes

### Existing endpoints (no changes needed):
- `POST /api/auth/login` — Returns JWT token
- `GET /api/noor/pending-records` — Returns records with Noor mappings
- `POST /api/noor/update-status` — Updates record statuses
- `GET /api/noor/mappings` — Returns violation/behavior mappings

### New endpoint needed:
- `GET /api/noor/config` — Returns Noor page navigation and form configuration

**Response schema:**
```json
{
  "manageAttendanceBookmark": "Bookmark_Manage_..._Attendance",
  "gradeMap": {
    "الأول المتوسط": "grade_value_from_noor",
    "الثاني المتوسط": "grade_value_from_noor"
  },
  "defaultSection": "الكل",
  "extensionMinVersion": "7.0.0"
}
```

**Fields:**
- `manageAttendanceBookmark` — The `__EVENTARGUMENT` value used to navigate from Noor homepage to ManageAttendance page. Captured once per school during initial setup.
- `gradeMap` — Maps app grade names to Noor dropdown values. **Phase 1:** hardcoded in the extension (same approach as v6). The config endpoint returns an empty `gradeMap` and the extension falls back to its built-in map. **Phase 2:** calibration flow where the extension reads Noor's grade dropdown, user confirms mapping, and it's saved to the server.
- `defaultSection` — Default section filter ("الكل" = all sections).
- `extensionMinVersion` — Minimum extension version required. If user's extension is older, show upgrade message.

### Version Check Flow

1. After login (or on each `pending-records` fetch), the extension calls `GET /api/noor/config`
2. Extension compares `chrome.runtime.getManifest().version` against `extensionMinVersion`
3. If current version < minimum version: block documentation, show message "يرجى تحديث الإضافة إلى الإصدار {minVersion} أو أحدث"
4. Simple string comparison: split by `.`, compare major → minor → patch numerically

### CORS configuration:
- Add CORS headers for Chrome extension origin
- Or: extension routes all app API calls through `background.js` proxy (recommended — no CORS needed)

## Security Considerations

- JWT tokens stored in `chrome.storage.local` (encrypted by Chrome)
- No remote code loading (unlike Madrasati Plus) — all code bundled in extension
- Server URL validated before use
- Role check: reject non-Admin/Deputy users at login
- No sensitive data logged to console in production
- Extension does NOT modify Noor page DOM (except injecting side panel)

## Performance Expectations

Based on Madrasati Plus benchmarks (198 students in 14 seconds):

| Records | Groups | XHR Chains | Estimated Time |
|---------|--------|------------|---------------|
| 10 | 2-3 | 12-18 requests | ~5 seconds |
| 30 | 4-6 | 24-36 requests | ~10 seconds |
| 100 | 8-12 | 48-72 requests | ~25 seconds |
| 200 | 10-15 | 60-90 requests | ~35 seconds |

## Testing Strategy

1. **Manual testing on live Noor:**
   - Login detection
   - XHR chain execution
   - ViewState extraction
   - Student matching
   - Save verification

2. **Unit tests (offline):**
   - HTML parsing (ViewState, student grid, dropdowns)
   - Arabic name normalization
   - Record grouping logic
   - Save body construction

3. **Error scenario testing:**
   - Expired Noor session
   - Network interruption mid-chain
   - Student name mismatch
   - Invalid dropdown values
