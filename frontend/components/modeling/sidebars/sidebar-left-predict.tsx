import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Play, Settings, Target, Database, Hash } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";
import MultiSelect from "@/components/ui/multiselect";
import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import { getColumnInfo } from "@/services/api/dashboard/text-mode/column-info/column-names";
import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BarChart3, Info } from "lucide-react";
import { CorrelationHeatmap } from "../predict/correlation-heatmap";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCorrelation } from "@/services/api/modeling/predict/correlation";
import { manualPredictor } from "@/services/api/modeling/predict/manual_predictor";

interface SidebarLeftPredictProps {
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

const DATA_SOURCE_CONFIG = {
  csv: { icon: "📄", color: "bg-blue-500" },
  mysql: { icon: "🐬", color: "bg-orange-500" },
  postgresql: { icon: "🐘", color: "bg-blue-600" },
  mongodb: { icon: "🍃", color: "bg-green-500" },
  sqlite: { icon: "📑", color: "bg-gray-500" },
  default: { icon: "❓", color: "bg-purple-500" },
};

/**
 * SidebarLeftPredict
 * Specialized sidebar for manual configuration of predictive models.
 * Allows users to choose a data source, pick target variables, and select predictor features
 * before initiating the modeling process.
 */
const SidebarLeftPredict: React.FC<SidebarLeftPredictProps> = ({
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
  const [ignoredVariables, setIgnoredVariables] = useState<string[]>([]);

  const {
    setPredictions,
    correlationData,
    setCorrelationData,
    availableNumericColumns,
    setAvailableNumericColumns,
    selectedDataSourceName,
    selectedDataSourceType,
    setSelectedDataSourceName,
    setSelectedDataSourceType,
    setSelectedTarget,
    setLoading,
    setPredictors: setStorePredictors,
    setTargets: setStoreTargets,
    // setError, // removed usage (toast-only)
  } = usePredictionStore();

  const [isHeatmapDialogOpen, setIsHeatmapDialogOpen] = useState(false);

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

        setAllColumns(columnArray);

        const numeric = columnArray.filter(
          (col): col is Column =>
            typeof col === "object" &&
            col !== null &&
            ["number", "numeric", "integer", "float", "double"].includes(
              col.type.toLowerCase()
            )
        );
        setNumericColumns(numeric);
        setAvailableNumericColumns(numeric.map(c => c.column_name));

        // Auto-ignore high cardinality categorical columns
        const highCardinalityColumns = columnArray.filter((col) => {
          const isNumeric = ["number", "numeric", "integer", "float", "double"].includes(
            col.type.toLowerCase()
          );
          return !isNumeric && col.unique !== undefined && col.unique > 20;
        });

        setIgnoredVariables(highCardinalityColumns.map((col) => col.column_name));
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
  }, [selectedDataSource, setAvailableNumericColumns]);

  useEffect(() => {
    const validPredictors = predictors.filter((p) => p && p.trim() !== "");
    setStorePredictors(validPredictors);
  }, [predictors, setStorePredictors]);

  useEffect(() => {
    const validTargets = targets.filter((t) => t && t.trim() !== "");
    setStoreTargets(validTargets);
  }, [targets, setStoreTargets]);

  useEffect(() => {
    if (targets && targets[0]) {
      setSelectedTarget(targets[0]);
    } else {
      setSelectedTarget(null);
    }
  }, [targets, setSelectedTarget]);

  // Background fetch correlation data when predictors or targets change
  useEffect(() => {
    const activePredictors = predictors.filter(Boolean);
    const activeTargets = targets.filter(Boolean);

    if (selectedDataSourceName && activePredictors.length > 0 && activeTargets.length > 0) {
      const fetchSidebarCorrelation = async () => {
        try {
          const allCols = Array.from(new Set([...activePredictors, ...activeTargets]));
          if (allCols.length < 2) return;

          const response = await getCorrelation({
            datasource_name: selectedDataSourceName,
            columns: allCols,
            file_type: selectedDataSourceType || undefined
          });
          setCorrelationData(response.correlation);
        } catch (error) {
          console.error("Sidebar background correlation fetch failed:", error);
        }
      };

      const timer = setTimeout(fetchSidebarCorrelation, 800); // Debounce
      return () => clearTimeout(timer);
    }
  }, [predictors, targets, selectedDataSourceName, selectedDataSourceType, setCorrelationData, setAvailableNumericColumns]);

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

  const getPlaceholderValue = (columnName: string): string => {
    const column = numericColumns.find((col) => col.column_name === columnName);

    if (column && column.mean !== undefined) {
      return `e.g., ${column.mean.toFixed(1)} (avg)`;
    }
    if (column && column.median !== undefined) {
      return `e.g., ${column.median.toFixed(1)} (median)`;
    }
    if (column && column.mode !== undefined) {
      return `e.g., ${Number(column.mode).toFixed(1)} (mode)`;
    }
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
    .filter((col) => !ignoredVariables.includes(col.column_name))
    .map((col) => ({
      value: col.column_name,
      label: col.column_name,
      type: col.type,
      mean: col.mean,
    }));

  const numericColumnOptions: ColumnOption[] = allColumnOptions.filter((col) =>
    ["number", "numeric", "integer", "float", "double"].includes(col.type.toLowerCase())
  );

  // Filter options for targets - exclude predictors and ignored variables
  const targetColumnOptions: ColumnOption[] = numericColumnOptions.filter(
    (col) => !predictors.includes(col.value) && !ignoredVariables.includes(col.value)
  );

  // Filter options for predictors - exclude targets and ignored variables
  const predictorColumnOptions: ColumnOption[] = allColumnOptions.filter(
    (col) => !targets.includes(col.value) && !ignoredVariables.includes(col.value)
  );

  // Resets predictor and target states when switching to a different dataset
  const handleDataSourceChange = (value: string) => {
    setSelectedDataSource(value);
    const ds = dataSources.find((d) => d.id === value);
    setSelectedDataSourceName(ds?.name || null);
    setSelectedDataSourceType(ds?.type || null);

    predictorValues.forEach((_, index) => {
      updatePredictorValue(index, "");
    });

    targetValues.forEach((_, index) => {
      updateTargetValue(index, "");
    });

    setIgnoredVariables([]);
    setCorrelationData(null);
    setAvailableNumericColumns([]);

    // Clear all predictors when changing data source
    for (let i = predictors.length - 1; i >= 0; i--) {
      removePredictor(i);
    }
  };

  // Initiates the manual prediction process by sending parameters to the backend
  async function handlePredict() {
    // Minimal validations (toast-only)
    if (!selectedDataSource) {
      toast.error("Please select a data source");
      return;
    }
    if (targets.filter(Boolean).length === 0) {
      toast.error("Please add at least one target");
      return;
    }
    if (predictors.filter(Boolean).length === 0) {
      toast.error("Please add at least one predictor");
      return;
    }

    const ds = dataSources.find((d) => d.id === selectedDataSource);

    const ignoredSet = new Set<string>(ignoredVariables.filter(Boolean));
    const targetsSet = new Set<string>(targets.filter(Boolean));

    // Auto-ignore high cardinality categorical columns
    const autoIgnored: Array<{ column: string; unique: number }> = [];
    allColumns.forEach((col) => {
      const isNumeric = ["number", "numeric", "integer", "float", "double"].includes(
        col.type.toLowerCase()
      );
      if (!isNumeric && col.unique && col.unique > 20) {
        if (!ignoredSet.has(col.column_name) && !targetsSet.has(col.column_name)) {
          ignoredSet.add(col.column_name);
          autoIgnored.push({ column: col.column_name, unique: col.unique });
        }
      }
    });



    const predictorsMap = predictors.reduce<Record<string, string | number>>((acc, predName, idx) => {
      if (!predName) return acc;

      const col = allColumns.find((c) => c.column_name === predName);
      if (!col) return acc;

      const userValue = predictorValues[idx];
      if (userValue === undefined || userValue === "") return acc;

      const isNumeric = ["number", "numeric", "integer", "float", "double"].includes(
        col.type.toLowerCase()
      );

      if (isNumeric) {
        const parsedValue = parseFloat(userValue);
        if (!isNaN(parsedValue)) {
          acc[predName] = parsedValue;
        }
      } else {
        acc[predName] = userValue;
      }

      return acc;
    }, {});

    const payload = {
      datasource_name: ds?.name || "",
      file_type: ds?.type || "",
      targets,
      predictors: predictorsMap,
      ignore_columns: Array.from(ignoredSet),
    };

    try {
      setLoading(true);
      setIsLoading(true);
      const response = await manualPredictor(payload);

      const result = response as { predictions?: unknown } & Record<string, unknown>;
      if (result?.predictions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPredictions(result.predictions as any);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPredictions(result as any);
      }

      toast.success("Prediction completed successfully");
    } catch (error: unknown) {
      console.error("Prediction error:", error);

      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Prediction failed";

      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
          <div className="p-2 rounded-lg bg-emerald-500">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-800 truncate">Manual Mode</h3>
            <p className="text-sm text-slate-500 truncate">Configure parameters manually</p>
          </div>
        </div>

        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border bg-emerald-50 text-blue-700 border-blue-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 flex-shrink-0" />
          <span className="truncate">Prediction Mode</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-6 space-y-6">
          {/* Data source */}
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
                Please select a data source above to configure predictors and targets
              </p>
            </div>
          ) : (
            <>
              {/* Targets */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-600 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-slate-700 truncate">Target Variables</h4>
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
                              onChange={(value: string) => updateTarget(index, value)}
                              disabled={false}
                              placeholder="Select target column"
                              options={targetColumnOptions.map((opt) => {
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
                                <span className="text-sm truncate">{opt.label}</span>
                              )}
                              renderOption={(opt: ColumnOption) => (
                                <div className="flex items-center gap-2 overflow-hidden w-full">
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
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-slate-300 hover:border-purple-300 hover:bg-purple-50"
                      onClick={addTarget}
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
                    <h4 className="text-sm font-semibold text-slate-700 truncate">Predictors</h4>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {predictors.filter((p) => p).length}
                    </Badge>
                  </div>
                </div>

                <MultiSelect
                  options={predictorColumnOptions.map((opt) => {
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
                      return;
                    }

                    const removed = currentPredictors.filter((p) => !newValues.includes(p));
                    removed.forEach((pred) => {
                      const idx = predictors.indexOf(pred);
                      if (idx !== -1) removePredictor(idx);
                    });

                    const added = newValues.filter((v) => !predictors.includes(v));
                    added.forEach((value) => {
                      const oldLength = predictors.length;
                      addPredictor();
                      updatePredictor(oldLength, value);
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
                      const isNumeric =
                        !!col &&
                        ["number", "numeric", "integer", "float", "double"].includes(
                          col.type.toLowerCase()
                        );
                      const isCategorical = !!col && !isNumeric;

                      const categoricalOptions = getCategoricalOptionsFromColumn(col);

                      return (
                        <div
                          key={index}
                          className="bg-white rounded-lg border border-slate-200 p-2 space-y-1"
                        >
                          <div className="flex gap-2">
                            <div className="flex-1 min-w-0">
                              <CustomSelect
                                value={name}
                                onChange={(value: string) => updatePredictor(index, value)}
                                disabled={false}
                                placeholder="Select predictor column"
                                options={predictorColumnOptions.map((opt) => {
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
                                renderOption={(opt: ColumnOption) => (
                                  <div className="flex items-center gap-2 overflow-hidden w-full">
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

                            {name && targets.some(t => t) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-50 border border-slate-100 cursor-help hover:bg-white hover:border-blue-200 transition-colors">
                                      <Info className="w-3.5 h-3.5 text-slate-400 hover:text-blue-500" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent hideArrow side="right" className="p-3 max-w-[250px] bg-white shadow-xl border border-slate-100">
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1">Correlation with Targets</p>
                                      {targets.filter(Boolean).map(targetName => {
                                        const correlation = correlationData?.[name]?.[targetName];
                                        const isHighlyCorrelated = correlation !== undefined && Math.abs(correlation) > 0.8;

                                        return (
                                          <div key={targetName} className="flex items-center justify-between gap-4 py-0.5">
                                            <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{targetName}</span>
                                            <span className={`text-[11px] font-mono font-bold ${correlation === undefined ? 'text-slate-300' :
                                              isHighlyCorrelated ? 'text-emerald-500' : 'text-blue-600'
                                              }`}>
                                              {correlation !== undefined ? correlation.toFixed(3) : 'N/A'}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {targets.filter(Boolean).length > 0 && targets.filter(Boolean).every(t => correlationData?.[name]?.[t] === undefined) && (
                                        <p className="text-[10px] text-slate-400 italic">Calculating correlation...</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePredictor(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-8 h-8 p-0 flex-shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {isNumeric && (
                            <input
                              type="number"
                              placeholder={name ? getPlaceholderValue(name) : "Enter value"}
                              value={predictorValues[index] || ""}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updatePredictorValue(index, e.target.value)
                              }
                              className="w-full h-8 px-3 text-xs border border-slate-300 rounded-md bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                          )}

                          {isCategorical && (
                            <CustomSelect
                              value={predictorValues[index] || ""}
                              onChange={(value: string) => updatePredictorValue(index, value)}
                              disabled={categoricalOptions.length === 0}
                              placeholder={
                                categoricalOptions.length > 0
                                  ? "Select category"
                                  : "No categories available"
                              }
                              options={categoricalOptions}
                              renderValue={(opt: { value: string; label: string }) => (
                                <div className="flex items-center gap-2">
                                  <Hash className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                  <span className="text-xs truncate">{opt.label}</span>
                                </div>
                              )}
                              renderOption={(opt: { value: string; label: string }) => (
                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                  <span className="text-xs truncate flex-1 min-w-0">{opt.label}</span>
                                </div>
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ignore variables */}
              <div className="space-y-3 min-w-0">
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <h4 className="text-sm font-semibold text-slate-700 truncate">Ignore Variables</h4>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {ignoredVariables.length}
                    </Badge>
                  </div>
                </div>

                <MultiSelect
                  options={allColumns
                    .filter((col) => !isSelectedInTargetsOrPredictors(col.column_name))
                    .map((col) => {
                      const isHighCardinality =
                        !["number", "numeric", "integer", "float", "double"].includes(
                          col.type.toLowerCase()
                        ) &&
                        col.unique !== undefined &&
                        col.unique > 20;

                      return {
                        value: col.column_name,
                        label: `${col.column_name} (${formatType(col.type)})${isHighCardinality ? " - High cardinality" : ""
                          }`,
                        disable: isHighCardinality,
                        fixed: isHighCardinality,
                      };
                    })}
                  value={ignoredVariables.map((v) => {
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
                    const newlyIgnored = values.filter((v) => !ignoredVariables.includes(v));

                    newlyIgnored.forEach((ignoredCol) => {
                      const idx = predictors.indexOf(ignoredCol);
                      if (idx !== -1) removePredictor(idx);
                    });

                    setIgnoredVariables(values);
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
            onClick={handlePredict}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
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
            {isLoading ? "Loading..." : "Predict"}
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
            availableNumericColumns={availableNumericColumns}
            selectedDataSourceName={selectedDataSourceName || ""}
            selectedDataSourceType={selectedDataSourceType || undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SidebarLeftPredict;
