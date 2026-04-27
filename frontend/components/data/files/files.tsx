"use client"

import UploadComponent from "./upload/upload"

import { Separator } from "@/components/ui/separator"
import { useSettingsStore } from "@/services/utils/settings/settings-store"
import { useDataStore } from "@/services/utils/data/sidebar/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, FolderHeart } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Orchestrates the display of both the local file upload and database connection sections.
 * Also monitors and extracts selected files from the global Settings context to surface
 * a comprehensive 'Selected Files Context' UI tracker card showing active CSV or SQL files 
 * queued up for analytical querying by the AI.
 * 
 * @returns {React.JSX.Element} The composed panel containing upload zones and active context list.
 */
export default function FilesComponent() {
  const settingsStore = useSettingsStore();
  const { dataSources } = useDataStore();
  const selectedFiles = settingsStore.selectedFiles || [];

  const removeFile = (fileId: string) => {
    const updated = selectedFiles.filter(f => f !== fileId);
    settingsStore.setSelectedFiles(updated);
  };

  const clearAllFiles = () => {
    settingsStore.setSelectedFiles([]);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      <div className="flex-1">
        <UploadComponent />
      </div>

      {/* 
      <div className="flex items-center justify-center px-4 py-6 lg:py-0">
        <div className="flex flex-col h-full justify-center w-full relative">
          <div className="lg:hidden relative">
            <Separator className="mb-6 mt-2" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 font-medium text-sm">
              OR
            </div>
          </div>
          
          <div className="hidden lg:block relative h-full">
            <Separator className="h-full w-[1px] bg-gray-200 mx-2" orientation="vertical" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 py-1 font-medium text-sm">
              OR
            </div>
          </div>
        </div>
      </div>
      */}

      <div className="flex items-center justify-center px-4 py-6 lg:py-0">
        <div className="hidden lg:block relative h-full">
          <Separator className="h-full w-[1px] bg-gray-200 mx-2" orientation="vertical" />
        </div>
      </div>

      <div className="flex-1">
        {/* <ConnectionComponent /> */}
        <Card className="shadow-sm border border-slate-200 h-full">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2">
              <FolderHeart className="w-5 h-5 text-indigo-600" />
              Selected Files Context
            </CardTitle>
            <CardDescription>
              Files currently selected for Analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {selectedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Database className="w-10 h-10 mb-3 text-slate-300" />
                <p className="text-sm">No files are currently selected in the AI Assistant.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-slate-700">Selected ({selectedFiles.length})</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-slate-500 hover:text-red-600"
                    onClick={clearAllFiles}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                  {selectedFiles.map(fileId => {
                    const ds = dataSources.find(d => d.id === fileId);
                    return (
                      <div key={fileId} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors group">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                          📄
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{ds?.name || fileId}</p>
                          {ds && <p className="text-xs text-slate-500">{ds.type.toUpperCase()}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => removeFile(fileId)}
                        >
                          Remove
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
