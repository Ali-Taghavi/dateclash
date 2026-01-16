"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Sun, CloudRain, Sunset, ChevronDown, ChevronUp } from "lucide-react";
import type { DateAnalysis, WeatherHistoryDay } from "@/app/types";
import { cn } from "@/lib/utils";

interface WeatherAccordionProps {
  weather: NonNullable<DateAnalysis["weather"]>;
}

export function WeatherAccordion({ weather }: WeatherAccordionProps) {
  const yearGroups = new Map<number, WeatherHistoryDay[]>();

  if (weather.history_data && weather.history_data.length > 0) {
    weather.history_data.forEach((day) => {
      const year = day.year;
      if (!yearGroups.has(year)) yearGroups.set(year, []);
      yearGroups.get(year)!.push(day);
    });
  }

  const historicalYearStats = Array.from(yearGroups.entries())
    .map(([year, days]) => {
      const avgTemp = days.length > 0
        ? Math.round(days.reduce((sum, d) => sum + d.temp_max, 0) / days.length)
        : 0;
      const rainDays = days.filter((d) => d.rain_sum > 1.0).length;
      const humidity = days[0]?.humidity ?? null;
      const sunset = days[0]?.sunset ?? null;
      const windowLabel = days[0]?.window_label ?? null;

      const fourteenDayTrend: Array<{ temp: number; rain: number; date: string }> = [];
      for (let i = 0; i < Math.min(14, days.length); i++) {
        fourteenDayTrend.push({
          temp: days[i].temp_max,
          rain: days[i].rain_sum || 0,
          date: days[i].date,
        });
      }

      return { year, avgTemp, rainDays, humidity, sunset, fourteenDayTrend, windowLabel };
    })
    .sort((a, b) => b.year - a.year);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    return historicalYearStats.length > 0 ? new Set([historicalYearStats[0].year]) : new Set();
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) newSet.delete(year);
      else newSet.add(year);
      return newSet;
    });
  };

  const getTempBadge = (temp: number) => {
    if (temp < 10) return { label: "❄️ Cold", className: "bg-blue-500/20 dark:bg-blue-400/30 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-400/30" };
    else if (temp <= 25) return { label: "⛅ Mild", className: "bg-green-500/20 dark:bg-green-400/30 text-green-700 dark:text-green-300 border-green-500/30 dark:border-green-400/30" };
    else return { label: "☀️ Warm", className: "bg-orange-500/20 dark:bg-orange-400/30 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-400/30" };
  };

  const renderFourteenDayTrend = (trend: Array<{ temp: number; rain: number; date: string }>, windowLabel: string | null) => {
    if (trend.length === 0) return null;
    const temps = trend.map((d) => d.temp);
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const range = maxTemp - minTemp || 1;
    const trendHeader = windowLabel ? `14-Day Trend (${windowLabel})` : "14-Day Trend";

    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-foreground/70">{trendHeader}</div>
        <div className="flex items-end gap-1 h-32 border-b border-foreground/10 pb-2">
          {trend.map((day, idx) => {
            const heightPercent = ((day.temp - minTemp) / range) * 100;
            const barHeight = Math.max(heightPercent, 5);
            const hasRain = day.rain > 0.1;
            const dateLabel = format(parseISO(day.date), "MMM d");

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end relative group h-full">
                {hasRain && (
                  <div className="mb-1 text-blue-500 dark:text-blue-400 text-sm" title={`Rain: ${Math.round(day.rain * 100) / 100}mm`}>💧</div>
                )}
                <div
                  className="w-2 bg-slate-500/30 dark:bg-slate-400/30 rounded-t hover:bg-slate-500/50 dark:hover:bg-slate-400/50 transition-colors relative group/bar"
                  style={{ height: `${barHeight}%`, minHeight: "8px" }}
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity text-xs bg-foreground/90 text-background px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-medium">{dateLabel}</div>
                    <div>Temp: {day.temp}°C</div>
                    <div>Rain: {hasRain ? `${Math.round(day.rain * 100) / 100}mm` : "Dry"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sun className="h-5 w-5" />
        Weather History for {weather.city}
      </h3>
      <div className="border border-foreground/20 rounded-md overflow-hidden">
        {historicalYearStats.map((stat) => {
          const isExpanded = expandedYears.has(stat.year);
          const tempBadge = getTempBadge(stat.avgTemp);

          return (
            <div key={stat.year} className={cn("border-b border-foreground/10 last:border-0", "transition-colors", isExpanded && "bg-foreground/5")}>
              <button
                onClick={() => toggleYear(stat.year)}
                className={cn("w-full flex items-center justify-between p-4", "hover:bg-foreground/5 transition-colors", "focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-inset")}
                aria-expanded={isExpanded}
              >
                <div className="font-medium text-lg">{stat.year}</div>
                <div className="flex items-center gap-3">
                  <div className={cn("px-3 py-1 rounded text-sm font-medium border", tempBadge.className)}>
                    {tempBadge.label} {stat.avgTemp}°C
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-foreground/60" /> : <ChevronDown className="h-5 w-5 text-foreground/60" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-foreground/10 bg-foreground/2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">Rain Days {stat.windowLabel ? `(${stat.windowLabel})` : ""}</div>
                      <div className="text-lg font-semibold flex items-center gap-2"><CloudRain className="h-4 w-4" /> {stat.rainDays} days</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">Avg Humidity</div>
                      <div className="text-lg font-semibold">{stat.humidity !== null ? `${stat.humidity}%` : "N/A"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">Sunset Time</div>
                      <div className="text-lg font-semibold flex items-center gap-2"><Sunset className="h-4 w-4" /> {stat.sunset || "N/A"}</div>
                    </div>
                  </div>
                  {renderFourteenDayTrend(stat.fourteenDayTrend, stat.windowLabel)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
