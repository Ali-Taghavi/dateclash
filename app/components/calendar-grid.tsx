"use client";

import { format, parseISO, startOfWeek, addDays, isWithinInterval } from "date-fns";
import { type DateRange } from "react-day-picker";
import type { DateAnalysis } from "@/app/types";
import { DateCell } from "./date-cell";

interface CalendarGridProps {
  analysisData: Map<string, DateAnalysis>;
  dateRange: DateRange | undefined;
  onDateClick: (dateStr: string) => void;
  temperatureUnit: 'c' | 'f';
}

export function CalendarGrid({
  analysisData,
  dateRange,
  onDateClick,
  temperatureUnit,
}: CalendarGridProps) {
  const allDates = Array.from(analysisData.keys())
    .map((d) => parseISO(d))
    .sort((a, b) => a.getTime() - b.getTime());

  if (allDates.length === 0) return null;

  const firstDate = allDates[0];
  const lastDate = allDates[allDates.length - 1];

  const firstDayOfWeek = startOfWeek(firstDate, { weekStartsOn: 0 });
  const lastDayOfWeek = startOfWeek(lastDate, { weekStartsOn: 0 });
  const lastSaturday = addDays(lastDayOfWeek, 6);

  const displayStart = firstDayOfWeek;
  const displayEnd = lastSaturday;

  const calendarDays: Array<{ date: Date; dateStr: string | null; data: DateAnalysis | null }> = [];
  let currentDate = displayStart;

  while (currentDate <= displayEnd) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const data = analysisData.get(dateStr) || null;
    calendarDays.push({
      date: currentDate,
      dateStr: data ? dateStr : null,
      data,
    });
    currentDate = addDays(currentDate, 1);
  }

  const isDateInRange = (date: Date): boolean => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
  };

  return (
    <div className="overflow-y-auto max-h-[600px]">
      {/* Weekday Headers - Only visible on lg+ screens */}
      <div className="hidden lg:grid lg:grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div 
            key={day} 
            className="text-center text-sm font-medium text-foreground/60"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid - Responsive columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2 md:gap-2">
        {calendarDays.map((day, index) => {
          const isSelected = isDateInRange(day.date);
          const isEmpty = !day.data;
          const showMonthLabel = day.date.getDate() === 1 || index === 0;

          return (
            <div 
              key={index} 
              className="aspect-square min-h-[160px] sm:min-h-[140px] md:min-h-[130px] lg:min-h-[100px] transition-opacity duration-300"
            >
              {isEmpty ? (
                <div className="h-full p-2 rounded-md border border-foreground/10 bg-background/50 opacity-40 flex flex-col justify-center">
                  <div className="text-xs text-foreground/40">
                    {showMonthLabel && (
                      <span className="uppercase text-[10px] opacity-60 mr-1" suppressHydrationWarning>
                        {format(day.date, "MMM")}
                      </span>
                    )}
                    <span suppressHydrationWarning>{format(day.date, "d")}</span>
                  </div>
                </div>
              ) : (
                <DateCell
                  dateStr={day.dateStr!}
                  data={day.data!}
                  onClick={() => onDateClick(day.dateStr!)}
                  isSelected={isSelected}
                  showMonthLabel={showMonthLabel}
                  temperatureUnit={temperatureUnit}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
