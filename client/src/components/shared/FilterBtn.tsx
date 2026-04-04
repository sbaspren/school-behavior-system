import React from 'react';

interface FilterBtnProps {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}

const FilterBtn: React.FC<FilterBtnProps> = ({ label, count, active, onClick, color = '#4f46e5' }) => (
  <button onClick={onClick} style={{
    padding: '6px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 700,
    background: active ? '#fff' : 'transparent',
    color: active ? color : '#6b7280',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    border: 'none', cursor: 'pointer',
  }}>
    {label}
    {count !== undefined && <span style={{ fontSize: '12px', color: active ? color : '#9ca3af' }}> ({count})</span>}
  </button>
);

export default FilterBtn;
