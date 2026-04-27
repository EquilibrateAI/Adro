"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useDataStore } from "@/services/utils/data/sidebar/data-context";


import { uploadFile, type UploadErr, type UploadOk } from "@/services/api/data/files/upload/file-upload";
import { FileInfo } from "@/services/utils/data/files/upload/file-handlers";
import { useSettingsStore } from "@/services/utils/settings/settings-store";

const ACCEPTED_EXTENSIONS = ["csv", "duckdb", "sqlite"];
const ACCEPT_ATTR = ".csv,.duckdb,.sqlite";
const MAX_SIZE_MB = 200;

type UploadVars = { file: File; metadata: string };

// A drag-and-drop file upload component that supports CSV, DuckDB, and SQLite formats
export default function FileUploadComponent() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [metadata, setMetadata] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setSelectedFiles: updateStoredFiles } = useSettingsStore();
  const { loadDataSources } = useDataStore();



  const uploadMutation = useMutation<UploadOk, UploadErr, UploadVars>({
    mutationFn: async ({ file, metadata }) => uploadFile(file, metadata),
    onSuccess: (data, vars) => {
      toast.success(`File ${vars.file.name} uploaded successfully!`, {
        description: `Status: ${data.status}, Message: ${data.message}`,
      });

      // Refresh data sources after upload succeeds
      const timer = setTimeout(() => {
        loadDataSources();
      }, 500);
      return () => clearTimeout(timer);
    },
    onError: (error, vars) => {
      toast.error(`Failed to upload ${vars.file.name}`, {
        description: error.message || "An error occurred during upload",
      });
    },
  });

  // Sync selected files with the store for display in Selected Files Context panel
  useEffect(() => {
    const fileIds = selectedFiles.map(fileInfo => fileInfo.file.name);
    updateStoredFiles(fileIds);
  }, [selectedFiles, updateStoredFiles]);

// Processes incoming files, validates extensions and size limits, and parses basic metadata
  const handleFiles = async (files: FileList) => {
    const filteredFiles = Array.from(files).filter((file) => {
      const ext = file.name.toLowerCase().split(".").pop() || "";

      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error("Invalid File Type 🚫", {
          description: "Only CSV, DuckDB, and SQLite files are allowed",
        });
        return false;
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.warning("File Too Large 📦", {
          description: `${file.name} exceeds the ${MAX_SIZE_MB}MB size limit`,
        });
        return false;
      }

      return true;
    });

    if (filteredFiles.length === 0) return;

    const newFileInfos: FileInfo[] = [];

    for (const file of filteredFiles) {
      const fileInfo: FileInfo = { file };

      if (file.name.toLowerCase().endsWith(".csv")) {
        try {
          const text = await file.text();
          const lines = text.split("\n").filter((line) => line.trim());
          if (lines.length > 0) {
            const columns = lines[0].split(",").length;
            const rows = Math.max(0, lines.length - 1);
            fileInfo.rows = rows;
            fileInfo.columns = columns;
          }
        } catch (err) {
          console.error("Error parsing CSV:", err);
        }
      }

      newFileInfos.push(fileInfo);
    }

    setSelectedFiles((prev) => [...prev, ...newFileInfos]);
    toast("Files Added 📑", { description: `Added ${newFileInfos.length} file(s) to upload queue` });
  };

// Manages the visual state of the drop zone when a file is hovered over it
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

// Intercepts the dropped files and passes them along for processing
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

// Handles file selection when the user chooses items via the standard file browser dialog
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
  };

// Deletes a specific file from the upload queue before the process starts
  // const removeFile = (index: number) => {
  //   setSelectedFiles((files) => files.filter((_, i) => i !== index));
  // };

// Programmatically triggers the hidden file input when the drop zone is clicked
  const handleAreaClick = () => fileInputRef.current?.click();

  const isUploading = uploadMutation.isPending;

// Orchestrates the multi-file upload process and transmits metadata to the server
  const startUpload = async () => {
    if (selectedFiles.length === 0) return;

    const trimmed = metadata.trim();
    let metadataToSend = "";

    // If metadata is provided, try to wrap it in a JSON object if it's not already JSON
    if (trimmed.length > 0) {
      try {
        // Try to parse as JSON - if it works, use it as-is
        JSON.parse(trimmed);
        metadataToSend = trimmed;
      } catch {
        // If not valid JSON, wrap the plain text in a JSON object with a "notes" field
        metadataToSend = JSON.stringify({ notes: trimmed });
      }
    } else {
      // If no metadata, send empty JSON object
      metadataToSend = "{}";
    }

    toast("Upload Started ⏳", { description: `Uploading ${selectedFiles.length} files` });

    for (const fileInfo of selectedFiles) {
      try {
        await uploadMutation.mutateAsync({ file: fileInfo.file, metadata: metadataToSend });
      } catch (error) {
        console.error(`Error uploading ${fileInfo.file.name}:`, error);
        // Continue with next file or stop? For now continuing seem safer if one fails
      }
    }

    setSelectedFiles([]);
    setMetadata("");
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Upload File
          </CardTitle>
          <CardDescription>
            Upload CSV files to create a data source
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50 cursor-pointer"
                : "border-gray-300 hover:bg-gray-50 cursor-pointer"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleAreaClick}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className="w-10 h-10 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Drag and drop CSV files here, or click this area to select files
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports CSV files up to {MAX_SIZE_MB}MB
                </p>
              </div>
            </div>

            <Input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              accept={ACCEPT_ATTR}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metadata">Metadata (Optional)</Label>
            <textarea
              id="metadata"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder='Add any notes or information about this upload. You can use plain text (e.g., "Sales data from Q1 2024") or JSON format (e.g., {"source":"sales","tags":["q1"]})'
              className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Optional. Add any text or notes to store alongside the upload. Plain text will be automatically formatted for storage.
            </p>
          </div>

          <Button
            onClick={startUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload {selectedFiles.length > 0 ? `${selectedFiles.length} Files` : "Files"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
