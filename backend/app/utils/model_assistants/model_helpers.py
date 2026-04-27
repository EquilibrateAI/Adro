import logging
import json
import duckdb
import os
import re

logger = logging.getLogger(__name__)


def get_ignore_columns(file_name):
    with open("data/metadata.json", "r") as f:
        metadata = json.load(f)

    cols = metadata["sources"][file_name]["columns"]

    return [c["column_name"] for c in cols if c.get("unique", 0) > 20]


def get_column_metadata(file_name: str) -> dict:
    with open(os.path.join(os.getcwd(), "data", "metadata.json"), "r") as f:
        metadata = json.load(f)
    cols = metadata["sources"][file_name]["columns"]
    return {col["column_name"]: col for col in cols}


def read_cols(file_name: str):
    """
        connects to DuckDB file + extract column names
    -> helps LLM understand valid schema and fix typos
    """

    duckdb_path = f"data/{file_name}.duckdb"

    con = duckdb.connect(duckdb_path)

    tables = con.execute("SHOW TABLES").fetchall()  # get all tables

    if not tables:
        raise Exception("No tables found in DuckDB")

    table_name = tables[0][0]

    columns = con.execute(f"DESCRIBE {table_name}").fetchall()  # get cols

    column_names = [col[0] for col in columns]  # extract col names

    con.close()

    return column_names


def get_categorical_values(file_name: str, cols_meta: list) -> dict:
    """
    Returns a dict of { column_name: [all unique values] } for every
    String-typed column, sourced from DuckDB so nothing is missed.
    Falls back to top_5 keys from metadata if DuckDB is unavailable.
    """
    categorical_values = {}

    try:
        duckdb_path = f"data/{file_name}.duckdb"
        con = duckdb.connect(duckdb_path)
        table_name = con.execute("SHOW TABLES").fetchone()[0]

        for col in cols_meta:
            if col["type"] == "String":
                col_name = col["column_name"]
                rows = con.execute(
                    f'SELECT DISTINCT "{col_name}" FROM {table_name} '
                    f'WHERE "{col_name}" IS NOT NULL ORDER BY "{col_name}"'
                ).fetchall()
                categorical_values[col_name] = [r[0] for r in rows]

        con.close()

    except Exception:
        for col in cols_meta:
            if col["type"] == "String" and "top_5" in col:
                categorical_values[col["column_name"]] = list(col["top_5"].keys())

    return categorical_values


def sanitise_col_name(name: str) -> str:
    """Mirrors DuckDB's column name sanitisation on CSV import."""
    return re.sub(r"[^a-zA-Z0-9_]", "", name).strip()


def get_column_metadata_from_duckdb(file_name: str) -> dict:
    """
    Returns { col_name: { "type": "String"|"Number", "choices": [...], "min": ..., "max": ... } }
    by querying DuckDB directly — so we get ALL unique values and real min/max,
    not just top_5 from the metadata JSON.
    Falls back to an empty dict if DuckDB is unavailable.
    """
    metadata = {}
    try:
        duckdb_path = f"data/{file_name}.duckdb"
        con = duckdb.connect(duckdb_path)
        table_name = con.execute("SHOW TABLES").fetchone()[0]

        # Get column types from DuckDB schema
        schema = con.execute(f"DESCRIBE {table_name}").fetchall()

        for row in schema:
            col_name = row[0]
            col_type = row[1].upper()

            # VARCHAR / TEXT → categorical
            if any(t in col_type for t in ["VARCHAR", "TEXT", "CHAR"]):
                rows = con.execute(
                    f'SELECT DISTINCT "{col_name}" FROM {table_name} '
                    f'WHERE "{col_name}" IS NOT NULL ORDER BY "{col_name}"'
                ).fetchall()
                metadata[col_name] = {
                    "type": "String",
                    "choices": [r[0] for r in rows],
                }

            # Numeric types → get real min/max
            elif any(
                t in col_type
                for t in ["INT", "FLOAT", "DOUBLE", "DECIMAL", "BIGINT", "REAL"]
            ):
                row_stats = con.execute(
                    f'SELECT MIN("{col_name}"), MAX("{col_name}") FROM {table_name}'
                ).fetchone()
                metadata[col_name] = {
                    "type": "Number",
                    "min": float(row_stats[0]) if row_stats[0] is not None else 0.0,
                    "max": float(row_stats[1]) if row_stats[1] is not None else 1.0,
                }

        con.close()

    except Exception as e:
        logger.error(f"WARNING: Could not load metadata from DuckDB: {e}")

    return metadata
