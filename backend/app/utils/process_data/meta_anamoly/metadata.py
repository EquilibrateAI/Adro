import json
import logging
import os
from datetime import datetime
from typing import Any

import polars as pl

from utils.process_data.meta_anamoly.anomaly import detect_anomalies

logger = logging.getLogger(__name__)


def get_file_metadata(file_path: str) -> tuple[float, str]:
    """Get file size in MB and last modified date.

    Args:
        file_path: Path to file.

    Returns:
        tuple: (size_mb as float, formatted date string 'DD-MM-YYYY')
    """
    stat = os.stat(file_path)
    size_mb = round(stat.st_size / (1024 * 1024), 2)
    created = datetime.fromtimestamp(stat.st_mtime).strftime("%d-%m-%Y")
    return size_mb, created


def simple_polars_column_stats(df: pl.DataFrame, col: str) -> dict[str, Any]:
    """Generate basic statistics for a DataFrame column.

    Args:
        df: Input DataFrame.
        col: Column name to compute statistics for.

    Returns:
        dict: Column statistics including type, missing count, and
              distribution info appropriate to the column type.
    """
    series = df[col]
    dtype = str(series.dtype)

    info: dict[str, Any] = {
        "column_name": col,
        "missing": int(series.null_count()),
    }

    # String columns
    if dtype in ("Utf8", "String"):
        info["type"] = "String"
        info["unique"] = series.n_unique()

        top = series.value_counts().sort("count", descending=True).head()
        info["top_5"] = {row[0]: int(row[1]) for row in top.iter_rows()}

        if series.n_unique() <= 200:
            info["distribution_string"] = [
                {str(row[0]): int(row[1])} for row in series.value_counts().iter_rows()
            ]
        else:
            info["distribution_string"] = [{"Too many unique values (>200)": 1}]

    # Numeric columns
    elif dtype in ("Float64", "Float32", "Int64", "Int32", "UInt32"):
        info["type"] = "Number"

        vals = series.drop_nulls()

        if not vals.is_empty():
            info.update(
                {
                    "min": float(vals.min()),
                    "max": float(vals.max()),
                    "mean": float(vals.mean()),
                    "median": float(vals.median()),
                }
            )

            try:
                info["mode"] = float(vals.mode()[0])
            except Exception:
                info["mode"] = None

            hist_df = vals.hist(bin_count=10)
            info["distribution_num"] = [
                {
                    "range": row[1]
                    .replace("(", "")
                    .replace("]", "")
                    .replace("[", "")
                    .replace(",", " -"),
                    "count": int(row[2]),
                }
                for row in hist_df.iter_rows()
            ]
        else:
            info.update(
                {
                    "min": None,
                    "max": None,
                    "mean": None,
                    "median": None,
                    "mode": None,
                    "distribution_num": [],
                }
            )

    # Datetime columns
    elif dtype.startswith("Date") or dtype.startswith("Datetime"):
        info["type"] = "Datetime"

        vals = series.drop_nulls()
        info["min"] = str(vals.min()) if not vals.is_empty() else None
        info["max"] = str(vals.max()) if not vals.is_empty() else None

    else:
        info["type"] = dtype

    return info


def get_metadata_for_csv(
    file_path: str,
    cleaning_steps: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """Generate metadata for a CSV file.

    Args:
        file_path: Path to CSV file.
        cleaning_steps: Applied cleaning steps to skip redundant anomaly checks.

    Returns:
        dict: Metadata dictionary with file info, column stats, and anomalies.
    """
    size_mb, created = get_file_metadata(file_path)

    df = pl.read_csv(file_path, ignore_errors=True)
    n_rows, n_cols = df.shape

    columns = [simple_polars_column_stats(df, col) for col in df.columns]
    anomalies = detect_anomalies(df, cleaning_steps)

    return {
        "file_name": os.path.basename(file_path),
        "type": "csv",
        "no_of_rows": n_rows,
        "no_of_columns": n_cols,
        "size_mb": size_mb,
        "date_of_creation": created,
        "history": [
            {
                "Text": {},
                "Chart": {},
                "Dashboard": {},
                "Predict": {},
                "Optimize": {},
            }
        ],
        "anomalies": anomalies,
        "columns": columns,
        "distribution_num": [
            {
                "column_name": col["column_name"],
                "distribution": col.get("distribution_num", []),
            }
            for col in columns
            if col["type"] == "Number"
        ],
        "distribution_string": [
            {
                "column_name": col["column_name"],
                "distribution": col.get("distribution_string", []),
            }
            for col in columns
            if col["type"] == "String"
        ],
        "cleaning_steps_applied": cleaning_steps or {},
    }


def create_metadata_for_file(
    file_path: str,
    source_name: str,
    cleaning_steps: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """Create and persist metadata for a file.

    Args:
        file_path: Path to the source file.
        source_name: Unique source identifier used as the metadata key.
        cleaning_steps: Applied cleaning steps passed through to anomaly detection.

    Returns:
        dict: The generated metadata for this file.

    Raises:
        Exception: If writing to metadata.json fails.
    """
    metadata = get_metadata_for_csv(file_path, cleaning_steps)
    metadata_path = os.path.join(os.path.dirname(file_path), "metadata.json")

    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r", encoding="utf-8") as file:
                all_meta = json.load(file)
        except Exception as exc:
            logger.error("Failed reading metadata.json: %s", str(exc))
            all_meta = {"sources": {}}
    else:
        all_meta = {"sources": {}}

    all_meta["sources"][source_name] = metadata

    try:
        with open(metadata_path, "w", encoding="utf-8") as file:
            json.dump(all_meta, file, indent=2)
    except Exception as exc:
        logger.error("Failed writing metadata.json: %s", str(exc))
        raise

    return metadata
