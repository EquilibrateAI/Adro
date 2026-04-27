import math
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

router = APIRouter(tags=["Postgres Table"])


class PostgresTableRequest(BaseModel):
    action: str
    host: str
    port: int
    database: str
    username: str
    password: str
    schema_name: str
    table_name: Optional[str] = None
    page: Optional[int] = 1
    per_page: Optional[int] = 20
    offset: Optional[int] = 0
    limit: Optional[int] = 20
    search_term: Optional[str] = None
    query: Optional[List[Dict[str, Any]]] = None
    filters: Optional[List[Dict[str, Any]]] = None
    sort_column: Optional[str] = None
    sort_order: Optional[str] = "asc"


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
    s = str(value)
    s = s.replace("'", "''")
    return f"'{s}'"


def create_postgres_connection(
    host: str, port: int, database: str, username: str, password: str
):
    """Create and return a psycopg2 connection to a PostgreSQL database.

    Args:
        host: Database host address.
        port: Database port number.
        database: Database name.
        username: Login username.
        password: Login password.

    Returns:
        An open psycopg2 connection.

    Raises:
        HTTPException: If the connection attempt fails.
    """
    try:
        conn = psycopg2.connect(
            host=host, port=port, database=database, user=username, password=password
        )
        return conn
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to connect to PostgreSQL: {str(e)}"
        )


def execute_postgres_query(conn, query: str) -> List[Dict[str, Any]]:
    """Execute a SQL query and return results as a list of dicts.

    Args:
        conn: An open psycopg2 connection.
        query: The SQL query string to execute.

    Returns:
        A list of row dicts.

    Raises:
        HTTPException: If the query execution fails.
    """
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query)
        result = cursor.fetchall()
        cursor.close()
        return [dict(row) for row in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


def get_table_info(conn, schema_name: str, table_name: str) -> Dict[str, Any]:
    """Retrieve row count, column count, and column names for a table.

    Args:
        conn: An open psycopg2 connection.
        schema_name: The schema containing the table.
        table_name: The table to inspect.

    Returns:
        A dict with total_rows, total_columns, columns, table_name,
        and schema_name.

    Raises:
        HTTPException: If the info queries fail.
    """
    try:
        qualified_table = f'"{schema_name}"."{table_name}"'

        count_query = f"SELECT COUNT(*) as total_rows FROM {qualified_table}"
        cursor = conn.cursor()
        cursor.execute(count_query)
        total_rows = cursor.fetchone()[0]
        cursor.close()

        columns_query = f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = '{schema_name}'
            AND table_name = '{table_name}'
            ORDER BY ordinal_position
        """
        cursor = conn.cursor()
        cursor.execute(columns_query)
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()

        return {
            "total_rows": total_rows,
            "total_columns": len(columns),
            "columns": columns,
            "table_name": table_name,
            "schema_name": schema_name,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get table info: {str(e)}"
        )


@router.post("/postgres-table-operations")
async def postgres_table_operations(request: PostgresTableRequest):
    """Dispatch PostgreSQL table operations based on the action field.

    Supported actions: postgres-table-info, postgres-table-data,
    postgres-search, postgres-filter, postgres-sort,
    postgres-execute-query.

    Args:
        request: Request body with connection details and action params.

    Returns:
        JSONResponse with success status and relevant data or error.
    """
    conn = None
    try:
        conn = create_postgres_connection(
            request.host,
            request.port,
            request.database,
            request.username,
            request.password,
        )

        if not request.table_name:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "table_name is required"},
            )

        table_info = get_table_info(conn, request.schema_name, request.table_name)
        qualified_table = f'"{request.schema_name}"."{request.table_name}"'

        action = (request.action or "").strip().lower()

        if action == "postgres-table-info":
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Table info retrieved successfully",
                    "data": table_info,
                },
            )

        elif action == "postgres-table-data":
            offset = (request.page - 1) * request.per_page
            query = f"SELECT * FROM {qualified_table} LIMIT {request.per_page} OFFSET {offset}"

            records = execute_postgres_query(conn, query)
            total_pages = math.ceil(table_info["total_rows"] / request.per_page)

            pagination = {
                "current_page": request.page,
                "per_page": request.per_page,
                "total_rows": table_info["total_rows"],
                "total_pages": total_pages,
                "has_next": request.page < total_pages,
                "has_previous": request.page > 1,
            }

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

        elif action == "postgres-search":
            offset = (request.page - 1) * request.per_page

            search_term = request.search_term or ""
            safe_term = search_term.replace("'", "''")

            search_conditions = []
            for col in table_info["columns"]:
                search_conditions.append(
                    f"CAST(\"{col}\" AS TEXT) ILIKE '%{safe_term}%'"
                )

            where_clause = (
                " OR ".join(search_conditions) if search_conditions else "1=1"
            )
            query = f"SELECT * FROM {qualified_table} WHERE {where_clause} LIMIT {request.per_page} OFFSET {offset}"
            count_query = f"SELECT COUNT(*) FROM {qualified_table} WHERE {where_clause}"

            records = execute_postgres_query(conn, query)
            count_result = execute_postgres_query(conn, count_query)
            total_rows = count_result[0]["count"]

            total_pages = math.ceil(total_rows / request.per_page)

            pagination = {
                "current_page": request.page,
                "per_page": request.per_page,
                "total_rows": total_rows,
                "total_pages": total_pages,
                "has_next": request.page < total_pages,
                "has_previous": request.page > 1,
            }

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

        elif action == "postgres-filter":
            offset = (request.page - 1) * request.per_page

            incoming_filters = (
                request.filters
                if request.filters is not None
                else (request.query if isinstance(request.query, list) else [])
            )

            filter_conditions = []
            for filter_item in incoming_filters:
                column = filter_item.get("column")
                operator = (filter_item.get("operator") or "").lower()
                value = filter_item.get("value")

                if not column or column not in table_info["columns"]:
                    continue

                quoted_column = f'"{column}"'

                if operator == "in" and isinstance(value, list):
                    if len(value) > 0:
                        escaped_values = [_sql_literal(v) for v in value]
                        filter_conditions.append(
                            f"{quoted_column} IN ({', '.join(escaped_values)})"
                        )
                elif operator in {
                    "equals",
                    "not_equals",
                    "greater_than",
                    "greater_than_equal",
                    "less_than",
                    "less_than_equal",
                }:
                    op_map = {
                        "equals": "=",
                        "not_equals": "!=",
                        "greater_than": ">",
                        "greater_than_equal": ">=",
                        "less_than": "<",
                        "less_than_equal": "<=",
                    }
                    filter_conditions.append(
                        f"{quoted_column} {op_map[operator]} {_sql_literal(value)}"
                    )
                elif operator in {"between", "not_between"}:
                    if isinstance(value, str) and "-" in value:
                        min_val, max_val = [v.strip() for v in value.split("-", 1)]
                        between_clause = f"{quoted_column} BETWEEN {_sql_literal(min_val)} AND {_sql_literal(max_val)}"
                        if operator == "not_between":
                            between_clause = "NOT (" + between_clause + ")"
                        filter_conditions.append(between_clause)

            where_clause = (
                " AND ".join(filter_conditions) if filter_conditions else "1=1"
            )

            order_by_clause = ""
            if request.sort_column and request.sort_column in table_info["columns"]:
                order = (request.sort_order or "asc").upper()
                order_by_clause = f' ORDER BY "{request.sort_column}" {order}'

            query = f"SELECT * FROM {qualified_table} WHERE {where_clause}{order_by_clause} LIMIT {request.per_page} OFFSET {offset}"
            count_query = f"SELECT COUNT(*) FROM {qualified_table} WHERE {where_clause}"

            records = execute_postgres_query(conn, query)
            count_result = execute_postgres_query(conn, count_query)
            total_rows = count_result[0]["count"]

            total_pages = math.ceil(total_rows / request.per_page)

            pagination = {
                "current_page": request.page,
                "per_page": request.per_page,
                "total_rows": total_rows,
                "total_pages": total_pages,
                "has_next": request.page < total_pages,
                "has_previous": request.page > 1,
            }

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

        elif action == "postgres-sort":
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
            order_by_clause = f'ORDER BY "{request.sort_column}" {order}'
            query = f"SELECT * FROM {qualified_table} {order_by_clause} LIMIT {request.per_page} OFFSET {offset}"

            records = execute_postgres_query(conn, query)
            total_pages = math.ceil(table_info["total_rows"] / request.per_page)

            pagination = {
                "current_page": request.page,
                "per_page": request.per_page,
                "total_rows": table_info["total_rows"],
                "total_pages": total_pages,
                "has_next": request.page < total_pages,
                "has_previous": request.page > 1,
            }

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

        elif action == "postgres-execute-query":
            if not isinstance(request.query, str):
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "error": "query must be a SQL string for execute-query",
                    },
                )
            records = execute_postgres_query(conn, request.query)

            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Query executed successfully",
                    "data": {"records": records},
                },
            )

        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": f"Unknown action: {request.action}",
                },
            )

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )
    finally:
        if conn:
            conn.close()
