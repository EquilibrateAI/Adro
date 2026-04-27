"use client";

import * as React from "react";
import { Database, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
  icon: string;
  type?: string;
}

interface SingleSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  title?: string;
  description?: string;
}

export function SingleSelectDialog({
  open,
  onOpenChange,
  options,
  value,
  onChange,
  title = "Select Data Source",
  description = "Select a single data source to analyze.",
}: SingleSelectDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const modalRef = React.useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.id === value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={modalRef}
        className="max-w-5xl h-[70vh] flex flex-col"
        onClick={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Database className="w-5 h-5 text-slate-600" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Left Panel: Available Options */}
          <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">
                Available Data Sources
              </h4>
              <Badge variant="secondary" className="text-xs">
                {options.length} available
              </Badge>
            </div>
            
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search databases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1 pr-3">
                {filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => onChange(option.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors group",
                      value === option.id
                        ? "bg-blue-50 border border-blue-200 text-blue-700"
                        : "hover:bg-slate-50 border border-transparent text-slate-600"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{option.icon}</span>
                      <span className="truncate">{option.name}</span>
                    </div>
                    {value === option.id && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                ))}
                {filteredOptions.length === 0 && (
                  <div className="text-center py-8 text-sm text-slate-400">
                    No results found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Selection Summary */}
          <div className="flex-1 flex flex-col border border-slate-200 rounded-lg bg-white p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">
                Current Selection
              </h4>
              {value && (
                <button
                  onClick={() => onChange(null)}
                  className="text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
              {selectedOption ? (
                <div className="w-full px-4 text-center animate-in fade-in zoom-in duration-200">
                  <div className="text-4xl mb-4">{selectedOption.icon}</div>
                  <h5 className="font-semibold text-slate-900 mb-1">
                    {selectedOption.name}
                  </h5>
                  <p className="text-xs text-slate-500 mb-4 uppercase tracking-wider">
                    {selectedOption.type || "Database"}
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">
                    <Check className="w-3 h-3" />
                    READY TO ANALYZE
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Database className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">
                    No data source selected
                  </p>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Pick one from the list on the left
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
