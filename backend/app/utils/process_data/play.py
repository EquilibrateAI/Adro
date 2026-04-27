import time
import polars as pl
import os
import pandas as pd

from data_cleaning.clean import clean_dataframe

# from meta_anamoly.metadata import create_metadata_for_file, simple_polars_column_stats

df = pl.read_csv("/home/fedora/Downloads/Datasets/Machine_data_test.csv", infer_schema_length=1000)

# clean_dataframe(df, checked_steps=)

# print("df head:::", df.head())

# print(df["TC6_ACT"])

# print(df["TC6_ACT"].to_list())

# print("file size in bytes:::", os.stat("/home/fedora/Downloads/Machine_data_test.csv").st_size)

# print("rows, columns:::", df.shape)

print("number of unique values in TC6_ACT:::", df["TC6_ACT"].n_unique())

# print("value counts of top 5 TC6_ACT:::", df["TC6_ACT"].value_counts().sort("count", descending=True).head())

# print("mean of TC6_ACT:::", df["TC6_ACT"].mean())

# print("median of TC6_ACT:::", df["TC6_ACT"].median())

# print("mode of TC6_ACT:::", df["TC6_ACT"].mode()[0])

# print("null count in TC6_ACT:::", df["TC6_ACT"].null_count())

# print("datatype of TC6_ACT:::", df["TC6_ACT"].dtype)

# print("min TC6_ACT:::", df["TC6_ACT"].min())

# print("max TC6_ACT:::", df["TC6_ACT"].max())

# print("columns in df:::", df.columns)

# print("col datatype:::",df["TC6_ACT"].dtype)

# start = time.time()
# cleaned_df = clean_dataframe(df)
# end = time.time()
# print(f"time taken to clean dataframe: {end - start}s")

# create_metadata_for_file("/home/fedora/Downloads/Simple_Data.csv", "metadata.json")

# print("column number of valu counts:::", {row[0] : row[1] for row in df["TC6_ACT"].value_counts().sort("count", descending=True).iter_rows()} )

# simple_polars_column_stats(df, "TC6_ACT")

# last_modified = os.path.getmtime("/home/fedora/Downloads/Datasets/Machine_data_test.csv")
# current_time = time.time()

# print("last modified time of file:::", last_modified)
# print("current time:::", current_time)
# print("last modified timme in seconds:::", current_time - last_modified)
# print("last modified time in minutes:::", int((current_time - last_modified) / 60))
# print("last modified time in hours:::", int((current_time - last_modified) / 3600))

# pandas_df = pd.read_csv("/home/fedora/Downloads/Datasets/Churn_Modelling.csv")    
# print("column names:::", pandas_df.columns)
# column_index = pandas_df.columns.get_loc("Exited") #iloc doesn't work with column names directly
# print("column exited:::",pandas_df.iloc[:, 0:].values)

# column_index = df.get_column_index("TC6_ACT")

df = df.select([columns for columns in df.columns if columns != "TC6_ACT"])

new_df = df.clone()

# print("df after dropping TC6_ACT:::", df)

# print("column index of TC6_ACT:::", column_index)    

# print("all columns except Exited:::", pandas_df.iloc[:, pandas_df.columns != "Exited"])

df_new = pl.read_csv("/home/fedora/Downloads/Datasets/Simple_Data.csv")

# print("data types of each column:::", {col: dtype for col, dtype in zip(df_new.columns, df_new.dtypes)})

sampled_df = df.sample(n=500, seed=0, with_replacement=False)

print("size of dataframe after sampling:::", sampled_df.shape)

print(sampled_df)