"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useNavigation, type MonthCaptionProps } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CustomCaption(props: MonthCaptionProps) {
  const { calendarMonth } = props;
  const { goToMonth, nextMonth, previousMonth } = useNavigation();

  return (
    <div className="flex justify-center items-center gap-2 mb-4">
      <button
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
          "text-teal-600 dark:text-teal-400"
        )}
        type="button"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      <div className="text-sm font-bold text-[var(--text-primary)] min-w-[140px] text-center" suppressHydrationWarning>
        {format(calendarMonth.date, "MMMM yyyy")}
      </div>

      <button
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
          "hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
          "text-teal-600 dark:text-teal-400"
        )}
        type="button"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
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
      className={cn("rdp p-3", className)}
      // This is critical to hide the duplicate arrows in v9
      hideNavigation
      classNames={{
        ...classNames,
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-md transition-colors"
        ),
        // Match the class names we used in global.css
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