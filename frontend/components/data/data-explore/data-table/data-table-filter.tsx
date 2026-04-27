"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Search } from "lucide-react";

export interface Column {
  column_name: string;
  type: string;
  unique?: number;
  top_5?: Record<string, number>;
  distribution_string?: Array<Record<string, number>>;
  min?: number;
  max?: number;
  mean?: number;
}

export interface ColumnFilter {
  column: string;
  values?: string[];
  operator?: string;
  value?: string | number;
  minValue?: number;
  maxValue?: number;
  isActive: boolean;
  type: 'categorical' | 'numeric';
}

interface NumericFilterState {
  [columnName: string]: {
    selectedOperator: string;
    filterValue: string;
    minValue: string;
    maxValue: string;
  };
}

const NUMERIC_OPERATORS = [
  { value: "equals", label: "Equals (=)" },
  { value: "not_equals", label: "Not Equals (≠)" },
  { value: "greater_than", label: "Greater Than (>)" },
  { value: "greater_than_equal", label: "Greater or Equal (≥)" },
  { value: "less_than", label: "Less Than (<)" },
  { value: "less_than_equal", label: "Less or Equal (≤)" },
  { value: "between", label: "Between" },
  { value: "not_between", label: "Not Between" },
];

interface DataTableFilterProps {
  columnName: string;
  columnMetadata: Map<string, Column>;
  currentFilter?: ColumnFilter;
  onFilterApply: (columnName: string, filter: ColumnFilter | null) => void;
  formatColumnHeader: (column: string) => string;
}

// Provides inline filtering capabilities directly from the data table's column headers
export function DataTableFilter({
  columnName,
  columnMetadata,
  currentFilter,
  onFilterApply,
  formatColumnHeader,
}: DataTableFilterProps) {
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [tempCategoricalFilters, setTempCategoricalFilters] = useState<string[]>([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [numericFilterState, setNumericFilterState] = useState<NumericFilterState[string]>({
    selectedOperator: "",
    filterValue: "",
    minValue: "",
    maxValue: ""
  });

  const column = columnMetadata.get(columnName);
  if (!column) return null;

  const isCategorical = column.type === "String";
  const isNumeric = column.type === "Number";

  if (!isCategorical && !isNumeric) return null;

// Compiles a list of unique values found in a column to populate categorical filter options
  const getColumnUniqueValues = (): { value: string; count?: number }[] => {
    const options: { value: string; count?: number }[] = [];

    if (column.top_5) {
      Object.entries(column.top_5).forEach(([value, count]) => {
        options.push({ value, count });
      });
    }

    if (Array.isArray(column.distribution_string)) {
      column.distribution_string.forEach((item) => {
        const [name, value] = Object.entries(item)[0];
        if (!options.some(opt => opt.value === name)) {
          options.push({
            value: name,
            count: typeof value === 'number' ? value : 0
          });
        }
      });
    }

    return options.sort((a, b) => (b.count || 0) - (a.count || 0));
  };

// Updates the staging area for categorical selections before they are officially applied
  const handleCategoricalFilterChange = (selectedValues: string[]) => {
    setTempCategoricalFilters(selectedValues);
  };

// Confirms and applies the selected categorical filters to the table data view
  const applyCategoricalFilter = () => {
    const allUniqueValues = getColumnUniqueValues().map(v => v.value);

    if (tempCategoricalFilters.length === 0 || tempCategoricalFilters.length === allUniqueValues.length) {
      onFilterApply(columnName, null);
    } else {
      onFilterApply(columnName, {
        column: columnName,
        values: tempCategoricalFilters,
        isActive: true,
        type: 'categorical'
      });
    }

    setTempCategoricalFilters([]);
    setFilterSearchTerm("");
    setOpenFilterColumn(null);
  };

// Updates the parameters (like range or operator) for a numerical data filter
  const updateNumericFilterState = (updates: Partial<NumericFilterState[string]>) => {
    setNumericFilterState(prev => ({
      selectedOperator: prev.selectedOperator || "",
      filterValue: prev.filterValue || "",
      minValue: prev.minValue || "",
      maxValue: prev.maxValue || "",
      ...updates
    }));
  };

// Finalizes and applies a numerical filter based on the current user input
  const handleApplyNumericFilter = () => {
    if (!numericFilterState.selectedOperator) {
      onFilterApply(columnName, null);
      return;
    }

    if (numericFilterState.selectedOperator === 'between' || numericFilterState.selectedOperator === 'not_between') {
      const min = parseFloat(numericFilterState.minValue);
      const max = parseFloat(numericFilterState.maxValue);
      if (!isNaN(min) && !isNaN(max)) {
        onFilterApply(columnName, {
          column: columnName,
          operator: numericFilterState.selectedOperator,
          minValue: min,
          maxValue: max,
          isActive: true,
          type: 'numeric'
        });
      }
    } else {
      const value = parseFloat(numericFilterState.filterValue);
      if (!isNaN(value)) {
        onFilterApply(columnName, {
          column: columnName,
          operator: numericFilterState.selectedOperator,
          value: value,
          isActive: true,
          type: 'numeric'
        });
      }
    }
  };

// Resets the numerical filter state and removes it from the active active filters list
  const handleClearNumericFilter = () => {
    setNumericFilterState({
      selectedOperator: "",
      filterValue: "",
      minValue: "",
      maxValue: ""
    });
    onFilterApply(columnName, null);
  };

// Clears all filter states for the current column, whether categorical or numeric
  const handleClearFilter = () => {
    if (isCategorical) {
      setTempCategoricalFilters([]);
      setFilterSearchTerm("");
    } else {
      handleClearNumericFilter();
    }
    onFilterApply(columnName, null);
  };

// Generates the UI for selecting specific categorical values from a checklist
  const renderCategoricalFilter = () => {
    const uniqueValues = getColumnUniqueValues();
    if (uniqueValues.length === 0) return null;

    const selectedValues = tempCategoricalFilters.length > 0 
      ? tempCategoricalFilters 
      : (currentFilter?.values || []);

    const filteredValues = uniqueValues.filter(option => 
      option.value.toLowerCase().includes(filterSearchTerm.toLowerCase())
    );

    const allUniqueValues = uniqueValues.map(v => v.value);
    const allSelected = selectedValues.length === allUniqueValues.length;

    const handleSelectAll = () => {
      if (allSelected) {
        handleCategoricalFilterChange([]);
      } else {
        handleCategoricalFilterChange(allUniqueValues);
      }
    };

    const handleValueChange = (value: string, checked: boolean) => {
      let newValues;
      if (checked) {
        newValues = [...selectedValues, value];
      } else {
        newValues = selectedValues.filter(v => v !== value);
      }
      handleCategoricalFilterChange(newValues);
    };

    return (
      <>
        <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded">
          <Checkbox
            id={`${columnName}-all`}
            checked={allSelected}
            onCheckedChange={handleSelectAll}
          />
          <Label htmlFor={`${columnName}-all`} className="text-sm font-medium cursor-pointer">
            All
          </Label>
        </div>

        <div className="border-t my-1"></div>

        <div className="max-h-[200px] overflow-y-auto"> 
          {filteredValues.map((option) => {
            const isChecked = allSelected || selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                className="flex items-center justify-between space-x-2 px-2 py-1.5 hover:bg-slate-50 rounded"
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <Checkbox
                    id={`${columnName}-${option.value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleValueChange(option.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`${columnName}-${option.value}`}
                    className="text-sm cursor-pointer truncate flex-1"
                  >
                    {option.value}
                  </Label>
                </div>
                {option.count && (
                  <Badge variant="outline" className="text-xs h-4 ml-2 flex-shrink-0">
                    {option.count}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

// Generates the UI for numerical comparisons, including range and operator selectors
  const renderNumericFilter = () => {
    const stats = column ? { min: column.min, max: column.max, mean: column.mean } : null;

    return (
      <div className="space-y-3">
        {stats && (
          <div className="text-xs text-slate-600 p-2 bg-slate-50 rounded">
            <div>Min: {stats.min}</div>
            <div>Max: {stats.max}</div>
            {stats.mean && <div>Mean: {stats.mean.toFixed(2)}</div>}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Condition</Label>
          <Select
            value={numericFilterState.selectedOperator}
            onValueChange={(value) => updateNumericFilterState({ selectedOperator: value })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {NUMERIC_OPERATORS.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    <span className="text-sm">{op.label}</span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {numericFilterState.selectedOperator && numericFilterState.selectedOperator === 'between' && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={numericFilterState.minValue}
                onChange={(e) => updateNumericFilterState({ minValue: e.target.value })}
                className="h-7 text-xs"
              />
              <Input
                type="number"
                placeholder="Max"
                value={numericFilterState.maxValue}
                onChange={(e) => updateNumericFilterState({ maxValue: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}

        {numericFilterState.selectedOperator && numericFilterState.selectedOperator !== 'between' && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Value</Label>
            <Input
              type="number"
              placeholder="Enter value"
              value={numericFilterState.filterValue}
              onChange={(e) => updateNumericFilterState({ filterValue: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleApplyNumericFilter}
            className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 flex-1"
            disabled={!numericFilterState.selectedOperator ||
              ((numericFilterState.selectedOperator === 'between' || numericFilterState.selectedOperator === 'not_between') && (!numericFilterState.minValue || !numericFilterState.maxValue)) ||
              (!['between', 'not_between'].includes(numericFilterState.selectedOperator) && !numericFilterState.filterValue)
            }
          >
            Apply
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearNumericFilter}
            className="h-7 px-3 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Popover
      open={openFilterColumn === columnName}
      onOpenChange={(open) => {
        setOpenFilterColumn(open ? columnName : null);
        if (!open) {
          setTempCategoricalFilters([]);
          setFilterSearchTerm("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 hover:bg-slate-100 ${currentFilter?.isActive ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Filter by {formatColumnHeader(columnName)}</Label>
            {currentFilter?.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilter}
                className="h-6 px-2 text-xs"
              >
                Clear
              </Button>
            )}
          </div>

          {isCategorical && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input
                placeholder="Search items..."
                className="pl-7 h-7 text-xs"
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {isCategorical && (
          <ScrollArea className="max-h-64">
            <div className="p-2">
              {renderCategoricalFilter()}
            </div>
          </ScrollArea>
        )}

        {isNumeric && (
          <div className="p-3">
            {renderNumericFilter()}
          </div>
        )}

        {isCategorical && (
          <div className="p-3 border-t bg-slate-50">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempCategoricalFilters([]);
                  setOpenFilterColumn(null);
                }}
                className="h-7 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyCategoricalFilter}
                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700"
              >
                OK
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
