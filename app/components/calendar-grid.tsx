"use client";

import { format, parseISO, startOfWeek, addDays, isWithinInterval } from "date-fns";
import { type DateRange } from "react-day-picker";
import type { DateAnalysis } from "@/app/types";
import { DateCell } from "./date-cell";
import { useMemo } from "react";

interface CalendarGridProps {
  analysisData: Map<string, DateAnalysis>;
  dateRange: DateRange | undefined;
  onDateClick: (dateStr: string) => void;
  temperatureUnit: 'c' | 'f';
  watchlistData?: any[]; 
}

export function CalendarGrid({
  analysisData,
  dateRange,
  onDateClick,
  temperatureUnit,
  watchlistData = [],
}: CalendarGridProps) {
  
  // 1. Memoized calculation of the date range based on analysis results
  const { calendarDays } = useMemo(() => {
    const allDates = Array.from(analysisData.keys())
      .map((d) => parseISO(d))
      .sort((a, b) => a.getTime() - b.getTime());

    if (allDates.length === 0) return { calendarDays: [] };

    const firstDate = allDates[0];
    const lastDate = allDates[allDates.length - 1];

    // Calculate display grid (full weeks Sun-Sat)
    const displayStart = startOfWeek(firstDate, { weekStartsOn: 0 });
    const displayEnd = addDays(startOfWeek(lastDate, { weekStartsOn: 0 }), 6);

    const days = [];
    let currentDate = displayStart;

    while (currentDate <= displayEnd) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const data = analysisData.get(dateStr) || null;
      
      days.push({
        date: currentDate,
        dateStr: data ? dateStr : null,
        data,
      });
      currentDate = addDays(currentDate, 1);
    }

    return { calendarDays: days };
  }, [analysisData]);

  if (calendarDays.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Standalone month indicators removed per request */}

      <div className="overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
        {/* Desktop Header: Days of Week */}
        <div className="hidden lg:grid lg:grid-cols-7 gap-4 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
              {day}
            </div>
          ))}
        </div>

        {/* Optimized Responsive Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {calendarDays.map((day, index) => {
            const isAnalyzedDate = !!day.data;
            
            // Month label logic: show month if it's the 1st of the month or the first tile in the grid
            const showMonthLabel = day.date.getDate() === 1 || index === 0;

            // Conflict Logic per day
            const dayConflicts = watchlistData.filter(loc => {
              if (!day.dateStr) return false;
              const hasPublicHoliday = loc.publicHolidays?.some((h: any) => h.date === day.dateStr);
              const hasSchoolHoliday = loc.schoolHolidays?.some((h: any) => 
                h.startDate && h.endDate && 
                isWithinInterval(parseISO(day.dateStr!), { 
                  start: parseISO(h.startDate), 
                  end: parseISO(h.endDate) 
                })
              );
              return hasPublicHoliday || hasSchoolHoliday;
            });

            return (
              <div 
                key={index} 
                className="min-h-[160px] h-auto transition-all duration-500"
              >
                {!isAnalyzedDate ? (
                  // Empty State for padding dates
                  <div className="h-full p-4 rounded-3xl border border-dashed border-foreground/5 bg-foreground/[0.01] opacity-20 flex flex-col items-center justify-center">
                    <div className="text-[10px] font-bold opacity-40">
                      {showMonthLabel && (
                        <span className="uppercase mr-1" suppressHydrationWarning>
                          {format(day.date, "MMM")}
                        </span>
                      )}
                      <span suppressHydrationWarning>{format(day.date, "d")}</span>
                    </div>
                  </div>
                ) : (
                  // Active Date Cell - month is indicated via showMonthLabel prop
                  <DateCell
                    dateStr={day.dateStr!}
                    data={day.data!}
                    onClick={() => onDateClick(day.dateStr!)}
                    isSelected={true} 
                    showMonthLabel={showMonthLabel}
                    temperatureUnit={temperatureUnit}
                    watchlistConflicts={dayConflicts}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}