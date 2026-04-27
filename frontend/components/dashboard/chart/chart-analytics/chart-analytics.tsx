
import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VariantProps } from "class-variance-authority";
import { 
  BarChart3, 
  TrendingUp, 
  Target,
  Share,
  Download,
  Sparkles,
  BarChart2
} from "lucide-react";
import { Component as LumaSpin } from "@/components/luma-spin";
import { useChartAnalyticsStore } from "@/services/utils/dashboard/chart/chart-analytics-store";

interface ChartAnalyticsProps {
  className?: string;
  metrics?: Record<string, string | number>;
  insights?: Array<{
    type: "positive" | "neutral" | "negative";
    label: string;
    text: string;
  }>;
  recommendations?: string[];
  isLoading?: boolean;
}

type BadgeVariant = VariantProps<typeof Badge>["variant"];

const INSIGHT_CONFIG = {
  positive: {
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "✅",
    borderLeft: "border-l-green-500"
  },
  neutral: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    border: "border-blue-200", 
    text: "text-blue-800",
    icon: "ℹ️",
    borderLeft: "border-l-blue-500"
  },
  negative: {
    bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
    border: "border-yellow-200",
    text: "text-yellow-800", 
    icon: "⚠️",
    borderLeft: "border-l-yellow-500"
  },
  default: {
    bg: "bg-gradient-to-br from-gray-50 to-slate-50",
    border: "border-gray-200",
    text: "text-gray-800",
    icon: "📊",
    borderLeft: "border-l-gray-500"
  }
};

const RECOMMENDATION_COLORS = [
  "bg-blue-500", 
  "bg-green-500", 
  "bg-purple-500", 
  "bg-orange-500",
  "bg-pink-500"
];

// A simple loading indicator that cycles through analytics-related messages
const SequentialLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in space-y-2">
      <div className="mb-4">
        <LumaSpin />
      </div>
    </div>
  );
};

// A component that displays a detailed breakdown of chart metrics, insights, and recommendations
export const ChartAnalytics: React.FC<ChartAnalyticsProps> = ({
  className,
  metrics: propMetrics = {},
  insights: propInsights = [],
  recommendations: propRecommendations = [],
  isLoading = false,
}) => {
  const { 
    metrics: storeMetrics, 
    insights: storeInsights, 
    recommendations: storeRecommendations, 
    chartType 
  } = useChartAnalyticsStore();
  
  // ✅ FIXED: Add safety checks for all store values
  const metrics = Object.keys(propMetrics || {}).length 
    ? propMetrics 
    : (typeof storeMetrics === 'object' && storeMetrics !== null && !Array.isArray(storeMetrics) 
        ? storeMetrics 
        : {});

  const insights = (propInsights || []).length 
    ? propInsights 
    : (Array.isArray(storeInsights) ? storeInsights : []);

  const recommendations = (propRecommendations || []).length 
    ? propRecommendations 
    : (Array.isArray(storeRecommendations) ? storeRecommendations : []);

  const [showLoader, setShowLoader] = React.useState(isLoading);

  React.useEffect(() => {
    const handleChartLoading = (e: CustomEvent<boolean>) =>
      setShowLoader(e.detail);
    window.addEventListener("chart-loading", handleChartLoading as EventListener);
    return () =>
      window.removeEventListener(
        "chart-loading",
        handleChartLoading as EventListener
      );
  }, []);

  const badgeVariant: BadgeVariant = "outline";

  // ✅ FIXED: Add type safety checks
  const hasData = 
    (metrics && typeof metrics === 'object' && !Array.isArray(metrics) && Object.keys(metrics).length > 0) || 
    (insights && Array.isArray(insights) && insights.length > 0) || 
    (recommendations && Array.isArray(recommendations) && recommendations.length > 0);

  const getInsightConfig = (type: string) => {
    return INSIGHT_CONFIG[type as keyof typeof INSIGHT_CONFIG] || INSIGHT_CONFIG.default;
  };

  const getRecommendationColor = (index: number) => {
    return RECOMMENDATION_COLORS[index % RECOMMENDATION_COLORS.length];
  };

// Formats metric values based on their key (e.g., adds currency or percentage symbols)
  const renderMetricValue = (key: string, value: string | number) => {
    if (key === "totalRevenue") return `$${value}M`;
    if (key === "growthRate") return `+${value}%`;
    return value;
  };

// Generates and downloads a CSV file containing the current analytics report
  const handleExport = () => {
    const csvContent = [
      ["Chart Analytics Report"],
      ["Export Date", new Date().toLocaleString()],
      ["Chart Type", chartType || "N/A"],
      [],
      ["KEY METRICS"],
      ...Object.entries(metrics).map(([key, value]) => [key, value]),
      [],
      ["KEY INSIGHTS"],
      ...insights.map((insight) => [insight.label, insight.text, insight.type]),
      [],
      ["RECOMMENDATIONS"],
      ...recommendations.map((rec, idx) => [`${idx + 1}. ${rec}`]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart-analytics-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

// Facilitates sharing the analytics report via the Web Share API or by copying to clipboard
  const handleShare = () => {
    const shareText = `
Chart Type: ${chartType || "N/A"}

Key Metrics:
${Object.entries(metrics)
  .map(([key, value]) => `• ${key}: ${renderMetricValue(key, value)}`)
  .join("\n")}

Key Insights:
${insights.map((insight) => `• ${insight.label}: ${insight.text}`).join("\n")}

Recommendations:
${recommendations.map((rec, idx) => `${idx + 1}. ${rec}`).join("\n")}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    if (navigator.share) {
      navigator
        .share({
          title: "Chart Analytics",
          text: shareText,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Analytics copied to clipboard!");
    }
  };

  return (
    <div className={`h-full flex flex-col ${className || ""}`}>
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Chart Analytics</h3>
            <p className="text-xs text-slate-600">Insights and interpretation</p>
          </div>
        </div>
      </div>
      
      {/* Container with proper flex layout */}
      <div className="flex-1 w-full flex flex-col overflow-hidden">
        {showLoader ? (
          <div className="flex-1 flex items-center justify-center">
            <SequentialLoader />
          </div>
        ) : !hasData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
            <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
              <BarChart2 className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No Analytics Available</p>
            <p className="text-xs text-slate-500 text-center">Generate a chart to see insights and recommendations</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 overflow-hidden w-full"
          >
            {/* ScrollArea with explicit height constraint */}
            <ScrollArea className="h-full w-full">
              <div className="w-full">
                <div className="p-6">
                  <motion.div
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-4"
                  >
                    {chartType && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <h4 className="font-semibold text-sm text-blue-800">Chart Type</h4>
                        </div>
                        <Badge
                          variant={badgeVariant}
                          className="bg-white text-blue-700 border-blue-300 shadow-sm capitalize"
                        >
                          {chartType}
                        </Badge>
                      </div>
                    )}

                    {Object.keys(metrics).length > 0 && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <h4 className="font-semibold text-sm text-green-800">Key Metrics</h4>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(metrics).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center bg-white p-3 rounded border border-green-100">
                              <span className="text-xs text-gray-600 font-medium">{key}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 font-bold">
                                {renderMetricValue(key, value)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {insights.length > 0 && (
                    <motion.div
                      initial={{ y: 10 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="space-y-4 mt-4"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <h4 className="font-semibold text-sm text-slate-800">Key Insights</h4>
                        <Badge variant="secondary" className="text-xs h-5">
                          {insights.length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {insights.map((insight, index) => {
                          const config = getInsightConfig(insight.type);
                          return (
                            <div
                              key={index}
                              className={`p-3 ${config.bg} rounded-lg border border-l-4 ${config.border} ${config.borderLeft} shadow-sm`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-sm">{config.icon}</span>
                                <p className={`text-xs ${config.text} leading-relaxed`}>
                                  <span className="font-semibold">
                                    {insight.label}:
                                  </span>{" "}
                                  {insight.text}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {recommendations.length > 0 && (
                    <motion.div
                      initial={{ y: 10 }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-3 mt-4 pb-4"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-600" />
                        <h4 className="font-semibold text-sm text-slate-800">Recommendations</h4>
                        <Badge variant="secondary" className="text-xs h-5">
                          {recommendations.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {recommendations.map((recommendation, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                            <div
                              className={`w-2 h-2 ${getRecommendationColor(index)} rounded-full mt-2 flex-shrink-0`}
                            ></div>
                            <p className="text-xs text-gray-700 leading-relaxed">{recommendation}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="pt-3 pb-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={handleExport}
                        variant="outline"
                        className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 text-blue-700 shadow-sm hover:bg-blue-200"
                        size="sm"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Export
                      </Button>
                      <Button
                        onClick={handleShare}
                        variant="outline"
                        className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 text-green-700 shadow-sm hover:bg-green-200"
                        size="sm"
                      >
                        <Share className="w-3 h-3 mr-1" />
                        Share
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ChartAnalytics;