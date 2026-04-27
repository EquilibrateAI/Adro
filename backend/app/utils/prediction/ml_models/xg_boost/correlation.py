import logging
from typing import List, Dict, Any

import duckdb
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from utils.model_assistants.model_helpers import sanitise_col_name

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Correlation"])


class CorrPayload(BaseModel):
    datasource_name: str
    columns: List[str]


@router.post("/correlation")
def get_correlation(request: CorrPayload) -> JSONResponse:
    """Compute correlation matrix for selected columns using DuckDB."""

    try:
        if len(request.columns) < 2:
            return JSONResponse(
                content={
                    "error": "At least 2 columns are required to compute correlation."
                },
                status_code=400,
            )

        duckdb_path = f"data/{request.datasource_name}.duckdb"
        con = duckdb.connect(duckdb_path)

        try:
            tables = con.execute("SHOW TABLES").fetchall()
            if not tables:
                raise ValueError("No tables found in DuckDB database.")

            table_name = tables[0][0]

            # Sanitize column names
            cols = [sanitise_col_name(col) for col in request.columns]
            cols_sql = ", ".join(f'"{col}"' for col in cols)

            # Check for constant columns
            for col in cols:
                query = f'SELECT COUNT(DISTINCT "{col}") FROM {table_name}'
                distinct_count = con.execute(query).fetchone()[0]

                if distinct_count <= 1:
                    logger.info(
                        "Constant column detected, cannot compute correlation: %s",
                        col,
                    )
                    return JSONResponse(
                        content={
                            "content": (
                                f"Column '{col}' is constant and cannot be correlated."
                            )
                        },
                        status_code=400,
                    )

            # Build correlation query
            corr_expr = ", ".join(
                [
                    f'ROUND(CORR(add_rn."{col}", unpivoted.v), 6) AS "{col}"'
                    for col in cols
                ]
            )

            query = f"""
                WITH base AS (
                    SELECT {cols_sql}
                    FROM {table_name}
                ),
                add_rn AS (
                    SELECT *, ROW_NUMBER() OVER () AS rn FROM base
                ),
                unpivoted AS (
                    UNPIVOT add_rn
                    ON {cols_sql}
                    INTO NAME k VALUE v
                )
                SELECT
                    k,
                    {corr_expr}
                FROM add_rn
                JOIN unpivoted USING (rn)
                GROUP BY 1
                ORDER BY 1
            """

            logger.info("Executing correlation query:\n%s", query)

            result_df = con.execute(query).fetchdf()

        finally:
            con.close()

        # Convert to nested dictionary
        correlation_matrix: Dict[str, Dict[str, Any]] = {}

        for _, row in result_df.iterrows():
            row_key = row["k"]
            correlation_matrix[row_key] = {
                col: (round(row[col], 6) if row[col] is not None else None)
                for col in cols
            }

        return JSONResponse(
            content={"correlation": correlation_matrix},
            status_code=200,
        )

    except Exception as exc:
        logger.exception("Error while computing correlation")
        return JSONResponse(
            content={"error": str(exc)},
            status_code=500,
        )
