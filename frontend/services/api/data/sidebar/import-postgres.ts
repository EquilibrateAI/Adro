import { url } from "@/services/api/api-url";
import {
    ConnectionDetails,
    DatabaseType,
} from "@/services/api/data/sidebar/test-connection";

// Initiates the import process for a specific PostgreSQL table into the application
export const importPostgresTable = async (
    connectionDetails: ConnectionDetails,
    dbType: DatabaseType,
    schema: string,
    table: string
) => {

    try {
        const response = await fetch(`${url.backendUrl}/data/import-postgres`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...connectionDetails,
                dbType,
                schema,
                table,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to import table.");
        }

        return data;
    } catch (error) {
        if (error instanceof Error && error.message === "Failed to import table.") {
            throw error;
        }
        throw new Error("api failed");
    }
};
