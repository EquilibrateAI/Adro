"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Brush, CheckCircle2, Database, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cleanData } from "@/services/api/data/data-explore/data-clean/data-clean";

import { toast } from "sonner";
import { Label } from "@/components/ui/label";

type CleaningSteps = {
  cleanColumnNames: boolean;
  convertObjectsToNumeric: boolean;
  replaceMinorityTypeInMixedColumns: boolean;
  dropHighNullColumns: boolean;
  roundNumericColumns: boolean;
  removeDatetimeColumns: boolean;
  replaceNulls: boolean;
};

interface DataSource {
  name: string;
  id?: string;
  type?: string;
}

interface CleaningStep {
  id: string;
  label: string;
}

type DataCleanComponentProps = {
  anomalies: string[];
  cleaningSteps: CleaningStep[];
  selectedSource: DataSource | null;
};

// A component that identifies data anomalies and provides a set of automated cleaning operations
export default function DataCleanComponent({ anomalies, cleaningSteps, selectedSource, sourceType }: DataCleanComponentProps & { sourceType?: string }) {
  const [selectedSteps, setSelectedSteps] = useState<CleaningSteps>({
    cleanColumnNames: true,
    convertObjectsToNumeric: true,
    replaceMinorityTypeInMixedColumns: true,
    dropHighNullColumns: true,
    roundNumericColumns: true,
    removeDatetimeColumns: true,
    replaceNulls: true,
  });

// Toggles the inclusion of specific cleaning steps in the upcoming processing job
  const handleStepChange = (stepId: keyof CleaningSteps) => {
    setSelectedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

// Triggers the background data cleaning process and refreshes the view upon completion
  const handleCleanData = async () => {
    if (!selectedSource?.name) {
      toast.error("No data source selected");
      return;
    }

    const selectedOperations = Object.entries(selectedSteps)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key);

    try {
      const result = await cleanData(selectedSource.name, selectedSteps);

      if (result.status === 201) {
        toast.success("Data cleaned successfully", {
          description: `Applied ${selectedOperations.length} cleaning operations`,
        });

        location.reload();
      } else {
        toast.error("Data cleaning failed", {
          description: "Please try again",
        });
      }
    } catch (error) {
      console.error("Data cleaning error:", error);
      toast.error("Data cleaning failed", {
        description: "An error occurred during cleaning",
      });
    }
  };

  const hasDataSource = selectedSource && selectedSource.name;
  const hasAnomalies = anomalies.length > 0;

  const isPostgres = (sourceType || selectedSource?.type || '').toLowerCase() === 'postgresql';

  const isNoDataSource = !hasDataSource;
  const isDataSourceWithNoIssues = hasDataSource && !hasAnomalies;

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Data Anomalies
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPostgres ? (
          <>
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Anomalies Found</AlertTitle>
              <AlertDescription>
                Anomalies found in the table, please clean your table for cleaner functionalities
              </AlertDescription>
            </Alert>
            <div className="text-sm text-gray-600">No permission to write data.</div>
          </>
        ) : isNoDataSource ? (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <Upload className="h-4 w-4 text-amber-600" />
            <AlertTitle>Select/Upload a Data Source</AlertTitle>
            <AlertDescription>
              Please select/upload a data source to proceed
            </AlertDescription>
          </Alert>
        ) : isDataSourceWithNoIssues ? (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>No Data Issues Found</AlertTitle>
            <AlertDescription>
              Your dataset appears clean. You can proceed with analysis or transformations without any cleaning steps.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive" className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Quality Issues Found</AlertTitle>
            <AlertDescription>
              Several data quality issues were detected in your dataset that may affect analysis results.
            </AlertDescription>
          </Alert>
        )}

        {hasAnomalies && !isPostgres && (
          <ScrollArea className="h-[180px] pr-4">
            <ul className="space-y-2">
              {anomalies.map((anomaly, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{anomaly}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}

        {!isPostgres && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="w-full flex items-center gap-2 bg-yellow-300 hover:bg-yellow-400" 
                variant="secondary"
                disabled={!hasDataSource || !hasAnomalies}
              >
                <Brush className="h-4 w-4" />
                Clean Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Confirm Data Cleaning
                </AlertDialogTitle>
                <AlertDialogDescription className="pt-2">
                  The following cleaning operations will be applied to your dataset:
                </AlertDialogDescription>
              </AlertDialogHeader>

              <ScrollArea className="max-h-[300px] pr-4 mt-2">
                <div className="space-y-3">
                  {cleaningSteps.map((step) => (
                    <div key={step.id} className="flex items-start space-x-2 pt-1">
                      <Checkbox
                        id={step.id}
                        checked={selectedSteps[step.id as keyof CleaningSteps]}
                        onCheckedChange={() => handleStepChange(step.id as keyof CleaningSteps)}
                      />
                      <Label
                        htmlFor={step.id}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pt-0.5"
                      >
                        {step.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Alert variant="destructive" className="mt-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning: Data Modification</AlertTitle>
                <AlertDescription>
                  <p>This action will modify your dataset. Do you want to proceed?</p>
                  <ul className="list-inside list-disc text-sm mt-2">
                    <li>Changes cannot be undone</li>
                    <li>A backup copy will be created</li>
                    <li>Original source data remains unchanged</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <AlertDialogFooter className="pt-4">
                <AlertDialogCancel className="mt-2 sm:mt-0">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCleanData}
                  disabled={!Object.values(selectedSteps).some(Boolean)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Proceed with Cleaning
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}