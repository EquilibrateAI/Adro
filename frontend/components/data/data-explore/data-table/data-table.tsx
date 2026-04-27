"use client";

import { useState, useEffect, useRef, useCallback } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TableIcon,
  AlertCircle,
  RefreshCw,
  Loader2,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogHeader } from "@/components/ui/dialog";

import { DataSource } from "@/services/utils/data/sidebar/data-context";
import { DataSourceType } from "@/services/utils/data/sidebar/data-context";
import { callTableAPI } from "@/services/api/data/data-explore/data-table/table-data-fetch-local";
import { DataFilter } from "./data-filter";
import { getColumnInfo } from "@/services/api/dashboard/text-mode/column-info/column-names";
import { DataTableFilter, Column, ColumnFilter } from "./data-table-filter";

export interface DataTableProps {
  selectedTable: string;
  selectedSource?: DataSource;
  tableDetails?: {
    name: string;
    rows: number;
    columns: number;
    lastModified: string;
    schema?: string;
  };
  schema?: string;
  sourceType?: DataSourceType;
}

interface TableRowData {
  [key: string]: string | number | boolean | null | Date | undefined;
}

interface PaginationInfo {
  current_page: number;
  per_page: number;
  total_rows: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface SortConfig {
  column: string | null;
  order: 'asc' | 'desc' | null;
}

// A robust data table component with support for pagination, sorting, filtering, and searching
export default function DataTableComponent({
  selectedTable,
  selectedSource,
  tableDetails,
  schema,
  sourceType
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  interface ApiTableDetails {
    total_rows: number;
    total_columns: number;
    columns?: string[];
  }
  const [apiTableDetails, setApiTableDetails] = useState<ApiTableDetails | null>(null);

  const [isFiltering, setIsFiltering] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Map<string, ColumnFilter>>(new Map());
  const [columnMetadata, setColumnMetadata] = useState<Map<string, Column>>(new Map());

  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: null, order: null });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const [isScrolled, setIsScrolled] = useState(false);

  const schemaName = schema ?? tableDetails?.schema ?? selectedSource?.schema ?? '';

  const selectedSourceType = sourceType ?? selectedSource?.type;
  const showCounts = selectedSourceType !== 'postgresql';
  
  useEffect(() => {
  }, [sourceType, selectedSourceType, selectedTable, schemaName, selectedSource?.name]);

// Fetches and organizes metadata for all columns available in the current data source
  const loadColumnMetadata = useCallback(async () => {
    if (!selectedSource?.name) return;

    try {
      const response = await getColumnInfo(selectedSource.name);
      
      let colArr: Column[] = [];
      
      const isColumn = (item: unknown): item is Column => {
        return typeof item === 'object' && item !== null && 'column_name' in item;
      };
      
      const isString = (item: unknown): item is string => {
        return typeof item === 'string';
      };

      if (Array.isArray(response)) {
        if (response.length > 0 && isColumn(response[0])) {
          colArr = response as unknown as Column[];
        } else if (response.length > 0 && isString(response[0])) {
          colArr = response.map(colName => ({
            column_name: colName,
            type: "Unknown"
          }));
        }
      } else if (response && typeof response === "object" && "columns" in response) {
        const responseObj = response as { columns: unknown };
        if (Array.isArray(responseObj.columns)) {
          if (responseObj.columns.length > 0 && isColumn(responseObj.columns[0])) {
            colArr = responseObj.columns as Column[];
          } else if (responseObj.columns.length > 0 && isString(responseObj.columns[0])) {
            colArr = responseObj.columns.map((colName: string) => ({
              column_name: colName,
              type: "Unknown"
            }));
          }
        }
      }
      
      const metadata = new Map<string, Column>();

      colArr.forEach((col: Column) => {
        metadata.set(col.column_name, col);
      });

      setColumnMetadata(metadata);
    } catch (err) {
      console.error("Error loading column metadata:", err);
    }
  }, [selectedSource?.name]);

// Retrieves basic statistics and column definitions for the active table
  const fetchTableInfoData = useCallback(async () => {
    if (!selectedSource?.name) return;

    try {
      const response = await callTableAPI("table-info", {
        data_source: selectedSource.name,
        table_name: selectedTable,
      });

      if (response.success && response.data) {
        const details = {
          total_rows: response.data.total_rows ?? 0,
          total_columns: response.data.total_columns ?? 0,
          columns: response.data.columns ?? [],
        };
        setApiTableDetails(details);
        if (response.data.columns) {
          setColumns(response.data.columns);
        }
      } else {
        setError(response.error || "Failed to fetch table information");
      }
    } catch (err) {
      console.error("Error fetching table info:", err);
      setError("Failed to connect to the server");
    }
  }, [selectedSource?.name, selectedTable]);

// Fetches a specific page of raw records from the data source
  const fetchInitialTableData = useCallback(async (page: number = 1) => {
    if (!selectedSource?.name) return;

    setLoading(true);
    setError("");

    try {
      const response = await callTableAPI("table-data", {
        data_source: selectedSource.name,
        table_name: selectedTable,
        page: page,
        per_page: 20,
        offset: (page - 1) * 20,
        limit: 20,
      });

      if (response.success && response.data) {
        setTableData(response.data.records || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(page);

        if (response.data.columns) {
          setColumns(response.data.columns);
        }
      } else {
        setError(response.error || "Failed to fetch table data");
        setTableData([]);
      }
    } catch (err) {
      console.error("Error fetching table data:", err);
      setError("Failed to connect to the server");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSource?.name, selectedTable]);

// Orchestrates the initial sequence of metadata and data fetching on component mount
  const loadInitialData = useCallback(async () => {
    await fetchTableInfoData();
    await loadColumnMetadata();
    await fetchInitialTableData();
  }, [fetchTableInfoData, loadColumnMetadata, fetchInitialTableData]);

  useEffect(() => {
    if (selectedSource?.name) {
      loadInitialData();
    }
  }, [selectedSource?.name, selectedTable, loadInitialData]);

// Updates the active filter collection when an individual column filter is changed
  const handleFilterApply = useCallback((columnName: string, filter: ColumnFilter | null) => {
    const newFilters = new Map(columnFilters);
    
    if (filter === null) {
      newFilters.delete(columnName);
    } else {
      newFilters.set(columnName, filter);
    }

    setColumnFilters(newFilters);
    setCurrentPage(1);
    applyFilters(newFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

// Communicates with the API to retrieve data that matches the current complex filter logic
  const applyFilters = async (filters: Map<string, ColumnFilter>, page: number = 1) => {
    if (filters.size === 0) {
      await fetchInitialTableData(1);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const filterConditions = Array.from(filters.values()).map(filter => {
        if (filter.type === 'categorical') {
          return {
            column: filter.column,
            operator: "in",
            value: filter.values
          };
        } else {
          if (filter.operator === 'between' || filter.operator === 'not_between') {
            return {
              column: filter.column,
              operator: filter.operator,
              value: `${filter.minValue}-${filter.maxValue}`
            };
          } else {
            return {
              column: filter.column,
              operator: filter.operator,
              value: filter.value
            };
          }
        }
      });

      const response = await callTableAPI("filter", {
        data_source: selectedSource?.name,
        table_name: selectedTable,
        filters: filterConditions,
        page: page,
        per_page: 20,
        sort_column: sortConfig.column,
        sort_order: sortConfig.order || "asc",
      });

      if (response.success && response.data) {
        setTableData(response.data.records || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(page);
        setIsFiltering(filters.size > 0);
      } else {
        setError(response.error || "Filter failed");
        setTableData([]);
      }
    } catch (err) {
      console.error("Error applying filters:", err);
      setError("Failed to apply filters");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

// Resets all active column-level filters and returns the table to its default state
  const clearAllColumnFilters = () => {
    setColumnFilters(new Map());
    setIsFiltering(false);
    setCurrentPage(1);
    fetchInitialTableData(1);
  };

// Toggles the sort order for a specific column and triggers a fresh data fetch
  const handleSort = async (columnName: string) => {
    let newOrder: 'asc' | 'desc' | null = 'asc';
    
    if (sortConfig.column === columnName) {
      if (sortConfig.order === 'asc') {
        newOrder = 'desc';
      } else if (sortConfig.order === 'desc') {
        newOrder = null;
      }
    }

    setSortConfig({
      column: newOrder ? columnName : null,
      order: newOrder
    });

    if (!newOrder) {
      setCurrentPage(1);
      if (isFiltering) {
        applyFilters(columnFilters, 1);
      } else {
        fetchInitialTableData(1);
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await callTableAPI("sort", {
        data_source: selectedSource?.name,
        table_name: selectedTable,
        sort_column: columnName,
        sort_order: newOrder,
        page: 1,
        per_page: 20,
      });

      if (response.success && response.data) {
        setTableData(response.data.records || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(1);
      } else {
        setError(response.error || "Sort failed");
      }
    } catch (err) {
      console.error("Error sorting data:", err);
      setError("Failed to sort data");
    } finally {
      setLoading(false);
    }
  };

// Specifically fetches a page of data ordered by the currently selected sort configuration
  const fetchSortedData = async (page: number = 1) => {
    if (!selectedSource?.name || !sortConfig.column) return;

    setLoading(true);
    setError("");

    try {
      const response = await callTableAPI("sort", {
        data_source: selectedSource.name,
        table_name: selectedTable,
        sort_column: sortConfig.column,
        sort_order: sortConfig.order || "asc",
        page: page,
        per_page: 20,
      });

      if (response.success && response.data) {
        setTableData(response.data.records || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(page);
      } else {
        setError(response.error || "Sort failed");
      }
    } catch (err) {
      console.error("Error fetching sorted data:", err);
      setError("Failed to sort data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement === container ||
        container.contains(document.activeElement)
      ) {
        const scrollAmount = 50;
        const fastScrollAmount = 200;

        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            container.scrollTop -= e.shiftKey ? fastScrollAmount : scrollAmount;
            break;
          case "ArrowDown":
            e.preventDefault();
            container.scrollTop += e.shiftKey ? fastScrollAmount : scrollAmount;
            break;
          case "ArrowLeft":
            e.preventDefault();
            container.scrollLeft -= e.shiftKey
              ? fastScrollAmount
              : scrollAmount;
            break;
          case "ArrowRight":
            e.preventDefault();
            container.scrollLeft += e.shiftKey
              ? fastScrollAmount
              : scrollAmount;
            break;
          case "PageUp":
            e.preventDefault();
            container.scrollTop -= container.clientHeight * 0.8;
            break;
          case "PageDown":
            e.preventDefault();
            container.scrollTop += container.clientHeight * 0.8;
            break;
          case "Home":
            e.preventDefault();
            if (e.ctrlKey) {
              container.scrollTop = 0;
              container.scrollLeft = 0;
            } else {
              container.scrollLeft = 0;
            }
            break;
          case "End":
            e.preventDefault();
            if (e.ctrlKey) {
              container.scrollTop = container.scrollHeight;
              container.scrollLeft = container.scrollWidth;
            } else {
              container.scrollLeft = container.scrollWidth;
            }
            break;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setScrollStart({ x: container.scrollLeft, y: container.scrollTop });
        container.classList.add("dragging");
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      container.scrollLeft = scrollStart.x - deltaX;
      container.scrollTop = scrollStart.y - deltaY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      container.classList.remove("dragging");
    };

    const handleMouseLeave = () => {
      if (isDragging) {
        setIsDragging(false);
        container.classList.remove("dragging");
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    const handleScroll = () => {
      setIsScrolled(container.scrollTop > 0);
    };

    document.addEventListener("keydown", handleKeyDown);
    container.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("wheel", handleWheel);
    container.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("scroll", handleScroll);
    };
  }, [isDragging, dragStart, scrollStart]);

// Executes a keyword search across the dataset based on the current search term
  const performSearch = async (page: number = 1) => {
    if (!searchTerm.trim() || !selectedSource?.name) return;

    setLoading(true);
    setError("");

    try {
      const response = await callTableAPI("search", {
        data_source: selectedSource.name,
        table_name: selectedTable,
        search_term: searchTerm,
        page: page,
        per_page: 20,
        offset: (page - 1) * 20,
        limit: 20,
      });

      if (response.success && response.data) {
        setTableData(response.data.records || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(page);
      } else {
        setError(response.error || "Search failed");
        setTableData([]);
      }
    } catch (err) {
      console.error("Error performing search:", err);
      setError("Failed to connect to the server");
      setTableData([]);
    } finally {
      setLoading(false);
    }
  };

// Initiates a new search operation based on the current input value
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      setCurrentPage(1);
      performSearch(1);
    } else {
      setIsSearching(false);
      setCurrentPage(1);
      fetchInitialTableData(1);
    }
  };

// Clears the search input and restores the original unfiltered table view
  const handleClearSearch = () => {
    setSearchTerm("");
    setIsSearching(false);
    setCurrentPage(1);
    fetchInitialTableData(1);
  };

// Navigates to the previous page of results in the current dataset view
  const handlePreviousPage = () => {
    const newPage = currentPage - 1;
    if (isFiltering) {
      applyFilters(columnFilters, newPage);
    } else if (isSearching) {
      performSearch(newPage);
    } else if (sortConfig.column) {
      fetchSortedData(newPage);
    } else {
      fetchInitialTableData(newPage);
    }
  };

// Navigates to the next page of results in the current dataset view
  const handleNextPage = () => {
    const newPage = currentPage + 1;
    if (isFiltering) {
      applyFilters(columnFilters, newPage);
    } else if (isSearching) {
      performSearch(newPage);
    } else if (sortConfig.column) {
      fetchSortedData(newPage);
    } else {
      fetchInitialTableData(newPage);
    }
  };

// Completely restarts the table's state and re-fetches initial data
  const handleRefresh = () => {
    setCurrentPage(1);
    setSearchTerm("");
    setIsSearching(false);
    setColumnFilters(new Map());
    setIsFiltering(false);
    setSortConfig({ column: null, order: null });
    loadInitialData();
  };

// Transforms raw column IDs into more readable, human-friendly titles
  const formatColumnHeader = (column: string) => {
    return column
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

// Formats individual data values (dates, numbers, etc.) for standardized display
  const formatCellValue = (value: unknown, column: string) => {
    if (value === null || value === undefined) return "-";

    if (
      typeof value === "number" &&
      (column.includes("amount") || column.includes("salary"))
    ) {
      return value.toLocaleString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  };

// Generates the sort indicator button for column headers
  const renderSortButton = (columnName: string) => {
    const isCurrentSort = sortConfig.column === columnName;
    const sortOrder = isCurrentSort ? sortConfig.order : null;

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleSort(columnName)}
        className={`h-6 w-6 p-0 hover:bg-slate-100 ${isCurrentSort ? 'text-blue-600' : 'text-slate-400'}`}
      >
        {!sortOrder && <ArrowUpDown className="h-3 w-3" />}
        {sortOrder === 'asc' && <ArrowUp className="h-3 w-3" />}
        {sortOrder === 'desc' && <ArrowDown className="h-3 w-3" />}
      </Button>
    );
  };

// Efficiently renders the visible set of table rows, handling loading and empty states
  const renderTableRows = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length || 5}
            className="text-center py-28 h-32"
          >
            <div className="flex items-center justify-center space-x-4 ">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading data...</span>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (error) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length || 5}
            className="text-center py-8 h-32"
          >
            <div className="text-red-600 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <div className="font-medium">Error loading data</div>
              <div className="text-sm">{error}</div>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (tableData.length === 0) {
      return (
        <TableRow>
          <TableCell
            colSpan={columns.length || 5}
            className="text-center py-38 h-32 text-gray-500"
          >
            {isSearching
              ? "No results found for your search."
              : "No data available"}
          </TableCell>
        </TableRow>
      );
    }

    return tableData.map((row, index) => (
      <TableRow key={index} className="transition-colors">
        {columns.map((column, colIndex) => (
          <TableCell
            key={colIndex}
            className={`px-4 py-3 border-r last:border-r-0 min-w-[120px] whitespace-nowrap ${colIndex === 0 ? "font-medium text-gray-900" : "text-gray-700"
              }`}
          >
            {formatCellValue(row[column], column)}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <div className=" lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <Card className="shadow-sm h-full ">
          <CardHeader className=" bg-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TableIcon className="w-5 h-5 text-blue-600" />
                  {schemaName ? (
                    <>Data Preview: {schemaName}.{selectedTable} ({selectedSourceType})</>
                  ) : (
                    <>Data Preview: {selectedTable}</>
                  )}
                </CardTitle>
                <CardDescription>
                  Viewing data from {selectedSource?.name} • {schemaName ? `${schemaName}.${selectedTable}` : selectedTable}{" "}
                  {apiTableDetails && showCounts &&
                    `(${apiTableDetails.total_rows?.toLocaleString()} rows, ${apiTableDetails.total_columns
                    } columns)`}
                  {isSearching && (
                    <span className="text-blue-600">
                      {" "}
                      • Filtered by: &quot;{searchTerm}&quot;
                    </span>
                  )}
                  {isFiltering && (
                    <span className="text-green-600">
                      {" "}
                      • Column filters active ({columnFilters.size})
                    </span>
                  )}
                  {sortConfig.column && (
                    <span className="text-purple-600">
                      {" "}
                      • Sorted by {formatColumnHeader(sortConfig.column)} ({sortConfig.order?.toUpperCase()})
                    </span>
                  )}
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                {columnFilters.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllColumnFilters}
                    className="text-xs"
                  >
                    Clear Filters
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Advanced Filters
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Advanced Data Filters</DialogTitle>
                      <DialogDescription>
                        Create complex filter conditions to analyze your data with precision
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      <DataFilter
                        selectedSourceName={selectedSource?.name}
                        onFiltersChange={() => {
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search across all columns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Search
              </Button>
              {isSearching && (
                <Button variant="outline" onClick={handleClearSearch}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="relative">
              <div
                ref={tableContainerRef}
                className={`data-table-container drag-enabled ${isScrolled ? "scrolled" : ""
                  }`}
                tabIndex={0}
                role="region"
                aria-label="Data table with mouse drag and keyboard navigation support"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-b">
                      {columns.length > 0 &&
                        columns.map((column, index) => (
                          <TableHead
                            key={index}
                            className="font-semibold text-gray-900 px-4 py-3 bg-white min-w-[120px] whitespace-nowrap border-r last:border-r-0 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{formatColumnHeader(column)}</span>
                              <div className="flex items-center gap-1">
                                {renderSortButton(column)}
                                <DataTableFilter
                                  columnName={column}
                                  columnMetadata={columnMetadata}
                                  currentFilter={columnFilters.get(column)}
                                  onFilterApply={handleFilterApply}
                                  formatColumnHeader={formatColumnHeader}
                                />
                              </div>
                            </div>
                          </TableHead>
                        ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderTableRows()}</TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
              <div className="text-sm text-gray-600">
                {pagination ? (
                  <>
                    Page {pagination.current_page} of {pagination.total_pages} •
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.current_page - 1) * pagination.per_page + 1}-
                      {Math.min(
                        pagination.current_page * pagination.per_page,
                        pagination.total_rows
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {pagination.total_rows.toLocaleString()}
                    </span>{" "}
                    rows
                    {(isSearching || isFiltering) && (
                      <span className="text-blue-600 font-medium">
                        {" "}
                        (filtered)
                      </span>
                    )}
                  </>
                ) : (
                  "Loading..."
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || !pagination?.has_previous}
                  onClick={handlePreviousPage}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                {pagination && (
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm text-gray-600 font-medium">
                      {pagination.current_page}
                    </span>
                    <span className="text-sm text-gray-400">of</span>
                    <span className="text-sm text-gray-600 font-medium">
                      {pagination.total_pages}
                    </span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || !pagination?.has_next}
                  onClick={handleNextPage}
                  className="h-8"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}