"use client";

import { useRef, useState, useEffect } from "react";
import { TrendingUp, ChartNoAxesColumn } from "lucide-react";
import { motion } from "framer-motion";
import ReactECharts from "echarts-for-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";
import BarLoader from "@/components/ui/bar-loader";

const chartVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.4, duration: 0.8 },
  },
};

/**
 * Interface defining the properties for the PredictSecTwo component.
 */
interface PredictSecTwoProps {
  targetName?: string;
  originalVsPredicted?: [number, number][];
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * PredictSecTwo
 * Core visualization component that plots actual versus predicted data points for model evaluation.
 * Uses ECharts to render a smooth, interactive line chart.
 */
export default function PredictSecTwo({ targetName, originalVsPredicted, isLoading, isEmpty }: PredictSecTwoProps) {
  const { predictions, isLoading: storeLoading, selectedTarget } = usePredictionStore();

  const chartRef = useRef<ReactECharts>(null);

  const [visibleSeries, setVisibleSeries] = useState<{
    Original: boolean;
    Predicted: boolean;
  }>({
    Original: true,
    Predicted: true,
  });

  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance?.();
    if (!instance) return;

    const handleLegendSelectChanged = () => {
      const option = instance.getOption();
      const legend = (option as { legend?: { selected?: Record<string, boolean> }[] }).legend?.[0];
      const selectedMap = legend?.selected || {};
      setVisibleSeries({
        Original: selectedMap.Original !== false,
        Predicted: selectedMap.Predicted !== false,
      });
    };

    instance.on("legendselectchanged", handleLegendSelectChanged);
    return () => {
      instance.off("legendselectchanged", handleLegendSelectChanged);
    };
  }, []);

  const loading = isLoading !== undefined ? isLoading : storeLoading;
  const ovp: [number, number][] = originalVsPredicted || predictions?.original_vs_predicted || [];
  const empty = isEmpty !== undefined ? isEmpty : ovp.length === 0;
  const target = targetName || (selectedTarget ? String(selectedTarget) : "Target value");

  const xData = ovp.map((_, idx) => idx + 1);
  const originalData = ovp.map((pair) => pair[0]);
  const predictedData = ovp.map((pair) => pair[1]);

  const bothSeriesHidden = !visibleSeries.Original && !visibleSeries.Predicted;

  const option = {
    animationDuration: 2000,
    grid: {
      left: "10%",
      right: "4%",
      top: "18%",
      bottom: "8%",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line" },
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "#10b981",
      textStyle: { color: "#fff" },
      formatter: (params: { axisValue: number; seriesName: string; data: number }[]) => {
        const idx = params[0]?.axisValue;
        const orig = params.find((p) => p.seriesName === "Original")?.data;
        const pred = params.find((p) => p.seriesName === "Predicted")?.data;
        return `Sample ${idx}<br/>Original: ${orig}<br/>Predicted: ${pred}`;
      },
    },
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "inside", yAxisIndex: 0, filterMode: "none" },
    ],
    legend: {
      show: true,
      top: 5,
      right: 10,
      textStyle: { color: "#4b5563", fontSize: 11 },
    },
    xAxis: {
      type: "category",
      data: xData,
      name: "Sample",
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisTick: { show: false },
      axisLabel: { color: "#9ca3af", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      name: target,
      nameTextStyle: { color: "#6b7280", fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#9ca3af", fontSize: 12 },
      splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
    },
    series: [
      {
        name: "Original",
        type: "line",
        data: originalData,
        smooth: false,
        symbol: "circle",
        symbolSize: 3,
        lineStyle: { color: "#3b82f6", width: 2 },
        itemStyle: { color: "#3b82f6" },
      },
      {
        name: "Predicted",
        type: "line",
        data: predictedData,
        smooth: false,
        symbol: "circle",
        symbolSize: 3,
        lineStyle: { color: "#10b981", width: 2 },
        itemStyle: { color: "#10b981" },
      },
    ],
  };

  return (
    <motion.div variants={chartVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-2 px-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Original vs Predicted</CardTitle>
              <CardDescription className="text-xs">
                Model performance across all samples
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="h-[320px] px-2 pb-2 pt-0 flex flex-col">
          <div className="h-full flex flex-col">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarLoader bars={8} barWidth={5} barHeight={50} color="bg-emerald-500" />
              </div>
            ) : empty ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                  <ChartNoAxesColumn className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">No Chart Data Available</p>
                <p className="text-xs text-slate-500">Run the Predictions to see the Chart</p>
              </div>
            ) : (
              <div
                className={`flex-1 flex items-center justify-center transition-all duration-300 ${
                  bothSeriesHidden ? "opacity-30 grayscale" : "opacity-100"
                }`}
              >
                <ReactECharts
                  ref={chartRef}
                  option={option}
                  style={{ height: "100%", width: "100%" }}
                  onChartReady={(inst) => {
                    requestAnimationFrame(() => { try { inst.resize(); } catch {} });
                    setTimeout(() => { try { inst.resize(); } catch {} }, 300);
                  }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
