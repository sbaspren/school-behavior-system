import React from 'react';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// ═══════ Types ═══════
interface DashboardChartsProps {
  today: {
    absence: number; tardiness: number; permissions: number;
    violations: number; notes: number; pendingExcuses: number;
  };
  stageStats: Record<string, {
    absence: number; tardiness: number; permissions: number;
    violations: number; notes: number;
  }>;
  semesterTotals: { violations: number; absence: number; permissions: number; tardiness: number };
  violationsByDegree?: { degree: number; count: number }[];
}

// ═══════ Constants ═══════
const TODAY_LABELS = ['غياب', 'تأخر', 'استئذان', 'مخالفات', 'ملاحظات'];
const TODAY_COLORS = ['#f97316', '#ef4444', '#8b5cf6', '#3b82f6', '#22c55e'];

const DEGREE_LABELS = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة'];
const DEGREE_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#991b1b'];

const BAR_LABELS_AR: Record<string, string> = {
  absence: 'غياب',
  tardiness: 'تأخر',
  violations: 'مخالفات',
};
const BAR_COLORS = { absence: '#f97316', tardiness: '#ef4444', violations: '#3b82f6' };

const STAGE_NAMES_AR: Record<string, string> = {
  Intermediate: 'المتوسطة',
  Secondary: 'الثانوية',
  Primary: 'الابتدائية',
  Kindergarten: 'رياض الأطفال',
};

// ═══════ Shared styles ═══════
const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: 16,
  textAlign: 'center',
};

// ═══════ Doughnut center text plugin ═══════
const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart: any) {
    const { ctx, width, height } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || meta.data.length === 0) return;
    const dataset = chart.data.datasets[0];
    if (!dataset) return;
    const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
    ctx.save();
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), width / 2, height / 2 - 6);
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('الإجمالي', width / 2, height / 2 + 14);
    ctx.restore();
  },
};

// ═══════ Chart 1: Today Stats Doughnut ═══════
const TodayDoughnut: React.FC<{ today: DashboardChartsProps['today'] }> = ({ today }) => {
  const values = [today.absence, today.tardiness, today.permissions, today.violations, today.notes];
  const allZero = values.every(v => v === 0);

  const data = {
    labels: TODAY_LABELS,
    datasets: [{
      data: allZero ? [1] : values,
      backgroundColor: allZero ? ['#e2e8f0'] : TODAY_COLORS,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: {
        display: !allZero,
        position: 'bottom' as const,
        rtl: true,
        labels: {
          font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
          color: '#475569',
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        enabled: !allZero,
        rtl: true,
        titleFont: { family: 'system-ui, -apple-system, sans-serif' },
        bodyFont: { family: 'system-ui, -apple-system, sans-serif' },
        callbacks: {
          label: (ctx: any) => `${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>إحصائيات اليوم</div>
      <div style={{ width: '100%', maxWidth: 260, position: 'relative' }}>
        <Doughnut data={data} options={options} plugins={allZero ? [] : [centerTextPlugin]} />
      </div>
      {allZero && (
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>لا توجد بيانات اليوم</div>
      )}
    </div>
  );
};

// ═══════ Chart 2: Stage Comparison Bar ═══════
const StageComparisonBar: React.FC<{ stageStats: DashboardChartsProps['stageStats'] }> = ({ stageStats }) => {
  const stageKeys = Object.keys(stageStats);

  if (stageKeys.length === 0) {
    return (
      <div style={cardStyle}>
        <div style={titleStyle}>مقارنة المراحل</div>
        <div style={{ color: '#94a3b8', fontSize: 13, padding: 40 }}>لا توجد بيانات</div>
      </div>
    );
  }

  const stageLabels = stageKeys.map(k => STAGE_NAMES_AR[k] || k);
  const metrics: (keyof typeof BAR_COLORS)[] = ['absence', 'tardiness', 'violations'];

  const data = {
    labels: stageLabels,
    datasets: metrics.map(metric => ({
      label: BAR_LABELS_AR[metric],
      data: stageKeys.map(k => stageStats[k][metric]),
      backgroundColor: BAR_COLORS[metric],
      borderRadius: 6,
      borderSkipped: false as const,
      maxBarThickness: 40,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: true,
        labels: {
          font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
          color: '#475569',
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        rtl: true,
        titleFont: { family: 'system-ui, -apple-system, sans-serif' },
        bodyFont: { family: 'system-ui, -apple-system, sans-serif' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
          color: '#64748b',
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 11, family: 'system-ui, -apple-system, sans-serif' },
          color: '#94a3b8',
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>مقارنة المراحل</div>
      <div style={{ width: '100%' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

// ═══════ Chart 3: Violations by Degree Doughnut ═══════
const ViolationsByDegreeDoughnut: React.FC<{ violationsByDegree?: { degree: number; count: number }[] }> = ({ violationsByDegree }) => {
  const degreeData = [1, 2, 3, 4, 5].map(d => {
    const found = violationsByDegree?.find(v => v.degree === d);
    return found ? found.count : 0;
  });
  const allZero = degreeData.every(v => v === 0);

  const data = {
    labels: DEGREE_LABELS,
    datasets: [{
      data: allZero ? [1] : degreeData,
      backgroundColor: allZero ? ['#e2e8f0'] : DEGREE_COLORS,
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: {
        display: !allZero,
        position: 'bottom' as const,
        rtl: true,
        labels: {
          font: { size: 12, family: 'system-ui, -apple-system, sans-serif' },
          color: '#475569',
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        enabled: !allZero,
        rtl: true,
        titleFont: { family: 'system-ui, -apple-system, sans-serif' },
        bodyFont: { family: 'system-ui, -apple-system, sans-serif' },
        callbacks: {
          label: (ctx: any) => `الدرجة ${ctx.label}: ${ctx.parsed}`,
        },
      },
    },
  };

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>المخالفات حسب الدرجة</div>
      <div style={{ width: '100%', maxWidth: 260, position: 'relative' }}>
        <Doughnut data={data} options={options} plugins={allZero ? [] : [centerTextPlugin]} />
      </div>
      {allZero && (
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>لا توجد مخالفات مسجلة</div>
      )}
    </div>
  );
};

// ═══════ Main Component ═══════
const DashboardCharts: React.FC<DashboardChartsProps> = ({
  today, stageStats, semesterTotals, violationsByDegree,
}) => {
  return (
    <>
      <style>{`
        .dashboard-charts-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          width: 100%;
        }
        @media (max-width: 900px) {
          .dashboard-charts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <div className="dashboard-charts-grid" dir="rtl">
        <TodayDoughnut today={today} />
        <StageComparisonBar stageStats={stageStats} />
        <ViolationsByDegreeDoughnut violationsByDegree={violationsByDegree} />
      </div>
    </>
  );
};

export default DashboardCharts;
