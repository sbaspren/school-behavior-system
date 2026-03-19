import { useState } from 'react';
import { licensesApi } from '../api/licenses';
import { showError, showSuccess } from '../components/shared/Toast';
import { AuthUser } from './LoginPage';

interface Props {
  onSetupComplete: (token: string, user: AuthUser) => void;
}

const SetupPage: React.FC<Props> = ({ onSetupComplete }) => {
  const [code, setCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) return showError('كود التفعيل مطلوب');
    if (!adminName.trim()) return showError('اسم المدير مطلوب');
    if (!adminPhone.trim() || !/^05\d{8}$/.test(adminPhone.trim()))
      return showError('رقم الجوال غير صحيح (05XXXXXXXX)');
    if (!password || password.length < 6)
      return showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    if (password !== confirmPassword)
      return showError('كلمة المرور غير متطابقة');

    setLoading(true);
    try {
      const res = await licensesApi.activate({
        code: code.trim(),
        adminName: adminName.trim(),
        adminPhone: adminPhone.trim(),
        password,
        schoolName: schoolName.trim() || undefined,
      });
      if (res.data?.success && res.data.data) {
        const { token, user } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        showSuccess(res.data.message || 'تم تفعيل النظام بنجاح!');
        onSetupComplete(token, user);
      } else {
        showError(res.data?.message || 'فشل التفعيل');
      }
    } catch {
      showError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0891b2 100%)',
      direction: 'rtl', padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '40px 36px',
        width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px', height: '64px', background: '#059669', borderRadius: '16px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', marginBottom: '16px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>key</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: '0 0 4px' }}>
            تفعيل نظام شؤون الطلاب
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            أدخل كود التفعيل وبيانات المدير لبدء استخدام النظام
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Activation Code */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>كود التفعيل</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="SCH-2026-XXXX-XXXX"
              style={{ ...inputStyle, direction: 'ltr', textAlign: 'center', letterSpacing: '2px', fontWeight: 700 }}
            />
          </div>

          {/* School Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>اسم المدرسة</label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="مثال: مدرسة المعرفة المتوسطة"
              style={inputStyle}
            />
          </div>

          {/* Admin Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>اسم المدير</label>
            <input
              type="text"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              placeholder="الاسم الكامل"
              style={inputStyle}
            />
          </div>

          {/* Admin Phone */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>رقم جوال المدير</label>
            <input
              type="tel"
              value={adminPhone}
              onChange={e => setAdminPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              style={{ ...inputStyle, direction: 'ltr', textAlign: 'right' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="6 أحرف على الأقل"
              style={inputStyle}
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>تأكيد كلمة المرور</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', background: '#059669', color: '#fff',
              border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'جاري التفعيل...' : 'تفعيل النظام'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
          نظام شؤون الطلاب - الإصدار 2.0
        </p>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', border: '2px solid #d1d5db',
  borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box',
};

export default SetupPage;
