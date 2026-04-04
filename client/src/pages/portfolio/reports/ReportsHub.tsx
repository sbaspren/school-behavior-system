import React, { useState } from 'react';
import TabBar from '../../../components/shared/TabBar';
import ViolationsReport from './ViolationsReport';
import AbsenceReport from './AbsenceReport';
import TardinessReport from './TardinessReport';
import PermissionsReport from './PermissionsReport';
import NotesReport from './NotesReport';
import CommunicationReport from './CommunicationReport';
import BehaviorReport from './BehaviorReport';

const reportTabs = [
  { id: 'violations', label: 'المخالفات', icon: 'gavel' },
  { id: 'absence', label: 'الغياب', icon: 'event_busy' },
  { id: 'tardiness', label: 'التأخر', icon: 'schedule' },
  { id: 'permissions', label: 'الاستئذان', icon: 'exit_to_app' },
  { id: 'notes', label: 'الملاحظات', icon: 'sticky_note_2' },
  { id: 'communication', label: 'التواصل', icon: 'chat' },
  { id: 'behavior', label: 'السلوك الإيجابي', icon: 'thumb_up' },
];

const SECTION_COLOR = '#1B3A6B';

const ReportsHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState('violations');

  const renderReport = () => {
    switch (activeTab) {
      case 'violations': return <ViolationsReport />;
      case 'absence': return <AbsenceReport />;
      case 'tardiness': return <TardinessReport />;
      case 'permissions': return <PermissionsReport />;
      case 'notes': return <NotesReport />;
      case 'communication': return <CommunicationReport />;
      case 'behavior': return <BehaviorReport />;
      default: return null;
    }
  };

  return (
    <div style={{ direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
      <TabBar
        tabs={reportTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sectionColor={SECTION_COLOR}
      />
      <div style={{ marginTop: 12 }}>
        {renderReport()}
      </div>
    </div>
  );
};

export default ReportsHub;
