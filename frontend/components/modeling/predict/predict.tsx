import { motion } from "framer-motion";
import { PredictorCarousel } from "@/components/ui/predictor-carousel";
import { usePredictionStore } from "@/services/utils/modeling/prediction/predict-store";


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * Main entry point for the prediction workspace. 
 * Calculates and maps prediction metrics from the global store to display 
 * within the PredictorCarousel component.
 */
export function Predict() {
  const {
    predictions,
    isLoading,
  } = usePredictionStore();

  const predictionsMap = (predictions as unknown) as Record<string, unknown>;

  const targets = predictions
    ? Object.keys(predictionsMap)
      .filter(
        (key) =>
          key !== "predicted_data" &&
          key !== "original_vs_predicted" &&
          typeof predictionsMap[key] === "object" &&
          predictionsMap[key] !== null &&
          "rmse" in (predictionsMap[key] as Record<string, unknown>)
      )
      .map((targetName) => ({
        id: targetName,
        name: targetName,
      }))
    : [];

  const targetMetrics: Record<string, {
    rmse: number;
    mse: number;
    mae: number;
    r2_score: number;
    no_of_boosting_rounds: number;
    max_depth: number;
    learning_rate: number;
    predicted_value: number;
    original_vs_predicted: [number, number][];
  }> = {};
  const predictors: Record<string, string | number> = {};

  if (predictions) {
    targets.forEach((target) => {
      const targetData = predictionsMap[target.name] as Record<string, unknown>;
      const pDataMap = predictionsMap.predicted_data as Record<string, Record<string, unknown>>;
      const ovpMap = predictionsMap.original_vs_predicted as Record<string, [number, number][]>;

      const predictedData = pDataMap?.[target.name];
      const originalVsPredicted = ovpMap?.[target.name] || [];

      const predictedKey = `Predicted_${target.name}`;
      const predictedValue = predictedData?.[predictedKey] as number;

      if (predictedData) {
        Object.entries(predictedData).forEach(([key, value]) => {
          if (!key.startsWith("Predicted_") && !(key in predictors)) {
            predictors[key] = value as string | number;
          }
        });
      }

      const bestParams = targetData?.best_params as Record<string, unknown> | undefined;

      targetMetrics[target.name] = {
        rmse: (targetData?.rmse as number) || 0,
        mse: (targetData?.mse as number) || 0,
        mae: (targetData?.mae as number) || 0,
        r2_score: (targetData?.r2_score as number) || 0,
        // Backend sends `num_boost_round`, not `no_of_boosting_rounds`
        no_of_boosting_rounds: (targetData?.num_boost_round as number) || 0,
        // max_depth and learning_rate are nested inside best_params
        max_depth: (bestParams?.max_depth as number) || 0,
        learning_rate: (bestParams?.learning_rate as number) || 0,
        predicted_value: predictedValue || 0,
        original_vs_predicted: originalVsPredicted,
      };
    });
  }

  return (
    <motion.div
      className="space-y-6 p-4"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <PredictorCarousel
        targets={targets}
        targetMetrics={targetMetrics}
        predictors={predictors}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
