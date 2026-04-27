
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Play, Settings, Target, Database, Hash, BarChart3 } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import MultiSelect from "@/components/ui/multiselect";
import { toast } from "sonner";
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
import { CorrelationHeatmap } from "../predict/correlation-heatmap";

import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import { getColumnInfo } from "@/services/api/dashboard/text-mode/column-info/column-names";
import { manualOptimiser } from "@/services/api/modeling/optimise/manual_optimiser";
import { useOptimizationStore } from "@/services/utils/modeling/optimisation/optimise-store";

interface SidebarLeftOptimiseProps {
  activeTab: "predict" | "optimize";
  predictors: string[];
  predictorValues: string[];
  targets: string[];
  targetValues: string[];

  updatePredictor: (index: number, value: string) => void;
  updatePredictorValue: (index: number, value: string) => void;
  updateTarget: (index: number, value: string) => void;
  updateTargetValue: (index: number, value: string) => void;

  addPredictor: () => void;
  removePredictor: (index: number) => void;
  addTarget: () => void;
  removeTarget: (index: number) => void;

  onRun: () => void;
}

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
  distribution_num?: Array<Record<string, number>>;
}

interface DataSourceOption {
  value: string;
  label: string;
  type: string;
  icon: string;
}

interface ColumnOption {
  value: string;
  label: string;
  type: string;
  mean?: number;
  disabled?: boolean;
}

type OptTargetConfig = {
  mode: "value" | "range";
  value: string;
  min: string;
  max: string;
};

type OptPredictorConfig = {
  type: "categorical" | "numeric";
  values?: string[];
  min?: string;
  max?: string;
};

const DATA_SOURCE_CONFIG = {
  csv: { icon: "📄", color: "bg-blue-500" },
  mysql: { icon: "🐬", color: "bg-orange-500" },
  postgresql: { icon: "🐘", color: "bg-blue-600" },
  mongodb: { icon: "🍃", color: "bg-green-500" },
  sqlite: { icon: "📑", color: "bg-gray-500" },
  default: { icon: "❓", color: "bg-purple-500" },
};

/**
 * SidebarLeftOptimise
 * Specialized sidebar for manual configuration of optimization parameters and targets.
 * Enables setting boundaries (min/max) for both target objectives and input predictors.
 */
const SidebarLeftOptimise: React.FC<SidebarLeftOptimiseProps> = ({
  predictors,
  predictorValues,
  targets,
  targetValues,
  updatePredictor,
  updatePredictorValue,
  updateTarget,
  updateTargetValue,
  addPredictor,
  removePredictor,
  addTarget,
  removeTarget,
  onRun,
}) => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [numericColumns, setNumericColumns] = useState<Column[]>([]);
  const [allColumns, setAllColumns] = useState<Column[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [optTargetRanges, setOptTargetRanges] = useState<Record<string, OptTargetConfig>>({});
  const [optPredictorsConfig, setOptPredictorsConfig] = useState<Record<string, OptPredictorConfig>>(
    {}
  );
  const [optIgnoredVariables, setOptIgnoredVariables] = useState<string[]>([]);

  // Search state for categorical predictor pickers
  const [categoricalSearch, setCategoricalSearch] = useState<Record<string, string>>({});

  const [isHeatmapDialogOpen, setIsHeatmapDialogOpen] = useState(false);

  // NEW: write selected target name to store, so OptimiseSecOne shows "Expected <Target>"
  const setSummary = useOptimizationStore((s) => s.setSummary);

  useEffect(() => {
    async function loadDataSourcesLocal() {
      setIsLoading(true);
      try {
        const data = await fetchDataSources();
        setDataSources(data);
      } catch (error) {
        console.error("Failed to load data sources:", error);
        setDataSources([]);
        toast.error("Failed to load data sources");
      } finally {
        setIsLoading(false);
      }
    }

    loadDataSourcesLocal();
  }, []);

  useEffect(() => {
    async function loadColumns() {
      if (!selectedDataSource) {
        setNumericColumns([]);
        setAllColumns([]);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getColumnInfo(selectedDataSource);
        const columnArray: Column[] = Array.isArray(data)
          ? (data as unknown as Column[])
          : ((data as unknown as { columns?: Column[] }).columns || []);

        const validColumns = columnArray.filter(
          (col): col is Column => typeof col === "object" && col !== null && "column_name" in col
        );

        setAllColumns(validColumns);

        const numeric = validColumns.filter((col) =>
          ["number", "numeric", "integer", "float", "double"].includes(col.type.toLowerCase())
        );
        setNumericColumns(numeric);

        // Auto-ignore high cardinality categorical columns
        const highCardinalityColumns = validColumns.filter((col) => {
          const isNumericType = ["number", "numeric", "integer", "float", "double"].includes(
            col.type.toLowerCase()
          );
          return !isNumericType && col.unique !== undefined && col.unique > 20;
        });
        setOptIgnoredVariables(highCardinalityColumns.map((col) => col.column_name));
      } catch (error) {
        console.error("Failed to load columns:", error);
        setNumericColumns([]);
        setAllColumns([]);
        toast.error("Failed to load columns");
      } finally {
        setIsLoading(false);
      }
    }

    loadColumns();
  }, [selectedDataSource]);

  // NEW (recommended): keep store summary.targetName synced to the selected target
  useEffect(() => {
    const first = targets.find((t) => t && t.trim() !== "") ?? null;
    setSummary({ targetName: first });
  }, [targets, setSummary]);

  const formatType = (t: string) => t?.toLowerCase() ?? "unknown";

  const getDataSourceConfig = (type: string) => {
    return (
      DATA_SOURCE_CONFIG[type.toLowerCase() as keyof typeof DATA_SOURCE_CONFIG] ||
      DATA_SOURCE_CONFIG.default
    );
  };

  const getColumnByName = (name: string | undefined): Column | undefined => {
    if (!name) return undefined;
    return allColumns.find((c) => c.column_name === name);
  };

  const isNumericType = (col: Column | undefined) => {
    if (!col) return false;
    return ["number", "numeric", "integer", "float", "double"].includes(col.type.toLowerCase());
  };

  const getCategoricalOptionsFromColumn = (col: Column | undefined) => {
    if (!col) return [];
    const valueSet = new Set<string>();

    if (col.distribution_string && Array.isArray(col.distribution_string)) {
      col.distribution_string.forEach((obj) => {
        Object.keys(obj).forEach((k) => {
          if (k && k.trim() !== "") valueSet.add(k);
        });
      });
    }

    return Array.from(valueSet).map((v) => ({ value: v, label: v }));
  };

  const getPlaceholderValue = (columnName: string) => {
    const column = numericColumns.find((c) => c.column_name === columnName);
    if (column?.mean !== undefined) return `e.g., ${column.mean.toFixed(1)} avg`;
    if (column?.median !== undefined) return `e.g., ${column.median.toFixed(1)} median`;
    if (column?.mode !== undefined) return `e.g., ${Number(column.mode).toFixed(1)} mode`;
    return "Enter value";
  };

  const isSelectedInTargetsOrPredictors = (name: string) =>
    targets.includes(name) || predictors.includes(name);

  const dataSourceOptions: DataSourceOption[] = dataSources.map((ds) => ({
    value: ds.id,
    label: ds.name,
    type: ds.type,
    icon: getDataSourceConfig(ds.type).icon,
  }));

  const allColumnOptions: ColumnOption[] = allColumns
    .filter((col) => !optIgnoredVariables.includes(col.column_name))
    .map((col) => ({
      value: col.column_name,
      label: col.column_name,
      type: col.type,
      mean: col.mean,
    }));

  const numericColumnOptions: ColumnOption[] = allColumnOptions.filter((col) =>
    ["number", "numeric", "integer", "float", "double"].includes(col.type.toLowerCase()) && !predictors.includes(col.value)
  );

  // Clears all previous settings and re-fetches columns when a new source is chosen
  const handleDataSourceChange = (value: string) => {
    setSelectedDataSource(value);

    predictorValues.forEach((_, index) => updatePredictorValue(index, ""));
    targetValues.forEach((_, index) => updateTargetValue(index, ""));

    setOptPredictorsConfig({});
    setOptTargetRanges({});
    setOptIgnoredVariables([]);
    setCategoricalSearch({});

    // Clear all predictors when changing data source
    for (let i = predictors.length - 1; i >= 0; i--) removePredictor(i);

    // NEW: reset store target name as well
    setSummary({ targetName: null });
  };

  // Triggers the manual optimization engine with the current UI configuration
  async function handleOptimize() {
    const ds = dataSources.find((d) => d.id === selectedDataSource);

    // Validation: Check if target value/range is set
    if (targets.length > 0) {
      const firstTarget = targets[0];
      const targetCfg = optTargetRanges[firstTarget];

      if (!targetCfg) {
        toast.error("Please set a target variable value or range");
        return;
      }

      if (targetCfg.mode === "value" && !targetCfg.value) {
        toast.error("Please enter a target variable value");
        return;
      }

      if (targetCfg.mode === "range" && (!targetCfg.min || !targetCfg.max)) {
        toast.error("Please enter both min and max for target variable range");
        return;
      }
    }

    const predictor_bounds: Record<string, any> = {};
    const autoIgnored: Array<{ column: string; unique: number }> = [];
    const ignoredSet = new Set<string>(optIgnoredVariables);

    predictors.filter(Boolean).forEach((predName) => {
      const col = allColumns.find((c) => c.column_name === predName);
      if (!col) return;

      const numeric = ["number", "numeric", "integer", "float", "double"].includes(
        col.type.toLowerCase()
      );

      if (numeric) {
        const cfg = optPredictorsConfig[predName];
        const minVal = cfg?.min ? parseFloat(cfg.min) : typeof col.min === "number" ? col.min : 0;
        const maxVal = cfg?.max ? parseFloat(cfg.max) : typeof col.max === "number" ? col.max : 100;

        predictor_bounds[predName] = { type: "numeric", min: minVal, max: maxVal };
        return;
      }

      // Categorical
      const cfg = optPredictorsConfig[predName];
      if (cfg?.values && cfg.values.length > 0) {
        predictor_bounds[predName] = { type: "categorical", choices: cfg.values };
      }
    });

    // Auto-ignore high cardinality categorical columns that are NOT predictors or targets
    allColumns.forEach((col) => {
      if (optIgnoredVariables.includes(col.column_name)) return;
      if (targets.includes(col.column_name)) return;
      if (predictors.includes(col.column_name)) return;

      const isNumericType = ["number", "numeric", "integer", "float", "double"].includes(
        col.type.toLowerCase()
      );

      if (!isNumericType && col.unique && col.unique > 20) {
        ignoredSet.add(col.column_name);
        autoIgnored.push({ column: col.column_name, unique: col.unique });
      }
    });


    let target_value: any = undefined;
    let target_range: any = undefined;

    targets.filter(Boolean).forEach((tName) => {
      const targetCfg = optTargetRanges[tName];
      if (targetCfg) {
        if (targetCfg.mode === "value" && targetCfg.value) {
          if (!target_value) target_value = {};
          target_value[tName] = parseFloat(targetCfg.value);
        } else if (targetCfg.mode === "range") {
          if (!target_range) target_range = {};
          const minVal = targetCfg.min ? parseFloat(targetCfg.min) : 0;
          const maxVal = targetCfg.max ? parseFloat(targetCfg.max) : 100;
          target_range[tName] = [minVal, maxVal];
        }
      }
    });

    const payload: any = {
      mode: "optimize",
      datasource_name: ds?.name || "",
      file_type: ds?.type || "",
      targets: targets.filter(Boolean),
      predictor_bounds,
      ignore_columns: Array.from(ignoredSet),
    };

    if (target_value !== undefined && Object.keys(target_value).length > 0) payload.target_value = target_value;
    if (target_range !== undefined && Object.keys(target_range).length > 0) payload.target_range = target_range;

    try {
      setIsLoading(true);
      await manualOptimiser(payload);
      toast.success("Optimization completed successfully");
    } catch (error: any) {
      console.error("Optimization error:", error);
      const errorMessage = error?.message || error?.response?.data?.message || "Optimization failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      onRun();
    }
  }

  const showEmptyState = !selectedDataSource || numericColumns.length === 0;

  return (
    <>
      {/* Header */}
      <div className="p-6 flex-shrink-0 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3 mb-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-500">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-800 truncate">Manual Mode</h3>
            <p className="text-sm text-slate-500 truncate">Configure optimisation manually</p>
          </div>
        </div>

        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border bg-purple-50 text-purple-700 border-purple-200">
          <div className="w-2 h-2 rounded-full bg-purple-500 mr-2 flex-shrink-0" />
          <span className="truncate">Optimization Mode</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">
          {/* Data Source */}
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
              onChange={handleDataSourceChange}
              disabled={isLoading}
              placeholder="Select data source"
              options={dataSourceOptions}
              renderValue={(opt: DataSourceOption) => (
                <span className="text-sm flex-shrink-0">
                  {opt.icon} <span className="text-sm truncate">{opt.label}</span>
                </span>
              )}
              renderOption={(opt: DataSourceOption) => (
                <div className="flex items-center gap-2 overflow-hidden w-full">
                  <span className="text-sm flex-shrink-0">{opt.icon}</span>
                  <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ml-auto flex-shrink-0">
                    {opt.type.toUpperCase()}
                  </span>
                </div>
              )}
            />
          </div>

          {showEmptyState ? (
            <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center">
              <Database className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <h5 className="text-sm font-medium text-slate-600 mb-2">No Data Source Selected</h5>
              <p className="text-xs text-slate-500">
                Please select a data source above to configure optimisation
              </p>
            </div>
          ) : (
            <>
              {/* Targets */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-slate-700 truncate">
                    Target Variables to Optimize
                  </h4>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {targets.length}
                  </Badge>
                </div>

                {targets.length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                    <Target className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-3">No targets configured yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-dashed border-slate-300 hover:border-purple-300 hover:bg-purple-50 w-full"
                      onClick={addTarget}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Target
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0">
                    {targets.map((name, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-lg border border-slate-200 p-2 space-y-1"
                      >
                        <div className="flex gap-2">
                          <div className="flex-1 min-w-0">
                            <CustomSelect
                              value={name}
                              onChange={(value: string) => {
                                updateTarget(index, value);

                                // NEW: persist target name to store for OptimiseSecOne
                                setSummary({ targetName: value });

                                const col = numericColumns.find((c) => c.column_name === value);
                                if (col) {
                                  setOptTargetRanges((prev) => ({
                                    ...prev,
                                    [value]: {
                                      mode: "value",
                                      value: "",
                                      min: typeof col.min === "number" ? col.min.toString() : "",
                                      max: typeof col.max === "number" ? col.max.toString() : "",
                                    },
                                  }));
                                }
                              }}
                              disabled={false}
                              placeholder="Select target column"
                              options={numericColumnOptions.map((opt) => {
                                const col = allColumns.find((c) => c.column_name === opt.value);
                                const isHighCardinality =
                                  col &&
                                  !["number", "numeric", "integer", "float", "double"].includes(
                                    col.type.toLowerCase()
                                  ) &&
                                  col.unique !== undefined &&
                                  col.unique > 20;

                                return { ...opt, disabled: isHighCardinality };
                              })}
                              renderValue={(opt: ColumnOption) => (
                                <div className="flex items-center gap-2">
                                  <Target className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                  <span className="text-sm truncate">{opt.label}</span>
                                </div>
                              )}
                              renderOption={(opt: ColumnOption & { disabled?: boolean }) => (
                                <div
                                  className={`flex items-center gap-2 overflow-hidden w-full ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""
                                    }`}
                                >
                                  <Target className="w-3 h-3 text-purple-600 flex-shrink-0" />
                                  <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                                  {opt.mean !== undefined && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ml-auto flex-shrink-0">
                                      mean={opt.mean.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            />
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTarget(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        {name ? (
                          <div className="space-y-2">
                            {optTargetRanges[name]?.mode === "range" ? (
                              <>
                                <div className="text-[11px] text-slate-600">Enter a value for range</div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <div className="text-[11px] text-slate-600">Min</div>
                                    <input
                                      type="number"
                                      placeholder="Min"
                                      value={
                                        optTargetRanges[name]?.min ??
                                        (() => {
                                          const c = numericColumns.find((col) => col.column_name === name);
                                          return typeof c?.min === "number" ? c.min.toString() : "";
                                        })()
                                      }
                                      onChange={(e) =>
                                        setOptTargetRanges((prev) => ({
                                          ...prev,
                                          [name]: {
                                            ...(prev[name] || {
                                              mode: "range",
                                              value: "",
                                              min: "",
                                              max: "",
                                            }),
                                            min: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <div className="text-[11px] text-slate-600">Max</div>
                                    <input
                                      type="number"
                                      placeholder="Max"
                                      value={
                                        optTargetRanges[name]?.max ??
                                        (() => {
                                          const c = numericColumns.find((col) => col.column_name === name);
                                          return typeof c?.max === "number" ? c.max.toString() : "";
                                        })()
                                      }
                                      onChange={(e) =>
                                        setOptTargetRanges((prev) => ({
                                          ...prev,
                                          [name]: {
                                            ...(prev[name] || {
                                              mode: "range",
                                              value: "",
                                              min: "",
                                              max: "",
                                            }),
                                            max: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-[11px] text-slate-600">Enter a value</div>
                                <input
                                  type="number"
                                  placeholder={name ? getPlaceholderValue(name) : "Enter value"}
                                  value={optTargetRanges[name]?.value ?? ""}
                                  onChange={(e) =>
                                    setOptTargetRanges((prev) => ({
                                      ...prev,
                                      [name]: {
                                        ...(prev[name] || {
                                          mode: "value",
                                          value: "",
                                          min: "",
                                          max: "",
                                        }),
                                        value: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                              </>
                            )}

                            <label className="flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                className="h-3 w-3"
                                checked={optTargetRanges[name]?.mode === "range"}
                                onChange={(e) =>
                                  setOptTargetRanges((prev) => {
                                    const current =
                                      prev[name] ||
                                      ({
                                        mode: "value",
                                        value: "",
                                        min: "",
                                        max: "",
                                      } as OptTargetConfig);

                                    return {
                                      ...prev,
                                      [name]: {
                                        ...current,
                                        mode: e.target.checked ? "range" : "value",
                                      },
                                    };
                                  })
                                }
                              />
                              <span>Use Range</span>
                            </label>
                          </div>
                        ) : null}
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-slate-300 hover:border-purple-300 hover:bg-purple-50"
                      onClick={addTarget}
                      disabled={targets.length >= numericColumns.length}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Target
                    </Button>
                  </div>
                )}
              </div>

              {/* Predictors */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-slate-700 truncate">
                      Predictors to Optimize
                    </h4>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {predictors.filter((p) => p).length}
                    </Badge>
                  </div>
                </div>

                <MultiSelect
                  options={allColumnOptions
                    .filter((opt) => !targets.includes(opt.value))
                    .map((opt) => {
                      const col = allColumns.find((c) => c.column_name === opt.value);
                      const isHighCardinality =
                        col &&
                        !["number", "numeric", "integer", "float", "double"].includes(
                          col.type.toLowerCase()
                        ) &&
                        col.unique !== undefined &&
                        col.unique > 20;

                      return {
                        value: opt.value,
                        label: `${opt.label} (${formatType(opt.type)})${isHighCardinality ? " - High cardinality" : ""
                          }`,
                        disable: isHighCardinality,
                        fixed: isHighCardinality,
                      };
                    })}
                  value={predictors
                    .filter((p) => p)
                    .map((p) => {
                      const col = allColumns.find((c) => c.column_name === p);
                      const isHighCardinality =
                        col &&
                        !["number", "numeric", "integer", "float", "double"].includes(
                          col.type.toLowerCase()
                        ) &&
                        col.unique !== undefined &&
                        col.unique > 20;

                      return {
                        value: p,
                        label: `${p} (${formatType(col?.type || "")})${isHighCardinality ? " - High cardinality" : ""
                          }`,
                        fixed: isHighCardinality,
                      };
                    })}
                  onChange={(opts) => {
                    const newValues = opts.map((o) => o.value);
                    const currentPredictors = predictors.filter((p) => p);

                    if (newValues.length === 0 && currentPredictors.length > 0) {
                      for (let i = predictors.length - 1; i >= 0; i--) {
                        if (predictors[i]) removePredictor(i);
                      }
                      setOptPredictorsConfig({});
                      return;
                    }

                    const removed = currentPredictors.filter((p) => !newValues.includes(p));
                    removed.forEach((pred) => {
                      const idx = predictors.indexOf(pred);
                      if (idx !== -1) removePredictor(idx);

                      setOptPredictorsConfig((prev) => {
                        const copy = { ...prev };
                        delete copy[pred];
                        return copy;
                      });

                      setCategoricalSearch((prev) => {
                        const copy = { ...prev };
                        delete copy[pred];
                        return copy;
                      });
                    });

                    const added = newValues.filter((v) => !predictors.includes(v));
                    added.forEach((value) => {
                      const oldLength = predictors.length;
                      addPredictor();
                      updatePredictor(oldLength, value);

                      const col = getColumnByName(value);
                      if (col) {
                        const numeric = isNumericType(col);
                        setOptPredictorsConfig((prev) => ({
                          ...prev,
                          [value]: numeric
                            ? {
                              type: "numeric",
                              min: typeof col.min === "number" ? col.min.toString() : "",
                              max: typeof col.max === "number" ? col.max.toString() : "",
                            }
                            : { type: "categorical", values: [] },
                        }));
                      }
                    });
                  }}
                  placeholder="Select predictor columns"
                  className="w-full"
                />

                {predictors.filter((p) => p).length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                    <Settings className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No predictors configured yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0">
                    {predictors.map((name, index) => {
                      if (!name) return null;

                      const col = getColumnByName(name);
                      if (!col) return null;

                      const numeric = isNumericType(col);
                      const categorical = !numeric;

                      const predictorCfg = optPredictorsConfig[name];
                      const allCategoricalOptions = getCategoricalOptionsFromColumn(col);

                      const searchValue = categoricalSearch[name] ?? "";
                      const q = (searchValue ?? "").trim().toLowerCase();

                      const filteredCategoricalOptions = !q
                        ? allCategoricalOptions
                        : allCategoricalOptions.filter((o) => o.label.toLowerCase().includes(q));

                      const selectedValues = predictorCfg?.values ?? [];
                      const filteredValues = filteredCategoricalOptions.map((o) => o.value);

                      const allFilteredSelected =
                        filteredValues.length > 0 &&
                        filteredValues.every((v) => selectedValues.includes(v));

                      const someFilteredSelected =
                        filteredValues.some((v) => selectedValues.includes(v)) && !allFilteredSelected;

                      return (
                        <div
                          key={index}
                          className="bg-white rounded-lg border border-slate-200 p-2 space-y-1"
                        >
                          <div className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <CustomSelect
                                value={name}
                                onChange={(value: string) => {
                                  updatePredictor(index, value);

                                  // clear old config keyed by previous name
                                  setOptPredictorsConfig((prev) => {
                                    const copy = { ...prev };
                                    delete copy[name];
                                    return copy;
                                  });

                                  setCategoricalSearch((prev) => {
                                    const copy = { ...prev };
                                    delete copy[name];
                                    return copy;
                                  });
                                }}
                                disabled={false}
                                placeholder="Select predictor column"
                                options={allColumnOptions.map((opt) => {
                                  const c = allColumns.find((x) => x.column_name === opt.value);
                                  const isHighCardinality =
                                    c &&
                                    !["number", "numeric", "integer", "float", "double"].includes(
                                      c.type.toLowerCase()
                                    ) &&
                                    c.unique !== undefined &&
                                    c.unique > 20;

                                  return { ...opt, disabled: isHighCardinality };
                                })}
                                renderValue={(opt: ColumnOption) => (
                                  <div className="flex items-center gap-2">
                                    <Hash className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-sm truncate">{opt.label}</span>
                                  </div>
                                )}
                                renderOption={(opt: ColumnOption & { disabled?: boolean }) => (
                                  <div
                                    className={`flex items-center gap-2 overflow-hidden w-full ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""
                                      }`}
                                  >
                                    <Hash className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-sm truncate flex-1 min-w-0">{opt.label}</span>
                                    {opt.mean !== undefined && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ml-auto flex-shrink-0">
                                        mean={opt.mean.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              />
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                removePredictor(index);

                                setOptPredictorsConfig((prev) => {
                                  const copy = { ...prev };
                                  delete copy[name];
                                  return copy;
                                });

                                setCategoricalSearch((prev) => {
                                  const copy = { ...prev };
                                  delete copy[name];
                                  return copy;
                                });
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {numeric && (
                            <div className="space-y-2">
                              <div className="text-[11px] text-slate-600">Enter a value for range</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <div className="text-[11px] text-slate-600">Min</div>
                                  <input
                                    type="number"
                                    placeholder="Min"
                                    value={predictorCfg?.min ?? (typeof col.min === "number" ? col.min.toString() : "")}
                                    onChange={(e) =>
                                      setOptPredictorsConfig((prev) => ({
                                        ...prev,
                                        [name]: {
                                          ...(prev[name] || { type: "numeric" }),
                                          type: "numeric",
                                          min: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <div className="text-[11px] text-slate-600">Max</div>
                                  <input
                                    type="number"
                                    placeholder="Max"
                                    value={predictorCfg?.max ?? (typeof col.max === "number" ? col.max.toString() : "")}
                                    onChange={(e) =>
                                      setOptPredictorsConfig((prev) => ({
                                        ...prev,
                                        [name]: {
                                          ...(prev[name] || { type: "numeric" }),
                                          type: "numeric",
                                          max: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {categorical && (
                            <div className="space-y-2">
                              <div className="text-[11px] text-slate-600">Choose categories</div>

                              <input
                                type="text"
                                value={searchValue}
                                onChange={(e) =>
                                  setCategoricalSearch((prev) => ({
                                    ...prev,
                                    [name]: e.target.value,
                                  }))
                                }
                                placeholder="Search categories..."
                                className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              />

                              <label className="flex items-center gap-2 text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={allFilteredSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = someFilteredSelected;
                                  }}
                                  onChange={(e) => {
                                    const checked = e.target.checked;

                                    setOptPredictorsConfig((prev) => {
                                      const current = prev[name]?.values || [];
                                      const currentSet = new Set(current);

                                      if (checked) filteredValues.forEach((v) => currentSet.add(v));
                                      else filteredValues.forEach((v) => currentSet.delete(v));

                                      return {
                                        ...prev,
                                        [name]: {
                                          ...(prev[name] || { type: "categorical" }),
                                          type: "categorical",
                                          values: Array.from(currentSet),
                                        },
                                      };
                                    });
                                  }}
                                  className="h-3 w-3"
                                />
                                <span className="truncate flex-1">Select all</span>
                                <span className="text-[11px] text-slate-500">
                                  ({filteredCategoricalOptions.length})
                                </span>
                              </label>

                              <div className="max-h-32 overflow-y-auto border rounded-md p-1 space-y-1">
                                {filteredCategoricalOptions.length === 0 ? (
                                  <div className="text-xs text-slate-500 px-2 py-2">No matching categories</div>
                                ) : (
                                  filteredCategoricalOptions.map((opt) => {
                                    const selected = predictorCfg?.values?.includes(opt.value) ?? false;

                                    return (
                                      <label
                                        key={opt.value}
                                        className="flex items-center gap-2 text-xs cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selected}
                                          onChange={(e) => {
                                            setOptPredictorsConfig((prev) => {
                                              const current = prev[name]?.values || [];
                                              const next = e.target.checked
                                                ? Array.from(new Set([...current, opt.value]))
                                                : current.filter((v) => v !== opt.value);

                                              return {
                                                ...prev,
                                                [name]: {
                                                  ...(prev[name] || { type: "categorical" }),
                                                  type: "categorical",
                                                  values: next,
                                                },
                                              };
                                            });
                                          }}
                                          className="h-3 w-3"
                                        />
                                        <span className="truncate flex-1">{opt.label}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ignore Variables */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-slate-700 truncate">
                    Ignore Variables (Optimize)
                  </h4>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {optIgnoredVariables.length}
                  </Badge>
                </div>

                <MultiSelect
                  options={allColumnOptions
                    .filter((opt) => !isSelectedInTargetsOrPredictors(opt.value))
                    .map((opt) => {
                      const col = allColumns.find((c) => c.column_name === opt.value);
                      const isHighCardinality =
                        col &&
                        !["number", "numeric", "integer", "float", "double"].includes(
                          col.type.toLowerCase()
                        ) &&
                        col.unique !== undefined &&
                        col.unique > 20;

                      return {
                        value: opt.value,
                        label: `${opt.label} (${formatType(opt.type)})${isHighCardinality ? " - High cardinality" : ""
                          }`,
                        disable: isHighCardinality,
                        fixed: isHighCardinality,
                      };
                    })}
                  value={optIgnoredVariables.map((v) => {
                    const col = allColumns.find((c) => c.column_name === v);
                    const isHighCardinality =
                      col &&
                      !["number", "numeric", "integer", "float", "double"].includes(
                        col.type.toLowerCase()
                      ) &&
                      col.unique !== undefined &&
                      col.unique > 20;

                    return {
                      value: v,
                      label: `${v} (${formatType(col?.type || "")})${isHighCardinality ? " - High cardinality" : ""
                        }`,
                      fixed: isHighCardinality,
                    };
                  })}
                  onChange={(opts) => {
                    const values = opts.map((o) => o.value);
                    const newlyIgnored = values.filter((v) => !optIgnoredVariables.includes(v));

                    newlyIgnored.forEach((ignoredCol) => {
                      const idx = predictors.indexOf(ignoredCol);
                      if (idx !== -1) {
                        removePredictor(idx);

                        setOptPredictorsConfig((prev) => {
                          const copy = { ...prev };
                          delete copy[ignoredCol];
                          return copy;
                        });

                        setCategoricalSearch((prev) => {
                          const copy = { ...prev };
                          delete copy[ignoredCol];
                          return copy;
                        });
                      }
                    });

                    setOptIgnoredVariables(values);
                  }}
                  placeholder="Select variables to ignore..."
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Run button */}
      <div className="p-6 border-t border-slate-100 bg-white flex-shrink-0 space-y-3">
        <div className="flex gap-2">
          <Button
            onClick={handleOptimize}
            className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            size="default"
            disabled={
              isLoading ||
              !selectedDataSource ||
              numericColumns.length === 0 ||
              predictors.length === 0 ||
              targets.length === 0
            }
          >
            <Play className="w-4 h-4 mr-2" />
            {isLoading ? "Loading..." : "Optimize"}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsHeatmapDialogOpen(true)}
                  variant="outline"
                  className="w-12 h-10 p-0 border border-slate-200 hover:bg-slate-50 text-slate-600 shadow-sm transition-all duration-200"
                  disabled={isLoading || !selectedDataSource || numericColumns.length === 0}
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Correlation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Dialog open={isHeatmapDialogOpen} onOpenChange={setIsHeatmapDialogOpen}>
        <DialogContent className="max-w-5xl min-h-[600px] p-6 bg-white shadow-2xl border-slate-200">
          <DialogHeader className="sr-only">
            <DialogTitle>Correlation Heatmap</DialogTitle>
            <DialogDescription>Visual correlation matrix of numeric columns in the selected dataset.</DialogDescription>
          </DialogHeader>
          <CorrelationHeatmap
            availableNumericColumns={numericColumns.map(col => col.column_name)}
            selectedDataSourceName={dataSources.find(ds => ds.id === selectedDataSource)?.name || selectedDataSource}
            selectedDataSourceType={dataSources.find(ds => ds.id === selectedDataSource)?.type}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SidebarLeftOptimise;
