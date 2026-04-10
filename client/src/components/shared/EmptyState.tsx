import React from 'react';

interface Props {
  icon: string;        // Material Symbols icon name
  title: string;
  description?: string;
}

/**
 * EmptyState — حالة فارغة موحدة
 * مربع أبيض + أيقونة رمادية كبيرة + عنوان + وصف اختياري
 */
const EmptyState: React.FC<Props> = ({ icon, title, description }) => {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      padding: '48px 20px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: 8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: '#d1d5db' }}>{icon}</span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 6, margin: '0 0 6px' }}>{title}</h3>
      {description && <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{description}</p>}
    </div>
  );
};

export default EmptyState;
