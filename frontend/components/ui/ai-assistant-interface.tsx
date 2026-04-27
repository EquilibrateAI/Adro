/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowUp,
  Plus,
  Copy,
  MessageSquare,
  BarChart3,
  Layout,
  X,
  Zap,
  FileSpreadsheet,
  Database,
  Check,
  Clock,
  ChevronDown,
  Brain,
  CircleStop,
  RotateCcw,
  Bot,
  Cloud,
  Cpu,
  Server,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import MultiSelect from "@/components/ui/multiselect";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import Chart from "@/components/dashboard/chart/chart";
import { Dashboard } from "@/components/dashboard/dashboard/dashboard";
import { useChatStore } from "@/services/utils/dashboard/text-mode/chat-cli-store";
import { useGeneratedChartDataStore } from "@/services/utils/dashboard/chart/generated-chart-data-store";
import { useChartAnalyticsStore } from "@/services/utils/dashboard/chart/chart-analytics-store";
import { useDashboardStore } from "@/services/utils/dashboard/dashboard/dashboard-data-store";
import { toast } from "sonner";
import { RotatingText } from "@/components/ui/rotating-text";
import { useSettingsStore } from "@/services/utils/settings/settings-store";
import { dashboardGenerationApi } from "@/services/api/dashboard-new/dashboard-one";

interface DatabaseFile {
  id: string;
  name: string;
  icon: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface AIAssistantInterfaceProps {
  onSelectedFilesChange?: (files: string[]) => void;
}

// The main chat interface for interacting with the AI assistant
export function AIAssistantInterface({
  onSelectedFilesChange,
}: AIAssistantInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const settingsStore = useSettingsStore();
  const [selectedFiles, setSelectedFilesLocal] = useState<string[]>(settingsStore.selectedFiles || []);
  const [showFileModal, setShowFileModal] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<DatabaseFile[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Wrapper to persist selected files
  // State management wrapper to synchronize local file selection with the global settings store
  const setSelectedFiles = (filesOrFn: string[] | ((prev: string[]) => string[])) => {
    setSelectedFilesLocal(prev => {
      const newFiles = typeof filesOrFn === 'function' ? filesOrFn(prev) : filesOrFn;
      settingsStore.setSelectedFiles(newFiles);
      return newFiles;
    });
  };

  // Provider icon mapping for model indicator
  const providerIcons: Record<string, any> = {
    OpenAI: Brain,
    Claude: Bot,
    Gemini: Cloud,
    Groq: Cpu,
    Ollama: Server,
    "LM Studio": Server,
    "llama.cpp": Cpu,
    OpenRouter: Brain,
    vllm: Server,
  };
  const ModelIcon = providerIcons[settingsStore.selectedProvider] || Brain;

  // Sync settings from backend on mount
  useEffect(() => {
    settingsStore.syncFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsStore.syncFromBackend]);

  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  const { messages, isLoading, isLoadingHistory, addMessage, updateMessage, setLoading, currentSessionId, getNextMessageId } =
    useChatStore();
  const { setDashboardData } = useDashboardStore();

  // Notify parent when selectedFiles changes
  useEffect(() => {
    if (onSelectedFilesChange) {
      onSelectedFilesChange(selectedFiles);
    }
  }, [selectedFiles, onSelectedFilesChange]);

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast.error("Speech recognition failed. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Asynchronously fetches and formats available data sources with their respective icons
    async function loadDataSources() {
      try {
        const data = await fetchDataSources();
        const filesWithIcons = data.map((ds: any) => ({
          id: ds.id,
          name: ds.name,
          icon:
            ds.type.toLowerCase() === "csv"
              ? "📄"
              : ds.type.toLowerCase() === "mysql"
                ? "🐬"
                : ds.type.toLowerCase() === "postgresql"
                  ? "🐘"
                  : ds.type.toLowerCase() === "mongodb"
                    ? "🍃"
                    : ds.type.toLowerCase() === "sqlite"
                      ? "📁"
                      : "❓",
        }));
        setAvailableFiles(filesWithIcons);
      } catch (error) {
        console.error("Failed to load data sources:", error);
      }
    }
    loadDataSources();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Copy utility that provides visual feedback to the user on success
  const handleCopyMessage = useCallback(
    (messageId: string, content: string) => {
      navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast.success("Copied to clipboard!");
    },
    [],
  );

  // Aborts the current AI response generation and resets loading state
  const handleStopRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      toast.info("Request cancelled");
    }
  };

  const lastUserMessage = [...messages].reverse().find(m => m.type === "user");
  const lastUserQuery = lastUserMessage?.content || "";

  // Re-populates the input with the last query and triggers a new send attempt
  const handleRetry = useCallback(() => {
    if (lastUserQuery) {
      setInputValue(lastUserQuery);
      setTimeout(() => {
        inputRef.current?.focus();
        setTimeout(() => handleSendMessage(), 100);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastUserQuery]);

  // Toggles the browser's native speech recognition for voice-to-text input
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak now.");
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        toast.error("Failed to start speech recognition.");
      }
    }
  };

  // Main orchestration function for sending user queries and processing the AI's dashboard output
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one data source");
      return;
    }

    const cleanedDataSourceIds = selectedFiles.map((id) => id.split(".")[0]);
    const currentInput = inputValue;

    const activeSessionId = currentSessionId || "new_session";
    const messageId = getNextMessageId();

    setInputValue("");

    const isFirstMessage = (messages || []).length === 0;

    addMessage({
      id: messageId,
      content: currentInput,
      type: "user",
      mode: "dashboard",
    });

    if (isFirstMessage) {
      // The title is already sent in the dashboardGenerationApi payload,
      // so we don't need a separate updateSessionTitle call here.
      // This prevents redundant API calls and race conditions.
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const payload = {
        chat_id: useChatStore.getState().currentSessionId || activeSessionId,
        message_id: messageId,
        file_name: cleanedDataSourceIds.join(", "),
        message: currentInput,
        title: currentInput
      };

      const response = await dashboardGenerationApi(
        payload,
        abortControllerRef.current.signal,
      );
      const responseData = response?.result || response || {};
      const rawContent = responseData?.content ?? responseData?.message ?? "";
      const msgContent = typeof rawContent === 'string' ? rawContent : (typeof rawContent === 'object' && rawContent !== null ? (rawContent as any).text || JSON.stringify(rawContent) : String(rawContent ?? ""));

      const botMessageId = getNextMessageId();

      // Sanitization utility for ECharts options
      const sanitizeOption = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(sanitizeOption);

        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // ECharts specific guards: convert string properties that should be objects
          if (['title', 'xAxis', 'yAxis', 'legend', 'tooltip'].includes(key)) {
            if (typeof value === 'string') {
              if (key === 'title') {
                sanitized[key] = { text: value, show: true };
              } else {
                sanitized[key] = { show: true };
              }
              continue;
            }
          }

          if (key === 'series') {
            sanitized[key] = Array.isArray(value) ? value.map(sanitizeOption) : [];
            continue;
          }

          if ((key === 'xAxis' || key === 'yAxis') && value === false) {
            continue;
          }

          // Strip formatter strings — they contain ${c} template literals which
          // crash production React during static optimization. ECharts will use
          // its default formatting without them.
          if (key === 'formatter' && typeof value === 'string') {
            continue;
          }

          sanitized[key] = sanitizeOption(value);
        }
        return sanitized;
      };

      // Helper to safely extract string values from potentially complex AI responses
      const safeString = (val: any, fallback: string = ""): string => {
        if (typeof val === 'string') return val;
        if (!val) return fallback;
        if (typeof val === 'object') {
          return val.text || val.label || val.title || val.name || JSON.stringify(val);
        }
        return String(val);
      };

      // Mapping KPIs
      const metrics = responseData?.kpis || responseData?.metrics || responseData?.metricData?.metricData || [];
      const mappedMetrics = metrics.map((m: any) => ({
        title: safeString(m.title || m.label || m.name, "KPI"),
        icon: safeString(m.icon, "📊"),
        color: safeString(m.color, "indigo"),
        value: safeString(m.value),
        change: safeString(m.change),
        progressWidth: safeString(m.progressWidth, "0%"),
        note: safeString(m.note),
        delay: 0,
      }));

      // Mapping Table
      const tableRows = Array.isArray(responseData?.table)
        ? responseData.table
        : Array.isArray(responseData?.tableData)
          ? responseData.tableData
          : [];

      // Mapping Insights
      const insightsObj = responseData?.insights || {};
      const mappedInsights = Object.values(insightsObj).map((txt: any) => ({
        title: String(txt),
        description: "",
      }));

      // Mapping Charts
      const additionalCharts = (responseData?.charts || []).map((c: any) => {
        if (!c) return null;
        
        
    // Backend already returns full ECharts config
    if (c.series) {
      return sanitizeOption(c);
    }

        console.warn("Chart skipped: missing option", c);
    return null;
  })
  .filter(Boolean);

      const chartList = [...additionalCharts].filter(Boolean) as any[];

      const hasVisuals = mappedMetrics.length > 0 || tableRows.length > 0 || chartList.length > 0 || mappedInsights.length > 0;

      if (hasVisuals) {
        setDashboardData(botMessageId, {
          metricData: mappedMetrics,
          tableData: tableRows,
          insightsData: mappedInsights,
          chartOptionsData: chartList,
        });
      }

      // Map metrics for text mode display as well
      const textMetrics = mappedMetrics.map((m: any) => ({
        label: m.title,
        value: m.value,
        backgroundColor: undefined, // Add if available in responseData
        textColor: undefined
      }));

      // Map table data to ensure all cells are strings
      const safeTableData = tableRows.map((row: any) => {
        const safeRow: any = {};
        Object.keys(row).forEach(key => {
          safeRow[key] = safeString(row[key]);
        });
        return safeRow;
      });

      addMessage({
  id: botMessageId,
  content: msgContent,
  type: "bot",
  mode: hasVisuals ? "dashboard" : "text",
  visualRendered: false,
 
        data: {
          tableData: tableRows.length > 0 && tableRows[0] && typeof tableRows[0] === 'object' ? {
            columns: Object.keys(tableRows[0]).map(key => ({ key, label: safeString(key).replace(/_/g, " ") })),
            rows: safeTableData
          } : undefined,
          metrics: textMetrics.length > 0 ? textMetrics : undefined,
        },
      });

      if (hasVisuals) {
        await delay(1000);
        updateMessage(botMessageId, { visualRendered: true });
      }

    } catch (error: any) {
      console.error("❌ API ERROR:", error);
      if (error.name !== "AbortError") {
        addMessage({
          content: `Sorry, I encountered an error. Please try again.`,
          type: "bot",
          mode: "text",
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const allDatabasesSelected =
    selectedFiles.length === availableFiles.length && availableFiles.length > 0;

  if (messages.length > 0 || isLoadingHistory) {
    return (
      <div className="h-full flex flex-col bg-white overflow-y-auto font-roboto">
        <div className="flex-1 px-6 py-4">
          <div className="max-w-full mx-auto space-y-4">
            {isLoadingHistory && messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4" />
                <p className="text-sm text-slate-500">Loading...</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  {message.type === "user" ? (
                    <>
                      <div className="flex justify-end">
                        <div className="inline-block max-w-[80%] rounded-2xl px-5 py-3 bg-gray-900 text-white shadow-sm">
                          <p className="text-md leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3 px-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-gray-800"
                            onClick={() =>
                              handleCopyMessage(message.id, message.content)
                            }
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-300" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      {/* Single Container for Content + Visualization */}
                      <div className="w-full rounded-2xl px-5 py-3 bg-gray-100 text-gray-900 shadow-sm">
<div className="mb-2 text-sm leading-tight break-words max-w-none">
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      p: ({ children }) => {
        if (!children || children.toString().trim() === "") return null;
        return <p className="my-0.5">{children}</p>;
      },
      ul: ({ children }) => <ul className="my-0.5 pl-4 list-disc">{children}</ul>,
      ol: ({ children }) => <ol className="my-0.5 pl-4 list-decimal">{children}</ol>,
      li: ({ children }) => <li className="my-0">{children}</li>,
      h1: ({ children }) => <h1 className="my-0.5 font-semibold">{children}</h1>,
      h2: ({ children }) => <h2 className="my-0.5 font-semibold">{children}</h2>,
      h3: ({ children }) => <h3 className="my-0.5 font-semibold">{children}</h3>,
      br: () => null,
      hr: () => null,
    }}
  >
    {message.content
      ? message.content
          .replace(/\r\n/g, "\n")
          .replace(/\n{2,}/g, "\n")
          .trim()
      : ""}
  </ReactMarkdown>
</div>

                        {/* Text Mode - Table Data */}
                        {message.mode === "text" && message.data?.tableData && (
                          <div className="mt-3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                            <Table className="w-full text-xs">
                              <TableHeader>
                                <TableRow className="bg-white border-b">
                                  {message.data.tableData.columns.map((col: any) => (
                                    <TableHead
                                      key={col.key}
                                      className="px-3 py-2 text-xs font-semibold text-gray-700 border-r last:border-r-0 whitespace-nowrap"
                                    >
                                      {col.label}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {message.data.tableData.rows.map((row: any, ridx: number) => (
                                  <TableRow
                                    key={ridx}
                                    className="border-b last:border-b-0"
                                  >
                                    {message.data?.tableData?.columns.map(
                                      (col: any) => (
                                        <TableCell
                                          key={col.key}
                                          className="px-3 py-2 border-r last:border-r-0 text-xs whitespace-nowrap"
                                        >
                                          {typeof row[col.key] === 'object' ? JSON.stringify(row[col.key]) : (row[col.key] ?? "")}
                                        </TableCell>
                                      ),
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}

                        {/* Text Mode - Metrics */}
                        {message.mode === "text" && message.data?.metrics && (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {message.data.metrics.map((metric: any, midx: number) => (
                              <div
                                key={midx}
                                className="p-3 rounded-lg border-2 bg-white"
                                style={{
                                  borderColor:
                                    metric.backgroundColor || "#e5e7eb",
                                }}
                              >
                                <div className="text-xs font-medium text-gray-600 mb-1">
                                  {typeof metric.label === 'object' ? JSON.stringify(metric.label) : (metric.label ?? "")}
                                </div>
                                <div className="text-md font-bold text-gray-900">
                                  {typeof metric.value === 'object' ? JSON.stringify(metric.value) : (metric.value ?? "")}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Unified Visualization (renders after content) */}
                        {message.visualRendered && (
                          <div className="mt-4 w-full">
                            <Dashboard dashboardId={message.id} />
                          </div>
                        )}
                      </div>

                      {/* Timestamp and Copy - Outside Container */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-between gap-1 px-2">
                          <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-xs text-slate-500">
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-gray-200"
                            onClick={() =>
                              handleCopyMessage(message.id, message.content)
                            }
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="space-y-2">
                <div className="inline-block rounded-2xl px-5 py-3 ">
                  <div className="flex items-center gap-2 italic text-gray-600">
                    <div className="text-emerald-400">
                      <Brain />
                    </div>
                    <RotatingText
                      text={[
                        "Thinking...",
                        "Generating response...",
                        "Analyzing data...",
                        "Please Wait...",
                      ]}
                      duration={2000}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-transparent sticky bottom-0 ">
          <div className="w-full mx-auto px-6 py-3 backdrop-blur-sm">
            <div className="backdrop-blur-xl bg-white/70 border border-white/20 rounded-2xl shadow-2xl overflow-hidden max-w-3xl flex flex-col flex-items-center mx-auto">
              <div className="p-4 pb-0 relative">
                <textarea
                  ref={inputRef}
                  placeholder="Ask me anything..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full text-gray-700 bg-transparent text-base outline-none placeholder:text-gray-400 pr-20 resize-none"
                  rows={2}
                />
              </div>

              <div className="px-4 py-3 flex items-center gap-3 border-t border-white/30">
                <button
                  onClick={() => setShowFileModal(true)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-lg transition-colors flex-shrink-0"
                  title="Attach files"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {selectedFiles.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    {selectedFiles.map((fileId) => {
                      const file = availableFiles.find((f) => f.id === fileId);
                      return (
                        <div
                          key={fileId}
                          className="flex items-center gap-2 bg-gray-50/70 py-1 px-2 rounded-md border border-gray-200/50 flex-shrink-0"
                        >
                          <span className="text-md">{file?.icon}</span>
                          <span className="text-xs text-gray-700 whitespace-nowrap">
                            {file?.name}
                          </span>
                          <button
                            onClick={() =>
                              setSelectedFiles((prev) =>
                                prev.filter((id) => id !== fileId),
                              )
                            }
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedFiles.length === 0 && <div className="flex-1" />}

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Model Indicator */}
                  {settingsStore.selectedProvider && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg" title={`${settingsStore.selectedProvider} - ${settingsStore.selectedModel}`}>
                      <ModelIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600 max-w-[100px] truncate">
                        {settingsStore.selectedModel || settingsStore.selectedProvider}
                      </span>
                    </div>
                  )}
                  {!isLoading && lastUserQuery && (
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1.5 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Retry last query"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-md font-medium">
                        Retry last prompt
                      </span>
                    </button>
                  )}
                  {isLoading ? (
                    <button
                      onClick={handleStopRequest}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Stop generation"
                    >
                      <CircleStop className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${inputValue.trim() && !isLoading
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100/70 text-gray-400 cursor-not-allowed"
                        }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
         
          </div>
        </div>

         <div className="px-4 pb-2 text-xs text-gray-600 text-center font-bold border-white/30 pt-2 relative">
                ADRO can make mistakes. Check important info.
              </div>
        <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
          <DialogContent
            ref={modalRef}
            className="max-w-[90vw] w-[90vw] h-[80vh] flex flex-col"
            onClick={(e) => e.preventDefault()}
          >
            <DialogHeader className="border-b pb-3 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-slate-600" />
                Select Data Sources
              </DialogTitle>
              <DialogDescription className="text-md">
                Choose the data sources you want to analyze. Select from
                available databases on the left, and manage your selections on
                the right.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex gap-6 p-6">
              <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-slate-800">
                    Available Data Sources
                  </h4>
                  <Badge variant="secondary" className="text-md">
                    {availableFiles.length} available
                  </Badge>
                </div>
                <div className="flex-1 overflow-auto">
                  <MultiSelect
                    options={availableFiles
                      .filter((file) => !selectedFiles.includes(file.id))
                      .map((file) => ({
                        value: file.id,
                        label: `${file.icon} ${file.name}`,
                      }))}
                    value={[]}
                    onChange={(options) => {
                      const values = options.map((o) => o.value);
                      setSelectedFiles([...selectedFiles, ...values]);
                    }}
                    placeholder="Search and select databases..."
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-slate-800">
                    Selected Sources
                  </h4>
                  <div className="flex items-center gap-2">
                    {allDatabasesSelected && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-md flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        All selected
                      </Badge>
                    )}
                    {!allDatabasesSelected && selectedFiles.length > 0 && (
                      <Badge variant="secondary" className="text-md">
                        {selectedFiles.length} selected
                      </Badge>
                    )}
                    {selectedFiles.length > 0 && (
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-md text-slate-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {selectedFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Database className="w-16 h-16 text-slate-300 mb-3" />
                      <p className="text-base text-slate-500 font-medium">
                        No data sources selected
                      </p>
                      <p className="text-md text-slate-400 mt-1">
                        Choose from available sources on the left
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedFiles.map((fileId) => {
                        const file = availableFiles.find(
                          (f) => f.id === fileId,
                        );
                        return (
                          <div
                            key={fileId}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-lg">{file?.icon}</span>
                              <span className="text-base text-slate-700 font-medium truncate">
                                {file?.name}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setSelectedFiles(
                                  selectedFiles.filter((id) => id !== fileId),
                                )
                              }
                              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFileModal(false)}
                className="px-6 py-2 text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowFileModal(false)}
                className="px-6 py-2 text-base bg-blue-600 hover:bg-blue-700 text-white"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 h-screen backdrop-blur-xl font-roboto">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center backdrop-blur-xl">
        <div className="mb-8 w-20 h-20 relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 200 200"
            width="100%"
            height="100%"
            className="w-full h-full"
          >
            <g clipPath="url(#cs_clip_1_ellipse-12)">
              <mask
                id="cs_mask_1_ellipse-12"
                style={{ maskType: "alpha" }}
                width="200"
                height="200"
                x="0"
                y="0"
                maskUnits="userSpaceOnUse"
              >
                <path
                  fill="#fff"
                  fillRule="evenodd"
                  d="M100 150c27.614 0 50-22.386 50-50s-22.386-50-50-50-50 22.386-50 50 22.386 50 50 50zm0 50c55.228 0 100-44.772 100-100S155.228 0 100 0 0 44.772 0 100s44.772 100 100 100z"
                  clipRule="evenodd"
                ></path>
              </mask>
              <g mask="url(#cs_mask_1_ellipse-12)">
                <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                <path
                  fill="#0066FF"
                  fillOpacity="0.33"
                  d="M200 0H0v200h200V0z"
                ></path>
                <g
                  filter="url(#filter0_f_844_2811)"
                  className="animate-gradient"
                >
                  <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                  <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                  <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                  <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                </g>
              </g>
            </g>
            <defs>
              <filter
                id="filter0_f_844_2811"
                width="385"
                height="410"
                x="-75"
                y="-104"
                colorInterpolationFilters="sRGB"
                filterUnits="userSpaceOnUse"
              >
                <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                <feBlend
                  in="SourceGraphic"
                  in2="BackgroundImageFix"
                  result="shape"
                ></feBlend>
                <feGaussianBlur
                  result="effect1_foregroundBlur_844_2811"
                  stdDeviation="40"
                ></feGaussianBlur>
              </filter>
              <clipPath id="cs_clip_1_ellipse-12">
                <path fill="#fff" d="M0 0H200V200H0z"></path>
              </clipPath>
            </defs>
            <g
              style={{ mixBlendMode: "overlay" }}
              mask="url(#cs_mask_1_ellipse-12)"
            >
              <path
                fill="gray"
                stroke="transparent"
                d="M200 0H0v200h200V0z"
                filter="url(#cs_noise_1_ellipse-12)"
              ></path>
            </g>
            <defs>
              <filter
                id="cs_noise_1_ellipse-12"
                width="100%"
                height="100%"
                x="0%"
                y="0%"
                filterUnits="objectBoundingBox"
              >
                <feTurbulence
                  baseFrequency="0.6"
                  numOctaves="5"
                  result="out1"
                  seed="4"
                ></feTurbulence>
                <feComposite
                  in="out1"
                  in2="SourceGraphic"
                  operator="in"
                  result="out2"
                ></feComposite>
                <feBlend
                  in="SourceGraphic"
                  in2="out2"
                  mode="overlay"
                  result="out3"
                ></feBlend>
              </filter>
            </defs>
          </svg>
        </div>

        <div className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
              Adro is here to assist you
            </h1>
            <p className="text-gray-500 max-w-md">
              Ask me anything or try one of the suggestions below
            </p>
          </motion.div>
        </div>

        <div className="w-full  bg-white/70 border border-white/20 rounded-2xl shadow-2xl overflow-hidden mb-4">
          <div className="p-4 pb-0 relative">
            <textarea
              ref={inputRef}
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full text-gray-700 bg-transparent text-base outline-none placeholder:text-gray-400 pr-20 resize-none"
              rows={3}
            />
          </div>

          <div className="px-4 py-3 flex items-center gap-3 border-t border-white/30">
            <button
              onClick={() => setShowFileModal(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 rounded-lg transition-colors flex-shrink-0"
              title="Attach files"
            >
              <Plus className="w-5 h-5" />
            </button>

            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                {selectedFiles.map((fileId) => {
                  const file = availableFiles.find((f) => f.id === fileId);
                  return (
                    <div
                      key={fileId}
                      className="flex items-center gap-2 bg-gray-50/70 py-1 px-2 rounded-md border border-gray-200/50 flex-shrink-0"
                    >
                      <span className="text-md">{file?.icon}</span>
                      <span className="text-xs text-gray-700 whitespace-nowrap">
                        {file?.name}
                      </span>
                      <button
                        onClick={() =>
                          setSelectedFiles((prev) =>
                            prev.filter((id) => id !== fileId),
                          )
                        }
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedFiles.length === 0 && <div className="flex-1" />}

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Model Indicator */}
              {settingsStore.selectedProvider && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg" title={`${settingsStore.selectedProvider} - ${settingsStore.selectedModel}`}>
                  <ModelIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600 max-w-[100px] truncate">
                    {settingsStore.selectedModel || settingsStore.selectedProvider}
                  </span>
                </div>
              )}
              {!isLoading && lastUserQuery && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Retry last query"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-md font-medium">Retry last prompt</span>
                </button>
              )}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${inputValue.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-100/70 text-gray-400 cursor-not-allowed"
                  }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {false && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full mb-6 overflow-hidden"
            ></motion.div>
          )}
        </AnimatePresence>

        <Dialog open={showFileModal} onOpenChange={setShowFileModal}>
          <DialogContent
            ref={modalRef}
            className="max-w-[90vw] w-[90vw] h-[80vh] flex flex-col"
            onClick={(e) => e.preventDefault()}
          >
            <DialogHeader className="border-b pb-3 flex-shrink-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-slate-600" />
                Select Data Sources
              </DialogTitle>
              <DialogDescription className="text-md">
                Choose the data sources you want to analyze. Select from
                available databases on the left, and manage your selections on
                the right.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex gap-6 p-6">
              <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-slate-800">
                    Available Data Sources
                  </h4>
                  <Badge variant="secondary" className="text-md">
                    {availableFiles.length} available
                  </Badge>
                </div>
                <div className="flex-1 overflow-auto">
                  <MultiSelect
                    options={availableFiles
                      .filter((file) => !selectedFiles.includes(file.id))
                      .map((file) => ({
                        value: file.id,
                        label: `${file.icon} ${file.name}`,
                      }))}
                    value={[]}
                    onChange={(options) => {
                      const values = options.map((o) => o.value);
                      setSelectedFiles([...selectedFiles, ...values]);
                    }}
                    placeholder="Search and select databases..."
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-semibold text-slate-800">
                    Selected Sources
                  </h4>
                  <div className="flex items-center gap-2">
                    {allDatabasesSelected && (
                      <Badge className="bg-green-100 text-green-700 border-green-300 text-md flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        All selected
                      </Badge>
                    )}
                    {!allDatabasesSelected && selectedFiles.length > 0 && (
                      <Badge variant="secondary" className="text-md">
                        {selectedFiles.length} selected
                      </Badge>
                    )}
                    {selectedFiles.length > 0 && (
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-md text-slate-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  {selectedFiles.length === 0 ? (
                    <section className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Database className="w-16 h-16 text-slate-300 mb-3" />
                      <p className="text-base text-slate-500 font-medium">
                        No data sources selected
                      </p>
                      <p className="text-md text-slate-400 mt-1">
                        Choose from available sources on the left
                      </p>
                    </section>
                  ) : (
                    <div className="space-y-2">
                      {selectedFiles.map((fileId) => {
                        const file = availableFiles.find(
                          (f) => f.id === fileId,
                        );
                        return (
                          <div
                            key={fileId}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-lg">{file?.icon}</span>
                              <span className="text-base text-slate-700 font-medium truncate">
                                {file?.name}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setSelectedFiles(
                                  selectedFiles.filter((id) => id !== fileId),
                                )
                              }
                              className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 bg-white flex-shrink-0 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowFileModal(false)}
                className="px-6 py-2 text-base"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowFileModal(false)}
                className="px-6 py-2 text-base bg-blue-600 hover:bg-blue-700 text-white"
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
       
    </div>
     
  );
}
