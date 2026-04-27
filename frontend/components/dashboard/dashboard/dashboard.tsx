/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import UnifiedDashboardCard from './dashboard-combined'
import { useDashboardStore } from '@/services/utils/dashboard/dashboard/dashboard-data-store'

interface DashboardProps {
  dashboardId: string
  title?: string
  timeRange?: string
}

// ─── Error boundary: if anything in the dashboard crashes, show a soft message
interface EBState { hasError: boolean }
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  EBState
> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.warn("[DashboardErrorBoundary] caught error:", err?.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-10 px-6 text-slate-500 text-sm">
          <span>Dashboard could not be displayed. Please try again.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// A high-level component that fetches dashboard data and renders the combined view
export const Dashboard: React.FC<DashboardProps> = ({
  dashboardId,
  title = "Dashboard Overview",
  timeRange,
}) => {
  const data = useDashboardStore((state) => state.dashboards[dashboardId])

  return (
    <DashboardErrorBoundary>
      <UnifiedDashboardCard
        dashboardTitle={title}
        timeRange={timeRange}
        metrics={data?.metricData || []}
        chartOptions={data?.chartOptionsData || []}
        tableData={data?.tableData || []}
        insights={data?.insightsData || []}
        isLoading={false}
      />
    </DashboardErrorBoundary>
  )
}
