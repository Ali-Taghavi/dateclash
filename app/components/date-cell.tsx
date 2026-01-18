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

  // --- REFINED WEATHER LOGIC ---
  const weatherInfo = useMemo(() => {
    if (!data.weather) return null;

    const currentMonth = getMonthNum(date);
    const currentDay = getDateNum(date);
    
    // Find historical match for this specific day/month
    const weatherDay = data.weather.history_data?.find((day) => {
      try {
        const dayDate = parseISO(day.date);
        return getMonthNum(dayDate) === currentMonth && getDateNum(dayDate) === currentDay;
      } catch { return false; }
    });

    // FIXED: Support both old and new field names for temperature
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
        "flex flex-col items-center w-full h-full p-3 rounded-xl border-2 transition-all duration-200 relative group",
        "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20",
        isSelected
          ? "bg-[var(--teal-primary)] text-white border-[var(--teal-primary)] shadow-lg z-10 scale-[1.02]"
          : "border-foreground/10 bg-background text-foreground hover:border-[var(--teal-primary)]/40 hover:shadow-md"
      )}
    >
      {/* Top Left: Watchlist Alert Badge */}
      {watchlistConflicts.length > 0 && (
        <div className="absolute top-2 left-2 z-20">
          <div className="relative">
            <AlertTriangle className={cn("h-4 w-4", isSelected ? "text-white" : "text-purple-500")} />
            <span className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center text-[7px] font-bold rounded-full w-2.5 h-2.5",
              isSelected ? "bg-white text-[var(--teal-primary)]" : "bg-purple-500 text-white"
            )}>
              {watchlistConflicts.length}
            </span>
          </div>
        </div>
      )}

      {/* Top Right: School Holiday Icon */}
      {data.schoolHoliday && (
        <div className="absolute top-2 right-2 z-20">
          <GraduationCap className={cn("h-4 w-4", isSelected ? "text-yellow-300" : "text-purple-600/60")} />
        </div>
      )}

      {/* Date Information */}
      <div className="text-center mb-2 relative z-10 w-full">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-0.5" suppressHydrationWarning>
          {dayName}
        </div>
        <div className="text-lg font-black tracking-tighter flex items-baseline gap-1 justify-center">
          {showMonthLabel && (
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-30" suppressHydrationWarning>
              {monthName}
            </span>
          )}
          <span suppressHydrationWarning>{dayNum}</span>
        </div>
      </div>

      {/* EVENTS VISUALIZATION STRIP */}
      <div className="flex-1 w-full flex items-center justify-center gap-1 flex-wrap mb-2">
        
        {/* Industry Event Dots: Amber = Target, Rose = Radar */}
        {data.industryEvents?.map((event, idx) => (
          <div 
            key={`ind-${idx}`} 
            className={cn(
              "w-1.5 h-1.5 rounded-full shadow-sm ring-1 ring-background",
              event.isRadarEvent 
                ? "bg-rose-500 shadow-rose-500/50"   // Radar Event (Pink)
                : "bg-amber-500 shadow-amber-500/50" // Target Event (Amber)
            )} 
            title={event.name}
          />
        ))}

        {/* Public Holiday Bar */}
        {data.holidays && data.holidays.length > 0 && (
          <div className={cn("h-1 w-8 rounded-full", isSelected ? "bg-white/40" : "bg-blue-500/40")} />
        )}
      </div>

      {/* Footer: Weather Display */}
      {weatherInfo && (
        <div className={cn(
          "w-full pt-2 mt-auto relative z-10 border-t transition-colors",
          isSelected ? "border-white/20" : "border-foreground/5"
        )}>
          <div className="flex flex-col items-center">
            <div className={cn("text-[11px] font-black uppercase tracking-wider", isSelected ? "text-white" : "text-foreground")}>
              {formatTemperature(weatherInfo.temp, temperatureUnit)}
            </div>
            <div className="text-[9px] font-medium opacity-40 truncate w-full text-center">
              {weatherInfo.subtext}
            </div>
          </div>
        </div>
      )}
    </button>
  );
});

DateCell.displayName = "DateCell";