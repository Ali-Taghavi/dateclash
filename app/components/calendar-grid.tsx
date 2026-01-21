"use client";

import { format, parseISO, startOfWeek, addDays, isWithinInterval, isValid } from "date-fns";
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
  
  const { calendarDays } = useMemo(() => {
    const allDates = Array.from(analysisData.keys())
      .map((d) => parseISO(d))
      .sort((a, b) => a.getTime() - b.getTime());

    if (allDates.length === 0) return { calendarDays: [] };

    const firstDate = allDates[0];
    const lastDate = allDates[allDates.length - 1];

    const displayStart = startOfWeek(firstDate, { weekStartsOn: 1 });
    const displayEnd = addDays(startOfWeek(lastDate, { weekStartsOn: 1 }), 6);

    const days = [];
    let currentDate = displayStart;

    while (currentDate <= displayEnd) {
      const dateStr = format(currentDate, "yyyy-MM-dd");
      const data = analysisData.get(dateStr) || null;

      // 1. Calculate Watchlist Conflicts
      const conflicts = data ? watchlistData.filter(loc => {
        const hasPublicHoliday = loc.publicHolidays?.some((h: any) => h.date === dateStr);
        const hasSchoolHoliday = loc.schoolHolidays?.some((sh: any) => {
          const s = parseISO(sh.startDate);
          const e = parseISO(sh.endDate);
          return isValid(s) && isValid(e) && isWithinInterval(currentDate, { start: s, end: e });
        });
        return hasPublicHoliday || hasSchoolHoliday;
      }) : [];

      // 2. Calculate Global Impacts
      let globalImpactCount = 0;
      if (data) {
        const uniqueGlobalEvents = new Set<string>();
        data.holidays.forEach(h => {
           if (h.isGlobalImpact) {
             uniqueGlobalEvents.add(h.name);
           }
        });
        globalImpactCount = uniqueGlobalEvents.size;
      }

      // 3. DETERMINE RISK LEVEL (Traffic Light Logic)
      let riskLevel: 'safe' | 'caution' | 'high' = 'safe';

      if (data) {
        // HIGH RISK (Red): Primary Target Region Public Holiday
        // We check for holidays that are NOT marked as global/strategic injections
        const hasTargetPublicHoliday = data.holidays.some(h => !(h as any).isGlobalImpact);
        
        // CAUTION (Yellow): Secondary factors (Watchlist, School, Industry, or Global Alerts)
        const hasCautionFactors = 
          globalImpactCount > 0 || 
          conflicts.length > 0 || 
          !!data.schoolHoliday || 
          data.industryEvents.length > 0;

        if (hasTargetPublicHoliday) {
          riskLevel = 'high';
        } else if (hasCautionFactors) {
          riskLevel = 'caution';
        }
        // Else remains 'safe' (Green)
      }
      
      days.push({
        date: currentDate,
        dateStr: data ? dateStr : null,
        data,
        conflicts,       
        globalImpactCount,
        riskLevel // Pass this to the component
      });
      currentDate = addDays(currentDate, 1);
    }

    return { calendarDays: days };
  }, [analysisData, watchlistData]); 

  if (calendarDays.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
        <div className="hidden lg:grid lg:grid-cols-7 gap-4 mb-4">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {calendarDays.map((day, index) => {
            const isAnalyzedDate = !!day.data;
            const showMonthLabel = day.date.getDate() === 1 || index === 0;

            return (
              <div 
                key={index} 
                className="min-h-[160px] h-auto transition-all duration-500"
              >
                {!isAnalyzedDate ? (
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
                  <DateCell
                    dateStr={day.dateStr!}
                    data={day.data!}
                    onClick={() => onDateClick(day.dateStr!)}
                    isSelected={true} 
                    showMonthLabel={showMonthLabel}
                    temperatureUnit={temperatureUnit}
                    watchlistConflicts={day.conflicts}
                    globalImpactCount={day.globalImpactCount}
                    riskLevel={day.riskLevel} // Pass the new prop
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