"use client";

import { memo, useMemo } from "react";
import { format, parseISO, getMonth as getMonthNum, getDate as getDateNum } from "date-fns";
import { GraduationCap, Globe, AlertTriangle } from "lucide-react"; 
import type { DateAnalysis } from "@/app/types";
import { cn, formatTemperature } from "@/lib/utils";

interface DateCellProps {
  dateStr: string;
  data: DateAnalysis;
  onClick: () => void;
  isSelected?: boolean;
  showMonthLabel?: boolean;
  temperatureUnit: 'c' | 'f';
  watchlistConflicts?: any[];
  globalImpactCount?: number;
  riskLevel: 'safe' | 'caution' | 'high'; // NEW PROP
}

export const DateCell = memo(({
  dateStr,
  data,
  onClick,
  isSelected = false,
  showMonthLabel = false,
  temperatureUnit,
  watchlistConflicts = [],
  globalImpactCount = 0,
  riskLevel,
}: DateCellProps) => {
  const date = useMemo(() => parseISO(dateStr), [dateStr]);
  const dayName = useMemo(() => format(date, "EEE"), [date]);
  const dayNum = useMemo(() => format(date, "d"), [date]);
  const monthName = useMemo(() => format(date, "MMM"), [date]);

  const weatherInfo = useMemo(() => {
    if (!data.weather) return null;
    const currentMonth = getMonthNum(date);
    const currentDay = getDateNum(date);
    
    const weatherDay = data.weather.history_data?.find((day) => {
      try {
        const dayDate = parseISO(day.date);
        return getMonthNum(dayDate) === currentMonth && getDateNum(dayDate) === currentDay;
      } catch { return false; }
    });

    const temp = weatherDay?.temp_max ?? weatherDay?.max_temp_c ?? data.weather.avg_temp_high_c;
    const isValid = typeof temp === 'number' && !isNaN(temp);
    if (!isValid) return null;
    return { temp, subtext: format(date, "MM/yy") };
  }, [date, data.weather]);

  // --- TRAFFIC LIGHT COLOR LOGIC ---
  const colorStyles = {
    safe: "border-[var(--teal-primary)] bg-[var(--teal-primary)]/[0.03] shadow-sm hover:shadow-md hover:border-[var(--teal-primary)]/80",
    caution: "border-amber-500/40 bg-amber-500/[0.03] shadow-sm hover:shadow-md hover:border-amber-500/80",
    high: "border-rose-500/40 bg-rose-500/[0.03] shadow-sm hover:shadow-md hover:border-rose-500/80",
  };
  
  // Base style for inactive/unselected state (optional, if you want unselected to look different)
  const baseStyle = isSelected
    ? colorStyles[riskLevel] 
    : "border-foreground/5 bg-background opacity-40 grayscale";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center w-full h-full p-3 rounded-2xl border-2 transition-all duration-300 relative group text-left",
        "focus:outline-none focus:ring-2 focus:ring-offset-1 overflow-hidden",
        baseStyle,
        // Focus rings tailored to risk level
        riskLevel === 'safe' && "focus:ring-[var(--teal-primary)]/20",
        riskLevel === 'caution' && "focus:ring-amber-500/20",
        riskLevel === 'high' && "focus:ring-rose-500/20"
      )}
    >
      {/* Month Header */}
      {showMonthLabel && (
        <div className={cn(
          "absolute top-0 left-0 w-full text-center py-1 rounded-t-xl z-20",
          riskLevel === 'safe' && "bg-[var(--teal-primary)]/10 text-[var(--teal-primary)]",
          riskLevel === 'caution' && "bg-amber-500/10 text-amber-600 dark:text-amber-500",
          riskLevel === 'high' && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
           <span className="text-[10px] font-black uppercase tracking-widest">
             {monthName}
           </span>
        </div>
      )}

      {/* BADGES CONTAINER (Top Left) */}
      <div className={cn("absolute z-20 flex flex-col gap-1 items-start", showMonthLabel ? "top-8 left-2" : "top-2 left-2")}>
        
        {/* 1. Global Impact Badge (Amber) */}
        {globalImpactCount > 0 && (
          <div className="flex items-center justify-center bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm transition-transform group-hover:scale-110">
            <Globe className="h-2.5 w-2.5 mr-0.5" />
            {globalImpactCount}
          </div>
        )}

        {/* 2. Watchlist Alert Badge (Purple) */}
        {watchlistConflicts.length > 0 && (
          <div className="flex items-center justify-center bg-purple-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm transition-transform group-hover:scale-110">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            {watchlistConflicts.length}
          </div>
        )}
      </div>

      {/* Top Right: School Holiday Icon */}
      {data.schoolHoliday && (
        <div className={cn("absolute z-20", showMonthLabel ? "top-8 right-2" : "top-2 right-2")}>
          <GraduationCap className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
        </div>
      )}

      {/* Date Information */}
      <div className={cn("text-center mb-1 relative z-10 w-full", showMonthLabel ? "mt-5" : "mt-0")}>
        <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-0.5" suppressHydrationWarning>
          {dayName}
        </div>
        <div className="text-2xl font-black tracking-tighter text-foreground" suppressHydrationWarning>
          {dayNum}
        </div>
      </div>

      {/* EVENTS VISUALIZATION STRIP */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-2 mb-2">
        <div className="flex gap-1.5 flex-wrap justify-center min-h-[10px]">
          {data.industryEvents?.map((event, idx) => (
            <div 
              key={`ind-${idx}`} 
              className={cn(
                "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ring-2 ring-background transition-transform group-hover:scale-125",
                event.is_projected
                  ? "bg-gray-400/50 border border-gray-400" 
                  : event.isRadarEvent 
                    ? "bg-rose-500 dark:bg-rose-400" 
                    : "bg-indigo-500 dark:bg-indigo-400"
              )} 
              title={event.is_projected ? `${event.name} (Est. from ${event.projected_from})` : event.name}
            />
          ))}
        </div>
        
        {/* PUBLIC HOLIDAY INDICATOR BAR */}
        {/* We use the risk level to decide if we show a "Local Holiday" bar */}
        {data.holidays.length > 0 && (
           <div className="flex flex-col gap-1 items-center w-full">
             {/* If it's a High Risk day, it means there's a primary public holiday */}
             {riskLevel === 'high' && <div className="h-1 w-10 rounded-full bg-rose-500/80 shadow-sm" />}
             {/* If it's Global Impact but not High Risk (e.g. purely strategic), we can show Amber */}
             {riskLevel === 'caution' && globalImpactCount > 0 && <div className="h-1 w-10 rounded-full bg-amber-500 shadow-sm" />}
             {/* If it's just Caution for other reasons (School/Watchlist) but has a minor holiday, show Blue */}
             {riskLevel === 'caution' && globalImpactCount === 0 && data.holidays.length > 0 && <div className="h-1 w-10 rounded-full bg-sky-400/80 shadow-sm" />}
           </div>
        )}
      </div>

      {/* Footer: Weather */}
      {weatherInfo && (
        <div className="w-full pt-2 mt-auto relative z-10 border-t border-foreground/5">
          <div className="flex flex-col items-center">
            <div className={cn(
              "text-[11px] font-black uppercase tracking-wider leading-none",
              riskLevel === 'safe' ? "text-[var(--teal-primary)]" : "text-foreground/70"
            )}>
              {formatTemperature(weatherInfo.temp, temperatureUnit)}
            </div>
            <div className="text-[8px] font-bold opacity-30 truncate w-full text-center uppercase tracking-tighter mt-1">
              {weatherInfo.subtext}
            </div>
          </div>
        </div>
      )}
    </button>
  );
});

DateCell.displayName = "DateCell";