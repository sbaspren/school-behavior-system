import React, { useState, useEffect, useCallback } from 'react';
import { usersApi, UserData } from '../../api/users';
import { settingsApi, StageConfigData } from '../../api/settings';
import { showSuccess, showError } from '../shared/Toast';
import { ADMIN_ROLES, ROLE_CATEGORY, ROLE_SUPPORTS_LOGIN, ROLE_EXCLUSIVE_CLASSES, ROLE_INTERFACE_DESC, ADMIN_ROLE_TO_SYSTEM_ROLE, SETTINGS_STAGES, CLASS_LETTERS } from '../../utils/constants';
import ConfirmModal from '../shared/ConfirmModal';
import LoadingSpinner from '../shared/LoadingSpinner';

interface AdminUser {
  id: number;
  name: string;
  role: string;
  mobile: string;
  permissions: string;
  scopeType: string;
  scopeValue: string;
  isActive: boolean;
}

// ============================================================
// Helper: تصنيف الفصول
// ============================================================
interface ClassItem {
  key: string;
  label: string;
  gradeLabel: string;
  stageId: string;
}

function buildClassesList(stages: StageConfigData[]): ClassItem[] {
  const result: ClassItem[] = [];
  stages.forEach((stage) => {
    if (!stage.isEnabled) return;
    stage.grades.forEach((grade) => {
      if (!grade.isEnabled || grade.classCount === 0) return;
      CLASS_LETTERS.slice(0, grade.classCount).forEach((letter) => {
        result.push({
          key: `${grade.gradeName}_${stage.stage}_${letter}`,
          label: `${grade.gradeName} (${letter})`,
          gradeLabel: grade.gradeName,
          stageId: stage.stage,
        });
      });
    });
  });
  return result;
}

// ============================================================
// Main Component
// ============================================================
const AdminsTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stages, setStages] = useState<StageConfigData[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem('admins_guide_closed') !== 'true'; } catch { return true; }
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, stagesRes] = await Promise.all([
        usersApi.getAll(),
        settingsApi.getStructure(),
      ]);
      if (usersRes.data?.data) setUsers(usersRes.data.data);
      if (stagesRes.data?.data?.stages) setStages(Array.isArray(stagesRes.data.data.stages) ? stagesRes.data.data.stages : []);
    } catch { /* empty */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleGuide = () => {
    const next = !guideOpen;
    setGuideOpen(next);
    try { localStorage.setItem('admins_guide_closed', next ? 'false' : 'true'); } catch { /* skip */ }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await usersApi.delete(confirmDelete.id);
      if (res.data?.success) { showSuccess('تم الحذف بنجاح'); setConfirmDelete(null); loadData(); }
      else showError(res.data?.message || 'خطأ');
    } catch { showError('خطأ في الاتصال'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* ═══ دليل إعداد الهيئة الإدارية ═══ */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
        <button onClick={toggleGuide} style={{
          width: '100%', padding: '14px 20px', background: guideOpen ? 'linear-gradient(to left, #eef2ff, #faf5ff)' : '#f9fafb',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: guideOpen ? '1px solid #e5e7eb' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#6366f1' }}>menu_book</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1f2937' }}>دليل إعداد الهيئة الإدارية</span>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#9ca3af', transition: 'transform .2s', transform: guideOpen ? 'rotate(180deg)' : '' }}>expand_more</span>
        </button>
        {guideOpen && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* بيانات المسؤولين */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#b45309' }}>badge</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>بيانات المسؤولين</div>
                <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.8 }}>
                  يمكنك تسجيل بيانات مسؤولي المدرسة (المدير، وكيل الشؤون التعليمية، وكيل الشؤون المدرسية) لتظهر أسماؤهم في النماذج الرسمية ومحاضر اللجان. هذه الأدوار لا تحتاج إلى إنشاء حساب دخول.
                </p>
              </div>
            </div>
            {/* وكيل شؤون الطلاب */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#2563eb' }}>shield_person</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>وكيل شؤون الطلاب</div>
                <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.8 }}>
                  إذا كنت ترغب في توزيع مهام الإشراف على التطبيق، يمكنك إنشاء حساب لوكيل شؤون الطلاب. سيتمكن الوكيل من الدخول باستخدام رقم جواله وكلمة المرور التي تحددها، وسيمارس صلاحياته على الفصول المسندة إليه. كما يمكنه ربط رقم واتساب خاص به للتواصل مع أولياء الأمور من خلال صفحة أدوات التواصل.
                </p>
              </div>
            </div>
            {/* الموجه والإداري والحارس */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#16a34a' }}>smartphone</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1f2937', marginBottom: 4 }}>الموجه الطلابي والإداري والحارس</div>
                <p style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.8 }}>
                  لكل من الموجه الطلابي والإداري والحارس واجهة خاصة يستخدمها من الجوال. حدد الفصول المسندة لكل منهم، ثم أرسل له رابط الدخول من تبويب "روابط النماذج".
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ color: '#6366f1', fontSize: 22 }}>person</span>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>الهيئة الإدارية</h3>
          <span style={{ padding: '2px 8px', background: '#f3f4f6', color: '#4b5563', fontSize: 14, borderRadius: 9999 }}>{users.length}</span>
        </div>
        <button onClick={() => { setEditingUser(null); setModalOpen(true); }} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', background: '#4f46e5', color: '#fff',
          borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span> إضافة عضو
        </button>
      </div>

      {/* ═══ Table or Empty ═══ */}
      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9ca3af', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12, display: 'block' }}>group</span>
          <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>لا يوجد أعضاء مسجلين</p>
          <p style={{ fontSize: 13, margin: '8px 0 0', color: '#9ca3af' }}>اضغط "إضافة عضو" للبدء</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'right' }}>الاسم</th>
                <th>الدور</th>
                <th>الجوال</th>
                <th>النوع</th>
                <th style={{ textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const typeLabel = ROLE_INTERFACE_DESC[user.permissions] || 'بيانات';
                const typeBg = typeLabel === 'حساب' ? '#dbeafe' : typeLabel === 'جوال' ? '#dcfce7' : '#f3f4f6';
                const typeColor = typeLabel === 'حساب' ? '#1e40af' : typeLabel === 'جوال' ? '#15803d' : '#6b7280';
                return (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 700, color: '#1f2937', textAlign: 'right' }}>{user.name}</td>
                    <td style={{ fontSize: 14, color: '#4b5563' }}>{user.permissions || user.role}</td>
                    <td style={{ fontSize: 14, color: '#4b5563' }}>{user.mobile || '-'}</td>
                    <td>
                      <span style={{ padding: '4px 10px', background: typeBg, color: typeColor, fontSize: 12, borderRadius: 9999, fontWeight: 700 }}>
                        {typeLabel}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => { setEditingUser(user); setModalOpen(true); }} style={{ padding: 6, color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                      </button>
                      <button onClick={() => setConfirmDelete(user)} style={{ padding: 6, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ Add/Edit Modal ═══ */}
      {modalOpen && (
        <AdminModal
          user={editingUser}
          allUsers={users}
          stages={stages}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadData(); }}
        />
      )}

      {/* ═══ Delete Confirm ═══ */}
      {confirmDelete && (
        <ConfirmModal
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف "${confirmDelete.name}"؟`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// ============================================================
// Admin Modal (Add/Edit) — يتغير ديناميكياً حسب الدور
// ============================================================
interface AdminModalProps {
  user: AdminUser | null;
  allUsers: AdminUser[];
  stages: StageConfigData[];
  onClose: () => void;
  onSaved: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ user, allUsers, stages, onClose, onSaved }) => {
  const isEdit = !!user;
  const isCurrentlyAdmin = user?.role === 'Admin';
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.permissions || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [password, setPassword] = useState('');
  const [enableLogin, setEnableLogin] = useState(false);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    if (user?.scopeValue) return user.scopeValue.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  });
  const [saving, setSaving] = useState(false);

  const category = ROLE_CATEGORY[role];
  const loginSupport = ROLE_SUPPORTS_LOGIN[role] || 'no';
  const isExclusive = ROLE_EXCLUSIVE_CLASSES[role] ?? true;
  const needsClasses = category && category !== 'data_only';
  const availableClasses = buildClassesList(stages);

  // الفصول المأخوذة من أشخاص آخرين بنفس الدور
  const takenClasses = allUsers
    .filter(u => u.id !== user?.id && u.permissions === role)
    .flatMap(u => (u.scopeValue || '').split(',').filter(Boolean));

  const takenByMap: Record<string, string> = {};
  allUsers.forEach(u => {
    if (u.id === user?.id || u.permissions !== role) return;
    (u.scopeValue || '').split(',').filter(Boolean).forEach(cls => {
      takenByMap[cls] = u.name;
    });
  });

  const toggleClass = (key: string) => {
    setSelectedClasses(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const selectAllClasses = () => {
    if (selectedClasses.length === availableClasses.length) setSelectedClasses([]);
    else setSelectedClasses(availableClasses.map(c => c.key));
  };

  const selectStage = (stageId: string) => {
    const stageClasses = availableClasses.filter(c => c.stageId === stageId).map(c => c.key);
    const allSelected = stageClasses.every(c => selectedClasses.includes(c));
    if (allSelected) setSelectedClasses(prev => prev.filter(c => !stageClasses.includes(c)));
    else setSelectedClasses(prev => [...new Set([...prev, ...stageClasses])]);
  };

  const selectGrade = (stageId: string, gradeLabel: string) => {
    const gradeClasses = availableClasses.filter(c => c.stageId === stageId && c.gradeLabel === gradeLabel).map(c => c.key);
    const allSelected = gradeClasses.every(c => selectedClasses.includes(c));
    if (allSelected) setSelectedClasses(prev => prev.filter(c => !gradeClasses.includes(c)));
    else setSelectedClasses(prev => [...new Set([...prev, ...gradeClasses])]);
  };

  const handleSave = async () => {
    if (!name.trim() || !role || !mobile.trim()) { showError('يرجى ملء الحقول المطلوبة'); return; }
    if (!/^05\d{8}$/.test(mobile.trim())) { showError('رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام'); return; }
    if (enableLogin && loginSupport === 'active' && !isEdit && !password.trim()) { showError('كلمة المرور مطلوبة لإنشاء حساب الدخول'); return; }

    setSaving(true);
    // ★ المدير يبقى Admin دائماً. نرسل الصلاحية في permissions فقط (الـ backend يحمي الدور أيضاً).
    const systemRole = isCurrentlyAdmin ? 'Admin' : (ADMIN_ROLE_TO_SYSTEM_ROLE[role] || 'Staff');
    const data: UserData = {
      name: name.trim(),
      role: systemRole,
      mobile: mobile.trim(),
      password: (enableLogin && loginSupport === 'active' && password.trim()) ? password.trim() : undefined,
      permissions: role,
      scopeType: selectedClasses.length > 0 ? 'classes' : 'all',
      scopeValue: selectedClasses.join(','),
    };

    try {
      const res = isEdit ? await usersApi.update(user!.id, data) : await usersApi.add(data);
      if (res.data?.success) { showSuccess('تم الحفظ بنجاح'); onSaved(); }
      else showError(res.data?.message || 'خطأ في الحفظ');
    } catch { showError('خطأ في الاتصال'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', background: 'linear-gradient(to left, #eef2ff, #faf5ff)', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1f2937' }}>{isEdit ? 'تعديل عضو' : 'إضافة عضو جديد'}</h3>
          <button onClick={onClose} style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* ★ تنبيه: المستخدم مدير — سيبقى مديراً مع إضافة الصلاحية */}
          {isEdit && isCurrentlyAdmin && (
            <div style={infoBannerStyle('#fef9c3', '#713f12', '#fde68a')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>shield_person</span>
              <span>
                هذا المستخدم <strong>مدير النظام</strong>. سيبقى مديراً بكامل صلاحياته،
                وستُضاف له الصلاحية المختارة كواجهة إضافية (مثل واجهة الوكيل على الجوال).
              </span>
            </div>
          )}

          {/* الدور */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>الدور *</label>
            <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
              <option value="">اختر الدور</option>
              {ADMIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* الاسم + الجوال */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>الاسم *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>الجوال *</label>
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="05XXXXXXXX" style={inputStyle} />
            </div>
          </div>

          {/* رسالة توضيحية حسب الدور */}
          {category === 'data_only' && role && (
            <div style={infoBannerStyle('#fef3c7', '#92400e', '#fde68a')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
              <span>بيانات هذا الدور تُستخدم في النماذج الرسمية ومحاضر اللجان فقط، ولا يحتاج إلى حساب دخول.</span>
            </div>
          )}

          {/* خيار حساب الدخول — للوكيل (يعمل) والموجه/الإداري (قريباً) */}
          {loginSupport !== 'no' && (
            <div style={{ marginBottom: 16, background: enableLogin && loginSupport === 'active' ? '#eff6ff' : '#f9fafb', borderRadius: 12, padding: 16, border: `1px solid ${enableLogin && loginSupport === 'active' ? '#bfdbfe' : '#e5e7eb'}`, transition: 'all 0.2s' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: loginSupport === 'active' ? 'pointer' : 'not-allowed', opacity: loginSupport === 'soon' ? 0.6 : 1 }}>
                <div
                  onClick={() => { if (loginSupport === 'active') setEnableLogin(!enableLogin); }}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: enableLogin && loginSupport === 'active' ? '#2563eb' : '#d1d5db',
                    position: 'relative', cursor: loginSupport === 'active' ? 'pointer' : 'not-allowed', transition: 'background 0.2s', flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 2,
                    right: enableLogin && loginSupport === 'active' ? 2 : 22,
                    transition: 'right 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: enableLogin && loginSupport === 'active' ? '#1e40af' : '#4b5563' }}>
                    إنشاء حساب دخول
                  </span>
                  {loginSupport === 'soon' && (
                    <span style={{ fontSize: 11, color: '#9ca3af', display: 'block', marginTop: 2 }}>ستتوفر هذه الخاصية قريباً</span>
                  )}
                </div>
              </label>

              {/* كلمة المرور — تظهر فقط لما يفعّل الوكيل حساب الدخول */}
              {enableLogin && loginSupport === 'active' && (
                <div style={{ marginTop: 14 }}>
                  <label style={labelStyle}>كلمة المرور {isEdit ? '' : '*'}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={isEdit ? 'اتركه فارغاً إذا لا تريد تغييره' : 'كلمة المرور'}
                    style={inputStyle} />
                  <p style={{ fontSize: 12, color: '#2563eb', margin: '6px 0 0', lineHeight: 1.6 }}>
                    سيتمكن الوكيل من الدخول برقم الجوال وكلمة المرور، وإدارة الفصول المسندة إليه. يمكنه ربط رقم واتساب خاص به من صفحة أدوات التواصل.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* رسالة الموجه/الإداري عن الرابط */}
          {loginSupport === 'soon' && (
            <div style={infoBannerStyle('#dcfce7', '#15803d', '#bbf7d0')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>smartphone</span>
              <span>حالياً يمكن إرسال رابط واجهة الجوال من تبويب "روابط النماذج".</span>
            </div>
          )}

          {/* رسالة الحارس */}
          {role === 'حارس' && (
            <div style={infoBannerStyle('#dcfce7', '#15803d', '#bbf7d0')}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>smartphone</span>
              <span>يمكن إرسال رابط واجهة الجوال للحارس من تبويب "روابط النماذج".</span>
            </div>
          )}

          {/* اختيار الفصول */}
          {needsClasses && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={labelStyle}>الفصول المسندة</label>
                {availableClasses.length > 0 && (
                  <button onClick={selectAllClasses} style={{ fontSize: 12, color: '#4f46e5', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {selectedClasses.length === availableClasses.length ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                )}
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', maxHeight: 220, overflowY: 'auto' }}>
                {availableClasses.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', margin: 0 }}>لم يتم إعداد هيكل المدرسة بعد</p>
                ) : (
                  <SmartClassesGrid
                    classes={availableClasses}
                    stages={stages}
                    selectedClasses={selectedClasses}
                    takenByMap={takenByMap}
                    isExclusive={isExclusive}
                    onToggle={toggleClass}
                    onSelectStage={selectStage}
                    onSelectGrade={selectGrade}
                  />
                )}
              </div>
              {selectedClasses.length === 0 && availableClasses.length > 0 && (
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '6px 0 0' }}>إذا لم تحدد فصولاً سيكون للعضو صلاحية على جميع الفصول</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>إلغاء</button>
          <button onClick={handleSave} disabled={saving || !role} style={{
            padding: '10px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: (saving || !role) ? 0.6 : 1,
          }}>
            {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Smart Classes Grid — اختيار هرمي مع التنبيهات
// ============================================================
interface SmartClassesGridProps {
  classes: ClassItem[];
  stages: StageConfigData[];
  selectedClasses: string[];
  takenByMap: Record<string, string>;
  isExclusive: boolean;
  onToggle: (key: string) => void;
  onSelectStage: (stageId: string) => void;
  onSelectGrade: (stageId: string, gradeLabel: string) => void;
}

const SmartClassesGrid: React.FC<SmartClassesGridProps> = ({ classes, stages, selectedClasses, takenByMap, isExclusive, onToggle, onSelectStage, onSelectGrade }) => {
  // Group by stage then grade
  const grouped: Record<string, Record<string, ClassItem[]>> = {};
  classes.forEach(c => {
    if (!grouped[c.stageId]) grouped[c.stageId] = {};
    if (!grouped[c.stageId][c.gradeLabel]) grouped[c.stageId][c.gradeLabel] = [];
    grouped[c.stageId][c.gradeLabel].push(c);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Object.entries(grouped).map(([stageId, grades]) => {
        const stageInfo = SETTINGS_STAGES.find(s => s.id === stageId);
        const stageClasses = classes.filter(c => c.stageId === stageId);
        const allStageSelected = stageClasses.every(c => selectedClasses.includes(c.key));
        return (
          <div key={stageId}>
            {/* Stage header */}
            <button onClick={() => onSelectStage(stageId)} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
              cursor: 'pointer', fontWeight: 700, fontSize: 13, color: '#4f46e5', marginBottom: 8, padding: 0,
            }}>
              <input type="checkbox" checked={allStageSelected} readOnly style={{ pointerEvents: 'none' }} />
              {stageInfo?.name || stageId}
            </button>

            {Object.entries(grades).map(([gradeLabel, items]) => {
              const allGradeSelected = items.every(c => selectedClasses.includes(c.key));
              return (
                <div key={gradeLabel} style={{ marginBottom: 6, marginRight: 16 }}>
                  {/* Grade header */}
                  <button onClick={() => onSelectGrade(stageId, gradeLabel)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 4, padding: 0,
                  }}>
                    <input type="checkbox" checked={allGradeSelected} readOnly style={{ pointerEvents: 'none' }} />
                    {gradeLabel}
                  </button>

                  {/* Classes */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginRight: 20 }}>
                    {items.map(item => {
                      const selected = selectedClasses.includes(item.key);
                      const takenBy = takenByMap[item.key];
                      const blocked = isExclusive && !!takenBy && !selected;
                      return (
                        <label key={item.key} title={takenBy ? `مرتبط بـ ${takenBy}` : ''} style={{
                          display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                          borderRadius: 6, cursor: blocked ? 'not-allowed' : 'pointer', fontSize: 12,
                          background: selected ? '#dbeafe' : blocked ? '#f3f4f6' : '#fff',
                          border: `1px solid ${selected ? '#93c5fd' : blocked ? '#e5e7eb' : '#d1d5db'}`,
                          opacity: blocked ? 0.5 : 1, position: 'relative',
                        }}>
                          <input type="checkbox" checked={selected} disabled={blocked}
                            onChange={() => { if (!blocked) onToggle(item.key); }}
                            style={{ cursor: blocked ? 'not-allowed' : 'pointer' }} />
                          <span>{item.label}</span>
                          {/* تنبيه للإداري/الحارس */}
                          {!isExclusive && takenBy && !selected && (
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>({takenBy})</span>
                          )}
                          {/* تنبيه حجز للوكيل/الموجه */}
                          {blocked && (
                            <span style={{ fontSize: 10, color: '#dc2626' }}>({takenBy})</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// Styles
// ============================================================
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box', fontSize: 14 };
const selectStyle: React.CSSProperties = { width: '100%', height: 42, padding: '0 12px', border: '2px solid #d1d5db', borderRadius: 10, background: '#fff', boxSizing: 'border-box', fontSize: 14 };

const infoBannerStyle = (bg: string, color: string, border: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
  background: bg, color, borderRadius: 10, border: `1px solid ${border}`,
  fontSize: 13, marginBottom: 16, lineHeight: 1.6,
});

export default AdminsTab;
