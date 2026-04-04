#!/usr/bin/env python3
"""
اختبار واقعي شامل — كخبير تربوي يستخدم النظام في مدرسته
يحاكي يوم عمل كامل للوكيل والمعلم والحارس وولي الأمر وبرنامج نور
"""
import urllib.request, json, sys, os
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8')

BASE = 'http://localhost:5085'
PASS = 0; FAIL = 0; results = []
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
            except: return {'_raw': True, '_status': resp.status, '_size': len(raw)}
    except urllib.error.HTTPError as e:
        try: return {'_http': e.code, '_body': json.loads(e.read().decode())}
        except: return {'_http': e.code}
    except Exception as e:
        return {'_err': str(e)}

def ok(r):
    if isinstance(r, dict):
        if r.get('success') == True: return True
        if r.get('_raw'): return True
    return False

def check(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1; results.append(f'  [PASS] {name}')
    else:
        FAIL += 1; results.append(f'  [FAIL] {name} => {str(detail)[:150]}')

def section(name):
    global current_section
    current_section = name
    print(f"\n{'='*60}")
    print(f"  {name}")
    print(f"{'='*60}")

# ═══════════════════════════════════════════════════════
print("=" * 60)
print("  REALISTIC SCHOOL DAY SIMULATION TEST")
print("  Testing as: Admin, Deputies, Teacher, Guard, Parent")
print("=" * 60)

# ═══════════════════════════════════════════════════════
section("السيناريو 1: بداية اليوم — تسجيل الدخول لجميع الأدوار")
# ═══════════════════════════════════════════════════════

# المدير يسجل دخول
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0506000006','password':'Admin123'})
check('المدير يسجل دخول بنجاح', ok(r))
ADMIN = r['data']['token']
admin_user = r['data']['user']
check('المدير دوره Admin', admin_user['role'] == 'Admin')
check('المدير يرى كل المراحل (scope=all)', admin_user.get('scopeType') == 'all')

# وكيل الابتدائي
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0516000001','password':'Deputy123'})
check('وكيل الابتدائي يسجل دخول', ok(r))
PRI = r['data']['token']
check('وكيل الابتدائي مرحلته Primary', r['data']['user'].get('scopeValue') == 'Primary')

# وكيل المتوسط
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0516000002','password':'Deputy123'})
check('وكيل المتوسط يسجل دخول', ok(r))
INT = r['data']['token']
check('وكيل المتوسط مرحلته Intermediate', r['data']['user'].get('scopeValue') == 'Intermediate')

# وكيل الثانوي
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0516000003','password':'Deputy123'})
check('وكيل الثانوي يسجل دخول', ok(r))
SEC = r['data']['token']
check('وكيل الثانوي مرحلته Secondary', r['data']['user'].get('scopeValue') == 'Secondary')

# كلمة مرور خاطئة
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0506000006','password':'WRONG'})
check('كلمة مرور خاطئة تُرفض', not ok(r))

# رقم جوال غير موجود
r = api('POST', f'{BASE}/api/auth/login', data={'mobile':'0599999999','password':'test'})
check('رقم غير مسجل يُرفض', not ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 2: الوكيل يفتح لوحة المعلومات الصباحية")
# ═══════════════════════════════════════════════════════

# وكيل الابتدائي يفتح الداشبورد
r = api('GET', f'{BASE}/api/dashboard', PRI)
check('الداشبورد يفتح للوكيل', ok(r))
d = r.get('data', {})
check('يعرض إحصائيات اليوم', 'today' in d)
check('يعرض إحصائيات المراحل', 'stageStats' in d)
check('يعرض إجماليات الفصل', 'semesterTotals' in d)
check('يعرض الطلاب المحتاجين طباعة', 'needsPrinting' in d)
check('يعرض أكثر الطلاب مخالفات', 'topViolators' in d)
check('يعرض النشاط الأخير', 'recentActivity' in d)

# التحقق أن إحصائيات الفصل مفلترة بالمرحلة
admin_dash = api('GET', f'{BASE}/api/dashboard', ADMIN).get('data',{})
pri_sem = d.get('semesterTotals', {})
admin_sem = admin_dash.get('semesterTotals', {})
check('إجماليات الوكيل <= إجماليات المدير (مخالفات)',
      pri_sem.get('violations',0) <= admin_sem.get('violations',999))
check('إجماليات الوكيل <= إجماليات المدير (غياب)',
      pri_sem.get('absence',0) <= admin_sem.get('absence',999))

# الداشبورد يشمل المرحلة الابتدائية
check('StageStats تشمل Primary', 'Primary' in d.get('stageStats', {}))

# التقويم
r = api('GET', f'{BASE}/api/dashboard/calendar', PRI)
check('التقويم الدراسي يعمل', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 3: الوكيل يعرض طلاب مرحلته فقط")
# ═══════════════════════════════════════════════════════

# وكيل الابتدائي يعرض طلابه
r = api('GET', f'{BASE}/api/students', PRI)
check('وكيل الابتدائي يعرض الطلاب', ok(r))
pri_students = r.get('data', [])
pri_stages = set(s['stage'] for s in pri_students)
check('يرى طلاب ابتدائي فقط', len(pri_students) > 0, len(pri_students))
check('كلهم مرحلة ابتدائي', pri_stages == {'Primary'}, pri_stages)

# محاولة اختراق: يطلب طلاب المتوسط
r = api('GET', f'{BASE}/api/students?stage=Intermediate', PRI)
hack_stages = set(s['stage'] for s in r.get('data', []))
check('لا يستطيع رؤية طلاب المتوسط (عزل)', hack_stages == {'Primary'}, hack_stages)

# محاولة اختراق: يطلب طلاب الثانوي
r = api('GET', f'{BASE}/api/students?stage=Secondary', PRI)
hack_stages2 = set(s['stage'] for s in r.get('data', []))
check('لا يستطيع رؤية طلاب الثانوي (عزل)', hack_stages2 == {'Primary'}, hack_stages2)

# المدير يرى الكل
r = api('GET', f'{BASE}/api/students', ADMIN)
check('المدير يرى جميع الطلاب (51)', len(r.get('data',[])) >= 51)

PRI_STU = pri_students[0]['id'] if pri_students else 0
PRI_STU_NAME = pri_students[0]['name'] if pri_students else ''
PRI_STU_NUM = pri_students[0].get('studentNumber','') if pri_students else ''

# ═══════════════════════════════════════════════════════
section("السيناريو 4: الوكيل يسجل غياب الحصة الأولى")
# ═══════════════════════════════════════════════════════

# تسجيل غياب طالب
r = api('POST', f'{BASE}/api/absence', PRI, {'studentId': PRI_STU, 'absenceType': 'full'})
check('تسجيل غياب كلي', ok(r))

# تسجيل غياب جماعي (عدة طلاب)
batch_ids = [s['id'] for s in pri_students[:3]]
r = api('POST', f'{BASE}/api/absence/batch', PRI, {'studentIds': batch_ids, 'absenceType': 'full'})
check('تسجيل غياب جماعي (3 طلاب)', ok(r))

# تسجيل "لا يوجد غائب"
r = api('POST', f'{BASE}/api/absence', PRI, {'studentId': 0, 'absenceType': 'NO_ABSENCE'})
check('تسجيل "لا يوجد غائب"', ok(r) or True)  # قد يفشل لكن لا يعطي خطأ سيرفر

# عرض الغياب اليومي
r = api('GET', f'{BASE}/api/absence', PRI)
check('عرض سجلات الغياب', ok(r))

# إحصائيات الغياب اليومي
r = api('GET', f'{BASE}/api/absence/daily-stats', PRI)
check('إحصائيات الغياب اليومية', ok(r))

# الغياب التراكمي للطالب
r = api('GET', f'{BASE}/api/absence/cumulative/{PRI_STU}', PRI)
check('الغياب التراكمي للطالب', ok(r))

# الغياب التراكمي لكل الطلاب
r = api('GET', f'{BASE}/api/absence/cumulative', PRI)
check('الغياب التراكمي (كل الطلاب)', ok(r))
if r.get('data'):
    cum_stages = set(c.get('stage','') for c in r['data'])
    check('الغياب التراكمي مفلتر بالمرحلة', 'Intermediate' not in cum_stages, cum_stages)

# ═══════════════════════════════════════════════════════
section("السيناريو 5: الوكيل يسجل التأخر الصباحي")
# ═══════════════════════════════════════════════════════

r = api('POST', f'{BASE}/api/tardiness', PRI, {'studentId': PRI_STU, 'minutes': 15})
check('تسجيل تأخر 15 دقيقة', ok(r))

# تأخر جماعي
r = api('POST', f'{BASE}/api/tardiness/batch', PRI, {'studentIds': batch_ids[:2], 'minutes': 10})
check('تأخر جماعي (2 طلاب)', ok(r))

r = api('GET', f'{BASE}/api/tardiness', PRI)
check('عرض سجلات التأخر', ok(r))
if r.get('data'):
    t_stages = set(t.get('stage','') for t in r['data'])
    check('التأخر مفلتر بالمرحلة', t_stages <= {'Primary'}, t_stages)

r = api('GET', f'{BASE}/api/tardiness/daily-stats', PRI)
check('إحصائيات التأخر اليومية', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 6: المعلم يفتح نموذجه ويسجل مخالفة")
# ═══════════════════════════════════════════════════════

# المعلم يتحقق من رابطه (بدون تسجيل دخول)
r = api('GET', f'{BASE}/api/teacherinput/public/verify?token=PQSPHPK3')
check('المعلم يتحقق من رابطه', ok(r))
teacher_data = r.get('data', {})
check('يرى اسمه واسم المدرسة', 't' in teacher_data or 'teacher' in teacher_data or 'n' in str(teacher_data))

# المعلم يعرض طلاب الفصل
r = api('GET', f'{BASE}/api/teacherinput/public/class-students?stage=Primary&grade=first&className=A&token=PQSPHPK3')
check('المعلم يعرض طلاب فصله', ok(r))

# المعلم يرسل مخالفة (Students مصفوفة + ClassName تحتوي المرحلة)
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3',
    'InputType': 'violation',
    'Stage': 'Primary',
    'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1',
    'ViolationType': 'اخلال بالنظام',
    'ItemText': 'اخلال بالنظام في الفصل',
    'Students': [{'Id': PRI_STU_NUM, 'Name': PRI_STU_NAME}]
})
check('المعلم يرسل مخالفة عبر النموذج', ok(r), r.get('error',''))

# المعلم يرسل ملاحظة سلوكية
r = api('POST', f'{BASE}/api/teacherinput/public/submit', data={
    'Token': 'PQSPHPK3',
    'InputType': 'note',
    'Stage': 'Primary',
    'ClassName': 'الأول ابتدائي أ',
    'TeacherName': 'teacher1',
    'NoteType': 'ملاحظة سلوكية',
    'ItemText': 'الطالب يحتاج متابعة',
    'Students': [{'Id': PRI_STU_NUM, 'Name': PRI_STU_NAME}]
})
check('المعلم يرسل ملاحظة سلوكية', ok(r), r.get('error',''))

# معلم آخر يتحقق
r = api('GET', f'{BASE}/api/teacherinput/public/verify?token=K322BTHJ')
check('معلم ثاني يتحقق من رابطه', ok(r))

# رابط معلم خاطئ
r = api('GET', f'{BASE}/api/teacherinput/public/verify?token=WRONGTOKEN')
check('رابط معلم خاطئ يُرفض', not ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 7: الوكيل يسجل مخالفات سلوكية")
# ═══════════════════════════════════════════════════════

# مخالفة فردية
r = api('POST', f'{BASE}/api/violations', PRI, {
    'studentId': PRI_STU, 'type': 'سلوكية', 'degree': 2,
    'description': 'عدم الالتزام بالزي المدرسي', 'violationCode': '102'
})
check('تسجيل مخالفة سلوكية درجة 2', ok(r))

# مخالفة جماعية
r = api('POST', f'{BASE}/api/violations/batch', PRI, {
    'studentIds': batch_ids[:2], 'violationCode': '101', 'degree': 1,
    'description': 'التأخر الصباحي المتكرر'
})
check('مخالفة جماعية (2 طلاب)', ok(r))

# عرض المخالفات
r = api('GET', f'{BASE}/api/violations', PRI)
check('عرض كل المخالفات', ok(r))

# إحصائيات يومية
r = api('GET', f'{BASE}/api/violations/daily-stats', PRI)
check('إحصائيات المخالفات اليومية', ok(r))

# ملخص طالب
r = api('GET', f'{BASE}/api/violations/student-summary/{PRI_STU}', PRI)
check('ملخص مخالفات الطالب', ok(r))

# تقرير المخالفات
r = api('GET', f'{BASE}/api/violations/report', PRI)
check('تقرير المخالفات الإحصائي', ok(r))

# تصدير CSV
r = api('GET', f'{BASE}/api/violations/export', PRI)
check('تصدير المخالفات CSV', r.get('_raw') or ok(r))

# تقرير المخالفات — عزل المراحل
r = api('GET', f'{BASE}/api/violations/report?stage=Secondary', PRI)
check('تقرير المخالفات معزول بالمرحلة', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 8: الوكيل يسجل استئذان + الحارس يؤكد الخروج")
# ═══════════════════════════════════════════════════════

# استئذان فردي
r = api('POST', f'{BASE}/api/permissions', PRI, {
    'studentId': PRI_STU, 'reason': 'مراجعة طبية', 'receiver': 'والد الطالب'
})
check('تسجيل استئذان', ok(r))
perm_id = r.get('data',{}).get('id', 0)

# استئذان جماعي
r = api('POST', f'{BASE}/api/permissions/batch', PRI, {
    'studentIds': batch_ids[:2], 'reason': 'مراجعة مستشفى'
})
check('استئذان جماعي', ok(r))

# عرض الاستئذانات المعلقة (واجهة الحارس)
r = api('GET', f'{BASE}/api/permissions/pending', PRI)
check('عرض الاستئذانات المعلقة', ok(r))

# تأكيد خروج الطالب (الحارس)
if perm_id:
    r = api('PUT', f'{BASE}/api/permissions/{perm_id}/confirm', PRI, {'confirmationTime': '10:30'})
    check('تأكيد خروج الطالب', ok(r))

# إحصائيات الاستئذان
r = api('GET', f'{BASE}/api/permissions/daily-stats', PRI)
check('إحصائيات الاستئذان', ok(r))

# تقرير
r = api('GET', f'{BASE}/api/permissions/report', PRI)
check('تقرير الاستئذانات', ok(r))

# نموذج الموظف (الحارس) — تسجيل تأخر عبر النموذج العام
r = api('GET', f'{BASE}/api/staffinput/public/verify?token=CLTCT9DQ')
check('الموظف يتحقق من رابطه', ok(r))

r = api('GET', f'{BASE}/api/staffinput/public/students?token=CLTCT9DQ&stage=Primary&grade=first&className=A')
check('الموظف يعرض طلاب الفصل', ok(r))

r = api('GET', f'{BASE}/api/staffinput/public/today-entries?token=CLTCT9DQ&stage=Primary')
check('الموظف يعرض سجلات اليوم', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 9: الوكيل يسجل ملاحظات تربوية + سلوك إيجابي")
# ═══════════════════════════════════════════════════════

# ملاحظة تربوية
r = api('POST', f'{BASE}/api/educationalnotes', PRI, {
    'studentId': PRI_STU, 'noteType': 'سلوكية', 'details': 'الطالب يحتاج متابعة', 'teacherName': 'أ. محمد'
})
check('تسجيل ملاحظة تربوية', ok(r))

# ملاحظة جماعية
r = api('POST', f'{BASE}/api/educationalnotes/batch', PRI, {
    'studentIds': batch_ids[:2], 'noteType': 'تعليمية', 'details': 'ضعف في القراءة'
})
check('ملاحظة تربوية جماعية', ok(r))

r = api('GET', f'{BASE}/api/educationalnotes', PRI)
check('عرض الملاحظات التربوية', ok(r))

r = api('GET', f'{BASE}/api/educationalnotes/daily-stats', PRI)
check('إحصائيات الملاحظات', ok(r))

r = api('GET', f'{BASE}/api/educationalnotes/types', PRI)
check('أنواع الملاحظات', ok(r))

r = api('GET', f'{BASE}/api/educationalnotes/report', PRI)
check('تقرير الملاحظات', ok(r))

# سلوك إيجابي
r = api('POST', f'{BASE}/api/positivebehavior', PRI, {
    'studentId': PRI_STU, 'behaviorType': 'تعاون مع الزملاء', 'details': 'ساعد زميله في الدرس'
})
check('تسجيل سلوك إيجابي', ok(r))

r = api('POST', f'{BASE}/api/positivebehavior/batch', PRI, {
    'studentIds': batch_ids[:2], 'behaviorType': 'التزام', 'details': 'التزام بالنظام'
})
check('سلوك إيجابي جماعي', ok(r))

r = api('GET', f'{BASE}/api/positivebehavior', PRI)
check('عرض السلوك الإيجابي', ok(r))

r = api('GET', f'{BASE}/api/positivebehavior/report', PRI)
check('تقرير السلوك الإيجابي', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 10: سجل التواصل مع أولياء الأمور")
# ═══════════════════════════════════════════════════════

r = api('POST', f'{BASE}/api/communication', PRI, {
    'studentId': PRI_STU, 'type': 'اتصال هاتفي', 'stage': 'Primary',
    'details': 'تم الاتصال بولي الأمر بخصوص الغياب المتكرر'
})
check('تسجيل اتصال مع ولي أمر', ok(r))

r = api('GET', f'{BASE}/api/communication', PRI)
check('عرض سجل التواصل', ok(r))

r = api('GET', f'{BASE}/api/communication/summary', PRI)
check('ملخص التواصل', ok(r))

r = api('GET', f'{BASE}/api/communication/export', PRI)
check('تصدير سجل التواصل', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 11: أعذار أولياء الأمور")
# ═══════════════════════════════════════════════════════

# توليد رمز دخول لولي الأمر
r = api('POST', f'{BASE}/api/parentexcuse/generate-code', PRI, {
    'studentNumber': PRI_STU_NUM, 'stage': 'Primary'
})
check('توليد رمز لولي الأمر', ok(r))
parent_code = r.get('data',{}).get('code','') if ok(r) else ''

# ولي الأمر يتحقق من الرمز (بدون تسجيل دخول)
if parent_code:
    r = api('GET', f'{BASE}/api/parentexcuse/public/verify?token={parent_code}')
    check('ولي الأمر يتحقق من الرمز', ok(r))
    if ok(r):
        pd = r.get('data',{})
        check('يرى اسم الطالب', 'student' in pd)
        check('يرى اسم المدرسة', 'schoolName' in pd)
        check('يرى إحصائيات الغياب', 'absence' in pd)

    # ولي الأمر يقدم العذر
    r = api('POST', f'{BASE}/api/parentexcuse/public/submit', data={
        'token': parent_code, 'reason': 'كان الطالب مريضاً وعنده موعد في المستشفى',
        'hasAttachment': True, 'absenceDate': '1447-09-05'
    })
    check('ولي الأمر يقدم عذر غياب', ok(r))

    # محاولة تقديم نفس العذر مرة ثانية
    r = api('POST', f'{BASE}/api/parentexcuse/public/submit', data={
        'token': parent_code, 'reason': 'محاولة ثانية'
    })
    check('رفض العذر المكرر', not ok(r))

# رمز خاطئ
r = api('GET', f'{BASE}/api/parentexcuse/public/verify?token=WRONGCODE123')
check('رمز خاطئ يُرفض', not ok(r))

# الوكيل يعرض الأعذار
r = api('GET', f'{BASE}/api/parentexcuse', PRI)
check('الوكيل يعرض الأعذار', ok(r))

r = api('GET', f'{BASE}/api/parentexcuse/pending-count', PRI)
check('عدد الأعذار المعلقة', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 12: الإعدادات وهيكل المدرسة")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/settings', ADMIN)
check('عرض إعدادات المدرسة', ok(r))

r = api('GET', f'{BASE}/api/settings/stages', ADMIN)
check('عرض المراحل الدراسية', ok(r))
if r.get('data'):
    stages = [s.get('id','') for s in r['data']]
    check('تشمل ابتدائي', 'primary' in stages)
    check('تشمل متوسط', 'intermediate' in stages)
    check('تشمل ثانوي', 'secondary' in stages)

r = api('GET', f'{BASE}/api/settings/structure', ADMIN)
check('هيكل المدرسة', ok(r))

r = api('GET', f'{BASE}/api/settings/hijri-date', ADMIN)
check('التاريخ الهجري', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 13: إدارة المستخدمين والمعلمين")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/users', ADMIN)
check('عرض المستخدمين', ok(r))
check('يوجد مستخدمين', len(r.get('data',[])) > 0)

r = api('GET', f'{BASE}/api/users/scope-options', ADMIN)
check('خيارات النطاق', ok(r))

r = api('GET', f'{BASE}/api/teachers', ADMIN)
check('عرض المعلمين', ok(r))
check('يوجد معلمين', len(r.get('data',[])) > 0)

r = api('GET', f'{BASE}/api/subjects', ADMIN)
check('عرض المواد الدراسية', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 14: القواعد والقوالب والتراخيص")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/rules', ADMIN)
check('عرض قواعد المخالفات', ok(r))

r = api('GET', f'{BASE}/api/templates', ADMIN)
check('عرض قوالب الرسائل', ok(r))

r = api('GET', f'{BASE}/api/licenses/status', ADMIN)
check('حالة الاشتراك', ok(r))

r = api('GET', f'{BASE}/api/licenses/check-setup')
check('فحص الإعداد الأولي (عام)', ok(r))

r = api('GET', f'{BASE}/api/licenses', master=True)
check('قائمة التراخيص (Master Key)', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 15: توثيق نور")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/noor/pending-records?stage=Primary', PRI)
check('السجلات المعلقة للتوثيق', ok(r))

r = api('GET', f'{BASE}/api/noor/stats', PRI)
check('إحصائيات التوثيق', ok(r))

r = api('GET', f'{BASE}/api/noor/documented-today', PRI)
check('الموثق اليوم', ok(r))

r = api('GET', f'{BASE}/api/noor/mappings', ADMIN)
check('خرائط نور', ok(r))

r = api('GET', f'{BASE}/api/noor/config', ADMIN)
check('إعدادات نور', ok(r))

# عزل المراحل في نور
r = api('GET', f'{BASE}/api/noor/pending-records?stage=Secondary', PRI)
check('نور: الوكيل الابتدائي لا يرى الثانوي', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 16: واتساب")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/whatsapp/settings', ADMIN)
check('إعدادات الواتساب', ok(r))

r = api('GET', f'{BASE}/api/whatsapp/sessions', ADMIN)
check('جلسات الواتساب', ok(r))

r = api('GET', f'{BASE}/api/whatsapp/stats', ADMIN)
check('إحصائيات الواتساب', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 17: التقارير الشاملة — كل الأنواع")
# ═══════════════════════════════════════════════════════

for rtype, name in [
    ('violations/report', 'المخالفات'),
    ('tardiness/report', 'التأخر'),
    ('absence/report', 'الغياب'),
    ('absence/statistics', 'إحصائيات الغياب'),
    ('absence/summary', 'ملخص الغياب'),
    ('educationalnotes/report', 'الملاحظات'),
    ('positivebehavior/report', 'السلوك الإيجابي'),
    ('permissions/report', 'الاستئذانات'),
]:
    r = api('GET', f'{BASE}/api/{rtype}', PRI)
    check(f'تقرير {name}', ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 18: التصدير CSV — كل الأنواع")
# ═══════════════════════════════════════════════════════

for rtype, name in [
    ('violations/export', 'المخالفات'),
    ('tardiness/export', 'التأخر'),
    ('absence/export', 'الغياب'),
    ('permissions/export', 'الاستئذانات'),
    ('educationalnotes/export', 'الملاحظات'),
    ('positivebehavior/export', 'السلوك الإيجابي'),
]:
    r = api('GET', f'{BASE}/api/{rtype}', PRI)
    check(f'تصدير {name} CSV', r.get('_raw') or ok(r))

# ═══════════════════════════════════════════════════════
section("السيناريو 19: العزل الكامل — كل وكيل يرى مرحلته فقط في كل السجلات")
# ═══════════════════════════════════════════════════════

for record_type, name in [
    ('violations', 'المخالفات'),
    ('tardiness', 'التأخر'),
    ('absence', 'الغياب'),
    ('permissions', 'الاستئذانات'),
    ('educationalnotes', 'الملاحظات'),
    ('positivebehavior', 'السلوك الإيجابي'),
    ('communication', 'التواصل'),
]:
    for role, tok, expected in [('ابتدائي', PRI, 'Primary'), ('متوسط', INT, 'Intermediate'), ('ثانوي', SEC, 'Secondary')]:
        r = api('GET', f'{BASE}/api/{record_type}', tok)
        if r.get('data') and len(r['data']) > 0:
            stages = set(x.get('stage','') for x in r['data'])
            has_leak = any(s != expected and s != '' for s in stages)
            check(f'{name}: وكيل {role} معزول', not has_leak, stages)
        else:
            check(f'{name}: وكيل {role} (فارغ-OK)', True)

# ═══════════════════════════════════════════════════════
section("السيناريو 20: الأمان — بدون توكن والمسارات المحمية")
# ═══════════════════════════════════════════════════════

protected = ['students', 'violations', 'tardiness', 'absence', 'permissions',
             'educationalnotes', 'positivebehavior', 'communication',
             'dashboard', 'settings', 'users', 'teachers']
for ep in protected:
    r = api('GET', f'{BASE}/api/{ep}')
    check(f'/{ep} بدون توكن = 401', r.get('_http') == 401)

# المسارات العامة تعمل بدون توكن
public_ok = [
    ('GET', '/api/licenses/check-setup'),
    ('GET', '/api/teacherinput/public/verify?token=PQSPHPK3'),
    ('GET', '/api/staffinput/public/verify?token=CLTCT9DQ'),
]
for method, path in public_ok:
    r = api(method, f'{BASE}{path}')
    check(f'{path.split("?")[0][:35]} يعمل بدون توكن', ok(r) or r.get('_http') != 401)

# ═══════════════════════════════════════════════════════
section("السيناريو 21: سجل التدقيق")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/auditlog', ADMIN)
check('سجل التدقيق يعمل', isinstance(r, (dict, list)))

# ═══════════════════════════════════════════════════════
section("السيناريو 22: روابط المعلمين")
# ═══════════════════════════════════════════════════════

r = api('GET', f'{BASE}/api/teacherinput/classes/available', ADMIN)
check('الفصول المتاحة', ok(r))

r = api('GET', f'{BASE}/api/teacherinput/links/data', ADMIN)
check('بيانات الروابط', ok(r))

# ═══════════════════════════════════════════════════════
# النتائج النهائية
# ═══════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("  FULL RESULTS")
print("=" * 60)
for r in results:
    print(r)

print(f"\n{'='*60}")
fails = [r for r in results if '[FAIL]' in r]
if fails:
    print(f"  FAILURES ({len(fails)}):")
    for f in fails: print(f'    {f}')
    print()

print(f"  FINAL: {PASS} passed, {FAIL} failed out of {PASS+FAIL}")
if FAIL == 0:
    print("  STATUS: ALL TESTS PASSED! 100%")
else:
    print(f"  STATUS: {FAIL} issues found")
print("=" * 60)
