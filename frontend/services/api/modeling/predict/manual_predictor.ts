import { url } from "@/services/api/api-url"

/**
 * Interface representing the payload required for a manual prediction request.
 */
export interface ManualPredictorData {
    datasource_name: string;
    file_type: string;
    targets: string[];
    predictors: object;
    ignore_columns: string[];
}

/**
 * Requests a prediction from the backend based on manually provided input values and data source.
 * @param {ManualPredictorData} data - The configuration data for the prediction request.
 * @returns {Promise<any>} The prediction result returned by the backend API.
 * @throws Will throw an error if the prediction request fails or the API is unreachable.
 */
export async function manualPredictor(data: ManualPredictorData) {
    try {
        const response = await fetch(`${url.backendUrl}/predictor/predict`, {
            method: "POST",
            headers: {
                "Content-Type": "Application/json"
            },
            body: JSON.stringify(data)
        })

        const result = await response.json();

        if (response.ok){
            return result;
        }

        else{
            throw new Error("Error during prediction");
        }
    } catch (error) {
        if (error instanceof Error && error.message === "Error during prediction") {
            throw error;
        }
        throw new Error("api failed");
    }
}