/* eslint-disable @typescript-eslint/no-explicit-any */
import { url } from "@/services/api/api-url";

// Fetches text-based analysis and chat responses from the backend for the given query and files
export async function fetchTextModeData(
  message: string,
  mode: string,
  selectedFiles: string[],
  model?: string,
  provider?: string,
  signal?: AbortSignal
): Promise<any> {


  try {
    const response = await fetch(`${url.backendUrl}/llm/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: mode,
        query: message,
        file_name: selectedFiles,
        model: model,
        provider: provider,
      }),
      signal: signal
    });

    if (!response.ok) {
      throw new Error("Failed to fetch text mode data");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch text mode data") {
        throw error;
    }
    throw new Error("api failed");
  }
}
