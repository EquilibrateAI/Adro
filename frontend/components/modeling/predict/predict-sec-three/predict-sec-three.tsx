"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";
import BarLoader from "@/components/ui/bar-loader";

/**
 * Interface detailing target-specific metrics used in this component.
 */
interface TargetMetrics {
  rmse: number;
  mse: number;
  mae: number;
  r2_score: number;
  no_of_boosting_rounds: number;
  max_depth: number;
  learning_rate: number;
  predicted_value: number;
  original_vs_predicted: [number, number][];
}

/**
 * Interface defining the properties for the PredictSecThree component.
 */
interface PredictSecThreeProps {
  targetName?: string;
  metrics?: TargetMetrics;
  predictors?: Record<string, string | number>;
  isLoading?: boolean;
  isEmpty?: boolean;
}

/**
 * Detailed accordion view containing model hyperparameters and specific performance metrics.
 * Displays MSE, MAE, and the specifics of the Gradient Boosting Regressor configuration.
 */
export function PredictSecThree({ targetName, metrics, predictors, isLoading, isEmpty }: PredictSecThreeProps) {
  const { predictions, predictors: storePredictors, targets, isLoading: storeLoading } = usePredictionStore();

  const loading = isLoading !== undefined ? isLoading : storeLoading;
  const empty = isEmpty !== undefined ? isEmpty : !predictions;

  const mse = metrics?.mse ?? predictions?.mse;
  const mae = metrics?.mae ?? predictions?.mae;

  const rounds = metrics?.no_of_boosting_rounds ?? predictions?.noofboostingrounds;
  const maxDepth = metrics?.max_depth ?? predictions?.maxdepth;
  const lr = metrics?.learning_rate ?? predictions?.learningrate;

  const safePredictors = storePredictors ?? [];
  const safeTargets = targets ?? [];

  const usedPredictors = predictors ?? (safePredictors.length > 0 ? Object.fromEntries(safePredictors.map(p => [p, ""])) : {});

  const featuresText =
    usedPredictors && Object.keys(usedPredictors).length > 0
      ? Object.entries(usedPredictors)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : safePredictors.length > 0
      ? safePredictors.join(", ")
      : "No predictors selected";

  const targetsText = targetName || (safeTargets.length > 0 ? safeTargets.join(", ") : "No targets selected");

  const modelDetails = `Model: Gradient Boosting Regressor
Target: ${targetsText}
Predictors: ${featuresText}
No. of Boosting Rounds: ${rounds != null ? Math.round(rounds) : "--"}, Max Depth: ${maxDepth != null ? Math.round(maxDepth) : "--"}, Learning Rate: ${lr != null ? Number(lr).toFixed(6) : "--"}`;

  const metricsData = [
    {
      label: "MSE",
      value: mse !== undefined ? mse.toFixed(3) : "--",
      note: "Mean Squared Error",
      bgClass: "bg-blue-50",
      borderClass: "border-blue-100",
      textClass: "text-blue-700",
      boldClass: "text-blue-900",
      noteClass: "text-blue-600",
    },
    {
      label: "MAE",
      value: mae !== undefined ? mae.toFixed(3) : "--",
      note: "Mean Absolute Error",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-100",
      textClass: "text-amber-700",
      boldClass: "text-amber-900",
      noteClass: "text-amber-600",
    },
  ];

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <CardTitle>Model Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col items-center justify-center py-10">
            <BarLoader bars={8} barWidth={5} barHeight={50} color="bg-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Model Details</CardTitle>
          <CardDescription>No prediction results yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <Accordion
            type="single"
            collapsible
            defaultValue="model-details"
            className="w-full"
          >
            <AccordionItem value="model-details" className="border-0">
              <AccordionTrigger className="text-base font-medium text-gray-800 hover:bg-gray-50 px-3 py-2 rounded-lg">
                Model Details &amp; Performance Metrics
              </AccordionTrigger>

              <AccordionContent className="pt-2">
                <motion.pre
                  className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-xs border border-gray-800 whitespace-pre-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {modelDetails}
                </motion.pre>

                <motion.div
                  className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {metricsData.map((metric) => (
                    <div
                      key={metric.label}
                      className={`${metric.bgClass} p-3 rounded-lg border ${metric.borderClass}`}
                    >
                      <p className={`text-xs text-center ${metric.textClass} font-medium`}>
                        {metric.label}
                      </p>
                      <p className={`text-2xl text-center font-bold ${metric.boldClass}`}>
                        {metric.value}
                      </p>
                      <p className={`text-xs text-center ${metric.noteClass} mt-1`}>
                        {metric.note}
                      </p>
                    </div>
                  ))}
                </motion.div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
}
