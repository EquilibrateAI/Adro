"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Optimise } from "./optimise/optimise";
import { Predict } from "./predict/predict";
import { SidebarRight } from "@/components/modeling/sidebars/sidebar-right";
import SidebarLeft from "@/components/modeling/sidebars/sidebar-left";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { TrendingUp, Target, BrainCircuit } from "lucide-react";
import { NavTabs } from "../nav-tabs/nav-tabs";

import { predAssistant } from "@/services/api/modeling/predict/pred-assistant";
import { optimiseAssistant } from "@/services/api/modeling/optimise/optimise-assistant";

import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";
import { useOptimizationStore, type OptimizationResult } from "@/services/utils/modeling/optimisation/optimise-store";
import { useSettingsStore } from "@/services/utils/settings/settings-store";
type QueryType = "predict" | "optimize";

interface QueryHistory {
  id: string;
  timestamp: Date;
  query: string;
  result: string;
  type: QueryType;
}

// Main component for the modeling workspace, managing both predictive and optimization workflows
export function Modeling() {
  const allResults = useOptimizationStore((s) => s.allResults);
  const selectedTarget = useOptimizationStore((s) => s.selectedTarget);
  const setSelectedTarget = useOptimizationStore((s) => s.setSelectedTarget);
  const targetNames = Object.keys(allResults);

  const TargetSelector = () => {
    if (targetNames.length <= 1) return null;

    return (
      <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200">
        {targetNames.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedTarget(name)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${selectedTarget === name
                ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
              }`}
          >
            {name}
          </button>
        ))}
      </div>
    );
  };

  const [activeTab, setActiveTab] = useState<QueryType>("predict");

  const [predictPredictors, setPredictPredictors] = useState<string[]>([]);
  const [predictTargets, setPredictTargets] = useState<string[]>([]);
  const [predictPredictorValues, setPredictPredictorValues] = useState<string[]>([]);
  const [predictTargetValues, setPredictTargetValues] = useState<string[]>([]);
  const { setPredictions, setLoading: setPredictLoading } = usePredictionStore();
  const { setAllResults, setSelectedTarget: setOptimizationSelectedTarget, setLoading: setOptimizeLoading } = useOptimizationStore();

  const [optimizePredictors, setOptimizePredictors] = useState<string[]>([]);
  const [optimizeTargets, setOptimizeTargets] = useState<string[]>([]);
  const [optimizePredictorValues, setOptimizePredictorValues] = useState<string[]>([]);
  const [optimizeTargetValues, setOptimizeTargetValues] = useState<string[]>([]);

  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>("");
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const { selectedProvider, selectedModel } = useSettingsStore();

  // Updates a specific input variable in the prediction configuration array
  const updatePredictPredictor = (index: number, value: string): void => {
    const arr = [...predictPredictors];
    arr[index] = value;
    setPredictPredictors(arr);
  };

  const updatePredictPredictorValue = (index: number, value: string): void => {
    const arr = [...predictPredictorValues];
    arr[index] = value;
    setPredictPredictorValues(arr);
  };

  const updatePredictTarget = (index: number, value: string): void => {
    const arr = [...predictTargets];
    arr[index] = value;
    setPredictTargets(arr);
  };

  const updatePredictTargetValue = (index: number, value: string): void => {
    const arr = [...predictTargetValues];
    arr[index] = value;
    setPredictTargetValues(arr);
  };

  // Inserts a new row for predictor variables in the prediction settings
  const addPredictPredictor = (): void => {
    setPredictPredictors([...predictPredictors, ""]);
    setPredictPredictorValues([...predictPredictorValues, ""]);
  };

  const removePredictPredictor = (index: number): void => {
    setPredictPredictors(predictPredictors.filter((_, i) => i !== index));
    setPredictPredictorValues(predictPredictorValues.filter((_, i) => i !== index));
  };

  const addPredictTarget = (): void => {
    setPredictTargets([...predictTargets, ""]);
    setPredictTargetValues([...predictTargetValues, ""]);
  };

  const removePredictTarget = (index: number): void => {
    setPredictTargets(predictTargets.filter((_, i) => i !== index));
    setPredictTargetValues(predictTargetValues.filter((_, i) => i !== index));
  };

  const updateOptimizePredictor = (index: number, value: string): void => {
    const arr = [...optimizePredictors];
    arr[index] = value;
    setOptimizePredictors(arr);
  };

  const updateOptimizePredictorValue = (index: number, value: string): void => {
    const arr = [...optimizePredictorValues];
    arr[index] = value;
    setOptimizePredictorValues(arr);
  };

  const updateOptimizeTarget = (index: number, value: string): void => {
    const arr = [...optimizeTargets];
    arr[index] = value;
    setOptimizeTargets(arr);
  };

  const updateOptimizeTargetValue = (index: number, value: string): void => {
    const arr = [...optimizeTargetValues];
    arr[index] = value;
    setOptimizeTargetValues(arr);
  };

  const addOptimizePredictor = (): void => {
    setOptimizePredictors([...optimizePredictors, ""]);
    setOptimizePredictorValues([...optimizePredictorValues, ""]);
  };

  const removeOptimizePredictor = (index: number): void => {
    setOptimizePredictors(optimizePredictors.filter((_, i) => i !== index));
    setOptimizePredictorValues(optimizePredictorValues.filter((_, i) => i !== index));
  };

  const addOptimizeTarget = (): void => {
    setOptimizeTargets([...optimizeTargets, ""]);
    setOptimizeTargetValues([...optimizeTargetValues, ""]);
  };

  const removeOptimizeTarget = (index: number): void => {
    setOptimizeTargets(optimizeTargets.filter((_, i) => i !== index));
    setOptimizeTargetValues(optimizeTargetValues.filter((_, i) => i !== index));
  };

  // Placeholder for executing the full modeling job once parameters are finalized
  const onRun = (): void => {
  };

  const handleKeyPress = (e: React.KeyboardEvent<Element>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRunQuery();
    }
  };

  // Simulates an AI processing job based on natural language input and updates the history list


  const handleRunQuery = async (): Promise<void> => {
    if (!naturalLanguageInput.trim()) return;

    if (selectedFiles.length === 0) {
      toast.warning("Please select a dataset first.");
      return;
    }

    const newQuery: QueryHistory = {
      id: Date.now().toString(),
      timestamp: new Date(),
      query: naturalLanguageInput,
      result: "Processing...",
      type: activeTab,
    };

    setQueryHistory((prev) => [newQuery, ...prev]);
    setNaturalLanguageInput("");

    try {
      if (activeTab === "optimize") {
        setOptimizeLoading(true);
        const response = await optimiseAssistant({
          query: naturalLanguageInput,
          file_name: selectedFiles[0],
          model: selectedModel,
          provider: selectedProvider,
        });

        // Update assistant panel
        setQueryHistory((prev) =>
          prev.map((item) =>
            item.id === newQuery.id
              ? { ...item, result: response.response }
              : item
          )
        );

        // Update optimization dashboard
        if (response.metrics && Object.keys(response.metrics).length > 0) {
          const formattedResult: Record<string, OptimizationResult> = {};
          let firstTarget: string | null = null;

          if (response.metrics.best_prediction !== undefined) {
            // Old format fallback
            const targetName = "Target";
            firstTarget = targetName;
            formattedResult[targetName] = {
              summary: {
                bestPrediction: response.metrics.best_prediction,
                bestLoss: response.metrics.best_loss,
                bestPredictors: response.metrics.best_predictors,
                targetValue: response.metrics.target_value,
                targetRange: response.metrics.target_range,
                targetName: targetName,
              },
              topSolutions: response.metrics.top_solutions || [],
            };
          } else {
            // New nested format
            for (const [targetName, metricsObj] of Object.entries(response.metrics)) {
              if (!firstTarget) firstTarget = targetName;
              const m = metricsObj as Record<string, unknown>;
              formattedResult[targetName] = {
                summary: {
                  bestPrediction: m.best_prediction as number,
                  bestLoss: m.best_loss as number,
                  bestPredictors: m.best_predictors as Record<string, number>,
                  targetValue: m.target_value as number,
                  targetRange: m.target_range as [number, number],
                  targetName: targetName,
                },
                topSolutions: (m.top_solutions as unknown[]) || [],
              };
            }
          }

          setAllResults(formattedResult);
          if (firstTarget) setOptimizationSelectedTarget(firstTarget);
        }
      } else {
        setPredictLoading(true);
        const response = await predAssistant({
          query: naturalLanguageInput,
          file_name: selectedFiles[0],
          model: selectedModel,
          provider: selectedProvider,
        });

        // Update assistant panel
        setQueryHistory((prev) =>
          prev.map((item) =>
            item.id === newQuery.id
              ? { ...item, result: response.response }
              : item
          )
        );

        // Update prediction dashboard
        setPredictions(response.metrics);
      }
    } catch (error) {
      console.error(error);
      const modeName = activeTab === "optimize" ? "Optimization" : "Prediction";
      setQueryHistory((prev) =>
        prev.map((item) =>
          item.id === newQuery.id
            ? { ...item, result: `${modeName} failed. Try again.` }
            : item
        )
      );
    } finally {
      setOptimizeLoading(false);
      setPredictLoading(false);
    }

    setNaturalLanguageInput("");
  };

  return (
    <SidebarProvider>
      <SidebarLeft
        activeTab={activeTab}
        predictors={activeTab === "predict" ? predictPredictors : optimizePredictors}
        predictorValues={activeTab === "predict" ? predictPredictorValues : optimizePredictorValues}
        targets={activeTab === "predict" ? predictTargets : optimizeTargets}
        targetValues={activeTab === "predict" ? predictTargetValues : optimizeTargetValues}
        updatePredictor={activeTab === "predict" ? updatePredictPredictor : updateOptimizePredictor}
        updatePredictorValue={activeTab === "predict" ? updatePredictPredictorValue : updateOptimizePredictorValue}
        updateTarget={activeTab === "predict" ? updatePredictTarget : updateOptimizeTarget}
        updateTargetValue={activeTab === "predict" ? updatePredictTargetValue : updateOptimizeTargetValue}
        addPredictor={activeTab === "predict" ? addPredictPredictor : addOptimizePredictor}
        removePredictor={activeTab === "predict" ? removePredictPredictor : removeOptimizePredictor}
        addTarget={activeTab === "predict" ? addPredictTarget : addOptimizeTarget}
        removeTarget={activeTab === "predict" ? removePredictTarget : removeOptimizeTarget}
        onRun={onRun}
      />

      <SidebarInset>
        <header className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center pb-2 border-b border-gray-200 bg-white px-6">
          <div className="flex w-full items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <BrainCircuit className="h-6 w-6 text-primary" />
              <Separator orientation="vertical" className="h-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Modeling</h1>
                <p className="text-sm text-muted-foreground">
                  Predict outcomes and optimize parameters
                </p>
              </div>
            </div>

            <div>
              <NavTabs />
            </div>
          </div>
        </header>

        <div className="pt-16 ml-80 mr-80">
          <Tabs
            value={activeTab}
            onValueChange={(value: string) =>
              setActiveTab(value as QueryType)
            }
            className="flex flex-col h-[calc(100vh-4rem)]"
          >
            <div className="fixed top-16 left-80 right-80 z-10 bg-background pt-4 pb-2 flex justify-center">
              <TabsList className="w-[600px]">
                <TabsTrigger
                  value="predict"
                  className="data-[state=active]:bg-white data-[state=active]:text-black"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Predict
                </TabsTrigger>
                <TabsTrigger
                  value="optimize"
                  className="data-[state=active]:bg-white data-[state=active]:text-black"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Optimize
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 px-10 pb-10 pt-14">
              <TabsContent value="predict" className="mt-4">
                <Predict />
              </TabsContent>

              <TabsContent value="optimize" className="mt-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  key="optimize"
                >
                  <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="border-b border-gray-200">
                      <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-800">
                            Optimization Results
                          </CardTitle>
                          <CardDescription className="text-sm text-gray-600">
                            Optimal parameter values and expected outcomes
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                          <TargetSelector />
                        </div>
                      </motion.div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                      <Optimise />
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SidebarInset>

      <SidebarRight
        activeTab={activeTab}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        naturalLanguageInput={naturalLanguageInput}
        setNaturalLanguageInput={setNaturalLanguageInput}
        handleKeyPress={handleKeyPress}
        handleRunQuery={handleRunQuery}
        queryHistory={queryHistory}
      />
    </SidebarProvider>
  );
}