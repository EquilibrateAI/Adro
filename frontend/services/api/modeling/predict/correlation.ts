import { url } from "@/services/api/api-url";

/**
 * Interface representing the payload required for calculating feature correlations.
 */
export interface CorrelationPayload {
    datasource_name: string;
    columns: string[];
    file_type?: string;
}

/**
 * Interface representing the structured response from the correlation API.
 */
export interface CorrelationResponse {
    correlation: Record<string, Record<string, number>>;
}

/**
 * Fetches the correlation matrix for specified columns in a given dataset.
 * @param {CorrelationPayload} data - The payload containing datasource name, columns, and file type.
 * @returns {Promise<CorrelationResponse>} The correlation matrix data.
 * @throws Will throw an error if the API request fails.
 */
export const getCorrelation = async (data: CorrelationPayload): Promise<CorrelationResponse> => {
    try {
        const response = await fetch(`${url.backendUrl}/predictor/correlation`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                datasource_name: data.datasource_name,
                columns: data.columns,
                file_type: data.file_type
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.content || result.error || result.message || "Failed to fetch correlation data");
        }

        return result;
    } catch (error) {
        console.error("Error fetching correlation:", error);
        throw error;
    }
};
