import re
import shutil
from pathlib import Path

import duckdb
import polars as pl

from ..data_cleaning.clean import clean_column_names


DATA_DIR = Path("./data")


def ensure_data_folder() -> None:
    """Ensure that the data directory exists.

    Creates the ./data folder if it does not already exist.
    """
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def file_exists_in_data(filename: str) -> bool:
    """Check if a file exists in the data directory.

    Args:
        filename: Name of the file to check.

    Returns:
        True if the file exists, False otherwise.
    """
    return (DATA_DIR / filename).exists()


def _sanitize_filename(filename: str) -> str:
    """Sanitize a filename by replacing spaces with underscores.

    Args:
        filename: Original filename.

    Returns:
        Sanitized filename with spaces replaced by underscores.
    """
    return filename.replace(" ", "_")


def save_uploaded_file(file, filename: str) -> str:
    """Save an uploaded file to the data directory.

    Args:
        file: Uploaded file object (FastAPI UploadFile).
        filename: Original filename.

    Returns:
        Path to the saved file as a string.
    """
    ensure_data_folder()

    sanitized_name = _sanitize_filename(filename)
    file_path = DATA_DIR / sanitized_name

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)


def save_dataframe_to_csv(df: pl.DataFrame, filename: str) -> str:
    """Save a Polars DataFrame as a CSV file in the data directory.

    Args:
        df: DataFrame to save.
        filename: Output filename.

    Returns:
        Path to the saved CSV file as a string.
    """
    ensure_data_folder()

    sanitized_name = _sanitize_filename(filename)
    file_path = DATA_DIR / sanitized_name

    df.write_csv(file_path)

    return str(file_path)


def process_csv_to_duckdb(file_path: str) -> str:
    """Convert a CSV file into a DuckDB database.

    Reads the CSV into a Polars DataFrame, cleans column names,
    registers the DataFrame in DuckDB, and creates a table from it.

    Args:
        file_path: Path to the CSV file.

    Returns:
        Path to the created DuckDB file as a string.
    """
    df = pl.read_csv(
        file_path,
        encoding="utf8-lossy",
        ignore_errors=True,
    )

    clean_column_names(df)

    duckdb_path = file_path.replace(".csv", ".duckdb")
    table_name = Path(file_path).stem

    # Sanitize table name for DuckDB compatibility
    table_name = re.sub(r"[^A-Za-z0-9_]", "_", table_name)

    conn = duckdb.connect(duckdb_path)

    try:
        conn.register("df", df)
        conn.execute(f"CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM df")
    finally:
        conn.close()

    return duckdb_path
