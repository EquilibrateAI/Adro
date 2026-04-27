import { url } from "@/services/api/api-url";

/**
 * Interface representing the payload required for the AI prediction assistant.
 */
export interface PredAssistantPayload {
  query: string;
  file_name: string;
  model?: string;
  provider?: string;
}

/**
 * Sends a natural language query to the AI prediction assistant to configure or run a prediction.
 * @param {PredAssistantPayload} data - The query string and the associated file name.
 * @returns {Promise<any>} The AI assistant's structured response.
 * @throws Will throw an error if the request fails or if the API encounters an error.
 */
export async function predAssistant(data: PredAssistantPayload) {
  try {
    const response = await fetch(
      `${url.backendUrl}/predictor/pred-assistant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      
      }
    );
      
    const result = await response.json();

    if (response.ok) {
      return result;
    } else {
      throw new Error("Prediction assistant failed");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Prediction assistant failed"
    ) {
      throw error;
    }

    throw new Error("API failed");
  }
}