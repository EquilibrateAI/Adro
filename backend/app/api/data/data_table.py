import logging
import math
import os
from typing import Any

import duckdb
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["Data Table"])

logger = logging.getLogger(__name__)


class TableRequest(BaseModel):
    action: str
    data_source: str
    table_name: str | None = None
    page: int | None = 1
    per_page: int | None = 20
    offset: int | None = 0
    limit: int | None = 20
    search_term: str | None = None
    query: list[dict[str, Any]] | None = None
    # Also accept 'filters' from frontend for filter action
    filters: list[dict[str, Any]] | None = None
    sort_column: str | None = None
    sort_order: str | None = "asc"


def _sql_literal(value: Any) -> str:
    """Safely convert a Python value to a SQL literal string.

    Args:
        value: The value to convert.

    Returns:
        A SQL-safe string representation of the value.
    """
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    # Treat booleans as strings for simplicity
    s = str(value)
    s = s.replace("'", "''")
    return f"'{s}'"


def _build_pagination(
    page: int,
    per_page: int,
    total_rows: int,
) -> dict[str, Any]:
    """Build a standard pagination metadata dict.

    Args:
        page: Current page number.
        per_page: Number of records per page.
        total_rows: Total number of matching rows.

    Returns:
        dict: Pagination metadata with page info and navigation flags.
    """
    total_pages = math.ceil(total_rows / per_page) if per_page else 1
    return {
        "current_page": page,
        "per_page": per_page,
        "total_rows": total_rows,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }


def get_duckdb_path(data_source: str) -> str:
    """Resolve the filesystem path to a DuckDB file for a given data source.

    Args:
        data_source: The base name of the data source (without extension).

    Returns:
        Absolute path to the corresponding .duckdb file.
    """
    root_path = os.path.dirname(__file__)
    api_folder = os.path.dirname(root_path)
    app_path = os.path.dirname(api_folder)
    db_path = os.path.join(app_path, f"data/{data_source}.duckdb")
    logger.debug("Resolved DuckDB path: %s", db_path)
    return db_path


def get_table_name_from_duckdb(db_path: str) -> str:
    """Return the name of the first table found in a DuckDB database.

    Args:
        db_path: Filesystem path to the .duckdb file.

    Returns:
        The first table name found.

    Raises:
        HTTPException: If no tables exist or the query fails.
    """
    try:
        conn = duckdb.connect(db_path)
        tables_result = conn.execute("SHOW TABLES").fetchall()
        conn.close()

        if tables_result:
            return tables_result[0][0]

        raise Exception("No tables found in database")

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get table name: {str(e)}"
        )


def execute_duckdb_query(db_path: str, query: str) -> list[dict[str, Any]]:
    """Execute a SQL query against a DuckDB file and return row dicts.

    Args:
        db_path: Filesystem path to the .duckdb file.
        query: The SQL query string to execute.

    Returns:
        A list of row dicts keyed by column name.

    Raises:
        HTTPException: If the query execution fails.
    """
    try:
        conn = duckdb.connect(db_path)
        result = conn.execute(query).fetchall()
        columns = [desc[0] for desc in conn.description]
        conn.close()

        return [dict(zip(columns, row)) for row in result]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


def get_table_info(db_path: str) -> dict[str, Any]:
    """Retrieve row count, column count, and column names for a DuckDB table.

    Args:
        db_path: Filesystem path to the .duckdb file.

    Returns:
        A dict with total_rows, total_columns, columns, and table_name.

    Raises:
        HTTPException: If the info queries fail.
    """
    try:
        conn = duckdb.connect(db_path)
        table_name = get_table_name_from_duckdb(db_path)

        total_rows = conn.execute(
            f"SELECT COUNT(*) as total_rows FROM {table_name}"
        ).fetchone()[0]

        columns_result = conn.execute(f"DESCRIBE {table_name}").fetchall()
        columns = [row[0] for row in columns_result]
        conn.close()

        return {
            "total_rows": total_rows,
            "total_columns": len(columns),
            "columns": columns,
            "table_name": table_name,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get table info: {str(e)}"
        )


def _handle_table_info(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Return table metadata for the table-info action.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request.

    Returns:
        JSONResponse with table metadata.
    """
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Table info retrieved successfully",
            "data": table_info,
        },
    )


def _handle_table_data(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Fetch a paginated page of raw table rows.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request with page and per_page.

    Returns:
        JSONResponse with records, pagination, and column list.
    """
    table_name = table_info["table_name"]
    offset = (request.page - 1) * request.per_page
    query = f"SELECT * FROM {table_name}" f" LIMIT {request.per_page} OFFSET {offset}"

    records = execute_duckdb_query(db_path, query)
    pagination = _build_pagination(
        request.page, request.per_page, table_info["total_rows"]
    )

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Table data retrieved successfully",
            "data": {
                "records": records,
                "pagination": pagination,
                "columns": table_info["columns"],
            },
        },
    )


def _handle_search(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Search all columns for a term and return paginated results.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request with search_term and page.

    Returns:
        JSONResponse with matching records, pagination, and column list.
    """
    table_name = table_info["table_name"]
    offset = (request.page - 1) * request.per_page
    safe_term = (request.search_term or "").replace("'", "''")

    search_conditions = [
        f"CAST({col} AS VARCHAR) ILIKE '%{safe_term}%'" for col in table_info["columns"]
    ]
    where_clause = " OR ".join(search_conditions) if search_conditions else "1=1"

    query = (
        f"SELECT * FROM {table_name}"
        f" WHERE {where_clause}"
        f" LIMIT {request.per_page} OFFSET {offset}"
    )
    count_query = f"SELECT COUNT(*) FROM {table_name} WHERE {where_clause}"

    records = execute_duckdb_query(db_path, query)
    total_rows = execute_duckdb_query(db_path, count_query)[0]["count_star()"]
    pagination = _build_pagination(request.page, request.per_page, total_rows)

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Search completed successfully",
            "data": {
                "records": records,
                "pagination": pagination,
                "columns": table_info["columns"],
            },
        },
    )


def _handle_filter(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Apply column filters and optional sort to return paginated rows.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request with filters and sort fields.

    Returns:
        JSONResponse with filtered records, pagination, and column list.
    """
    table_name = table_info["table_name"]
    offset = (request.page - 1) * request.per_page

    # Accept both 'filters' and legacy 'query'
    incoming_filters = (
        request.filters
        if request.filters is not None
        else (request.query if isinstance(request.query, list) else [])
    )

    op_map = {
        "equals": "=",
        "not_equals": "!=",
        "greater_than": ">",
        "greater_than_equal": ">=",
        "less_than": "<",
        "less_than_equal": "<=",
    }

    filter_conditions = []
    for filter_item in incoming_filters:
        column = filter_item.get("column")
        operator = (filter_item.get("operator") or "").lower()
        value = filter_item.get("value")

        if not column or column not in table_info["columns"]:
            continue

        if operator == "in" and isinstance(value, list) and value:
            escaped_values = [_sql_literal(v) for v in value]
            filter_conditions.append(f"{column} IN ({', '.join(escaped_values)})")
        elif operator in op_map:
            filter_conditions.append(
                f"{column} {op_map[operator]} {_sql_literal(value)}"
            )
        elif operator in {"between", "not_between"}:
            if isinstance(value, str) and "-" in value:
                min_val, max_val = [v.strip() for v in value.split("-", 1)]
                between_clause = (
                    f"{column} BETWEEN"
                    f" {_sql_literal(min_val)} AND {_sql_literal(max_val)}"
                )
                if operator == "not_between":
                    between_clause = f"NOT ({between_clause})"
                filter_conditions.append(between_clause)

    where_clause = " AND ".join(filter_conditions) if filter_conditions else "1=1"

    order_by_clause = ""
    if request.sort_column and request.sort_column in table_info["columns"]:
        order = (request.sort_order or "asc").upper()
        order_by_clause = f" ORDER BY {request.sort_column} {order}"

    query = (
        f"SELECT * FROM {table_name}"
        f" WHERE {where_clause}{order_by_clause}"
        f" LIMIT {request.per_page} OFFSET {offset}"
    )
    count_query = f"SELECT COUNT(*) FROM {table_name} WHERE {where_clause}"

    records = execute_duckdb_query(db_path, query)
    total_rows = execute_duckdb_query(db_path, count_query)[0]["count_star()"]
    pagination = _build_pagination(request.page, request.per_page, total_rows)

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Filter applied successfully",
            "data": {
                "records": records,
                "pagination": pagination,
                "columns": table_info["columns"],
            },
        },
    )


def _handle_sort(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Sort table rows by a column and return a paginated result.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request with sort_column and sort_order.

    Returns:
        JSONResponse with sorted records, pagination, and column list.
    """
    table_name = table_info["table_name"]
    offset = (request.page - 1) * request.per_page

    if not request.sort_column:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "sort_column is required for sort action",
            },
        )

    if request.sort_column not in table_info["columns"]:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Invalid sort_column: {request.sort_column}",
            },
        )

    order = (request.sort_order or "asc").upper()
    query = (
        f"SELECT * FROM {table_name}"
        f" ORDER BY {request.sort_column} {order}"
        f" LIMIT {request.per_page} OFFSET {offset}"
    )

    records = execute_duckdb_query(db_path, query)
    pagination = _build_pagination(
        request.page, request.per_page, table_info["total_rows"]
    )

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Data sorted successfully",
            "data": {
                "records": records,
                "pagination": pagination,
                "columns": table_info["columns"],
            },
        },
    )


def _handle_execute_query(
    db_path: str,
    table_info: dict[str, Any],
    request: TableRequest,
) -> JSONResponse:
    """Execute a raw SQL query with a table name placeholder substitution.

    Args:
        db_path: Filesystem path to the .duckdb file.
        table_info: Pre-fetched table info dict.
        request: The original table request with a SQL query string.

    Returns:
        JSONResponse with query result records.
    """
    # For safety, only allow simple table placeholder replacement
    if not isinstance(request.query, str):
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "query must be a SQL string for execute-query",
            },
        )

    actual_table_name = table_info["table_name"]
    query_with_table = request.query.replace(
        request.table_name or "table", actual_table_name
    )
    records = execute_duckdb_query(db_path, query_with_table)

    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": "Query executed successfully",
            "data": {"records": records},
        },
    )


_ACTION_HANDLERS = {
    "table-info": _handle_table_info,
    "table-data": _handle_table_data,
    "search": _handle_search,
    "filter": _handle_filter,
    "sort": _handle_sort,
    "execute-query": _handle_execute_query,
}


@router.post("/table-operations")
async def table_operations(request: TableRequest) -> JSONResponse:
    """Dispatch DuckDB table operations based on the action field.

    Supported actions: table-info, table-data, search, filter,
    sort, execute-query.

    Args:
        request: Request body with data_source, action, and
                 action-specific parameters.

    Returns:
        JSONResponse with success status and relevant data or error.
    """
    try:
        db_path = get_duckdb_path(request.data_source)

        db_file_name = os.path.basename(db_path).replace(" ", "_")
        db_path = os.path.join(os.path.dirname(db_path), db_file_name)

        logger.info("Resolved db_path: %s", db_path)

        if not os.path.exists(db_path):
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": (
                        f"Database file not found for"
                        f" data source: {request.data_source}"
                    ),
                },
            )

        table_info = get_table_info(db_path)
        action = (request.action or "").strip().lower()
        handler = _ACTION_HANDLERS.get(action)

        if handler is None:
            logger.warning("Unknown action requested: %s", action)
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Unknown action: {request.action}",
                },
            )

        logger.info("Dispatching table action: %s", action)
        return handler(db_path, table_info, request)

    except Exception as e:
        logger.error("table_operations failed: %s", str(e))
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )
