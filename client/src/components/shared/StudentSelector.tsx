import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { studentsApi } from '../../api/students';

export interface StudentOption {
  id: number;
  studentNumber: string;
  name: string;
  stage: string;
  grade: string;
  className: string;
  mobile?: string;
}

interface StudentSelectorProps {
  /** Filter students by stage id (optional) */
  stageFilter?: string;
  /** Called whenever selection changes */
  onSelectionChange: (students: StudentOption[]) => void;
  /** Accent color for "select all" button */
  accentColor?: string;
  /** Accent background for selected items */
  accentBg?: string;
}

/**
 * StudentSelector — المكون المشترك لاختيار الطلاب
 * صف → فصل → قائمة checkboxes + بحث + تحديد الكل + عداد
 */
const StudentSelector: React.FC<StudentSelectorProps> = ({
  stageFilter,
  onSelectionChange,
  accentColor = '#4f46e5',
  accentBg = '#f0fdf4',
}) => {
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    studentsApi.getAll().then((res) => {
      if (res.data?.data) setAllStudents(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  // Filter by stage if provided
  const stageStudents = useMemo(() => {
    if (!stageFilter) return allStudents;
    return allStudents.filter((s) => s.stage === stageFilter);
  }, [allStudents, stageFilter]);

  // Available grades
  const grades = useMemo(() =>
    Array.from(new Set(stageStudents.map((s) => s.grade))).sort((a, b) => a.localeCompare(b, 'ar')),
    [stageStudents]
  );

  // Available classes for selected grade
  const classes = useMemo(() => {
    if (!selectedGrade) return [];
    return Array.from(new Set(
      stageStudents.filter((s) => s.grade === selectedGrade).map((s) => s.className)
    )).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [stageStudents, selectedGrade]);

  // Students in selected grade+class
  const classStudents = useMemo(() => {
    if (!selectedGrade || !selectedClass) return [];
    return stageStudents
      .filter((s) => s.grade === selectedGrade && s.className === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [stageStudents, selectedGrade, selectedClass]);

  // Filtered by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.trim().toLowerCase();
    return classStudents.filter((s) =>
      s.name.toLowerCase().includes(q) || s.studentNumber.includes(q)
    );
  }, [classStudents, searchQuery]);

  // Notify parent on selection change
  const updateSelection = useCallback((newIds: Set<number>) => {
    setSelectedIds(newIds);
    const selected = allStudents.filter((s) => newIds.has(s.id));
    onSelectionChange(selected);
  }, [allStudents, onSelectionChange]);

  const handleGradeChange = (g: string) => {
    setSelectedGrade(g);
    setSelectedClass('');
    setSearchQuery('');
    updateSelection(new Set());
  };

  const handleClassChange = (c: string) => {
    setSelectedClass(c);
    setSearchQuery('');
    updateSelection(new Set());
  };

  const toggleStudent = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    updateSelection(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === classStudents.length && selectedIds.size > 0) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(classStudents.map((s) => s.id)));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 14 }}>جاري تحميل الطلاب...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Grade + Class */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>الصف *</label>
          <select
            value={selectedGrade}
            onChange={(e) => handleGradeChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">اختر الصف</option>
            {grades.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>الفصل *</label>
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={!selectedGrade}
            style={{ ...selectStyle, background: selectedGrade ? '#fff' : '#f9fafb' }}
          >
            <option value="">اختر الفصل</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Students header: label + select all + counter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ ...labelStyle, margin: 0 }}>الطلاب *</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {classStudents.length > 0 && (
            <>
              <button
                type="button"
                onClick={toggleAll}
                style={{
                  fontSize: 11, padding: '3px 12px', borderRadius: 6,
                  border: 'none', cursor: 'pointer', fontWeight: 700,
                  fontFamily: 'inherit',
                  background: accentBg, color: accentColor,
                }}
              >
                {selectedIds.size === classStudents.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {selectedIds.size} / {classStudents.length} محدد
              </span>
            </>
          )}
        </div>
      </div>

      {/* Search */}
      {classStudents.length > 0 && (
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الطالب..."
          style={{
            ...selectStyle, height: 36, fontSize: 13,
            padding: '0 12px',
          }}
        />
      )}

      {/* Student list */}
      <div style={{
        border: '1px solid #e5e7eb', borderRadius: 8,
        maxHeight: 180, overflowY: 'auto',
        background: '#fff',
      }}>
        {classStudents.length === 0 ? (
          <div style={{
            padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14,
          }}>
            {!selectedGrade ? 'اختر الصف والفصل أولاً' : !selectedClass ? 'اختر الفصل' : 'لا يوجد طلاب'}
          </div>
        ) : (
          filteredStudents.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              لا توجد نتائج للبحث
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isSelected = selectedIds.has(s.id);
              return (
                <label
                  key={s.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', cursor: 'pointer',
                    borderBottom: '1px solid #f3f4f6',
                    background: isSelected ? accentBg : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleStudent(s.id)}
                    style={{ width: 16, height: 16, accentColor }}
                  />
                  <span style={{ fontSize: 14, fontWeight: isSelected ? 700 : 400 }}>{s.name}</span>
                  <span style={{
                    marginRight: 'auto', fontSize: 11, color: '#9ca3af',
                  }}>
                    {s.grade} ({s.className})
                  </span>
                </label>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

// Shared styles
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 14, fontWeight: 700,
  color: '#374151', marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 12px',
  border: '2px solid #d1d5db', borderRadius: 10,
  fontSize: 14, fontFamily: 'inherit', background: '#fff',
  boxSizing: 'border-box',
};

export default StudentSelector;
