"use client";

import React, { useMemo, useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { heatmapChartOptions } from "@/services/utils/data/chart/heatmapChartOptions";
import MultiSelect from "@/components/ui/multiselect";

import { getCorrelation } from "@/services/api/modeling/predict/correlation";
import { toast } from "sonner";
import { Loader2, BarChart3, AlertCircle } from "lucide-react";

/**
 * Interface defining the properties for the CorrelationHeatmap component.
 */
interface CorrelationHeatmapProps {
  availableNumericColumns: string[];
  selectedDataSourceName: string;
  selectedDataSourceType?: string;
}

/**
 * Renders an interactive ECharts correlation heatmap for the selected dataset columns.
 * @param {CorrelationHeatmapProps} props - The correlation data and configuration from the parent.
 */
export function CorrelationHeatmap({
  availableNumericColumns,
  selectedDataSourceName,
  selectedDataSourceType
}: CorrelationHeatmapProps) {
  const [correlationData, setCorrelationData] = useState<Record<string, Record<string, number>> | null>(null);

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const labels = useMemo(() => {
    return correlationData && Object.keys(correlationData).length > 0
      ? Object.keys(correlationData)
      : [];
  }, [correlationData]);

  const options = useMemo(() => {
    if (!correlationData || labels.length === 0) return null;

    const heatmapData: [number, number, number][] = [];

    labels.forEach((xLabel, xIndex) => {
      labels.forEach((yLabel, yIndex) => {
        const value = correlationData[xLabel][yLabel];
        heatmapData.push([xIndex, yIndex, parseFloat(value.toFixed(3))]);
      });
    });

    const config = JSON.parse(JSON.stringify(heatmapChartOptions));

    config.title = {
      text: "Feature Correlation Matrix",
      left: "center",
      textStyle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155"
      },
      top: 10
    };

    config.xAxis.data = labels;
    config.yAxis.data = labels;
    config.series[0].data = heatmapData;

    config.xAxis.axisLabel = {
      rotate: 45,
      interval: 0,
      fontSize: 10
    };
    config.yAxis.axisLabel = {
      interval: 0,
      fontSize: 10
    };

    config.grid = {
      top: "80px",
      bottom: "80px",
      left: "140px",
      right: "140px",
    };

    config.visualMap = {
      ...config.visualMap,
      right: 10,
      left: 'auto',
      top: 'center'
    };

    config.tooltip.formatter = function (params: { value: [number, number, number] }) {
      const xIndex = params.value[0];
      const yIndex = params.value[1];
      const value = params.value[2];
      const xName = labels[xIndex];
      const yName = labels[yIndex];

      return `<strong>Correlation</strong><br/>
                ${xName} vs ${yName}<br/>
                Value: <strong>${value}</strong>`;
    };

    return config;
  }, [correlationData, labels]);

  const handleFetchCorrelation = async (columns: string[]) => {
    if (!selectedDataSourceName || columns.length < 2) {
      if (columns.length > 0 && columns.length < 2) {
        toast.info("Select at least 2 columns for correlation");
      }
      return;
    }

    setIsFetching(true);
    setErrorMessage(null);
    try {
      const response = await getCorrelation({
        datasource_name: selectedDataSourceName,
        columns: columns,
        file_type: selectedDataSourceType || undefined
      });
      setCorrelationData(response.correlation);
    } catch (error) {
      console.error("Correlation fetch error:", error);
      const msg = error instanceof Error ? error.message : "Failed to update correlation heatmap";
      setErrorMessage(msg);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    // Reset local state and store data when switching datasets
    setSelectedColumns([]);
    setCorrelationData(null);
    setErrorMessage(null);
  }, [selectedDataSourceName, setCorrelationData]);

  useEffect(() => {
    if (labels.length > 0 && selectedColumns.length === 0) {
      setSelectedColumns(labels);
    }
  }, [labels, selectedColumns.length]);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex flex-row items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Feature Correlation Matrix
            {isFetching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          </h2>
          <p className="text-sm text-slate-500">Analyze relationships between dataset variables</p>
        </div>
        <div className="w-1/2 min-w-[240px]">
          <MultiSelect
            options={availableNumericColumns.map(col => ({ label: col, value: col }))}
            value={selectedColumns.map(col => ({ label: col, value: col }))}
            onChange={(selected) => {
              const columns = selected.map(s => s.value);
              setSelectedColumns(columns);
              handleFetchCorrelation(columns);
            }}
            placeholder="Select columns..."
          />
        </div>
      </div>

      <div className="flex-1 relative min-h-[500px]">
        {errorMessage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-8 text-center bg-red-50/20 rounded-xl border border-red-100">
            <div className="mb-4 p-4 rounded-full bg-red-50">
              <AlertCircle className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 mb-2">Analysis Failed</h3>
            <p className="text-sm max-w-sm text-slate-600 font-medium">
              {errorMessage}
            </p>
            <p className="text-xs text-slate-400 mt-4 italic">
              Try selecting different columns or check for constant values in your data.
            </p>
          </div>
        ) : !correlationData || Object.keys(correlationData).length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <div className="mb-4 p-5 rounded-full bg-white shadow-sm border border-slate-100">
              <BarChart3 className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Columns Selected</h3>
            <p className="text-sm max-w-xs text-slate-400">
              Select multiple numeric columns from the dropdown above to visualize their correlations.
            </p>
          </div>
        ) : (
          <ReactECharts
            option={options || {}}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
          />
        )}
        {isFetching && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity rounded-xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Updating Analysis...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

