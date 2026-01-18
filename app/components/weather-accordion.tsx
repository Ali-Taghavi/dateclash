"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Sun, CloudRain, Sunset, ChevronDown, ChevronUp } from "lucide-react";
import type { WeatherHistoryDay } from "@/app/types";
import { cn, formatTemperature } from "@/lib/utils";

interface WeatherAccordionProps {
  // Defensive typing: weather can be null/undefined
  weather?: {
    city: string;
    history_data: WeatherHistoryDay[];
  } | null;
  temperatureUnit: 'c' | 'f';
}

export function WeatherAccordion({ weather, temperatureUnit }: WeatherAccordionProps) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  // 1. CRITICAL SAFETY GUARD: If weather or history_data is missing, return a clean empty state
  if (!weather || !weather.history_data || weather.history_data.length === 0) {
    return (
      <div className="p-6 border border-dashed border-foreground/20 rounded-md text-center bg-foreground/5">
        <p className="text-sm text-foreground/40 italic">Historical weather data (4-year prognosis) is not available for this location.</p>
      </div>
    );
  }

  // 2. DATA PROCESSING: Grouping logic
  const yearGroups = new Map<number, WeatherHistoryDay[]>();
  weather.history_data.forEach((day) => {
    const year = day.year;
    if (!yearGroups.has(year)) yearGroups.set(year, []);
    yearGroups.get(year)!.push(day);
  });

  const historicalYearStats = Array.from(yearGroups.entries())
    .map(([year, days]) => {
      const avgTemp = days.length > 0
        ? Math.round(days.reduce((sum, d) => sum + d.temp_max, 0) / days.length)
        : 0;
      const rainDays = days.filter((d) => d.rain_sum > 1.0).length;
      const humidity = days[0]?.humidity ?? null;
      const sunset = days[0]?.sunset ?? null;
      const windowLabel = days[0]?.window_label ?? null;

      const fourteenDayTrend = days.slice(0, 14).map(d => ({
        temp: d.temp_max,
        rain: d.rain_sum || 0,
        date: d.date,
      }));

      return { year, avgTemp, rainDays, humidity, sunset, fourteenDayTrend, windowLabel };
    })
    .sort((a, b) => b.year - a.year);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) newSet.delete(year);
      else newSet.add(year);
      return newSet;
    });
  };

  const getTempBadge = (temp: number) => {
    if (temp < 10) return { label: "❄️ Cold", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" };
    if (temp <= 25) return { label: "⛅ Mild", className: "bg-green-500/10 text-green-700 border-green-500/20" };
    return { label: "☀️ Warm", className: "bg-orange-500/10 text-orange-700 border-orange-500/20" };
  };

  const renderFourteenDayTrend = (trend: Array<{ temp: number; rain: number; date: string }>, windowLabel: string | null) => {
    if (trend.length === 0) return null;
    const temps = trend.map((d) => d.temp);
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const range = maxTemp - minTemp || 1;

    return (
      <div className="mt-4 space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-widest text-foreground/40">
          {windowLabel ? `14-Day Trend (${windowLabel})` : "14-Day Trend"}
        </div>
        <div className="flex items-end gap-1 h-24 border-b border-foreground/10 pb-2">
          {trend.map((day, idx) => {
            const heightPercent = ((day.temp - minTemp) / range) * 100;
            const hasRain = day.rain > 0.1;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                {hasRain && <div className="mb-1 text-blue-500 text-[8px]">💧</div>}
                <div
                  className="w-full bg-slate-500/20 rounded-t hover:bg-teal-primary/50 transition-colors relative"
                  style={{ height: `${Math.max(heightPercent, 10)}%` }}
                >
                   <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-foreground text-background px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {formatTemperature(day.temp, temperatureUnit)}
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
      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
        <Sun className="h-4 w-4" /> 4-Year Prognosis: {weather.city}
      </h3>
      <div className="border border-foreground/10 rounded-lg overflow-hidden bg-background">
        {historicalYearStats.map((stat) => {
          const isExpanded = expandedYears.has(stat.year);
          const tempBadge = getTempBadge(stat.avgTemp);

          return (
            <div key={stat.year} className={cn("border-b border-foreground/10 last:border-0", isExpanded && "bg-foreground/5")}>
              <button
                onClick={() => toggleYear(stat.year)}
                className="w-full flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors"
              >
                <div className="font-bold text-lg">{stat.year}</div>
                <div className="flex items-center gap-3">
                  <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase border", tempBadge.className)}>
                    {tempBadge.label} {formatTemperature(stat.avgTemp, temperatureUnit)}
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 opacity-40" /> : <ChevronDown className="h-4 w-4 opacity-40" />}
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-foreground/10 animate-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-foreground/40">Rain Days</div>
                      <div className="text-sm font-bold flex items-center gap-2"><CloudRain className="h-3.5 w-3.5 text-blue-500" /> {stat.rainDays}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-foreground/40">Humidity</div>
                      <div className="text-sm font-bold">{stat.humidity}%</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-bold text-foreground/40">Sunset</div>
                      <div className="text-sm font-bold flex items-center gap-2"><Sunset className="h-3.5 w-3.5 text-orange-500" /> {stat.sunset}</div>
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