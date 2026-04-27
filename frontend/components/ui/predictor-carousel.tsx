"use client"

import {
  useState,
} from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, BarChart2, Award, TrendingUp, ChartNoAxesColumn, Settings } from "lucide-react"
import BarLoader from "@/components/ui/bar-loader"
import { PredictSecOne } from "@/components/modeling/predict/predict-sec-one/predict-sec-one"
import PredictSecTwo from "@/components/modeling/predict/predict-sec-two/predict-sec-two"
import { PredictSecThree } from "../modeling/predict/predict-sec-three/predict-sec-three"
const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(" ")
}

interface Target {
  id: string
  name: string
}

interface TargetMetrics {
  rmse: number
  mse: number
  mae: number
  r2_score: number
  no_of_boosting_rounds: number
  max_depth: number
  learning_rate: number
  predicted_value: number
  original_vs_predicted: [number, number][]
}

interface PredictorCarouselProps {
  targets: Target[]
  targetMetrics: Record<string, TargetMetrics>
  predictors: Record<string, string | number>
  isLoading?: boolean
}

// Renders the detailed metric cards and charts for a specific prediction target
function TargetContent({ target, metrics, predictors, isLoading, isEmpty }: { target: Target; metrics?: TargetMetrics; predictors: Record<string, string | number>; isLoading?: boolean; isEmpty?: boolean }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row gap-4 w-full h-full">
        <div className="w-full lg:w-1/4">
          <PredictSecOne
            targetName={target.name}
            predictedValue={metrics?.predicted_value}
            r2Score={metrics?.r2_score}
            rmse={metrics?.rmse}
            isLoading={isLoading}
          />
        </div>

        <div className="w-full lg:w-3/4">
          <PredictSecTwo
            targetName={target.name}
            originalVsPredicted={metrics?.original_vs_predicted}
            isLoading={isLoading}
            isEmpty={isEmpty}
          />
        </div>
      </div>

      <div>
        <PredictSecThree
          targetName={target.name}
          metrics={metrics}
          predictors={predictors}
          isLoading={isLoading}
          isEmpty={isEmpty}
        />
      </div>
    </div>
  );
}

// Displays a skeleton loading state while metrics are being calculated
function LoadingState() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row gap-4 w-full h-full">
        <div className="w-full lg:w-1/4 flex flex-col gap-3">
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">Predicted Target</CardTitle>
              <CardDescription className="text-xs">Calculating prediction...</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-6 w-full">
              <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">R² Score</CardTitle>
              <CardDescription className="text-xs">Calculating model fit...</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-6 w-full">
              <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
            </CardContent>
          </Card>

          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-gray-800">RMSE</CardTitle>
              <CardDescription className="text-xs">Calculating error metrics...</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-6 w-full">
              <BarLoader bars={7} barWidth={6} barHeight={50} color="bg-emerald-500" />
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-3/4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-emerald-100">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Original vs Predicted</CardTitle>
                  <CardDescription className="text-xs">
                    Model performance across all samples
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="h-[320px] px-2 pb-2 pt-0 flex flex-col w-full">
              <div className="border-t border-slate-200 mt-1 pt-3 h-full w-full flex flex-col">
                <div className="flex flex-col items-center justify-center h-full w-full text-slate-400 pt-60">
                  <BarLoader bars={10} barWidth={6} barHeight={60} color="bg-emerald-500" />
                  <p className="text-xs text-gray-500 mt-4 font-medium animate-pulse">Generating forecast visualization...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <CardTitle>Model Details</CardTitle>
          </div>
          <CardDescription>Preparing model details...</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col items-center justify-center py-8 w-full">
            <BarLoader bars={6} barWidth={5} barHeight={50} color="bg-emerald-500" />
            <p className="text-xs text-gray-500 mt-4 font-medium animate-pulse">Extracting model parameters...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Renders a placeholder state when no prediction data is available
function InitialEmptyState() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col lg:flex-row gap-4 w-full h-full">
        <div className="w-full lg:w-1/4 flex flex-col gap-3">
          <Card className="shadow-sm h-full">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-100">
                  <LineChart className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-400">Predicted Target</h3>
                  <p className="text-2xl font-bold text-gray-300 mt-1">--</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm h-full">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-100">
                  <BarChart2 className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-400">R² Score</h3>
                  <p className="text-2xl font-bold text-gray-300 mt-1">--</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm h-full">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-100">
                  <Award className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-400">RMSE</h3>
                  <p className="text-2xl font-bold text-gray-300 mt-1">--</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full lg:w-3/4">
          <Card className="h-full">
            <CardContent className="h-[320px] px-2 pb-2 pt-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="p-1.5 rounded-full bg-gray-100">
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-400">Original vs Predicted</h3>
                  <p className="text-xs text-gray-400">Model performance across all samples</p>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-3 h-full flex flex-col">
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="p-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                    <ChartNoAxesColumn className="w-12 h-12 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-1">No Chart Data Available</p>
                  <p className="text-xs text-slate-500">Run the Predictions to see the Chart</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Model Details</CardTitle>
          <CardDescription>No prediction results yet.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

// A paginated carousel component for viewing different prediction results
export function PredictorCarousel({ targets, targetMetrics, predictors, isLoading }: PredictorCarouselProps) {
  const [step, setStep] = useState(0);

  if (isLoading) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Prediction Results
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Model output and forecast visualization
              </CardDescription>
            </div>
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200">
              {[1, 2].map((i) => (
                <div key={i} className="h-7 w-20 rounded-lg bg-neutral-200/50 animate-pulse mx-1"></div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (targets.length === 0) {
    return (
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-800">
                Prediction Results
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Model output and forecast visualization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <InitialEmptyState />
        </CardContent>
      </Card>
    );
  }

  const isEmpty = !targets[step] || !targetMetrics[targets[step]?.name];

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Prediction Results
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Model output and forecast visualization
            </CardDescription>
          </div>

          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl border border-gray-200">
            {targets.map((target, targetIdx) => {
              const isCurrent = step === targetIdx;
              return (
                <button
                  key={target.name}
                  type="button"
                  onClick={() => setStep(targetIdx)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 focus:outline-none",
                    isCurrent
                      ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                  )}
                >
                  {target.name}
                </button>
              );
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {targets[step] && (
          <TargetContent
            target={targets[step]}
            metrics={targetMetrics[targets[step].name]}
            predictors={predictors}
            isLoading={false}
            isEmpty={isEmpty}
          />
        )}
      </CardContent>
    </Card>
  );
}