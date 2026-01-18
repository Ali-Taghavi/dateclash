"use client";

import { format, parseISO, getDate, getMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Cloud, Sun, CloudRain, CloudSnow, AlertTriangle } from "lucide-react";
import type { DateAnalysis } from "../types";

// FIXED: Interface matches exactly what CalendarGrid is passing
interface DateCellProps {
  dateStr: string;
  data?: DateAnalysis;
  onClick: () => void;
  isSelected: boolean;
  showMonthLabel: boolean;
  temperatureUnit: 'c' | 'f';
  watchlistConflicts?: any[];
  isCurrentMonth?: boolean; 
}

export function DateCell({ 
  dateStr,
  data, 
  onClick,
  isSelected,
  showMonthLabel,
  temperatureUnit,
  watchlistConflicts = [],
  isCurrentMonth = true
}: DateCellProps) {
  
  // Parse the string date for internal logic
  const date = parseISO(dateStr);
  const currentMonth = getMonth(date) + 1;
  const currentDay = getDate(date);

  // 1. Weather Logic (With "any" type fix for build safety)
  const weatherDay = data?.weather?.history_data?.find((day: any) => {
    try {
      if (!day.date) return false;
      const dayDate = parseISO(day.date);
      return (getMonth(dayDate) + 1) === currentMonth && getDate(dayDate) === currentDay;
    } catch (e) {
      return false;
    }
  });

  const getTemp = () => {
    if (!weatherDay) return null;
    const tempC = weatherDay.avg_temp_c ?? weatherDay.temp_c ?? 0;
    return temperatureUnit === 'c' ? Math.round(tempC) : Math.round(tempC * 9/5 + 32);
  };

  const getWeatherIcon = () => {
    if (!weatherDay) return null;
    if (weatherDay.condition?.toLowerCase().includes("rain")) return <CloudRain className="w-3 h-3 text-blue-400" />;
    if (weatherDay.condition?.toLowerCase().includes("snow")) return <CloudSnow className="w-3 h-3 text-indigo-400" />;
    if (weatherDay.condition?.toLowerCase().includes("cloud")) return <Cloud className="w-3 h-3 text-gray-400" />;
    return <Sun className="w-3 h-3 text-amber-400" />;
  };

  const temp = getTemp();
  const icon = getWeatherIcon();
  
  // 2. Event Indicators
  const hasPublicHoliday = data?.holidays && data.holidays.length > 0;
  const hasSchoolHoliday = !!data?.schoolHoliday;
  const events = data?.industryEvents || [];
  const hasWatchlistConflict = watchlistConflicts.length > 0;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "min-h-[100px] p-2 border-r border-b border-foreground/5 bg-background relative transition-all cursor-pointer hover:bg-foreground/[0.02]",
        !isCurrentMonth && "bg-foreground/[0.02] opacity-50",
        isSelected && "ring-2 ring-inset ring-[var(--teal-primary)]",
        isToday(date) && !isSelected && "bg-[var(--teal-primary)]/5"
      )}
    >
      {/* Date Number & Label */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          {showMonthLabel && (
            <span className="text-[10px] font-bold uppercase text-[var(--teal-primary)]">
              {format(date, "MMM")}
            </span>
          )}
          <span className={cn(
            "text-xs font-bold",
            isToday(date) ? "text-[var(--teal-primary)]" : "text-foreground/70",
            !isCurrentMonth && "text-foreground/30"
          )}>
            {format(date, "d")}
          </span>
        </div>

        {/* Weather Indicator */}
        {temp !== null && (
          <div className="flex items-center gap-1 opacity-70" title={`Avg Temp: ${temp}°`}>
            {icon}
            <span className="text-[9px] font-bold">{temp}°</span>
          </div>
        )}
      </div>

      {/* Markers Container */}
      <div className="mt-2 space-y-1">
        
        {/* Watchlist Conflict Marker */}
        {hasWatchlistConflict && (
           <div className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-sm mb-1">
             <AlertTriangle className="w-3 h-3" />
             <span className="hidden lg:inline">Watchlist</span>
           </div>
        )}

        {/* Public Holiday Bar */}
        {hasPublicHoliday && (
          <div className="w-full h-1.5 bg-blue-500/20 rounded-full flex items-center">
            <div className="w-full h-full bg-blue-500 rounded-full opacity-60" />
          </div>
        )}

        {/* School Holiday Bar */}
        {hasSchoolHoliday && (
           <div className="w-full h-1.5 bg-[var(--teal-primary)]/20 rounded-full flex items-center">
             <div className="w-full h-full bg-[var(--teal-primary)] rounded-full opacity-60" />
           </div>
        )}

        {/* Industry Event Dots */}
        {events.length > 0 && (
          <div className="flex flex-wrap content-start gap-1 pt-1">
            {events.map((event, i) => (
              <div 
                key={event.id || i}
                title={event.name}
                className={cn(
                  "w-1.5 h-1.5 rounded-full shadow-sm ring-1 ring-background transition-transform hover:scale-150",
                  event.isRadarEvent 
                    ? "bg-rose-500 shadow-rose-500/50"   // Radar Event (Pink)
                    : "bg-amber-500 shadow-amber-500/50" // Target Event (Amber)
                )} 
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Active State Ring */}
      {isToday(date) && !isSelected && (
        <div className="absolute inset-0 border-2 border-[var(--teal-primary)] rounded-none pointer-events-none opacity-10" />
      )}
    </div>
  );
}