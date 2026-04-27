import React from 'react';
import UnifiedChartCard from './chartanalytics';
import { useGeneratedChartDataStore } from '@/services/utils/dashboard/chart/generated-chart-data-store';
import { useChartAnalyticsStore } from '@/services/utils/dashboard/chart/chart-analytics-store';

/**
 * Definition of props injected into the localized Chart component.
 */
interface ChartProps {
  chartId: string;
}

/**
 * A wrapper component designed to fetch pre-calculated chart configurations and insights
 * from the global Zustand scopes (the Data Store and Analytics Store), and pass them down 
 * cohesively to the underlying rendering component (`UnifiedChartCard`).
 * 
 * @param {ChartProps} props - Unique identifier for fetching the correct chart instance data.
 * @returns {React.JSX.Element} The composed ECharts component populated with fetched parameters.
 */
export const Chart: React.FC<ChartProps> = ({ chartId }) => {
  const { getChart } = useGeneratedChartDataStore();
  const { getAnalytics } = useChartAnalyticsStore();
  
  const chartData = getChart(chartId);
  const analyticsData = getAnalytics(chartId);

  return (
    <UnifiedChartCard
      chartId={chartId}
      title={chartData?.title}
      description={chartData?.description || ''}
      timeRange={chartData?.timeRange || ''}
      yearOverYearGrowth={chartData?.yearOverYearGrowth || ''}
      sqlQuery={chartData?.sqlQuery || ''}
      chartOptions={chartData?.chartOptions}
      metrics={analyticsData?.metrics || {}}
      insights={analyticsData?.insights || []}
      recommendations={analyticsData?.recommendations || []}
      isChartLoading={false} 
    />
  );
};

export default Chart;