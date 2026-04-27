"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { motion, type Variants, easeOut } from "framer-motion";
import { useOptimizationStore } from "@/services/utils/modeling/optimisation/optimise-store";
import BarLoader from "@/components/ui/bar-loader";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
};

// Utility function to safely display null or numeric values with consistent precision
function formatValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "number") return value.toFixed(3);
  return String(value);
}

/**
 * Interface defining the expected structure of a single optimization solution row.
 */
interface Solution {
  rank?: string | number;
  prediction?: number | string;
  error?: number | string;
  predictors?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * OptimiseSecThree
 * Renders a tabular view of all top optimization solutions, ranked by their error score.
 * Allows the user to inspect alternative parameter combinations that still yield good results.
 */
export default function OptimiseSecThree() {
  const topSolutions = useOptimizationStore((s) => s.topSolutions ?? []);
  const isLoading = useOptimizationStore((s) => s.isLoading);

  const predictorKeys: string[] =
    topSolutions[0]?.predictors ? Object.keys(topSolutions[0].predictors) : [];


  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-green-600" />
            <CardTitle>Optimized Variables</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 h-full">
            <BarLoader bars={8} barWidth={5} barHeight={50} color="bg-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topSolutions.length) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Optimized Variables</CardTitle>
          <CardDescription>No optimization results yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="overflow-hidden"
    >
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <motion.div className="flex items-center gap-2" variants={rowVariants}>
            <Rocket className="w-5 h-5 text-green-600" />
            <CardTitle>Optimized Variables</CardTitle>
          </motion.div>
          <motion.div variants={rowVariants}>
            <CardDescription>Adjusted parameters for maximum performance</CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ maxHeight: "400px" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] whitespace-nowrap sticky left-0 bg-white z-10">
                    Rank
                  </TableHead>
                  <TableHead className="min-w-[120px] whitespace-nowrap sticky left-[100px] bg-white z-10">
                    Prediction
                  </TableHead>
                  <TableHead className="min-w-[120px] whitespace-nowrap sticky left-[220px] bg-white z-10">
                    Error
                  </TableHead>

                  {predictorKeys.map((key) => (
                    <TableHead key={key} className="min-w-[120px] whitespace-nowrap">
                      {key}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {topSolutions.map((solution: Solution, index: number) => (
                  <motion.tr
                    key={solution.rank ?? index}
                    variants={rowVariants}
                    className="border-b"
                  >
                    <TableCell className="font-medium min-w-[100px] whitespace-nowrap sticky left-0 bg-white">
                      {solution.rank ?? "-"}
                    </TableCell>

                    <TableCell className="min-w-[120px] whitespace-nowrap sticky left-[100px] bg-blue-50">
                      {typeof solution.prediction === "number"
                        ? solution.prediction.toFixed(4)
                        : solution.prediction ?? "-"}
                    </TableCell>

                    <TableCell className="min-w-[120px] whitespace-nowrap sticky left-[220px] bg-white">
                      <Badge
                        variant="outline"
                        className={
                          typeof solution.error === "number" && solution.error > 0.05
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-red-100 text-red-800 border-red-300"
                        }
                      >
                        {typeof solution.error === "number"
                          ? solution.error.toFixed(6)
                          : solution.error ?? "-"}
                      </Badge>
                    </TableCell>

                    {predictorKeys.map((key) => (
                      <TableCell key={key} className="min-w-[120px] whitespace-nowrap">
                        {formatValue(solution.predictors?.[key])}
                      </TableCell>
                    ))}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
