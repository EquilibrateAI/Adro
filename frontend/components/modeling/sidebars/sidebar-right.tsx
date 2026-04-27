"use client";

import { useEffect, useState, useRef } from "react";

import {
  Copy,
  Check,
  X,
  Plus,
  Send,
  Bot,
} from "lucide-react";
import { ChatInput } from "@/components/ui/chat-input";
import { fetchDataSources, type DataSource } from "@/services/api/data/sidebar/data-source";
import { uploadFile } from "@/services/api/data/files/upload/file-upload";
import { toast } from "sonner";
import { AIThinkingLoader } from "@/components/ui/ai-thinking-loader";
import { useSettingsStore } from "@/services/utils/settings/settings-store";
import { SingleSelectDialog } from "@/components/ui/single-select-dialog";

interface TableData {
  [key: string]: unknown;
}

interface Metrics {
  [key: string]: unknown;
}

interface DatabaseFile {
  id: string;
  name: string;
  icon: string;
  type?: string;
}

interface ChatMessage {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  data?: {
    tableData?: TableData;
    metrics?: Metrics;
  };
}

interface QueryHistory {
  id: string;
  timestamp: Date;
  query: string;
  result: string;
  type: "predict" | "optimize";
}

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date | string;
}

interface SidebarRightProps {
  activeTab: string;
  selectedFiles: string[];
  setSelectedFiles: (files: string[]) => void;
  naturalLanguageInput: string;
  setNaturalLanguageInput: (val: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  handleRunQuery: () => void;
  queryHistory?: QueryHistory[];
  isLoading?: boolean;
  messages?: ChatMessage[];
  onAddMessage?: (msg: ChatMessage) => void;
}

const QUICK_ACTIONS = {
  predict: [
    {
      icon: "🔮",
      label: "Sales Forecast",
      prompt: "Predict next quarter sales based on historical trends",
    },
    {
      icon: "📊",
      label: "Churn Analysis",
      prompt: "Forecast customer churn probability",
    },
    {
      icon: "📈",
      label: "Growth Prediction",
      prompt: "Predict growth based on marketing spend",
    },
  ],
  optimize: [
    {
      icon: "🎯",
      label: "Budget Allocation",
      prompt: "Optimize marketing budget allocation to maximize ROI",
    },
    {
      icon: "💰",
      label: "Cost Optimization",
      prompt: "Find best cost optimization strategy",
    },
    {
      icon: "⚡",
      label: "Performance",
      prompt: "Optimize resource allocation for peak performance",
    },
  ],
};

/**
 * SidebarRight
 * Renders the AI-powered side panel for interactive chat and data source selection.
 * Handles the display of the chat history, file attachments, and handles natural language prompts.
 */
export function SidebarRight({
  activeTab,
  selectedFiles,
  setSelectedFiles,
  naturalLanguageInput,
  setNaturalLanguageInput,
  handleRunQuery,
  queryHistory,
  isLoading = false,
  messages = [],
}: SidebarRightProps) {
  const [availableFiles, setAvailableFiles] = useState<DatabaseFile[]>([]);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { selectedProvider, selectedModel, isConnected } = useSettingsStore();

  useEffect(() => {
    // Fetches available database connections to populate the selection modal
    async function loadDataSources() {
      try {
        const data = await fetchDataSources();
        const filesWithIcons = data.map((ds: DataSource) => ({
          id: ds.id,
          name: ds.name,
          type: ds.type,
          icon:
            ds.type?.toLowerCase() === "csv"
              ? "📄"
              : ds.type?.toLowerCase() === "mysql"
                ? "🐬"
                : ds.type?.toLowerCase() === "postgresql"
                  ? "🐘"
                  : ds.type?.toLowerCase() === "mongodb"
                    ? "🍃"
                    : ds.type?.toLowerCase() === "sqlite"
                      ? "📁"
                      : "❓",
        }));
        setAvailableFiles(filesWithIcons);
      } catch (error) {
        console.error("Failed to load data sources:", error);
        setAvailableFiles([]);
      }
    }
    loadDataSources();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [naturalLanguageInput]);



  // Copies the text content of a chat message to the user's system clipboard
  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Automatically populates the input field with a predefined analytical prompt
  const handleQuickAction = (prompt: string) => {
    setNaturalLanguageInput(prompt);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];
    const metadata = JSON.stringify({ source: "chat-upload", timestamp: new Date().toISOString() });

    try {
      await uploadFile(file, metadata);
      toast.success(`File "${file.name}" uploaded successfully!`);

      // Refresh available files and find the newly added one
      const data = await fetchDataSources();
      const updatedFiles = data.map((ds: DataSource) => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        icon: ds.type?.toLowerCase() === "csv" ? "📄" : "❓",
      }));
      setAvailableFiles(updatedFiles);

      const newlyAdded = updatedFiles.find(f => f.name === file.name);
      if (newlyAdded && !selectedFiles.includes(newlyAdded.id)) {
        setSelectedFiles([...selectedFiles, newlyAdded.id]);
      }
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const err = error as Error;
      toast.error(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyPressInternal = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const quickActions =
    QUICK_ACTIONS[activeTab as keyof typeof QUICK_ACTIONS] ||
    QUICK_ACTIONS.predict;


  const showQuickTips = messages.length === 0;


  const displayedMessages = messages.length > 0
    ? messages
    : (queryHistory || []).slice().reverse().flatMap(qh => {
      const msgs = [];
      // Add user query
      msgs.push({
        id: `${qh.id}-user`,
        type: "user" as const,
        content: qh.query,
        timestamp: qh.timestamp
      });
      // Add bot response if it exists (including "Processing...")
      if (qh.result) {
        msgs.push({
          id: `${qh.id}-bot`,
          type: "bot" as const,
          content: qh.result,
          timestamp: qh.timestamp
        });
      }
      return msgs;
    });

  return (
    <div className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white flex flex-col shadow-2xl border-l border-slate-200 z-50">
      {/* Header */}
      <div className="px-5 py-4 flex-shrink-0 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 leading-tight">
                AI Assistant
              </h3>
              <p className="text-xs text-slate-400 leading-tight">
                {activeTab === "predict" ? "Predict and forecast" : "Optimize and plan"}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative chat-message-container">
        <div className="flex-1 overflow-y-scroll overflow-x-hidden scroll-smooth custom-scrollbar min-h-0">
          <div className="p-5 pb-10 space-y-6">
            {displayedMessages.length === 0 && showQuickTips ? (
              <div className="flex flex-col pt-10 px-5">
                {/* Greeting */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-1.5">
                    {activeTab === "predict" ? "Run a prediction ✦" : "Start optimizing ⚡"}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    You can{" "}
                    <span className="font-semibold text-slate-800">
                      {activeTab === "predict"
                        ? "forecast trends and model outcomes"
                        : "optimize budgets and strategy"}
                    </span>{" "}
                    with your data
                    <span className="ml-0.5 inline-block w-0.5 h-4 bg-slate-400 align-middle animate-pulse"></span>
                  </p>
                </div>

                {/* Suggestion pills */}
                <div className="space-y-2.5">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.prompt)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm transition-all duration-200 ${idx === 1
                        ? "bg-slate-100 text-slate-900 font-medium hover:bg-slate-200"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                        }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {displayedMessages.map((msg: Message) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.type === "user" ? "items-end" : "items-start"
                      } transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 px-2 group`}
                  >
                    <div
                      className={`max-w-[95%] px-3 py-1.5 rounded-2xl text-sm shadow-sm ${msg.type === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-slate-200"
                        }`}
                    >
                      {msg.content === "Processing..." && msg.type === "bot" ? (
                        <div className="flex flex-col items-center py-1.5 px-3">
                          <AIThinkingLoader size="sm" />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                    </div>
                    {msg.type === "user" && (
                      <div className="mt-1.5 px-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    {msg.type === "bot" && msg.content !== "Processing..." && (
                      <div className="mt-1.5 flex items-center gap-3 px-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Copy className="w-3 h-3" />
                              Copy
                            </div>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start px-2">
                    <div className="bg-white/60 backdrop-blur-sm border border-indigo-50 px-5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex flex-col items-center">
                      <AIThinkingLoader size="sm" />
                    </div>
                  </div>
                )}
                <div ref={scrollRef} className="h-4" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 space-y-2">
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedFiles.map((fileId) => {
              const file = availableFiles.find((f) => f.id === fileId);
              return (
                <div
                  key={fileId}
                  className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-700"
                >
                  <span>{file?.icon}</span>
                  <span className="truncate max-w-[100px]">{file?.name}</span>
                  <button
                    onClick={() =>
                      setSelectedFiles(
                        selectedFiles.filter((id) => id !== fileId)
                      )
                    }
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
          <div className="relative flex items-end gap-0">
            <div className="flex-1 relative">
              <ChatInput
                ref={textareaRef}
                placeholder={`Ask ${selectedModel || "AI"} anything...`}
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                onKeyDown={handleKeyPressInternal}
                className="text-sm rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-slate-300 focus:border-transparent resize-none pl-12 pr-12 py-3 text-slate-700 placeholder:text-slate-400"
                disabled={isLoading || isUploading}
                rows={1}
              />

              <div className="absolute left-2 bottom-2 flex items-center gap-0.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".csv,.duckdb,.sqlite"
                />
                <button
                  onClick={() => setShowDataSourceModal(true)}
                  disabled={isUploading}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
                  title="Select Data Sources"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="absolute right-2 bottom-2 flex items-center">
                <button
                  onClick={handleRunQuery}
                  disabled={
                    !naturalLanguageInput.trim() ||
                    isLoading
                  }
                  className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors disabled:cursor-not-allowed cursor-pointer"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Model badge */}
          <div className="flex items-center gap-1.5 px-1">
            {isConnected && selectedProvider ? (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[220px]">
                  {selectedProvider}{selectedModel ? ` · ${selectedModel}` : ""}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 italic">No model connected — go to Settings</span>
            )}
          </div>
        </div>
      </div>

      <SingleSelectDialog
        open={showDataSourceModal}
        onOpenChange={setShowDataSourceModal}
        options={availableFiles}
        value={selectedFiles[0] || null}
        onChange={(val) => setSelectedFiles(val ? [val] : [])}
        title="Select Data Source"
        description="Select a single data source to analyze for your prediction or optimization."
      />
    </div>
  );
}