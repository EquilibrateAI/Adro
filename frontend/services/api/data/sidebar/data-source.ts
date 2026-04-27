import {url} from "@/services/api/api-url"
export type DataSourceType =
  | "mysql"
  | "postgresql"
  | "mongodb"
  | "sqlite"
  | "csv"
  | "excel"
  | "json";

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastUpdated: string;
  createdAt: string;
  size: string;
  schema?: string;
  tables?: {
    name: string;
    rows: number;
    columns: number;
    lastModified: string;
    schema?: string;
  }[];
  fileInfo?: {
    rows: number;
    columns: number;
  };
  anomalies?: string[];
  [key: string]: any;
}

// Fetches metadata for all available data sources to populate the sidebar
export async function fetchDataSources(): Promise<DataSource[]> {
  try {
    const response = await fetch(`${url.backendUrl}/data_sources_info/datasources-metadata`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
      console.error(`[ERROR] HTTP ${response.status}: Failed to fetch data sources`);
      throw new Error(`HTTP ${response.status}: Failed to fetch data sources`);
    }
    const data = await response.json() as { dataSources: DataSource[] };
    if (!data.dataSources) {
      console.error("[ERROR] Response missing 'dataSources' field", data);
      throw new Error("Invalid response format: missing 'dataSources' field");
    }
    return data.dataSources;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("[ERROR] fetchDataSources failed:", error.message);
      if (error.message.startsWith("HTTP") || error.message.includes("Failed to fetch data sources")) {
        throw error;
      }
    } else {
      console.error("[ERROR] fetchDataSources failed with unknown error:", error);
    }
    throw new Error("An unexpected error occurred while fetching data sources. Try again");
  }
}
