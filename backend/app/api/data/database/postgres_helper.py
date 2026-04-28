from fastapi import APIRouter, HTTPException, Body
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import logging
from .connection import get_db_url, ConnectionDetails
import os
import pandas as pd
from utils.process_data.meta_anamoly.metadata import create_metadata_for_file
from utils.process_data.data_ingestion.create_files import (
    ensure_data_folder,
    file_exists_in_data,
    process_csv_to_duckdb,
    save_dataframe_to_csv,
)
import polars as pl
from pydantic import BaseModel

logger = logging.getLogger(__name__)
import json

router = APIRouter(tags=["Postgres Helper"])


class ImportDetails(ConnectionDetails):
    schema: str
    table: str


class TableInfoRequest(BaseModel):
    dbType: str
    database: str
    schema: str
    table: str


root_path = os.path.dirname(__file__)
data_folder = os.path.dirname(root_path)
api_folder = os.path.dirname(data_folder)
app_path = os.path.dirname(api_folder)
connection_details_path = os.path.join(app_path, "data/connection_details.json")


def get_schemas_and_tables(db_url: str, details: ConnectionDetails):
    """Fetch schema and table names for a given database connection.

    Args:
        db_url: SQLAlchemy-compatible connection URL.
        details: Connection parameters including database type.

    Returns:
        A dict mapping schema names to lists of table names.

    Raises:
        HTTPException: On database or unexpected errors.
    """
    try:
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
            elif details.dbType in ["mysql", "mariadb"]:
                query = text(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_schema NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
                    ORDER BY table_schema, table_name;
                """
                )

            if query is None:
                return {}

            result = connection.execute(query)

            schemas = {}
            for schema_name, table_name in result:
                if schema_name not in schemas:
                    schemas[schema_name] = []
                schemas[schema_name].append(table_name)

            return schemas
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.orig}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("/postgres/schemas")
async def get_postgres_schemas(details: ConnectionDetails = Body(...)):
    """Return all schemas and tables for the given database connection.

    Args:
        details: Connection parameters.

    Returns:
        dict: Database name and schema/table mapping.

    Raises:
        HTTPException: On connection or query failure.
    """
    try:
        logger.debug("Database details: %s", details)
        db_url = get_db_url(details)
        schemas = get_schemas_and_tables(db_url, details)
        logger.debug("Schemas: %s", schemas)
        return {"db_name": details.database, "schemas": schemas}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {str(e)}"
        )


@router.post("/import-postgres")
async def import_postgres_table(details: ImportDetails):
    """Import a PostgreSQL table as a CSV and DuckDB file.

    Args:
        details: Connection parameters plus schema and table name.

    Returns:
        dict: Success message with filenames on completion.

    Raises:
        HTTPException: If the file already exists or on import failure.
    """
    try:
        db_url = get_db_url(details)

        base_filename = f"{details.schema}_{details.table}".replace(" ", "_")
        logger.debug("Import filename: %s", base_filename)
        csv_filename = f"{base_filename}.csv"

        ensure_data_folder()

        if file_exists_in_data(csv_filename):
            raise HTTPException(
                status_code=400,
                detail=f"File for table {details.schema}.{details.table} already exists.",
            )

        engine = create_engine(db_url)
        with engine.connect() as connection:
            df_pandas = pd.read_sql_table(
                details.table, connection, schema=details.schema
            )
            df_polars = pl.from_pandas(df_pandas)

        csv_filepath = save_dataframe_to_csv(df_polars, csv_filename)

        duckdb_path = process_csv_to_duckdb(csv_filepath)

        table_name = base_filename
        create_metadata_for_file(csv_filepath, table_name, None)

        duckdb_filename = os.path.basename(duckdb_path)
        return {
            "message": f"Successfully imported {details.schema}.{details.table} and saved as {csv_filename} and {duckdb_filename}"
        }

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.orig}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/postgres/table-info")
async def get_postgres_table_info(req: TableInfoRequest):
    """Return metadata for a specific table including size and row count.

    Credentials are resolved from the saved connections file.
    The connection URL is intentionally excluded from the response
    to avoid exposing credentials to the frontend.

    Args:
        req: Request containing dbType, database, schema, and table.

    Returns:
        dict: Success flag and table metadata.

    Raises:
        HTTPException: If credentials are missing or queries fail.
    """
    try:
        creds = None
        if os.path.exists(connection_details_path):
            with open(connection_details_path, "r") as f:
                try:
                    rows = json.load(f) or []
                    for r in rows:
                        if (
                            r.get("dbType") == req.dbType
                            and r.get("database") == req.database
                        ):
                            creds = r
                            break
                except Exception:
                    creds = None
        if not creds:
            raise HTTPException(
                status_code=404, detail="Credentials not found for database"
            )
        details = ConnectionDetails(
            host=str(creds.get("host", "")),
            port=str(creds.get("port", "")),
            database=req.database,
            username=str(creds.get("username", "")),
            password=str(creds.get("password", "")),
            dbType=req.dbType,
        )
        db_url = get_db_url(details)
        engine = create_engine(db_url)
        info = {
            "type": req.dbType,
            "database": req.database,
            "schema": req.schema,
            "table": req.table,
            "dbSizeBytes": None,
            "rowCount": None,
        }
        with engine.connect() as connection:
            try:
                size_query = text("SELECT pg_database_size(:dbname) AS size")
                size_res = connection.execute(
                    size_query, {"dbname": req.database}
                ).fetchone()
                info["dbSizeBytes"] = (
                    int(size_res[0]) if size_res and size_res[0] is not None else None
                )
            except Exception:
                info["dbSizeBytes"] = None
            try:
                count_query = text(f'SELECT COUNT(*) FROM "{req.schema}"."{req.table}"')
                count_res = connection.execute(count_query).fetchone()
                info["rowCount"] = (
                    int(count_res[0])
                    if count_res and count_res[0] is not None
                    else None
                )
            except Exception:
                info["rowCount"] = None
        return {"success": True, "data": info}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e.orig))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
