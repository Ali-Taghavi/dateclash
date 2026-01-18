"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "./button"; 
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Initialize inputs
  const [startInput, setStartInput] = React.useState("");
  const [endInput, setEndInput] = React.useState("");
  
  const [focusedInput, setFocusedInput] = React.useState<"start" | "end" | null>(null);
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  // Sync state with props
  React.useEffect(() => {
    setStartInput(dateRange?.from ? format(dateRange.from, "MM/dd/yyyy") : "");
    setEndInput(dateRange?.to ? format(dateRange.to, "MM/dd/yyyy") : "");
  }, [dateRange]);

  // Handle responsive calendar months
  React.useEffect(() => {
    const updateMonths = () => setNumberOfMonths(window.innerWidth >= 640 ? 2 : 1);
    updateMonths();
    window.addEventListener("resize", updateMonths);
    return () => window.removeEventListener("resize", updateMonths);
  }, []);

  const handleInputChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: "from" | "to"
  ) => {
    setter(value);
    const parsed = parse(value, "MM/dd/yyyy", new Date());
    if (isValid(parsed)) {
      onDateRangeChange({
        from: field === "from" ? parsed : dateRange?.from,
        to: field === "to" ? parsed : dateRange?.to,
      });
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              // Layout: Match neighboring inputs exactly
              "w-full justify-start text-left font-normal",
              "p-3 h-auto", // Key Fix: Use padding for height, not fixed h-10
              
              // Visuals: Match border radius and colors
              "rounded-xl border border-foreground/10",
              "bg-background hover:bg-background", 
              "shadow-none",
              
              // Text Styling
              !dateRange && "text-muted-foreground",
              
              // Focus State
              "focus-visible:ring-2 focus-visible:ring-[var(--teal-primary)]/20 transition-all"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            {dateRange?.from ? (
              dateRange.to ? (
                <span suppressHydrationWarning>
                  {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                </span>
              ) : (
                <span suppressHydrationWarning>
                  {format(dateRange.from, "LLL dd, y")}
                </span>
              )
            ) : (
              <span className="opacity-50">Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent 
          className="w-full max-w-[90vw] sm:max-w-none sm:w-auto p-0" 
          align="end"
        >
          <div className="p-4 space-y-4">
            {/* Manual Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-50">Start</label>
                <input
                  type="text"
                  value={startInput}
                  onChange={(e) => handleInputChange(e.target.value, setStartInput, "from")}
                  onFocus={() => setFocusedInput("start")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="MM/DD/YYYY"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm bg-background transition-all outline-none",
                    focusedInput === "start" 
                      ? "border-[var(--teal-primary)] ring-1 ring-[var(--teal-primary)]/20" 
                      : "border-foreground/10"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider opacity-50">End</label>
                <input
                  type="text"
                  value={endInput}
                  onChange={(e) => handleInputChange(e.target.value, setEndInput, "to")}
                  onFocus={() => setFocusedInput("end")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="MM/DD/YYYY"
                  className={cn(
                    "w-full px-3 py-2 rounded-lg border text-sm bg-background transition-all outline-none",
                    focusedInput === "end" 
                      ? "border-[var(--teal-primary)] ring-1 ring-[var(--teal-primary)]/20" 
                      : "border-foreground/10"
                  )}
                />
              </div>
            </div>

            {/* Calendar */}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={numberOfMonths}
            />

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-foreground/5">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground/60 hover:text-foreground transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--teal-primary)] text-white rounded-lg hover:bg-[var(--teal-dark)] transition-colors shadow-sm"
              >
                Apply Range
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}