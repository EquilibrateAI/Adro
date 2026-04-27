import { url } from "@/services/api/api-url";
export type DatabaseType =
  | "mysql"
  | "postgresql"
  | "mssql"
  | "mariadb"
  | "oracle"
  | "";

export interface ConnectionDetails {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

// Validates database connection credentials by attempting a test handshake with the server
export const testConnection = async (
  connectionDetails: ConnectionDetails,
  dbType: DatabaseType
) => {
  try {
    const response = await fetch(`${url.backendUrl}/data/test-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...connectionDetails, dbType }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          "Could not connect to database. Please check your credentials."
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Could not connect to database")) {
        throw error;
    }
    throw new Error("api failed");
  }
};
