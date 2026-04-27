import { create } from "zustand";
import { persist } from "zustand/middleware";

/* =======================
   TABLE TYPES
======================= */
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

/* =======================
   CHAT MESSAGE TYPE
======================= */
export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;

  type: "user" | "bot";
  role?: "user" | "assistant";

  mode: "text" | "chart" | "dashboard";

  /** 🔑 Controls chart/dashboard visibility */
  visualRendered?: boolean;

  /** Optional flags */
  isChartLoading?: boolean;
  keywords?: string[];
  columns?: string[];
  rows?: TableRow[];

  data?: {
    tableData?: TableData;
    metrics?: Metric[];
    chartOptions?: unknown;
    dashboardData?: unknown;
  };
}

/* =======================
   CHAT SESSION TYPE (NEW)
======================= */
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  selectedFiles?: string[];
  responseMode?: "text" | "chart" | "dashboard";
  isSessionLoading?: boolean;
}

/* =======================
   STORE TYPE
======================= */
interface ChatStore {
  // Existing fields
  messages: ChatMessage[];
  isLoading: boolean;
  isLoadingHistory: boolean;

  // NEW: Session management
  currentSessionId: string | null;
  sessions: ChatSession[];
  nextChatNumber: number;

  // Existing methods
  addMessage: (
    message: Omit<ChatMessage, "id" | "timestamp"> | ChatMessage,
  ) => void;

  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;

  setLoading: (loading: boolean) => void;
  clearMessages: () => void;

  // NEW: Session methods
  createNewSession: () => string;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  getCurrentSession: () => ChatSession | null;
  fetchSessionHistory: (sessionId: string) => Promise<void>;
  fetchTitlesFromBackend: () => Promise<void>;

  // ADDED: Getter for messages
  getMessages: () => ChatMessage[];
  getNextMessageId: () => string;
}

/* =======================
   HELPER FUNCTIONS
======================= */
const generateSessionTitle = (firstMessage?: string): string => {
  if (!firstMessage) return "";
  const truncated = firstMessage.substring(0, 50);
  return truncated.length < firstMessage.length ? `${truncated}...` : truncated;
};

const createNewSessionObject = (chatNumber: number): ChatSession => {
  const id = `U_${chatNumber.toString().padStart(4, "0")}`;
  const now = new Date();

  return {
    id,
    title: "", // Changed from "New Chat" to ""
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

import { fetchChatHistory } from "@/services/api/data/chat/history";
import { fetchChatTitles } from "@/services/api/data/chat/titles";
import { updateChatTitle } from "@/services/api/data/chat/update-title";
import { deleteChatSession } from "@/services/api/data/chat/delete-chat";
import { useDashboardStore } from "@/services/utils/dashboard/dashboard/dashboard-data-store";

/* =======================
   STORE IMPLEMENTATION
   ======================= */
export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Existing state
      messages: [],
      isLoading: false,
      isLoadingHistory: false,

      // NEW: Session state
      currentSessionId: null,
      sessions: [],
      nextChatNumber: 1,

      /* -------- ADDED: GET MESSAGES GETTER -------- */
      getMessages: () => {
        const state = get();
        if (!state.currentSessionId) return [];

        const currentSession = state.sessions.find(
          (s) => s.id === state.currentSessionId,
        );

        const messages = currentSession?.messages || [];

        // Ensure text mode messages have data structure
        const enhancedMessages = messages.map((msg) => {
          if (msg.type === "bot" && msg.mode === "text" && !msg.data) {
            return {
              ...msg,
              data: {
                tableData: undefined,
                metrics: undefined,
              },
            };
          }
          return msg;
        });

        return enhancedMessages;
      },

      /* -------- ADD MESSAGE (ENHANCED) -------- */
      addMessage: (message) => {
        const state = get();

        // Ensure we have a current session
        let currentSessionId = state.currentSessionId;
        if (!currentSessionId) {
          currentSessionId = get().createNewSession();
        }

        const finalMessage: ChatMessage = {
          id: "id" in message ? message.id : crypto.randomUUID(),
          timestamp: "timestamp" in message ? message.timestamp : new Date(),

          content: message.content,
          type: message.type ?? "bot",
          role:
            message.role ?? (message.type === "user" ? "user" : "assistant"),

          mode: message.mode,
          // ========== CRITICAL FIX: Properly handle visualRendered ==========
          visualRendered:
            message.visualRendered ?? (message.mode === "text" ? true : false),

          isChartLoading: message.isChartLoading,
          data: message.data,
          keywords: message.keywords,
          columns: message.columns,
          rows: message.rows,
        };

        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === currentSessionId,
          );

          if (!currentSession) return state;

          // Check if message already exists to prevent duplicates
          const messageExists = currentSession.messages.some(
            (m) =>
              m.id === finalMessage.id ||
              (m.content === finalMessage.content &&
                m.type === finalMessage.type &&
                m.mode === finalMessage.mode &&
                Math.abs(
                  m.timestamp.getTime() - finalMessage.timestamp.getTime(),
                ) < 1000), // Within 1 second
          );

          if (messageExists) {
            return state;
          }

          const updatedMessages = [...currentSession.messages, finalMessage];

          const newIsLoading = finalMessage.type === "user";

          return {
            sessions: state.sessions.map((session) =>
              session.id === currentSessionId
                ? {
                  ...session,
                  messages: updatedMessages,
                  updatedAt: new Date(),
                  isSessionLoading: newIsLoading,
                }
                : session,
            ),
            messages: updatedMessages,
            isLoading: newIsLoading,
          };
        });
      },

      /* -------- UPDATE MESSAGE (ENHANCED) -------- */
      updateMessage: (id, updates) => {
        const state = get();
        const currentSessionId = state.currentSessionId;

        if (!currentSessionId) return;

        set((state) => {
          const currentSession = state.sessions.find(
            (s) => s.id === currentSessionId,
          );

          if (!currentSession) return state;

          const updatedMessages = currentSession.messages.map((msg) =>
            msg.id === id ? { ...msg, ...updates } : msg,
          );

          return {
            sessions: state.sessions.map((session) =>
              session.id === currentSessionId
                ? {
                  ...session,
                  messages: updatedMessages,
                  updatedAt: new Date(),
                }
                : session,
            ),
            messages: updatedMessages,
          };
        });
      },

      /* -------- PER-SESSION LOADING -------- */
      setLoading: (loading) => {
        const currentSessionId = get().currentSessionId;
        set(state => ({
          isLoading: loading,
          sessions: state.sessions.map(session =>
            session.id === currentSessionId
              ? { ...session, isSessionLoading: loading }
              : session
          ),
        }));
      },

      /* -------- CLEAR MESSAGES (ENHANCED) -------- */
      clearMessages: () => {
        const state = get();
        const currentSessionId = state.currentSessionId;

        if (!currentSessionId) return;

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === currentSessionId
              ? { ...session, messages: [], updatedAt: new Date() }
              : session,
          ),
          messages: [],
        }));
      },

      /* -------- GET NEXT MESSAGE ID -------- */
      getNextMessageId: () => {
        const state = get();
        const currentSessionId = state.currentSessionId;
        if (!currentSessionId) return `U_0000_0000`;

        const currentSession = state.sessions.find(
          (s) => s.id === currentSessionId,
        );
        const messageCount = currentSession?.messages?.length || 0;
        return `U_${currentSessionId.replace("U_", "")}_${messageCount.toString().padStart(4, "0")}`;
      },

      /* -------- CREATE SESSION -------- */
      createNewSession: () => {
        const state = get();
        const chatNumber = state.nextChatNumber;
        const newSession = createNewSessionObject(chatNumber);

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
          messages: [],
          isLoadingHistory: false,
          nextChatNumber: state.nextChatNumber + 1,
        }));
        return newSession.id;
      },

      /* -------- SWITCH SESSION (UPDATED) -------- */
      switchSession: (sessionId: string) => {
        const state = get();
        const currentId = state.currentSessionId;

        // Save current session's loading state before switching
        if (currentId) {
          set(s => ({
            sessions: s.sessions.map(session =>
              session.id === currentId
                ? { ...session, isSessionLoading: s.isLoading }
                : session
            ),
          }));
        }

        // Find the target session
        const targetSession = get().sessions.find(s => s.id === sessionId);
        const targetMessages = targetSession?.messages || [];
        const targetIsLoading = targetSession?.isSessionLoading || false;

        // If target already has messages in memory, just switch without fetching
        if (targetMessages.length > 0) {
          set({ currentSessionId: sessionId, messages: targetMessages, isLoading: targetIsLoading, isLoadingHistory: false });
        } else {
          // Set loading state BEFORE clearing messages so UI shows spinner
          set({ currentSessionId: sessionId, messages: [], isLoading: targetIsLoading, isLoadingHistory: true });
          // Fetch from backend only when no cached messages
          get().fetchSessionHistory(sessionId);
        }
      },

      /* -------- FETCH SESSION HISTORY -------- */
      fetchSessionHistory: async (sessionId: string) => {
        if (!sessionId) return;
        set({ isLoadingHistory: true });

        try {
          const history = await fetchChatHistory(sessionId);

          // Extract messages from the nested structure (exhaustively)
          let rawMessages: Record<string, any>[] = [];
          if (Array.isArray(history)) {
            rawMessages = history;
          } else if (history && (history as any).messages && Array.isArray((history as any).messages)) {
            rawMessages = (history as any).messages;
          } else if (history && (history as any).chats && (history as any).chats.messages) {
            rawMessages = (history as any).chats.messages;
          } else if (history && typeof history === 'object') {
            const internalMessages = Object.values(history).find(val => Array.isArray(val));
            if (internalMessages) rawMessages = internalMessages as Record<string, any>[];
          }

          const mappedMessages: ChatMessage[] = rawMessages.map((item: Record<string, any>, index: number) => {
            const isUser = item?.role === "user" || item?.content?.query || item?.query;

            if (isUser) {
              // Ensure queryValue is a string
              const queryValue = item.query ||
                (typeof item.content === 'string' ? item.content : item.content?.query) ||
                "";

              return {
                id: item.message_id || `msg-${sessionId}-${index}-user`,
                content: String(queryValue),
                timestamp: new Date(item.timestamp || item.created_at || Date.now()),
                type: "user",
                role: "user",
                mode: "dashboard",
                visualRendered: false,
              };
            } else {
              // Assistant/bot message - extract result object
              const result = item.content?.result || item.result || item.data || item.response || {};

              // Ensure assistantContent is a string
              let assistantContent = "";
              if (typeof item.content === 'string') {
                assistantContent = item.content;
              } else if (item.message) {
                assistantContent = item.message;
              } else if (result.content && typeof result.content === 'string') {
                assistantContent = result.content;
              } else if (item.content?.result?.content) {
                assistantContent = item.content.result.content;
              }

              // Helper to safely extract string values
              const safeString = (val: any, fallback: string = ""): string => {
                if (typeof val === 'string') return val;
                if (!val) return fallback;
                if (typeof val === 'object') {
                  return val.text || val.label || val.title || val.name || JSON.stringify(val);
                }
                return String(val);
              };

              // Extract KPIs
              const kpis = result.kpis || result.metrics || [];
              const mappedMetrics = kpis.map((m: any) => ({
                title: safeString(m.title || m.label || m.name, "KPI"),
                icon: safeString(m.icon, "📊"),
                color: safeString(m.color, "indigo"),
                value: safeString(m.value),
                change: safeString(m.change),
                progressWidth: safeString(m.progressWidth, "0%"),
                note: safeString(m.note),
                delay: 0,
              }));

              // Extract table
              const tableRows = Array.isArray(result.table) ? result.table
                : Array.isArray(result.tableData) ? result.tableData : [];

              // Extract insights
              const insightsObj = result.insights || {};
              const mappedInsights = Object.values(insightsObj).map((txt: any) => ({
                title: String(txt),
                description: "",
              }));

              // Strip string formatters from chart options (they contain ${c} etc.
              // which crash production React during static optimization)
              const sanitizeChartOption = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(sanitizeChartOption);
                const out: any = {};
                for (const [k, v] of Object.entries(obj)) {
                  if (k === 'formatter' && typeof v === 'string') continue;
                  out[k] = sanitizeChartOption(v);
                }
                return out;
              };

              // Extract charts
              const chartList = (result.charts || result.chartOptions || []).map((c: any) => {
                if (c.chartOptions) return sanitizeChartOption(c.chartOptions);
                return sanitizeChartOption(c);
              }).filter(Boolean);

              const hasVisuals = mappedMetrics.length > 0 || tableRows.length > 0 || chartList.length > 0 || mappedInsights.length > 0;
              const msgId = item.message_id || `msg-${sessionId}-${index}-assistant`;

              // Populate dashboard data store for this message
              if (hasVisuals) {
                useDashboardStore.getState().setDashboardData(msgId, {
                  metricData: mappedMetrics,
                  tableData: tableRows,
                  insightsData: mappedInsights,
                  chartOptionsData: chartList,
                });
              }

              // Map metrics for text mode display
              const textMetrics = mappedMetrics.map((m: any) => ({
                label: m.title,
                value: m.value,
                backgroundColor: undefined,
                textColor: undefined
              }));

              // Map table data safely
              const safeTableData = tableRows.map((row: any) => {
                const safeRow: any = {};
                Object.keys(row).forEach(key => {
                  safeRow[key] = safeString(row[key]);
                });
                return safeRow;
              });

              return {
                id: msgId,
                content: String(assistantContent),
                timestamp: new Date(item.timestamp || item.created_at || Date.now()),
                type: "bot",
                role: "assistant",
                mode: hasVisuals ? "dashboard" : "text",
                visualRendered: hasVisuals,
                data: {
                  tableData: tableRows.length > 0 && tableRows[0] && typeof tableRows[0] === 'object' ? {
                    columns: Object.keys(tableRows[0]).map(key => ({ key, label: safeString(key).replace(/_/g, " ") })),
                    rows: safeTableData
                  } : undefined,
                  metrics: textMetrics.length > 0 ? textMetrics : undefined,
                },
              };
            }
          });

          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === sessionId ? { ...s, messages: mappedMessages, updatedAt: new Date() } : s,
            ),
            messages: state.currentSessionId === sessionId ? mappedMessages : state.messages,
            isLoadingHistory: false,
          }));
        } catch (error: unknown) {
          console.error("❌ Failed to fetch session history:", error);

          const err = error as { status?: number; message?: string };
          // If session doesn't exist on backend (404), DO NOT clear it locally anymore
          // This allows new chats to persist in the sidebar even before they are saved to backend
          if (err.status === 404 || err.message?.includes("404") || err.message?.includes("Chat not found")) {
            console.warn("⚠️ Session not found on backend — keeping local session state.");
            set({ isLoadingHistory: false });
          } else {
            set({ isLoadingHistory: false });
          }
        }
      },

      /* -------- FETCH TITLES FROM BACKEND -------- */
      fetchTitlesFromBackend: async () => {
        try {
          const titles = await fetchChatTitles();

          set((state) => {
            const existingBackendIds = new Set(titles.map((t) => t.chat_id));
            const localOnlySessions = state.sessions.filter(
              (s) => !existingBackendIds.has(s.id)
            );

            const updatedSessions = state.sessions.map((session) => {
              const backendTitle = titles.find((t) => t.chat_id === session.id);
              if (backendTitle) {
                return { ...session, title: backendTitle.title };
              }
              return session;
            });

            // Add sessions from backend that don't exist locally
            const newSessionsFromBackend = titles
              .filter((t) => !state.sessions.some(s => s.id === t.chat_id))
              .map((t) => ({
                id: t.chat_id,
                title: t.title,
                createdAt: new Date(),
                updatedAt: new Date(),
                messages: [],
              }));

            // Combine local-only sessions, updated existing sessions, and new backend sessions
            const combinedSessions = [
              ...localOnlySessions,
              ...updatedSessions.filter(s => existingBackendIds.has(s.id)), // Only include updated sessions that have a backend counterpart
              ...newSessionsFromBackend,
            ];

            // Ensure uniqueness and sort by updatedAt (most recent first)
            const uniqueSessions = Array.from(new Map(combinedSessions.map(s => [s.id, s])).values())
              .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            // Update nextChatNumber to be above any backend U_XXXX ID
            const allIds = [...uniqueSessions.map(s => s.id)];
            const maxNum = allIds.reduce((max, id) => {
              const match = id?.match?.(/^U_(\d+)$/);
              return match ? Math.max(max, parseInt(match[1], 10)) : max;
            }, 0);
            const newNextChatNumber = Math.max(state.nextChatNumber, maxNum + 1);

            return {
              sessions: uniqueSessions,
              nextChatNumber: newNextChatNumber,
            };
          });
        } catch (error) {
          console.error("❌ Failed to fetch titles from backend:", error);
        }
      },

      /* -------- DELETE SESSION -------- */
      deleteSession: (sessionId: string) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId);

          // If deleting current session, switch to most recent or create new
          let newCurrentId = state.currentSessionId;
          let newMessages = state.messages;

          if (state.currentSessionId === sessionId) {
            if (newSessions.length > 0) {
              newCurrentId = newSessions[0].id;
              newMessages = newSessions[0].messages;
            } else {
              // Create a new session if none exist
              const newSession = createNewSessionObject(state.nextChatNumber);
              newSessions.push(newSession);
              newCurrentId = newSession.id;
              newMessages = [];
            }
          }

          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
            messages: newMessages,
            nextChatNumber: state.currentSessionId === sessionId && newSessions.length === 1
              ? state.nextChatNumber + 1
              : state.nextChatNumber,
          };
        });

        // Call backend API to delete
        deleteChatSession(sessionId).catch((err) =>
          console.error("❌ Failed to delete chat on backend:", err)
        );
      },

      /* -------- UPDATE SESSION TITLE -------- */
      updateSessionTitle: (sessionId: string, title: string) => {
        const state = get();
        const session = state.sessions.find((s) => s.id === sessionId);

        // Skip if title is the same to avoid redundant backend calls
        if (session && session.title === title) {
          return;
        }

        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, title, updatedAt: new Date() }
              : session,
          ),
        }));

        // Call backend API to update title
        updateChatTitle(sessionId, title).catch((err) =>
          console.error("❌ Failed to update title on backend:", err)
        );
      },

      /* -------- GET CURRENT SESSION -------- */
      getCurrentSession: () => {
        const state = get();
        return (
          state.sessions.find((s) => s.id === state.currentSessionId) || null
        );
      },
    }),
    {
      name: "chat-sessions-storage",
      // FIXED: Proper serialization with all message data
      partialize: (state) => ({
        sessions: state.sessions.map((session) => ({
          ...session,
          createdAt: typeof session.createdAt === 'string' ? session.createdAt : session.createdAt.toISOString(),
          updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : session.updatedAt.toISOString(),
          // EXCLUDE messages from persistence as per user request
          messages: [],
        })),
        currentSessionId: state.currentSessionId,
        nextChatNumber: state.nextChatNumber,
        // EXCLUDE messages from persistence
        messages: [],
      }),
      // FIXED: Proper rehydration that ensures messages are NOT restored and triggers fetch
      onRehydrateStorage: () => (state) => {
        if (state) {

          // Convert ISO strings back to Date objects and CLEAR messages
          state.sessions = (state.sessions || []).map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt),
            updatedAt: new Date(session.updatedAt),
            messages: [], // CRITICAL: Ensure local storage messages are discarded
          }));

          // CLEAR top-level messages
          state.messages = [];

          // Recompute nextChatNumber from existing sessions
          const existingNumbers = (state.sessions || [])
            .map((s: any) => {
              const match = s.id?.match?.(/^U_(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter((n: number) => n > 0);
          if (existingNumbers.length > 0) {
            state.nextChatNumber = Math.max(...existingNumbers) + 1;
          } else if (!state.nextChatNumber) {
            state.nextChatNumber = 1;
          }

          // Create initial session if none exist
          if (state.sessions.length === 0) {
            const newSession = createNewSessionObject(state.nextChatNumber);
            state.sessions = [newSession];
            state.currentSessionId = newSession.id;
            state.nextChatNumber = state.nextChatNumber + 1;
          }

          // Fetch titles from backend, then fetch history for current session
          setTimeout(async () => {
            const store = useChatStore.getState();
            await store.fetchTitlesFromBackend();

            // Only fetch history if there are actual backend sessions
            const updatedState = useChatStore.getState();
            const currentId = updatedState.currentSessionId;
            const hasBackendSessions = updatedState.sessions.some(
              (s) => s.messages.length > 0 || s.title !== "New Chat"
            );

            if (currentId && hasBackendSessions) {
              // Only fetch if the current session is a real backend session (not a local-only chat)
              const currentSession = updatedState.sessions.find((s) => s.id === currentId);
              if (currentSession && currentSession.title !== "") {
                store.fetchSessionHistory(currentId);
              } else {
              }
            } else {
            }
          }, 500); // Small delay to ensure store is ready
        }
      },
    },
  ),
);
