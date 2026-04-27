import { url } from "@/services/api/api-url";

// Retrieves the full message history and metadata for a specific chat ID
export async function fetchChatHistory(chatId: string) {
    
    const queryParams = new URLSearchParams({ chat_id: chatId }).toString();
    const endpoint = `${url.backendUrl}/chats/chat-history?${queryParams}`;

    try {
        const response = await fetch(endpoint, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            const errorText = await response.text();
            console.error("❌ Fetch chat history error:", errorText);
            throw new Error(`Failed to fetch chat history: ${response.status} - ${errorText}`);
        }
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to fetch chat history")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
