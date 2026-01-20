"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type MonthCaptionProps } from "react-day-picker";
import { format, setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CustomCaption(props: MonthCaptionProps) {
  const { calendarMonth } = props;
  const { goToMonth, nextMonth, previousMonth } = useNavigation();

  // Generate Year Options (Current Year - 1 to +5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);
  
  // Generate Month Options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(2000, i, 1), "MMMM")
  }));

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(event.target.value, 10);
    const newDate = setYear(calendarMonth.date, newYear);
    goToMonth(newDate);
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(event.target.value, 10);
    const newDate = setMonth(calendarMonth.date, newMonth);
    goToMonth(newDate);
  };

  return (
    <div className="flex justify-between items-center gap-1 mb-4 px-1">
      <button
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded-md transition-colors border border-input bg-background shadow-sm",
          "hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
          "text-foreground/70"
        )}
        type="button"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      <div className="flex items-center gap-2">
        {/* Month Dropdown */}
        <div className="relative group">
            <select
              value={calendarMonth.date.getMonth()}
              onChange={handleMonthChange}
              className="appearance-none bg-transparent font-bold text-sm cursor-pointer hover:text-[var(--teal-primary)] transition-colors pr-1 focus:outline-none text-center"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
        </div>

        {/* Year Dropdown */}
        <div className="relative group">
            <select
              value={calendarMonth.date.getFullYear()}
              onChange={handleYearChange}
              className="appearance-none bg-transparent font-bold text-sm cursor-pointer hover:text-[var(--teal-primary)] transition-colors focus:outline-none"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
        </div>
      </div>

      <button
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          "h-7 w-7 flex items-center justify-center rounded-md transition-colors border border-input bg-background shadow-sm",
          "hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
          "text-foreground/70"
        )}
        type="button"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      fixedWeeks // 👈 THIS PREVENTS THE JUMPING LAYOUT
      className={cn("rdp p-3", className)}
      hideNavigation
      classNames={{
        ...classNames,
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "hidden", // We use CustomCaption, so hide default
        caption_label: "hidden",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-md transition-colors"
        ),
        range_start: "rdp-day_range_start",
        range_end: "rdp-day_range_end",
        range_middle: "rdp-day_range_middle",
        selected: "rdp-day_selected",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
      }}
      components={{
        MonthCaption: CustomCaption,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };