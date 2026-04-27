"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Sparkles,
  MessageSquare,
  BarChart3,
  Layout,
  Plus,
  Copy,
  Check,
  X,
  ArrowUp,
  Mic,
  CircleStop,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChatInput } from "@/components/ui/chat-input";
import MultiSelect from "@/components/ui/multiselect";
import { useDashboardMode } from "@/services/utils/dashboard/dashboard-mode-store";
import { fetchDataSources, type DataSource } from "@/services/api/data/sidebar/data-source";
import { useChatStore, ChatMessage } from "@/services/utils/dashboard/text-mode/chat-cli-store";
import { fetchTextModeData } from "@/services/api/dashboard/text-mode/chat-cli/text-mode-data";
import { plotChartData } from "@/services/api/dashboard/chart/chart-plotter";
import { useGeneratedChartDataStore } from "@/services/utils/dashboard/chart/generated-chart-data-store";
import { toast } from "sonner";
import { useChartAnalyticsStore } from "@/services/utils/dashboard/chart/chart-analytics-store";
import { useDashboardStore } from "@/services/utils/dashboard/dashboard/dashboard-data-store";
import type { ChartOption } from "@/services/utils/dashboard/dashboard/dashboard-data-store";
import { dashboardApiOne } from "@/services/api/dashboard/dashboard/dashboard-one";
import { dashboardApiTwo } from "@/services/api/dashboard/dashboard/dashboard-two";
import { dashboardApiThree } from "@/services/api/dashboard/dashboard/dashboard-three";
import { useSettingsStore } from "@/services/utils/settings/settings-store";

interface DatabaseFile {
  id: string;
  name: string;
  icon: string;
}


const MODE_CONFIG = {
  text: {
    label: "Text Analysis",
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: MessageSquare,
    gradient: "from-emerald-50 to-green-50",
    borderColor: "border-emerald-100",
  },
  chart: {
    label: "Chart Builder",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: BarChart3,
    gradient: "from-blue-50 to-indigo-50",
    borderColor: "border-blue-100",
  },
  dashboard: {
    label: "Dashboard",
    color: "bg-purple-500",
    lightColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Layout,
    gradient: "from-purple-50 to-violet-50",
    borderColor: "border-purple-100",
  },
};

const QUICK_ACTIONS = {
  text: [
    {
      icon: "📊",
      label: "Analyze Sales",
      prompt: "Analyze our sales data by region",
    },
    {
      icon: "📈",
      label: "Growth Metrics",
      prompt: "Show customer growth trends",
    },
    { icon: "💰", label: "Revenue", prompt: "Calculate total revenue metrics" },
  ],
  chart: [
    { icon: "📉", label: "Trend Chart", prompt: "Plot sales trends over time" },
    {
      icon: "🥧",
      label: "Distribution",
      prompt: "Create a pie chart of revenue by product",
    },
    {
      icon: "📊",
      label: "Comparison",
      prompt: "Compare metrics between categories",
    },
  ],
  dashboard: [
    {
      icon: "🎯",
      label: "KPI Dashboard",
      prompt: "Create KPI dashboard for this period",
    },
    { icon: "📋", label: "Summary", prompt: "Show comprehensive data summary" },
    {
      icon: "🔍",
      label: "Analysis",
      prompt: "Build detailed analysis dashboard",
    },
  ],
};

// The right-side sidebar that handles chat interactions and data source selection
export default function SidebarRight() {
  const [chatInput, setChatInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [lastQuery, setLastQuery] = useState("");

  // --- NEW: State to remember last dashboard params for retries ---
  const [lastDashboardParams, setLastDashboardParams] = useState<{
    prompt: string;
    files: string[];
  } | null>(null);

  const { dashboardTab } = useDashboardMode();
  const chatMessages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const { setChartOptions } = useGeneratedChartDataStore();
  const { setInsights, setMetrics, setRecommendations, setChartType } =
    useChartAnalyticsStore();
  const setMetricDataStore = useDashboardStore((s) => s.setMetricData);
  const setChartOptionsDataStore = useDashboardStore(
    (s) => s.setChartOptionsData
  );
  const setTableDataStore = useDashboardStore((s) => s.setTableData);
  const setInsightsDataStore = useDashboardStore((s) => s.setInsightsData);
  const chartOptionsTemplate = useDashboardStore((s) => s.chartOptionsData);
  const { selectedProvider, selectedModel, isConnected } = useSettingsStore();

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [availableFiles, setAvailableFiles] = useState<DatabaseFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [firstMessageSent, setFirstMessageSent] = useState<{
    [k: string]: boolean;
  }>({
    chart: false,
    dashboard: false,
    text: false,
  });

  useEffect(() => {
    async function loadDataSources() {
      const data = await fetchDataSources();
      const filesWithIcons = data.map((ds: DataSource) => ({
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
    }
    loadDataSources();
  }, []);

  const getFilteredMessages = () => {
    return (chatMessages || []).filter((m) => m.mode === dashboardTab);
  };

  const filteredMessages = getFilteredMessages();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [filteredMessages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [chatInput]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    if (showDataSourceModal) {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("click", handleClick, true);
      return () => {
        document.removeEventListener("mousedown", handleMouseDown);
        document.removeEventListener("click", handleClick, true);
      };
    }
  }, [showDataSourceModal]);

  const markFirstMessageSentForCurrentMode = () => {
    setFirstMessageSent((prev) => ({ ...prev, [dashboardTab]: true }));
  };

  const updateChartAnalyticsFromResponse = (response: Record<string, unknown>) => {
    try {
      const r = response as {
        analytics?: {
          insights?: string[];
          metrics?: Record<string, string | number>;
          recommendations?: string[];
        };
        insights?: string[];
        metrics?: Record<string, string | number>;
        recommendations?: string[];
        data?: {
          insights?: string[];
          metrics?: Record<string, string | number>;
          recommendations?: string[];
        };
        options?: { chart?: { type?: string } };
        chartType?: string;
        type?: string;
      };

      const maybeInsights = Array.isArray(response)
        ? response
        : r?.analytics?.insights ??
          r?.analytics ??
          r?.insights ??
          r?.data?.insights ??
          [];
      if (Array.isArray(maybeInsights) && maybeInsights.length) {
        setInsights(maybeInsights);
      }
      const maybeMetrics =
        r?.analytics?.metrics ??
        r?.metrics ??
        r?.data?.metrics;
      if (maybeMetrics && typeof maybeMetrics === "object") {
        setMetrics(maybeMetrics as Record<string, string | number>);
      }
      const maybeRecs =
        r?.analytics?.recommendations ??
        r?.recommendations ??
        r?.data?.recommendations;
      if (Array.isArray(maybeRecs)) {
        setRecommendations(maybeRecs as string[]);
      }
      const maybeChartType =
        r?.options?.chart?.type ||
        r?.chartType ||
        r?.type ||
        null;
      if (maybeChartType) setChartType(maybeChartType);
    } catch (e) {
      console.warn("Failed to update chart analytics", e);
    }
  };

  // --- Independent Fetch Functions for Dashboard Sections (Retries) ---

  const fetchMetricsData = useCallback(async (prompt: string, files: string[]) => {
    window.dispatchEvent(
      new CustomEvent("dashboard-loading-metrics", { detail: true })
    );

    try {
      const response1 = await dashboardApiOne(
        dashboardTab,
        prompt,
        files,
        selectedModel,
        selectedProvider,
        abortControllerRef.current?.signal
      );
      const metricsRes = (response1 as unknown as { metricData?: { metricData?: Record<string, unknown>[] } })?.metricData?.metricData || [];
      const mappedMetrics = metricsRes.map((m) => ({
        title: String(m.title || ""),
        icon: String(m.icon || ""),
        color: String(m.color || ""),
        value: String(m.value || ""),
        change: "",
        progressWidth: "0%",
        note: "",
        delay: 0,
      }));
      setMetricDataStore(mappedMetrics);
    } catch (e) {
      console.error("Metrics API failed", e);
      toast.error("Failed to load metrics");
      // Fire error event for section one
      window.dispatchEvent(
        new CustomEvent("dashboard-error-metrics", { detail: true })
      );
    } finally {
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-metrics", { detail: false })
      );
    }
  }, [dashboardTab, setMetricDataStore, selectedModel, selectedProvider]);

  const fetchTableData = useCallback(async (prompt: string, files: string[]) => {
    window.dispatchEvent(
      new CustomEvent("dashboard-loading-table", { detail: true })
    );

    try {
      const response3 = await dashboardApiThree(
        dashboardTab,
        prompt,
        files,
        selectedModel,
        selectedProvider,
        abortControllerRef.current?.signal
      );

      const table = Array.isArray(response3?.tableData)
        ? response3.tableData
        : [];
      setTableDataStore(table);

      const insightsObj = (response3 as { insights?: Record<string, string> })?.insights || {};
      const mappedInsights = Object.values(insightsObj).map((txt) => ({
        title: String(txt),
        description: "",
      }));

      if (mappedInsights.length) setInsightsDataStore(mappedInsights);
    } catch (e) {
      console.error("Table API failed", e);
      toast.error("Could not generate table data.");
      // Fire error event for section three
      window.dispatchEvent(
        new CustomEvent("dashboard-error-table", { detail: true })
      );
    } finally {
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-table", { detail: false })
      );
    }
  }, [dashboardTab, setTableDataStore, setInsightsDataStore, selectedModel, selectedProvider]);

  const fetchChartsData = useCallback(async (prompt: string, files: string[]) => {
    window.dispatchEvent(
      new CustomEvent("dashboard-loading-charts", { detail: true })
    );

    try {
      const response2 = await dashboardApiTwo(
        dashboardTab,
        prompt,
        files,
        selectedModel,
        selectedProvider,
        abortControllerRef.current?.signal
      ) as unknown as {
        chart1?: { data: unknown[]; name?: string };
        chart2?: { data: Record<string, unknown>; name?: string };
        options?: unknown;
      };

      const lineTemplate = chartOptionsTemplate?.[0] as unknown as { xAxis?: { data?: unknown[] }; series?: { name?: string; data?: unknown[] }[] };
      const pieTemplate = chartOptionsTemplate?.[1] as unknown as { series?: { name?: string; data?: unknown[] }[] };

      const buildLineOption = () => {
        const rawData = Array.isArray(response2?.chart1?.data)
          ? response2.chart1.data
          : [];
        const categories = rawData.map((_: unknown, i: number) => String(i + 1));
        if (lineTemplate) {
          return {
            ...lineTemplate,
            title: { ...{}, text: "" },
            xAxis: { ...(lineTemplate.xAxis || {}), data: categories },
            series: [
              {
                ...(lineTemplate.series?.[0] || {}),
                name:
                  response2?.chart1?.name ||
                  lineTemplate.series?.[0]?.name ||
                  "Series",
                data: rawData,
              },
            ],
          };
        }
        return {
          tooltip: { trigger: "axis" },
          title: { text: "" },
          xAxis: { type: "category", data: categories },
          yAxis: { type: "value" },
          series: [
            {
              name: response2?.chart1?.name || "Series",
              type: "line",
              smooth: true,
              data: rawData,
              symbol: "circle",
              symbolSize: 8,
              lineStyle: { width: 3, color: "#4f46e5" },
              itemStyle: { color: "#4f46e5" },
            },
          ],
        };
      };

      const buildPieOption = () => {
        const chart2Obj = response2?.chart2?.data || {};
        const entries = Object.entries(chart2Obj);
        const baseColors = [
          "#4f46e5",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#6366f1",
          "#06b6d4",
          "#ec4899",
        ];
        const transformed = entries.map(
          ([k, v]: [string, unknown], idx: number) => ({
            value: Number(v),
            name: k,
            itemStyle: { color: baseColors[idx % baseColors.length] },
          })
        );
        if (pieTemplate) {
          return {
            ...pieTemplate,
            title: { ...{}, text: "" },
            series: [
              {
                ...(pieTemplate.series?.[0] || {}),
                name:
                  response2?.chart2?.name ||
                  pieTemplate.series?.[0]?.name ||
                  "Distribution",
                data: transformed,
              },
            ],
          };
        }
        return {
          tooltip: { trigger: "item" },
          legend: { top: "5%", left: "center" },
          title: { text: response2?.chart2?.name || "Distribution" },
          series: [
            {
              name: response2?.chart2?.name || "Distribution",
              type: "pie",
              radius: ["50%", "80%"],
              center: ["50%", "55%"],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 6,
                borderColor: "#fff",
                borderWidth: 2,
              },
              label: { show: false, position: "center" },
              emphasis: {
                label: { show: true, fontSize: 18, fontWeight: "bold" },
              },
              labelLine: { show: false },
              data: transformed,
            },
          ],
        };
      };

      const newLine = response2?.chart1?.data ? buildLineOption() : null;
      const newPie = response2?.chart2?.data ? buildPieOption() : null;
      const chartList = [newLine, newPie].filter(Boolean) as ChartOption[];

      if (chartList.length) setChartOptionsDataStore(chartList);
    } catch (e) {
      console.error("Chart API failed", e);
      toast.error("Could not generate charts.");
      // Fire error event for section two
      window.dispatchEvent(
        new CustomEvent("dashboard-error-charts", { detail: true })
      );
    } finally {
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-charts", { detail: false })
      );
    }
  }, [dashboardTab, chartOptionsTemplate, setChartOptionsDataStore, selectedModel, selectedProvider]);

  // --- Listeners for RETRY events from sections ---
  useEffect(() => {
    const onRetryMetrics = () => {
      if (lastDashboardParams) {
        fetchMetricsData(lastDashboardParams.prompt, lastDashboardParams.files);
      }
    };
    const onRetryTable = () => {
      if (lastDashboardParams) {
        fetchTableData(lastDashboardParams.prompt, lastDashboardParams.files);
      }
    };
    const onRetryCharts = () => {
      if (lastDashboardParams) {
        fetchChartsData(lastDashboardParams.prompt, lastDashboardParams.files);
      }
    };

    window.addEventListener("dashboard-retry-metrics", onRetryMetrics);
    window.addEventListener("dashboard-retry-table", onRetryTable);
    window.addEventListener("dashboard-retry-charts", onRetryCharts);

    return () => {
      window.removeEventListener("dashboard-retry-metrics", onRetryMetrics);
      window.removeEventListener("dashboard-retry-table", onRetryTable);
      window.removeEventListener("dashboard-retry-charts", onRetryCharts);
    };
  }, [lastDashboardParams, fetchMetricsData, fetchTableData, fetchChartsData]);

  // --- Handlers ---

  const handleSendMessageText = async () => {
    if (!chatInput.trim()) return;

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one data source", {
        description: "Click on the '+' icon in the dashboard Sidebar",
        duration: 3000,
      });
      return;
    }

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date(),
      mode: "text",
    };

    const currentInput = chatInput;
    setLastQuery(currentInput);
    setChatInput("");
    addMessage(newMessage);
    markFirstMessageSentForCurrentMode();
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const newSelected = selectedFiles.map((file) => {
        const noCsvName = file.split(".")[0];
        return noCsvName;
      });

      const result = await fetchTextModeData(
        currentInput,
        dashboardTab,
        newSelected,
        selectedModel,
        selectedProvider
      );

      const botResponse: ChatMessage = {
        id: Date.now().toString(),
        type: "bot",
        content: result.content,
        timestamp: new Date(),
        mode: "text",
        data: {
          tableData: result.data?.tableData || undefined,
          metrics: result.data?.metrics || undefined,
        },
      };
      addMessage(botResponse);
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === "AbortError") {
      } else {
        const errorResponse: ChatMessage = {
          id: Date.now().toString(),
          type: "bot",
          content: "Sorry, there was an error processing your request.",
          timestamp: new Date(),
          mode: "text",
        };
        addMessage(errorResponse);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const addSingleChartSuccessReply = async () => {
    const botMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "bot",
      content: "Chart generated successfully!",
      timestamp: new Date(),
      mode: "chart",
    };
    addMessage(botMsg);
  };

  const handleSendMessageChart = async () => {
    if (!chatInput.trim()) return;

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one data source", {
        description: "Choose a data source before creating a chart",
        duration: 3000,
      });
      return;
    }

    const newSelected = selectedFiles.map((files) => {
      const newWithoutCsv = files.split(".")[0];
      return newWithoutCsv;
    });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date(),
      mode: "chart",
    };

    const currentInput = chatInput;
    setLastQuery(currentInput);
    addMessage(userMsg);
    markFirstMessageSentForCurrentMode();
    setChatInput("");
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      window.dispatchEvent(new CustomEvent("chart-loading", { detail: true }));

      const response = await plotChartData(
        dashboardTab,
        currentInput,
        newSelected,
        selectedModel,
        selectedProvider,
        abortControllerRef.current.signal
      );

      setChartOptions(response?.options);
      updateChartAnalyticsFromResponse(response);
      await addSingleChartSuccessReply();
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === "AbortError") {
      } else {
        console.error("Error fetching chart data:", error);
        addMessage({
          id: Date.now().toString(),
          type: "bot",
          content:
            "I couldn't build the chart — try adjusting the prompt or data sources.",
          timestamp: new Date(),
          mode: "chart",
        });
      }
    } finally {
      window.dispatchEvent(
        new CustomEvent("chart-loading", { detail: false })
      );

      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessageDashboard = async () => {
    if (!chatInput.trim()) return;

    if (selectedFiles.length === 0) {
      toast.error("Please select at least one data source", {
        description: "Choose a data source before building a dashboard",
        duration: 3000,
      });
      return;
    }

    const newSelected = selectedFiles.map((files) => files.split(".")[0]);
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: chatInput,
      timestamp: new Date(),
      mode: "dashboard",
    };

    const currentInput = chatInput;
    setLastQuery(currentInput);

    // --- NEW: SAVE PARAMS ---
    setLastDashboardParams({ prompt: currentInput, files: newSelected });

    addMessage(userMsg);
    markFirstMessageSentForCurrentMode();
    setChatInput("");
    setIsLoading(true);

    // 1. Clear previous dashboard data
    setMetricDataStore([]);
    setChartOptionsDataStore([]);
    setTableDataStore([]);
    setInsightsDataStore([]);

    abortControllerRef.current = new AbortController();

    try {
      // 2. Dispatch Start Events for ALL sections
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("dashboard-loading-metrics", { detail: true })
        );
        window.dispatchEvent(
          new CustomEvent("dashboard-loading-table", { detail: true })
        );
        window.dispatchEvent(
          new CustomEvent("dashboard-loading-charts", { detail: true })
        );
      }, 100);

      // --- STEP 1: METRICS (Section One) ---
      // Re-using our independent function
      await fetchMetricsData(currentInput, newSelected);

      await delay(500);

      // --- STEP 2: TABLE & INSIGHTS (Section Three) ---
      // Re-using our independent function
      await fetchTableData(currentInput, newSelected);

      await delay(500);

      // --- STEP 3: CHARTS (Section Two) ---
      // Re-using our independent function
      await fetchChartsData(currentInput, newSelected);

      addMessage({
        id: Date.now().toString(),
        type: "bot",
        content: "Dashboard generation complete.",
        timestamp: new Date(),
        mode: "dashboard",
      });
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name === "AbortError") {
      } else {
        console.error("Error building dashboard:", error);
        addMessage({
          id: Date.now().toString(),
          type: "bot",
          content: "I couldn't build the dashboard — try a different request.",
          timestamp: new Date(),
          mode: "dashboard",
        });
      }
    } finally {
      // Clean up all loaders
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-metrics", { detail: false })
      );
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-table", { detail: false })
      );
      window.dispatchEvent(
        new CustomEvent("dashboard-loading-charts", { detail: false })
      );
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      setChatInput(lastQuery);
      setTimeout(() => {
        if (dashboardTab === "text") {
          handleSendMessageText();
        } else if (dashboardTab === "chart") {
          handleSendMessageChart();
        } else if (dashboardTab === "dashboard") {
          handleSendMessageDashboard();
        }
      }, 0);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setChatInput(prompt);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (dashboardTab === "text") handleSendMessageText();
      else if (dashboardTab === "chart") handleSendMessageChart();
      else if (dashboardTab === "dashboard") handleSendMessageDashboard();
    }
  };

  const currentMode =
    MODE_CONFIG[dashboardTab as keyof typeof MODE_CONFIG] || MODE_CONFIG.text;
  const quickActions =
    QUICK_ACTIONS[dashboardTab as keyof typeof QUICK_ACTIONS] ||
    QUICK_ACTIONS.text;
  const ModeIcon = currentMode.icon;

  const showQuickTips =
    dashboardTab === "text" ? true : !firstMessageSent[dashboardTab];
  const allDatabasesSelected =
    selectedFiles.length === availableFiles.length && availableFiles.length > 0;

  return (
    <div className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-gradient-to-b from-slate-50 to-white flex flex-col shadow-2xl border-l border-slate-200 z-50">
      <div className="p-6 flex-shrink-0 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${currentMode.color}`}>
            <ModeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              AI Assistant
            </h3>
            <p className="text-sm text-slate-500">
              Analyze your data with ease
            </p>
          </div>
        </div>
        <div
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border ${currentMode.lightColor}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${currentMode.color} mr-2`}
          ></div>
          {currentMode.label}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {dashboardTab === "text" ||
            (filteredMessages.length === 0 && showQuickTips) ? (
              <div className="text-center py-8 px-4 space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-1">
                    Start analyzing
                  </h4>
                  <p className="text-sm text-slate-500">
                    Ask me anything about your data
                  </p>
                </div>
                <div className="space-y-2">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-xs text-slate-700 font-medium flex items-center gap-2"
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg text-sm group ${
                        msg.type === "user"
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-slate-200 text-slate-900 rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      {msg.type === "bot" && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-200 text-slate-900 px-4 py-2 rounded-lg rounded-bl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

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

        {!isLoading && lastQuery && filteredMessages.length > 0 && (
          <div className="flex items-center justify-start mb-2">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry last prompt
            </button>
          </div>
        )}

        <div className="relative flex items-stretch gap-0">
          <div className="flex-1 relative">
            <ChatInput
              ref={textareaRef}
              placeholder={`Ask ${selectedModel || "AI"} to ${
                dashboardTab === "text"
                  ? "analyze your data..."
                  : dashboardTab === "chart"
                  ? "create charts..."
                  : "build dashboards..."
              }`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="text-sm rounded-lg border-slate-300 bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none pl-12 pr-24"
              disabled={isLoading}
              rows={1}
            />

            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowDataSourceModal(true)}
                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                title="Select Data Sources"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <button
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Record voice"
              >
                <Mic className="w-4 h-4" />
              </button>
              {isLoading ? (
                <button
                  onClick={handleStopRequest}
                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors cursor-pointer"
                  title="Stop generation"
                >
                  <CircleStop className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={
                    dashboardTab === "text"
                      ? handleSendMessageText
                      : dashboardTab === "chart"
                      ? handleSendMessageChart
                      : handleSendMessageDashboard
                  }
                  disabled={!chatInput.trim()}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded transition-colors disabled:cursor-not-allowed cursor-pointer"
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Model badge */}
        <div className="flex items-center gap-1.5 px-1 mt-1">
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

      <Dialog open={showDataSourceModal} onOpenChange={setShowDataSourceModal}>
        <DialogContent
          ref={modalRef}
          className="max-w-5xl h-[70vh] flex flex-col"
          onClick={(e) => e.preventDefault()}
        >
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-slate-600" />
              Data Sources
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select your data sources to analyze. Left: Available databases.
              Right: Selected sources.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 p-4">
            <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">
                  Available Data Sources
                </h4>
                <Badge variant="secondary" className="text-xs">
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
                  placeholder="Select databases..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">
                  Selected Sources
                </h4>
                <div className="flex items-center gap-2">
                  {allDatabasesSelected && (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      All databases selected
                    </Badge>
                  )}
                  {!allDatabasesSelected && selectedFiles.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedFiles.length} selected
                    </Badge>
                  )}
                  {selectedFiles.length > 0 && (
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1">
                {selectedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Database className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">
                      No data sources selected
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedFiles.map((fileId) => {
                      const file = availableFiles.find((f) => f.id === fileId);
                      return (
                        <div
                          key={fileId}
                          className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors group"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span>{file?.icon}</span>
                            <span className="text-sm text-slate-700 truncate">
                              {file?.name}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedFiles(
                                selectedFiles.filter((id) => id !== fileId)
                              )
                            }
                            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowDataSourceModal(false)}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setShowDataSourceModal(false)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
