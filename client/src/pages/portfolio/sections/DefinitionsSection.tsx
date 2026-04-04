import React from 'react';
import { toIndic } from '../../../utils/printUtils';

const sectionTitle: React.CSSProperties = {
  fontSize: 16, fontWeight: 800, color: '#1B3A6B', textAlign: 'center',
  paddingBottom: 7, marginBottom: 14, marginTop: 6,
  borderBottom: '2pt solid #1B3A6B',
};
const h2Style: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: '#1B3A6B',
  margin: '12px 0 6px', paddingRight: 8, borderRight: '3px solid #1B3A6B',
};
const thStyle: React.CSSProperties = {
  background: '#E8ECF2', color: '#1B3A6B', padding: '6px 10px',
  fontSize: 12, fontWeight: 700, textAlign: 'right', border: '0.5px solid #C5CFE0',
};
const tdStyle: React.CSSProperties = {
  padding: '5px 10px', fontSize: 12, textAlign: 'right',
  border: '0.5px solid #C5CFE0', verticalAlign: 'top',
  wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal',
};
const numCell: React.CSSProperties = {
  background: '#1B3A6B', color: '#fff', fontWeight: 700,
  textAlign: 'center', whiteSpace: 'nowrap', width: 18,
};

const tasks = [
  'إعداد وثيقة إجراءات الانضباط المدرسي وإعلانها',
  'متابعة الحضور والغياب يومياً وتوثيق المخالفات',
  'تنفيذ برامج التواصل مع أسر الطلاب',
  'تزويد الأسر ببيانات أبنائهم الأكاديمية والسلوكية',
  'تطبيق إجراءات حماية حقوق المتعلمين',
  'نشر قواعد السلوك والتأكد من معرفة جميع الطلاب بها',
  'تكريم الطلاب المنضبطين والمتميزين سلوكياً',
  'التنسيق مع الموجه الطلابي لمعالجة الحالات السلوكية',
  'توثيق جميع الإجراءات والسجلات في الأنظمة المعتمدة',
  'إعداد التقارير الدورية ورفعها لمدير المدرسة',
];

export default function DefinitionsSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>القسم الأول — التعريف والمهمة</div>

      {/* ١-١ تعريف وكيل شؤون الطلاب */}
      <div style={h2Style}>{toIndic(1)}-{toIndic(1)} تعريف وكيل شؤون الطلاب</div>
      <div style={{
        background: '#EFF3F9', border: '1.5px solid #1B3A6B', borderRadius: 8,
        padding: '10px 14px', margin: '8px 0', fontSize: 12, lineHeight: 1.9,
      }}>
        <div style={{ fontWeight: 700, color: '#1B3A6B', marginBottom: 6 }}>
          وكيل شؤون الطلاب هو القائد المسؤول عن تعزيز الانضباط المدرسي والبيئة التعليمية الآمنة، ويعمل على ثلاثة محاور:
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            'متابعة الحضور والغياب والانضباط السلوكي',
            'التواصل مع أولياء الأمور وإشراكهم في العملية التعليمية',
            'حماية حقوق المتعلمين وتعزيز القيم الإيجابية',
          ].map((t, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 160, background: '#fff', border: '1px solid #C5CFE0',
              borderRadius: 6, padding: '6px 10px', textAlign: 'center', fontSize: 11,
            }}>
              <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{toIndic(i + 1)}. </span>{t}
            </div>
          ))}
        </div>
      </div>

      {/* ملاحظة */}
      <div style={{
        background: '#FFF8E1', border: '1.5px solid #B8860B', borderRadius: 8,
        padding: '8px 14px', margin: '8px 0', fontSize: 12, color: '#7A5C00',
        fontWeight: 600,
      }}>
        ملاحظة: وكيل شؤون الطلاب مسؤول عن {toIndic(4)} مؤشرات من أصل {toIndic(46)} مؤشراً في بطاقة الأداء الإشرافي
      </div>

      {/* ١-٢ مهام وكيل شؤون الطلاب */}
      <div style={h2Style}>{toIndic(1)}-{toIndic(2)} مهام وكيل شؤون الطلاب</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, ...numCell, background: '#1B3A6B', color: '#fff' }}>م</th>
            <th style={thStyle}>المهمة</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#F7F9FC' : '#fff' }}>
              <td style={{ ...tdStyle, ...numCell }}>{toIndic(i + 1)}</td>
              <td style={tdStyle}>{task}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
