"use client";

import { memo, useMemo } from "react";
import { format, parseISO, getMonth as getMonthNum, getDate as getDateNum } from "date-fns";
import { GraduationCap, AlertTriangle } from "lucide-react";
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
}

export const DateCell = memo(({
  dateStr,
  data,
  onClick,
  isSelected = false,
  showMonthLabel = false,
  temperatureUnit,
  watchlistConflicts = [],
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

    return {
      temp,
      subtext: weatherDay 
        ? format(parseISO(weatherDay.date), "MMM d, yyyy") 
        : `Avg (${data.weather.rain_days_count ?? 0} rain days)`
    };
  }, [date, data.weather]);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center w-full h-full p-3 rounded-2xl border-2 transition-all duration-300 relative group text-left",
        "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20",
        isSelected
          ? "border-[var(--teal-primary)] bg-[var(--teal-primary)]/[0.03] shadow-sm z-10"
          : "border-foreground/5 bg-background opacity-40 grayscale"
      )}
    >
      {/* Month Header - Added prominence for contextual navigation */}
      {showMonthLabel && (
        <div className="absolute top-0 left-0 w-full text-center py-1 bg-[var(--teal-primary)]/10 rounded-t-xl">
           <span className="text-[10px] font-black uppercase tracking-widest text-[var(--teal-primary)]">
             {monthName}
           </span>
        </div>
      )}

      {/* Top Left: Watchlist Alert Badge */}
      {watchlistConflicts.length > 0 && (
        <div className={cn("absolute z-20 transition-transform group-hover:scale-110", showMonthLabel ? "top-8 left-2" : "top-2 left-2")}>
          <div className="flex items-center justify-center bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            {watchlistConflicts.length}
          </div>
        </div>
      )}

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

      {/* EVENTS VISUALIZATION STRIP - Optimized Contrast & Stability */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-1.5 mb-2">
        <div className="flex gap-1.5 flex-wrap justify-center">
          {data.industryEvents?.map((event, idx) => (
            <div 
              key={`ind-${idx}`} 
              className={cn(
                "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ring-2 ring-background transition-transform group-hover:scale-125",
                // High-Contrast Adaptive Palette
                event.isRadarEvent 
                  ? "bg-rose-500 dark:bg-rose-400"  // Global/Regional Radar
                  : "bg-indigo-500 dark:bg-indigo-400" // Local Industry Events
              )} 
              title={event.name}
            />
          ))}
        </div>
        
        {/* Public Holiday Line Indicator */}
        {data.holidays && data.holidays.length > 0 && (
          <div className="h-1 w-10 rounded-full bg-sky-400/50 dark:bg-sky-400/30" />
        )}
      </div>

      {/* Footer: Weather Display */}
      {weatherInfo && (
        <div className="w-full pt-2 mt-auto relative z-10 border-t border-foreground/5">
          <div className="flex flex-col items-center">
            <div className="text-[11px] font-black uppercase tracking-wider text-[var(--teal-primary)] leading-none">
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