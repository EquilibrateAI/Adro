import { create } from "zustand";
import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import { toast } from "sonner";

export type DataSourceType =
  | "mysql"
  | "postgresql"
  | "mongodb"
  | "sqlite"
  | "csv"
  | "excel"
  | "json";

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastUpdated: string;
  createdAt: string;
  size: string;
  schema?: string;
  tables?: {
    name: string;
    rows: number;
    columns: number;
    lastModified: string;
    schema?: string;
  }[];
  fileInfo?: {
    rows: number;
    columns: number;
  };
  anomalies?: string[];
}

interface DataState {
  selectedDataSource: string;
  setSelectedDataSource: (id: string) => void;
  selectedTable: string;
  setSelectedTable: (name: string) => void;
  selectedSchema: string;
  setSelectedSchema: (schema: string) => void;
  selectedSourceType?: DataSourceType;
  getSelectedSourceDetails: () => DataSource | undefined;
  getSelectedTableDetails: () =>
    | { name: string; rows: number; columns: number; lastModified: string; schema?: string }
    | undefined;
  dataSources: DataSource[];
  loadDataSources: () => Promise<void>;
  updateDataSource: (id: string, data: Partial<DataSource>) => void;
  setDataSourceType: (id: string, type: DataSourceType) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  selectedDataSource: "",
  selectedTable: "",
  selectedSchema: "",
  selectedSourceType: undefined,
  dataSources: [],

  // Sets the active data source and automatically detects its type
  setSelectedDataSource: (id) => {
    const src = get().dataSources.find((ds) => ds.id === id)
    if (src) {
      set({ selectedDataSource: id, selectedSourceType: src.type })
      return
    }
    const maybeType = id.split("-")[0] as DataSourceType
    set({ selectedDataSource: id, selectedSourceType: maybeType })
  },
  // Updates the currently selected table name in the active data source
  setSelectedTable: (name) => set({ selectedTable: name }),
  // Updates the currently selected database schema
  setSelectedSchema: (schema) => set({ selectedSchema: schema }),

  // Asynchronously fetches all available data sources and initializes the selection
  loadDataSources: async () => {
    try {
      const dataSources = await fetchDataSources();
      set({
        dataSources,
        selectedDataSource: dataSources[0]?.id ?? "",
        selectedTable: dataSources[0]?.tables?.[0]?.name ?? "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[ERROR] Failed to load data sources:", errorMessage);
      toast.error("Failed to load data sources", {
        description: errorMessage || "Check backend logs for details",
      });
    }
  },

  // Updates specific properties of a data source without replacing the entire object
  updateDataSource: (id, data) => {
    if (data.type) {
    }
    set((state) => ({
      dataSources: state.dataSources.map((ds) => (ds.id === id ? { ...ds, ...data } : ds)),
    }));
  },

  setDataSourceType: (id, type) =>
    set((state) => ({
      dataSources: state.dataSources.map((ds) => (ds.id === id ? { ...ds, type } : ds)),
    })),

  // Helper method to get the full metadata object for the currently selected source
  getSelectedSourceDetails: () => {
    const { dataSources, selectedDataSource } = get();
    return dataSources.find((source) => source.id === selectedDataSource);
  },

  // Helper method to retrieve details for the specifically selected table
  getSelectedTableDetails: () => {
    const source = get().getSelectedSourceDetails();
    return source?.tables?.find((table) => table.name === get().selectedTable);
  },
}));
