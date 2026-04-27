import json
import logging
import os
import re

import polars as pl

logger = logging.getLogger(__name__)


def load_config() -> tuple:
    """Load cleanup configuration from JSON file.

    Returns:
        tuple: (numeric_pct, null_replacement, decimal_points,
                type_pct_threshold, null_threshold)
    """
    config_path = os.path.join(os.path.dirname(__file__), "cleanup_config.json")

    with open(config_path, "r", encoding="utf-8") as json_file:
        data = json.load(json_file)

    return (
        data["numeric_pct"],
        data["null_replacement"],
        data["decimal_points"],
        data["type_pct_threshold"],
        data["null_threshold"],
    )


# Column name cleaning


def clean_column_names(df: pl.DataFrame) -> None:
    """Sanitize column names for safe use in DuckDB.

    Replaces special characters with underscores, collapses multiple
    underscores, and strips leading/trailing underscores.

    Args:
        df: DataFrame whose column names will be sanitized in-place.

    Note:
        This mutates the DataFrame in-place.
    """
    new_columns = []

    for col in df.columns:
        # Keep only letters, numbers, underscores, spaces, hyphens
        clean_col = re.sub(r"[^A-Za-z0-9_\s-]", "_", col)

        # Replace spaces with underscores
        clean_col = re.sub(r"\s+", "_", clean_col)

        # Collapse multiple underscores
        clean_col = re.sub(r"_+", "_", clean_col)

        # Remove leading/trailing underscores (causes DuckDB issues)
        clean_col = clean_col.strip("_")

        new_columns.append(clean_col)

    df.columns = new_columns


# Object-to-numeric casting


def object_to_numeric(df: pl.DataFrame) -> pl.DataFrame:
    """Convert Object columns containing numeric-like values to Float64.

    Handles commas in numbers (e.g., "1,000").

    Args:
        df: Input DataFrame.

    Returns:
        Updated DataFrame with Object columns cast to Float64 where possible.
    """
    for col in df.columns:
        if df[col].dtype == pl.Object:
            df = df.with_columns(
                pl.col(col)
                .str.replace(",", "")
                .cast(pl.Float64, strict=False)
                .alias(col)
            )

    return df


# Mixed-type handling


def replace_non_majority_data(df: pl.DataFrame) -> pl.DataFrame:
    """Resolve mixed-type columns by keeping the majority type.

    If numeric values dominate, the column is cast to numeric.
    If string values dominate, numeric outliers are replaced with the mode.

    Args:
        df: Input DataFrame.

    Returns:
        Cleaned DataFrame with mixed-type columns resolved.
    """
    (
        numeric_pct,
        null_replacement,
        decimal_points,
        type_pct_threshold,
        null_threshold,
    ) = load_config()

    for col in df.columns:
        dtype = df[col].dtype

        if dtype in (pl.Utf8, pl.Object):
            try:
                non_null_series = df[col].drop_nulls()

                if non_null_series.len() == 0:
                    continue

                numeric_count = 0
                string_count = 0

                for value in non_null_series:
                    try:
                        if value is not None:
                            val = str(value).strip().replace(",", "")
                            float(val)
                            numeric_count += 1
                    except (ValueError, TypeError):
                        string_count += 1

                total_count = non_null_series.len()

                if total_count == 0:
                    continue

                numeric_ratio = numeric_count / total_count
                string_ratio = string_count / total_count

                logger.info(
                    "Column '%s': %.2f%% numeric, %.2f%% string",
                    col,
                    numeric_ratio * 100,
                    string_ratio * 100,
                )

                # Numeric majority
                if numeric_ratio >= type_pct_threshold:
                    logger.info("Casting '%s' to numeric", col)

                    df = df.with_columns(
                        pl.col(col)
                        .str.strip_chars()
                        .str.replace(",", "")
                        .cast(pl.Float64, strict=False)
                        .alias(col)
                    )

                    if null_replacement == "avg":
                        replacement_value = df[col].mean()
                    elif null_replacement == "median":
                        replacement_value = df[col].median()
                    elif null_replacement == "mode":
                        mode_series = df[col].drop_nulls().mode()
                        replacement_value = (
                            mode_series[0] if mode_series.len() > 0 else 0.0
                        )
                    else:
                        replacement_value = 0.0

                    df = df.with_columns(
                        pl.when(pl.col(col).is_null() | pl.col(col).is_nan())
                        .then(replacement_value)
                        .otherwise(pl.col(col))
                        .alias(col)
                    )

                # String majority
                elif string_ratio >= type_pct_threshold:
                    logger.info("Keeping '%s' as string", col)

                    mode_series = df[col].drop_nulls().mode()
                    mode_value = mode_series[0] if mode_series.len() > 0 else "N/A"

                    df = df.with_columns(
                        pl.when(pl.col(col).is_null())
                        .then(pl.lit(mode_value))
                        .otherwise(pl.col(col))
                        .alias(col)
                    )

                else:
                    logger.info("Column '%s' has no clear majority type", col)

            except Exception as exc:
                logger.error("Error processing column '%s': %s", col, exc)
                continue

        # Numeric columns - handle nulls
        elif dtype in (
            pl.Float64,
            pl.Float32,
            pl.Int64,
            pl.Int32,
            pl.UInt32,
            pl.UInt64,
        ):
            null_count = df[col].null_count()

            if null_count > 0:
                if null_replacement == "avg":
                    replacement_value = df[col].mean()
                elif null_replacement == "median":
                    replacement_value = df[col].median()
                elif null_replacement == "mode":
                    mode_series = df[col].mode()
                    replacement_value = mode_series[0] if mode_series.len() > 0 else 0.0
                else:
                    replacement_value = 0.0

                df = df.with_columns(
                    pl.when(pl.col(col).is_null() | pl.col(col).is_nan())
                    .then(replacement_value)
                    .otherwise(pl.col(col))
                    .alias(col)
                )

    return df


# Drop high-null columns


def drop_null_column(df: pl.DataFrame) -> pl.DataFrame:
    """Drop columns with too many null values.

    Keeps columns where non-null count meets the configured threshold.

    Args:
        df: Input DataFrame.

    Returns:
        DataFrame with high-null columns removed.
    """
    (_, _, _, _, null_threshold) = load_config()

    row_count = df.height
    threshold = null_threshold * row_count

    cols_to_keep = [
        col
        for col in df.columns
        if df.select(pl.col(col).is_not_null().sum()).item() >= threshold
    ]

    return df.select(cols_to_keep)


# Rounding


def round_numeric_columns(df: pl.DataFrame) -> pl.DataFrame:
    """Round numeric columns to configured decimal places.

    Args:
        df: Input DataFrame.

    Returns:
        DataFrame with numeric columns rounded.
    """
    (_, _, decimal_points, _, _) = load_config()

    for col in df.columns:
        if df[col].dtype in (pl.Float64, pl.Int64):
            df = df.with_columns(pl.col(col).round(decimal_points).alias(col))

    return df


# Remove datetime columns


def remove_datetime_columns(df: pl.DataFrame) -> pl.DataFrame:
    """Drop all datetime columns.

    Args:
        df: Input DataFrame.

    Returns:
        DataFrame with datetime columns removed.
    """
    cols_to_drop = [col for col in df.columns if df[col].dtype == pl.Datetime]
    return df.drop(cols_to_drop)


# Replace nulls


def replace_nulls(df: pl.DataFrame) -> pl.DataFrame:
    """Fill null values based on the configured replacement strategy.

    Args:
        df: Input DataFrame.

    Returns:
        DataFrame with null values filled.
    """
    (_, null_replacement, _, _, _) = load_config()

    for col in df.columns:
        dtype = df[col].dtype

        if dtype in (
            pl.Float64,
            pl.Float32,
            pl.Int64,
            pl.Int32,
            pl.UInt32,
            pl.UInt64,
        ):
            if null_replacement == "avg":
                replacement_value = df[col].mean()
            elif null_replacement == "median":
                replacement_value = df[col].median()
            elif null_replacement == "mode":
                mode_series = df[col].mode()
                replacement_value = mode_series[0] if mode_series.len() > 0 else 0.0
            else:
                replacement_value = 0.0

            df = df.with_columns(
                pl.when(pl.col(col).is_null() | pl.col(col).is_nan())
                .then(replacement_value)
                .otherwise(pl.col(col))
                .alias(col)
            )

        elif dtype in (pl.Utf8, pl.Object):
            mode_series = df[col].drop_nulls().mode()
            mode_value = mode_series[0] if mode_series.len() > 0 else "N/A"

            df = df.with_columns(
                pl.when(pl.col(col).is_null())
                .then(pl.lit(mode_value))
                .otherwise(pl.col(col))
                .alias(col)
            )

    return df


# Main pipeline


def clean_dataframe(df: pl.DataFrame, checked_steps: dict) -> pl.DataFrame:
    """Apply selected cleaning steps in a fixed order.

    Column name cleaning always runs first regardless of checked_steps.

    Args:
        df: Input DataFrame to clean.
        checked_steps: Dict of step keys to booleans indicating which
                       cleaning steps should be applied.

    Returns:
        Cleaned DataFrame.
    """
    clean_column_names(df)

    if checked_steps.get("convertObjectsToNumeric"):
        df = object_to_numeric(df)

    if checked_steps.get("replaceMinorityTypeInMixedColumns"):
        df = replace_non_majority_data(df)

    if checked_steps.get("dropHighNullColumns"):
        df = drop_null_column(df)

    if checked_steps.get("roundNumericColumns"):
        df = round_numeric_columns(df)

    if checked_steps.get("removeDatetimeColumns"):
        df = remove_datetime_columns(df)

    if checked_steps.get("replaceNulls"):
        df = replace_nulls(df)

    return df
