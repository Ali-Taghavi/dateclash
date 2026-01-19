"use client";

import * as React from "react";
import { format } from "date-fns";
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
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  // Handle responsive calendar months
  React.useEffect(() => {
    const updateMonths = () => setNumberOfMonths(window.innerWidth >= 640 ? 2 : 1);
    updateMonths();
    window.addEventListener("resize", updateMonths);
    return () => window.removeEventListener("resize", updateMonths);
  }, []);

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
              "p-3 h-auto",
              
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
          {/* Tighter padding container (p-3 instead of p-4, removed space-y-4) */}
          <div className="p-3">
            
            {/* Calendar with European Start (Monday) */}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={numberOfMonths}
              weekStartsOn={1} 
            />

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-foreground/5">
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