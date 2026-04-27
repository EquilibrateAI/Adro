import { url } from "@/services/api/api-url"
// Retrieves metadata and column names for a specific data source or database table
export async function getColumnInfo(data_source: string): Promise<string[]> {
  try {
    const response = await fetch(`${url.backendUrl}/columns/column-info`, {
      method: "POST",
      body: JSON.stringify({ "data_source": `${data_source}` }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to fetch column names for table ${data_source}`);
    }

    return data.columns || [];
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Failed to fetch column names")) {
        throw error;
    }
    throw new Error("api failed");
  }
}