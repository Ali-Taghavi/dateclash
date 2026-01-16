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
  const [startInput, setStartInput] = React.useState(
    dateRange?.from ? format(dateRange.from, "MM/dd/yyyy") : ""
  );
  const [endInput, setEndInput] = React.useState(
    dateRange?.to ? format(dateRange.to, "MM/dd/yyyy") : ""
  );
  const [focusedInput, setFocusedInput] = React.useState<"start" | "end" | null>(null);
  const [numberOfMonths, setNumberOfMonths] = React.useState(2);

  // Update inputs when dateRange changes externally
  React.useEffect(() => {
    if (dateRange?.from) {
      setStartInput(format(dateRange.from, "MM/dd/yyyy"));
    } else {
      setStartInput("");
    }
    if (dateRange?.to) {
      setEndInput(format(dateRange.to, "MM/dd/yyyy"));
    } else {
      setEndInput("");
    }
  }, [dateRange]);

  // Responsive numberOfMonths based on screen size
  React.useEffect(() => {
    const updateMonths = () => {
      setNumberOfMonths(window.innerWidth >= 640 ? 2 : 1);
    };
    updateMonths();
    window.addEventListener("resize", updateMonths);
    return () => window.removeEventListener("resize", updateMonths);
  }, []);

  const handleStartInputChange = (value: string) => {
    setStartInput(value);
    const parsed = parse(value, "MM/dd/yyyy", new Date());
    if (isValid(parsed)) {
      const newRange: DateRange = {
        from: parsed,
        to: dateRange?.to,
      };
      onDateRangeChange(newRange);
    }
  };

  const handleEndInputChange = (value: string) => {
    setEndInput(value);
    const parsed = parse(value, "MM/dd/yyyy", new Date());
    if (isValid(parsed)) {
      const newRange: DateRange = {
        from: dateRange?.from,
        to: parsed,
      };
      onDateRangeChange(newRange);
    }
  };

  const handleSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleApply = () => {
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              "h-10 px-3",
              !dateRange && "text-[var(--text-secondary)]",
              "data-[state=open]:border-[var(--teal-primary)]"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <span suppressHydrationWarning>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </span>
              ) : (
                <span suppressHydrationWarning>
                  {format(dateRange.from, "LLL dd, y")}
                </span>
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-full max-w-[90vw] sm:max-w-none sm:w-auto p-3 sm:p-6" 
          align="center"
          alignOffset={0}
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Input Fields */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Start
                </label>
                <input
                  type="text"
                  value={startInput}
                  onChange={(e) => handleStartInputChange(e.target.value)}
                  onFocus={() => setFocusedInput("start")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="MM/DD/YYYY"
                  className={cn(
                    "w-full px-2 sm:px-3 py-2 rounded-md border text-sm",
                    "bg-[var(--background)] text-[var(--text-primary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]",
                    focusedInput === "start"
                      ? "border-[var(--teal-primary)]"
                      : "border-[var(--border-color)]"
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  End
                </label>
                <input
                  type="text"
                  value={endInput}
                  onChange={(e) => handleEndInputChange(e.target.value)}
                  onFocus={() => setFocusedInput("end")}
                  onBlur={() => setFocusedInput(null)}
                  placeholder="MM/DD/YYYY"
                  className={cn(
                    "w-full px-2 sm:px-3 py-2 rounded-md border text-sm",
                    "bg-[var(--background)] text-[var(--text-primary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]",
                    focusedInput === "end"
                      ? "border-[var(--teal-primary)]"
                      : "border-[var(--border-color)]"
                  )}
                />
              </div>
            </div>

            {/* Calendar */}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || new Date()}
              selected={dateRange}
              onSelect={handleSelect}
              numberOfMonths={numberOfMonths}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-[var(--teal-primary)] hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium bg-[var(--teal-primary)] text-white rounded-md hover:bg-[var(--teal-dark)] transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
