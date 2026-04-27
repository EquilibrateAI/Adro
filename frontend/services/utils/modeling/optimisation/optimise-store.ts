import { create } from "zustand";

/**
 * Interface representing the summarized optimization metrics and parameters.
 */
export interface OptimizationSummary {
  bestPrediction: number | null;
  bestLoss: number | null;

  // NEW: comes from API as data.best_predictors
  bestPredictors: Record<string, number | string> | null;

  // value/range user is optimizing for
  targetValue: number | null;
  targetRange: number[] | null;

  targetName: string | null;
}

/**
 * Interface representing the full optimization result for a specific target.
 */
export interface OptimizationResult {
  summary: OptimizationSummary;
  topSolutions: any[];
}

/**
 * Interface defining the state and actions for the global optimization store.
 */
export interface OptimizationState {
  // Currently displayed data (synced with selectedTarget)
  topSolutions: any[];
  summary: OptimizationSummary;

  // All results from the latest API call
  allResults: Record<string, OptimizationResult>;
  selectedTarget: string | null;

  isLoading: boolean;
  error: string | null;

  setTopSolutions: (solutions: any[]) => void;
  setSummary: (payload: Partial<OptimizationSummary>) => void;
  setAllResults: (results: Record<string, OptimizationResult>) => void;
  setSelectedTarget: (targetName: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;

  clearOptimization: () => void;
}

const initialSummary: OptimizationSummary = {
  bestPrediction: null,
  bestLoss: null,
  bestPredictors: null, // NEW
  targetValue: null,
  targetRange: null,
  targetName: null,
};

export const useOptimizationStore = create<OptimizationState>((set) => ({
  topSolutions: [],
  summary: initialSummary,
  allResults: {},
  selectedTarget: null,
  isLoading: false,
  error: null,

  /**
   * Updates the list of top optimization solutions found by the backend.
   */
  setTopSolutions: (solutions) => set({ topSolutions: solutions }),
  
  /**
   * Merges new optimization summary data into the existing summary state.
   */
  setSummary: (payload) =>
    set((state) => ({ summary: { ...state.summary, ...payload } })),

  /**
   * Sets the dictionary of all optimization results keyed by their respective target names.
   */
  setAllResults: (results) => set({ allResults: results }),

  /**
   * Switches the active context to a different optimization target.
   * Pulls the relevant summary and top solutions from `allResults`.
   */
  setSelectedTarget: (targetName) =>
    set((state) => {
      const targetResult = state.allResults[targetName];
      if (!targetResult) return state;
      return {
        selectedTarget: targetName,
        summary: targetResult.summary,
        topSolutions: targetResult.topSolutions,
      };
    }),

  /**
   * Sets the global loading indicator for optimization processes.
   */
  setLoading: (loading) => set({ isLoading: loading }),
  
  /**
   * Sets or clears the error message related to optimization tasks.
   */
  setError: (msg) => set({ error: msg }),

  /**
   * Resets the optimization store to its initial empty state.
   */
  clearOptimization: () =>
    set({
      topSolutions: [],
      summary: initialSummary,
      allResults: {},
      selectedTarget: null,
      isLoading: false,
      error: null,
    }),
}));
