"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, TableIcon, Plus, Info, Trash2 } from "lucide-react"
import { useDataStore } from "@/services/utils/data/sidebar/data-context"
import { toast } from "sonner"
import { deleteFile } from "@/services/api/data/files/delete-file"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import FilesComponent from "@/components/data/files/files"
import { fetchConnectionDetails } from "@/services/api/data/sidebar/connection-details"
import { fetchPostgresTableInfo } from "@/services/api/data/sidebar/postgres-table-info"
// import { useRouter } from "next/navigation";

const DATA_SOURCE_CONFIG = {
  mysql: { emoji: "🐬" },
  postgresql: { emoji: "🐘" },
  mongodb: { emoji: "🍃" },
  sqlite: { emoji: "📁" },
  csv: { emoji: "📊" },
  excel: { emoji: "📈" },
  json: { emoji: "📋" },
  default: { emoji: "❓" }
}

const STATUS_CONFIG = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  inactive: { bg: "bg-gray-100", text: "text-gray-700", label: "Inactive" },
  error: { bg: "bg-red-100", text: "text-red-700", label: "Error" }
}

// A sidebar navigation component for managing and selecting different data sources and tables
export function DataSidebar() {
  // const router = useRouter();
  const {
    dataSources,
    selectedDataSource,
    setSelectedDataSource,
    selectedTable,
    setSelectedTable,
    setSelectedSchema,
    loadDataSources,
  } = useDataStore()

  // Load data sources when sidebar mounts
   
  useEffect(() => {
    loadDataSources()
  }, [loadDataSources])


  const [expandedSources, setExpandedSources] = useState<string[]>([])
  const [expandedSchemas, setExpandedSchemas] = useState<string[]>([])
  const [selectedTablesMap, setSelectedTablesMap] = useState<Record<string, string>>({})
  const [tableStatsLoading, setTableStatsLoading] = useState(false)
  const [tableStats, setTableStats] = useState<{ type?: string; connectionUrl?: string; database?: string; schema?: string; table?: string; dbSizeBytes?: number | null; rowCount?: number | null } | null>(null)

  // File Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (selectedDataSource && !expandedSources.includes(selectedDataSource)) {
      setExpandedSources((prev) => [...prev, selectedDataSource])
    }
  }, [selectedDataSource, expandedSources])

// Updates store states when a top-level data source (like a file or DB) is picked
  const handleDataSourceSelect = (sourceId: string) => {
    setSelectedDataSource(sourceId)
    const source = dataSources.find((ds) => ds.id === sourceId)

    if (!source) return

    // Clear any Postgres table stats when switching to a file-based source
    if (isFileBasedSource(source.type)) {
      setTableStats(null)
    }

    if (source.tables && source.tables.length > 0) {
      const defaultTable = selectedTablesMap[sourceId] || source.tables[0]?.name || ""
      setSelectedTable(defaultTable)
    } else {
      setSelectedTable("")
    }
  }

// Fetches and updates state when a specific table within a data source is selected
  const handleTableSelect = async (sourceId: string, tableName: string, schemaName?: string) => {
    setSelectedDataSource(sourceId)
    setSelectedTable(tableName)
    if (schemaName) {
      setSelectedSchema(schemaName)
    }
    setSelectedTablesMap((prev) => ({
      ...prev,
      [sourceId]: tableName,
    }))

    setTableStats(null)
    setTableStatsLoading(true)
    try {
      const [dbType, database] = sourceId.split("-")
      const conn = backendConnections.find((c) => c.dbType === dbType && c.database === database)
      if (conn && conn.status === 'active') {
        const resp = await fetchPostgresTableInfo({
          dbType: conn.dbType,
          database: conn.database,
          schema: schemaName || '',
          table: tableName,
        })
        if (resp.success && resp.data) {
          setTableStats(resp.data)
        }
      }
    } catch (e) {
      console.error("Failed fetching table info:", e)
    } finally {
      setTableStatsLoading(false)
    }
  }

  useEffect(() => {
    // When selectedDataSource changes, if it is not a backend connection or is file-based, clear table stats
    const ds = dataSources.find((d) => d.id === selectedDataSource)
    if (ds && isFileBasedSource(ds.type)) {
      setTableStats(null)
      setTableStatsLoading(false)
    }
  }, [selectedDataSource, dataSources])

// Manages the expanded/collapsed state of data source folders in the sidebar
  const toggleDataSource = (sourceId: string) => {
    setExpandedSources((prev) =>
      prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId]
    )
  }

// Manages the expanded/collapsed state of database schemas in the sidebar
  const toggleSchema = (schemaName: string) => {
    setExpandedSchemas((prev) =>
      prev.includes(schemaName)
        ? prev.filter((name) => name !== schemaName)
        : [...prev, schemaName]
    )
  }

// Triggers the confirmation modal when a user attempts to remove a data file
  const handleDeleteFile = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation()
    setFileToDelete(fileName)
    setShowDeleteModal(true)
  }

// Executes the API call to permanently remove a file and refreshes the source list
  const handleConfirmDelete = async () => {
  if (!fileToDelete) return;

  setIsDeleting(true);

  try {
    await deleteFile(fileToDelete);

    toast.success("File deleted successfully");

    // Clear selected datasource + table
    setSelectedDataSource("");
    setSelectedTable("");
    setSelectedSchema("");

    // Refresh sidebar datasource list
    loadDataSources();

    // Refresh entire page state (important step)
    window.location.reload();

    // Close modal
    setShowDeleteModal(false);
    setFileToDelete(null);

  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Failed to delete file"
    );
  } finally {
    setIsDeleting(false);
  }
};

// Closes the delete confirmation modal without taking any action
  const handleCancelDelete = () => {
    if (isDeleting) return
    setShowDeleteModal(false)
    setFileToDelete(null)
  }

// Returns a styled UI badge based on the connection status of a source
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    if (!config) return null
    return <Badge className={`${config.bg} ${config.text} text-xs h-4`}>{config.label}</Badge>
  }

// Helps distinguish between traditional database connections and standalone files
  const isFileBasedSource = (type: string) => {
    return ["csv", "excel", "json", "sqlite"].includes(type.toLowerCase())
  }

  const selectedSource = dataSources.find((ds) => ds.id === selectedDataSource)

// Retrieves icon and label configuration based on the data source's technology type
  const getDataSourceConfig = (type: string) => {
    return DATA_SOURCE_CONFIG[type.toLowerCase() as keyof typeof DATA_SOURCE_CONFIG] || DATA_SOURCE_CONFIG.default
  }

  interface BackendConnection {
    dbType: string;
    database: string;
    status: string;
    schemas?: Record<string, string[]>;
    [key: string]: unknown;
  }
  const [backendConnections, setBackendConnections] = useState<BackendConnection[]>([])

  useEffect(() => {
    (async () => {
      try {
        const connections = await fetchConnectionDetails()
        setBackendConnections(connections)
      } catch (e) {
        console.error("Failed to fetch backend connections", e)
      }
    })()
  }, [])

  return (
    <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-80 bg-white flex flex-col shadow-md border-r border-gray-200 z-50">
      <div className="p-4 border-b border-gray-100">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="w-full h-8 text-sm"
              variant="default"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[1600px] overflow-y-auto w-[95vw]">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle>Add Data Sources</DialogTitle>
            </DialogHeader>
            <FilesComponent />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {backendConnections.map((connection) => {
              const config = getDataSourceConfig(connection.dbType)
              const hasSchemas = connection.status === 'active' && connection.schemas && Object.keys(connection.schemas).length > 0
              const uniqueId = `${connection.dbType}-${connection.database}`

                return (
                  <div key={uniqueId} className="space-y-1">
                    <Collapsible
                      open={expandedSources.includes(uniqueId)}
                      onOpenChange={() => toggleDataSource(uniqueId)}
                    >
                      <CollapsibleTrigger asChild>
                        <div
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedDataSource === uniqueId
                              ? "bg-blue-50 border-blue-200"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                          onClick={() => { setSelectedDataSource(uniqueId); setTableStats(null); }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-lg">{config.emoji}</span>
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900 truncate max-w-[180px]">
                                  {connection.database}
                                </span>
                                <Badge variant="outline" className="text-xs h-4">
                                  {connection.dbType.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${connection.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-xs h-4`}>
                                  {connection.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {hasSchemas && (
                            <ChevronDown
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                expandedSources.includes(uniqueId) ? "rotate-180" : "" 
                              }`}
                            />
                          )}
                        </div>
                      </CollapsibleTrigger>

                      {hasSchemas && (
                        <CollapsibleContent className="ml-4 mt-1 space-y-1">
                          {Object.entries(connection.schemas || {}).map(([schemaName, tables]) => (
                            <Collapsible
                              key={`${uniqueId}-${schemaName}`}
                              open={expandedSchemas.includes(schemaName)}
                              onOpenChange={() => toggleSchema(schemaName)}
                            >
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-100" onClick={() => { setSelectedSchema(schemaName) }}>
                                <span className="text-sm font-semibold">{schemaName}</span>
                                <ChevronDown
                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                    expandedSchemas.includes(schemaName) ? "rotate-180" : ""
                                  }`}
                                />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="ml-4 mt-1 space-y-1">
                                {(tables as string[]).map((tableName) => (
                                  <div
                                    key={`${schemaName}.${tableName}`}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                      selectedTable === tableName && selectedDataSource === uniqueId
                                        ? "bg-green-50 border-green-200 border"
                                        : "bg-white hover:bg-gray-50 border border-gray-100"
                                    }`}
                                    onClick={() => handleTableSelect(uniqueId, tableName, schemaName)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <TableIcon className="h-3 w-3 text-gray-500" />
                                      <span className="text-sm font-medium text-gray-700">
                                        {tableName}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          ))}
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </div>
                )
              })}
            {dataSources.map((source) => {
              const hasTables = source.tables && source.tables.length > 0
              const config = getDataSourceConfig(source.type)
              
              return (
                <div key={source.id} className="space-y-1">
                  <Collapsible
                    open={expandedSources.includes(source.id)}
                    onOpenChange={() => toggleDataSource(source.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDataSource === source.id
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => { handleDataSourceSelect(source.id) }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-lg">{config.emoji}</span>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900 truncate max-w-[180px]">
                                {source.name}
                              </span>
                              <Badge variant="outline" className="text-xs h-4">
                                {source.type.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(source.status)}
                              <span className="text-xs text-gray-500">{source.lastUpdated}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDeleteFile(e, source.name)}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                            title="Delete File"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {hasTables && (
                            <ChevronDown 
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                expandedSources.includes(source.id) ? "rotate-180" : ""
                              }`} 
                            />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    {hasTables && (
                      <CollapsibleContent className="ml-4 space-y-1">
                        {source.tables!.map((table) => (
                          <div
                            key={table.name}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedTable === table.name && selectedDataSource === source.id
                                ? "bg-green-50 border-green-200 border"
                                : "bg-white hover:bg-gray-50 border border-gray-100"
                            }`}
                            onClick={() => handleTableSelect(source.id, table.name)}
                          >
                            <div className="flex items-center gap-2">
                              <TableIcon className="h-3 w-3 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">{table.name}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {table.rows.toLocaleString()} • {table.columns}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-gray-600" />
          <h4 className="font-medium text-sm text-gray-900">Source Details</h4>
        </div>
        <div className="space-y-2">
          {tableStatsLoading && (
            <div className="text-xs text-gray-600">Fetching statistics...</div>
          )}

          {!tableStatsLoading && tableStats && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Type:</span>
                <Badge variant="secondary" className="h-5">{tableStats.type?.toUpperCase() || "POSTGRESQL"}</Badge>
              </div>
              {/* connectionUrl intentionally not rendered */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Database:</span>
                <span className="font-medium text-xs text-gray-900">{tableStats.database}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Schema:</span>
                <span className="font-medium text-xs text-gray-900">{tableStats.schema}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Table:</span>
                <span className="font-medium text-xs text-gray-900">{tableStats.table}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Database Size:</span>
                <span className="font-medium text-xs text-gray-900">{tableStats.dbSizeBytes ? `${(tableStats.dbSizeBytes / (1024*1024)).toFixed(2)} MB` : 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Row Count:</span>
                <span className="font-medium text-xs text-gray-900">{tableStats.rowCount ?? 'N/A'}</span>
              </div>
            </>
          )}

          {!tableStatsLoading && !tableStats && selectedSource && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Type:</span>
                <Badge variant="secondary" className="h-5">{selectedSource.type.toUpperCase()}</Badge>
              </div>
              {!isFileBasedSource(selectedSource.type) && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Status:</span>
                  {getStatusBadge(selectedSource.status)}
                </div>
              )}
              {selectedSource.tables && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Tables:</span>
                    <Badge variant="secondary" className="h-5">{selectedSource.tables.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total Rows:</span>
                    <span className="font-medium text-xs text-gray-900">{selectedSource.tables.reduce((sum, table) => sum + table.rows, 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total Columns:</span>
                    <span className="font-medium text-xs text-gray-900">{selectedSource.tables.reduce((sum, table) => sum + table.columns, 0)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Size:</span>
                <span className="font-medium text-xs text-gray-900">{selectedSource.size || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Created:</span>
                <span className="font-medium text-xs text-gray-900">{selectedSource.createdAt}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteModal && fileToDelete && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={handleCancelDelete}
          />
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl z-[61] p-6 border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                Delete File
              </h3>
            </div>

            <p className="text-slate-600 mb-2">
              Are you sure you want to delete this file?
            </p>
            <div className="bg-slate-50 rounded-lg p-3 mb-6">
               <p className="text-sm font-medium text-slate-700 truncate">
                &ldquo;{fileToDelete}&rdquo;
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-70 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
