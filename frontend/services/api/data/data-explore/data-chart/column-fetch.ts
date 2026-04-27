import {url} from "@/services/api/api-url"
 
// Retrieves column-specific metadata and statistics for data exploration and charting
export async function fetchColumnData(dataSource: string): Promise<any[]> {
    try {
        const response = await fetch(`${url.backendUrl}/columns/data-charts-column-info`, {
            method: "POST",
            body: JSON.stringify({ data_source: dataSource }),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        return data || [];
    } catch (error) {
        throw new Error("api failed");
    }
}