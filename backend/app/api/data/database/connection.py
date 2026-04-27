from fastapi import HTTPException, APIRouter
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from pydantic import BaseModel
import os
import json

router = APIRouter(tags=["Connections"])


class ConnectionDetails(BaseModel):
    host: str
    port: str
    database: str
    username: str
    password: str
    dbType: str


DB_DRIVERS = {
    "postgresql": {"driver": "psycopg2", "port": 5432},
    "mysql": {"driver": "mysqlconnector", "port": 3306},
    "mssql": {"driver": "pyodbc", "port": 1433},
    "mariadb": {"driver": "mysqlconnector", "port": 3306},
    "oracle": {"driver": "cx_oracle", "port": 1521},
}


def get_db_url(details: ConnectionDetails):
    """Build and return a SQLAlchemy connection URL for the given details.

    Args:
        details: Connection parameters including host, port, credentials,
                 and database type.

    Returns:
        A SQLAlchemy-compatible database URL string.

    Raises:
        HTTPException: If the database type is not supported.
    """
    if details.dbType not in DB_DRIVERS:
        raise HTTPException(
            status_code=400,
            detail=f"Database type '{details.dbType}' is not supported.",
        )

    driver_info = DB_DRIVERS[details.dbType]
    driver = driver_info["driver"]
    port = details.port or driver_info["port"]
    password = f":{details.password}" if details.password else ""
    host = details.host or "127.0.0.1"

    if details.dbType == "oracle":
        dsn = f"{host}:{port}/{details.database}"
        return f"oracle+{driver}://{details.username}{password}@{dsn}"

    return f"{details.dbType}+{driver}://{details.username}{password}@{host}:{port}/{details.database}"


def ensure_data_folder():
    if not os.path.exists("data"):
        os.makedirs("data")


root_path = os.path.dirname(__file__)
data_folder = os.path.dirname(root_path)
api_folder = os.path.dirname(data_folder)
app_path = os.path.dirname(api_folder)
connection_details_path = os.path.join(app_path, "data/connection_details.json")


@router.post("/test-connection")
def test_database_connection(details: ConnectionDetails):
    """Test a database connection and return its schema structure.

    Args:
        details: Connection parameters.

    Returns:
        dict: Success message and schema structure on success.

    Raises:
        HTTPException: On connection or query failure.
    """
    try:
        db_url = get_db_url(details)
        engine = create_engine(db_url)
        schemas = {}
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

            query = None
            if details.dbType == "postgresql":
                query = text(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY table_schema, table_name;
                """
                )
            elif details.dbType == "mysql":
                query = text(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                    ORDER BY table_schema, table_name;
                """
                )

            if query is not None:
                result = connection.execute(query)
                for schema, table in result:
                    if schema not in schemas:
                        schemas[schema] = []
                    schemas[schema].append(table)

        return {"message": "Connection successful.", "schemas": schemas}
    except HTTPException as e:
        raise e
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e.orig))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect")
def connect_database(details: ConnectionDetails):
    """Connect to a database and log its schema structure.

    Args:
        details: Connection parameters.

    Returns:
        dict: Success message on connection.

    Raises:
        HTTPException: On connection or query failure.
    """
    try:
        db_url = get_db_url(details)
        engine = create_engine(db_url)
        with engine.connect() as connection:
            query = None
            if details.dbType == "postgresql":
                query = text(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                    ORDER BY table_schema, table_name;
                """
                )
            elif details.dbType == "mysql":
                query = text(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                    ORDER BY table_schema, table_name;
                """
                )

            if query is not None:
                result = connection.execute(query)
                print("\n--- Database Structure ---")
                for schema, table in result:
                    print(f"Schema: {schema}, Table: {table}")
                print("------------------------\n")

        return {"message": "Connection successful."}
    except HTTPException as e:
        raise e
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e.orig))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connections/save")
def save_connection_details(details: ConnectionDetails):
    """Save connection details to the JSON store, deduplicating by identity.

    Args:
        details: Connection parameters to persist.

    Returns:
        dict: Confirmation message.

    Raises:
        HTTPException: On file I/O failure.
    """
    try:
        os.makedirs(os.path.dirname(connection_details_path), exist_ok=True)
        existing = []
        if os.path.exists(connection_details_path):
            try:
                with open(connection_details_path, "r") as f:
                    existing = json.load(f) or []
            except Exception:
                existing = []
        record = {
            "host": details.host,
            "port": details.port,
            "database": details.database,
            "username": details.username,
            "password": details.password,
            "dbType": details.dbType,
            "status": "unknown",
        }
        dedup_key = f"{details.dbType}:{details.host}:{details.port}:{details.database}"
        filtered = [
            r
            for r in existing
            if f"{r.get('dbType')}:{r.get('host')}:{r.get('port')}:{r.get('database')}"
            != dedup_key
        ]
        filtered.append(record)

        with open(connection_details_path, "w") as f:
            json.dump(filtered, f)
        return {"message": "Connection details saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connections")
def list_connections():
    """List all saved connections and probe each for active status and schemas.

    Returns:
        dict: A list of connection records with status and schema info.

    Raises:
        HTTPException: On file I/O or unexpected failure.
    """
    try:
        print("Reading connections from:", connection_details_path)
        if not os.path.exists(connection_details_path):
            return {"connections": []}
        with open(connection_details_path, "r") as f:
            try:
                connections = json.load(f) or []
            except Exception:
                connections = []
        results = []
        for conn in connections:
            status = "inactive"
            schemas = {}
            try:
                test_details = ConnectionDetails(
                    host=conn.get("host"),
                    port=str(conn.get("port")),
                    database=conn.get("database"),
                    username=conn.get("username"),
                    password=conn.get("password"),
                    dbType=conn.get("dbType"),
                )
                db_url = get_db_url(test_details)
                engine = create_engine(db_url)
                with engine.connect() as connection:
                    connection.execute(text("SELECT 1"))
                    query = None
                    if test_details.dbType == "postgresql":
                        query = text(
                            """
                            SELECT table_schema, table_name
                            FROM information_schema.tables
                            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
                            ORDER BY table_schema, table_name;
                        """
                        )
                    elif test_details.dbType == "mysql":
                        query = text(
                            """
                            SELECT table_schema, table_name
                            FROM information_schema.tables
                            WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                            ORDER BY table_schema, table_name;
                        """
                        )
                    if query is not None:
                        result = connection.execute(query)
                        for schema, table in result:
                            if schema not in schemas:
                                schemas[schema] = []
                            schemas[schema].append(table)
                status = "active"
            except Exception:
                status = "inactive"
            results.append(
                {
                    "dbType": conn.get("dbType"),
                    "host": conn.get("host"),
                    "port": conn.get("port"),
                    "database": conn.get("database"),
                    "status": status,
                    "name": conn.get("database"),
                    "schemas": schemas,
                }
            )
        return {"connections": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
