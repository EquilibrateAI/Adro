/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from 'echarts/core';
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  TreemapChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LinesChart,
  MapChart,
  ParallelChart,
  PictorialBarChart,
  SankeyChart,
  SunburstChart,
  ThemeRiverChart,
  TreeChart,
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,
  ToolboxComponent,
  PolarComponent,
  GeoComponent,
  SingleAxisComponent,
  ParallelComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  DatasetComponent,
  TransformComponent,
  AriaComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LabelLayout, UniversalTransition } from 'echarts/features';

// Register all ECharts components including logarithmic support
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  TreemapChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  FunnelChart,
  GaugeChart,
  GraphChart,
  HeatmapChart,
  LinesChart,
  MapChart,
  ParallelChart,
  PictorialBarChart,
  SankeyChart,
  SunburstChart,
  ThemeRiverChart,
  TreeChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,
  ToolboxComponent,
  PolarComponent,
  GeoComponent,
  SingleAxisComponent,
  ParallelComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  DatasetComponent,
  TransformComponent,
  AriaComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);


import { useEChartsResize } from "@/hooks/use-echarts-resize";
import { validateChartOption } from "@/services/api/dashboard/chart/chart-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Sparkles,
  Target,
  FileText,
  Printer,
  Download,
  Maximize2,
} from "lucide-react";
import * as htmlToImage from "html-to-image";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// A simple loading indicator that cycles through helpful messages
const SequentialLoader = () => {
  const messages = [
    "Preparing visualization...",
    "Loading data...",
    "Almost there...",
    "Please wait ⏳",
  ];
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % messages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      <p className="text-slate-500 text-sm font-medium">{messages[step]}</p>
    </div>
  );
};

const INSIGHT_CONFIG = {
  positive: {
    bg: "bg-gradient-to-br from-green-50 to-emerald-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "✅",
    borderLeft: "border-l-green-500",
  },
  neutral: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "ℹ️",
    borderLeft: "border-l-blue-500",
  },
  negative: {
    bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
    border: "border-yellow-200",
    text: "text-yellow-800",
    icon: "⚠️",
    borderLeft: "border-l-yellow-500",
  },
};

const RECOMMENDATION_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
];

interface UnifiedChartCardProps {
  chartId?: string;
  title?: string;
  description?: string;
  timeRange?: string;
  yearOverYearGrowth?: string;
  chartOptions?: any;
  sqlQuery?: string;
  metrics?: Record<string, string | number>;
  insights?: Array<{
    type: "positive" | "neutral" | "negative";
    label: string;
    text: string;
  }>;
  recommendations?: string[];
  isChartLoading?: boolean;
}

// A comprehensive card component that displays a chart along with its metrics and insights
export default function UnifiedChartCard({
  title,
  timeRange,
  yearOverYearGrowth,
  chartOptions,
  metrics = {},
  insights = [],
  recommendations = [],
  isChartLoading = false,
}: UnifiedChartCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const echartsRef = React.useRef<any>(null);
  const { onChartReady } = useEChartsResize();
  const [isSharing, setIsSharing] = React.useState(false);
  const [showShareMenu, setShowShareMenu] = React.useState(false);
  const [showLoader, setShowLoader] = React.useState(isChartLoading);
  const [isChartDialogOpen, setIsChartDialogOpen] = React.useState(false);
  const [chartError, setChartError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleChartLoading = (e: CustomEvent<boolean>) =>
      setShowLoader(e.detail);
    window.addEventListener(
      "chart-loading",
      handleChartLoading as EventListener,
    );
    return () =>
      window.removeEventListener(
        "chart-loading",
        handleChartLoading as EventListener,
      );
  }, []);

  const titleOption = Array.isArray(chartOptions?.title)
    ? chartOptions?.title[0]
    : chartOptions?.title;

  // Safely extract text from title object or string, handling nested structures
  const extractText = (val: any): string => {
    if (typeof val === 'string') return val;
    if (!val) return "";
    if (typeof val === 'object') {
      if ('text' in val) return extractText(val.text);
      if (val.label) return extractText(val.label);
      if (val.title) return extractText(val.title);
      return JSON.stringify(val);
    }
    return String(val);
  };

  const chartTitle = extractText(titleOption) || title;

  // Sanitize chart options to remove problematic configurations
  const sanitizeChartOptions = (options: any) => {
    if (!options) return options;

    const sanitized = JSON.parse(JSON.stringify(options)); // Deep clone

    // Remove title
    sanitized.title = undefined;

    // Fix xAxis - remove unsupported type configurations and flatten if nested
    if (sanitized.xAxis) {
      if (Array.isArray(sanitized.xAxis)) {
        sanitized.xAxis = sanitized.xAxis.flat(Infinity).map((axis: any) => {
          const newAxis = { ...axis };
          // Remove specific type declarations - let ECharts infer
          if (newAxis.type === 'linear' || newAxis.type === 'logarithmic') {
            delete newAxis.type;
          }
          return newAxis;
        });
      } else {
        const newAxis = { ...sanitized.xAxis };
        if (newAxis.type === 'linear' || newAxis.type === 'logarithmic') {
          delete newAxis.type;
        }
        sanitized.xAxis = newAxis;
      }
    }

    // Fix yAxis - remove unsupported type configurations and flatten if nested
    if (sanitized.yAxis) {
      if (Array.isArray(sanitized.yAxis)) {
        sanitized.yAxis = sanitized.yAxis.flat(Infinity).map((axis: any) => {
          const newAxis = { ...axis };
          // Remove specific type declarations - let ECharts infer
          if (newAxis.type === 'linear' || newAxis.type === 'logarithmic') {
            delete newAxis.type;
          }
          return newAxis;
        });
      } else {
        const newAxis = { ...sanitized.yAxis };
        if (newAxis.type === 'linear' || newAxis.type === 'logarithmic') {
          delete newAxis.type;
        }
        sanitized.yAxis = newAxis;
      }
    }

    // Fix dataZoom - flatten if nested array to prevent rendering crashes
    if (sanitized.dataZoom && Array.isArray(sanitized.dataZoom)) {
      sanitized.dataZoom = sanitized.dataZoom
        .flat(Infinity)
        .filter((d: any) => d && typeof d === 'object' && !Array.isArray(d));
    }

    // Fix series - ensure all have valid types and remove problematic markLine/markPoint
    if (sanitized.series && Array.isArray(sanitized.series)) {
      sanitized.series = sanitized.series
        .flat(Infinity)
        .filter((s: any) => s && typeof s === 'object' && !Array.isArray(s)) // Remove null/undefined and arrays
        .map((s: any) => {
          const newSeries = { ...s };
          
          // Ensure series has a type
          if (!newSeries.type || newSeries.type === 'undefined') {
            // Infer type from data structure or default to 'line'
            if (newSeries.data && Array.isArray(newSeries.data)) {
              if (newSeries.data.length > 0 && typeof newSeries.data[0] === 'object' && 'value' in newSeries.data[0]) {
                newSeries.type = 'pie';
              } else {
                newSeries.type = 'line';
              }
            } else {
              newSeries.type = 'line';
            }
          }

          // Remove problematic markLine if it has invalid data
          if (newSeries.markLine) {
            try {
              if (!newSeries.markLine.data || 
                  !Array.isArray(newSeries.markLine.data) || 
                  newSeries.markLine.data.some((d: any) => !d || typeof d !== 'object')) {
                delete newSeries.markLine;
              }
            } catch (e) {
              delete newSeries.markLine;
            }
          }

          // Remove problematic markPoint if it has invalid data
          if (newSeries.markPoint) {
            try {
              if (!newSeries.markPoint.data || 
                  !Array.isArray(newSeries.markPoint.data) || 
                  newSeries.markPoint.data.some((d: any) => !d || typeof d !== 'object')) {
                delete newSeries.markPoint;
              }
            } catch (e) {
              delete newSeries.markPoint;
            }
          }

          // Remove markArea if present (often causes issues)
          if (newSeries.markArea) {
            delete newSeries.markArea;
          }

          return newSeries;
        });
    }

    // Fix legend - ensure it only includes series that actually exist
    if (sanitized.legend && sanitized.series) {
      const seriesNames = sanitized.series
        .map((s: any) => s?.name)
        .filter((name: any) => name && typeof name === 'string');
      
      if (sanitized.legend.data) {
        sanitized.legend.data = sanitized.legend.data.filter((name: string) => 
          seriesNames.includes(name)
        );
      }
    }

    // Set grid
    sanitized.grid = {
      left: "2%",
      right: "18%",
      bottom: "8%",
      top: "10%",
      containLabel: true,
    };

    return sanitized;
  };

  const modifiedChartOptions = sanitizeChartOptions(chartOptions);
// handle the charts not being displayed
  React.useEffect(() => {
  if (!modifiedChartOptions) return;

  const error = validateChartOption(modifiedChartOptions);

  if (error) {
    console.error("Chart validation error:", error);
    setChartError(error);
  } else {
    setChartError(null);
  }
}, [modifiedChartOptions]);

  const hasChartData = chartOptions && Object.keys(chartOptions).length > 0;
  const hasAnalyticsData =
    Object.keys(metrics).length > 0 ||
    insights.length > 0 ||
    recommendations.length > 0;

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async (format: "jpeg" | "png" | "pdf" | "print") => {
    if (!cardRef.current) return;

    setIsSharing(true);
    setShowShareMenu(false);

    try {
      switch (format) {
        case "jpeg":
        case "png": {
          const dataUrl =
            format === "png"
              ? await htmlToImage.toPng(cardRef.current, {
                  quality: 0.95,
                  backgroundColor: "#ffffff",
                  pixelRatio: 2,
                })
              : await htmlToImage.toJpeg(cardRef.current, {
                  quality: 0.95,
                  backgroundColor: "#ffffff",
                  pixelRatio: 2,
                });

          const blob = await (await fetch(dataUrl)).blob();
          const filename = `${chartTitle || "chart"}-${Date.now()}.${format === "png" ? "png" : "jpg"}`;

          downloadFile(blob, filename);

          const message = document.createElement("div");
          message.className =
            "fixed bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100]";
          message.innerHTML = `
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="font-medium">${format.toUpperCase()} downloaded successfully!</span>
              </div>
            `;
          document.body.appendChild(message);
          setTimeout(() => message.remove(), 3000);
          break;
        }

        case "pdf": {
          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 15;
          let yPos = margin;

          pdf.setFontSize(18);
          pdf.setFont("helvetica", "bold");
          pdf.text(chartTitle || "Chart Analytics Dashboard", margin, yPos);
          yPos += 10;

          pdf.setFontSize(10);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(100, 100, 100);

          if (timeRange) {
            pdf.text(`Time Range: ${timeRange}`, margin, yPos);
            yPos += 5;
          }
          if (yearOverYearGrowth) {
            pdf.text(
              `Year-over-Year Growth: ${yearOverYearGrowth}`,
              margin,
              yPos,
            );
            yPos += 5;
          }

          yPos += 5;

          const chartElement = cardRef.current.querySelector(".w-\\[55\\%\\]");
          if (chartElement) {
            const chartDataUrl = await htmlToImage.toJpeg(
              chartElement as HTMLElement,
              {
                quality: 0.95,
                backgroundColor: "#ffffff",
                pixelRatio: 2,
              },
            );

            const imgProps = pdf.getImageProperties(chartDataUrl);
            const imgWidth = (pdfWidth - 2 * margin) * 0.6;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

            pdf.addImage(
              chartDataUrl,
              "JPEG",
              margin,
              yPos,
              imgWidth,
              imgHeight,
            );
            yPos += imgHeight + 10;
          }

          pdf.setFontSize(14);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 0, 0);
          pdf.text("Analytics & Insights", margin, yPos);
          yPos += 8;

          if (Object.keys(metrics).length > 0) {
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(34, 197, 94);
            pdf.text("Key Metrics", margin, yPos);
            yPos += 6;

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(60, 60, 60);

            Object.entries(metrics).forEach(([key, value]) => {
              if (yPos > pdfHeight - 20) {
                pdf.addPage();
                yPos = margin;
              }
              pdf.text(`• ${key}: ${value}`, margin + 5, yPos);
              yPos += 5;
            });
            yPos += 3;
          }

          if (insights.length > 0) {
            if (yPos > pdfHeight - 30) {
              pdf.addPage();
              yPos = margin;
            }

            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(147, 51, 234);
            pdf.text("Key Insights", margin, yPos);
            yPos += 6;

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");

            insights.forEach((insight) => {
              if (yPos > pdfHeight - 20) {
                pdf.addPage();
                yPos = margin;
              }

              if (insight.type === "positive") {
                pdf.setTextColor(21, 128, 61);
              } else if (insight.type === "negative") {
                pdf.setTextColor(161, 98, 7);
              } else {
                pdf.setTextColor(30, 64, 175);
              }

              const text = `• ${insight.label}: ${insight.text}`;
              const lines = pdf.splitTextToSize(
                text,
                pdfWidth - 2 * margin - 10,
              );

              lines.forEach((line: string) => {
                if (yPos > pdfHeight - 20) {
                  pdf.addPage();
                  yPos = margin;
                }
                pdf.text(line, margin + 5, yPos);
                yPos += 5;
              });
              yPos += 2;
            });
            yPos += 3;
          }

          if (recommendations.length > 0) {
            if (yPos > pdfHeight - 30) {
              pdf.addPage();
              yPos = margin;
            }

            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(234, 88, 12);
            pdf.text("Recommendations", margin, yPos);
            yPos += 6;

            pdf.setFontSize(10);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(55, 65, 81);

            recommendations.forEach((rec, index) => {
              if (yPos > pdfHeight - 20) {
                pdf.addPage();
                yPos = margin;
              }

              const text = `${index + 1}. ${rec}`;
              const lines = pdf.splitTextToSize(
                text,
                pdfWidth - 2 * margin - 10,
              );

              lines.forEach((line: string) => {
                if (yPos > pdfHeight - 20) {
                  pdf.addPage();
                  yPos = margin;
                }
                pdf.text(line, margin + 5, yPos);
                yPos += 5;
              });
              yPos += 2;
            });
          }

          const totalPages = pdf.internal.pages.length - 1;
          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(
              `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
              pdfWidth / 2,
              pdfHeight - 10,
              { align: "center" },
            );
          }

          pdf.save(`${chartTitle || "chart"}-${Date.now()}.pdf`);

          const message = document.createElement("div");
          message.className =
            "fixed bottom-4 right-4 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg z-[100]";
          message.innerHTML = `
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span class="font-medium">PDF downloaded successfully!</span>
              </div>
            `;
          document.body.appendChild(message);
          setTimeout(() => message.remove(), 3000);
          break;
        }

        case "print": {
          const dataUrl = await htmlToImage.toJpeg(cardRef.current, {
            quality: 0.95,
            backgroundColor: "#ffffff",
            pixelRatio: 2,
          });

          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            alert("Please allow popups to print");
            break;
          }

          printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>${chartTitle || "Chart Print"}</title>
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                  }
                  .print-header { 
                    text-align: center; 
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e5e7eb;
                  }
                  .print-title { 
                    font-size: 24px; 
                    font-weight: bold; 
                    margin-bottom: 10px;
                    color: #1e293b;
                  }
                  .print-meta { 
                    display: flex; 
                    justify-content: space-between; 
                    margin: 15px 0;
                    font-size: 14px;
                    color: #64748b;
                  }
                  .print-image { 
                    width: 100%; 
                    max-width: 100%;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                  }
                  .print-footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    padding-top: 15px;
                    border-top: 1px solid #e5e7eb;
                  }
                  .no-print { 
                    margin-top: 20px; 
                    text-align: center;
                  }
                  .print-btn {
                    padding: 10px 20px;
                    background: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                  }
                  .print-btn:hover { background: #4338ca; }
                  .close-btn {
                    padding: 10px 20px;
                    background: #6b7280;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    margin-left: 10px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                  }
                  .close-btn:hover { background: #4b5563; }
                  @media print {
                    body { margin: 0; padding: 10mm; }
                    .no-print { display: none; }
                    .print-image { border: none; }
                  }
                </style>
              </head>
              <body>
                <div class="print-header">
                  <div class="print-title">${chartTitle || "Chart Analytics"}</div>
                  ${
                    timeRange || yearOverYearGrowth
                      ? `
                    <div class="print-meta">
                      <div>${timeRange ? `Time Range: ${timeRange}` : ""}</div>
                      <div>${yearOverYearGrowth ? `YoY Growth: ${yearOverYearGrowth}` : ""}</div>
                    </div>
                  `
                      : ""
                  }
                </div>
                <img src="${dataUrl}" class="print-image" alt="Chart" />
                <div class="print-footer">
                  Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </div>
                <div class="no-print">
                  <button onclick="window.print()" class="print-btn">Print Now</button>
                  <button onclick="window.close()" class="close-btn">Close</button>
                </div>
                <script>
                  window.onload = function() {
                    setTimeout(() => window.print(), 500);
                  }
                </script>
              </body>
              </html>
            `);
          printWindow.document.close();
          break;
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="w-full h-screen p-2">
      <Card className="w-full h-full shadow-2xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="border-b bg-white flex-shrink-0 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600 shadow-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  {chartTitle || "Chart Analytics Dashboard"}
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Visualization & Insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {timeRange && (
                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300">
                  <Calendar className="w-3 h-3 mr-1" />
                  {timeRange}
                </Badge>
              )}
              {yearOverYearGrowth && (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {yearOverYearGrowth}
                </Badge>
              )}

              <div className="relative">
                <Button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  disabled={isSharing || (!hasChartData && !hasAnalyticsData)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  {isSharing ? (
                    <>
                      <Download className="w-4 h-4 mr-2 animate-bounce" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>

                {showShareMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-50 bg-black/10"
                      onClick={() => setShowShareMenu(false)}
                    />
                    <div className="fixed right-4 top-20 w-80 bg-white rounded-2xl shadow-2xl border z-[60]">
                      <div className="p-4 border-b bg-slate-50">
                        <div className="text-base font-semibold text-slate-800">
                          Download &ldquo;{chartTitle || "Chart"}&rdquo;
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          Choose your download format
                        </div>
                      </div>

                      <div className="p-3">
                        <button
                          onClick={() => handleShare("jpeg")}
                          className="flex items-center w-full px-4 py-3.5 hover:bg-blue-50 rounded-xl group mb-2"
                        >
                          <div className="p-2.5 bg-blue-100 rounded-xl mr-4 group-hover:bg-blue-200">
                            <Download className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">
                              Download as JPEG
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Compressed format
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleShare("png")}
                          className="flex items-center w-full px-4 py-3.5 hover:bg-purple-50 rounded-xl group mb-2"
                        >
                          <div className="p-2.5 bg-purple-100 rounded-xl mr-4 group-hover:bg-purple-200">
                            <Download className="w-5 h-5 text-purple-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">
                              Download as PNG
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              High quality
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => handleShare("pdf")}
                          className="flex items-center w-full px-4 py-3.5 hover:bg-red-50 rounded-xl group mb-2"
                        >
                          <div className="p-2.5 bg-red-100 rounded-xl mr-4 group-hover:bg-red-200">
                            <FileText className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">
                              Download as PDF
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Professional document
                            </div>
                          </div>
                        </button>

                        <div className="h-px bg-slate-200 my-3"></div>

                        <button
                          onClick={() => handleShare("print")}
                          className="flex items-center w-full px-4 py-3.5 hover:bg-gray-50 rounded-xl group"
                        >
                          <div className="p-2.5 bg-gray-100 rounded-xl mr-4 group-hover:bg-gray-200">
                            <Printer className="w-5 h-5 text-gray-700" />
                          </div>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">
                              Print
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Send to printer
                            </div>
                          </div>
                        </button>
                      </div>

                      <div className="px-4 py-3 border-t bg-slate-50">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            Generated {new Date().toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => setShowShareMenu(false)}
                            className="text-indigo-600 hover:text-indigo-700 font-semibold"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent ref={cardRef} className="p-0 flex-1 overflow-hidden">
          <div className="flex h-full">
            <div className="w-[55%] h-full border-r border-slate-200 flex flex-col">
              <div className="p-6 flex-1">
                <div className="h-full bg-slate-50 rounded-lg shadow-inner relative overflow-hidden">
                  {hasChartData && !showLoader && (
                    <div className="absolute top-3 right-3 z-10">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 bg-white/80 hover:bg-white shadow-md"
                              onClick={() => setIsChartDialogOpen(true)}
                            >
                              <Maximize2 className="w-4 h-4 text-slate-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expand</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                  
                  {showLoader ? (
                    <SequentialLoader />
                  ) : hasChartData ? (
                    <ReactECharts
                      ref={echartsRef}
                      option={modifiedChartOptions}
                      style={{ height: "100%", width: "100%" }}
                      opts={{ renderer: 'canvas' }}
                      onChartReady={onChartReady}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <div className="p-4 rounded-full bg-slate-200 mb-4">
                        <BarChart3 className="w-12 h-12" />
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">
                        No Chart Data Available
                      </p>
                      <p className="text-xs text-slate-500">
                        Generate a chart to visualize your data
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-[45%] h-full flex flex-col bg-white">
              {showLoader ? (
                <div className="flex-1 flex items-center justify-center">
                  <SequentialLoader />
                </div>
              ) : !hasAnalyticsData ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                  <div className="p-4 rounded-full bg-slate-200 mb-4">
                    <BarChart3 className="w-12 h-12" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">
                    No Analytics Available
                  </p>
                  <p className="text-xs text-slate-500 text-center">
                    Generate a chart to see insights
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {Object.keys(metrics).length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <h4 className="font-semibold text-sm text-green-800">
                            Key Metrics
                          </h4>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(metrics).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex justify-between items-center bg-white p-3 rounded border border-green-100"
                            >
                              <span className="text-xs text-gray-600 font-medium">
                                {key}
                              </span>
                              <Badge className="bg-green-100 text-green-800 font-bold border-green-200">
                                {value}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {insights.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="font-semibold text-sm text-slate-800">
                            Key Insights
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-xs h-5 bg-slate-100"
                          >
                            {insights.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {insights.map((insight, index) => {
                            const config =
                              INSIGHT_CONFIG[insight.type] ||
                              INSIGHT_CONFIG.neutral;
                            return (
                              <div
                                key={index}
                                className={`p-3 ${config.bg} rounded-lg border border-l-4 ${config.border} ${config.borderLeft} shadow-sm`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-sm">{config.icon}</span>
                                  <p
                                    className={`text-xs ${config.text} leading-relaxed`}
                                  >
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
                      </div>
                    )}

                    {recommendations.length > 0 && (
                      <div className="space-y-3 pb-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-600" />
                          <h4 className="font-semibold text-sm text-slate-800">
                            Recommendations
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-xs h-5 bg-slate-100"
                          >
                            {recommendations.length}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {recommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm"
                            >
                              <div
                                className={`w-2 h-2 ${
                                  RECOMMENDATION_COLORS[
                                    index % RECOMMENDATION_COLORS.length
                                  ]
                                } rounded-full mt-2 flex-shrink-0`}
                              />
                              <p className="text-xs text-gray-700 leading-relaxed">
                                {rec}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isChartDialogOpen} onOpenChange={setIsChartDialogOpen}>
        <DialogContent className="max-w-7xl w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              {chartTitle || "Chart Analytics Dashboard"}
            </DialogTitle>
            <DialogDescription className="text-base">
              Expanded view of your data visualization
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden mt-2">
            {/* chart going blank error */}
           {chartError ? (
  <div className="flex flex-col items-center justify-center h-full text-red-500">
    <p className="font-semibold">⚠️ Chart failed to load</p>
    <p className="text-xs mt-1">{chartError}</p>
  </div>
) : hasChartData ? (
  <ReactECharts
    option={modifiedChartOptions}
    style={{ height: "100%", width: "100%" }}
    opts={{ renderer: 'canvas' }}
    notMerge
  />
) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
