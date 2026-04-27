/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import ReactECharts from "echarts-for-react";
import { EChartsOption } from "echarts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Component as LumaSpin } from "@/components/luma-spin";
import { useEChartsResize } from "@/hooks/use-echarts-resize";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  ChartNoAxesColumn,
  Download,
} from "lucide-react";

// 🌀 Sequential Loader Component with looping text
const SequentialLoader: React.FC = () => {
  const messages = [
    "Preparing chart...",
    "Loading visualization data...",
    "Almost there, finalizing view...",
    "Please wait ⏳",
  ];
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % messages.length);
    }, 5000); // change every 5 seconds
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full animate-fade-in space-y-2">
      <div className="mb-4">
        <LumaSpin />
      </div>
      <div className="text-center text-slate-500 text-sm font-medium animate-fade-in">
        <p>{messages[step]}</p>
      </div>
    </div>
  );
};

interface GeneratedChartProps {
  className?: string;
  title?: string;
  description?: string;
  timeRange?: string;
  yearOverYearGrowth?: string;
  chartOptions?: Partial<EChartsOption>;
  sqlQuery?: string;
  isChartLoading?: boolean;
}

// Renders a specialized card containing an ECharts visualization based on provided options
export const GeneratedChart: React.FC<GeneratedChartProps> = ({
  className = "",
  title,
  timeRange,
  yearOverYearGrowth,
  chartOptions,
  isChartLoading = false,
}) => {
  const hasData = chartOptions && Object.keys(chartOptions).length > 0;
  const echartsRef = React.useRef<any>(null);
  const { onChartReady } = useEChartsResize();

  // ✅ Proper title handling (array or object)
  const titleOption = Array.isArray(chartOptions?.title)
    ? chartOptions?.title[0]
    : chartOptions?.title;

  const chartTitle = titleOption?.text || title;

  // Fix AI hallucinations where arrays are deeply nested
  const sanitizedOptions = chartOptions ? { ...chartOptions } : {};
  if (sanitizedOptions.dataZoom && Array.isArray(sanitizedOptions.dataZoom)) {
    sanitizedOptions.dataZoom = sanitizedOptions.dataZoom
      .flat(Infinity)
      .filter((d: any) => d && typeof d === 'object' && !Array.isArray(d));
  }
  if (sanitizedOptions.series && Array.isArray(sanitizedOptions.series)) {
    sanitizedOptions.series = sanitizedOptions.series
      .flat(Infinity)
      .filter((s: any) => s && typeof s === 'object' && !Array.isArray(s));
  }
  if (sanitizedOptions.xAxis && Array.isArray(sanitizedOptions.xAxis)) {
    sanitizedOptions.xAxis = sanitizedOptions.xAxis.flat(Infinity);
  }
  if (sanitizedOptions.yAxis && Array.isArray(sanitizedOptions.yAxis)) {
    sanitizedOptions.yAxis = sanitizedOptions.yAxis.flat(Infinity);
  }

  const modifiedChartOptions = hasData
    ? {
        ...sanitizedOptions,
        title: undefined,
        grid: {
          left: "5%",
          right: "5%",
          bottom: "8%",
          top: "8%",
          containLabel: true,
        },
      }
    : sanitizedOptions;

  // 🔹 Local loader state (listens to sidebar loading events)
  const [showLoader, setShowLoader] = React.useState(isChartLoading);

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

// Captures the current chart as a PNG image and triggers a browser download
  const handleDownload = () => {
    if (echartsRef.current) {
      const url = echartsRef.current.getEchartsInstance().getDataURL({
        type: "png",
        pixelRatio: 2,
        backgroundColor: "#fff",
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `${chartTitle || "chart"}.png`;
      link.click();
    }
  };

  return (
    <Card
      className={`w-full h-full shadow-none border-0 bg-transparent ${className}`}
    >
      <CardHeader className="border-b bg-white/50 backdrop-blur-sm flex-shrink-0">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg font-bold text-slate-800 leading-tight">
                {chartTitle}
              </CardTitle>
            </div>
          </div>
          <div className="flex flex-row gap-1">
            {timeRange && (
              <Badge className="bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border-indigo-300 text-xs h-6 shadow-sm">
                <Calendar className="w-3 h-3 mr-1" />
                {timeRange}
              </Badge>
            )}
            {yearOverYearGrowth && (
              <Badge className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 text-xs h-6 shadow-sm">
                <TrendingUp className="w-3 h-3 mr-1" />
                {yearOverYearGrowth}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col h-[calc(100%-5rem)]">
        <div className="p-4 flex-1">
          <div className="h-full bg-white rounded-lg relative overflow-hidden shadow-sm">
            {showLoader ? (
              <SequentialLoader />
            ) : hasData ? (
              <ReactECharts
                ref={echartsRef}
                option={modifiedChartOptions}
                theme="light"
                style={{ height: "100%", width: "100%" }}
                onChartReady={onChartReady}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                  <ChartNoAxesColumn className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">
                  No Chart Data Available
                </p>
                <p className="text-xs text-slate-500">
                  Generate a chart to visualize your data here
                </p>
              </div>
            )}
          </div>
        </div>

        {hasData && (
          <div className="flex justify-end px-4 pb-4 border-t pt-3 bg-white/30">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-md hover:shadow-lg"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GeneratedChart;