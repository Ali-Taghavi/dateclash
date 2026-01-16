"use client";

import { format, parseISO, getMonth as getMonthNum, getDate as getDateNum } from "date-fns";
import { GraduationCap } from "lucide-react";
import type { DateAnalysis } from "@/app/types";
import { cn, formatTemperature } from "@/lib/utils";

interface DateCellProps {
  dateStr: string;
  data: DateAnalysis;
  onClick: () => void;
  isSelected?: boolean;
  showMonthLabel?: boolean;
  temperatureUnit: 'c' | 'f';
}

export function DateCell({
  dateStr,
  data,
  onClick,
  isSelected = false,
  showMonthLabel = false,
  temperatureUnit,
}: DateCellProps) {
  const date = parseISO(dateStr);
  const dayName = format(date, "EEE");
  const dayNum = format(date, "d");
  const monthName = format(date, "MMM");

  // Debug: Log school holiday data if present
  if (data.schoolHoliday) {
    console.log(`[DateCell] ${dateStr} has school holiday: ${data.schoolHoliday}`);
  }

  const hasHighRisk = data.industryEvents.some(
    (e) => e.risk_level === "High" || e.risk_level === "Critical"
  );

  // Find matching weather day from history_data
  // Try to find a day that matches the current month and day from any year in history_data
  const currentMonth = getMonthNum(date);
  const currentDay = getDateNum(date);
  const currentYear = date.getFullYear();
  
  // First try to find exact year match, then fall back to any year with same month/day
  let weatherDay = data.weather?.history_data?.find((day) => {
    try {
      const dayDate = parseISO(day.date);
      return day.year === currentYear && getMonthNum(dayDate) === currentMonth && getDateNum(dayDate) === currentDay;
    } catch {
      return false;
    }
  });
  
  // If no exact year match, find any historical day with same month/day
  if (!weatherDay && data.weather?.history_data) {
    weatherDay = data.weather.history_data.find((day) => {
      try {
        const dayDate = parseISO(day.date);
        return getMonthNum(dayDate) === currentMonth && getDateNum(dayDate) === currentDay;
      } catch {
        return false;
      }
    });
  }

  const getEventColor = (riskLevel: string | null) => {
    switch (riskLevel) {
      case "Critical": return "bg-red-500";
      case "High": return "bg-orange-500";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center w-full h-full p-4 sm:p-3 md:p-3 lg:p-3 rounded-md border-2",
        "transition-colors relative",
        "focus:outline-none focus:ring-2 focus:ring-foreground/20",
        isSelected
          ? "bg-[var(--teal-primary)] text-white border-[var(--teal-primary)] hover:bg-[var(--teal-dark)]"
          : "border-foreground/20 hover:border-foreground/40 bg-background text-foreground",
        hasHighRisk && !isSelected && "border-foreground/60 border-dashed"
      )}
    >
      {/* School Holiday Icon - Top Right Corner */}
      {data.schoolHoliday && (
        <div className="absolute top-2 right-2 sm:top-2 sm:right-2 z-20 transition-opacity duration-300" title={data.schoolHoliday}>
          <GraduationCap
            className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 transition-opacity duration-300",
              isSelected 
                ? "text-yellow-300 drop-shadow-lg" 
                : "text-purple-600 dark:text-purple-400"
            )}
          />
        </div>
      )}

      <div className="text-xs sm:text-xs font-medium mb-2 relative z-10 w-full pr-8 sm:pr-0">
        <div className="text-center" suppressHydrationWarning>{dayName}</div>
        <div className="text-base sm:text-lg font-bold flex items-baseline gap-1 justify-center">
          {showMonthLabel && (
            <span 
              className={cn(
                "text-[10px] sm:text-[10px] font-normal uppercase tracking-wide",
                isSelected ? "text-white/70" : "text-foreground/50"
              )}
              suppressHydrationWarning
            >
              {monthName}
            </span>
          )}
          <span suppressHydrationWarning>{dayNum}</span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-1 mb-2 relative z-10">
        {data.industryEvents.length > 0 && (
          <div className="flex items-center justify-center gap-1 flex-wrap transition-opacity duration-300">
            {data.industryEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className={cn("w-2 h-2 rounded-full transition-opacity duration-300", getEventColor(event.risk_level))}
                title={event.name}
              />
            ))}
          </div>
        )}

        {data.holidays.length > 0 && (
          <div className="flex flex-col gap-0.5 w-full transition-opacity duration-300">
            {data.holidays.map((holiday, idx) => (
              <div
                key={holiday.id || idx}
                className={cn("h-1 w-full rounded transition-opacity duration-300", isSelected ? "bg-white/40" : "bg-foreground/30")}
                title={holiday.name}
              />
            ))}
          </div>
        )}
      </div>

      {weatherDay && (
        <div className={cn("w-full pt-2 mt-auto relative z-10 transition-opacity duration-300", "border-t", isSelected ? "border-white/20" : "border-foreground/20")}>
          <div className="flex items-center justify-center gap-1.5">
            {weatherDay.rain_sum > 1 && (
              <span className="text-xs sm:text-sm transition-opacity duration-300" title={`${Math.round(weatherDay.rain_sum * 100) / 100}mm rain`}>💧</span>
            )}
            <div className="flex flex-col items-center">
              <div className={cn("text-xs sm:text-xs font-medium transition-opacity duration-300", isSelected ? "text-white/90" : "text-foreground")}>
                {formatTemperature(weatherDay.temp_max, temperatureUnit)}
              </div>
              <div 
                className={cn("text-[10px] sm:text-[10px] leading-tight transition-opacity duration-300", isSelected ? "text-white/60" : "text-foreground/50")}
                suppressHydrationWarning
              >
                {format(parseISO(weatherDay.date), "MMM d, yyyy")}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Show weather summary if no specific day match but weather data exists */}
      {!weatherDay && data.weather && (
        <div className={cn("w-full pt-2 mt-auto relative z-10 transition-opacity duration-300", "border-t", isSelected ? "border-white/20" : "border-foreground/20")}>
          <div className="flex items-center justify-center gap-1.5">
            <div className="flex flex-col items-center">
              <div className={cn("text-xs sm:text-xs font-medium transition-opacity duration-300", isSelected ? "text-white/90" : "text-foreground")}>
                {formatTemperature(data.weather.avg_temp_high_c, temperatureUnit)} / {formatTemperature(data.weather.avg_temp_low_c, temperatureUnit)}
              </div>
              <div className={cn("text-[10px] sm:text-[10px] leading-tight transition-opacity duration-300", isSelected ? "text-white/60" : "text-foreground/50")}>
                Avg ({data.weather.rain_days_count} rain days)
              </div>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}
