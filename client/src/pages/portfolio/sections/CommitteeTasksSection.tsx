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

const guidanceTasks = [
  'دراسة الحالات السلوكية المحالة من وكيل شؤون الطلاب واقتراح الحلول المناسبة',
  'متابعة الطلاب المتكرر غيابهم وإعداد خطط علاجية فردية لهم',
  'تنفيذ برامج إرشادية وقائية لتعزيز السلوك الإيجابي',
  'التواصل مع أولياء أمور الطلاب ذوي المشكلات السلوكية وعقد لقاءات معهم',
  'إعداد تقارير دورية عن الحالات السلوكية والإجراءات المتخذة',
  'المشاركة في اجتماعات لجنة الانضباط المدرسي وتقديم التوصيات',
  'تنفيذ برامج توعوية للطلاب عن حقوقهم وواجباتهم',
  'التنسيق مع الجهات المختصة في الحالات التي تتطلب تدخلاً خارجياً',
];

const academicTasks = [
  'متابعة المستوى التحصيلي للطلاب وتحديد حالات التأخر الدراسي',
  'إعداد خطط علاجية للطلاب المتأخرين دراسياً بالتنسيق مع المعلمين',
  'تنفيذ برامج تحسين التحصيل الدراسي وقياس أثرها',
  'إعداد تقارير دورية عن المستوى التحصيلي ورفعها لمدير المدرسة',
  'التنسيق مع أولياء الأمور لمتابعة المستوى الأكاديمي لأبنائهم',
  'تحليل نتائج الاختبارات واقتراح خطط التحسين',
];

function TaskTable({ tasks }: { tasks: string[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6, marginBottom: 14 }}>
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
  );
}

export default function CommitteeTasksSection() {
  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <div style={sectionTitle}>القسم الرابع — مهام اللجان</div>

      <div style={h2Style}>{toIndic(4)}-{toIndic(1)} مهام لجنة التوجيه الطلابي</div>
      <TaskTable tasks={guidanceTasks} />

      <div style={h2Style}>{toIndic(4)}-{toIndic(2)} مهام لجنة التحصيل الدراسي</div>
      <TaskTable tasks={academicTasks} />
    </div>
  );
}
