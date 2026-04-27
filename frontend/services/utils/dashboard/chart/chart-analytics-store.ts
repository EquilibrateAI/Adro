import { create } from "zustand";
import { persist } from "zustand/middleware"; // ADDED

interface ChartInsight {
  type: 'positive' | 'neutral' | 'negative'
  label: string
  text: string
}

interface ChartAnalyticsItem {
  chartType: string | null
  metrics: Record<string, string | number>
  insights: ChartInsight[]
  recommendations: string[]  
}

interface ChartAnalyticsState {
  analytics: Record<string, ChartAnalyticsItem>
  chartType: string | null
  metrics: Record<string, string | number>
  insights: ChartInsight[]
  recommendations: string[]
  setAnalytics: (id: string, data: ChartAnalyticsItem) => void
  getAnalytics: (id: string) => ChartAnalyticsItem | undefined
  clearAnalytics: () => void
  setInsights: (insights: (string | ChartInsight)[]) => void
  setMetrics: (metrics: Record<string, string | number>) => void
  setRecommendations: (recommendations: string[]) => void
  setChartType: (chartType: string | null) => void
}

export const useChartAnalyticsStore = create<ChartAnalyticsState>()( // ADDED: () after create
  persist( // ADDED: persist middleware
    (set, get) => ({
      analytics: {},
      chartType: null,
      metrics: {},
      insights: [],
      recommendations: [],
      
      // Updates the analytics data and current state for a specific chart ID
      setAnalytics: (id, data) => {
        set(state => ({
          analytics: { ...state.analytics, [id]: data },
          chartType: data.chartType,
          metrics: data.metrics,
          insights: data.insights,
          recommendations: data.recommendations
        }))
      },
      
      // Retrieves analytics information for a specific chart by its ID
      getAnalytics: (id: string) => get().analytics[id],
      
      // Resets all analytics data and current state to initial empty values
      clearAnalytics: () => set({ 
        analytics: {},
        chartType: null,
        metrics: {},
        insights: [],
        recommendations: []
      }),
      setInsights: (insights) => {
        const mapped = insights.map(i => typeof i === 'string' ? { type: 'neutral', label: 'Insight', text: i } : i) as ChartInsight[];
        set({ insights: mapped });
      },
      setMetrics: (metrics) => set({ metrics }),
      setRecommendations: (recommendations) => set({ recommendations }),
      setChartType: (chartType) => set({ chartType })
    }),
    {
      name: 'chart-analytics-storage', // ADDED: storage name
      partialize: (state) => ({ analytics: state.analytics }) // ADDED: only save analytics
    }
  )
)