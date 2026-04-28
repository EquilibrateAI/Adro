import json
import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["Column Information"])

ROOT_PATH = os.path.dirname(__file__)
API_FOLDER = os.path.dirname(ROOT_PATH)
APP_PATH = os.path.dirname(API_FOLDER)
METADATA_PATH = os.path.join(APP_PATH, "app/data/metadata.json")

logger = logging.getLogger(__name__)


def _load_metadata() -> dict:
    """Load and return the metadata store from disk.

    Returns:
        dict: Parsed metadata dict, or a default empty sources dict
              if the file does not exist or is empty.
    """
    if not os.path.exists(METADATA_PATH) or os.path.getsize(METADATA_PATH) == 0:
        return {"sources": {}}

    with open(METADATA_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


class ColumnNamesRequest(BaseModel):
    data_source: str


class DatasourceColumnInfo(BaseModel):
    data_source: str


@router.post("/column-info")
async def get_column_info(request: ColumnNamesRequest) -> JSONResponse:
    """Return column metadata for a given data source.

    Args:
        request: Request body containing the data source name.

    Returns:
        JSONResponse with status 200 and a list of column metadata,
        or status 404 if the data source is not found.
    """
    metadata = _load_metadata()
    data_source = request.data_source.split(".")[0]

    if data_source not in metadata["sources"]:
        logger.warning("Data source not found: %s", data_source)
        raise HTTPException(status_code=404, detail="Data source not found")

    columns = metadata["sources"][data_source].get("columns", [])

    return JSONResponse(content={"columns": columns}, status_code=200)


@router.post("/data-charts-column-info")
async def get_datasource_column_info(data: DatasourceColumnInfo) -> JSONResponse:
    """Return column name and type pairs for a given data source.

    Args:
        data: Request body containing the data source name.

    Returns:
        JSONResponse with status 200 and a list of column/type dicts.
        Returns an empty list if the data source is not found.
    """
    metadata = _load_metadata()

    column_info = []

    for source_name in metadata.get("sources", {}):
        if data.data_source == source_name:
            for col in metadata["sources"][source_name].get("columns", []):
                column_info.append(
                    {
                        "column": col.get("column_name"),
                        "type": col.get("type"),
                    }
                )

    return JSONResponse(status_code=200, content={"columns": column_info})
