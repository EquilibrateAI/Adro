import logging
import os
import re

import duckdb
import polars as pl
from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

router = APIRouter(tags=["Chart Data"])

ROOT_PATH = os.path.dirname(__file__)
API_FOLDER = os.path.dirname(ROOT_PATH)
APP_PATH = os.path.dirname(API_FOLDER)

logger = logging.getLogger(__name__)


class ChartConfig(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    chart_type: str | None = None
    title: str | None = None
    x_axis_column: str | None = None
    y_axis_columns: list[str] = []
    category_column: str | None = None
    aggregate_function: str | None = None
    numeric_column: str | None = None
    numeric_columns: list[str] = []
    stages_column: str | None = None
    values_column: str | None = None


class ChartRequest(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    table_name: str
    chart_type: str
    config: ChartConfig


def clean_table_name(name: str) -> str:
    """Sanitise a table name for safe use as a DuckDB identifier.

    Args:
        name: Raw table name string.

    Returns:
        An alphanumeric-and-underscore identifier, prefixed with
        'table_' if it does not start with a letter.
    """
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", name)
    if cleaned and not cleaned[0].isalpha():
        cleaned = "table_" + cleaned
    return cleaned


def _fetch_bar_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch aggregated data for a bar chart.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with category and numeric columns.

    Returns:
        dict: title, axis labels, x-axis data, and series data.
    """
    category_col = config.category_column
    numeric_col = config.numeric_column
    aggregate_function = (
        config.aggregate_function.upper() if config.aggregate_function else "COUNT"
    )
    title = config.title or "Aggregated"

    select_condition = (
        f'"{category_col}", {aggregate_function}("{numeric_col}") AS value'
    )
    y_axis_label = f"{aggregate_function} of {numeric_col}"

    sql = f"""
    SELECT {select_condition}
    FROM "{table_name}"
    GROUP BY "{category_col}"
    ORDER BY "{category_col}"
    """

    df = conn.execute(sql).pl()

    return {
        "title": title,
        "xAxisLabel": category_col,
        "yAxisLabel": y_axis_label,
        "xAxisData": df[category_col].to_list(),
        "seriesData": df["value"].to_list(),
    }


def _fetch_scatter_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch data for a scatter chart.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with x and y axis columns.

    Returns:
        dict: title, axis labels, and scatter point pairs.
    """
    x_axis_col = config.x_axis_column
    y_axis_col = config.y_axis_columns[0] if config.y_axis_columns else None
    title = config.title or "Scatter Plot"

    if not x_axis_col or not y_axis_col:
        return {
            "error": "Both X-axis and Y-axis columns are required for scatter chart"
        }

    sql = f"""
    SELECT "{x_axis_col}", "{y_axis_col}"
    FROM "{table_name}"
    WHERE "{x_axis_col}" IS NOT NULL AND "{y_axis_col}" IS NOT NULL
    ORDER BY "{x_axis_col}"
    """

    df = conn.execute(sql).pl()

    scatter_data = [[df[x_axis_col][i], df[y_axis_col][i]] for i in range(len(df))]

    return {
        "title": title,
        "xAxisLabel": x_axis_col,
        "yAxisLabel": y_axis_col,
        "scatterData": scatter_data,
    }


def _fetch_box_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch data for a box plot.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with category and numeric columns.

    Returns:
        dict: title, axis labels, categories, and box statistics per category.
    """
    category_col = config.category_column
    numeric_col = config.numeric_column
    title = config.title or "Box Plot"

    if not category_col or not numeric_col:
        return {"error": "Both category and numeric columns are required for box plot"}

    sql = f"""
    SELECT "{category_col}", "{numeric_col}"
    FROM "{table_name}"
    WHERE "{category_col}" IS NOT NULL AND "{numeric_col}" IS NOT NULL
    ORDER BY "{category_col}"
    """

    df = conn.execute(sql).pl()

    box_data = []
    categories = df[category_col].unique().to_list()

    for category in categories:
        values = df.filter(pl.col(category_col) == category)[numeric_col].to_list()
        values.sort()

        if len(values) >= 5:
            q1 = values[len(values) // 4]
            median = values[len(values) // 2]
            q3 = values[3 * len(values) // 4]
            min_val = min(values)
            max_val = max(values)

            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = [v for v in values if v < lower_bound or v > upper_bound]

            box_data.append([min_val, q1, median, q3, max_val, outliers])
        else:
            box_data.append([0, 0, 0, 0, 0, []])

    return {
        "title": title,
        "xAxisLabel": category_col,
        "yAxisLabel": numeric_col,
        "categories": categories,
        "boxData": box_data,
    }


def _fetch_funnel_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch aggregated data for a funnel chart.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with stages and values columns.

    Returns:
        dict: title, stage/value labels, and funnel data entries.
    """
    stages_col = config.stages_column
    values_col = config.values_column
    title = config.title or "Funnel Chart"

    if not stages_col or not values_col:
        return {"error": "Both stages and values columns are required for funnel chart"}

    sql = f"""
    SELECT "{stages_col}", SUM("{values_col}") as total_value
    FROM "{table_name}"
    WHERE "{stages_col}" IS NOT NULL AND "{values_col}" IS NOT NULL
    GROUP BY "{stages_col}"
    ORDER BY total_value DESC
    """

    df = conn.execute(sql).pl()

    funnel_data = [
        {"name": stage, "value": value}
        for stage, value in zip(df[stages_col].to_list(), df["total_value"].to_list())
    ]

    return {
        "title": title,
        "stagesLabel": stages_col,
        "valuesLabel": values_col,
        "funnelData": funnel_data,
    }


def _fetch_line_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch data for a line chart across multiple numeric columns.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with numeric columns list.

    Returns:
        dict: title, x-axis data, y-axis labels, and series per column.
    """
    numeric_cols = config.numeric_columns
    title = config.title or "Line Chart"

    select_condition = ", ".join([f'"{col}"' for col in numeric_cols])
    null_filter = " AND ".join([f'"{col}" IS NOT NULL' for col in numeric_cols])

    sql = f"""
    SELECT ROW_NUMBER() OVER() as index_col, {select_condition}
    FROM "{table_name}"
    WHERE {null_filter}
    ORDER BY 1
    """

    df = conn.execute(sql).pl()

    series_data = [{"name": col, "data": df[col].to_list()} for col in numeric_cols]

    return {
        "title": title,
        "xAxisData": df["index_col"].to_list(),
        "yAxisLabels": numeric_cols,
        "series": series_data,
    }


def _fetch_heatmap_data(
    conn: duckdb.DuckDBPyConnection, table_name: str, config: ChartConfig
) -> dict:
    """Fetch correlation matrix data for a heatmap chart.

    Args:
        conn: Active DuckDB connection.
        table_name: Sanitised table identifier.
        config: Chart configuration with at least two numeric columns.

    Returns:
        dict: title, axis labels, heatmap data, and min/max values.
    """
    numeric_cols = config.numeric_columns
    title = config.title or "Correlation Heatmap"

    if len(numeric_cols) < 2:
        return {"error": "At least two numeric columns are required for heatmap chart"}

    heatmap_data = []

    for i, col1 in enumerate(numeric_cols):
        for j, col2 in enumerate(numeric_cols):
            if i == j:
                correlation = 1.0
            else:
                sql = f"""
                SELECT CORR("{col1}", "{col2}") AS correlation
                FROM "{table_name}"
                WHERE "{col1}" IS NOT NULL AND "{col2}" IS NOT NULL
                """
                result = conn.execute(sql).fetchone()
                correlation = result[0] if result[0] is not None else 0.0

            heatmap_data.append([j, i, round(correlation, 4)])

    return {
        "title": title,
        "xAxisLabels": numeric_cols,
        "yAxisLabels": numeric_cols,
        "heatmapData": heatmap_data,
        "minValue": -1.0,
        "maxValue": 1.0,
    }


_CHART_HANDLERS = {
    "bar": _fetch_bar_data,
    "scatter": _fetch_scatter_data,
    "box": _fetch_box_data,
    "funnel": _fetch_funnel_data,
    "line": _fetch_line_data,
    "heatmap": _fetch_heatmap_data,
}


@router.post("/chart-data-fetch")
async def fetch_chart_data(data: ChartRequest) -> dict:
    """Fetch and return chart-ready data for the requested chart type.

    Resolves the DuckDB data source from the table name, dispatches
    to the appropriate chart handler, and returns structured data
    suitable for frontend rendering.

    Args:
        data: Request body with table_name, chart_type, and config.

    Returns:
        A dict of chart data, or an error dict for unsupported types.
    """
    data_source_path = os.path.join(
        APP_PATH, f"data/{data.table_name.split('.')[0]}.duckdb"
    )

    if data.table_name in os.path.basename(data_source_path):
        table_name = clean_table_name(data.table_name)

        conn = duckdb.connect(database=data_source_path)

        handler = _CHART_HANDLERS.get(data.chart_type.lower())

        if handler is None:
            logger.warning("Unsupported chart type requested: %s", data.chart_type)
            return {"error": "Chart type not supported yet"}

        logger.info("Fetching chart data for type: %s", data.chart_type)
        return handler(conn, table_name, data.config)
