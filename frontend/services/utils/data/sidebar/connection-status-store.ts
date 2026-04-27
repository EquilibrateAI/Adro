import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type DatabaseType =
  | "mysql"
  | "postgresql"
  | "mssql"
  | "mariadb"
  | "oracle"
  | "";

/**
 * Credentials required to establish a remote or local database connection.
 */
export interface ConnectionDetails {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

/**
 * Represents a saved database connection instance, extending the base credentials.
 * Includes connection health and structured schema maps.
 */
export interface Connection extends ConnectionDetails {
  dbName: string;
  status: "active" | "inactive";
  dbType: DatabaseType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schemas?: any;
  lastUpdated?: number;
}

/**
 * Zustand global store for managing database connection states and synced schemas.
 */
interface ConnectionStore {
  connections: Connection[];
  lastUpdated: number;
  setConnection: (connection: Connection) => void;
  addSchemasToConnection: (
    dbName: string,
    dbType: string,
    data: { db_name: string; schemas: Record<string, string[]> }
  ) => void;
  removeConnection: (dbName: string, dbType: string) => void;
}

export const useConnectionStore = create(
  persist<ConnectionStore>(
    (set) => ({
      connections: [],
      lastUpdated: Date.now(),
      
      /**
       * Adds a new database connection or updates an existing one if it shares the same dbName and dbType.
       * 
       * @param {Connection} connection - The full connection and credential object.
       */
      setConnection: (connection) =>
        set((state) => {
          const existingConnectionIndex = state.connections.findIndex(
            (c) =>
              c.dbName === connection.dbName && c.dbType === connection.dbType
          );

          if (existingConnectionIndex !== -1) {
            const updatedConnections = [...state.connections];
            updatedConnections[existingConnectionIndex] = connection;
            return {
              connections: updatedConnections,
              lastUpdated: Date.now(),
            };
          } else {
            return {
              connections: [...state.connections, connection],
              lastUpdated: Date.now(),
            };
          }
        }),
        
      /**
       * Associates structured local schema information (tables and columns) with an existing connection.
       * 
       * @param {string} dbName - The unique nickname/name of the DB
       * @param {string} dbType - The specific SQL flavor (postgres, mysql, etc)
       * @param {Object} data - Contains the dictionary tree of schemas to append
       */
      addSchemasToConnection: (dbName, dbType, data) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.dbName === dbName && conn.dbType === dbType
              ? { ...conn, schemas: data.schemas }
              : conn
          ),
          lastUpdated: Date.now(),
        })),
        
      /**
       * Removes an active or saved database connection from persistent storage.
       * 
       * @param {string} dbName - Target DB name
       * @param {string} dbType - Target DB type
       */
      removeConnection: (dbName, dbType) =>
        set((state) => ({
          connections: state.connections.filter(
            (conn) => !(conn.dbName === dbName && conn.dbType === dbType)
          ),
          lastUpdated: Date.now(),
        })),
    }),
    {
      name: "connection-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
