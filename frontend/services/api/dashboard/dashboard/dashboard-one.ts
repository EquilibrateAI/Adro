import { url } from "@/services/api/api-url";

// Fetches data for the first dashboard variant from the backend
export async function dashboardApiOne(
  mode: string,
  input: string,
  selectedFiles: string[],
  model?: string,
  provider?: string,
  signal?: AbortSignal
) {
  try {
    const response = await fetch(`${url.backendUrl}/llm/dashboard1`, {
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
      throw new Error("Failed to fetch dashboard data");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Failed to fetch dashboard data") {
        throw error;
    }
    throw new Error("api failed");
  }
}
