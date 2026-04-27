import { url } from "@/services/api/api-url";

// Requests the backend to generate a comprehensive dashboard layout and content based on user query
export async function generateDashboardData(
  mode: string,
  input: string,
  selectedFiles: string[],
  signal?: AbortSignal
) {
  console.log("dashboard body being sent:::", JSON.stringify({
    mode: mode,
    query: input,
    file_name: selectedFiles,
  }));
  try {
    const response = await fetch(`${url.backendUrl}/llm/dashboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode,
        query: input,
        file_name: selectedFiles,
      }),
      signal,
    });
    if (response.ok) {
      const data = await response.json();
      console.log("response from /llm/dashboard api:::", data);
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
