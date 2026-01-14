"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerRangeProps, useNavigation, type CaptionProps } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerRangeProps;

function CustomCaption(props: CaptionProps) {
  const { calendarMonth } = props;
  const { goToMonth, nextMonth, previousMonth } = useNavigation();

  return (
    <div className="flex justify-center items-center gap-2 mb-4">
      <button
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          "h-6 w-6 bg-transparent p-0 hover:opacity-70 transition-opacity disabled:opacity-30",
          "inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed",
          "text-[var(--text-secondary)]"
        )}
        type="button"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="text-sm font-semibold text-[var(--text-primary)] min-w-[140px] text-center">
        {format(calendarMonth.date, "MMMM yyyy")}
      </div>
      <button
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          "h-6 w-6 bg-transparent p-0 hover:opacity-70 transition-opacity disabled:opacity-30",
          "inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed",
          "text-[var(--text-secondary)]"
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
      className={cn("rdp", className)}
      classNames={classNames}
      components={{
        Caption: CustomCaption,
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
