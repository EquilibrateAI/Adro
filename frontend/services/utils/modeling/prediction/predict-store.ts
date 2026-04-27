import { create } from "zustand";

/**
 * Interface representing the key-value pairs of predicted data.
 */
export interface PredictedData {
  [key: string]: string | number;
}

/**
 * Interface representing the prediction results and associated metrics returned by the backend model.
 */
export interface Predictions {
  rmse: number;
  mse: number;
  mae: number;
  r2score: number;
  cvscore?: number;
  learningrate?: number;
  predicteddata: PredictedData;
  noofboostingrounds: number;
  maxdepth: number;
  original_vs_predicted?: [number, number][];
}

/**
 * Interface defining the state and actions for the prediction global store.
 * This store manages the entire lifecycle of a prediction task, from data source selection
 * to displaying results and correlation analysis.
 */
interface PredictionStore {
  /** The final metrics and output from the ML model */
  predictions: Predictions | null;
  /** Matrix of correlation values used by the Heatmap component */
  correlationData: Record<string, Record<string, number>> | null;
  /** All numeric columns available in the currently selected dataset */
  availableNumericColumns: string[];
  /** The unique identifier or name of the selected file/database table */
  selectedDataSourceName: string | null;
  /** The file format or source type (csv, mysql, etc.) */
  selectedDataSourceType: string | null;
  /** The column designated as the 'Target' (Y) for prediction */
  selectedTarget: string | null;
  /** List of columns that could potentially be targets */
  targets: string[];
  /** List of independent variables (X) used for training/inference */
  predictors: string[];
  /** UI loading state for async API operations */
  isLoading: boolean;
  /** Global error message for the prediction workspace */
  error: string | null;

  setPredictions: (predictions: Predictions | null) => void;
  setCorrelationData: (data: Record<string, Record<string, number>> | null) => void;
  setAvailableNumericColumns: (columns: string[]) => void;
  setSelectedDataSourceName: (name: string | null) => void;
  setSelectedDataSourceType: (type: string | null) => void;
  clearPredictions: () => void;

  setLoading: (loading: boolean) => void;
  setError: (msg: string | null) => void;
  setSelectedTarget: (target: string | null) => void;
  setTargets: (targets: string[]) => void;
  setPredictors: (predictors: string[]) => void;
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  predictions: null,
  correlationData: null,
  availableNumericColumns: [],
  selectedDataSourceName: null,
  selectedDataSourceType: null,
  selectedTarget: null,
  targets: [],
  predictors: [],
  isLoading: false,
  error: null,

  /**
   * Stores the prediction metrics and data returned from the backend.
   */
  setPredictions: (predictions) => set({ predictions }),
  /**
   * Stores the correlation matrix data used for the heatmap.
   */
  setCorrelationData: (correlationData) => set({ correlationData }),
  /**
   * Stores available numeric columns extracted for the selected dataset.
   */
  setAvailableNumericColumns: (availableNumericColumns) => set({ availableNumericColumns }),
  /**
   * Stores the current dataset name.
   */
  setSelectedDataSourceName: (selectedDataSourceName) => set({ selectedDataSourceName }),
  /**
   * Stores the current dataset type.
   */
  setSelectedDataSourceType: (selectedDataSourceType) => set({ selectedDataSourceType }),
  /**
   * Resets all prediction data and clears any associated errors or dataset selections.
   */
  clearPredictions: () => set({ 
    predictions: null, 
    correlationData: null, 
    availableNumericColumns: [],
    selectedDataSourceName: null,
    selectedDataSourceType: null,
    error: null, 
    isLoading: false 
  }),

  /**
   * Toggles the loading state for ongoing prediction requests.
   */
  setLoading: (loading) => set({ isLoading: loading }),
  /**
   * Updates the store with an error message if a prediction fails.
   */
  setError: (msg) => set({ error: msg }),

  /**
   * Sets the specific column target for which predictions are being made.
   */
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  /**
   * Updates the list of available target columns from the dataset.
   */
  setTargets: (targets) => set({ targets }),
  /**
   * Updates the list of predictor columns used for generating predictions.
   */
  setPredictors: (predictors) => set({ predictors }),
}));
