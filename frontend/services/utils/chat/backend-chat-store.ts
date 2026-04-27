/* eslint-disable @typescript-eslint/no-explicit-any */
// services/utils/chat/backend-chat-store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  fetchChatSessions,
  createChatSession,
  fetchSessionMessages,
  addChatMessage,
  updateChatSession,
  deleteChatSession,
} from "@/services/api/chat/sessions";

interface TableColumn {
  key: string;
  label: string;
}

interface TableRow {
  [key: string]: string | number;
}

interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

/* =======================
   METRIC TYPE
======================= */
interface Metric {
  label: string;
  value: string | number;
  backgroundColor?: string;
  textColor?: string;
}
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  type: "user" | "bot";
  role?: "user" | "assistant";
  mode: "text" | "chart" | "dashboard";
  visualRendered?: boolean;
  isChartLoading?: boolean;
  keywords?: string[];
  columns?: string[];
  rows?: number[];
  data?: {
    tableData?: TableData;
    metrics?: Metric[];
    chartOptions?: any;
    dashboardData?: any;
  };
}
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  selectedFiles?: string[];
  responseMode?: "text" | "chart" | "dashboard";
}

interface BackendChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  
  syncWithBackend: () => Promise<void>;
  createSession: (dataSourceIds: string[]) => Promise<string>;
  loadSession: (sessionId: string) => Promise<void>;
  saveMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => Promise<string>;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  
  switchSession: (sessionId: string) => void;
  getCurrentSession: () => ChatSession | null;
  clearCurrentSession: () => void;
  getMessages: () => ChatMessage[];
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  setLoading: (loading: boolean) => void;
}

// Generates a concise title for a new chat session based on the first message content
const generateSessionTitle = (firstMessage?: string): string => {
  if (!firstMessage) return "New Chat";
  const truncated = firstMessage.substring(0, 50);
  return truncated.length < firstMessage.length ? `${truncated}...` : truncated;
};

// Creates a new local-only chat session object for temporary or fallback use
const createNewLocalSession = (dataSourceIds: string[] = []): ChatSession => {
  const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date();
  
  return {
    id,
    title: "New Chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    selectedFiles: dataSourceIds,
    responseMode: "text",
  };
};

export const useBackendChatStore = create<BackendChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      isSyncing: false,
      
      // Synchronizes local chat sessions with the latest data from the backend
      syncWithBackend: async () => {
        set({ isSyncing: true });
        try {
          const backendSessions = await fetchChatSessions();
          
          const transformedSessions: ChatSession[] = backendSessions.map((bs: any) => ({
            id: bs.id,
            title: bs.title,
            createdAt: new Date(bs.createdAt),
            updatedAt: new Date(bs.updatedAt),
            messages: [],
            selectedFiles: bs.dataSourceIds || [],
            responseMode: bs.responseMode || 'text',
          }));
          
          const localSessions = get().sessions.filter(s => s.id.startsWith('local_'));
          const allSessions = [...transformedSessions, ...localSessions];
          
          set({ 
            sessions: allSessions.sort((a, b) => 
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
          });
        } catch (error) {
          console.error('❌ Failed to sync with backend:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
      
      // Creates a new persistent chat session on the backend and updates local state
      createSession: async (dataSourceIds: string[]) => {
        set({ isLoading: true });
        try {
          const backendSession = await createChatSession({
            title: 'New Chat',
            dataSourceIds,
            responseMode: 'text',
          });
          
          const newSession: ChatSession = {
            id: backendSession.id,
            title: backendSession.title,
            createdAt: new Date(backendSession.createdAt),
            updatedAt: new Date(backendSession.updatedAt),
            messages: [],
            selectedFiles: dataSourceIds,
            responseMode: 'text',
          };
          
          set(state => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
          }));
          
          return newSession.id;
        } catch (error) {
          console.error('❌ Failed to create session on backend, falling back to local:', error);
          
          const newSession = createNewLocalSession(dataSourceIds);
          
          set(state => ({
            sessions: [newSession, ...state.sessions],
            currentSessionId: newSession.id,
          }));
          
          return newSession.id;
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Loads message history for a specific chat session from the backend
      loadSession: async (sessionId: string) => {
        const state = get();
        const session = state.sessions.find(s => s.id === sessionId);
        
        if (!session) return;
        
        if (session.messages.length > 0 || sessionId.startsWith('local_')) {
          return;
        }
        
        set({ isLoading: true });
        try {
          const backendMessages = await fetchSessionMessages(sessionId);
          
          const transformedMessages: ChatMessage[] = backendMessages.map((bm: any) => ({
            id: bm.id,
            content: bm.content,
            timestamp: new Date(bm.timestamp),
            type: bm.role === 'user' ? 'user' : 'bot',
            role: bm.role,
            mode: bm.mode || 'text',
            visualRendered: true,
            data: bm.metadata || undefined,
          }));
          
          set(state => ({
            sessions: state.sessions.map(session =>
              session.id === sessionId
                ? { ...session, messages: transformedMessages }
                : session
            ),
          }));
        } catch (error) {
          console.error(`❌ Failed to load session ${sessionId}:`, error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      // Saves a new chat message to both local state and the corresponding backend session
      saveMessage: async (messageData): Promise<string> => {
        const state = get();
        const currentSessionId = state.currentSessionId;
        
        if (!currentSessionId) {
          throw new Error('No current session');
        }
        
        const session = state.sessions.find(s => s.id === currentSessionId);
        if (!session) {
          throw new Error('Session not found');
        }
        
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newMessage: ChatMessage = {
          id: tempId,
          content: messageData.content,
          timestamp: new Date(),
          type: messageData.type,
          role: messageData.role || (messageData.type === 'user' ? 'user' : 'assistant'),
          mode: messageData.mode,
          visualRendered: messageData.visualRendered ?? (messageData.mode === 'text' ? true : false),
          data: messageData.data,
          isChartLoading: messageData.isChartLoading,
          keywords: messageData.keywords,
          columns: messageData.columns,
          rows: messageData.rows,
        };
        
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === currentSessionId
              ? { 
                  ...session, 
                  messages: [...session.messages, newMessage],
                  updatedAt: new Date(),
                }
              : session
          ),
          isLoading: messageData.type === 'user',
        }));
        
        if (currentSessionId.startsWith('local_')) {
          if (messageData.type === 'user' && session.messages.length === 0) {
            const title = generateSessionTitle(messageData.content);
            set(state => ({
              sessions: state.sessions.map(s =>
                s.id === currentSessionId ? { ...s, title } : s
              ),
            }));
          }
          
          return tempId;
        }
        
        try {
          const backendMessage = await addChatMessage(currentSessionId, {
            role: newMessage.role!,
            content: newMessage.content,
            mode: newMessage.mode,
            metadata: newMessage.data,
            sequence: session.messages.length + 1,
          });
          
          set(state => ({
            sessions: state.sessions.map(session =>
              session.id === currentSessionId
                ? {
                    ...session,
                    messages: session.messages.map(msg =>
                      msg.id === tempId ? { ...msg, id: backendMessage.id } : msg
                    ),
                  }
                : session
            ),
          }));
          
          if (messageData.type === 'user' && session.messages.length === 0) {
            const title = generateSessionTitle(messageData.content);
            updateChatSession(currentSessionId, title).catch(console.error);
          }
          
          return backendMessage.id;
        } catch (error) {
          console.error('❌ Failed to save message to backend, keeping local:', error);
          return tempId;
        }
      },
      
      // Updates the displayed title for a given chat session locally and on the server
      updateSessionTitle: (sessionId: string, title: string) => {
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session
          ),
        }));
        
        if (!sessionId.startsWith('local_')) {
          updateChatSession(sessionId, title).catch(console.error);
        }
      },
      
      // Permanently deletes a chat session from local storage and the backend
      deleteSession: (sessionId: string) => {
        set(state => ({
          sessions: state.sessions.filter(s => s.id !== sessionId),
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }));
        
        if (!sessionId.startsWith('local_')) {
          deleteChatSession(sessionId).catch(console.error);
        }
      },
      
      // Changes the active chat session and loads its messages if needed
      switchSession: (sessionId: string) => {
        set({ currentSessionId: sessionId });
        
        const session = get().sessions.find(s => s.id === sessionId);
        if (session && session.messages.length === 0 && !sessionId.startsWith('local_')) {
          get().loadSession(sessionId).catch(console.error);
        }
      },
      
      // Helper to retrieve the session object for the currently active chat
      getCurrentSession: () => {
        const state = get();
        return state.sessions.find(s => s.id === state.currentSessionId) || null;
      },
      
      // Resets the active session selection to none
      clearCurrentSession: () => {
        set({ currentSessionId: null });
      },
      
      // Retrieves all messages belonging to the current active session
      getMessages: () => {
        const state = get();
        if (!state.currentSessionId) return [];
        
        const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
        return currentSession?.messages || [];
      },
      
      // Updates properties of a specific message within the active session
      updateMessage: (id: string, updates: Partial<ChatMessage>) => {
        const state = get();
        const currentSessionId = state.currentSessionId;
        
        if (!currentSessionId) return;
        
        set(state => ({
          sessions: state.sessions.map(session =>
            session.id === currentSessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === id ? { ...msg, ...updates } : msg
                  ),
                  updatedAt: new Date(),
                }
              : session
          ),
        }));
      },
      
      // Sets the global loading state for chat-related operations
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'backend-chat-store',
      partialize: (state) => ({
        sessions: state.sessions.map(session => ({
          ...session,
          createdAt: session.createdAt.toISOString(),
          updatedAt: session.updatedAt.toISOString(),
          messages: session.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
        })),
        currentSessionId: state.currentSessionId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          
          state.sessions = state.sessions.map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: session.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          }));
        }
      },
    }
  )
);