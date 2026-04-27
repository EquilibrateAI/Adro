import { url } from "../../api-url";

// Fetches data for the second dashboard variant from the backend
export async function dashboardApiTwo(
  mode: string,
  input: string,
  selectedFiles: string[],
  model?: string,
  provider?: string,
  signal?: AbortSignal
) {
  try {
    const response = await fetch(`${url.backendUrl}/llm/dashboard2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode,
        query: input,
        file_name: selectedFiles,
        model: model,
        provider: provider,
      }),
      signal,
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      throw new Error("Failed to Fetch Data From Dashboard");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to Fetch Data From Dashboard") {
        throw error;
    }
    throw new Error("api failed");
  }
}
