"use client";

import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { motion } from "framer-motion";
import { Target, ChartNoAxesColumn, TrendingUp, Tag } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import BarLoader from "@/components/ui/bar-loader";
import { useOptimizationStore } from "@/services/utils/modeling/optimisation/optimise-store";

const chartVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.4, duration: 0.8 },
  },
};

/**
 * OptimiseSecTwo
 * Chart component that visualizes the optimal values for numeric and categorical predictors.
 * Uses ECharts to render a styled bar chart for the top numerical parameters and a list for categorical ones.
 */
export default function OptimiseSecTwo() {
  const chartRef = useRef<ReactECharts>(null);

  const bestPredictors = useOptimizationStore((s) => s.summary.bestPredictors);
  const isLoading = useOptimizationStore((s) => s.isLoading);

  // Separate numeric and categorical predictors
  const { numericPredictors, categoricalPredictors } = useMemo(() => {
    if (!bestPredictors) return { numericPredictors: [], categoricalPredictors: [] };

    const numeric: Array<{ name: string; value: number }> = [];
    const categorical: Array<{ name: string; value: string }> = [];

    Object.entries(bestPredictors).forEach(([name, value]) => {
      if (typeof value === "number" || !isNaN(Number(value))) {
        const numVal = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(numVal)) {
          numeric.push({ name, value: numVal });
        }
      } else {
        categorical.push({ name, value: String(value) });
      }
    });

    // Sort numeric by absolute value (descending)
    numeric.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

    return { numericPredictors: numeric, categoricalPredictors: categorical };
  }, [bestPredictors]);

  const numericChartOption = useMemo(() => {
    if (!numericPredictors.length) return null;

    const top = numericPredictors.slice(0, 10).reverse();

    return {
      animationDuration: 1200,
      grid: { left: 75, right: 40, top: 10, bottom: 20 },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(30, 41, 59, 0.95)",
        borderColor: "#6366F1",
        borderWidth: 1,
        textStyle: { color: "#fff", fontSize: 12 },
        position: (point: number[]) => [point[0] + 12, point[1] - 20],
        formatter: (params: { name: string; value: number }[]) => {
          const p = params?.[0];
          if (!p) return "";
          return `<div style="font-weight: 600; margin-bottom: 4px;">${p.name}</div><div style="color: #a5b4fc;">${p.value.toFixed(2)}</div>`;
        },
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisTick: { show: false },
        axisLabel: { color: "#9ca3af", fontSize: 11 },
        splitLine: { lineStyle: { color: "#f3f4f6", type: "dashed" } },
      },
      yAxis: {
        type: "category",
        data: top.map((d) => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#475569",
          fontSize: 10,
          fontWeight: 500,
          rotate: 45,
          width: 80,
          overflow: "truncate"
        },
      },
      series: [
        {
          name: "Best predictors",
          type: "bar",
          data: top.map((d) => d.value),
          barWidth: 24,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: "#6366F1" },
                { offset: 1, color: "#8B5CF6" },
              ],
            },
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            show: true,
            position: "right",
            formatter: (params: { value: number | string }) => Number(params.value).toFixed(3),
            color: "#475569",
            fontSize: 11,
            fontWeight: 600,
          },
        },
      ],
    };
  }, [numericPredictors]);

  return (
    <motion.div variants={chartVariants} initial="hidden" animate="visible" className="h-full">
      <Card className="h-full border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-2 px-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-800">Best Predictors</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Optimal values from the best solution
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="h-[320px] px-2 pb-2 pt-0 flex flex-col">
          <div className="h-full flex flex-col">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarLoader bars={8} barWidth={5} barHeight={50} color="bg-indigo-600" />
              </div>
            ) : !bestPredictors ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                  <ChartNoAxesColumn className="w-12 h-12 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">
                  No Best Predictors Available
                </p>
                <p className="text-xs text-slate-500">
                  Run Optimize to see the best predictor chart
                </p>
              </div>
            ) : (
              <div className="flex-1 flex gap-4 overflow-hidden">
                {numericPredictors.length > 0 && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2 px-2">
                      <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                      <h3 className="text-xs font-semibold text-slate-700">
                        Numeric Parameters
                      </h3>
                    </div>
                    <ReactECharts
                      ref={chartRef}
                      option={numericChartOption}
                      style={{ height: "calc(100% - 28px)", width: "100%", minHeight: "250px" }}
                      theme="light"
                      onChartReady={(inst) => {
                        requestAnimationFrame(() => { try { inst.resize(); } catch { } });
                        setTimeout(() => { try { inst.resize(); } catch { } }, 300);
                      }}
                    />
                  </div>
                )}

                {categoricalPredictors.length > 0 && (
                  <div className="w-40 flex-shrink-0 flex flex-col">
                    <div className="flex items-center gap-1.5 mb-2 px-2">
                      <Tag className="h-3.5 w-3.5 text-purple-600" />
                      <h3 className="text-xs font-semibold text-slate-700">
                        Categories
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 px-2">
                      {categoricalPredictors.map(({ name, value }) => (
                        <div
                          key={name}
                          className="bg-white rounded-lg p-2.5 border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm"
                        >
                          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
                            {name}
                          </div>
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
