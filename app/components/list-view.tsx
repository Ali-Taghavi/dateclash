"use client";

import { useMemo } from "react";
import { format, parseISO, isWithinInterval, isValid } from "date-fns";
import { Cloud, GraduationCap, Landmark, AlertTriangle, Globe } from "lucide-react";
import { DateAnalysis } from "@/app/types"; 
import { cn, formatTemperature } from "@/lib/utils";
import { getGlobalImpact } from "@/app/lib/cultural-impacts";

interface ListViewProps {
  analysisData: Map<string, DateAnalysis>;
  onDateClick: (dateStr: string) => void;
  temperatureUnit: 'c' | 'f';
  watchlistData?: any[];
}

export function ListView({
  analysisData,
  onDateClick,
  temperatureUnit,
  watchlistData = [],
}: ListViewProps) {

  const groupedDays = useMemo(() => {
    const allDates = Array.from(analysisData.keys())
      .map((d) => parseISO(d))
      .sort((a, b) => a.getTime() - b.getTime());

    const groups: Record<string, { date: Date; dateStr: string; data: DateAnalysis; conflicts: any[]; globalImpactCount: number }[]> = {};

    allDates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const data = analysisData.get(dateStr);
      if (!data) return;

      const conflicts = watchlistData.filter(loc => {
        const hasPublicHoliday = loc.publicHolidays?.some((h: any) => h.date === dateStr);
        const hasSchoolHoliday = loc.schoolHolidays?.some((sh: any) => {
          const s = parseISO(sh.startDate);
          const e = parseISO(sh.endDate);
          return isValid(s) && isValid(e) && isWithinInterval(date, { start: s, end: e });
        });
        return hasPublicHoliday || hasSchoolHoliday;
      });

      // STRICT LOGIC: Only count if it's a Major Religious/Cultural Holiday
      const globalImpacts = new Set<string>();
      data.holidays.forEach(h => {
         const impact = getGlobalImpact(h.name);
         if (impact) {
           globalImpacts.add(impact.name);
         }
      });
      conflicts.forEach(loc => {
         loc.publicHolidays?.filter((h: any) => h.date === dateStr).forEach((h: any) => {
           const impact = getGlobalImpact(h.name);
           if (impact) globalImpacts.add(impact.name);
         });
      });

      const monthKey = format(date, "MMMM yyyy");
      if (!groups[monthKey]) groups[monthKey] = [];
      
      groups[monthKey].push({ date, dateStr, data, conflicts, globalImpactCount: globalImpacts.size });
    });

    return groups;
  }, [analysisData, watchlistData]);

  if (Object.keys(groupedDays).length === 0) return null;

  return (
    <div className="space-y-8 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
      {Object.entries(groupedDays).map(([month, days]) => (
        <div key={month} className="space-y-3">
          <h3 className="sticky top-0 z-10 bg-background/95 backdrop-blur py-3 text-xs font-black uppercase tracking-[0.2em] text-foreground/50 border-b border-foreground/5">
            {month}
          </h3>
          
          <div className="grid grid-cols-1 gap-2">
            {days.map(({ date, dateStr, data, conflicts, globalImpactCount }) => {
              const temp = data.weather?.history_data?.[0]?.temp_max ?? data.weather?.avg_temp_high_c;
              const hasWeather = typeof temp === 'number';

              return (
                <button
                  key={dateStr}
                  onClick={() => onDateClick(dateStr)}
                  className={cn(
                    "flex items-center gap-4 w-full p-3 rounded-xl border transition-all group text-left relative overflow-hidden",
                    "bg-background border-foreground/5",
                    "hover:bg-foreground/[0.02] hover:border-[var(--teal-primary)]/30 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-lg border shrink-0 shadow-sm transition-colors",
                    "bg-foreground/[0.03] border-foreground/10"
                  )}>
                    <span className="text-[9px] font-black uppercase text-foreground/40 leading-none">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-xl font-black text-foreground leading-none mt-1">
                      {format(date, "d")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {(data.holidays.length > 0 || data.schoolHoliday || conflicts.length > 0 || globalImpactCount > 0) && (
                      <div className="flex flex-wrap items-center gap-2">
                         {/* Amber Globe - Only for strict matches */}
                         {globalImpactCount > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/10">
                            <Globe className="w-3 h-3" />
                            {globalImpactCount} Global Impact{globalImpactCount > 1 ? 's' : ''}
                          </span>
                        )}

                        {conflicts.length > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/10">
                            <AlertTriangle className="w-3 h-3" />
                            {conflicts.length} Watchlist
                          </span>
                        )}
                        
                        {data.schoolHoliday && (
                           <span className="flex items-center gap-1 text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10">
                             <GraduationCap className="w-3 h-3" /> School
                           </span>
                        )}
                        {data.holidays.map((h, i) => (
                          <span key={i} className="flex items-center gap-1 text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/10 truncate max-w-[150px]">
                            <Landmark className="w-3 h-3 shrink-0" /> {h.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {data.industryEvents.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                         {data.industryEvents.map((e, i) => (
                           <div key={i} className="flex items-center gap-1.5">
                              <div className={cn(
                                "w-2 h-2 rounded-full ring-1 ring-background/50",
                                e.is_projected ? "bg-gray-400 dark:bg-gray-500" : e.isRadarEvent ? "bg-rose-500" : "bg-indigo-500"
                              )} />
                              <span className={cn(
                                "text-xs font-medium truncate max-w-[200px] sm:max-w-[300px]",
                                e.is_projected ? "text-foreground/40 italic" : "text-foreground/80"
                              )}>
                                {e.name} {e.is_projected && <span className="text-[9px] opacity-70 not-italic ml-1">(Est. {e.projected_from})</span>}
                              </span>
                           </div>
                         ))}
                      </div>
                    ) : (
                       <span className="text-[10px] text-foreground/30 font-medium italic">No industry events</span>
                    )}
                  </div>

                  {hasWeather && (
                    <div className="hidden sm:flex flex-col items-end shrink-0 pl-2 border-l border-foreground/5">
                      <div className="flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-sky-500 opacity-50" />
                        <span className="text-sm font-black text-foreground/70">
                          {formatTemperature(temp, temperatureUnit)}
                        </span>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}