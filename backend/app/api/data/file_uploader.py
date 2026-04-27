import json
import os

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from utils.process_data.data_ingestion.create_files import (
    ensure_data_folder,
    file_exists_in_data,
    process_csv_to_duckdb,
    save_uploaded_file,
)
from utils.process_data.meta_anamoly.metadata import create_metadata_for_file

router = APIRouter(tags=["File Upload"])

_DATA_FOLDER = "data"
_METADATA_JSON_PATH = os.path.join(_DATA_FOLDER, "metadata.json")
_ALLOWED_EXTENSIONS = (".csv", ".duckdb", ".sqlite")


@router.post("/file_upload")
async def upload_csv_file(
    metadata: str = Form(...), file: UploadFile = File(...)
) -> JSONResponse:
    """Upload a CSV, DuckDB, or SQLite file and persist associated metadata.

    For CSV uploads, the file is also converted to a DuckDB database
    and file-level metadata is generated. A sidecar metadata text file
    is written alongside the data file for all upload types.

    Args:
        metadata: Form field containing metadata as a string.
        file: The uploaded file object.

    Returns:
        JSONResponse with status 201 on success.

    Raises:
        HTTPException: With status 400 if the file type is not allowed
                       or the file already exists.
    """
    if not file.filename.endswith(_ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail="Only CSV, DuckDB, or SQLite files are allowed",
        )

    ensure_data_folder()

    if file_exists_in_data(file.filename):
        raise HTTPException(
            status_code=400,
            detail=(
                f"File {file.filename} already exists. "
                "Please choose a different one."
            ),
        )

    file_path = save_uploaded_file(file, file.filename)

    if file.filename.endswith(".csv"):
        process_csv_to_duckdb(file_path)
        create_metadata_for_file(file_path, file.filename.split(".")[0], None)

    base_name = file.filename.split(".")[0]
    metadata_path = os.path.join(
        os.path.dirname(file_path), f"{base_name}_metadata.txt"
    )
    with open(metadata_path, "w", encoding="utf-8") as text_file:
        text_file.write(metadata)

    return JSONResponse(
        status_code=201,
        content={"message": f"File {file.filename} saved successfully."},
    )


@router.delete("/file-delete")
def file_delete(file: str) -> JSONResponse:
    """Hard-delete a data file and its associated metadata.

    Removes the .csv and .duckdb variants of the named file from the
    data folder, deletes the sidecar metadata text file, and removes
    the file's entry from metadata.json.

    Args:
        file: The base file name (without extension) to delete.

    Returns:
        JSONResponse with status 200 on success.

    Raises:
        HTTPException: With status 404 if no matching file is found,
                       or 500 on unexpected failure.
    """
    try:
        deleted = False
        for ext in (".csv", ".duckdb"):
            path = os.path.join(_DATA_FOLDER, f"{file}{ext}")
            if os.path.exists(path):
                os.remove(path)
                deleted = True

        metadata_txt_path = os.path.join(_DATA_FOLDER, f"{file}_metadata.txt")
        if os.path.exists(metadata_txt_path):
            os.remove(metadata_txt_path)

        if os.path.exists(_METADATA_JSON_PATH):
            with open(_METADATA_JSON_PATH, "r", encoding="utf-8") as f:
                metadata_data = json.load(f)

            if file in metadata_data.get("sources", {}):
                del metadata_data["sources"][file]
                with open(_METADATA_JSON_PATH, "w", encoding="utf-8") as f:
                    json.dump(metadata_data, f, indent=4)

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail=f"No file found for '{file}'",
            )

        return JSONResponse(
            status_code=200,
            content={"message": f"{file} deleted successfully"},
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
