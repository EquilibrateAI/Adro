import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface CustomSelectProps<T extends { value: string | number; label: string }> {
    value: string | number | null;
    onChange: (value: T["value"]) => void;
    disabled?: boolean;
    placeholder?: string;
    options: T[];
    renderOption: (option: T) => React.ReactNode;
    renderValue: (option: T) => React.ReactNode;
}

// A searchable dropdown selection component with tooltip support for long labels
export function CustomSelect<T extends { value: string | number; label: string }>({
    value,
    onChange,
    disabled,
    placeholder,
    options,
    renderOption,
    renderValue
}: CustomSelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [hoveredValue, setHoveredValue] = useState<string | number | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);

    const filteredOptions = options.filter((opt) =>
        opt.label?.toLowerCase?.().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="w-full h-8 px-3 text-sm border border-slate-300 rounded-md bg-white text-left focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {selectedOption ? renderValue(selectedOption) : <span className="text-slate-400 truncate">{placeholder}</span>}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-auto" />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 flex flex-col">
                    
                    {/* Fixed Search Input */}
                    <div className="flex-shrink-0 p-2 border-b border-slate-200 bg-slate-50">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="w-full px-2 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                    </div>

                    {/* Scrollable Content */}
               <div className="flex-1 overflow-y-auto custom-select-scroll">

                        {filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                className="relative group"
                                onMouseEnter={() => setHoveredValue(option.value)}
                                onMouseLeave={() => setHoveredValue(null)}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left hover:bg-slate-100 focus:bg-slate-100 focus:outline-none transition-colors truncate ${
                                        option.value === value ? 'bg-slate-50' : ''
                                    }`}
                                >
                                    {renderOption(option)}
                                </button>

                                {/* Tooltip */}
                                {hoveredValue === option.value && (
                                    <div className="absolute left-0 top-full mt-1 bg-slate-800 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap z-50 pointer-events-none max-w-xs break-words whitespace-normal">
                                        {option.label}
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-400">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Demo Component
// A demonstration component for the CustomSelect
export default function Demo() {
    const [selectedValue, setSelectedValue] = useState<string | null>(null);

    const options = [
        { value: "opt1", label: "This is a very long option text that should show in tooltip" },
        { value: "opt2", label: "Another long option with detailed description here" },
        { value: "opt3", label: "Short" },
        { value: "opt4", label: "Yet another extremely long option text that demonstrates the tooltip functionality" },
        { value: "opt5", label: "Final option" },
    ];

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            <div className="max-w-md">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select an option</label>
                <CustomSelect
                    value={selectedValue}
                    onChange={setSelectedValue}
                    placeholder="Choose one..."
                    options={options}
                    renderOption={(opt) => opt.label}
                    renderValue={(opt) => opt.label}
                />
            </div>
        </div>
    );
}