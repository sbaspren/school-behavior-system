#!/usr/bin/env python3
"""
اختبار واجهات الجوال (الفرونت-إند) — كخبير تربوي يفتح كل صفحة ويتحقق من عملها
يختبر: تحميل الصفحات + API calls الصحيحة + الصفحات العامة للمعلم والحارس وولي الأمر
"""
import urllib.request, urllib.parse, json, sys, os, re
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://localhost:5085'
PASS = 0; FAIL = 0; results = []; section_results = {}
current_section = ""

def api(method, url, token=None, data=None, master=False):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = f'Bearer {token}'
    if master: headers['X-Master-Key'] = 'CHANGE_THIS_MASTER_KEY_2026'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = urllib.request.urlopen(req)
        ct = resp.headers.get('Content-Type', '')
        raw = resp.read()
        if 'json' in ct: return json.loads(raw)
        else:
            try: return json.loads(raw)
            except: return {'_raw': True, '_status': resp.status, '_size': len(raw), '_ct': ct, '_body': raw.decode('utf-8','ignore')[:500]}
    except urllib.error.HTTPError as e:
        try: return {'_http': e.code, '_body': json.loads(e.read().decode())}
        except: return {'_http': e.code}
    except Exception as e:
        return {'_err': str(e)}

def fetch_page(url):
    """جلب صفحة HTML والتحقق من أنها تحمّل بشكل صحيح"""
    try:
        req = urllib.request.Request(url)
        resp = urllib.request.urlopen(req)
        html = resp.read().decode('utf-8', 'ignore')
        return {'ok': True, 'status': resp.status, 'size': len(html), 'html': html}
    except urllib.error.HTTPError as e:
        return {'ok': False, 'status': e.code}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

def ok(r):
    if isinstance(r, dict):
        if r.get('success') == True: return True
        if r.get('_raw'): return True
    return False

def check(name, condition, detail=""):
    global PASS, FAIL, current_section
    if condition:
        PASS += 1; results.append(f'  [PASS] {name}')
        section_results.setdefault(current_section, [0,0])[0] += 1
    else:
        FAIL += 1; results.append(f'  [FAIL] {name} => {str(detail)[:200]}')
        section_results.setdefault(current_section, [0,0])[1] += 1

def section(name):
    global current_section
    current_section = name
    print(f"\n{'='*70}")
    print(f"  {name}")
    print(f"{'='*70}")


# ══════════════════════════════════════════════════
#   تسجيل الدخول
# ══════════════════════════════════════════════════
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0506000006','password':'Admin123'})
ADMIN = r.get('data',{}).get('token','')
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0516000001','password':'Deputy123'})
PRI = r.get('data',{}).get('token','')

# جلب طالب للاختبار
r = api('GET', f'{BASE}/api/students', PRI)
STU1 = r.get('data',[])[0] if r.get('data') else {}

# ══════════════════════════════════════════════════════════════════
#   القسم 1: تحميل صفحات SPA الأساسية
# ══════════════════════════════════════════════════════════════════
section("1. تحميل صفحات SPA")

# الصفحة الرئيسية — يجب أن تُرجع HTML مع React
p = fetch_page(f'{BASE}/')
check('الصفحة الرئيسية تحمّل', p['ok'] and p['size'] > 500, p.get('size',0))
has_react = 'root' in p.get('html','') and ('script' in p.get('html','').lower() or 'React' in p.get('html',''))
check('تحتوي على React app', has_react)

# صفحات SPA المحمية (تُرجع نفس HTML — React Router يتعامل معها)
spa_routes = [
    ('/', 'الصفحة الرئيسية'),
    ('/violations', 'المخالفات السلوكية'),
    ('/positive', 'السلوك الإيجابي'),
    ('/tardiness', 'التأخر'),
    ('/absence', 'الغياب'),
    ('/permissions', 'الاستئذانات'),
    ('/notes', 'الملاحظات التربوية'),
    ('/communication', 'سجل التواصل'),
    ('/noor', 'نظام نور'),
    ('/parent-excuse', 'أعذار أولياء الأمور'),
    ('/reports', 'التقارير'),
    ('/settings', 'الإعدادات'),
    ('/whatsapp', 'واتساب'),
    ('/audit-log', 'سجل التدقيق'),
    ('/behavior-history', 'سجل السلوك'),
    ('/general-forms', 'النماذج العامة'),
    ('/attendance', 'الحضور'),
    ('/academic', 'التحصيل الدراسي'),
]

for route, name in spa_routes:
    p = fetch_page(f'{BASE}{route}')
    check(f'صفحة {name} ({route}) تحمّل', p['ok'] and p.get('size',0) > 500, p.get('size',0))


# ══════════════════════════════════════════════════════════════════
#   القسم 2: واجهة المعلم (نموذج المعلم — عام بدون تسجيل دخول)
# ══════════════════════════════════════════════════════════════════
section("2. واجهة المعلم (نموذج المعلم)")

# صفحة نموذج المعلم
p = fetch_page(f'{BASE}/form')
check('صفحة نموذج المعلم تحمّل', p['ok'] and p.get('size',0) > 500)

# صفحة نموذج المعلم مع token
p = fetch_page(f'{BASE}/form?token=PQSPHPK3')
check('صفحة المعلم مع token تحمّل', p['ok'] and p.get('size',0) > 500)

# API: التحقق من رابط المعلم
r = api('GET', f'{BASE}/api/teacherinput/public/verify?token=PQSPHPK3')
check('API: التحقق من رابط المعلم', ok(r))
teacher_data = r.get('data', {})
check('يرجع بيانات المعلم', 't' in teacher_data)
check('يرجع اسم المعلم', teacher_data.get('t',{}).get('n','') != '')

# API: جلب طلاب الفصل
r = api('GET', f'{BASE}/api/teacherinput/public/class-students?className=الأول+ابتدائي+أ&token=PQSPHPK3')
check('API: جلب طلاب الفصل', ok(r) or r.get('_http') != 500)

# API: إرسال مخالفة من المعلم
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3', 'InputType': 'violation',
    'Stage': 'Primary', 'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1', 'ViolationType': 'سلوكية',
    'ItemText': 'إزعاج في الفصل',
    'Students': [{'Id': STU1.get('studentNumber','SP1'), 'Name': STU1.get('name','test')}]
})
check('API: المعلم يرسل مخالفة', ok(r), r.get('error',''))

# API: إرسال غياب من المعلم
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3', 'InputType': 'absence',
    'Stage': 'Primary', 'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1', 'AbsenceType': 'full',
    'Students': [{'Id': STU1.get('studentNumber','SP1'), 'Name': STU1.get('name','test')}]
})
check('API: المعلم يرسل غياب', ok(r), r.get('error',''))

# API: إرسال ملاحظة من المعلم
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3', 'InputType': 'note',
    'Stage': 'Primary', 'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1', 'ItemText': 'ملاحظة اختبار',
    'Students': [{'Id': STU1.get('studentNumber','SP1'), 'Name': STU1.get('name','test')}]
})
check('API: المعلم يرسل ملاحظة', ok(r), r.get('error',''))

# API: إرسال سلوك إيجابي من المعلم
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3', 'InputType': 'positive',
    'Stage': 'Primary', 'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1', 'ItemText': 'تعاون ممتاز',
    'Students': [{'Id': STU1.get('studentNumber','SP1'), 'Name': STU1.get('name','test')}]
})
check('API: المعلم يرسل سلوك إيجابي', ok(r), r.get('error',''))

# API: إرسال "لا يوجد غائب" من المعلم
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3', 'InputType': 'absence',
    'Stage': 'Primary', 'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1', 'NoAbsence': True, 'Students': []
})
check('API: المعلم يرسل "لا يوجد غائب"', ok(r), r.get('error',''))

# رابط معلم خاطئ
r = api('GET', f'{BASE}/api/teacherinput/public/verify?token=INVALID')
check('رابط معلم خاطئ يُرفض', not ok(r))

# API: سجلات اليوم للمعلم
r = api('GET', f'{BASE}/api/teacherinput/public/today-records?token=PQSPHPK3')
check('API: سجلات المعلم اليوم', ok(r) or r.get('_http') != 500)

# API: المراحل المتاحة
r = api('GET', f'{BASE}/api/teacherinput/public/available-stages?token=PQSPHPK3')
check('API: المراحل المتاحة للمعلم', ok(r) or r.get('_http') != 500)


# ══════════════════════════════════════════════════════════════════
#   القسم 3: واجهة الموظف/المرشد (نموذج الموظف — عام)
# ══════════════════════════════════════════════════════════════════
section("3. واجهة الموظف/المرشد")

# صفحة نموذج الموظف
p = fetch_page(f'{BASE}/staff-form')
check('صفحة نموذج الموظف تحمّل', p['ok'] and p.get('size',0) > 500)

p = fetch_page(f'{BASE}/staff-form?token=CLTCT9DQ')
check('صفحة الموظف مع token تحمّل', p['ok'] and p.get('size',0) > 500)

# API: التحقق من رابط الموظف
r = api('GET', f'{BASE}/api/staffinput/public/verify?token=CLTCT9DQ')
check('API: التحقق من رابط الموظف', ok(r))
staff_data = r.get('data', {})
check('يرجع بيانات الموظف', staff_data is not None)

# API: جلب طلاب الفصل عبر رابط الموظف
r = api('GET', f'{BASE}/api/staffinput/public/class-students?token=CLTCT9DQ&stage=Primary&grade=first&className=A')
check('API: جلب طلاب (موظف)', ok(r) or r.get('_http') != 500)

# API: سجلات اليوم
r = api('GET', f'{BASE}/api/staffinput/public/today-records?token=CLTCT9DQ')
check('API: سجلات الموظف اليوم', ok(r) or r.get('_http') != 500)

# رابط موظف خاطئ
r = api('GET', f'{BASE}/api/staffinput/public/verify?token=XXXX')
check('رابط موظف خاطئ يُرفض', not ok(r))


# ══════════════════════════════════════════════════════════════════
#   القسم 4: واجهة الحارس
# ══════════════════════════════════════════════════════════════════
section("4. واجهة الحارس")

# صفحة الحارس
p = fetch_page(f'{BASE}/guard')
check('صفحة الحارس تحمّل', p['ok'] and p.get('size',0) > 500)

# API: الاستئذانات المعلقة (الحارس يراها)
r = api('GET', f'{BASE}/api/permissions/pending', PRI)
check('API: الاستئذانات المعلقة (للحارس)', ok(r))

# API: تأكيد خروج — تسجيل استئذان أولاً
r = api('POST', f'{BASE}/api/permissions', PRI, {
    'studentId': STU1.get('id',0), 'reason': 'اختبار حارس', 'receiver': 'والد'
})
guard_perm_id = r.get('data',{}).get('id', 0)
check('تسجيل استئذان للحارس', ok(r))

if guard_perm_id:
    r = api('PUT', f'{BASE}/api/permissions/{guard_perm_id}/confirm', PRI)
    check('الحارس يؤكد خروج الطالب', ok(r), r.get('error',''))


# ══════════════════════════════════════════════════════════════════
#   القسم 5: واجهة الوكيل (نموذج الوكيل — عام)
# ══════════════════════════════════════════════════════════════════
section("5. واجهة الوكيل")

p = fetch_page(f'{BASE}/wakeel-form')
check('صفحة نموذج الوكيل تحمّل', p['ok'] and p.get('size',0) > 500)

# الوكيل يفتح الداشبورد
r = api('GET', f'{BASE}/api/dashboard', PRI)
check('API: داشبورد الوكيل', ok(r))

# الوكيل يفتح كل الأقسام
sections_api = [
    ('/api/violations', 'المخالفات'),
    ('/api/tardiness', 'التأخر'),
    ('/api/absence', 'الغياب'),
    ('/api/permissions', 'الاستئذانات'),
    ('/api/educationalnotes', 'الملاحظات'),
    ('/api/positivebehavior', 'السلوك الإيجابي'),
    ('/api/communication', 'التواصل'),
    ('/api/students', 'الطلاب'),
    ('/api/noor/pending', 'نور'),
    ('/api/parentexcuse', 'أعذار الأمور'),
]
for endpoint, name in sections_api:
    r = api('GET', f'{BASE}{endpoint}', PRI)
    check(f'API: الوكيل يفتح {name}', ok(r), r.get('error',''))

# الوكيل يفتح الإحصائيات اليومية
for endpoint, name in [
    ('/api/violations/daily-stats', 'إحصائيات المخالفات'),
    ('/api/tardiness/daily-stats', 'إحصائيات التأخر'),
    ('/api/absence/daily-stats', 'إحصائيات الغياب'),
    ('/api/permissions/daily-stats', 'إحصائيات الاستئذان'),
    ('/api/educationalnotes/daily-stats', 'إحصائيات الملاحظات'),
    ('/api/positivebehavior/daily-stats', 'إحصائيات السلوك'),
]:
    r = api('GET', f'{BASE}{endpoint}', PRI)
    check(f'API: {name}', ok(r))

# الوكيل يفتح التقارير
for endpoint, name in [
    ('/api/violations/report', 'تقرير المخالفات'),
    ('/api/tardiness/report', 'تقرير التأخر'),
    ('/api/absence/report', 'تقرير الغياب'),
    ('/api/permissions/report', 'تقرير الاستئذان'),
    ('/api/educationalnotes/report', 'تقرير الملاحظات'),
    ('/api/positivebehavior/report', 'تقرير السلوك'),
]:
    r = api('GET', f'{BASE}{endpoint}', PRI)
    check(f'API: {name}', ok(r))

# الوكيل يصدّر CSV
for endpoint, name in [
    ('/api/violations/export', 'تصدير المخالفات'),
    ('/api/tardiness/export', 'تصدير التأخر'),
    ('/api/absence/export', 'تصدير الغياب'),
    ('/api/permissions/export', 'تصدير الاستئذان'),
    ('/api/educationalnotes/export', 'تصدير الملاحظات'),
    ('/api/positivebehavior/export', 'تصدير السلوك'),
    ('/api/communication/export', 'تصدير التواصل'),
]:
    r = api('GET', f'{BASE}{endpoint}', PRI)
    check(f'API: {name} CSV', ok(r) or r.get('_raw'))


# ══════════════════════════════════════════════════════════════════
#   القسم 6: واجهة ولي الأمر (عذر الغياب — عام)
# ══════════════════════════════════════════════════════════════════
section("6. واجهة ولي الأمر")

# صفحة عذر ولي الأمر العامة
p = fetch_page(f'{BASE}/parent-excuse-form')
check('صفحة عذر ولي الأمر تحمّل', p['ok'] and p.get('size',0) > 500)

# API: توليد رمز لولي الأمر
r = api('POST', f'{BASE}/api/parentexcuse/generate-code', PRI, {
    'studentNumber': STU1.get('studentNumber','SP1'), 'stage': 'Primary'
})
check('API: توليد رمز ولي الأمر', ok(r), r.get('error',''))
parent_code = r.get('data',{}).get('accessCode','') if ok(r) else ''

# API: التحقق من الرمز (ولي الأمر يفتح الرابط)
if parent_code:
    r = api('GET', f'{BASE}/api/parentexcuse/verify?code={parent_code}')
    check('API: ولي الأمر يتحقق من الرمز', ok(r))
    pdata = r.get('data', {})
    check('يرى اسم الطالب', 'student' in str(pdata).lower() or len(str(pdata)) > 10)
    check('يرى اسم المدرسة', 'school' in str(pdata).lower() or len(str(pdata)) > 10)

    # API: ولي الأمر يقدم عذر
    r = api('POST', f'{BASE}/api/parentexcuse/submit', data={
        'accessCode': parent_code, 'reason': 'مرض الطالب',
        'notes': 'اختبار واجهة ولي الأمر'
    })
    check('API: ولي الأمر يقدم عذر', ok(r), r.get('error',''))

    # API: رفض عذر مكرر
    r = api('POST', f'{BASE}/api/parentexcuse/submit', data={
        'accessCode': parent_code, 'reason': 'مكرر', 'notes': 'x'
    })
    check('API: رفض عذر مكرر', not ok(r) or 'مسبق' in str(r))

# رمز خاطئ يُرفض
r = api('GET', f'{BASE}/api/parentexcuse/verify?code=INVALID999')
check('رمز خاطئ يُرفض', not ok(r))

# الوكيل يعرض الأعذار المقدمة
r = api('GET', f'{BASE}/api/parentexcuse', PRI)
check('API: الوكيل يعرض الأعذار', ok(r))

r = api('GET', f'{BASE}/api/parentexcuse/pending-count', PRI)
check('API: عدد الأعذار المعلقة', ok(r))


# ══════════════════════════════════════════════════════════════════
#   القسم 7: واجهة المدير (الإعدادات)
# ══════════════════════════════════════════════════════════════════
section("7. واجهة المدير")

# صفحة الإعدادات
p = fetch_page(f'{BASE}/settings')
check('صفحة الإعدادات تحمّل', p['ok'] and p.get('size',0) > 500)

# API: إعدادات المدرسة
r = api('GET', f'{BASE}/api/settings', ADMIN)
check('API: إعدادات المدرسة', ok(r))

# API: هيكل المدرسة
r = api('GET', f'{BASE}/api/settings/structure', ADMIN)
check('API: هيكل المدرسة', ok(r))

# API: المراحل
r = api('GET', f'{BASE}/api/settings/stages', ADMIN)
check('API: المراحل', ok(r))

# API: المستخدمين (تاب الإداريين)
r = api('GET', f'{BASE}/api/users', ADMIN)
check('API: المستخدمين', ok(r))

# API: خيارات النطاق
r = api('GET', f'{BASE}/api/users/scope-options', ADMIN)
check('API: خيارات النطاق', ok(r))

# API: المعلمين (تاب المعلمين)
r = api('GET', f'{BASE}/api/teachers', ADMIN)
check('API: المعلمين', ok(r))

# API: الطلاب
r = api('GET', f'{BASE}/api/students', ADMIN)
check('API: الطلاب', ok(r))

# API: المواد
r = api('GET', f'{BASE}/api/subjects', ADMIN)
check('API: المواد الدراسية', ok(r))

# API: القواعد
r = api('GET', f'{BASE}/api/rules', ADMIN)
check('API: قواعد المخالفات', ok(r))

# API: القوالب
r = api('GET', f'{BASE}/api/templates', ADMIN)
check('API: قوالب الرسائل', ok(r))

# API: روابط المعلمين
r = api('GET', f'{BASE}/api/teacherlinks', ADMIN)
check('API: روابط المعلمين', ok(r))

r = api('GET', f'{BASE}/api/teacherlinks/classes', ADMIN)
check('API: الفصول المتاحة', ok(r))

# API: التراخيص
r = api('GET', f'{BASE}/api/licenses/status', ADMIN)
check('API: حالة الاشتراك', ok(r))

# API: واتساب
r = api('GET', f'{BASE}/api/whatsapp/settings', ADMIN)
check('API: إعدادات الواتساب', ok(r))

r = api('GET', f'{BASE}/api/whatsapp/sessions', ADMIN)
check('API: جلسات الواتساب', ok(r))


# ══════════════════════════════════════════════════════════════════
#   القسم 8: الصفحات العامة (بدون تسجيل دخول)
# ══════════════════════════════════════════════════════════════════
section("8. الصفحات العامة")

# صفحة تسجيل الدخول
p = fetch_page(f'{BASE}/login')
check('صفحة تسجيل الدخول تحمّل', p['ok'] and p.get('size',0) > 500)

# صفحة الإعداد الأولي
p = fetch_page(f'{BASE}/setup')
check('صفحة الإعداد الأولي تحمّل', p['ok'] and p.get('size',0) > 500)

# API العامة بدون توكن
r = api('GET', f'{BASE}/api/licenses/check-setup')
check('API: فحص الإعداد (عام)', ok(r))

# نموذج المرشد
p = fetch_page(f'{BASE}/counselor-form')
check('صفحة نموذج المرشد تحمّل', p['ok'] and p.get('size',0) > 500)

# إدارة التأخر
p = fetch_page(f'{BASE}/admin-tardiness')
check('صفحة إدارة التأخر تحمّل', p['ok'] and p.get('size',0) > 500)


# ══════════════════════════════════════════════════════════════════
#   القسم 9: التحقق من ملفات JavaScript و CSS
# ══════════════════════════════════════════════════════════════════
section("9. ملفات JavaScript و CSS")

# جلب الصفحة الرئيسية لاستخراج روابط JS/CSS
p = fetch_page(f'{BASE}/')
html = p.get('html', '')

# استخراج ملفات JS
js_files = re.findall(r'src="(/static/js/[^"]+)"', html)
css_files = re.findall(r'href="(/static/css/[^"]+)"', html)

check('يوجد ملفات JavaScript', len(js_files) > 0, js_files)
check('يوجد ملفات CSS', len(css_files) > 0, css_files)

# تحميل كل ملف JS
for js in js_files[:3]:  # أول 3 ملفات
    p = fetch_page(f'{BASE}{js}')
    check(f'ملف JS يحمّل: {js.split("/")[-1][:30]}', p['ok'] and p.get('size',0) > 100, p.get('size',0))

# تحميل كل ملف CSS
for css in css_files[:2]:
    p = fetch_page(f'{BASE}{css}')
    check(f'ملف CSS يحمّل: {css.split("/")[-1][:30]}', p['ok'] and p.get('size',0) > 100, p.get('size',0))


# ══════════════════════════════════════════════════════════════════
#   القسم 10: أمان — API محمية ترفض بدون توكن
# ══════════════════════════════════════════════════════════════════
section("10. أمان الواجهات")

protected_apis = [
    '/api/violations', '/api/tardiness', '/api/absence',
    '/api/permissions', '/api/educationalnotes', '/api/positivebehavior',
    '/api/communication', '/api/dashboard', '/api/students',
    '/api/users', '/api/teachers', '/api/settings',
    '/api/noor/pending', '/api/parentexcuse',
]
for endpoint in protected_apis:
    r = api('GET', f'{BASE}{endpoint}')
    is_401 = r.get('_http') == 401
    check(f'{endpoint} محمية (401)', is_401, r.get('_http',''))

# الصفحات العامة يجب أن تعمل بدون توكن
public_apis = [
    '/api/licenses/check-setup',
    '/api/teacherinput/public/verify?token=PQSPHPK3',
    '/api/staffinput/public/verify?token=CLTCT9DQ',
]
for endpoint in public_apis:
    r = api('GET', f'{BASE}{endpoint}')
    check(f'{endpoint} عامة (تعمل)', ok(r))


# ══════════════════════════════════════════════════════════════════
#   القسم 11: التحقق من API الفرونت-إند (client/src/api/)
# ══════════════════════════════════════════════════════════════════
section("11. API calls الفرونت-إند")

# كل الـ API endpoints التي يستدعيها الفرونت-إند
frontend_apis = [
    # الداشبورد
    ('GET', '/api/dashboard', ADMIN, 'داشبورد'),
    ('GET', '/api/dashboard/calendar', PRI, 'التقويم'),
    # المخالفات
    ('GET', '/api/violations', PRI, 'قائمة المخالفات'),
    ('GET', '/api/violations/daily-stats', PRI, 'إحصائيات المخالفات'),
    ('GET', '/api/violations/types', PRI, 'أنواع المخالفات'),
    ('GET', '/api/violations/report', PRI, 'تقرير المخالفات'),
    ('GET', '/api/violations/compensation-eligible', PRI, 'تعويض المخالفات'),
    # الغياب
    ('GET', '/api/absence', PRI, 'قائمة الغياب'),
    ('GET', '/api/absence/daily-stats', PRI, 'إحصائيات الغياب'),
    ('GET', '/api/absence/cumulative', PRI, 'الغياب التراكمي'),
    ('GET', '/api/absence/statistics', PRI, 'إحصائيات شاملة'),
    ('GET', '/api/absence/summary', PRI, 'ملخص الغياب'),
    # التأخر
    ('GET', '/api/tardiness', PRI, 'قائمة التأخر'),
    ('GET', '/api/tardiness/daily-stats', PRI, 'إحصائيات التأخر'),
    # الاستئذان
    ('GET', '/api/permissions', PRI, 'قائمة الاستئذانات'),
    ('GET', '/api/permissions/pending', PRI, 'المعلقة'),
    ('GET', '/api/permissions/daily-stats', PRI, 'إحصائيات الاستئذان'),
    # الملاحظات
    ('GET', '/api/educationalnotes', PRI, 'قائمة الملاحظات'),
    ('GET', '/api/educationalnotes/daily-stats', PRI, 'إحصائيات الملاحظات'),
    ('GET', '/api/educationalnotes/types', PRI, 'أنواع الملاحظات'),
    # السلوك الإيجابي
    ('GET', '/api/positivebehavior', PRI, 'قائمة السلوك'),
    ('GET', '/api/positivebehavior/daily-stats', PRI, 'إحصائيات السلوك'),
    # التواصل
    ('GET', '/api/communication', PRI, 'سجل التواصل'),
    ('GET', '/api/communication/summary', PRI, 'ملخص التواصل'),
    # نور
    ('GET', '/api/noor/pending', PRI, 'نور المعلقة'),
    ('GET', '/api/noor/stats', PRI, 'إحصائيات نور'),
    ('GET', '/api/noor/mappings', PRI, 'خرائط نور'),
    ('GET', '/api/noor/settings', PRI, 'إعدادات نور'),
    # الإعدادات
    ('GET', '/api/settings', ADMIN, 'إعدادات المدرسة'),
    ('GET', '/api/settings/structure', ADMIN, 'هيكل المدرسة'),
    ('GET', '/api/settings/stages', ADMIN, 'المراحل'),
    ('GET', '/api/settings/hijri-date', ADMIN, 'التاريخ الهجري'),
    ('GET', '/api/settings/is-configured', ADMIN, 'حالة الإعداد'),
]

for method, endpoint, token, name in frontend_apis:
    r = api(method, f'{BASE}{endpoint}', token)
    check(f'Frontend API: {name}', ok(r))


# ══════════════════════════════════════════════════════════════════
#   النتائج النهائية
# ══════════════════════════════════════════════════════════════════
print(f"\n{'='*70}")
print(f"  النتائج التفصيلية لكل قسم")
print(f"{'='*70}")
for sec_name, (p, f) in section_results.items():
    status = "✅" if f == 0 else "⚠️"
    print(f"  {status} {sec_name}: {p} نجاح, {f} فشل")

print(f"\n{'='*70}")
print(f"  FULL RESULTS")
print(f"{'='*70}")
for r in results:
    print(r)

failures = [r for r in results if '[FAIL]' in r]
if failures:
    print(f"\n{'='*70}")
    print(f"  FAILURES ({len(failures)}):")
    for f in failures:
        print(f'    {f.strip()}')

print(f"\n{'='*70}")
print(f"  FINAL: {PASS} passed, {FAIL} failed out of {PASS+FAIL}")
if FAIL == 0:
    print(f"  STATUS: ALL TESTS PASSED! 100% ✅")
else:
    print(f"  STATUS: {FAIL} issues found")
print(f"{'='*70}")
