import { create } from "zustand"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { persist } from "zustand/middleware"

interface ChartAndAnalyticsLoaded{
    chartLoaded: boolean;
    setChartLoaded: (chartLoaded: boolean) => void;
    analyticsLoaded: boolean;
    setAnalyticsLoaded: (analyticsLoaded: boolean) => void;
}

export const useChartModeStatus = create<ChartAndAnalyticsLoaded>((set) => ({
    chartLoaded: false,
    // Updates the global flag indicating if the chart component has finished loading
    setChartLoaded: (chartLoaded) => set({ chartLoaded }),
    analyticsLoaded: false,
    // Updates the global flag indicating if chart analytics data has finished loading
    setAnalyticsLoaded: (analyticsLoaded) => set({ analyticsLoaded })
}))