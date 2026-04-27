import { url } from "@/services/api/api-url";

export interface FetchedSettings {
    api_key: string | null;
    model_provider: string;
    port: string | null;
    model: string | null;
    baseUrl:string | null;
}

// Retrieves the current application settings (API keys, model providers) from the backend
export async function fetchSettings(): Promise<FetchedSettings> {

    try {
        const response = await fetch(`${url.backendUrl}/settings/fetch-settings`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Fetch settings error:", errorText);
            throw new Error(`Failed to fetch settings: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Handle various response shapes
        // Could be { api_key, model_provider, port, model }
        // Or { settings: { ... } } or { data: { ... } }
        const settings = data?.settings || data?.data || data;

        const result: FetchedSettings = {
            api_key: settings.api_key ?? settings.apiKey ?? null,
            model_provider: settings.model_provider ?? settings.modelProvider ?? settings.provider ?? "",
            port: settings.port ?? null,
              baseUrl:settings.baseUrl ?? settings.base_url ?? null,
            model: settings.model ?? settings.model_name ?? settings.modelName ?? null,
        };

        return result;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to fetch settings")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
