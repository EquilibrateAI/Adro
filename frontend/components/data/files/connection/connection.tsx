"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Database, CheckCircle, Loader2 } from "lucide-react";
import { useConnectionStore } from "@/services/utils/data/sidebar/connection-status-store";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  testConnection,
  ConnectionDetails,
  DatabaseType,
} from "@/services/api/data/sidebar/test-connection";
import { importPostgresTable } from "@/services/api/data/sidebar/import-postgres";
import { saveConnectionDetails } from "@/services/api/data/sidebar/save-connection-details";

// A form-based component for establishing and testing live database connections
export default function ConnectionPage() {
  const { setConnection } = useConnectionStore();
  const [dbType, setDbType] = useState<DatabaseType>("postgresql");
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails>({
    host: "",
    port: "",
    database: "",
    username: "",
    password: "",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const [testSuccess, setTestSuccess] = useState(false);
  const [schemas, setSchemas] = useState<Record<string, string[]>>({});
  const [connectionOption, setConnectionOption] = useState<"connect" | "import">("connect");
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [isPostImport, setIsPostImport] = useState(false);

  useEffect(() => {
    const { host, database, username } = connectionDetails;
    const isValid = !!dbType && !!host && !!database && !!username;
    setIsFormValid(isValid);
  }, [dbType, connectionDetails]);

// Updates the target database engine and sets appropriate default connection ports
  const handleDbTypeChange = (value: DatabaseType) => {
    setDbType(value);
    const defaultPorts: Record<string, string> = {
      postgresql: "5432",
      mysql: "3306",
      mssql: "1433",
      mariadb: "3306",
      oracle: "1521",
    };
    setConnectionDetails((prev) => ({
      ...prev,
      port: defaultPorts[value] || "",
    }));
  };

// Keeps the connection details state in sync with various user input fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConnectionDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

// Validates credentials and attempts to ping the remote database server
  const handleTestConnection = async () => {
    if (!isFormValid) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsConnecting(true);

    try {
      const data = await testConnection(connectionDetails, dbType);
      toast.success(data.message);
      setSchemas(data.schemas || {});
      setTestSuccess(true);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(
        err.message || "Could not connect to the server. Is it running?"
      );
    } finally {
      setIsConnecting(false);
    }
  };

// Persists the validated connection details and makes the source active for use
  const handleConnect = async () => {
    const dbName = connectionDetails.database;
    toast.success(`Successfully established a live connection to ${dbName}. Redirecting...`);
    const connectionData = {
      ...connectionDetails,
      dbName,
      dbType,
      status: "active" as "active" | "inactive",
    };
    setConnection(connectionData);

    try {
      await saveConnectionDetails({
        host: connectionDetails.host,
        port: connectionDetails.port,
        database: connectionDetails.database,
        username: connectionDetails.username,
        password: connectionDetails.password,
        dbType,
      });
    } catch (e) {
      console.error("Error saving connection details:", e);
    }

    setIsPostImport(true);
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  };

// Triggers a one-time copy of a remote database table into local storage
  const handleImportTable = async () => {
    if (!selectedSchema || !selectedTable) {
      toast.error("Please select a schema and a table to import.");
      return;
    }
    setIsImporting(true);
    try {
      const data = await importPostgresTable(
        connectionDetails,
        dbType,
        selectedSchema,
        selectedTable
      );
      toast.success(data.message + ". Redirecting...");
      setIsPostImport(true);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || "Could not reach the server. Is it running?");
      setIsImporting(false);
    }
  };

// Clears all input fields and resets the connection testing state
  const resetForm = () => {
    setTestSuccess(false);
    setSchemas({});
    setSelectedSchema("");
    setSelectedTable("");
    setConnectionOption("connect");
    setConnectionDetails({
      host: "",
      port: "",
      database: "",
      username: "",
      password: "",
    });
  };

// Renders the summary and final configuration options after a successful connection test
  const renderConnectionOptions = () => (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-5 h-5" />
        <h3 className="font-semibold">Connection Successful</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Choose how you want to use this data source.
      </p>

      <RadioGroup
        value={connectionOption}
        onValueChange={(value: "connect" | "import") => setConnectionOption(value)}
        className="space-y-2"
        disabled={isPostImport}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="connect" id="connect" />
          <Label htmlFor="connect">Establish a live connection</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="import" id="import" />
          <Label htmlFor="import">Import a copy of a table locally</Label>
        </div>
      </RadioGroup>

      {connectionOption === "import" && (
        <div className="space-y-4 pl-6 border-l-2 border-gray-200 ml-2">
          <p className="text-sm text-muted-foreground">
            Select a table to import as a new local data source.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schema-select">Schema</Label>
              <Select
                value={selectedSchema}
                onValueChange={(value) => {
                  setSelectedSchema(value);
                  setSelectedTable(""); // Reset table on schema change
                }}
                disabled={isPostImport}
              >
                <SelectTrigger id="schema-select">
                  <SelectValue placeholder="Select a schema" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(schemas).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-select">Table</Label>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={!selectedSchema || !schemas[selectedSchema] || isPostImport}
              >
                <SelectTrigger id="table-select">
                  <SelectValue placeholder="Select a table" />
                </SelectTrigger>
                <SelectContent>
                  {selectedSchema &&
                    schemas[selectedSchema]?.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={resetForm} className="flex-1" disabled={isPostImport}>
          Cancel
        </Button>
        {connectionOption === "connect" ? (
          <Button onClick={handleConnect} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={isPostImport}>
            Connect
          </Button>
        ) : (
          <Button
            onClick={handleImportTable}
            disabled={isImporting || !selectedTable || isPostImport}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import Table"
            )}
          </Button>
        )}
      </div>
    </div>
  );

// Renders the main entry form for database host and authentication details
  const renderConnectionForm = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="db-type">Database Type</Label>
        <Select value={dbType} onValueChange={handleDbTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select database type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mysql">🐬 MySQL</SelectItem>
            <SelectItem value="postgresql">🐘 PostgreSQL</SelectItem>
            <SelectItem value="mssql">🗄️ Microsoft SQL Server</SelectItem>
            <SelectItem value="mariadb">🗃️ MariaDB</SelectItem>
            <SelectItem value="oracle">🏦 Oracle Database</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              name="host"
              placeholder="localhost"
              value={connectionDetails.host}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              name="port"
              placeholder="5432"
              value={connectionDetails.port}
              onChange={handleInputChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="database">Database Name</Label>
          <Input
            id="database"
            name="database"
            placeholder="my_database"
            value={connectionDetails.database}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="admin"
            value={connectionDetails.username}
            onChange={handleInputChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={connectionDetails.password}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={isConnecting || !isFormValid}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Connection"
          )}
        </Button>
      </div>
    </>
  );

  return (
    <div>
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Connect Database
          </CardTitle>
          <CardDescription>
            Connect to a database as a data source
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {testSuccess ? renderConnectionOptions() : renderConnectionForm()}
        </CardContent>
      </Card>
    </div>
  );
}
