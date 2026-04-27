import { url } from "@/services/api/api-url";

// Sends a request to the backend to permanently delete a chat session and its history
export async function deleteChatSession(chat_id: string): Promise<void> {

    try {
        const response = await fetch(`${url.backendUrl}/chats/delete-chat?chat_id=${encodeURIComponent(chat_id)}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Delete chat error:", errorText);
            throw new Error(`Failed to delete chat: ${response.status} - ${errorText}`);
        }

        return;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to delete chat")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
