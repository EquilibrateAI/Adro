import { url } from "@/services/api/api-url";

// Renames an existing chat session with a new user-provided title
export async function updateChatTitle(chat_id: string, title: string): Promise<void> {

    try {
        const response = await fetch(`${url.backendUrl}/chats/update-title`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id, title }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Update title error:", errorText);
            throw new Error(`Failed to update title: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Failed to update title")) {
            throw error;
        }
        throw new Error("api failed");
    }
}
