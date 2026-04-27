import { url } from "@/services/api/api-url"

export type SaveConnectionPayload = {
  host: string
  port: string
  database: string
  username: string
  password: string
  dbType: string
}

// Persists new or updated database connection credentials to the backend
export async function saveConnectionDetails(payload: SaveConnectionPayload) {
  try {
    const response = await fetch(`${url.backendUrl}/data/connections/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || "Failed to save connection details")
    }
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Failed to save connection details")) {
        throw error;
    }
    throw new Error("api failed");
  }
}
