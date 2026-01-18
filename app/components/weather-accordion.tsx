"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Sun, CloudRain, Sunset, ChevronDown, ChevronUp } from "lucide-react";
import type { WeatherHistoryDay, WeatherCacheRow } from "@/app/types";
import { cn, formatTemperature } from "@/lib/utils";

interface WeatherAccordionProps {
  weather: WeatherCacheRow | null;
  temperatureUnit: 'c' | 'f';
}

export function WeatherAccordion({ weather, temperatureUnit }: WeatherAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!weather || !weather.history_data || weather.history_data.length === 0) {
    return (
      <div className="p-4 bg-foreground/5 rounded-xl border border-foreground/10 text-center">
         <p className="text-xs text-foreground/50 italic">No historical weather data available.</p>
      </div>
    );
  }

  // Group data by year
  const yearGroups = new Map<number, WeatherHistoryDay[]>();
  weather.history_data.forEach((day) => {
    // Robust year extraction: use explicit year property or parse from date
    let year = day.year;
    if (!year && day.date) {
        try {
            year = parseISO(day.date).getFullYear();
        } catch (e) {
            year = new Date().getFullYear(); 
        }
    }
    
    if (year) {
        if (!yearGroups.has(year)) yearGroups.set(year, []);
        yearGroups.get(year)!.push(day);
    }
  });

  // Sort years descending (newest first)
  const sortedYears = Array.from(yearGroups.keys()).sort((a, b) => b - a);

  // Calculate averages across all years
  const avgHigh = weather.avg_temp_high_c ?? 0;
  const avgLow = weather.avg_temp_low_c ?? 0;
  const rainDays = weather.rain_days_count ?? 0;

  return (
    <div className="space-y-4">
      {/* High-Level Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex flex-col items-center justify-center text-center">
            <Sun className="w-4 h-4 text-amber-500 mb-1" />
            <span className="text-lg font-black text-amber-700 dark:text-amber-300">
                {formatTemperature(avgHigh, temperatureUnit)}°
            </span>
            <span className="text-[9px] font-bold uppercase text-amber-600/60">Avg High</span>
        </div>
        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex flex-col items-center justify-center text-center">
            <Sunset className="w-4 h-4 text-indigo-500 mb-1" />
            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                {formatTemperature(avgLow, temperatureUnit)}°
            </span>
            <span className="text-[9px] font-bold uppercase text-indigo-600/60">Avg Low</span>
        </div>
        <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl flex flex-col items-center justify-center text-center">
            <CloudRain className="w-4 h-4 text-blue-500 mb-1" />
            <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                {rainDays}
            </span>
            <span className="text-[9px] font-bold uppercase text-blue-600/60">Rainy Days</span>
        </div>
      </div>

      {/* Accordion Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors group"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60 group-hover:text-foreground">
            View Historical Data ({sortedYears.length} Years)
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
      </button>

      {/* Historical List */}
      {isOpen && (
        <div className="space-y-6 animate-in slide-in-from-top-2">
            {sortedYears.map(year => (
                <div key={year} className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground/40 border-b border-foreground/10 pb-1">
                        {year}
                    </h4>
                    <div className="space-y-2">
                        {yearGroups.get(year)?.map((day, i) => {
                            // FIXED: Ensure we always pass a number, falling back to 0 if all fields are missing
                            const highTemp = day.max_temp_c ?? day.temp_max ?? day.avg_temp_c ?? 0;
                            const lowTemp = day.min_temp_c ?? day.avg_temp_c ?? 0;
                            
                            return (
                                <div key={i} className="flex items-center justify-between text-xs p-2 rounded hover:bg-foreground/5">
                                    <span className="font-medium opacity-80">
                                        {format(parseISO(day.date), "MMM d")}
                                    </span>
                                    <div className="flex items-center gap-4">
                                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                                            H: {formatTemperature(highTemp, temperatureUnit)}°
                                        </span>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                            L: {formatTemperature(lowTemp, temperatureUnit)}°
                                        </span>
                                        <span className="w-16 text-right opacity-50 truncate">
                                            {day.condition || (day.rain_sum && day.rain_sum > 0 ? "Rain" : "Clear")}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}