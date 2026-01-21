"use client";

import { useMemo } from "react";
import { format, parseISO, isWithinInterval, isValid } from "date-fns";
import { Cloud, GraduationCap, Landmark, AlertTriangle, Globe, CheckCircle2 } from "lucide-react";
import { DateAnalysis } from "@/app/types"; 
import { cn, formatTemperature } from "@/lib/utils";

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

    const groups: Record<string, { 
      date: Date; 
      dateStr: string; 
      data: DateAnalysis; 
      conflicts: any[]; 
      globalImpactCount: number;
      riskLevel: 'safe' | 'caution' | 'high'; // Added Risk Level
    }[]> = {};

    allDates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const data = analysisData.get(dateStr);
      if (!data) return;

      // 1. Calculate Watchlist Conflicts
      const conflicts = watchlistData.filter(loc => {
        const hasPublicHoliday = loc.publicHolidays?.some((h: any) => h.date === dateStr);
        const hasSchoolHoliday = loc.schoolHolidays?.some((sh: any) => {
          const s = parseISO(sh.startDate);
          const e = parseISO(sh.endDate);
          return isValid(s) && isValid(e) && isWithinInterval(date, { start: s, end: e });
        });
        return hasPublicHoliday || hasSchoolHoliday;
      });

      // 2. Calculate Global Impacts
      const uniqueGlobalEvents = new Set<string>();
      data.holidays.forEach(h => {
         if (h.isGlobalImpact) {
           uniqueGlobalEvents.add(h.name);
         }
      });
      const globalImpactCount = uniqueGlobalEvents.size;

      // 3. DETERMINE RISK LEVEL (Traffic Light Logic)
      let riskLevel: 'safe' | 'caution' | 'high' = 'safe';

      // HIGH RISK (Red): Primary Target Region Public Holiday
      const hasTargetPublicHoliday = data.holidays.some(h => !(h as any).isGlobalImpact);
      
      // CAUTION (Yellow): Secondary factors
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

      const monthKey = format(date, "MMMM yyyy");
      if (!groups[monthKey]) groups[monthKey] = [];
      
      groups[monthKey].push({ 
        date, 
        dateStr, 
        data, 
        conflicts, 
        globalImpactCount,
        riskLevel 
      });
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
            {days.map(({ date, dateStr, data, conflicts, globalImpactCount, riskLevel }) => {
              const temp = data.weather?.history_data?.[0]?.temp_max ?? data.weather?.avg_temp_high_c;
              const hasWeather = typeof temp === 'number';

              return (
                <button
                  key={dateStr}
                  onClick={() => onDateClick(dateStr)}
                  className={cn(
                    "flex items-center gap-4 w-full p-3 rounded-xl border transition-all group text-left relative overflow-hidden",
                    // Dynamic Traffic Light Styling
                    riskLevel === 'safe' && "bg-[var(--teal-primary)]/[0.03] border-[var(--teal-primary)]/20 hover:border-[var(--teal-primary)] hover:shadow-sm",
                    riskLevel === 'caution' && "bg-amber-500/[0.03] border-amber-500/20 hover:border-amber-500 hover:shadow-sm",
                    riskLevel === 'high' && "bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-lg border shrink-0 shadow-sm transition-colors",
                    riskLevel === 'safe' ? "bg-[var(--teal-primary)]/10 border-[var(--teal-primary)]/20 text-[var(--teal-primary)]" : "bg-foreground/[0.03] border-foreground/10"
                  )}>
                    <span className="text-[9px] font-black uppercase leading-none opacity-60">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-xl font-black leading-none mt-1">
                      {format(date, "d")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    {/* RECOMMENDED BADGE FOR SAFE DATES */}
                    {riskLevel === 'safe' && data.industryEvents.length === 0 && (
                       <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--teal-primary)]">
                         <CheckCircle2 className="w-3.5 h-3.5" /> Recommended Date
                       </span>
                    )}

                    {(data.holidays.length > 0 || data.schoolHoliday || conflicts.length > 0 || globalImpactCount > 0) && (
                      <div className="flex flex-wrap items-center gap-2">
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
                          <span key={i} className={cn(
                            "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border truncate max-w-[150px]",
                            (h as any).isStrategicOnly 
                              ? "bg-amber-500/5 text-amber-600 border-amber-500/10"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/10"
                          )}>
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
                      // Only show "No industry events" if it's NOT a safe/recommended date (to reduce noise)
                      riskLevel !== 'safe' && <span className="text-[10px] text-foreground/30 font-medium italic">No industry events</span>
                    )}
                  </div>

                  {hasWeather && (
                    <div className="hidden sm:flex flex-col items-end shrink-0 pl-2 border-l border-foreground/5">
                      <div className="flex items-center gap-1.5">
                        <Cloud className={cn("w-4 h-4 opacity-50", riskLevel === 'safe' ? "text-[var(--teal-primary)]" : "text-sky-500")} />
                        <span className={cn("text-sm font-black", riskLevel === 'safe' ? "text-[var(--teal-primary)]" : "text-foreground/70")}>
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