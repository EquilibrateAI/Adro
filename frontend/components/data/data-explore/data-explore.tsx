import DataTableComponent from "./data-table/data-table";
import DataChartComponent from "./data-chart/data-chart";
import { useDataStore } from "@/services/utils/data/sidebar/data-context";
import DataCleanComponent from "./data-clean/data-clean";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/**
 * Acts as the centralized parent layout for the entire Data Exploration interface.
 * 
 * Retrieves the currently active dataset/table context via `useDataStore`, and injects
 * them into several fundamental data views:
 *   - Data Table: A structured grid view previewing rows and types.
 *   - Data Chart: A visualization block plotting preliminary insight distributions.
 *   - Data Clean: An anomaly-detection and data scrubbing pipeline.
 * 
 * Heavily utilizes Framer Motion to orchestrate staggered slide-in animations.
 * 
 * @returns {React.JSX.Element} The composed interactive dashboard for dataset cleaning and exploration.
 */
export default function DataExploreComponent() {
  const selectedTable = useDataStore((state) => state.selectedTable);
  const selectedSource = useDataStore((state) => state.getSelectedSourceDetails());
  const selectedTableDetails = useDataStore((state) => state.getSelectedTableDetails());
  const selectedSchema = useDataStore((state) => state.selectedSchema);
  const selectedSourceType = useDataStore((state) => state.selectedSourceType);

  const anomalies = selectedSource?.anomalies || [];

  const cleaningSteps = [
    { id: "cleanColumnNames", label: "Clean column names (remove special characters and spaces)" },
    { id: "convertObjectsToNumeric", label: "Convert text columns containing numeric data to numeric type" },
    { id: "replaceMinorityTypeInMixedColumns", label: "Replace minority data types in mixed-type columns with majority type" },
    { id: "dropHighNullColumns", label: "Drop columns with more than 60% null/missing values" },
    { id: "roundNumericColumns", label: "Round numeric columns to 2 decimal places" },
    { id: "removeDatetimeColumns", label: "Remove datetime columns (not suitable for numeric analysis)" },
    { id: "replaceNulls", label: "Replace all null values with mean/median/mode based on column type" },
  ];

  const effectiveSchema = selectedTableDetails?.schema || selectedSource?.schema || selectedSchema || "";
  const effectiveSourceType = selectedSource?.type;

  return (
    <motion.div className="space-y-6 p-4" initial="hidden" animate="visible" variants={containerVariants}>
      <motion.div variants={itemVariants}>
        <DataTableComponent
          selectedTable={selectedTable}
          selectedSource={selectedSource}
          tableDetails={selectedTableDetails}
          schema={effectiveSchema}
          sourceType={selectedSourceType ?? effectiveSourceType}
        />
      </motion.div>

      <motion.div className="flex flex-col lg:flex-row gap-6 w-full" variants={itemVariants}>
        <div className="w-full lg:w-2/3">
          <DataChartComponent selectedTable={selectedTable} selectedSource={selectedSource} />
        </div>

        <div className="w-full lg:w-1/3">
          <DataCleanComponent anomalies={anomalies} cleaningSteps={cleaningSteps} selectedSource={selectedSource || null} sourceType={selectedSourceType ?? effectiveSourceType} />
        </div>
      </motion.div>
    </motion.div>
  );
}
