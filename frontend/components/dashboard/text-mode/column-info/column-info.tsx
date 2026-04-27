"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Hash,
  Type,
  AlertCircle,
  Sparkles,
  Maximize2
} from "lucide-react";
import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import { getColumnInfo } from "@/services/api/dashboard/text-mode/column-info/column-names";
import { barChartOptions } from "@/services/utils/dashboard/chart/barChartOptions";
import { CustomSelect } from "@/components/ui/custom-select";
import ReactEcharts from "echarts-for-react";
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
import { Button } from "@/components/ui/button";

interface DataSource {
  id: string;
  name: string;
  type: string;
}

interface Column {
  column_name: string;
  type: string;
  missing?: number;
  unique?: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  mode?: number;
  distribution_string?: Array<Record<string, number>>;
  distribution_num?: Array<{ range: string; count: number }>;
  top_5?: Record<string, number>;
}

interface ColumnResponse {
  columns?: Column[];
}

interface SelectOption {
  value: string;
  label: string;
  type: string;
  icon: string | React.ElementType;
}

const DATA_SOURCE_CONFIG = {
  csv: { icon: "📄", color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700 border-blue-200" },
  mysql: { icon: "🐬", color: "bg-orange-500", lightColor: "bg-orange-50 text-orange-700 border-orange-200" },
  postgresql: { icon: "🐘", color: "bg-blue-600", lightColor: "bg-blue-50 text-blue-700 border-blue-200" },
  mongodb: { icon: "🍃", color: "bg-green-500", lightColor: "bg-green-50 text-green-700 border-green-200" },
  sqlite: { icon: "📁", color: "bg-gray-500", lightColor: "bg-gray-50 text-gray-700 border-gray-200" },
  default: { icon: "❓", color: "bg-purple-500", lightColor: "bg-purple-50 text-purple-700 border-purple-200" }
};

const COLUMN_TYPE_CONFIG = {
  number: { icon: Hash, emoji: "🔢", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
  string: { icon: Type, emoji: "🅰️", color: "text-green-600", bgColor: "bg-green-50 border-green-200" },
  default: { icon: Database, emoji: "📦", color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" }
};

const STATS_CONFIG = [
  { key: 'min', label: 'Min', icon: TrendingDown, color: 'blue', emoji: '📉' },
  { key: 'max', label: 'Max', icon: TrendingUp, color: 'red', emoji: '📈' },
  { key: 'mean', label: 'Mean', icon: Target, color: 'green', emoji: '📊' },
  { key: 'median', label: 'Median', icon: Target, color: 'purple', emoji: '🎯' }
];

const TOP_VALUE_COLORS = [
  'bg-yellow-50 border-yellow-200 text-yellow-800',
  'bg-gray-50 border-gray-300 text-gray-800',
  'bg-orange-50 border-orange-200 text-orange-800',
  'bg-blue-50 border-blue-200 text-blue-800',
  'bg-purple-50 border-purple-200 text-purple-800'
];

interface ColumnInfoProps {
  selectedFiles?: string[];
}

// A component that displays metadata and statistical distribution info for a selected data column
export default function ColumnInfo({ selectedFiles = [] }: ColumnInfoProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [currentColumnData, setCurrentColumnData] = useState<Column | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogChartType, setDialogChartType] = useState<"pie" | "bar">("pie");
  const chartRef = useRef<ReactEcharts>(null);

  const downloadChart = (type: 'png' | 'jpeg') => {
    if (chartRef.current) {
      const echartInstance = chartRef.current.getEchartsInstance();
      const dataUrl = echartInstance.getDataURL({ type, backgroundColor: '#fff', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${currentColumnData?.column_name || 'chart'}-${dialogChartType}.${type}`;
      link.href = dataUrl;
      link.click();
    }
  };

  // Load data sources only when selectedFiles is provided (after user selection)
  useEffect(() => {
    async function getDataSources() {
      if (selectedFiles.length === 0) {
        // Keep empty when no files selected (like image 2 - empty state)
        setDataSources([]);
        setSelectedDataSource("");
        setColumns([]);
        setSelectedColumn("");
        return;
      }

      setIsLoading(true);
      try {
        const data = await fetchDataSources();
        setDataSources(data);

        // Find the first selected file in selectedFiles order (not dataSources order)
        let firstSelectedFile: DataSource | undefined;
        for (const selectedFile of selectedFiles) {
          firstSelectedFile = data.find(
            (ds: DataSource) => ds.name === selectedFile || ds.id === selectedFile || ds.name.includes(selectedFile) || selectedFile.includes(ds.name)
          );
          if (firstSelectedFile) break;
        }

        if (firstSelectedFile) {
          setSelectedDataSource(firstSelectedFile.id);
        } else if (data.length > 0) {
          setSelectedDataSource(data[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    }
    getDataSources();
  }, [selectedFiles]);

  useEffect(() => {
    async function fetchColumns() {
      if (!selectedDataSource) return;
      setIsLoading(true);
      try {
        const data = await getColumnInfo(selectedDataSource);
        const colArr = Array.isArray(data) ? data : ((data as ColumnResponse)?.columns ?? []);
        const columnArray = (Array.isArray(colArr) && colArr.length > 0 && typeof colArr[0] === 'object' && 'column_name' in colArr[0])
          ? (colArr as Column[])
          : [];
        setColumns(columnArray);
        if (columnArray.length > 0) setSelectedColumn(columnArray[0].column_name);
      } catch {
        setColumns([]);
        setSelectedColumn("");
      } finally {
        setIsLoading(false);
      }
    }
    fetchColumns();
  }, [selectedDataSource]);

  useEffect(() => {
    if (!selectedColumn || !columns.length) {
      setCurrentColumnData(null);
      return;
    }
    const found = columns.find((col) => col.column_name === selectedColumn);
    setCurrentColumnData(found || null);
  }, [selectedColumn, columns]);

  // Extracts and formats data from a column to be used specifically in pie chart visualizations
  function getPieData(columnData: Column) {
    if (Array.isArray(columnData.distribution_string)) {
      return columnData.distribution_string.map((obj) => {
        const [name, value] = Object.entries(obj)[0];
        return { name, value };
      });
    } else if (columnData.top_5) {
      return Object.entries(columnData.top_5).map(([name, value]) => ({
        name,
        value,
      }));
    }
    return [];
  }

  // Processes numerical distribution data into X and Y arrays for histogram plotting
  function getHistogramData(columnData: Column) {
    if (Array.isArray(columnData.distribution_num)) {
      return {
        x: columnData.distribution_num.map((d) => d.range),
        y: columnData.distribution_num.map((d) => d.count),
      };
    }
    return { x: [], y: [] };
  }

  // Configures eCharts options for a pie chart based on the provided column data
  function getPieOptions(columnData: Column, isDetailed = false) {
    const pieData = getPieData(columnData);

    if (isDetailed) {
      return {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        toolbox: {
          feature: {
            dataView: { show: true },
            restore: { show: true }
          }
        },
        legend: {
          type: 'scroll',
          orient: 'vertical' as const,
          right: 10,
          top: 60,
          bottom: 20,
          data: pieData.map(d => d.name)
        },
        series: [
          {
            name: columnData.column_name,
            type: 'pie' as const,
            radius: ['40%', '70%'],
            center: ['40%', '50%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{b}: {d}%'
            }
          }
        ]
      };
    }

    return {
      title: {
        text: 'Value Distribution',
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold',
          color: '#334155'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      series: [
        {
          name: columnData.column_name,
          type: 'pie' as const,
          radius: ['40%', '70%'],
          center: ['50%', '55%'],
          data: pieData,
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold'
            }
          }
        }
      ]
    };
  }

  // Configures eCharts options for a bar chart or histogram based on column metrics
  function getBarOptions(columnData: Column, isDetailed = false) {
    const options = JSON.parse(JSON.stringify(barChartOptions));
    const { x, y } = getHistogramData(columnData);
    options.xAxis[0].data = x;
    options.series[0].data = y;
    options.series[0].name = columnData.column_name;

    if (isDetailed) {
      options.toolbox = {
        feature: {
          dataView: { show: true },
          restore: { show: true },
          magicType: {
            show: true,
            type: ['line', 'bar']
          }
        }
      };
      options.dataZoom = [
        {
          type: 'slider',
          show: true,
          yAxisIndex: [0],
          start: 0,
          end: 100,
          textStyle: {
            color: '#8c92a4'
          }
        },
        {
          type: 'inside',
          yAxisIndex: [0],
          start: 0,
          end: 100
        }
      ];
    }

    return options;
  }

  function getDataSourceConfig(type: string) {
    return DATA_SOURCE_CONFIG[type.toLowerCase() as keyof typeof DATA_SOURCE_CONFIG] || DATA_SOURCE_CONFIG.default;
  }

  function getColumnTypeConfig(type: string) {
    return COLUMN_TYPE_CONFIG[type.toLowerCase() as keyof typeof COLUMN_TYPE_CONFIG] || COLUMN_TYPE_CONFIG.default;
  }

  const currentColumnType = currentColumnData ? getColumnTypeConfig(currentColumnData.type) : null;

  const dataSourceOptions: SelectOption[] = dataSources.map(ds => ({
    value: ds.id,
    label: ds.name,
    type: ds.type,
    icon: getDataSourceConfig(ds.type).icon
  }));

  const columnOptions: SelectOption[] = columns.map(col => {
    const typeConfig = getColumnTypeConfig(col.type);
    return {
      value: col.column_name,
      label: col.column_name,
      type: col.type,
      icon: typeConfig.icon
    };
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-4 space-y-4"
        >
          {/* Empty state message when no files selected */}
          {dataSources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
                  <Database className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">Select the dataset to view it</p>
                <p className="text-xs text-slate-500">Choose a dataset from the input area using the + button</p>
              </div>
            </div>
          )}

          {/* Content when files are selected */}
          {dataSources.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Database className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Data Source</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex-shrink-0">
                    {dataSources.length}
                  </span>
                </label>
                <CustomSelect
                  value={selectedDataSource}
                  onChange={setSelectedDataSource}
                  disabled={isLoading}
                  placeholder="Select data source"
                  options={dataSourceOptions}
                  renderValue={(opt: SelectOption) => (
                    <>
                      <span className="text-sm flex-shrink-0">{typeof opt.icon === 'string' ? opt.icon : <opt.icon />}</span>
                      <span className="text-sm truncate">{opt.label}</span>
                    </>
                  )}
                  renderOption={(opt: SelectOption) => (
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      <span className="text-sm flex-shrink-0">{typeof opt.icon === 'string' ? opt.icon : <opt.icon />}</span>
                      <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ml-auto flex-shrink-0">
                        {opt.type.toUpperCase()}
                      </span>
                    </div>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Column</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex-shrink-0">
                    {columns.length}
                  </span>
                </label>
                <CustomSelect
                  value={selectedColumn}
                  onChange={setSelectedColumn}
                  disabled={isLoading || !columns.length}
                  placeholder="Select column"
                  options={columnOptions}
                  renderValue={(opt: SelectOption) => (
                    <>
                      {typeof opt.icon === 'string' ? (
                        <span className="text-sm flex-shrink-0">{opt.icon}</span>
                      ) : (
                        <opt.icon className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{opt.label}</span>
                    </>
                  )}
                  renderOption={(opt: SelectOption) => (
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                      {typeof opt.icon === 'string' ? (
                        <span className="text-sm flex-shrink-0">{opt.icon}</span>
                      ) : (
                        <opt.icon className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ml-auto flex-shrink-0">
                        {opt.type}
                      </span>
                    </div>
                  )}
                />
              </div>

              <AnimatePresence>
                {currentColumnData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className={`p-3 rounded-xl border-2 ${currentColumnType?.bgColor} shadow-sm overflow-hidden`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                          {currentColumnType && <currentColumnType.icon className={`w-5 h-5 ${currentColumnType.color} flex-shrink-0`} />}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3 className="text-sm font-bold text-slate-800 truncate" title={currentColumnData.column_name}>
                              {currentColumnData.column_name}
                            </h3>
                            <p className={`text-xs font-medium ${currentColumnType?.color} truncate`}>
                              {currentColumnData.type} Column
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white shadow-sm border border-slate-200 flex-shrink-0">
                          {currentColumnType?.emoji}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 shadow-sm">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-red-700">Missing Values</span>
                          </div>
                          <span className="text-base font-bold text-red-800">
                            {currentColumnData.missing ?? 0}
                          </span>
                        </div>
                      </div>

                      {currentColumnData.unique !== undefined && (
                        <div className="p-2.5 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 shadow-sm">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-green-700">Unique Values</span>
                            </div>
                            <span className="text-base font-bold text-green-800">
                              {currentColumnData.unique}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {currentColumnData.type === "Number" && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">Statistics</span>
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {STATS_CONFIG.map((stat) => {
                            const value = currentColumnData[stat.key as keyof Column];
                            if (value === undefined) return null;

                            return (
                              <div
                                key={stat.key}
                                className={`p-3 bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-lg border border-${stat.color}-200 shadow-sm overflow-hidden`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1">
                                    <stat.icon className={`w-3 h-3 text-${stat.color}-600 flex-shrink-0`} />
                                    <span className="text-xs font-medium text-slate-600 truncate">{stat.label}</span>
                                  </div>
                                </div>
                                <div className={`text-sm font-bold text-${stat.color}-800 truncate`} title={typeof value === 'number' ? value.toLocaleString() : String(value)}>
                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {currentColumnData.mode && (
                          <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-orange-700 truncate">⭐ Mode</span>
                              <div className="text-sm font-bold text-orange-800 truncate">
                                {currentColumnData.mode.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {currentColumnData.type === "String" && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate">Distribution</span>
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setDialogChartType("pie");
                                    setIsDialogOpen(true);
                                  }}
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
                        <div className="p-2">
                          <ReactEcharts
                            option={getPieOptions(currentColumnData, false)}
                            notMerge
                            style={{ height: 240 }}
                          />
                        </div>
                      </div>
                    )}

                    {currentColumnData.type === "Number" && Array.isArray(currentColumnData.distribution_num) && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="truncate">Distribution Plot</span>
                          </h4>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setDialogChartType("bar");
                                    setIsDialogOpen(true);
                                  }}
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
                        <div className="p-2">
                          <ReactEcharts
                            option={getBarOptions(currentColumnData)}
                            notMerge
                            style={{ height: 280 }}
                          />
                        </div>
                      </div>
                    )}

                    {currentColumnData.type === "String" && currentColumnData.top_5 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="truncate">Top 5 Values</span>
                        </h4>
                        <div className="space-y-1.5">
                          {Object.entries(currentColumnData.top_5).map(([value, count], idx) => {
                            return (
                              <div
                                key={value}
                                className={`flex justify-between items-center p-3 rounded-lg border shadow-sm ${TOP_VALUE_COLORS[idx]} overflow-hidden`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-current flex items-center justify-center">
                                    <span className="text-xs font-bold">{idx + 1}</span>
                                  </div>
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <span className="font-semibold text-sm truncate block" title={value}>
                                      {value}
                                    </span>
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white shadow-sm border border-slate-200 flex-shrink-0">
                                  {typeof count === 'number' ? count.toLocaleString() : count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[80vh] flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between w-full">
              <div className="pr-4">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  {currentColumnData?.column_name} - {dialogChartType === "pie" ? "Distribution Analysis" : "Distribution Plot"}
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  {dialogChartType === "pie"
                    ? "Detailed breakdown of value frequencies and percentages across all data points"
                    : "Comprehensive histogram showing the frequency distribution of numerical values"
                  }
                </DialogDescription>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => downloadChart('jpeg')}>
                  Download as JPEG
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadChart('png')}>
                  Download as PNG
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden mt-2">
            {currentColumnData && (
              <ReactEcharts
                ref={(e) => { chartRef.current = e; }}
                option={dialogChartType === "pie" ? getPieOptions(currentColumnData, true) : getBarOptions(currentColumnData, true)}
                notMerge
                style={{ height: '100%', width: '100%' }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
