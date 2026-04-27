import json
import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Data Sources"])

ROOT_PATH = os.path.dirname(__file__)
API_FOLDER = os.path.dirname(ROOT_PATH)
APP_PATH = os.path.dirname(API_FOLDER)
METADATA_PATH = os.path.join(APP_PATH, "app/data/metadata.json")


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


def csv_metadata_to_datasource_entry(name: str, meta: dict) -> dict:
    """Convert a raw metadata dict into a frontend-ready datasource entry.

    Args:
        name: The data source name (used as display name and ID base).
        meta: The raw metadata dict for this source.

    Returns:
        A dict with id, name, type, icon, createdAt, size, fileInfo,
        and anomalies fields.
    """
    return {
        "id": name.replace(" ", "-"),
        "name": name,
        "type": "csv",
        "icon": "📊",
        "createdAt": meta.get("date_of_creation", ""),
        "size": f'{meta.get("size_mb", 0):.1f} MB',
        "fileInfo": {
            "rows": meta.get("no_of_rows", 0),
            "columns": meta.get("no_of_columns", 0),
        },
        "anomalies": meta.get("anomalies", []),
    }


@router.get("/datasources-metadata")
async def get_datasources_with_metadata() -> JSONResponse:
    """Return frontend-ready metadata for all CSV data sources.

    Reads the metadata store and filters to sources of type 'csv',
    converting each to a structured datasource entry.

    Returns:
        JSONResponse with status 200 and a list of datasource entries
        under the 'dataSources' key.
    """
    metadata = _load_metadata()

    csv_sources = [
        csv_metadata_to_datasource_entry(source_name, source_meta)
        for source_name, source_meta in metadata.get("sources", {}).items()
        if source_meta.get("type") == "csv"
    ]

    return JSONResponse(status_code=200, content={"dataSources": csv_sources})
