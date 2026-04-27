import { url } from "../../api-url";

export interface OptimiseAssistantPayload {
  query: string;
  file_name: string;
  model?: string;
  provider?: string;
}

export interface OptimiseSolution {
  rank: number;
  predictors: Record<string, number>;
  prediction: number;
  error: number;
}

export interface OptimiseMetrics {
  best_predictors: Record<string, number>;
  best_prediction: number;
  best_loss: number;
  n_trials: number;
  top_k: number;
  target_value: number;
  target_range: any;
  top_solutions: OptimiseSolution[];
}

export interface OptimiseAssistantResponse {
  response: string;
  metrics: OptimiseMetrics;
}

/**
 * Sends a natural language query to the optimization assistant
 * Endpoint: /optimizer/optimizer-assistant
 */
export async function optimiseAssistant(payload: OptimiseAssistantPayload): Promise<OptimiseAssistantResponse> {
  const response = await fetch(`${url.backendUrl}/optimizer/optimizer-assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || "Optimization assistant request failed");
  }

  return response.json();
}
