import { url } from "@/services/api/api-url"

export type TableInfoParams = {
  dbType: string
  database: string
  schema: string
  table: string
}

export type TableInfoResponse = {
  success: boolean
  data?: {
    type: string
    connectionUrl: string
    database: string
    schema: string
    table: string
    dbSizeBytes: number | null
    rowCount: number | null
  }
  error?: string
}

// Fetches detailed information like row count and size for a PostgreSQL table
export async function fetchPostgresTableInfo(params: TableInfoParams): Promise<TableInfoResponse> {
  try {
    const resp = await fetch(`${url.backendUrl}/data/postgres/table-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await resp.json()
    return data as TableInfoResponse
  } catch (error) {
    throw new Error("api failed");
  }
}
