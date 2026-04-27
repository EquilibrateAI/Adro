import { url } from "@/services/api/api-url"

export type ConnectionSummary = {
  dbType: string
  host?: string
  port?: string | number
  database: string
  status: "active" | "inactive" | "error" | string
  name?: string
  schemas?: Record<string, string[]>
}

// Retrieves a summary of all configured database connections and their statuses
export async function fetchConnectionDetails(): Promise<ConnectionSummary[]> {
  try {
    const resp = await fetch(`${url.backendUrl}/data/connections`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
    if (!resp.ok) throw new Error(await resp.text())
    const data = await resp.json()
    return data?.connections ?? []
  } catch (error) {
    throw new Error("api failed");
  }
}
