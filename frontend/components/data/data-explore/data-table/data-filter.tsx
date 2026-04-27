"use client";
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Loader2, Database, Hash, Type, X, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import MultiSelect from "@/components/ui/multiselect";
import { toast } from "sonner";
import { fetchDataSources } from "@/services/api/data/sidebar/data-source";
import { getColumnInfo } from "@/services/api/dashboard/text-mode/column-info/column-names";

interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string | string[];
}

interface FilterGroup {
  id: string;
  condition: "AND" | "OR";
  rules: (FilterRule | FilterGroup)[];
}

interface DataSource {
  id: string;
  name: string;
  type: string;
}

interface Column {
  column_name: string;
  type: string;
  unique?: number;
  top_5?: Record<string, number>;
  distribution_string?: Array<Record<string, number>>;
}

interface UniqueValue {
  value: string;
  label: string;
  count?: number;
  [key: string]: string | number | undefined;
}

interface DataSourceConfig {
  icon: string;
  color: string;
  lightColor: string;
}

interface ColumnTypeConfig {
  icon: typeof Hash | typeof Type | typeof Database;
  emoji: string;
  color: string;
  bgColor: string;
}

const DATA_SOURCE_CONFIG: Record<string, DataSourceConfig> = {
  csv: { icon: "📄", color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700 border-blue-200" },
  mysql: { icon: "🐬", color: "bg-orange-500", lightColor: "bg-orange-50 text-orange-700 border-orange-200" },
  postgresql: { icon: "🐘", color: "bg-blue-600", lightColor: "bg-blue-50 text-blue-700 border-blue-200" },
  mongodb: { icon: "🍃", color: "bg-green-500", lightColor: "bg-green-50 text-green-700 border-green-200" },
  sqlite: { icon: "📁", color: "bg-gray-500", lightColor: "bg-gray-50 text-gray-700 border-gray-200" },
  default: { icon: "❓", color: "bg-purple-500", lightColor: "bg-purple-50 text-purple-700 border-purple-200" }
};

const COLUMN_TYPE_CONFIG: Record<string, ColumnTypeConfig> = {
  number: { icon: Hash, emoji: "🔢", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
  string: { icon: Type, emoji: "🅰️", color: "text-green-600", bgColor: "bg-green-50 border-green-200" },
  default: { icon: Database, emoji: "📦", color: "text-gray-600", bgColor: "bg-gray-50 border-gray-200" }
};

const CONDITION_OPTIONS = {
  String: [
    { value: "equals", label: "Equals", description: "Exact match" },
    { value: "not_equals", label: "Not Equals", description: "Does not match" },
    { value: "contains", label: "Contains", description: "Text contains substring" },
    { value: "not_contains", label: "Not Contains", description: "Text does not contain" },
    { value: "starts_with", label: "Starts With", description: "Text begins with" },
    { value: "ends_with", label: "Ends With", description: "Text ends with" },
    { value: "in", label: "In List", description: "Value is in selected items" },
    { value: "not_in", label: "Not In List", description: "Value is not in selected items" },
  ],
  Number: [
    { value: "equals", label: "Equals (=)", description: "Exactly equals" },
    { value: "not_equals", label: "Not Equals (≠)", description: "Does not equal" },
    { value: "greater_than", label: "Greater Than (>)", description: "Value is greater" },
    { value: "greater_than_equal", label: "Greater or Equal (≥)", description: "Value is greater or equal" },
    { value: "less_than", label: "Less Than (<)", description: "Value is less" },
    { value: "less_than_equal", label: "Less or Equal (≤)", description: "Value is less or equal" },
    { value: "between", label: "Between", description: "Value is within range" },
    { value: "not_between", label: "Not Between", description: "Value is outside range" },
    { value: "in", label: "In List", description: "Value is in selected numbers" },
    { value: "not_in", label: "Not In List", description: "Value is not in selected numbers" },
  ]
};

interface DataFilterProps {
  selectedSourceName?: string;
  onFiltersChange?: (filters: FilterGroup | null) => void;
}

// A powerful builder for creating complex, multi-level filter groups and conditions
export const DataFilter = ({ selectedSourceName, onFiltersChange }: DataFilterProps) => {
  const [isQueryRunning, setIsQueryRunning] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);

  // Main filter group state
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    id: "root",
    condition: "AND",
    rules: []
  });

  // Load data sources on mount
  useEffect(() => {
    async function getDataSources() {
      try {
        const data = await fetchDataSources();
        setDataSources(data);
        if (selectedSourceName) {
          const found = data.find((ds: DataSource) => ds.name === selectedSourceName || ds.id === selectedSourceName);
          if (found) setSelectedDataSource(found.id);
        } else if (data.length > 0) {
          setSelectedDataSource(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load data sources:", err);
      }
    }
    getDataSources();
  }, [selectedSourceName]);

  // Load columns when data source changes
  useEffect(() => {
    async function fetchColumns() {
      if (!selectedDataSource) return;
      try {
        const data: unknown = await getColumnInfo(selectedDataSource);
        let colArr: Column[] = [];

        // Normalize and validate the response into Column[]
        if (data && typeof data === "object") {
          // If the response has a 'columns' property and it's an array, use it
          const dataObj = data as Record<string, unknown>;
          if ("columns" in dataObj && Array.isArray(dataObj.columns)) {
            colArr = dataObj.columns as Column[];
          } else if (Array.isArray(data)) {
            // If the response itself is an array, assume it's the columns array
            colArr = data as Column[];
          }
        }

        setColumns(colArr);
      } catch (err) {
        console.error("Failed to load columns:", err);
        setColumns([]);
      }
    }
    fetchColumns();
  }, [selectedDataSource]);

  const getColumnType = (columnName: string): string => {
    const column = columns.find((c) => c.column_name === columnName);
    return column?.type || "String";
  };

  const getColumnData = (columnName: string): Column | undefined => {
    return columns.find((c) => c.column_name === columnName);
  };

  const getDataSourceConfig = (type: string): DataSourceConfig => {
    return DATA_SOURCE_CONFIG[type?.toLowerCase()] || DATA_SOURCE_CONFIG.default;
  };

  const getColumnTypeConfig = (type: string): ColumnTypeConfig => {
    return COLUMN_TYPE_CONFIG[type?.toLowerCase()] || COLUMN_TYPE_CONFIG.default;
  };

  // Get unique values for string columns
// Scans through column stats to compile a list of unique categorical values for filtering
  const getUniqueValues = (column: Column): UniqueValue[] => {
    const options: UniqueValue[] = [];
    
    // Check top_5 first (most common values)
    if (column.top_5) {
      Object.entries(column.top_5).forEach(([value, count]) => {
        options.push({
          value,
          label: `${value} (${count})`,
          count
        });
      });
    }
    
    // Check distribution_string (all unique values)
    if (Array.isArray(column.distribution_string)) {
      column.distribution_string.forEach((item) => {
        const [name, value] = Object.entries(item)[0] || [];
        // Only add if not already in options from top_5
        if (name && !options.some(opt => opt.value === name)) {
          options.push({
            value: name,
            label: `${name} (${value})`,
            count: typeof value === 'number' ? value : 0
          });
        }
      });
    }
    
    // Sort by count descending
    return options.sort((a, b) => (b.count || 0) - (a.count || 0));
  };

  // Generate unique ID
  const generateId = (): string => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add condition to a group
// Inserts a new individual filtering rule into a specific group in the filter tree
  const addConditionToGroup = (groupId: string) => {
    const newRule: FilterRule = {
      id: generateId(),
      field: columns[0]?.column_name || "",
      operator: "equals",
      value: "",
    };

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return {
          ...group,
          rules: [...group.rules, newRule]
        };
      }
      return {
        ...group,
        rules: group.rules.map(rule => 
          'condition' in rule ? updateGroup(rule) : rule
        )
      };
    };

    setFilterGroup(updateGroup(filterGroup));
    toast.success("Condition Added");
  };

  // Add group to a parent group
// Adds a nested container to group multiple related filters with their own logic (AND/OR)
  const addGroupToGroup = (parentGroupId: string) => {
    const newGroup: FilterGroup = {
      id: generateId(),
      condition: "AND",
      rules: []
    };

    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === parentGroupId) {
        return {
          ...group,
          rules: [...group.rules, newGroup]
        };
      }
      return {
        ...group,
        rules: group.rules.map(rule => 
          'condition' in rule ? updateGroup(rule) : rule
        )
      };
    };

    setFilterGroup(updateGroup(filterGroup));
    toast.success("Group Added");
  };

  // Remove rule or group
// Removes a specific rule or an entire group from the filter configuration
  const removeItem = (itemId: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      return {
        ...group,
        rules: group.rules
          .filter(rule => rule.id !== itemId)
          .map(rule => 'condition' in rule ? updateGroup(rule) : rule)
      };
    };

    setFilterGroup(updateGroup(filterGroup));
    toast.success("Item Removed");
  };

  // Update rule field
// Updates the specific column being targeted by a particular filter rule
  const updateRuleField = (ruleId: string, field: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      return {
        ...group,
        rules: group.rules.map(rule => {
          if ('condition' in rule) {
            return updateGroup(rule);
          } else if (rule.id === ruleId) {
            return { ...rule, field, value: "" };
          }
          return rule;
        })
      };
    };

    setFilterGroup(updateGroup(filterGroup));
  };

  // Update rule operator
// Changes the logic operator (e.g., equals, contains) for a given rule
  const updateRuleOperator = (ruleId: string, operator: string) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      return {
        ...group,
        rules: group.rules.map(rule => {
          if ('condition' in rule) {
            return updateGroup(rule);
          } else if (rule.id === ruleId) {
            return { ...rule, operator, value: "" };
          }
          return rule;
        })
      };
    };

    setFilterGroup(updateGroup(filterGroup));
  };

  // Update rule value
// Updates the comparison value that a filter rule uses to evaluate data
  const updateRuleValue = (ruleId: string, value: string | string[]) => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      return {
        ...group,
        rules: group.rules.map(rule => {
          if ('condition' in rule) {
            return updateGroup(rule);
          } else if (rule.id === ruleId) {
            return { ...rule, value };
          }
          return rule;
        })
      };
    };

    setFilterGroup(updateGroup(filterGroup));
  };

  // Update group condition
// Toggles between AND/OR logic for a specific group of rules
  const updateGroupCondition = (groupId: string, condition: "AND" | "OR") => {
    const updateGroup = (group: FilterGroup): FilterGroup => {
      if (group.id === groupId) {
        return { ...group, condition };
      }
      return {
        ...group,
        rules: group.rules.map(rule => 
          'condition' in rule ? updateGroup(rule) : rule
        )
      };
    };

    setFilterGroup(updateGroup(filterGroup));
  };

  // Render value input based on operator and field type
// Determines and renders the appropriate input field based on the rule's type and operator
  const renderValueInput = (rule: FilterRule) => {
    const columnType = getColumnType(rule.field);
    const column = getColumnData(rule.field);

    if (rule.operator === "between") {
      const [min = "", max = ""] = typeof rule.value === 'string' ? rule.value.split('-') : ['', ''];
      return (
        <div className="grid grid-cols-2 gap-1">
          <Input
            type="number"
            placeholder="Min"
            value={min}
            onChange={(e) => {
              const newValue = `${e.target.value}-${max}`;
              updateRuleValue(rule.id, newValue);
            }}
            className="h-8 text-xs"
          />
          <Input
            type="number"
            placeholder="Max"
            value={max}
            onChange={(e) => {
              const newValue = `${min}-${e.target.value}`;
              updateRuleValue(rule.id, newValue);
            }}
            className="h-8 text-xs"
          />
        </div>
      );
    }

    if (["in", "not_in"].includes(rule.operator)) {
      const uniqueValues = column ? getUniqueValues(column) : [];
      // Map UniqueValue[] to the lightweight option shape expected by MultiSelect
      const msOptions = uniqueValues.map(({ value, label }) => ({ value, label }));
      return (
        <MultiSelect
          options={msOptions}
          onChange={(options) => updateRuleValue(rule.id, options.map((opt) => opt.value))}
          placeholder="Select values..."
          className="h-8"
        />
      );
    }

    // For string columns, show dropdown with unique values
    if (columnType === "String" && column) {
      const uniqueValues = getUniqueValues(column);
      
      return (
        <div className="space-y-1">
          <Input
            type="text"
            value={typeof rule.value === 'string' ? rule.value : ''}
            onChange={(e) => updateRuleValue(rule.id, e.target.value)}
            placeholder="Enter value or select..."
            className="h-8 text-xs"
          />
          {uniqueValues.length > 0 && (
            <Select
              value=""
              onValueChange={(value) => updateRuleValue(rule.id, value)}
            >
              <SelectTrigger className="h-6 text-xs">
                <SelectValue placeholder="Select from values..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {uniqueValues.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm">{option.value}</span>
                        {option.count && (
                          <Badge variant="outline" className="text-xs ml-2">
                            {option.count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </div>
      );
    }

    return (
      <Input
        type={columnType === "Number" ? "number" : "text"}
        value={typeof rule.value === 'string' ? rule.value : ''}
        onChange={(e) => updateRuleValue(rule.id, e.target.value)}
        placeholder="Enter value..."
        className="h-8 text-xs"
      />
    );
  };

  // Render individual rule row
// Generates the UI row for an individual filter rule, including field and operator selectors
  const renderRule = (rule: FilterRule, groupId: string, index: number, groupCondition: "AND" | "OR"): React.ReactNode => {
    const columnType = getColumnType(rule.field);
    const conditionOptions = CONDITION_OPTIONS[columnType as keyof typeof CONDITION_OPTIONS] || CONDITION_OPTIONS.String;

    return (
      <div key={rule.id}>
        {index > 0 && (
          <div className="flex justify-center py-1">
            <Badge className="bg-blue-600 text-white text-xs px-2 py-1">
              {groupCondition}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
          {/* Field Selection */}
          <Select value={rule.field} onValueChange={(value) => updateRuleField(rule.id, value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {columns.map((col) => {
                  const typeConfig = getColumnTypeConfig(col.type);
                  return (
                    <SelectItem key={col.column_name} value={col.column_name}>
                      <div className="flex items-center gap-2">
                        <typeConfig.icon className="w-3 h-3" />
                        <span className="text-sm">{col.column_name}</span>
                        <Badge variant="outline" className="text-xs h-4 ml-auto">
                          {col.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Operator Selection */}
          <Select value={rule.operator} onValueChange={(value) => updateRuleOperator(rule.id, value)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Operator" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {conditionOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-xs text-slate-500">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Value Input */}
          {renderValueInput(rule)}

          {/* Delete Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeItem(rule.id)}
            className="h-8 px-2 text-xs text-red-600 hover:bg-red-50"
          >
            <X className="w-3 h-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    );
  };

  // Render group recursively
// Recursively builds the nested UI structure representing the entire filter group hierarchy
  const renderGroup = (group: FilterGroup, level: number = 0): React.ReactElement => {
    const borderClass = level === 0 ? "border-slate-200" : "border-blue-200";
    const bgClass = level === 0 ? "bg-white" : "bg-blue-50/30";

    return (
      <div key={group.id} className={`border-2 ${borderClass} rounded-lg p-3 ${bgClass} shadow-sm`}>
        {/* Group header with condition selector and actions */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Select 
              value={group.condition} 
              onValueChange={(value: "AND" | "OR") => updateGroupCondition(group.id, value)}
            >
              <SelectTrigger className="w-20 h-6 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
            
            {group.rules.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {group.rules.length} items
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              onClick={() => addConditionToGroup(group.id)}
              className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add condition
            </Button>
            <Button
              onClick={() => addGroupToGroup(group.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white h-6 px-2 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add group
            </Button>
            {group.id !== "root" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeItem(group.id)}
                className="h-6 px-2 text-xs text-red-600 hover:bg-red-50"
              >
                <X className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Render rules and nested groups */}
        <div className="space-y-2">
          {group.rules.map((item, index) => {
            if ('condition' in item) {
              return (
                <div key={item.id}>
                  {index > 0 && (
                    <div className="flex justify-center py-1">
                      <Badge className="bg-blue-600 text-white text-xs px-2 py-1">
                        {group.condition}
                      </Badge>
                    </div>
                  )}
                  {renderGroup(item, level + 1)}
                </div>
              );
            }
            return renderRule(item, group.id, index, group.condition);
          })}
        </div>

        {/* Empty state */}
        {group.rules.length === 0 && (
          <div className="text-center py-4 text-slate-500 text-sm border-2 border-dashed border-slate-300 rounded-lg">
            No conditions added yet. Click &quot;Add condition&quot; or &quot;Add group&quot; above.
          </div>
        )}
      </div>
    );
  };

// Constructs a readable string representation of the currently built complex filter logic
  const generateQueryEquation = (): string => {
    const generateGroupEquation = (group: FilterGroup): string => {
      if (group.rules.length === 0) return "";
      
      const parts = group.rules.map(item => {
        if ('condition' in item) {
          const subEquation = generateGroupEquation(item);
          return subEquation ? `(${subEquation})` : "";
        }
        const valueDisplay = Array.isArray(item.value) ? `[${item.value.join(', ')}]` : item.value;
        return `${item.field} ${item.operator.replace(/_/g, ' ')} ${valueDisplay}`;
      }).filter(Boolean);
      
      return parts.join(` ${group.condition} `);
    };

    return generateGroupEquation(filterGroup) || "No conditions";
  };

// Resets the entire filter builder to its original empty state
  const handleClearAllFilters = () => {
    setFilterGroup({
      id: "root",
      condition: "AND",
      rules: []
    });
    onFiltersChange?.(null);
    toast.success("All Filters Cleared");
  };

// Validates the current configuration and passes the final filter structure to the parent
  const handleApplyFilters = () => {
    if (filterGroup.rules.length === 0) {
      toast.error("No Conditions", {
        description: "Please add at least one filter condition before applying"
      });
      return;
    }
    
    setIsQueryRunning(true);
    toast.success("Applying Filters");
    onFiltersChange?.(filterGroup);
    
    setTimeout(() => {
      setIsQueryRunning(false);
    }, 1000);
  };

  // Get current data source info
  const currentDataSource = dataSources.find(ds => ds.id === selectedDataSource);
  const dataSourceConfig = currentDataSource ? getDataSourceConfig(currentDataSource.type) : null;

  return (
    <Card className="shadow-lg h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 max-w-none w-full">
      <CardHeader className="border-b border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div>
              <div className="text-lg font-bold text-slate-800">Advanced Filters</div>
              <CardDescription className="text-xs text-slate-600">
                Build complex filter conditions for data analysis
              </CardDescription>
            </div>
          </CardTitle>
          
          {/* Data Source Badge */}
          {currentDataSource && (
            <Badge variant="outline" className={`${dataSourceConfig?.lightColor} px-3 py-1`}>
              <span className="mr-1">{dataSourceConfig?.icon}</span>
              {currentDataSource.name}
              <span className="ml-2 text-xs opacity-75">{currentDataSource.type}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col p-4">
        {/* Filter Builder */}
        <div className="flex-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-slate-700">Filter Builder</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllFilters}
              disabled={filterGroup.rules.length === 0}
              className="h-6 px-2 text-xs"
            >
              Clear All Filters
            </Button>
          </div>
          
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              {renderGroup(filterGroup)}
            </ScrollArea>
          </div>

          {/* Query Display */}
          {filterGroup.rules.length > 0 && (
            <div className="bg-slate-100 p-3 rounded-lg border">
              <Label className="text-xs font-semibold text-slate-700 mb-2 block">Generated Query:</Label>
              <div className="font-mono text-sm text-slate-800 bg-white p-2 rounded border">
                {generateQueryEquation()}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-200">
          <Button
            onClick={handleApplyFilters}
            className="bg-green-600 hover:bg-green-700 text-white h-8"
            disabled={isQueryRunning || filterGroup.rules.length === 0}
          >
            {isQueryRunning ? (
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-2" />
            )}
            Apply Filters
          </Button>
          <Button
            variant="outline"
            className="h-8"
            onClick={handleClearAllFilters}
            disabled={filterGroup.rules.length === 0}
          >
            Clear All Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};