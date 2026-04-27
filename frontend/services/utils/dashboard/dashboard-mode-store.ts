import { create } from "zustand";

/**
 * Interface defining the global state for the Dashboard's active viewing mode.
 */
interface DashboardModeState {
  dashboardTab: "text" | "chart" | "dashboard";
  setDashboardTab: (tab: "text" | "chart" | "dashboard") => void;
}

/**
 * Zustand store to manage the current active viewing tab in the Dashboard section.
 * Controls whether the user is interacting with textual analysis, chart generation, or the complete dashboard overview.
 */
export const useDashboardMode = create<DashboardModeState>((set) => ({
  dashboardTab: "text",
  /**
   * Updates the currently active tab on the dashboard.
   * 
   * @param {"text" | "chart" | "dashboard"} tab - The target tab to display.
   */
  setDashboardTab: (tab) => set({ dashboardTab: tab }),
}));

