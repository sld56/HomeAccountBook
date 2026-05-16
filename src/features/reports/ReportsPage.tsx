import { useState } from 'react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { FamilyOverview } from './tabs/FamilyOverview';
import { MonthlyCompare } from './tabs/MonthlyCompare';
import { Yearly } from './tabs/Yearly';

const TABS = [
  { value: 'family', label: '가족 통합' },
  { value: 'monthly', label: '월별 비교' },
  { value: 'yearly', label: '연간 정리' },
];

export function ReportsPage() {
  const [tab, setTab] = useState('family');
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">리포트</h1>
          <div className="page-greet">가족 가계 분석과 흐름</div>
        </div>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </header>
      <TabPanel active={tab === 'family'}>
        <FamilyOverview />
      </TabPanel>
      <TabPanel active={tab === 'monthly'}>
        <MonthlyCompare />
      </TabPanel>
      <TabPanel active={tab === 'yearly'}>
        <Yearly />
      </TabPanel>
    </>
  );
}
