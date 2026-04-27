"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  TrendingUp,
  LineChart,
  Dot,
  InfoIcon,
  Grid3X3,
  Activity,
  Target,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CustomSelect } from "@/components/ui/custom-select";
import MultiSelect from "@/components/ui/multiselect";
import { fetchColumnData } from "@/services/api/data/data-explore/data-chart/column-fetch";
import { generateChart } from "@/services/api/data/data-explore/data-chart/chart-data-fetch";
import ReactECharts from "echarts-for-react";
import { scatterChartOptions } from "@/services/utils/data/chart/scatterChartOptions";
import { boxChartOptions } from "@/services/utils/data/chart/boxChartOptions";
import { funnelChartOptions } from "@/services/utils/data/chart/funnelChartOptions";
import {
  lineChartOptions,
  createLineSeries,
  createYAxis,
} from "@/services/utils/data/chart/lineChartOptions";
import { heatmapChartOptions } from "@/services/utils/data/chart/heatmapChartOptions";
import { barChartOptions } from "@/services/utils/data/chart/barChartOptions";

interface Column {
  name: string;
  type: "Number" | "String" | "Date";
}

type ChartKind = "Bar" | "Line" | "Scatter" | "Heatmap" | "Box" | "Funnel";

interface ChartType {
  value: ChartKind;
  label: string;
  emoji: string;
  icon: React.ReactNode;
  requires: {
    x?: boolean;
    y?: boolean;
    category?: boolean;
    aggregate?: boolean;
    numericColumn?: boolean;
    doubleNumeric?: boolean;
    stages?: boolean;
  };
  description: string;
  maxYAxes?: number;
}

interface ChartConfig {
  chartType: ChartKind | "";
  title: string;
  xAxisColumn: string;
  yAxisColumns: string[];
  categoryColumn?: string;
  aggregateFunction?: string;
  numericColumn?: string;
  numericColumns?: string[];
  stagesColumn?: string;
  valuesColumn?: string;
}

interface ChartRequest {
  tableName: string;
  chartType: ChartKind;
  config: ChartConfig;
}

interface EChartsTooltipParams {
  componentType: string;
  componentSubType: string;
  componentIndex: number;
  seriesType: string;
  seriesIndex: number;
  seriesName: string;
  name: string;
  dataIndex: number;
  data: unknown;
  value: unknown;
  color: string;
  axisValueLabel: string;
}

interface FunnelDataItem {
  name: string;
  value: number;
}

interface SeriesData {
  name: string;
  data: number[];
}

interface ChartData {
  title?: string;
  xAxisData?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  seriesData?: number[];
  scatterData?: number[][];
  categories?: string[];
  boxData?: number[][];
  funnelData?: FunnelDataItem[];
  valuesLabel?: string;
  series?: SeriesData[];
  xAxisLabels?: string[];
  yAxisLabels?: string[];
  heatmapData?: number[][];
  minValue?: number;
  maxValue?: number;
}

const chartColors = [
  "#e01010ff",
  "#38ac93ff",
  "#EE6666",
  "#FAC858",
  "#9c4949ff",
  "#b1a329ff",
  "#FC8452",
];

// Enhanced value formatting function
// Converts large numbers into human-readable shorthand like K, L, or Cr
const formatValue = (value: number): string => {
  if (Math.abs(value) >= 10000000) {
    // 1 crore and above
    return (value / 10000000).toFixed(1).replace(/\.0$/, "") + "Cr";
  } else if (Math.abs(value) >= 100000) {
    // 1 lakh and above
    return (value / 100000).toFixed(1).replace(/\.0$/, "") + "L";
  } else if (Math.abs(value) >= 1000) {
    // 1 thousand and above
    return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return value.toString();
};

// Value formatter for axis labels
// A helper specifically for formatting values displayed on the chart's axes
const axisLabelFormatter = (value: number) => {
  return formatValue(value);
};

// Enhanced tooltip formatter
// Generates styled HTML content for chart tooltips, supporting multi-series data
const tooltipFormatter = (params: EChartsTooltipParams | EChartsTooltipParams[]) => {
  if (Array.isArray(params)) {
    let tooltip = `<div style="min-width: 150px;">`;
    if (params[0]?.axisValueLabel) {
      tooltip += `<div style="font-weight: bold; margin-bottom: 5px;">${params[0].axisValueLabel}</div>`;
    }
    params.forEach((param: EChartsTooltipParams) => {
      const color = param.color || "#000";
      const value =
        typeof param.value === "number"
          ? formatValue(param.value as number)
          : param.value;
      tooltip += `<div style="display: flex; align-items: center; margin-bottom: 3px;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: ${color}; margin-right: 8px; border-radius: 50%;"></span>
        <span style="margin-right: 8px;">${param.seriesName}:</span>
        <span style="font-weight: bold;">${value}</span>
      </div>`;
    });
    tooltip += `</div>`;
    return tooltip;
  } else {
    const value =
      typeof params.value === "number"
        ? formatValue(params.value as number)
        : params.value;
    return `<div style="min-width: 120px;">
      <div style="font-weight: bold; margin-bottom: 5px;">${params.name}</div>
      <div style="display: flex; align-items: center;">
        <span style="display: inline-block; width: 10px; height: 10px; background-color: ${params.color}; margin-right: 8px; border-radius: 50%;"></span>
        <span>${params.seriesName}: <strong>${value}</strong></span>
      </div>
    </div>`;
  }
};

// A comprehensive component for configuring and visualizing different types of data charts
export default function DataChartComponent({
  selectedTable,
  selectedSource,
}: {
  selectedTable?: string;
  selectedSource?: { name?: string };
}) {
  const [availableColumns, setAvailableColumns] = useState<Column[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    chartType: "",
    title: "",
    xAxisColumn: "",
    yAxisColumns: [],
    categoryColumn: "",
    aggregateFunction: "",
    numericColumn: "",
    numericColumns: [],
    stagesColumn: "",
    valuesColumn: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  const chartTypes: ChartType[] = useMemo(
    () => [
      {
        value: "Bar",
        label: "Aggregate Bar",
        emoji: "📊",
        icon: <BarChart3 />,
        requires: { aggregate: true, numericColumn: true, category: true },
        description:
          "Bar charts are used to compare values across categories. Select a numeric column and an aggregate function to visualize your data.",
      },
      {
        value: "Line",
        label: "Trends",
        emoji: "📈",
        icon: <LineChart />,
        requires: { numericColumn: true },
        description:
          "Line charts show trends over time or sequences. Select a numeric column to display all its values in sequence.",
      },
      {
        value: "Scatter",
        label: "Scatter",
        emoji: "⚡",
        icon: <Dot />,
        requires: { x: true, y: true },
        maxYAxes: 1,
        description:
          "Scatter plots show correlation between two numeric variables. Select numeric columns for both X and Y axes.",
      },
      {
        value: "Heatmap",
        label: "Heatmap",
        emoji: "🔥",
        icon: <Grid3X3 />,
        requires: { doubleNumeric: true },
        description:
          "Heatmaps visualize data density and patterns through color intensity. Great for correlation matrices and data distribution analysis.",
      },
      {
        value: "Box",
        label: "Box Plot",
        emoji: "📦",
        icon: <Activity />,
        requires: { numericColumn: true, category: true },
        description:
          "Box plots show statistical distribution including quartiles, median, and outliers. Perfect for comparing distributions across categories.",
      },
      {
        value: "Funnel",
        label: "Funnel",
        emoji: "🔻",
        icon: <Target />,
        requires: { stages: true },
        description:
          "Funnel charts show conversion rates through sequential stages. Essential for analyzing drop-off rates in processes.",
      },
    ],
    []
  );

  const currentChartType = useMemo(
    () => chartTypes.find((t) => t.value === chartConfig.chartType),
    [chartConfig.chartType, chartTypes]
  );
  const numericColumns = useMemo(
    () => availableColumns.filter((c) => c.type === "Number"),
    [availableColumns]
  );
  const categoricalColumns = useMemo(
    () => availableColumns.filter((c) => c.type === "String"),
    [availableColumns]
  );

  const getEChartsOptions = useMemo(() => {
    if (!chartData) {
      return null;
    }

    if (chartConfig.chartType === "Bar") {
      const options = JSON.parse(JSON.stringify(barChartOptions));

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "38px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      // Grid configuration with proper spacing
      options.grid = {
        top: hasTitle ? "84px" : "40px", 
        bottom: "100px", 
        left: "100px", 
        right: "60px",
      };

      options.xAxis[0].data = chartData.xAxisData || [];
      options.xAxis[0].name = chartData.xAxisLabel || "";
      options.xAxis[0].nameLocation = "top"; 
      options.xAxis[0].nameTextStyle = {
        align: "center",
        verticalAlign: "center gap", 
        fontSize: 12,
        fontWeight: "bold",
      };
      options.xAxis[0].axisLabel = {
        ...options.xAxis[0].axisLabel,
        formatter: axisLabelFormatter,
        rotate: 45,
        interval: 0,
        textStyle: {
          fontSize: 11,
        },
        margin: 15,
        showMaxLabel: true,
        showMinLabel: true,
        hideOverlap: false,
        verticalAlign: "top",
        align: "right",
      };

      // Also update the grid configuration for more bottom space:
      options.grid = {
        top: hasTitle ? "94px" : "40px",
        bottom: "90px", // Even more space for rotated labels + axis name at bottom
        left: "100px",
        right: "60px",
      };
      // Y-axis configuration with value formatting and rotation
      if (options.yAxis && options.yAxis[0]) {
        options.yAxis[0].name = chartData.yAxisLabel || "Value";
        options.yAxis[0].axisLabel = {
          formatter: axisLabelFormatter,
          rotate: 45,
          interval: 0,
          textStyle: {
            fontSize: 11,
          },
          margin: 15, // Add margin for rotated labels
        };
      }

      // Series data configuration
      options.series[0].data = chartData.seriesData || [];
      options.series[0].name = chartData.yAxisLabel || "Value";

      // Enhanced tooltip
      options.tooltip = {
        trigger: "axis",
        formatter: tooltipFormatter,
        backgroundColor: "rgba(50, 50, 50, 0.95)",
        borderColor: "#777",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
      };

      return options;
    }

    if (chartConfig.chartType === "Scatter") {
      const options = JSON.parse(JSON.stringify(scatterChartOptions));

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "10px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      options.grid = {
        top: hasTitle ? "80px" : "60px",
        bottom: "80px",
        left: "80px",
        right: "60px",
      };

      options.xAxis.name = chartData.xAxisLabel || "";
      options.xAxis.axisLabel = {
        formatter: axisLabelFormatter,
      };

      options.yAxis.name = chartData.yAxisLabel || "";
      options.yAxis.axisLabel = {
        formatter: axisLabelFormatter,
      };

      options.series[0].data = chartData.scatterData || [];
      options.series[0].name = `${chartData.xAxisLabel} vs ${chartData.yAxisLabel}`;

      options.tooltip = {
        formatter: (params: unknown) => {
          const param = params as { value: number[]; seriesName: string };
          const xValue = formatValue(param.value[0]);
          const yValue = formatValue(param.value[1]);
          return `<div style="min-width: 150px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${param.seriesName}</div>
            <div>${chartData.xAxisLabel}: <strong>${xValue}</strong></div>
            <div>${chartData.yAxisLabel}: <strong>${yValue}</strong></div>
          </div>`;
        },
        backgroundColor: "rgba(50, 50, 50, 0.95)",
        borderColor: "#777",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
      };

      return options;
    }

    if (chartConfig.chartType === "Box") {
      const options = JSON.parse(JSON.stringify(boxChartOptions));

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "10px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      options.grid = {
        top: hasTitle ? "80px" : "60px",
        bottom: "80px",
        left: "80px",
        right: "60px",
      };

      options.xAxis.data = chartData.categories || [];
      options.xAxis.name = chartData.xAxisLabel || "";
      options.xAxis.axisLabel = {
        rotate: 45,
        interval: 0,
        textStyle: {
          fontSize: 11,
        },
      };

      options.yAxis.name = chartData.yAxisLabel || "";
      options.yAxis.axisLabel = {
        formatter: axisLabelFormatter,
      };

      options.series[0].data = chartData.boxData || [];
      options.series[0].name = `${chartData.yAxisLabel} Distribution`;

      options.tooltip = {
        formatter: (params: unknown) => {
          const param = params as { value: number[]; name: string };
          const data = param.value;
          if (Array.isArray(data) && data.length >= 5) {
            return `<div style="min-width: 180px;">
              <div style="font-weight: bold; margin-bottom: 5px;">${
                param.name
              }</div>
              <div>Min: <strong>${formatValue(data[0])}</strong></div>
              <div>Q1: <strong>${formatValue(data[1])}</strong></div>
              <div>Median: <strong>${formatValue(data[2])}</strong></div>
              <div>Q3: <strong>${formatValue(data[3])}</strong></div>
              <div>Max: <strong>${formatValue(data[4])}</strong></div>
            </div>`;
          }
          // Fix the type conversion issue here
          const singleValue = Array.isArray(param.value) ? param.value[0] : param.value;
          return `${param.name}: ${formatValue(singleValue as number)}`;
        },
        backgroundColor: "rgba(50, 50, 50, 0.95)",
        borderColor: "#777",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
      };

      return options;
    }

    if (chartConfig.chartType === "Funnel") {
      const options = JSON.parse(JSON.stringify(funnelChartOptions));

      const funnelData = chartData.funnelData || [];
      const values = funnelData.map((item: FunnelDataItem) => item.value || 0);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const ratio = minValue / maxValue;

      const dynamicMinSize = ratio < 0.1 ? "1%" : ratio < 0.3 ? "3%" : "5%";
      const dynamicGap = funnelData.length > 5 ? 5 : 8;

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "10px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      options.series[0] = {
        ...options.series[0],
        left: "5%",
        right: "5%",
        top: hasTitle ? "80px" : "30px",
        width: "90%",
        minSize: dynamicMinSize,
        maxSize: "95%",
        gap: dynamicGap,
        data: funnelData,
        name: chartData.valuesLabel || "Funnel",
        label: {
          show: true,
          position: "inside",
          formatter: (params: unknown) => {
            const param = params as { name: string; value: number };
            return `${param.name}\n${formatValue(param.value)}`;
          },
          fontSize: 12,
          fontWeight: "bold",
        },
      };

      options.tooltip = {
        formatter: (params: unknown) => {
          const param = params as { name: string; value: number; seriesName: string };
          const value = formatValue(param.value);
          return `<div style="min-width: 120px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${param.name}</div>
            <div>${param.seriesName}: <strong>${value}</strong></div>
          </div>`;
        },
        backgroundColor: "rgba(50, 50, 50, 0.95)",
        borderColor: "#777",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
      };

      return options;
    }

    if (chartConfig.chartType === "Line") {
      const options = JSON.parse(JSON.stringify(lineChartOptions));

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "10px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      options.grid = {
        top: hasTitle ? "80px" : "60px",
        bottom: "60px",
        left: "80px",
        right: "80px",
      };

      options.xAxis[0].data = chartData.xAxisData || [];
      options.xAxis[0].name = "Index";

      const seriesDataList = chartData.series || [];
      const yAxisCount = Math.min(seriesDataList.length, 2);

      if (yAxisCount >= 1) {
        const yAxis1 = createYAxis(
          seriesDataList[0].name,
          chartColors[0],
          "left"
        );
        yAxis1.axisLabel = {
          formatter: axisLabelFormatter,
          color: chartColors[0],
        };
        options.yAxis.push(yAxis1);
      }

      if (yAxisCount >= 2) {
        const yAxis2 = createYAxis(
          seriesDataList[1].name,
          chartColors[1],
          "right"
        );
        yAxis2.axisLabel = {
          formatter: axisLabelFormatter,
          color: chartColors[1],
        };
        options.yAxis.push(yAxis2);
      }

      options.series = seriesDataList
        .slice(0, 2)
        .map((series: SeriesData, index: number) =>
          createLineSeries(series.name, series.data, chartColors[index], index)
        );

      options.tooltip = {
        trigger: "axis",
        formatter: tooltipFormatter,
        backgroundColor: "rgba(50, 50, 50, 0.95)",
        borderColor: "#777",
        borderWidth: 1,
        textStyle: {
          color: "#fff",
          fontSize: 12,
        },
      };

      return options;
    }

    if (chartConfig.chartType === "Heatmap") {
      const options = JSON.parse(JSON.stringify(heatmapChartOptions));

      const hasTitle = chartData.title || chartConfig.title;
      if (hasTitle) {
        options.title = {
          text: chartConfig.title || chartData.title,
          left: "center",
          top: "10px",
          textStyle: {
            fontSize: 16,
            fontWeight: "bold",
          },
        };
      }

      options.grid = {
        top: hasTitle ? "80px" : "60px",
        bottom: "60px",
        left: "80px",
        right: "120px", // Extra space for visualMap
      };

      options.xAxis.data = chartData.xAxisLabels || [];
      options.yAxis.data = chartData.yAxisLabels || [];
      options.series[0].data = chartData.heatmapData || [];
      options.visualMap.min = chartData.minValue || -1;
      options.visualMap.max = chartData.maxValue || 1;

      options.tooltip.formatter = function (params: unknown) {
        const param = params as { value: number[] };
        const xIndex = param.value[0];
        const yIndex = param.value[1];
        const correlation = param.value[2];
        const xLabel = chartData.xAxisLabels?.[xIndex] || "X";
        const yLabel = chartData.yAxisLabels?.[yIndex] || "Y";

        return `<div style="min-width: 150px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Correlation Matrix</div>
          <div>${xLabel} ↔ ${yLabel}</div>
          <div>Correlation: <strong>${correlation}</strong></div>
        </div>`;
      };

      return options;
    }

    return null;
  }, [chartData, chartConfig]);

  useEffect(() => {
    if (!chartConfig.chartType) return;
    setChartConfig((prev) => ({
      ...prev,
      xAxisColumn: "",
      yAxisColumns: [],
      categoryColumn: "",
      aggregateFunction: "",
      numericColumn: "",
      numericColumns: [],
      stagesColumn: "",
      valuesColumn: "",
    }));
    setChartData(null);
  }, [chartConfig.chartType]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedSource?.name) {
        if (mounted) setAvailableColumns([]);
        return;
      }
      try {
        const data = await fetchColumnData(selectedSource.name);
        const columns = Array.isArray(data) ? data : (data as { columns?: Column[] }).columns || [];
        const formatted: Column[] = columns.map((col: { column: string; type: string }) => ({
          name: col.column,
          type: col.type as "Number" | "String" | "Date",
        }));
        if (mounted) setAvailableColumns(formatted);
      } catch (error) {
        console.error("Error fetching columns:", error);
        if (mounted) setAvailableColumns([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedSource?.name]);

// Limits the number of selectable Y-axis columns based on the active chart type's constraints
  const limitYAxes = (cols: string[]) => {
    if (!currentChartType?.maxYAxes) return cols;
    return cols.slice(0, currentChartType.maxYAxes);
  };

// A generic state updater for any key within the chart configuration object
  const update = <K extends keyof ChartConfig>(
    key: K,
    value: ChartConfig[K]
  ) => {
    setChartConfig((prev) => ({ ...prev, [key]: value }));
  };

// Validates that all necessary configuration fields are filled before allowing chart generation
  const requireCheck = (cond: boolean, title: string, description: string) => {
    if (cond) return false;
    toast(title, { description, className: "bg-red-500" });
    return true;
  };

// Handles selection and de-selection of columns to be plotted on the Y-axis
  const handleYAxisToggle = (column: string) => {
    setChartConfig((prev) => {
      const exists = prev.yAxisColumns.includes(column);
      const next = exists
        ? prev.yAxisColumns.filter((c) => c !== column)
        : [...prev.yAxisColumns, column];
      const limited = limitYAxes(next);
      if (
        !exists &&
        currentChartType?.maxYAxes &&
        next.length > limited.length
      ) {
        toast(
          `Maximum ${currentChartType.maxYAxes} Y-axis columns allowed for ${prev.chartType} charts`
        );
      }
      return { ...prev, yAxisColumns: limited };
    });
  };

// Orchestrates the API calls to process data and update the chart visualization state
const handleGenerateChart = async () => {
  // Fix the boolean assignment issue by ensuring we have proper boolean values
  const hasChartType = !!chartConfig.chartType;
  const hasXAxis = !currentChartType?.requires.x ? true : !!chartConfig.xAxisColumn;
  const hasYAxis = !currentChartType?.requires.y ? true : chartConfig.yAxisColumns.length > 0;
  const hasCategory = !currentChartType?.requires.category ? true : !!chartConfig.categoryColumn;
  const hasAggregate = !currentChartType?.requires.aggregate ? true : !!chartConfig.aggregateFunction;
  const hasNumericColumn = !currentChartType?.requires.numericColumn ? true : 
    !!chartConfig.numericColumn || 
    (chartConfig.chartType === "Line" && (chartConfig.numericColumns?.length || 0) > 0);
  const hasDoubleNumeric = !currentChartType?.requires.doubleNumeric ? true : 
    !!(chartConfig.numericColumns && chartConfig.numericColumns.length >= 2);
  const hasStages = !currentChartType?.requires.stages ? true : 
    !!(chartConfig.stagesColumn && chartConfig.valuesColumn);

  if (requireCheck(hasChartType, "Missing Chart Type", "Please select a chart type")) return;
  if (requireCheck(hasXAxis, "Missing X-Axis", "Please select an X-axis column")) return;
  if (requireCheck(hasYAxis, "Missing Y-Axis", "Please select at least one Y-axis column")) return;
  if (requireCheck(hasCategory, "Missing Category", "Please select a category column")) return;
  if (requireCheck(hasAggregate, "Missing Aggregate Function", "Please select an aggregate function")) return;
  if (requireCheck(hasNumericColumn, "Missing Numeric Column", "Please select a numeric column")) return;
  if (requireCheck(hasDoubleNumeric, "Missing Numeric Columns", "Please select at least 2 numeric columns")) return;
  if (requireCheck(hasStages, "Missing Stage Configuration", "Please select both stages and values columns")) return;

  setIsGenerating(true);

  try {
    const request: ChartRequest = {
      tableName: selectedSource?.name || selectedTable || "",
      chartType: chartConfig.chartType as ChartKind,
      config: chartConfig,
    };

    const result = await generateChart(request);

    if (result) {
      setChartData(result.data || result);
      toast("Chart Generated", {
        description: `${chartConfig.chartType} chart created successfully`,
      });
    } else {
      toast("Error", {
        description: "Failed to generate chart",
        className: "bg-red-500",
      });
    }
  } catch (error) {
    console.error("Chart generation error:", error);
    toast("Error", {
      description: "Failed to generate chart",
      className: "bg-red-500",
    });
  } finally {
    setIsGenerating(false);
  }
};

  const ChartTypeInfo = ({ type }: { type: ChartType }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1">
          <InfoIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="leading-none font-medium flex items-center gap-2">
            {type.emoji} {type.label} Chart
          </h4>
          <p className="text-muted-foreground text-sm">{type.description}</p>
        </div>
      </PopoverContent>
    </Popover>
  );

  const SectionHeader = ({
    label,
    info,
  }: {
    label: string;
    info?: React.ReactNode;
  }) => (
    <div className="flex items-center">
      <Label>{label}</Label>
      {info}
    </div>
  );

  // Create options for CustomSelect components
  const chartTypeOptions = chartTypes.map((type) => ({
    value: type.value,
    label: type.label,
    emoji: type.emoji,
  }));

  const xAxisColumnOptions = (
    chartConfig.chartType === "Scatter" ? numericColumns : availableColumns
  ).map((col) => ({
    value: col.name,
    label: col.name,
  }));

  const categoryColumnOptions = categoricalColumns.map((col) => ({
    value: col.name,
    label: col.name,
  }));

  const numericColumnOptions = numericColumns.map((col) => ({
    value: col.name,
    label: col.name,
  }));

  const aggregateFunctionOptions = [
    { value: "AVG", label: "Average" },
    { value: "SUM", label: "Sum" },
    { value: "MIN", label: "Min" },
    { value: "MAX", label: "Max" },
  ];

  const previewText = useMemo(() => {
    if (!chartConfig.chartType)
      return "Configure chart settings and click Generate Chart";
    if (chartConfig.chartType === "Bar")
      return `Bar chart showing ${
        chartConfig.aggregateFunction || "aggregate"
      } of ${chartConfig.numericColumn || "values"}`;
    if (chartConfig.chartType === "Line") {
      const cols =
        chartConfig.numericColumns && chartConfig.numericColumns.length > 0
          ? chartConfig.numericColumns.join(", ")
          : chartConfig.numericColumn || "values";
      return `Line chart showing ${cols} in sequence`;
    }
    if (chartConfig.chartType === "Scatter")
      return `Scatter plot showing correlation between ${
        chartConfig.xAxisColumn || "X-axis"
      } and ${chartConfig.yAxisColumns[0] || "Y-axis"}`;
    if (chartConfig.chartType === "Heatmap")
      return `Heatmap showing correlation between ${
        (chartConfig.numericColumns || []).join(", ") || "numeric columns"
      }`;
    if (chartConfig.chartType === "Box")
      return `Box plot showing distribution of ${
        chartConfig.numericColumn || "values"
      } by ${chartConfig.categoryColumn || "category"}`;
    if (chartConfig.chartType === "Funnel")
      return `Funnel chart showing conversion through ${
        chartConfig.stagesColumn || "stages"
      } with ${chartConfig.valuesColumn || "values"}`;
    return `${chartConfig.chartType} chart with ${
      chartConfig.xAxisColumn || "X-axis"
    } vs ${chartConfig.yAxisColumns.join(", ") || "Y-axis"}`;
  }, [chartConfig]);

  return (
    <div className="h-full flex flex-col">
      <Card className="shadow-sm py-0 flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col">
          <div className="grid grid-cols-4 h-full">
            <div className="col-span-1 border-r h-full overflow-y-auto overflow-x-hidden chart-builder-sidebar">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Chart Builder
                </h3>
                <p className="text-sm text-gray-500">
                  Build custom charts manually for {selectedSource?.name}
                </p>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Label>Chart Type</Label>
                    {currentChartType && (
                      <ChartTypeInfo type={currentChartType} />
                    )}
                  </div>
                  <CustomSelect
                    value={chartConfig.chartType}
                    onChange={(value: string) =>
                      update("chartType", value as ChartKind)
                    }
                    disabled={false}
                    placeholder="Select chart type"
                    options={chartTypeOptions}
                    renderValue={(opt: { emoji: string; label: string }) => (
                      <>
                        <span className="text-sm flex-shrink-0">{opt.emoji}</span>
                        <span className="text-sm truncate">{opt.label}</span>
                      </>
                    )}
                    renderOption={(opt: { emoji: string; label: string }) => (
                      <div className="flex items-center gap-2 overflow-hidden w-full">
                        <span className="text-sm flex-shrink-0">{opt.emoji}</span>
                        <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chart-title">Chart Title</Label>
                  <Input
                    id="chart-title"
                    placeholder="Enter chart title"
                    value={chartConfig.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </div>

                {!!chartConfig.chartType && (
                  <div>
                    {currentChartType?.requires.x && (
                      <div className="space-y-2">
                        <SectionHeader
                          label="X-Axis Column"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    X-Axis Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    {chartConfig.chartType === "Scatter"
                                      ? "For scatter plots, select a numeric column for the X-axis."
                                      : "This will be the horizontal axis of your chart. For bar charts, typically a category. For line charts, typically a time series."}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        <CustomSelect
                          value={chartConfig.xAxisColumn}
                          onChange={(v: string) => update("xAxisColumn", v)}
                          disabled={false}
                          placeholder="Select X-axis column"
                          options={xAxisColumnOptions}
                          renderValue={(opt: { label: string }) => (
                            <span className="text-sm truncate">{opt.label}</span>
                          )}
                          renderOption={(opt: { label: string }) => (
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                              <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}

                    {chartConfig.chartType === "Bar" && (
                      <div className="space-y-2">
                        <SectionHeader
                          label="Category Column"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    Category Column Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    Select a categorical column to group your
                                    numeric data for aggregation.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        <CustomSelect
                          value={chartConfig.categoryColumn || ""}
                          onChange={(v: string) => update("categoryColumn", v)}
                          disabled={false}
                          placeholder="Select column"
                          options={categoryColumnOptions}
                          renderValue={(opt: { label: string }) => (
                            <span className="text-sm truncate">{opt.label}</span>
                          )}
                          renderOption={(opt: { label: string }) => (
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                              <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}

                    {chartConfig.chartType === "Box" && (
                      <div className="space-y-2">
                        <SectionHeader
                          label="Category Column"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    Category Column Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    Select a categorical column to group data
                                    for box plot distribution analysis.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        <CustomSelect
                          value={chartConfig.categoryColumn || ""}
                          onChange={(v: string) => update("categoryColumn", v)}
                          disabled={false}
                          placeholder="Select column"
                          options={categoryColumnOptions}
                          renderValue={(opt: { label: string }) => (
                            <span className="text-sm truncate">{opt.label}</span>
                          )}
                          renderOption={(opt: { label: string }) => (
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                              <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}

                    {currentChartType?.requires.y &&
                      chartConfig.chartType !== "Bar" && (
                        <div className="space-y-2 pt-2">
                          <SectionHeader
                            label="Y-Axis Column"
                            info={
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                  >
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="leading-none font-medium">
                                      Y-Axis Selection
                                    </h4>
                                    <p className="text-muted-foreground text-sm">
                                      Select numeric columns to display on the
                                      vertical axis.{" "}
                                      {currentChartType?.maxYAxes
                                        ? `You can select up to ${currentChartType.maxYAxes} columns.`
                                        : ""}
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            }
                          />
                          {chartConfig.chartType === "Scatter" ? (
                            <CustomSelect
                              value={chartConfig.yAxisColumns[0] || ""}
                              onChange={(v: string) =>
                                update("yAxisColumns", v ? [v] : [])
                              }
                              disabled={false}
                              placeholder="Select Y-axis column"
                              options={numericColumnOptions}
                              renderValue={(opt: { label: string }) => (
                                <span className="text-sm truncate">{opt.label}</span>
                              )}
                              renderOption={(opt: { label: string }) => (
                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                  <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                                </div>
                              )}
                            />
                          ) : (
                            <div className="space-y-1">
                              {numericColumns.map((column) => (
                                <div
                                  key={column.name}
                                  className="flex items-center space-x-2"
                                >
                                  <input
                                    type="checkbox"
                                    id={`y-axis-${column.name}`}
                                    checked={chartConfig.yAxisColumns.includes(
                                      column.name
                                    )}
                                    onChange={() =>
                                      handleYAxisToggle(column.name)
                                    }
                                    className="rounded"
                                    title={`Select ${column.name} for Y-axis`}
                                  />
                                  <Label
                                    htmlFor={`y-axis-${column.name}`}
                                    className="text-sm"
                                  >
                                    {column.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    {currentChartType?.requires.doubleNumeric && (
                      <div className="space-y-2">
                        <SectionHeader
                          label="Numeric Columns"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1 "
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    Numeric Columns Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    Select at least 2 numeric columns for
                                    correlation analysis in the heatmap.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        <MultiSelect
                          options={numericColumns.map((col) => ({
                            value: col.name,
                            label: col.name,
                          }))}
                          value={(chartConfig.numericColumns || []).map(
                            (name) => ({ value: name, label: name })
                          )}
                          onChange={(selected: { value: string; label: string }[]) =>
                            update(
                              "numericColumns",
                              selected.map((opt) => opt.value)
                            )
                          }
                          placeholder="Select column"
                          maxSelected={
                            chartConfig.chartType === "Heatmap" ? 10 : 3
                          }
                        />
                      </div>
                    )}

                    {currentChartType?.requires.stages && (
                      <>
                        <div className="space-y-2">
                          <SectionHeader
                            label="Stages Column"
                            info={
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                  >
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="leading-none font-medium">
                                      Stages Column Selection
                                    </h4>
                                    <p className="text-muted-foreground text-sm">
                                      Select a categorical column representing
                                      the sequential stages in your funnel.
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            }
                          />
                          <CustomSelect
                            value={chartConfig.stagesColumn || ""}
                            onChange={(v: string) => update("stagesColumn", v)}
                            disabled={false}
                            placeholder="Select stages column"
                            options={categoryColumnOptions}
                            renderValue={(opt: { label: string }) => (
                              <span className="text-sm truncate">{opt.label}</span>
                            )}
                            renderOption={(opt: { label: string }) => (
                              <div className="flex items-center gap-2 overflow-hidden w-full">
                                <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                              </div>
                            )}
                          />
                        </div>
                        <div className="space-y-2 pt-2">
                          <SectionHeader
                            label="Values Column"
                            info={
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-1"
                                  >
                                    <InfoIcon className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <div className="space-y-2">
                                    <h4 className="leading-none font-medium">
                                      Values Column Selection
                                    </h4>
                                    <p className="text-muted-foreground text-sm">
                                      Select a numeric column representing the
                                      count or value at each stage.
                                    </p>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            }
                          />
                          <CustomSelect
                            value={chartConfig.valuesColumn || ""}
                            onChange={(v: string) => update("valuesColumn", v)}
                            disabled={false}
                            placeholder="Select values column"
                            options={numericColumnOptions}
                            renderValue={(opt: { label: string }) => (
                              <span className="text-sm truncate">{opt.label}</span>
                            )}
                            renderOption={(opt: { label: string }) => (
                              <div className="flex items-center gap-2 overflow-hidden w-full">
                                <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                              </div>
                            )}
                          />
                        </div>
                      </>
                    )}

                    {currentChartType?.requires.numericColumn && (
                      <div className="space-y-2 pt-2">
                        <SectionHeader
                          label="Numeric Column"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    Numeric Column Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    {chartConfig.chartType === "Line"
                                      ? "Select a numeric column to show all its values in the line chart."
                                      : chartConfig.chartType === "Box"
                                      ? "Select a numeric column to analyze its distribution."
                                      : "Select a numeric column to aggregate and display in your chart."}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        {chartConfig.chartType === "Line" ? (
                          <MultiSelect
                            options={numericColumns.map((col) => ({
                              value: col.name,
                              label: col.name,
                            }))}
                            value={(chartConfig.numericColumns || []).map(
                              (name) => ({ value: name, label: name })
                            )}
                            onChange={(selected: { value: string; label: string }[]) =>
                              update(
                                "numericColumns",
                                selected.map((opt) => opt.value)
                              )
                            }
                            placeholder="Select column"
                            maxSelected={3}
                          />
                        ) : (
                          <CustomSelect
                            value={chartConfig.numericColumn || ""}
                            onChange={(v: string) => update("numericColumn", v)}
                            disabled={false}
                            placeholder="Select column"
                            options={numericColumnOptions}
                            renderValue={(opt: { label: string }) => (
                              <span className="text-sm truncate">{opt.label}</span>
                            )}
                            renderOption={(opt: { label: string }) => (
                              <div className="flex items-center gap-2 overflow-hidden w-full">
                                <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                              </div>
                            )}
                          />
                        )}
                      </div>
                    )}

                    {currentChartType?.requires.aggregate && (
                      <div className="space-y-2 pt-2">
                        <SectionHeader
                          label="Aggregate Function"
                          info={
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-1"
                                >
                                  <InfoIcon className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="leading-none font-medium">
                                    Aggregate Function Selection
                                  </h4>
                                  <p className="text-muted-foreground text-sm">
                                    Select how to aggregate numeric values for
                                    each category. This determines how the data
                                    will be summarized.
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          }
                        />
                        <CustomSelect
                          value={chartConfig.aggregateFunction || ""}
                          onChange={(v: string) => update("aggregateFunction", v)}
                          disabled={false}
                          placeholder="Select aggregate function"
                          options={aggregateFunctionOptions}
                          renderValue={(opt: { label: string }) => (
                            <span className="text-sm truncate">{opt.label}</span>
                          )}
                          renderOption={(opt: { label: string }) => (
                            <div className="flex items-center gap-2 overflow-hidden w-full">
                              <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                            </div>
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-3 flex flex-col p-4 h-full">
              <div className="flex-1 bg-white rounded-lg border-2 border-slate-200 min-h-0">
                {chartData && getEChartsOptions ? (
                  <ReactECharts
                    option={getEChartsOptions}
                    style={{ height: "100%", width: "100%" }}
                    opts={{ renderer: "canvas" }}
                    onChartReady={(inst) => {
                      requestAnimationFrame(() => { try { inst.resize(); } catch {} });
                      setTimeout(() => { try { inst.resize(); } catch {} }, 300);
                      setTimeout(() => { try { inst.resize(); } catch {} }, 600);
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      {chartConfig.chartType ? (
                        <div className="text-3xl mb-3">
                          {chartTypes.find(
                            (t) => t.value === chartConfig.chartType
                          )?.emoji || (
                            <BarChart3 className="w-12 h-12 text-slate-400 mx-auto" />
                          )}
                        </div>
                      ) : (
                        <BarChart3 className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      )}
                      <p className="text-slate-600 font-medium">
                        {chartConfig.chartType
                          ? `${chartConfig.chartType} Chart Preview`
                          : "Chart Preview"}
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        {previewText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleGenerateChart}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full mt-4"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    {(chartConfig.chartType &&
                      chartTypes.find((t) => t.value === chartConfig.chartType)
                        ?.icon) || <BarChart3 className="w-4 h-4 mr-2" />}
                    Generate Chart
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}