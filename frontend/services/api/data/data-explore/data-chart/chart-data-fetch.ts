import {url} from "@/services/api/api-url"
type ChartKind = "Bar" | "Line" | "Scatter" | "Heatmap" | "Box" | "Funnel"

interface ChartConfig {
    chartType: ChartKind | ""
    title: string
    xAxisColumn: string
    yAxisColumns: string[]
    categoryColumn?: string
    aggregateFunction?: string
    numericColumn?: string
    numericColumns?: string[]
    stagesColumn?: string
    valuesColumn?: string
}

interface ChartRequest {
    tableName: string
    chartType: ChartKind
    config: ChartConfig
}


// Sends a configuration-based request to generate specific chart data from a table
export async function generateChart(request: ChartRequest) {
    try {
        const response = await fetch(`${url.backendUrl}/data/chart-data-fetch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });
      
        if (!response.ok) {
          throw new Error("Failed to generate chart");
        }
      
        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to generate chart") {
            throw error;
        }
        throw new Error("api failed");
    }
  }
  