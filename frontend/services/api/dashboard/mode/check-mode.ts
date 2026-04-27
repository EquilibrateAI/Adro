import { url } from "@/services/api/api-url";

// Determines the appropriate interaction mode (text, chart, or dashboard) based on user query
export async function checkQueryMode(
  _query: string,
  _selectedFiles: string[],
  _signal?: AbortSignal
): Promise<{ mode: "text" | "chart" | "dashboard" }> {
  /*
  console.log(
    "🔍 Checking mode - Request payload:::",
    JSON.stringify({
      mode: "check",  
      query: query,
      file_name: selectedFiles,
    })
  );

  try {
    const response = await fetch(`${url.backendUrl}/llm/check_mode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "check", 
        query: query,
        file_name: selectedFiles,
      }),
      signal: signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error (422):", errorText);
      throw new Error(`Failed to check query mode: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Mode detection response:::", data);
    return data;
  } catch (error: unknown) {
    console.error("❌ checkQueryMode error:", error);
    throw error;
  }
  */
  return { mode: "text" };
}