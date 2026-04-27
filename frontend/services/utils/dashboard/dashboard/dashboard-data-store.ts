import {create} from "zustand"
import { persist } from "zustand/middleware"; // ADDED

interface Insight {
  title: string
  description: string
}

interface Metric {
  title: string
  icon: string
  color: string
  value: string
  change: string
  progressWidth: string
  note: string
  delay: number
}

export interface ChartOption {
  tooltip: unknown
  grid?: unknown
  xAxis?: unknown
  yAxis?: unknown
  legend?: unknown
  series: unknown
}

interface DashboardData {
  metricData: Metric[]
  chartOptionsData: ChartOption[]
  tableData: Record<string, unknown>[]
  insightsData: Insight[]
}

interface DashboardState {
  dashboards: Record<string, DashboardData>
  setDashboardData: (id: string, data: DashboardData) => void
  getDashboardData: (id: string) => DashboardData | undefined
  clearDashboards: () => void
  // Temporary single-dashboard state setters (compat with sidebar)
  metricData: Metric[]
  setMetricData: (data: Metric[]) => void
  chartOptionsData: ChartOption[]
  setChartOptionsData: (data: ChartOption[]) => void
  tableData: Record<string, unknown>[]
  setTableData: (data: Record<string, unknown>[]) => void
  insightsData: Insight[]
  setInsightsData: (data: Insight[]) => void
}

export const useDashboardStore = create<DashboardState>()( // ADDED: () after create
  persist( // ADDED: persist middleware
    (set, get) => ({
      dashboards: {},

      // Stores or updates the full dataset (metrics, charts, insights) for a dashboard ID
      setDashboardData: (id, data) => {
        set(state => ({
          dashboards: {
            ...state.dashboards,
            [id]: data,
          },
        }))
      },

      metricData: [],
      setMetricData: (data) => set({ metricData: data }),
      chartOptionsData: [],
      setChartOptionsData: (data) => set({ chartOptionsData: data }),
      tableData: [],
      setTableData: (data) => set({ tableData: data }),
      insightsData: [],
      setInsightsData: (data) => set({ insightsData: data }),

      // Retrieves the complete dataset for a given dashboard by its unique identifier
      getDashboardData: (id) => get().dashboards[id],

      // Clears all stored dashboard datasets from the local state
      clearDashboards: () => set({ dashboards: {} }),
    }),
    {
      name: 'dashboard-data-storage', // ADDED: storage name
      partialize: (state) => ({ dashboards: state.dashboards }) // ADDED: only save dashboards
    }
  )
)