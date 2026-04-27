import { url } from "@/services/api/api-url";

export interface ChatTitle {
    chat_id: string;
    title: string;
}

// Fetches a list of all chat sessions with their IDs and titles for the sidebar
export async function fetchChatTitles(): Promise<ChatTitle[]> {

    const endpoint = `${url.backendUrl}/chats/get-titles`;

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
            const data = await response.json();

            // Handle various response shapes
            if (Array.isArray(data)) return data;
            if (data?.titles && Array.isArray(data.titles)) return data.titles;
            if (data?.chats && Array.isArray(data.chats)) return data.chats;

            // Fallback: try to extract any array from the response
            const arr = Object.values(data).find((v) => Array.isArray(v));
            if (arr) return arr as ChatTitle[];

            return [];
        } else {
            const errorText = await response.text();
            console.error("❌ Fetch chat titles error:", errorText);
            throw new Error(`Failed to fetch chat titles: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to fetch chat titles")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
