interface Props {
  onLogout: () => void;
}

const SubscriptionExpiredPage: React.FC<Props> = ({ onLogout }) => {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f97316 100%)',
      direction: 'rtl', padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px', padding: '48px 40px',
        width: '100%', maxWidth: '460px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', background: '#fef2f2', borderRadius: '50%',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#dc2626' }}>
            schedule
          </span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
          انتهى اشتراكك
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', margin: '0 0 24px', lineHeight: '1.7' }}>
          انتهت صلاحية اشتراكك في نظام شؤون الطلاب.
          <br />
          تواصل مع الدعم لتجديد الاشتراك والمتابعة.
        </p>

        <div style={{
          background: '#f8fafc', borderRadius: '12px', padding: '16px',
          marginBottom: '24px', border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            للتجديد تواصل عبر الواتساب أو الجوال
          </p>
        </div>

        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '14px', background: '#f1f5f9', color: '#475569',
            border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          تسجيل الخروج
        </button>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '20px' }}>
          نظام شؤون الطلاب - الإصدار 2.0
        </p>
      </div>
    </div>
  );
};

export default SubscriptionExpiredPage;
