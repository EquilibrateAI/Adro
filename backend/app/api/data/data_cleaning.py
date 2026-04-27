import logging
import os
import re
import traceback

import duckdb
import polars as pl
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from utils.process_data.data_cleaning.clean import clean_dataframe
from utils.process_data.meta_anamoly.metadata import create_metadata_for_file

router = APIRouter(tags=["Data Cleaning"])

ROOT_PATH = os.path.dirname(__file__)
API_FOLDER = os.path.dirname(ROOT_PATH)
APP_PATH = os.path.dirname(API_FOLDER)
METADATA_PATH = os.path.join(APP_PATH, "data/metadata.json")

logger = logging.getLogger(__name__)


class CleanDataRequest(BaseModel):
    file_name: str
    cleaning_steps: dict


def _clean_table_name(name: str) -> str:
    """Sanitise a table name for safe use as a DuckDB identifier.

    Args:
        name: Raw table name string.

    Returns:
        An alphanumeric-and-underscore-only identifier.
    """
    return re.sub(r"[^A-Za-z0-9_]", "_", name)


@router.post("/clean-data")
async def clean_data(request: CleanDataRequest) -> JSONResponse:
    """Apply cleaning steps to a CSV file and persist the result.

    Reads the target CSV, applies the requested cleaning steps,
    overwrites the CSV, rebuilds the corresponding DuckDB table,
    and regenerates metadata.

    Args:
        request: Request body with file_name and cleaning_steps.

    Returns:
        JSONResponse with a 201 status on success.

    Raises:
        HTTPException: With status 404 if the file does not exist,
                       or 500 on any processing failure.
    """
    try:
        logger.info("Received clean-data request: %s", request.model_dump())

        file_name = request.file_name.replace(" ", "_")
        file_path = os.path.join(APP_PATH, f"data/{file_name}.csv")

        if not os.path.exists(file_path):
            logger.warning("File not found: %s", file_path)
            return JSONResponse(
                status_code=404,
                content={"error": f"File {request.file_name}.csv not found"},
            )

        df = pl.read_csv(file_path, ignore_errors=True)
        logger.info("Original df shape: %s", df.shape)

        cleaned_df = clean_dataframe(df, request.cleaning_steps)
        logger.info("Cleaned df shape: %s", cleaned_df.shape)

        cleaned_df.write_csv(file_path)

        duckdb_path = file_path.replace(".csv", ".duckdb")
        logger.info("DuckDB path: %s", duckdb_path)

        table_name = _clean_table_name(request.file_name)

        conn = duckdb.connect(duckdb_path)
        conn.register("cleaned_df", cleaned_df)
        conn.execute(
            f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM cleaned_df"
        )

        updated_shape = conn.execute(f"SELECT * FROM {table_name} LIMIT 5").df().shape
        logger.info("Updated DuckDB table shape: %s", updated_shape)

        conn.close()

        create_metadata_for_file(file_path, request.file_name, request.cleaning_steps)

        return JSONResponse(
            status_code=201,
            content={
                "message": f"File {request.file_name} cleaned successfully.",
            },
        )

    except Exception as e:
        logger.error("Error during data cleaning: %s", str(e))
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": f"Data cleaning failed: {str(e)}"},
        )
