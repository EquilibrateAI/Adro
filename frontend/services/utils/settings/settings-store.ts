import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchSettings } from "@/services/api/settings/fetch-settings";

interface SettingsStore {
  // Model configuration
  selectedProvider: string;
  selectedModel: string;
  apiKey: string;
  port: string;
  baseUrl: string;
  isConnected: boolean;

  // Actions
  setSelectedProvider: (provider: string) => void;
  setSelectedModel: (model: string) => void;
  setApiKey: (key: string) => void;
  setPort: (port: string) => void;
  setBaseUrl: (url: string) => void;
  setConnected: (connected: boolean) => void;

  // Selected files persistence
  selectedFiles: string[];
  setSelectedFiles: (files: string[]) => void;

  // Fetch from backend
  syncFromBackend: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      selectedProvider: "",
      selectedModel: "",
      apiKey: "",
      port: "",
      baseUrl: "",
      isConnected: false,

      selectedFiles: [],

      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiKey: (key) => set({ apiKey: key }),
      setPort: (port) => set({ port: port }),
      setBaseUrl: (url) => set({ baseUrl: url }),
      setConnected: (connected) => set({ isConnected: connected }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),

      syncFromBackend: async () => {
        try {
          const data = await fetchSettings();
          // Normalize provider name to Title case so it matches UI provider list
          const providerMap: Record<string, string> = {
            openai: "OpenAI",
            claude: "Claude",
            gemini: "Gemini",
            groq: "Groq",
            openrouter: "OpenRouter",
            ollama: "Ollama",
            "lm studio": "LM Studio",
            lmstudio: "LM Studio",
            "llama.cpp": "llama.cpp",
            vllm: "vllm",
          };
          const rawProvider = (data.model_provider || "").toLowerCase();
          const normalizedProvider = providerMap[rawProvider] || data.model_provider || "";
          set({
            selectedProvider: normalizedProvider,
            selectedModel: data.model || "",
            apiKey: data.api_key || "",
            port: data.port || "",
            baseUrl: data.baseUrl || "",
            isConnected: !!(data.model_provider),
          });
        } catch (error) {
          console.error("❌ Failed to sync settings from backend:", error);
        }
      },
    }),
    {
      name: "settings-store",
    }
  )
);
