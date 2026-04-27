// src/services/utils/modeling/optimisation/manual_optimiser.ts
import { url } from "@/services/api/api-url";
import { useOptimizationStore } from "@/services/utils/modeling/optimisation/optimise-store";

/**
 * Interface representing the configuration data for a manual optimization request.
 */
export interface ManualOptimiserData {
  mode: string;
  datasource_name: string;
  file_type: string;
  targets: string[];
  target_value?: Record<string, number>;
  target_range?: Record<string, number[]>;
  predictor_bounds: Record<string, any>;
  ignore_columns: string[];
}

/**
 * Sends a request to the backend optimizer to find the best predictor values to achieve a specified target.
 * Updates the global OptimizationStore with the results or any encountered errors.
 * 
 * @param {ManualOptimiserData} data - The payload containing the optimization constraints and target goals.
 * @throws Will throw an error if the optimization process fails on the backend.
 */
export async function manualOptimiser(data: ManualOptimiserData) {
  const store = useOptimizationStore.getState();

  try {
    store.setError(null);
    store.setLoading(true);

    const response = await fetch(
      `${url.backendUrl}/optimizer/optimize_predictor`,
      {
        method: "POST",
        headers: { "Content-Type": "Application/json" },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const msg =
        result?.message ||
        result?.error ||
        (typeof result?.detail === "string" ? result.detail : JSON.stringify(result?.detail)) ||
        result?.data?.message ||
        "Error during optimization";

      store.setError(msg);
      throw new Error(msg);
    }

    const d = result?.data ?? {};

    // The backend returns a dictionary where keys are target names
    // Example: { "Total": { "best_prediction": 599.8, "top_solutions": [...] } }
    const targetsFound = Object.keys(d);

    if (targetsFound.length > 0) {
      const allResults: Record<string, any> = {};

      targetsFound.forEach((targetName) => {
        const targetData = d[targetName];
        allResults[targetName] = {
          summary: {
            bestPrediction: targetData.best_prediction ?? targetData.bestprediction ?? null,
            bestLoss: targetData.best_loss ?? targetData.bestloss ?? null,
            bestPredictors: targetData.best_predictors ?? targetData.bestpredictors ?? null,
            targetValue: targetData.target_value ?? targetData.targetvalue ?? null,
            targetRange: targetData.target_range ?? targetData.targetrange ?? null,
            targetName: targetName,
          },
          topSolutions: targetData.top_solutions ?? targetData.topsolutions ?? [],
        };
      });

      store.setAllResults(allResults);

      // Set the first target as selected by default
      const firstTarget = targetsFound[0];
      store.setSelectedTarget(firstTarget);
    } else {
      // Fallback if the data is not in the expected format (flat structure)
      const topSolutions = d.top_solutions ?? [];
      store.setTopSolutions(topSolutions);
      store.setSummary({
        bestPrediction: d.best_prediction ?? d.bestprediction ?? null,
        bestLoss: d.best_loss ?? d.bestloss ?? null,
        bestPredictors: d.best_predictors ?? d.bestpredictors ?? null,
        targetValue: d.target_value ?? d.targetvalue ?? null,
        targetRange: d.target_range ?? d.targetrange ?? null,
      });
    }

  } catch (error) {
    if (error instanceof Error && error.message !== "api failed") {
      // msg already set in store.setError(msg) if it was a response.ok == false
      throw error;
    }
    throw new Error("api failed");
  } finally {
    store.setLoading(false);
  }
}
