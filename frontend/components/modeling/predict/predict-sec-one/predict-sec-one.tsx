"use client";

import { LineChart, BarChart2, Award } from "lucide-react";
import { motion, easeOut } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";
import BarLoader from "@/components/ui/bar-loader";

const cardVariants = {
  hover: { y: -3, transition: { duration: 0.3, ease: easeOut } },
};

/**
 * Interface defining the properties for the PredictSecOne component.
 */
interface PredictSecOneProps {
  targetName?: string;
  predictedValue?: number;
  r2Score?: number;
  rmse?: number;
  isLoading?: boolean;
}

/**
 * PredictSecOne
 * Displays primary prediction metrics and target values in a summary card format.
 * Includes visual indicators for Predicted Target, R-Squared Score, and RMSE.
 */
export function PredictSecOne({ targetName, predictedValue, r2Score, rmse, isLoading }: PredictSecOneProps) {
  const { predictions, targets, isLoading: storeLoading } = usePredictionStore();

  const loading = isLoading !== undefined ? isLoading : storeLoading;

  const r2 = r2Score !== undefined ? r2Score : predictions?.r2score;
  const rmseValue = rmse !== undefined ? rmse : predictions?.rmse;

  const safeTargets = targets ?? [];
  const getPredictedKey = (t: string) => `Predicted_${t}`;

  const targetValues =
    predictions && safeTargets.length > 0
      ? safeTargets.map((t) => {
          const key = getPredictedKey(t);
          return { label: t, value: predictions?.predicteddata?.[key] };
        })
      : [];


  // Renders the predicted value of the configured target variable
  const PredictedTargetBody = () => {
    if (loading) {
      return (
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-gray-800">Predicted Target</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
          </CardContent>
        </Card>
      );
    }

    if (targetName && predictedValue !== undefined) {
      return (
        <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            <div className="flex gap-3 w-full">
              <div className="p-1.5 rounded-full bg-emerald-100 shrink-0 self-start mt-1">
                <LineChart className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">{targetName}</h3>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {predictedValue.toFixed(3)}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">Predicted value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (predictions) {
      if (targetValues.length === 1) {
        const v = targetValues[0]?.value;
        return (
          <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            <div className="flex gap-3 w-full">
              <div className="p-1.5 rounded-full bg-emerald-100 shrink-0 self-start mt-1">
                <LineChart className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">
                    {safeTargets[0]}
                  </h3>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {typeof v === "number" ? v.toFixed(3) : v ?? "--"}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">Predicted value</p>
              </div>
            </div>
          </CardContent>
          </Card>
        );
      }

      if (targetValues.length > 1) {
        return (
          <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            <div className="flex gap-3 w-full">
              <div className="p-1.5 rounded-full bg-emerald-100 shrink-0 self-start mt-1">
                <LineChart className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Predicted Targets</h3>
                  <div className="space-y-1 text-sm text-gray-800 mt-2">
                    {targetValues.map((t) => (
                      <div key={t.label} className="flex justify-between gap-4">
                        <span className="font-medium">{t.label}:</span>
                        <span className="font-bold text-emerald-700">
                          {typeof t.value === "number"
                            ? t.value.toFixed(3)
                            : t.value ?? "--"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">Predicted values</p>
              </div>
            </div>
          </CardContent>
          </Card>
        );
      }
    }

    return (
      <Card className="shadow-sm h-full">
      <CardContent className="p-4 h-full flex items-stretch">
        <div className="flex gap-3 w-full">
          <div className="p-1.5 rounded-full bg-gray-100 shrink-0 self-start mt-1">
            <LineChart className="w-3 h-3 text-gray-400" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-400">Predicted Target</h3>
              <p className="text-xl font-bold text-gray-300 mt-1">--</p>
            </div>
            <p className="text-xs text-gray-300 mt-3 pt-2 border-t border-gray-100">Run predict to see results</p>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  // Renders the R-squared score indicating the goodness of fit for our model
  const R2Body = () => {
    if (loading) {
      return (
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-gray-800">R² Score</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
          </CardContent>
        </Card>
      );
    }

    const fitText =
      r2 !== undefined
        ? r2 > 0.9
          ? "Excellent fit"
          : r2 > 0.75
            ? "Good fit"
            : "Needs improvement"
        : "";

    if (r2 === undefined) {
      return (
        <Card className="shadow-sm h-full">
        <CardContent className="p-4 h-full flex items-stretch">
          <div className="flex gap-3 w-full">
            <div className="p-1.5 rounded-full bg-gray-100 shrink-0 self-start mt-1">
              <BarChart2 className="w-3 h-3 text-gray-400" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-400">R² Score</h3>
                <p className="text-xl font-bold text-gray-300 mt-1">--</p>
              </div>
              <p className="text-xs text-gray-300 mt-3 pt-2 border-t border-gray-100">Run predict to see results</p>
            </div>
          </div>
        </CardContent>
      </Card>
      );
    }

    return (
      <Card className="shadow-sm h-full">
      <CardContent className="p-4 h-full flex items-stretch">
        <div className="flex gap-3 w-full">
          <div className="p-1.5 rounded-full bg-emerald-100 shrink-0 self-start mt-1">
            <BarChart2 className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">R² Score</h3>
              <p className="text-xl font-bold text-emerald-700 mt-1">{r2.toFixed(3)}</p>
            </div>
            <p className="text-sm text-gray-500 mt-3 pt-2 border-t border-gray-100">
              <span className="font-semibold">{fitText}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  // Renders the Root Mean Square Error metric for model accuracy evaluation
  const RMSEBody = () => {
    if (loading) {
      return (
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-semibold text-gray-800">RMSE</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-6">
            <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
          </CardContent>
        </Card>
      );
    }

    if (rmseValue === undefined) {
      return (
        <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            <div className="flex gap-3 w-full">
              <div className="p-1.5 rounded-full bg-gray-100 shrink-0 self-start mt-1">
                <Award className="w-3 h-3 text-gray-400" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-400">RMSE</h3>
                  <p className="text-xl font-bold text-gray-300 mt-1">--</p>
                </div>
                <p className="text-xs text-gray-300 mt-3 pt-2 border-t border-gray-100">Run predict to see results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="shadow-sm h-full">
      <CardContent className="p-4 h-full flex items-stretch">
        <div className="flex gap-3 w-full">
          <div className="p-1.5 rounded-full bg-emerald-100 shrink-0 self-start mt-1">
            <Award className="w-3 h-3 text-emerald-600" />
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-800">RMSE</h3>
              <p className="text-xl font-bold text-emerald-700 mt-1">{rmseValue.toFixed(3)}</p>
            </div>
            <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">Root mean square error</p>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <motion.div whileHover="hover" variants={cardVariants} className="flex-1">
        <PredictedTargetBody />
      </motion.div>

      <motion.div whileHover="hover" variants={cardVariants} className="flex-1">
        <R2Body />
      </motion.div>

      <motion.div whileHover="hover" variants={cardVariants} className="flex-1">
        <RMSEBody />
      </motion.div>
    </div>
  );
}
