import { create } from "zustand";
import type { EChartsOption } from "echarts-for-react";
import { persist } from "zustand/middleware"; // ADDED

interface ChartItem {
  id: string
  title: string
  description: string
  timeRange: string
  yearOverYearGrowth: string
  sqlQuery: string
  chartOptions: EChartsOption
}

interface ChartDataStore {
  charts: ChartItem[]
  addChart: (chart: Omit<ChartItem, 'id'>, id?: string) => string
  getChart: (id: string) => ChartItem | undefined
  clearCharts: () => void
  setChartOptions: (options: EChartsOption) => void
}

export const useGeneratedChartDataStore = create<ChartDataStore>()( // ADDED: () after create
  persist( // ADDED: persist middleware
    (set, get) => ({
      charts: [],
      // Appends a newly generated chart's metadata and ECharts options to the store
      addChart: (chartData, id) => {
        const chartId = id || Date.now().toString()
        set(state => ({
          charts: [...state.charts, { ...chartData, id: chartId }]
        }))
        return chartId
      },
      // Retrieves a specific chart's data from the store using its unique ID
      getChart: (id: string) => get().charts.find(c => c.id === id),
      // Removes all generated chart data from the store
      clearCharts: () => set({ charts: [] }),
      setChartOptions: (options) => {
        // This is a simplified setter to keep compat with legacy code
        // and handle the current visible chart state
      }
    }),
    {
      name: 'generated-chart-data-storage', // ADDED: storage name
      partialize: (state) => ({ charts: state.charts }) // ADDED: only save charts
    }
  )
)