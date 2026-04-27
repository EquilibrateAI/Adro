"use client";

import { motion, easeOut } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useOptimizationStore } from "@/services/utils/modeling/optimisation/optimise-store";
import BarLoader from "@/components/ui/bar-loader";

const cardVariants = {
  hover: { y: -3, transition: { duration: 0.3, ease: easeOut } },
};

/**
 * OptimiseSecOne
 * Displays summarized KPIs for the best optimization result, including the Best Prediction,
 * Best Loss, and the expected Target values and ranges.
 */
export default function OptimiseSecOne() {
  const bestPrediction = useOptimizationStore((s) => s.summary.bestPrediction);
  const bestLoss = useOptimizationStore((s) => s.summary.bestLoss);
  const targetValue = useOptimizationStore((s) => s.summary.targetValue);
  const targetRange = useOptimizationStore((s) => s.summary.targetRange);
  const targetName = useOptimizationStore((s) => s.summary.targetName);
  const isLoading = useOptimizationStore((s) => s.isLoading);

  const bestPredictionText =
    typeof bestPrediction === "number" ? bestPrediction.toFixed(3) : "--";
  const bestLossText = typeof bestLoss === "number" ? bestLoss.toFixed(3) : "--";
  const targetText = typeof targetValue === "number" ? targetValue.toFixed(3) : "";

  const hasRange = Array.isArray(targetRange) && targetRange.length === 2;
  const targetRangeText = hasRange ? `${targetRange![0]} – ${targetRange![1]}` : null;

  const LoaderBlock = ({ text }: { text?: string }) => (
    <div className="flex flex-col items-center justify-center h-full py-6">
      <BarLoader bars={8} barWidth={5} barHeight={50} color="bg-indigo-600" />
      {text && <p className="text-xs text-slate-500 mt-3">{text}</p>}
    </div>
  );

  const expectedTitle =
    targetName && targetName.trim().length > 0
      ? `Expected ${targetName}`
      : "Expected Target";

  return (
    <div className="flex flex-col gap-3 h-full">
      <motion.div whileHover="hover" variants={cardVariants} className="flex-1">
        <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            {isLoading ? (
              <LoaderBlock text="Optimizing best prediction..." />
            ) : (
              <div className="flex gap-3 w-full">
                <div className="p-1.5 rounded-full bg-indigo-100 shrink-0 self-start mt-1">
                  <ArrowUpRight className="w-3 h-3 text-indigo-600" />
                </div>

                <div className="flex flex-col flex-1 min-w-0 justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      Best Prediction
                    </h3>
                    <p className="text-xl font-bold text-indigo-700 mt-1">
                      {bestPredictionText}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-4 pt-2">
                    Best Loss: <span className="font-semibold text-gray-700">{bestLossText}</span>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div whileHover="hover" variants={cardVariants} className="flex-1">
        <Card className="shadow-sm h-full">
          <CardContent className="p-4 h-full flex items-stretch">
            {isLoading ? (
              <LoaderBlock text="Optimizing target values..." />
            ) : (
              <div className="flex gap-3 w-full">
                <div className="p-1.5 rounded-full bg-indigo-100 shrink-0 self-start mt-1">
                  <TrendingUp className="w-3 h-3 text-indigo-600" />
                </div>

                <div className="flex flex-col flex-1 min-w-0 justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">
                      {expectedTitle}
                    </h3>
                    <p className="text-xl font-bold text-indigo-700 mt-1">
                      {targetText}
                    </p>
                  </div>

                  <p className="text-sm text-gray-500 mt-4 pt-3 border-t border-gray-100">
                    {targetRangeText
                      ? (<>Range: <span className="font-semibold text-gray-700">{targetRangeText}</span></>)
                      : <span className="text-gray-400">No range set</span>
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
