import { url } from "@/services/api/api-url";

export interface DashboardGenerationPayload {
    chat_id: string;
    message_id: string;
    file_name: string;
    message: string;
    title: string;
}

// Triggers the background generation of a dashboard with specific chat and message context
export async function dashboardGenerationApi(
    payload: DashboardGenerationPayload,
    signal?: AbortSignal
) {

    // chat_id sent as query parameter
    const queryParams = new URLSearchParams({ chat_id: payload.chat_id }).toString();
    const endpoint = `${url.backendUrl}/dashboard-generation?${queryParams}`;

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal,
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const errorText = await response.text();
            console.error("❌ Dashboard generation error:", errorText);
            throw new Error(`Failed to fetch dashboard data: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to fetch dashboard data")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
