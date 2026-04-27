/* eslint-disable @typescript-eslint/no-explicit-any */
import {url} from "@/services/api/api-url"
export interface TableApiResponse {
    status_code: number;
    message: string;
    success: boolean;
    data?: {
        records: any[];
        pagination?: {
            current_page: number;
            per_page: number;
            total_rows: number;
            total_pages: number;
            has_next: boolean;
            has_previous: boolean;
        };
        columns?: string[];
        total_rows?: number;
        total_columns?: number;
    };
    error?: string;
}

// Executes table-level operations like filtering, sorting, and pagination on local data sources
export async function callTableAPI(action: string, params: any): Promise<TableApiResponse> {
    const requestBody = {
        action: action,
        ...params
    };

    if (action === "filter" && params.filters) {
        requestBody.query = params.filters;
        delete requestBody.filters;
    }


    try {
        const response = await fetch(`${url.backendUrl}/data/table-operations`, {
            method: "POST",
            body: JSON.stringify(requestBody),
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error("api failed");
    }
}
