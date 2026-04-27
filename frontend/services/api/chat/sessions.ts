/* eslint-disable @typescript-eslint/no-explicit-any */
// services/api/chat/sessions.ts
export interface ChatSessionPayload {
  title: string;
  dataSourceIds: string[];
  responseMode?: 'text' | 'chart' | 'dashboard';
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
  mode: 'text' | 'chart' | 'dashboard';
  metadata?: any;
  sequence: number;
}

// Fetches all available chat sessions from the server
export async function fetchChatSessions(): Promise<any[]> {
  try {
    const response = await fetch('/api/chats/sessions');
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error("api failed");
  }
}

// Creates a new chat session with the provided title and data sources
export async function createChatSession(data: ChatSessionPayload): Promise<any> {
  try {
    const response = await fetch('/api/chats/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error("api failed");
  }
}

// Retrieves all messages associated with a specific chat session ID
export async function fetchSessionMessages(sessionId: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/chats/sessions/${sessionId}/messages?chatID=${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw new Error("api failed");
  }
}

// Saves a new chat message to the specified session's history
export async function addChatMessage(
  sessionId: string,
  message: ChatMessagePayload
): Promise<any> {
  try {
    const response = await fetch(`/api/chats/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error(`Failed to save message: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving message:', error);
    throw new Error("api failed");
  }
}

// Updates the title or details of an existing chat session
export async function updateChatSession(
  sessionId: string,
  title: string
): Promise<any> {
  try {
    const response = await fetch(`/api/chats/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating session:', error);
    throw new Error("api failed");
  }
}

// Permanently removes a chat session and its associated messages
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    const response = await fetch(`/api/chats/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.status}`);
    }
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error("api failed");
  }
}