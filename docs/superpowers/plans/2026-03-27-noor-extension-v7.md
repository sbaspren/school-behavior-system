# Noor Extension v7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that documents violations, tardiness, absence, and positive behavior in Noor via background XHR POST chains (no visible page automation).

**Architecture:** Content script on `noor.moe.gov.sa` injects a side panel UI. User authenticates with the app server via JWT (popup login → background.js proxy). Pending records are fetched, grouped by `(mowadaba + deductType + grade)`, and each group is documented via a 6-step ASP.NET WebForms ViewState chain using same-origin XHR POST requests. Results are reported back to the server incrementally.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript (no build step), DOMParser for HTML parsing, URLSearchParams for POST bodies, chrome.storage.local for persistence.

**Spec:** `docs/superpowers/specs/2026-03-27-noor-extension-v7-design.md`

**Extension directory:** `d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7/` (alongside v6)

**Server directory:** `d:/SchoolBehaviorSystem/school-behavior-system-23-main/school-behavior-system-23-main/`

---

## File Structure

```
noor-extension-v7/
├── manifest.json            # Chrome MV3 config — permissions, content scripts, service worker
├── background.js            # Service Worker — HTTP proxy for app server (cross-origin)
├── noor-parser.js           # Pure functions — DOMParser-based HTML parsing, Arabic normalization
├── noor-xhr.js              # XHR engine — ViewState chain, retry logic, form state management
├── app-client.js            # App server API client — JWT auth, pending records, status updates
├── ui.js                    # Side panel DOM builder — 4 states, progress tracking, results display
├── ui.css                   # Side panel styles — RTL, teal theme, animations
├── noor-content.js          # Orchestrator — entry point, record grouping, flow control
├── popup.html               # Login popup — server URL + credentials form
├── popup.js                 # Login logic — JWT storage, role validation, permission request
├── popup.css                # Popup styles
├── icons/
│   ├── icon-16.png          # Toolbar icon
│   ├── icon-48.png          # Extensions page
│   └── icon-128.png         # Chrome Web Store
└── tests/
    └── test-parser.html     # Browser-based parser tests (open in Chrome)
```

**Server changes:**
```
src/API/Controllers/NoorController.cs   # Add GET /api/noor/config endpoint (~30 lines)
```

---

## Task 1: Project Scaffold — manifest.json + Directory

**Files:**
- Create: `noor-extension-v7/manifest.json`
- Create: `noor-extension-v7/icons/` (placeholder icons)

- [ ] **Step 1: Create extension directory and manifest.json**

```bash
EXT="d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/noor-extension-v7"
mkdir -p "$EXT/icons"
```

Create `manifest.json`:

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

- [ ] **Step 2: Create placeholder icon files**

Copy icons from v6 or create simple 16x16, 48x48, 128x128 PNG files in `icons/`. For development, solid-color squares work fine.

```bash
# Copy from v6 if available:
cp "d:/وكيل شؤون الطلاب/اضافات الكروم/اضافة التطبيق شؤو ن الطلاب/‏‏noor-extension-v6/icons/"*.png "$EXT/icons/" 2>/dev/null || echo "Create placeholder icons manually"
```

- [ ] **Step 3: Create empty stub files so Chrome can load the extension**

Create empty files for all scripts referenced in manifest.json. Chrome will fail to load if any are missing.

```bash
for f in background.js noor-parser.js noor-xhr.js app-client.js ui.js noor-content.js popup.html popup.js popup.css ui.css; do
  touch "$EXT/$f"
done
```

- [ ] **Step 4: Verify Chrome loads the extension**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `noor-extension-v7` folder
4. Verify: No errors, extension icon appears in toolbar

- [ ] **Step 5: Commit**

```bash
cd "$EXT" && git init && git add -A && git commit -m "chore: scaffold extension — manifest.json + directory structure"
```

---

## Task 2: HTML Parser — noor-parser.js

**Files:**
- Create: `noor-extension-v7/noor-parser.js`

This file contains ALL pure parsing functions. No side effects, no Chrome APIs — just input HTML → output data. This makes it testable in any browser.

- [ ] **Step 1: Write noor-parser.js with all parsing functions**

```javascript
// noor-parser.js — Pure HTML parsing functions for Noor ASP.NET WebForms pages
// No Chrome APIs used — all functions take HTML string input and return data
'use strict';

/**
 * Noor control IDs (UniqueID format for POST body — uses $ separator)
 * DOM queries use underscore format: replace $ with _
 */
const NOOR_IDS = {
  mowadaba:    'ctl00$PlaceHolderMain$ddlMowadaba',
  deductType:  'ctl00$PlaceHolderMain$ddlDeductType',
  violation:   'ctl00$PlaceHolderMain$ddlViolation',
  systemStudy: 'ctl00$PlaceHolderMain$ddlSystemStyudy',
  specialty:   'ctl00$PlaceHolderMain$ddlSpecialty',
  grade:       'ctl00$PlaceHolderMain$oDistributionSearch$ddlClass',
  section:     'ctl00$PlaceHolderMain$ddlSection',
  date:        'ctl00$PlaceHolderMain$clrAttendanceDay',
  btnSearch:   'ctl00$PlaceHolderMain$ibtnSearch',
  btnSave:     'ctl00$PlaceHolderMain$ibtnSave',
  grid:        'ctl00$PlaceHolderMain$gvClassStudentsAttendance',
};

/**
 * Grade map — maps app grade names to Noor dropdown values
 * Format: { stageName: { gradeName: "dropdownValue" } }
 * Carried over from v6 noor-bridge.js GRADE_MAP
 * The values are "gradeValue,specialtyValue" (specialty always "1")
 */
const GRADE_MAP = {
  'ابتدائي': {
    'الأول': '1,1', 'الثاني': '2,1', 'الثالث': '3,1',
    'الرابع': '4,1', 'الخامس': '5,1', 'السادس': '6,1'
  },
  'متوسط': {
    'الأول': '7,1', 'الثاني': '8,1', 'الثالث': '9,1'
  },
  'ثانوي': {
    'الأول': '10,1', 'الثاني': '11,1', 'الثالث': '12,1'
  }
};

// ─── Arabic Text Normalization ────────────────────────────────────────

/**
 * Normalize Arabic text for comparison.
 * Removes diacritics, normalizes letter variants, trims whitespace.
 * @param {string} text
 * @returns {string}
 */
function normalizeArabic(text) {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[أإآ]/g, 'ا')   // normalize alef
    .replace(/ة/g, 'ه')       // teh marbuta → ha
    .replace(/ى/g, 'ي')       // alef maqsura → ya
    .replace(/ؤ/g, 'و')       // waw with hamza → waw
    .replace(/ئ/g, 'ي')       // ya with hamza → ya
    .replace(/\s+/g, ' ')     // collapse whitespace
    .trim();
}

// ─── Form State Extraction ────────────────────────────────────────────

/**
 * Extract complete form state from an ASP.NET WebForms HTML page.
 * Returns all hidden fields + all select values + all input values.
 * This is the foundation for building POST bodies.
 * @param {string} html - Full HTML response from Noor
 * @returns {Object} Key-value map of all form fields by name
 */
function extractFormState(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const form = doc.querySelector('#aspnetForm') || doc.querySelector('form');
  if (!form) return {};

  const state = {};

  // 1. Hidden inputs (ViewState, EventValidation, etc.)
  form.querySelectorAll('input[type="hidden"]').forEach(input => {
    if (input.name) state[input.name] = input.value;
  });

  // 2. Select elements (dropdowns) — current selected value
  form.querySelectorAll('select').forEach(select => {
    if (select.name) state[select.name] = select.value;
  });

  // 3. Text inputs
  form.querySelectorAll('input[type="text"]').forEach(input => {
    if (input.name && !(input.name in state)) state[input.name] = input.value;
  });

  // 4. Checkboxes — only include checked ones
  form.querySelectorAll('input[type="checkbox"]').forEach(input => {
    if (input.name && input.checked) state[input.name] = 'on';
  });

  return state;
}

// ─── Dropdown Options ─────────────────────────────────────────────────

/**
 * Extract options from a <select> dropdown in the HTML.
 * @param {string} html
 * @param {string} selectName - The `name` attribute (UniqueID with $ separators)
 * @returns {Array<{value: string, text: string}>}
 */
function extractDropdownOptions(html, selectName) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Convert $ to _ for DOM ID lookup
  const domId = selectName.replace(/\$/g, '_');
  const select = doc.querySelector('#' + domId) || doc.querySelector(`[name="${selectName}"]`);
  if (!select) return [];

  return Array.from(select.querySelectorAll('option')).map(opt => ({
    value: opt.value,
    text: opt.textContent.trim()
  }));
}

// ─── Student Grid Parsing ─────────────────────────────────────────────

/**
 * Parse the student attendance grid from Noor HTML.
 * Returns a Map of normalized student names → row data.
 * Skips already-checked students (documented by someone else).
 * @param {string} html
 * @returns {Map<string, {name: string, rowIndex: number, checkboxName: string, dropdownName: string}>}
 */
function parseStudentGrid(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const gridId = NOOR_IDS.grid.replace(/\$/g, '_');
  const table = doc.querySelector('#' + gridId) || doc.querySelector('[id*="gvClassStudentsAttendance"]');
  const students = new Map();

  if (!table) return students;

  table.querySelectorAll('tr').forEach((tr, rowIndex) => {
    const checkbox = tr.querySelector('input[type="checkbox"]');
    const dropdown = tr.querySelector('select');
    if (!checkbox || !dropdown) return; // header or non-student row

    // Skip already-checked students
    if (checkbox.checked) return;

    // Find student name — first text content > 5 chars in a cell
    const nameCell = Array.from(tr.querySelectorAll('td span, td'))
      .find(el => el.textContent.trim().length > 5);
    const name = nameCell ? nameCell.textContent.trim() : '';

    if (name) {
      students.set(normalizeArabic(name), {
        name,
        rowIndex,
        checkboxName: checkbox.name,
        dropdownName: dropdown.name
      });
    }
  });

  return students;
}

/**
 * Find a student in the parsed grid by name.
 * Tries exact match first, then partial word matching.
 * @param {Map} students - Output of parseStudentGrid
 * @param {string} targetName
 * @returns {Object|null} Student row data or null
 */
function findStudentByName(students, targetName) {
  const normalized = normalizeArabic(targetName);

  // Exact match
  if (students.has(normalized)) return students.get(normalized);

  // Partial match — find student whose name contains all words of target
  const targetWords = normalized.split(' ').filter(w => w.length > 1);
  for (const [key, student] of students) {
    const matched = targetWords.every(word => key.includes(word));
    if (matched) return student;
  }

  return null;
}

// ─── Login Detection ──────────────────────────────────────────────────

/**
 * Check if the HTML response is a Noor login page (session expired).
 * @param {string} html
 * @returns {boolean}
 */
function detectLoginPage(html) {
  return html.includes('Login.aspx') ||
         html.includes('txtUserName') ||
         html.includes('btnLogin') ||
         (html.includes('تسجيل الدخول') && html.includes('كلمة المرور'));
}

// ─── Save Verification ───────────────────────────────────────────────

/**
 * Check if the save POST response indicates success or failure.
 * @param {string} html
 * @returns {{success: boolean, message: string, unconfirmed?: boolean}}
 */
function detectSaveSuccess(html) {
  const hasSuccessAlert = /alert\s*\(\s*['"].*(?:تم|بنجاح|success)/i.test(html);
  const hasErrorPanel = /class="(?:error|validation-summary|ErrorMessage)"/i.test(html);
  const hasErrorAlert = /alert\s*\(\s*['"].*(?:خطأ|فشل|error)/i.test(html);

  if (hasSuccessAlert && !hasErrorPanel) {
    return { success: true, message: 'تم الحفظ بنجاح' };
  }
  if (hasErrorAlert || hasErrorPanel) {
    const errorMatch = html.match(/alert\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    return { success: false, message: errorMatch?.[1] || 'فشل الحفظ — سبب غير معروف' };
  }
  return { success: false, message: 'لم يتم التحقق من نتيجة الحفظ', unconfirmed: true };
}

// ─── Grade Resolution ─────────────────────────────────────────────────

/**
 * Resolve a grade name (from app records) to a Noor dropdown value.
 * @param {string} gradeName - e.g. "الأول المتوسط", "الثالث الابتدائي"
 * @returns {string|null} Noor dropdown value or null
 */
function resolveGradeValue(gradeName) {
  if (!gradeName) return null;
  const normalized = normalizeArabic(gradeName);

  for (const [stage, grades] of Object.entries(GRADE_MAP)) {
    if (normalized.includes(normalizeArabic(stage))) {
      for (const [grade, value] of Object.entries(grades)) {
        if (normalized.includes(normalizeArabic(grade))) {
          return value;
        }
      }
    }
  }

  // No fallback for ambiguous names — grade name MUST include stage qualifier
  // (e.g., "الأول المتوسط" not just "الأول")
  return null;
}

// ─── POST Body Construction ───────────────────────────────────────────

/**
 * Build a POST body for a form step. Takes the previous form state,
 * sets __EVENTTARGET and any changed field values.
 * @param {Object} prevState - Full form state from extractFormState
 * @param {string} eventTarget - Control UniqueID that triggers the postback
 * @param {Object} overrides - Field values to change { name: value }
 * @returns {string} URL-encoded POST body
 */
function buildPostBody(prevState, eventTarget, overrides = {}) {
  const body = new URLSearchParams(prevState);
  body.set('__EVENTTARGET', eventTarget);
  body.set('__EVENTARGUMENT', '');

  for (const [key, value] of Object.entries(overrides)) {
    body.set(key, value);
  }

  return body.toString();
}

/**
 * Build the save POST body with student checkboxes and dropdown values.
 * @param {Object} prevState - Full form state from Step 4
 * @param {Array} matchedStudents - [{checkboxName, dropdownName, noorValue}]
 * @returns {string} URL-encoded POST body
 */
function buildSaveBody(prevState, matchedStudents) {
  const body = new URLSearchParams(prevState);
  body.set('__EVENTTARGET', NOOR_IDS.btnSave);
  body.set('__EVENTARGUMENT', '');

  for (const s of matchedStudents) {
    body.set(s.checkboxName, 'on');
    body.set(s.dropdownName, s.noorValue);
  }

  return body.toString();
}

// ─── Record Grouping ──────────────────────────────────────────────────

/**
 * Group pending records by (mowadaba + deductType + grade).
 * Each group will be processed in a single XHR chain.
 * @param {Array} records - Pending records from app server
 * @returns {Array<{key: string, mowadaba: string, deductType: string|null, grade: string, records: Array}>}
 */
function groupRecords(records) {
  const groups = new Map();

  for (const record of records) {
    const mode = record._noorMode || {};
    const mowadaba = mode.mowadaba || '1';
    const deductType = mode.deductType || '';
    const grade = record.grade || '';
    const key = `${mowadaba}|${deductType}|${grade}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        mowadaba,
        deductType,
        grade,
        records: []
      });
    }
    groups.get(key).records.push(record);
  }

  return Array.from(groups.values());
}
```

- [ ] **Step 2: Verify file loads without errors**

Reload the extension in `chrome://extensions/` (click the reload icon). Check for errors — there should be none since this file has no Chrome API calls at the module level.

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add noor-parser.js && git commit -m "feat: add HTML parser — DOMParser-based form extraction, student grid parsing, Arabic normalization"
```

---

## Task 3: Parser Unit Tests

**Files:**
- Create: `noor-extension-v7/tests/test-parser.html`

Browser-based tests — open in Chrome to verify all parser functions work correctly.

- [ ] **Step 1: Create test HTML file with sample Noor HTML and assertions**

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Parser Tests</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #eee; }
    .pass { color: #4CAF50; }
    .fail { color: #f44336; font-weight: bold; }
    h2 { color: #009688; }
    pre { background: #2a2a2a; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>noor-parser.js — Unit Tests</h1>
  <div id="results"></div>

  <script src="../noor-parser.js"></script>
  <script>
    let passed = 0, failed = 0;
    const results = document.getElementById('results');

    function assert(condition, testName) {
      if (condition) {
        passed++;
        results.innerHTML += `<div class="pass">✓ ${testName}</div>`;
      } else {
        failed++;
        results.innerHTML += `<div class="fail">✗ ${testName}</div>`;
      }
    }

    function assertEqual(actual, expected, testName) {
      const pass = JSON.stringify(actual) === JSON.stringify(expected);
      if (!pass) {
        failed++;
        results.innerHTML += `<div class="fail">✗ ${testName}<pre>Expected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}</pre></div>`;
      } else {
        passed++;
        results.innerHTML += `<div class="pass">✓ ${testName}</div>`;
      }
    }

    // ─── Test: normalizeArabic ───────────────────
    results.innerHTML += '<h2>normalizeArabic</h2>';

    assertEqual(normalizeArabic('أحمد'), 'احمد', 'normalize hamza alef');
    assertEqual(normalizeArabic('إبراهيم'), 'ابراهيم', 'normalize alef with hamza below');
    assertEqual(normalizeArabic('آمنة'), 'امنه', 'normalize alef madda + teh marbuta');
    assertEqual(normalizeArabic('فاطمة'), 'فاطمه', 'teh marbuta → ha');
    assertEqual(normalizeArabic('مُحَمَّد'), 'محمد', 'remove diacritics');
    assertEqual(normalizeArabic('عيسى'), 'عيسي', 'alef maqsura → ya');
    assertEqual(normalizeArabic('  محمد   أحمد  '), 'محمد احمد', 'collapse whitespace');
    assertEqual(normalizeArabic(''), '', 'empty string');
    assertEqual(normalizeArabic(null), '', 'null input');

    // ─── Test: extractFormState ──────────────────
    results.innerHTML += '<h2>extractFormState</h2>';

    const sampleFormHtml = `
      <html><body>
        <form id="aspnetForm" action="/Noor/Page.aspx">
          <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="abc123xyz" />
          <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="CAFE" />
          <input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="ev123" />
          <input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="" />
          <input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="" />
          <input type="hidden" name="__LASTFOCUS" id="__LASTFOCUS" value="" />
          <select name="ctl00$PlaceHolderMain$ddlMowadaba" id="ctl00_PlaceHolderMain_ddlMowadaba">
            <option value="1" selected>السلوك والمواظبة</option>
            <option value="2">الغياب</option>
          </select>
          <input type="text" name="ctl00$PlaceHolderMain$txtDate" value="1447/09/15" />
        </form>
      </body></html>
    `;
    const state = extractFormState(sampleFormHtml);
    assertEqual(state['__VIEWSTATE'], 'abc123xyz', 'extracts __VIEWSTATE');
    assertEqual(state['__VIEWSTATEGENERATOR'], 'CAFE', 'extracts __VIEWSTATEGENERATOR');
    assertEqual(state['__EVENTVALIDATION'], 'ev123', 'extracts __EVENTVALIDATION');
    assertEqual(state['ctl00$PlaceHolderMain$ddlMowadaba'], '1', 'extracts select value');
    assertEqual(state['ctl00$PlaceHolderMain$txtDate'], '1447/09/15', 'extracts text input');

    // ─── Test: extractDropdownOptions ────────────
    results.innerHTML += '<h2>extractDropdownOptions</h2>';

    const opts = extractDropdownOptions(sampleFormHtml, 'ctl00$PlaceHolderMain$ddlMowadaba');
    assertEqual(opts.length, 2, 'finds 2 dropdown options');
    assertEqual(opts[0].value, '1', 'first option value');
    assertEqual(opts[1].text, 'الغياب', 'second option text');

    // ─── Test: parseStudentGrid ──────────────────
    results.innerHTML += '<h2>parseStudentGrid</h2>';

    const gridHtml = `
      <html><body>
        <form id="aspnetForm">
          <input type="hidden" name="__VIEWSTATE" value="x" />
          <table id="ctl00_PlaceHolderMain_gvClassStudentsAttendance">
            <tr><th>م</th><th>الاسم</th><th>الحالة</th><th>النوع</th></tr>
            <tr>
              <td>1</td>
              <td><span>محمد أحمد العلي</span></td>
              <td><input type="checkbox" name="ctl00$gv$ctl02$chk" /></td>
              <td><select name="ctl00$gv$ctl02$ddl"><option value="">--</option><option value="101">تأخر</option></select></td>
            </tr>
            <tr>
              <td>2</td>
              <td><span>فهد سعد الشمري</span></td>
              <td><input type="checkbox" name="ctl00$gv$ctl03$chk" checked /></td>
              <td><select name="ctl00$gv$ctl03$ddl"><option value="101" selected>تأخر</option></select></td>
            </tr>
            <tr>
              <td>3</td>
              <td><span>عبدالله خالد المطيري</span></td>
              <td><input type="checkbox" name="ctl00$gv$ctl04$chk" /></td>
              <td><select name="ctl00$gv$ctl04$ddl"><option value="">--</option></select></td>
            </tr>
          </table>
        </form>
      </body></html>
    `;
    const students = parseStudentGrid(gridHtml);
    assertEqual(students.size, 2, 'finds 2 students (skips 1 already-checked)');
    assert(students.has(normalizeArabic('محمد أحمد العلي')), 'has محمد أحمد العلي');
    assert(!students.has(normalizeArabic('فهد سعد الشمري')), 'skips checked فهد سعد الشمري');
    assert(students.has(normalizeArabic('عبدالله خالد المطيري')), 'has عبدالله خالد المطيري');

    const mohammad = students.get(normalizeArabic('محمد أحمد العلي'));
    assertEqual(mohammad.checkboxName, 'ctl00$gv$ctl02$chk', 'correct checkbox name');
    assertEqual(mohammad.dropdownName, 'ctl00$gv$ctl02$ddl', 'correct dropdown name');

    // ─── Test: findStudentByName ─────────────────
    results.innerHTML += '<h2>findStudentByName</h2>';

    const found1 = findStudentByName(students, 'محمد أحمد العلي');
    assert(found1 !== null, 'exact match found');
    const found2 = findStudentByName(students, 'محمد العلي');
    assert(found2 !== null, 'partial match found');
    const found3 = findStudentByName(students, 'زيد ناصر');
    assertEqual(found3, null, 'non-existent student returns null');

    // ─── Test: detectLoginPage ───────────────────
    results.innerHTML += '<h2>detectLoginPage</h2>';

    assert(detectLoginPage('<html><body>Login.aspx txtUserName</body></html>'), 'detects login page');
    assert(!detectLoginPage('<html><body>ManageAttendance.aspx</body></html>'), 'non-login page');

    // ─── Test: detectSaveSuccess ─────────────────
    results.innerHTML += '<h2>detectSaveSuccess</h2>';

    const success = detectSaveSuccess("<script>alert('تم الحفظ بنجاح')</script>");
    assertEqual(success.success, true, 'detects success alert');
    const error = detectSaveSuccess("<script>alert('خطأ في الحفظ')</script>");
    assertEqual(error.success, false, 'detects error alert');
    const unknown = detectSaveSuccess("<html><body>just a page</body></html>");
    assertEqual(unknown.unconfirmed, true, 'unconfirmed fallback');

    // ─── Test: resolveGradeValue ─────────────────
    results.innerHTML += '<h2>resolveGradeValue</h2>';

    assertEqual(resolveGradeValue('الأول المتوسط'), '7,1', 'resolves الأول المتوسط');
    assertEqual(resolveGradeValue('الثالث الابتدائي'), '3,1', 'resolves الثالث الابتدائي');
    assertEqual(resolveGradeValue('الثاني الثانوي'), '11,1', 'resolves الثاني الثانوي');
    assertEqual(resolveGradeValue('غير معروف'), null, 'unknown grade returns null');

    // ─── Test: groupRecords ──────────────────────
    results.innerHTML += '<h2>groupRecords</h2>';

    const records = [
      { _noorMode: { mowadaba: '1', deductType: '1' }, grade: 'الأول', _type: 'violation' },
      { _noorMode: { mowadaba: '1', deductType: '1' }, grade: 'الأول', _type: 'tardiness' },
      { _noorMode: { mowadaba: '1', deductType: '2' }, grade: 'الأول', _type: 'excellent' },
      { _noorMode: { mowadaba: '2', deductType: null }, grade: 'الثاني', _type: 'absence' },
    ];
    const groups = groupRecords(records);
    assertEqual(groups.length, 3, '4 records → 3 groups');
    assertEqual(groups[0].records.length, 2, 'group 1 has 2 records (violation + tardiness)');

    // ─── Test: buildPostBody ─────────────────────
    results.innerHTML += '<h2>buildPostBody</h2>';

    const body = buildPostBody(
      { '__VIEWSTATE': 'vs1', '__EVENTVALIDATION': 'ev1', 'ctl00$ddl': '1' },
      'ctl00$PlaceHolderMain$ddlMowadaba',
      { 'ctl00$PlaceHolderMain$ddlMowadaba': '2' }
    );
    assert(body.includes('__EVENTTARGET=ctl00%24PlaceHolderMain%24ddlMowadaba'), 'sets EVENTTARGET');
    assert(body.includes('__VIEWSTATE=vs1'), 'preserves VIEWSTATE');
    assert(body.includes('ctl00%24PlaceHolderMain%24ddlMowadaba=2'), 'applies override');

    // ─── Test: buildSaveBody ────────────────────
    results.innerHTML += '<h2>buildSaveBody</h2>';

    const prevState = { '__VIEWSTATE': 'bigstate', '__EVENTVALIDATION': 'ev', 'ctl00$ddl': '1' };
    const matchedStudents = [
      { checkboxName: 'ctl00$gv$ctl02$chk', dropdownName: 'ctl00$gv$ctl02$ddl', noorValue: '1601174' },
      { checkboxName: 'ctl00$gv$ctl04$chk', dropdownName: 'ctl00$gv$ctl04$ddl', noorValue: '1601248' }
    ];
    const saveBody = buildSaveBody(prevState, matchedStudents);
    assert(saveBody.includes('__VIEWSTATE=bigstate'), 'save preserves VIEWSTATE');
    assert(saveBody.includes('ctl00%24gv%24ctl02%24chk=on'), 'save sets checkbox 1');
    assert(saveBody.includes('ctl00%24gv%24ctl04%24chk=on'), 'save sets checkbox 2');
    assert(saveBody.includes('ctl00%24gv%24ctl02%24ddl=1601174'), 'save sets dropdown 1');
    assert(saveBody.includes('ctl00%24gv%24ctl04%24ddl=1601248'), 'save sets dropdown 2');
    assert(saveBody.includes('__EVENTTARGET=ctl00%24PlaceHolderMain%24ibtnSave'), 'save targets save button');

    // ─── Summary ─────────────────────────────────
    results.innerHTML += `<h2>Summary: ${passed} passed, ${failed} failed</h2>`;
    document.title = failed > 0 ? `FAIL (${failed})` : `PASS (${passed})`;
  </script>
</body>
</html>
```

- [ ] **Step 2: Open test file in Chrome and verify all tests pass**

Open `noor-extension-v7/tests/test-parser.html` directly in Chrome (double-click or `Ctrl+O`).
Expected: All tests show green ✓. Title shows "PASS (N)".

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add tests/test-parser.html && git commit -m "test: add browser-based parser unit tests — 25+ assertions"
```

---

## Task 4: Background Service Worker — background.js

**Files:**
- Create: `noor-extension-v7/background.js`

- [ ] **Step 1: Write background.js — HTTP proxy with error handling**

```javascript
// background.js — Service Worker for Noor Extension v7
// Role: HTTP proxy for cross-origin requests to the app server.
// Content scripts on noor.moe.gov.sa cannot directly call the app server,
// so all API calls route through here via chrome.runtime.sendMessage.
'use strict';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'api-request') return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

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
      error: isTimeout ? 'انتهت مهلة الطلب (30 ثانية)' : (err.message || 'خطأ في الاتصال')
    });
  });

  return true; // keep channel open for async response
});
```

- [ ] **Step 2: Reload extension and verify no errors**

Reload in `chrome://extensions/`. Check "Service Worker" link → "Inspect" → Console for errors.

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add background.js && git commit -m "feat: add service worker — HTTP proxy with 30s timeout and error handling"
```

---

## Task 5: App Client — app-client.js

**Files:**
- Create: `noor-extension-v7/app-client.js`

- [ ] **Step 1: Write app-client.js — JWT auth + API wrapper**

```javascript
// app-client.js — App server API client
// All HTTP calls route through background.js via chrome.runtime.sendMessage.
// Handles JWT authentication, pending records, and status updates.
'use strict';

const AppClient = {
  _serverUrl: '',
  _jwt: '',

  /**
   * Initialize from chrome.storage.local.
   * @returns {Promise<{loggedIn: boolean, user: Object|null}>}
   */
  async init() {
    const data = await chrome.storage.local.get(['serverUrl', 'jwt', 'user']);
    this._serverUrl = data.serverUrl || '';
    this._jwt = data.jwt || '';
    if (this._jwt && data.user) {
      return { loggedIn: true, user: data.user };
    }
    return { loggedIn: false, user: null };
  },

  /**
   * Login to app server.
   * @param {string} serverUrl
   * @param {string} mobile
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async login(serverUrl, mobile, password) {
    // Request permission for the server URL
    const origin = new URL(serverUrl).origin + '/*';
    try {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) return { success: false, error: 'لم يتم منح إذن الوصول للسيرفر' };
    } catch (e) {
      // permissions.request may fail in content scripts — try via popup only
    }

    const res = await this._apiCall(`${serverUrl}/api/auth/login`, 'POST', {
      mobile, password
    });

    if (!res.ok) {
      return { success: false, error: res.error || `خطأ ${res.status || ''}` };
    }

    const { token, user } = res.data?.data || res.data || {};
    if (!token) return { success: false, error: 'لم يتم استلام رمز الدخول' };

    // Role check: only Admin and Deputy
    const role = user?.role || '';
    if (!['Admin', 'Deputy'].includes(role)) {
      return { success: false, error: 'هذه الإضافة متاحة فقط للمدير والوكيل' };
    }

    this._serverUrl = serverUrl;
    this._jwt = token;

    await chrome.storage.local.set({
      serverUrl, jwt: token, user
    });

    return { success: true, user };
  },

  /**
   * Logout — clear stored credentials.
   */
  async logout() {
    this._jwt = '';
    this._serverUrl = '';
    await chrome.storage.local.remove(['jwt', 'user']);
  },

  /**
   * Fetch pending records from server.
   * @param {string} [filterMode='today']
   * @returns {Promise<{ok: boolean, records?: Array, error?: string}>}
   */
  async getPendingRecords(filterMode = 'today') {
    const res = await this._apiCall(
      `${this._serverUrl}/api/noor/pending-records?filterMode=${filterMode}`,
      'GET'
    );
    if (!res.ok) return { ok: false, error: this._handleError(res) };
    // Server returns { success, data } or direct array
    const records = res.data?.data || res.data || [];
    return { ok: true, records: Array.isArray(records) ? records : [] };
  },

  /**
   * Fetch Noor config from server.
   * @returns {Promise<{ok: boolean, config?: Object, error?: string}>}
   */
  async getConfig() {
    const res = await this._apiCall(
      `${this._serverUrl}/api/noor/config`,
      'GET'
    );
    if (!res.ok) return { ok: false, error: this._handleError(res) };
    return { ok: true, config: res.data?.data || res.data || {} };
  },

  /**
   * Update record statuses on server (incremental, per-group).
   * @param {Array<{id: number, type: string, status: string}>} updates
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async updateStatus(updates) {
    const res = await this._apiCall(
      `${this._serverUrl}/api/noor/update-status`,
      'POST',
      { updates }
    );
    if (!res.ok) return { ok: false, error: this._handleError(res) };
    return { ok: true };
  },

  /**
   * Version check — compare extension version against server minimum.
   * @param {Object} config - From getConfig()
   * @returns {{ok: boolean, message?: string}}
   */
  checkVersion(config) {
    const minVersion = config?.extensionMinVersion;
    if (!minVersion) return { ok: true };

    const current = chrome.runtime.getManifest().version;
    const cParts = current.split('.').map(Number);
    const mParts = minVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(cParts.length, mParts.length); i++) {
      const c = cParts[i] || 0;
      const m = mParts[i] || 0;
      if (c < m) return { ok: false, message: `يرجى تحديث الإضافة إلى الإصدار ${minVersion} أو أحدث` };
      if (c > m) return { ok: true };
    }
    return { ok: true };
  },

  // ─── Internal ───────────────────────────────────

  /**
   * Send API request through background.js proxy.
   */
  _apiCall(url, method, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (this._jwt) headers['Authorization'] = `Bearer ${this._jwt}`;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'api-request',
        url,
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { ok: false, error: 'لا يوجد رد' });
        }
      });
    });
  },

  /**
   * Map server errors to user-friendly messages.
   */
  _handleError(res) {
    if (res.status === 401) return 'انتهت صلاحية الجلسة — سجّل الدخول مرة أخرى';
    if (res.status === 403) return 'الاشتراك منتهي — تواصل مع الدعم';
    if (res.status >= 500) return 'خطأ في السيرفر — حاول لاحقاً';
    return res.error || 'خطأ غير معروف';
  }
};
```

- [ ] **Step 2: Reload extension and verify no errors**

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add app-client.js && git commit -m "feat: add app client — JWT auth, pending records, status updates via background proxy"
```

---

## Task 6: XHR Engine — noor-xhr.js

**Files:**
- Create: `noor-extension-v7/noor-xhr.js`

- [ ] **Step 1: Write noor-xhr.js — ViewState chain engine with retry logic**

```javascript
// noor-xhr.js — XHR ViewState chain engine for Noor
// Sends same-origin POST requests to Noor ASP.NET WebForms pages.
// Each request carries the full form state from the previous response.
'use strict';

const NoorXHR = {
  _aborted: false,

  /**
   * Abort the current chain.
   */
  abort() {
    this._aborted = true;
  },

  /**
   * Reset abort flag for a new run.
   */
  reset() {
    this._aborted = false;
  },

  /**
   * Send a POST request to a Noor page (same-origin, cookies included).
   * Returns both the HTML body AND the final URL (after any redirects).
   * @param {string} url
   * @param {string} body - URL-encoded form body
   * @returns {Promise<{html: string, url: string}>}
   */
  async post(url, body) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      credentials: 'same-origin'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { html: await response.text(), url: response.url };
  },

  /**
   * Send a GET request to a Noor page.
   * @param {string} url
   * @returns {Promise<{html: string, url: string}>}
   */
  async get(url) {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { html: await response.text(), url: response.url };
  },

  /**
   * POST with retry logic (exponential backoff).
   * @param {string} url
   * @param {string} body
   * @param {number} maxRetries
   * @returns {Promise<{html: string, url: string}>}
   */
  async postWithRetry(url, body, maxRetries = 3) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (this._aborted) throw new Error('ABORTED');
      try {
        return await this.post(url, body);
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  },

  /**
   * Execute the full 6-step XHR chain for a record group.
   * @param {Object} group - {mowadaba, deductType, grade, records}
   * @param {Object} options
   * @param {string} options.pageUrl - URL of the current Noor page
   * @param {string} options.manageAttendanceUrl - ManageAttendance URL (null for first group, set after)
   * @param {string} options.manageAttendanceBookmark - Bookmark __EVENTARGUMENT
   * @param {boolean} options.isFirstGroup - Whether this is the first group (needs bookmark navigation)
   * @param {Function} options.onStep - Progress callback: (stepNum, stepName) => void
   * @returns {Promise<{success: Array, failed: Array, manageAttendanceUrl: string}>}
   */
  async executeChain(group, options) {
    const { pageUrl, manageAttendanceUrl, manageAttendanceBookmark, isFirstGroup, onStep } = options;
    const results = { success: [], failed: [], manageAttendanceUrl: manageAttendanceUrl || '' };

    try {
      // ─── Step 0: Navigate to ManageAttendance ─────────
      onStep?.(0, 'الانتقال لصفحة التوثيق');

      let html, responseUrl;
      if (isFirstGroup) {
        // 0a: Read current page's form state directly from DOM
        const currentFormState = extractFormState(document.documentElement.outerHTML);

        // Validate: current page must have ViewState
        if (!currentFormState['__VIEWSTATE']) {
          throw new Error('الصفحة الحالية لا تحتوي على نموذج نور. انتقل للصفحة الرئيسية أولاً');
        }

        // 0b: POST to navigate via bookmark (__EVENTTARGET is empty for bookmark navigation)
        const navBody = buildPostBody(currentFormState, '', {
          '__EVENTARGUMENT': manageAttendanceBookmark
        });
        const navResult = await this.postWithRetry(pageUrl, navBody);
        html = navResult.html;
        responseUrl = navResult.url; // This is the ManageAttendance URL after redirect
        results.manageAttendanceUrl = responseUrl; // Save for subsequent groups
      } else {
        // Subsequent groups: fresh GET to ManageAttendance URL (not homepage!)
        const getResult = await this.get(manageAttendanceUrl);
        html = getResult.html;
        responseUrl = getResult.url;
      }

      // Check for login page
      if (detectLoginPage(html)) {
        throw new Error('SESSION_EXPIRED');
      }

      let formState = extractFormState(html);
      const manageUrl = responseUrl || manageAttendanceUrl || pageUrl;

      // ─── Step 1: Set mowadaba (behavior/attendance) ─────
      if (this._aborted) throw new Error('ABORTED');
      onStep?.(1, 'تحديد نوع المادة');

      const step1Body = buildPostBody(formState, NOOR_IDS.mowadaba, {
        [NOOR_IDS.mowadaba]: group.mowadaba
      });
      html = (await this.postWithRetry(manageUrl, step1Body)).html;
      if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');
      formState = extractFormState(html);

      // ─── Step 2: Set deductType or violation mode ───────
      if (this._aborted) throw new Error('ABORTED');
      onStep?.(2, 'تحديد نوع الخصم');

      if (group.mowadaba === '1' && group.deductType) {
        // Behavior: set deduction type (1=violation, 2=positive)
        const step2Body = buildPostBody(formState, NOOR_IDS.deductType, {
          [NOOR_IDS.deductType]: group.deductType
        });
        html = (await this.postWithRetry(manageUrl, step2Body)).html;
        if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');
        formState = extractFormState(html);
      } else if (group.mowadaba === '2') {
        // Attendance: set violation type to daily
        const step2Body = buildPostBody(formState, NOOR_IDS.violation, {
          [NOOR_IDS.violation]: '1'
        });
        html = (await this.postWithRetry(manageUrl, step2Body)).html;
        if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');
        formState = extractFormState(html);
      }

      // ─── Step 3: Set grade ──────────────────────────────
      if (this._aborted) throw new Error('ABORTED');
      onStep?.(3, 'تحديد الصف: ' + group.grade);

      const gradeValue = resolveGradeValue(group.grade);
      if (!gradeValue) {
        // Mark all records as failed
        group.records.forEach(r => results.failed.push({
          ...r, reason: 'لم يتم العثور على الصف في نور: ' + group.grade
        }));
        return results;
      }

      const step3Body = buildPostBody(formState, NOOR_IDS.grade, {
        [NOOR_IDS.grade]: gradeValue
      });
      html = (await this.postWithRetry(manageUrl, step3Body)).html;
      if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');
      formState = extractFormState(html);

      // ─── Step 4: Search for students ────────────────────
      if (this._aborted) throw new Error('ABORTED');
      onStep?.(4, 'البحث عن الطلاب');

      // Note: ddlSpecialty and ddlSystemStyudy are preserved automatically
      // because extractFormState captures all selects and they're included in every POST
      const step4Body = buildPostBody(formState, NOOR_IDS.btnSearch, {
        [NOOR_IDS.section]: 'الكل'  // Note: section ID needs live verification (Task 11)
      });
      html = (await this.postWithRetry(manageUrl, step4Body)).html;
      if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');
      formState = extractFormState(html);

      // Parse student grid
      const students = parseStudentGrid(html);
      if (students.size === 0) {
        group.records.forEach(r => results.failed.push({
          ...r, reason: 'لم يتم العثور على طلاب في الشبكة'
        }));
        return results;
      }

      // ─── Step 5: Match students and save ────────────────
      if (this._aborted) throw new Error('ABORTED');
      onStep?.(5, 'حفظ التوثيق');

      // Match records to grid students
      const matched = [];
      for (const record of group.records) {
        const student = findStudentByName(students, record.studentName);
        if (student) {
          matched.push({
            checkboxName: student.checkboxName,
            dropdownName: student.dropdownName,
            noorValue: record._noorValue,
            record
          });
        } else {
          results.failed.push({ ...record, reason: 'لم يُعثر على الطالب في الشبكة' });
        }
      }

      if (matched.length === 0) return results;

      // Build and send save request
      const saveBody = buildSaveBody(formState, matched);
      html = (await this.postWithRetry(manageUrl, saveBody)).html;
      if (detectLoginPage(html)) throw new Error('SESSION_EXPIRED');

      // Verify save result
      const saveResult = detectSaveSuccess(html);
      if (saveResult.success) {
        matched.forEach(m => results.success.push(m.record));
      } else if (saveResult.unconfirmed) {
        // Treat unconfirmed as success but log warning
        matched.forEach(m => results.success.push({ ...m.record, _unconfirmed: true }));
      } else {
        matched.forEach(m => results.failed.push({
          ...m.record, reason: saveResult.message
        }));
      }

    } catch (err) {
      if (err.message === 'ABORTED') throw err;
      if (err.message === 'SESSION_EXPIRED') throw err;

      // Network or parsing error — mark remaining as failed
      group.records.forEach(r => {
        if (!results.success.find(s => s.id === r.id) && !results.failed.find(f => f.id === r.id)) {
          results.failed.push({ ...r, reason: err.message });
        }
      });
    }

    return results;
  }
};
```

- [ ] **Step 2: Reload extension and verify no errors**

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add noor-xhr.js && git commit -m "feat: add XHR engine — 6-step ViewState chain with retry and session detection"
```

---

## Task 7: Side Panel UI — ui.css + ui.js

**Files:**
- Create: `noor-extension-v7/ui.css`
- Create: `noor-extension-v7/ui.js`

- [ ] **Step 1: Write ui.css — RTL side panel styles**

```css
/* ui.css — Side panel styles for Noor extension v7 */

#noor-ext-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: #fff;
  border-left: 3px solid #009688;
  box-shadow: -4px 0 16px rgba(0,0,0,0.15);
  z-index: 999999;
  font-family: 'Segoe UI', Tahoma, sans-serif;
  direction: rtl;
  text-align: right;
  overflow-y: auto;
  transition: transform 0.3s ease;
  font-size: 14px;
  color: #333;
}

#noor-ext-panel.collapsed {
  transform: translateX(320px);
}

/* Toggle button */
#noor-ext-toggle {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 36px;
  height: 80px;
  background: #009688;
  color: #fff;
  border: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  z-index: 999999;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  writing-mode: vertical-rl;
  box-shadow: -2px 0 8px rgba(0,0,0,0.2);
  transition: right 0.3s ease;
}

#noor-ext-toggle.panel-open {
  right: 320px;
}

/* Header */
.nep-header {
  background: #009688;
  color: #fff;
  padding: 16px;
  text-align: center;
}

.nep-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
}

.nep-header .nep-user-info {
  font-size: 12px;
  opacity: 0.9;
}

/* Content area */
.nep-content {
  padding: 16px;
}

/* Login prompt */
.nep-login-prompt {
  text-align: center;
  padding: 40px 16px;
  color: #666;
}

.nep-login-prompt p {
  margin: 12px 0;
  font-size: 15px;
}

/* Record counts */
.nep-records-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.nep-records-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.nep-records-table td:last-child {
  text-align: left;
  font-weight: bold;
  color: #009688;
}

/* Buttons */
.nep-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 15px;
  font-family: inherit;
  margin: 8px 0;
  transition: background 0.2s, opacity 0.2s;
}

.nep-btn-primary {
  background: #009688;
  color: #fff;
}

.nep-btn-primary:hover {
  background: #00796B;
}

.nep-btn-primary:disabled {
  background: #bbb;
  cursor: not-allowed;
}

.nep-btn-danger {
  background: #f44336;
  color: #fff;
}

.nep-btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.nep-btn-secondary:hover {
  background: #ccc;
}

/* Progress */
.nep-progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin: 12px 0;
}

.nep-progress-fill {
  height: 100%;
  background: #009688;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.nep-progress-text {
  text-align: center;
  font-size: 13px;
  color: #666;
  margin: 4px 0;
}

/* Group progress list */
.nep-group-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}

.nep-group-item {
  padding: 8px 12px;
  border-right: 3px solid #e0e0e0;
  margin: 4px 0;
  font-size: 13px;
  transition: border-color 0.3s;
}

.nep-group-item.done {
  border-color: #4CAF50;
  color: #4CAF50;
}

.nep-group-item.active {
  border-color: #009688;
  color: #009688;
  font-weight: bold;
}

.nep-group-item.failed {
  border-color: #f44336;
  color: #f44336;
}

/* Results */
.nep-result-summary {
  text-align: center;
  padding: 16px;
  margin: 12px 0;
  border-radius: 8px;
}

.nep-result-summary.success {
  background: #E8F5E9;
  color: #2E7D32;
}

.nep-result-summary.partial {
  background: #FFF3E0;
  color: #E65100;
}

.nep-result-summary.error {
  background: #FFEBEE;
  color: #C62828;
}

.nep-failed-list {
  margin: 8px 0;
  font-size: 12px;
  color: #c62828;
}

.nep-failed-list dt {
  font-weight: bold;
  margin-top: 8px;
}

.nep-failed-list dd {
  margin: 2px 0 2px 16px;
}

/* Logout link */
.nep-logout {
  display: block;
  text-align: center;
  padding: 8px;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
```

- [ ] **Step 2: Write ui.js — Side panel DOM builder with 4 states**

```javascript
// ui.js — Side panel UI for Noor extension v7
// Builds and manages the side panel injected into Noor pages.
// 4 states: not-logged-in, main, in-progress, complete.
'use strict';

const NoorUI = {
  _panel: null,
  _toggle: null,
  _contentEl: null,
  _callbacks: {},

  /**
   * Inject the side panel into the Noor page.
   * @param {Object} callbacks - { onFetch, onStart, onStop, onRetry, onLogout }
   */
  inject(callbacks) {
    this._callbacks = callbacks;

    // Toggle button
    this._toggle = document.createElement('button');
    this._toggle.id = 'noor-ext-toggle';
    this._toggle.textContent = 'شؤون الطلاب';
    this._toggle.addEventListener('click', () => this.togglePanel());
    document.body.appendChild(this._toggle);

    // Panel
    this._panel = document.createElement('div');
    this._panel.id = 'noor-ext-panel';
    this._contentEl = document.createElement('div');
    this._panel.appendChild(this._contentEl);
    document.body.appendChild(this._panel);

    // Start collapsed
    this._panel.classList.add('collapsed');
  },

  togglePanel() {
    const isCollapsed = this._panel.classList.toggle('collapsed');
    this._toggle.classList.toggle('panel-open', !isCollapsed);
  },

  openPanel() {
    this._panel.classList.remove('collapsed');
    this._toggle.classList.add('panel-open');
  },

  // ─── State 1: Not Logged In ──────────────────────

  showNotLoggedIn() {
    this._contentEl.innerHTML = `
      <div class="nep-header">
        <h3>نظام شؤون الطلاب</h3>
      </div>
      <div class="nep-login-prompt">
        <p>🔑</p>
        <p>سجّل الدخول من أيقونة الإضافة أولاً</p>
        <p style="font-size:12px; color:#999;">اضغط على أيقونة الإضافة في شريط الأدوات</p>
      </div>
    `;
  },

  // ─── State 2: Main Screen ────────────────────────

  showMain(user, records, groups) {
    const typeLabels = {
      violation: 'مخالفات سلوكية',
      tardiness: 'تأخر صباحي',
      absence: 'غياب يومي',
      excellent: 'سلوك متميز',
      compensation: 'فرص تعويضية'
    };

    // Count records by type
    const counts = {};
    (records || []).forEach(r => {
      const t = r._type || 'other';
      counts[t] = (counts[t] || 0) + 1;
    });

    const totalRecords = records?.length || 0;
    const groupCount = groups?.length || 0;

    let recordRows = '';
    for (const [type, label] of Object.entries(typeLabels)) {
      if (counts[type]) {
        recordRows += `<tr><td>${label}</td><td>${counts[type]}</td></tr>`;
      }
    }

    this._contentEl.innerHTML = `
      <div class="nep-header">
        <h3>نظام شؤون الطلاب</h3>
        <div class="nep-user-info">${user.name || ''} — ${user.role || ''}</div>
      </div>
      <div class="nep-content">
        ${totalRecords > 0 ? `
          <table class="nep-records-table">
            ${recordRows}
            <tr style="border-top:2px solid #009688;">
              <td><strong>المجموع</strong></td>
              <td><strong>${totalRecords}</strong></td>
            </tr>
          </table>
          <p style="font-size:12px; color:#888; text-align:center;">
            ${groupCount} مجموعة (${groupCount} سلسلة طلبات)
          </p>
        ` : `
          <p style="text-align:center; padding:20px; color:#888;">
            لا توجد سجلات معلّقة
          </p>
        `}
        <button class="nep-btn nep-btn-secondary" id="nep-btn-fetch">تحديث السجلات</button>
        <button class="nep-btn nep-btn-primary" id="nep-btn-start" ${totalRecords === 0 ? 'disabled' : ''}>
          بدء التوثيق
        </button>
        <span class="nep-logout" id="nep-btn-logout">تسجيل الخروج</span>
      </div>
    `;

    document.getElementById('nep-btn-fetch')?.addEventListener('click', () => this._callbacks.onFetch?.());
    document.getElementById('nep-btn-start')?.addEventListener('click', () => this._callbacks.onStart?.());
    document.getElementById('nep-btn-logout')?.addEventListener('click', () => this._callbacks.onLogout?.());
  },

  // ─── State 3: Documentation In Progress ──────────

  showProgress(groups, currentGroupIndex, currentStep, overallDone, overallTotal) {
    const pct = overallTotal > 0 ? Math.round((overallDone / overallTotal) * 100) : 0;

    let groupItems = '';
    groups.forEach((g, i) => {
      let status = 'pending';
      let icon = '○';
      let detail = '';

      if (i < currentGroupIndex) {
        status = g._failed ? 'failed' : 'done';
        icon = g._failed ? '✗' : '✓';
        detail = ` (${g.records.length})`;
      } else if (i === currentGroupIndex) {
        status = 'active';
        icon = '⏳';
        detail = ` — ${currentStep || '...'}`;
      }

      const typeLabel = g.mowadaba === '2' ? 'غياب' : (g.deductType === '2' ? 'سلوك+' : 'مخالفات');
      groupItems += `<li class="nep-group-item ${status}">${icon} ${typeLabel} — ${g.grade} ${detail}</li>`;
    });

    this._contentEl.innerHTML = `
      <div class="nep-header">
        <h3>جارٍ التوثيق...</h3>
      </div>
      <div class="nep-content">
        <div class="nep-progress-bar">
          <div class="nep-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="nep-progress-text">${overallDone} / ${overallTotal} (${pct}%)</div>
        <ul class="nep-group-list">${groupItems}</ul>
        <button class="nep-btn nep-btn-danger" id="nep-btn-stop">إيقاف</button>
      </div>
    `;

    document.getElementById('nep-btn-stop')?.addEventListener('click', () => this._callbacks.onStop?.());
  },

  // ─── State 4: Documentation Complete ─────────────

  showComplete(successCount, failedCount, failedRecords) {
    const total = successCount + failedCount;
    const allSuccess = failedCount === 0;
    const summaryClass = allSuccess ? 'success' : (successCount > 0 ? 'partial' : 'error');

    let failedHtml = '';
    if (failedRecords && failedRecords.length > 0) {
      // Group failed by grade
      const byGrade = {};
      failedRecords.forEach(r => {
        const g = r.grade || 'غير محدد';
        if (!byGrade[g]) byGrade[g] = [];
        byGrade[g].push(r);
      });

      failedHtml = '<dl class="nep-failed-list">';
      for (const [grade, records] of Object.entries(byGrade)) {
        failedHtml += `<dt>${grade}:</dt>`;
        records.forEach(r => {
          failedHtml += `<dd>• ${r.studentName || 'غير معروف'} — ${r.reason || ''}</dd>`;
        });
      }
      failedHtml += '</dl>';
    }

    this._contentEl.innerHTML = `
      <div class="nep-header">
        <h3>اكتمل التوثيق</h3>
      </div>
      <div class="nep-content">
        <div class="nep-result-summary ${summaryClass}">
          <div style="font-size:28px; margin-bottom:8px;">${allSuccess ? '✓' : '⚠'}</div>
          <div>نجح: <strong>${successCount}</strong> — فشل: <strong>${failedCount}</strong></div>
          <div style="font-size:12px; margin-top:4px;">من أصل ${total} سجل</div>
        </div>
        ${failedHtml}
        ${failedCount > 0 ? '<button class="nep-btn nep-btn-primary" id="nep-btn-retry">إعادة المحاولة للفاشلين</button>' : ''}
        <button class="nep-btn nep-btn-secondary" id="nep-btn-back">رجوع</button>
      </div>
    `;

    document.getElementById('nep-btn-retry')?.addEventListener('click', () => this._callbacks.onRetry?.());
    document.getElementById('nep-btn-back')?.addEventListener('click', () => this._callbacks.onFetch?.());
  },

  /**
   * Show an error message in the panel.
   */
  showError(message) {
    this._contentEl.innerHTML = `
      <div class="nep-header">
        <h3>نظام شؤون الطلاب</h3>
      </div>
      <div class="nep-content">
        <div class="nep-result-summary error">
          <div style="font-size:28px; margin-bottom:8px;">✗</div>
          <div>${message}</div>
        </div>
        <button class="nep-btn nep-btn-secondary" id="nep-btn-back">رجوع</button>
      </div>
    `;
    document.getElementById('nep-btn-back')?.addEventListener('click', () => this._callbacks.onFetch?.());
  }
};
```

- [ ] **Step 3: Reload extension, navigate to any Noor page, verify panel appears**

Expected: A teal toggle button on the right side of the page.

- [ ] **Step 4: Commit**

```bash
cd "$EXT" && git add ui.css ui.js && git commit -m "feat: add side panel UI — 4 states, RTL, teal theme, progress tracking"
```

---

## Task 8: Login Popup — popup.html + popup.js + popup.css

**Files:**
- Create: `noor-extension-v7/popup.html`
- Create: `noor-extension-v7/popup.js`
- Create: `noor-extension-v7/popup.css`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <h2>نظام شؤون الطلاب</h2>
    <p class="subtitle">ربط نور — الإصدار 7.0</p>

    <!-- Login Form -->
    <div id="login-form">
      <div class="field">
        <label>عنوان السيرفر</label>
        <input type="url" id="server-url" placeholder="https://example.com" dir="ltr">
      </div>
      <div class="field">
        <label>رقم الجوال</label>
        <input type="tel" id="mobile" placeholder="05xxxxxxxx" dir="ltr">
      </div>
      <div class="field">
        <label>كلمة المرور</label>
        <input type="password" id="password">
      </div>
      <button id="btn-login" class="btn-primary">تسجيل الدخول</button>
      <div id="error-msg" class="error-msg"></div>
    </div>

    <!-- Logged In Info -->
    <div id="user-info" style="display:none;">
      <div class="info-card">
        <div class="info-label">المستخدم</div>
        <div id="user-name" class="info-value"></div>
        <div class="info-label">الصلاحية</div>
        <div id="user-role" class="info-value"></div>
      </div>
      <p class="hint">افتح نظام نور لبدء التوثيق</p>
      <button id="btn-logout" class="btn-secondary">تسجيل الخروج</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 300px;
  font-family: 'Segoe UI', Tahoma, sans-serif;
  background: #fafafa;
  color: #333;
}

.popup-container {
  padding: 20px;
}

h2 {
  color: #009688;
  text-align: center;
  margin-bottom: 4px;
  font-size: 18px;
}

.subtitle {
  text-align: center;
  color: #999;
  font-size: 12px;
  margin-bottom: 16px;
}

.field {
  margin-bottom: 12px;
}

.field label {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: #555;
}

.field input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.field input:focus {
  outline: none;
  border-color: #009688;
}

.btn-primary {
  width: 100%;
  padding: 10px;
  background: #009688;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  margin-top: 4px;
}

.btn-primary:hover { background: #00796B; }
.btn-primary:disabled { background: #bbb; cursor: wait; }

.btn-secondary {
  width: 100%;
  padding: 8px;
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

.error-msg {
  color: #c62828;
  font-size: 13px;
  text-align: center;
  margin-top: 8px;
  min-height: 20px;
}

.info-card {
  background: #E0F2F1;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.info-label {
  font-size: 11px;
  color: #888;
  margin-top: 6px;
}

.info-label:first-child { margin-top: 0; }

.info-value {
  font-size: 15px;
  font-weight: bold;
  color: #009688;
}

.hint {
  text-align: center;
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
}
```

- [ ] **Step 3: Write popup.js**

```javascript
// popup.js — Login popup logic
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');
  const userInfo = document.getElementById('user-info');
  const errorMsg = document.getElementById('error-msg');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const serverUrlInput = document.getElementById('server-url');
  const mobileInput = document.getElementById('mobile');
  const passwordInput = document.getElementById('password');

  // Check if already logged in
  const data = await chrome.storage.local.get(['jwt', 'user', 'serverUrl']);
  if (data.jwt && data.user) {
    showUserInfo(data.user);
  } else {
    // Restore server URL if saved
    if (data.serverUrl) serverUrlInput.value = data.serverUrl;
  }

  // Login
  btnLogin.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/+$/, '');
    const mobile = mobileInput.value.trim();
    const password = passwordInput.value;

    if (!serverUrl || !mobile || !password) {
      errorMsg.textContent = 'جميع الحقول مطلوبة';
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'جارٍ الدخول...';
    errorMsg.textContent = '';

    try {
      // Request host permission for the server
      const origin = new URL(serverUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        errorMsg.textContent = 'لم يتم منح إذن الوصول';
        return;
      }

      // Call login API via background proxy
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'api-request',
          url: `${serverUrl}/api/auth/login`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile, password })
        }, resolve);
      });

      if (!response?.ok) {
        errorMsg.textContent = response?.error || 'فشل الاتصال';
        return;
      }

      const result = response.data;
      const token = result?.data?.token || result?.token;
      const user = result?.data?.user || result?.user;

      if (!token) {
        errorMsg.textContent = 'لم يتم استلام رمز الدخول';
        return;
      }

      // Role check
      if (!['Admin', 'Deputy'].includes(user?.role)) {
        errorMsg.textContent = 'هذه الإضافة متاحة فقط للمدير والوكيل';
        return;
      }

      // Save credentials
      await chrome.storage.local.set({ serverUrl, jwt: token, user });
      showUserInfo(user);

    } catch (e) {
      errorMsg.textContent = e.message || 'خطأ في الاتصال';
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'تسجيل الدخول';
    }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    await chrome.storage.local.remove(['jwt', 'user']);
    loginForm.style.display = '';
    userInfo.style.display = 'none';
  });

  function showUserInfo(user) {
    loginForm.style.display = 'none';
    userInfo.style.display = '';
    document.getElementById('user-name').textContent = user.name || '';
    document.getElementById('user-role').textContent =
      user.role === 'Admin' ? 'مدير' : user.role === 'Deputy' ? 'وكيل' : user.role;
  }
});
```

- [ ] **Step 4: Reload extension, click toolbar icon, verify popup appears with login form**

- [ ] **Step 5: Commit**

```bash
cd "$EXT" && git add popup.html popup.js popup.css && git commit -m "feat: add login popup — server URL, credentials, role validation"
```

---

## Task 9: Content Script Orchestrator — noor-content.js

**Files:**
- Create: `noor-extension-v7/noor-content.js`

This is the main entry point that ties everything together.

- [ ] **Step 1: Write noor-content.js — orchestrator with record grouping and flow control**

```javascript
// noor-content.js — Entry point for Noor extension v7
// Injected on noor.moe.gov.sa. Orchestrates: auth check → fetch records → group → XHR chains → update status.
'use strict';

(async function main() {
  // ─── State ──────────────────────────────────────
  let isRunning = false;
  let currentRecords = [];
  let currentGroups = [];
  let failedRecords = [];

  // ─── Initialize ─────────────────────────────────
  const { loggedIn, user } = await AppClient.init();

  // Inject side panel UI
  NoorUI.inject({
    onFetch: fetchRecords,
    onStart: startDocumentation,
    onStop: stopDocumentation,
    onRetry: retryFailed,
    onLogout: logout
  });

  // Show initial state
  if (loggedIn) {
    NoorUI.openPanel();
    await fetchRecords();
  } else {
    NoorUI.showNotLoggedIn();
  }

  // Listen for storage changes (login from popup)
  chrome.storage.onChanged.addListener(async (changes) => {
    if (changes.jwt) {
      const { loggedIn: nowLoggedIn, user: nowUser } = await AppClient.init();
      if (nowLoggedIn) {
        NoorUI.openPanel();
        await fetchRecords();
      } else {
        NoorUI.showNotLoggedIn();
      }
    }
  });

  // ─── Fetch Records ──────────────────────────────

  async function fetchRecords() {
    if (isRunning) return;

    // Show loading
    NoorUI.showMain(user || {}, [], []);

    // Version check
    const configResult = await AppClient.getConfig();
    if (configResult.ok) {
      const versionCheck = AppClient.checkVersion(configResult.config);
      if (!versionCheck.ok) {
        NoorUI.showError(versionCheck.message);
        return;
      }
    }

    // Fetch pending records
    const result = await AppClient.getPendingRecords();
    if (!result.ok) {
      NoorUI.showError(result.error);
      return;
    }

    currentRecords = result.records;
    currentGroups = groupRecords(currentRecords);
    failedRecords = [];

    NoorUI.showMain(user || {}, currentRecords, currentGroups);
  }

  // ─── Start Documentation ────────────────────────

  async function startDocumentation() {
    if (isRunning || currentGroups.length === 0) return;

    isRunning = true;
    NoorXHR.reset();

    const allSuccess = [];
    const allFailed = [];
    const totalRecords = currentRecords.length;
    let doneRecords = 0;

    // Get config for bookmark
    const configResult = await AppClient.getConfig();
    const bookmark = configResult.config?.manageAttendanceBookmark || '';
    const pageUrl = window.location.href.split('?')[0];
    let manageAttendanceUrl = null; // Tracked across groups — set after first group navigates

    try {
      for (let i = 0; i < currentGroups.length; i++) {
        if (!isRunning) break;

        const group = currentGroups[i];

        // Update UI progress
        NoorUI.showProgress(currentGroups, i, null, doneRecords, totalRecords);

        // Execute XHR chain for this group
        const result = await NoorXHR.executeChain(group, {
          pageUrl,
          manageAttendanceUrl,
          manageAttendanceBookmark: bookmark,
          isFirstGroup: i === 0,
          onStep: (stepNum, stepName) => {
            NoorUI.showProgress(currentGroups, i, stepName, doneRecords, totalRecords);
          }
        });

        allSuccess.push(...result.success);
        allFailed.push(...result.failed);
        doneRecords += group.records.length;

        // Track ManageAttendance URL from first group for subsequent groups
        if (result.manageAttendanceUrl) {
          manageAttendanceUrl = result.manageAttendanceUrl;
        }

        // Mark group status for UI
        group._failed = result.failed.length > 0 && result.success.length === 0;

        // Incremental status update to server
        const updates = [];
        result.success.forEach(r => updates.push({ id: r.id, type: r._type, status: 'تم' }));
        result.failed.forEach(r => updates.push({ id: r.id, type: r._type, status: 'failed' }));

        if (updates.length > 0) {
          await AppClient.updateStatus(updates);
        }
      }
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        NoorUI.showError('انتهت جلسة نور. سجّل دخولك في نور ثم حاول مرة أخرى');
        isRunning = false;
        return;
      }
      if (err.message !== 'ABORTED') {
        NoorUI.showError('خطأ: ' + err.message);
        isRunning = false;
        return;
      }
    }

    isRunning = false;
    failedRecords = allFailed;

    NoorUI.showComplete(allSuccess.length, allFailed.length, allFailed);
  }

  // ─── Stop ───────────────────────────────────────

  function stopDocumentation() {
    isRunning = false;
    NoorXHR.abort();
  }

  // ─── Retry Failed ───────────────────────────────

  async function retryFailed() {
    if (failedRecords.length === 0) return;

    // Re-group only the failed records and re-run
    currentRecords = failedRecords.map(r => {
      const clean = { ...r };
      delete clean.reason;
      return clean;
    });
    currentGroups = groupRecords(currentRecords);
    failedRecords = [];

    await startDocumentation();
  }

  // ─── Logout ─────────────────────────────────────

  async function logout() {
    if (isRunning) return;
    await AppClient.logout();
    NoorUI.showNotLoggedIn();
  }

})();
```

- [ ] **Step 2: Reload extension, navigate to Noor, verify side panel appears**

Expected: If not logged in → "سجّل الدخول من أيقونة الإضافة أولاً". If logged in → shows record counts.

- [ ] **Step 3: Commit**

```bash
cd "$EXT" && git add noor-content.js && git commit -m "feat: add content script orchestrator — record grouping, XHR chain flow, incremental status updates"
```

---

## Task 10: Server Config Endpoint

**Files:**
- Modify: `src/API/Controllers/NoorController.cs`

- [ ] **Step 1: Add GET /api/noor/config endpoint to NoorController**

Add this method to the NoorController class (after the existing `GetMappings` method):

```csharp
/// <summary>
/// Returns Noor page navigation and form configuration for the extension.
/// </summary>
[HttpGet("config")]
public IActionResult GetConfig()
{
    return Ok(new
    {
        success = true,
        data = new
        {
            // Bookmark __EVENTARGUMENT to navigate from Noor homepage to ManageAttendance page.
            // This value is Noor-version-specific and may need updating.
            manageAttendanceBookmark = "Bookmark_Manage_Attendance",

            // Grade map — Phase 1: empty (extension uses built-in GRADE_MAP).
            // Phase 2: populated via calibration flow.
            gradeMap = new Dictionary<string, string>(),

            // Default section filter
            defaultSection = "الكل",

            // Minimum extension version required
            extensionMinVersion = "7.0.0"
        }
    });
}
```

- [ ] **Step 2: Verify the endpoint works**

```bash
cd "d:/SchoolBehaviorSystem/school-behavior-system-23-main/school-behavior-system-23-main"
dotnet build src/API/API.csproj
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd "d:/SchoolBehaviorSystem/school-behavior-system-23-main/school-behavior-system-23-main"
git add src/API/Controllers/NoorController.cs
git commit -m "feat: add GET /api/noor/config endpoint for extension v7"
```

---

## Task 11: Integration Verification

**Files:** None (manual testing)

- [ ] **Step 1: Load extension in Chrome**

1. Go to `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked" → select `noor-extension-v7/` folder
4. Verify: No errors, extension loads successfully

- [ ] **Step 2: Test popup login**

1. Click extension icon in toolbar
2. Enter server URL, mobile, password
3. Click login
4. Verify: User info appears, JWT saved

- [ ] **Step 3: Test side panel on Noor**

1. Navigate to `noor.moe.gov.sa`
2. Log in to Noor
3. Verify: Side panel toggle button appears on right side
4. Click toggle → panel opens
5. Verify: Shows user info and record counts (or "no records" if none pending)

- [ ] **Step 4: Test documentation flow (with real pending records)**

1. Create test records in the app (violations for known students)
2. Click "تحديث السجلات" in the side panel
3. Verify: Records appear with counts
4. Click "بدء التوثيق"
5. Verify: Progress updates per group, each step shows status
6. Verify: Completion screen shows success/failure counts

- [ ] **Step 5: Test error scenarios**

1. Test with expired Noor session → should show "انتهت جلسة نور"
2. Test with wrong server URL → should show connection error
3. Test "إيقاف" button → should stop mid-chain
4. Test "إعادة المحاولة" → should retry only failed records

- [ ] **Step 6: Final commit with any fixes**

```bash
cd "$EXT" && git add -A && git commit -m "fix: integration testing fixes"
```

---

## Build Sequence Summary

```
Task  1 → manifest.json + scaffold    (no dependencies)
Task  2 → noor-parser.js              (no dependencies)
Task  3 → test-parser.html            (depends on Task 2)
Task  4 → background.js               (no dependencies)
Task  5 → app-client.js               (uses background.js pattern)
Task  6 → noor-xhr.js                 (uses noor-parser.js functions)
Task  7 → ui.css + ui.js              (no dependencies)
Task  8 → popup.html/js/css           (uses background.js for login)
Task  9 → noor-content.js             (uses all above)
Task 10 → NoorController config       (server-side, independent)
Task 11 → Integration test            (depends on all above)
```

**Parallelizable:** Tasks 1-2, 4, 7, 10 can be done in parallel. Task 3 needs 2. Tasks 5-6 need 2+4. Task 8 needs 4. Task 9 needs everything. Task 11 needs everything.
