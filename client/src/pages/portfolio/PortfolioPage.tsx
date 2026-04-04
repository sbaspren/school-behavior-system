import React, { useState, useEffect } from 'react';
import PageHero from '../../components/shared/PageHero';
import TabBar from '../../components/shared/TabBar';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import MI from '../../components/shared/MI';
import { useAppContext } from '../../hooks/useAppContext';
import { getHijriDate } from '../../hooks/usePageData';
import { toIndic } from '../../utils/printUtils';
import { portfolioApi, CompletionData } from '../../api/portfolio';
import CommitteesTab from './CommitteesTab';
import CompletionDashboard from './CompletionDashboard';
import { ReportsHub } from './reports';
import GeneralFormsPage from '../GeneralFormsPage';
import DefinitionsSection from './sections/DefinitionsSection';
import IndicatorsSection from './sections/IndicatorsSection';
import ProceduresSection from './sections/ProceduresSection';
import CommitteeTasksSection from './sections/CommitteeTasksSection';
import GuideSection from './sections/GuideSection';
import TreatmentSection from './sections/TreatmentSection';
import RequiredRecordsSection from './sections/RequiredRecordsSection';
import EvidenceFormsSection from './sections/EvidenceFormsSection';

type TabType = 'portfolio' | 'reports' | 'forms' | 'committees';

interface SectionItem {
  id: string;
  number: string;
  title: string;
  icon: string;
  component: React.ReactNode;
}

const PortfolioPage: React.FC = () => {
  const { schoolSettings, loading } = useAppContext();
  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    portfolioApi.getCompletion().then(setCompletionData).catch(() => {});
  }, []);

  if (loading) return <LoadingSpinner />;

  const summary = completionData?.summary;

  const sections: SectionItem[] = [
    { id: 'definitions', number: '١', title: 'التعريف والمهمة', icon: 'person_pin', component: <DefinitionsSection /> },
    { id: 'indicators', number: '٢', title: 'المعايير والمؤشرات والشواهد', icon: 'analytics', component: <IndicatorsSection /> },
    { id: 'procedures', number: '٣', title: 'لجنة الانضباط وإجراءات العمل', icon: 'gavel', component: <ProceduresSection /> },
    { id: 'tasks', number: '٤', title: 'مهام اللجان في تعزيز الانضباط', icon: 'groups', component: <CommitteeTasksSection /> },
    { id: 'guide', number: '٥', title: 'الدليل الإجرائي للغياب والتأخر', icon: 'menu_book', component: <GuideSection /> },
    { id: 'treatment', number: '٦', title: 'برامج العلاج والنماذج الرسمية', icon: 'healing', component: <TreatmentSection /> },
    { id: 'records', number: '٧', title: 'السجلات المطلوبة لكل مؤشر', icon: 'checklist', component: <RequiredRecordsSection completionData={completionData ?? undefined} /> },
    { id: 'evidence', number: '٨', title: 'نماذج الشواهد المستخدمة', icon: 'description', component: <EvidenceFormsSection /> },
  ];

  return (
    <div className="sec-portfolio">
      <PageHero
        title="ملف الإنجاز"
        subtitle={getHijriDate()}
        gradient="linear-gradient(135deg, #1B3A6B, #2E5FA3)"
        stats={[
          { icon: 'verified', label: 'نسبة الاكتمال', value: summary?.overallPercentage ?? 0, color: '#10b981' },
          { icon: 'groups', label: 'اجتماعات اللجان', value: summary?.totalMeetings ?? 0, color: '#f59e0b' },
          { icon: 'print', label: 'شواهد جاهزة', value: summary?.readyEvidence ?? 0, color: '#8b5cf6' },
        ]}
      />

      <TabBar
        tabs={[
          { id: 'portfolio', label: 'ملف الإنجاز', icon: 'folder_special' },
          { id: 'reports', label: 'التقارير', icon: 'bar_chart' },
          { id: 'forms', label: 'النماذج', icon: 'description' },
          { id: 'committees', label: 'اللجان', icon: 'groups' },
        ]}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        sectionColor="#1B3A6B"
      />

      {activeTab === 'portfolio' && (
        <div>
          {/* لوحة الاكتمال */}
          <CompletionDashboard />

          {/* أقسام الملف */}
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: '#1B3A6B',
              marginBottom: 12, paddingRight: 8, borderRight: '3px solid #1B3A6B',
            }}>
              أقسام ملف الإنجاز
            </div>

            {sections.map((sec) => {
              const isExpanded = expandedSection === sec.id;
              return (
                <div key={sec.id} style={{
                  background: '#fff', borderRadius: 10, marginBottom: 8,
                  border: '1px solid #e5e7eb', overflow: 'hidden',
                  boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
                }}>
                  {/* Section Header - Clickable */}
                  <div
                    onClick={() => setExpandedSection(isExpanded ? null : sec.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                      cursor: 'pointer', userSelect: 'none',
                      background: isExpanded ? '#f0f4fb' : '#fff',
                      transition: 'background .2s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: '#1B3A6B', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, flexShrink: 0,
                    }}>
                      {sec.number}
                    </div>
                    <MI n={sec.icon} s={22} c="#1B3A6B" />
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1B3A6B' }}>
                      القسم {sec.number}: {sec.title}
                    </span>
                    <MI n={isExpanded ? 'expand_less' : 'expand_more'} s={22} c="#9ca3af" />
                  </div>

                  {/* Section Content */}
                  {isExpanded && (
                    <div style={{ padding: '0 16px 20px', borderTop: '1px solid #e5e7eb' }}>
                      {sec.component}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'reports' && <ReportsHub />}

      {activeTab === 'forms' && <GeneralFormsPage />}

      {activeTab === 'committees' && <CommitteesTab />}
    </div>
  );
};

export default PortfolioPage;
