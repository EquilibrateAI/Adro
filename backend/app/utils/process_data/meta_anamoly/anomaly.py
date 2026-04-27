import json
import logging
import os
import re

import polars as pl

logger = logging.getLogger(__name__)


def load_config() -> tuple[float, str, int]:
    """Load cleanup configuration from JSON file.

    Returns:
        tuple: (numeric_pct, null_replacement, decimal_points)
    """
    current_dir = os.path.dirname(__file__)
    config_path = os.path.join(
        os.path.dirname(current_dir),
        "data_cleaning",
        "cleanup_config.json",
    )

    logger.info("Loading config from path: %s", config_path)

    try:
        with open(config_path, "r", encoding="utf-8") as jsonfile:
            data = json.load(jsonfile)
            logger.debug("Loaded config: %s", data)
    except Exception as exc:
        logger.error("Failed to load config: %s", str(exc))
        raise

    return (
        data["numeric_pct"],
        data["null_replacement"],
        data["decimal_points"],
    )


def _count_decimals(value: float) -> int:
    """Count the number of decimal places in a float value.

    Args:
        value: The float value to inspect.

    Returns:
        Number of decimal places as an integer.
    """
    value_str = str(value)
    return len(value_str.split(".")[-1]) if "." in value_str else 0


def detect_anomalies(
    df: pl.DataFrame,
    cleaning_steps: dict[str, bool] | None = None,
) -> list[str]:
    """Detect data quality anomalies in a Polars DataFrame.

    Inspects columns for high null/zero ratios, excess decimal precision,
    numeric-like text columns, mixed data types, datetime columns, and
    invalid column names.

    Args:
        df: Input DataFrame to inspect.
        cleaning_steps: Applied cleaning steps to skip redundant checks.

    Returns:
        List of human-readable anomaly description strings.
    """
    numeric_pct, _, decimal_points = load_config()
    anomalies: list[str] = []

    for col in df.columns:
        series = df[col]
        dtype = series.dtype

        # Numeric columns
        if dtype.is_numeric():
            zero_ratio = df.select((pl.col(col) == 0).mean()).item()
            logger.debug("Column: %s | zero_ratio: %s", col, zero_ratio)

            if zero_ratio >= numeric_pct:
                if not cleaning_steps or not cleaning_steps.get("dropHighNullColumns"):
                    anomalies.append(
                        f"Column '{col}' has more than "
                        f"{int(numeric_pct * 100)}% zero values."
                    )

            null_ratio = df.select(pl.col(col).is_null().mean()).item()

            if null_ratio >= numeric_pct:
                if not cleaning_steps or (
                    not cleaning_steps.get("dropHighNullColumns")
                    and not cleaning_steps.get("replaceNulls")
                ):
                    anomalies.append(
                        f"Column '{col}' has over "
                        f"{int(numeric_pct * 100)}% null values."
                    )
            elif null_ratio > 0:
                if not cleaning_steps or not cleaning_steps.get("replaceNulls"):
                    anomalies.append(
                        f"Column '{col}' has {int(null_ratio * 100)}% null values."
                    )

            if dtype in (pl.Float32, pl.Float64):
                decimals = series.drop_nans()

                try:
                    decimals_count = decimals.map_elements(_count_decimals)
                    if decimals_count.max() > decimal_points:
                        if not cleaning_steps or not cleaning_steps.get(
                            "roundNumericColumns"
                        ):
                            anomalies.append(
                                f"Column '{col}' has excessive decimal precision."
                            )
                except Exception as exc:
                    logger.error(
                        "Decimal check failed for column %s: %s", col, str(exc)
                    )

        # String columns
        elif dtype == pl.Utf8:
            # Numeric-like text detection
            try:
                numeric_like = series.drop_nulls().map_elements(
                    lambda x: bool(re.match(r"^-?\d+(\.\d+)?$", x))
                )

                ratio = (
                    numeric_like.sum() / len(numeric_like)
                    if len(numeric_like) > 0
                    else 0
                )

                if ratio >= numeric_pct:
                    if not cleaning_steps or not cleaning_steps.get(
                        "convertObjectsToNumeric"
                    ):
                        anomalies.append(f"Column '{col}' is text but mostly numeric.")
            except Exception as exc:
                logger.error("Numeric-like check failed for %s: %s", col, str(exc))

            # Mixed type detection
            try:
                converted = df.select(
                    pl.col(col)
                    .str.replace(",", "")
                    .cast(pl.Float64, strict=False)
                    .is_null()
                    .sum()
                ).item()

                non_null_count = df.select(pl.col(col).is_not_null().sum()).item()

                if non_null_count > 0:
                    numeric_ratio = (non_null_count - converted) / non_null_count

                    if 0.05 < numeric_ratio < 0.95:
                        if not cleaning_steps or not cleaning_steps.get(
                            "replaceMinorityTypeInMixedColumns"
                        ):
                            minority = "string" if numeric_ratio > 0.5 else "numeric"
                            anomalies.append(
                                f"Column '{col}' has mixed types. "
                                f"Minority type: {minority}."
                            )
            except Exception as exc:
                logger.error("Mixed-type check failed for %s: %s", col, str(exc))

            # Nulls in string columns
            null_ratio = df.select(pl.col(col).is_null().mean()).item()
            if null_ratio > 0:
                if not cleaning_steps or not cleaning_steps.get("replaceNulls"):
                    anomalies.append(
                        f"Column '{col}' has {int(null_ratio * 100)}% null values."
                    )

        # Datetime columns
        if dtype in (pl.Datetime, pl.Date, pl.Time):
            if not cleaning_steps or not cleaning_steps.get("removeDatetimeColumns"):
                anomalies.append(f"Column '{col}' is a datetime column.")

    # Column name check
    for col in df.columns:
        if re.search(r"\s", col) or re.search(r"[^\w_]", col):
            if not cleaning_steps or not cleaning_steps.get("cleanColumnNames"):
                anomalies.append(f"Column '{col}' has invalid characters.")

    return anomalies
