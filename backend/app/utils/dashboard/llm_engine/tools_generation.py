import logging

import duckdb
import polars as pl
from dotenv import load_dotenv

load_dotenv()

FOLDER_NAME = "data"

logger = logging.getLogger(__name__)


def check_file(file_name: str) -> dict | str:
    """Use this function to get the column names and their datatypes.

    Args:
        file_name: Name of the file being queried, without the extension.

    Returns:
        dict with column names as keys and datatypes as values,
        or an error string on failure.
    """
    try:
        logger.debug("check_file called: %s", file_name)
        con = duckdb.connect(f"{FOLDER_NAME}/{file_name}.duckdb")
        df = con.execute(f"describe {file_name}").pl()
        return dict(zip(df["column_name"], df["column_type"]))

    except Exception as e:
        logger.error("check_file failed: %s", str(e))
        return str(e)


def check_column(file_name: str, column_name: str) -> dict | str:
    """Use this function to peek at a particular column in the data.

    Args:
        file_name: Name of the file being queried, without the extension.
        column_name: Name of the column to inspect.

    Returns:
        dict with data_sample, min, max, mean, and count of the column,
        or an error string on failure.
    """
    try:
        logger.debug("check_column called: file=%s column=%s", file_name, column_name)
        con = duckdb.connect(f"{FOLDER_NAME}/{file_name}.duckdb")
        df = con.execute(f"select {str(column_name)} from {file_name}").pl()
        return {
            "data_sample": df[column_name][0],
            "max": df[column_name].max(),
            "min": df[column_name].min(),
            "mean": df[column_name].mean(),
            "count": df[column_name].count(),
        }

    except Exception as e:
        logger.error("check_column failed: %s", str(e))
        return str(e)


def run_query1(sql: str, file_name: str) -> list | str:
    """Use this function to execute a SQL query on the file.

    Args:
        sql: The SQL query to execute.
        file_name: Name of the file without the extension.

    Returns:
        A list of row dicts on success, or an error string on failure.
    """
    try:
        logger.debug("run_query1 called: file=%s query=%s", file_name, sql)
        con = duckdb.connect(f"{FOLDER_NAME}/{file_name}.duckdb")

        # Strip backticks; only run the first statement if multiple are present
        formatted_sql = sql.replace("`", "").split(";")[0]

        result = con.execute(formatted_sql).pl().to_dicts()

        if result == []:
            logger.warning("Query returned no results: %s", sql)
            return "Query returned null. Try again with a valid query"

        logger.debug("run_query1 success: %s", sql)
        return result

    except Exception as e:
        logger.error("run_query1 failed: %s", str(e))
        return str(e)


def chart_structure(chart_type: str) -> str:
    """Return an example Apache ECharts structure for the given chart type.

    Args:
        chart_type: The chart type to look up (e.g. 'pie', 'line', 'bar').

    Returns:
        A string containing an example ECharts options object.
    """
    logger.debug("chart_structure called: %s", chart_type)
    if chart_type == "pie":
        return """{
  title: {
    text: 'Referer of a Website',
    subtext: 'Fake Data',
    left: 'center'
  },
  tooltip: {
    trigger: 'item'
  },
  legend: {
    orient: 'vertical',
    left: 'left'
  },
  series: [
    {
      name: 'Access From',
      type: 'pie',
      radius: '50%',
      data: [
        { value: 1048, name: 'Search Engine' },
        { value: 735, name: 'Direct' },
        { value: 580, name: 'Email' },
        { value: 484, name: 'Union Ads' },
        { value: 300, name: 'Video Ads' }
      ],
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }
  ]
"""
    return ""


def correlation_table(file_name: str, column: str) -> str:
    """Return the correlation of a column with all other numeric columns.

    Args:
        file_name: Name of the file without the extension.
        column: Name of the column to compute correlations for.

    Returns:
        A formatted string with correlation values per column.
    """
    logger.debug("correlation_table called: column=%s", column)
    con = duckdb.connect(f"{file_name}.duckdb")
    df = con.execute(f"describe {file_name}").pl()
    table = {}
    col_names = df["column_name"].to_list()
    col_names.remove(column)

    for col_name in col_names:
        try:
            corr = con.execute(
                f"Select CORR({column},{col_name}) as cor from {file_name}"
            ).fetchall()
            table[col_name] = corr[0][0]
        except Exception:
            table[col_name] = "nan"

    return f"Correlation of {column} with other columns: {table}"


def get_alerts(file_name: str) -> list:
    """Return alerts for the given file name.

    Args:
        file_name: Name of the file without the extension.

    Returns:
        list: List of alerts for the file.
    """
    raise NotImplementedError


def m4_sample_full_rows(
    con: duckdb.DuckDBPyConnection,
    base_query_str: str,
    value_column: str = "Total",
    target_points: int = 25,
) -> pl.DataFrame:
    """Apply M4 sampling and return the original full rows.

    Applies M4 sampling but returns the ORIGINAL ROWS (SELECT *)
    instead of just min/max values.

    Args:
        con: Active DuckDB connection.
        base_query_str: The base SQL query whose results will be sampled.
        value_column: The numeric column used to determine min/max per bucket.
        target_points: Approximate number of output rows desired.

    Returns:
        A Polars DataFrame of sampled original rows.
    """
    # Wrap user query to add a row index
    wrapped = con.sql(
        f"""
        WITH user_query AS ({base_query_str})
        SELECT *, row_number() OVER () as _m4_id
        FROM user_query
    """
    )

    total_rows = wrapped.count("*").fetchone()[0]
    if total_rows == 0:
        return pl.DataFrame()

    # Since we pick 2 rows per bucket (Min & Max), use half as many buckets
    bucket_count = max(1, target_points // 2)
    bucket_size = total_rows / bucket_count

    result = con.sql(
        f"""
        SELECT * EXCLUDE (_m4_id)
        FROM wrapped
        QUALIFY
            row_number() OVER (
                PARTITION BY floor((_m4_id - 1) / {bucket_size})::INT
                ORDER BY {value_column} ASC
            ) = 1
            OR
            row_number() OVER (
                PARTITION BY floor((_m4_id - 1) / {bucket_size})::INT
                ORDER BY {value_column} DESC
            ) = 1
        ORDER BY _m4_id
    """
    ).pl()

    return result
