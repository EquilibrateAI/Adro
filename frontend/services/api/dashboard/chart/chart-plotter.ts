import { url } from "@/services/api/api-url";

// Sends a request to the backend to generate chart data based on user query and file selection
export async function plotChartData(
    mode: string, 
    input: string, 
    selectedFiles: string[], 
    model?: string,
    provider?: string,
    signal?: AbortSignal
) {
    try {
        const response = await fetch(`${url.backendUrl}/llm/chart_mode`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                mode: mode,
                query: input,
                file_name: selectedFiles,
                model: model,
                provider: provider
            }),
            signal: signal
        })

        if(response.ok){
            const data = await response.json();
            return data;
        }else{
            throw new Error("Failed to fetch chart data");
        }
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to fetch chart data") {
            throw error;
        }
        throw new Error("api failed");
    }
}