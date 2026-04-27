import {url} from "@/services/api/api-url"
// Processes a file through backend data cleaning steps (e.g., handling nulls, deduplication)
export async function cleanData(fileName: string, checkedSteps?: object) {
    
    try {
        const response = await fetch(`${url.backendUrl}/data/clean-data`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: fileName,
                cleaning_steps: checkedSteps
            }),
        });

        const result = await response.json();

        // Return both status and result for proper handling
        return {
            status: response.status,
            data: result
        };
    } catch (error) {
        console.error("Error in cleanData service:", error);
        throw new Error("api failed");
    }
}