"use client";

import { format, parseISO } from "date-fns";
import { X, Calendar, GraduationCap, Landmark, AlertTriangle, Building2, ExternalLink } from "lucide-react";
import type { DateAnalysis } from "@/app/types";
import { WeatherAccordion } from "./weather-accordion";
import { cn } from "@/lib/utils";

interface DetailModalProps {
  dateStr: string;
  data: DateAnalysis;
  onClose: () => void;
  temperatureUnit: 'c' | 'f';
  watchlistData?: any[]; 
  regionName?: string; 
}

export function DetailModal({
  dateStr,
  data,
  onClose,
  temperatureUnit,
  watchlistData = [],
  regionName = "Target Region"
}: DetailModalProps) {
  const date = parseISO(dateStr);
  
  // REFACTORED: Flatten specific watchlist holidays into a displayable list
  const watchlistEvents = watchlistData.flatMap(loc => {
    const events = [];

    // 1. Check Public Holidays
    loc.publicHolidays?.filter((h: any) => h.date === dateStr).forEach((h: any) => {
      events.push({
        name: h.name, // The specific name (e.g., "Bank Holiday")
        location: loc.label,
        type: "Public Holiday"
      });
    });

    // 2. Check School Holidays
    loc.schoolHolidays?.filter((h: any) => {
      if (!h.startDate || !h.endDate) return false;
      const current = parseISO(dateStr);
      return current >= parseISO(h.startDate) && current <= parseISO(h.endDate);
    }).forEach((h: any) => {
      events.push({
        name: h.name, // The specific name (e.g., "Winter Break")
        location: loc.label,
        type: "School Holiday"
      });
    });

    return events;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-foreground/20 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-foreground/10 flex items-center justify-between bg-foreground/5">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--teal-primary)] text-white p-2.5 rounded-xl shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter" suppressHydrationWarning>
                {format(date, "EEEE, MMMM d")}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mt-1">
                Strategic Analysis • {format(date, "yyyy")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Watchlist Notifications - UPDATED STYLE */}
          {watchlistEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Watchlist Notifications
              </h3>
              <div className="space-y-2">
                {watchlistEvents.map((event, idx) => (
                  <div key={idx} className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                    <p className="font-bold text-purple-700 dark:text-purple-300 text-lg leading-tight">
                        {event.name}
                    </p>
                    <p className="text-[10px] font-black uppercase text-purple-500/60 mt-1">
                      {event.type} • {event.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Events */}
          {data.industryEvents && data.industryEvents.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-500" /> Industry Events
              </h3>
              <div className="space-y-2">
                {data.industryEvents.map((event, i) => (
                  <div key={i} className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg transition-all hover:bg-amber-500/10">
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {event.url ? (
                                <a 
                                  href={event.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-bold text-amber-900 dark:text-amber-100 text-sm hover:underline decoration-amber-500/50 flex items-center gap-1"
                                >
                                  {event.name}
                                  <ExternalLink className="w-3 h-3 opacity-50" />
                                </a>
                            ) : (
                                <span className="font-bold text-amber-900 dark:text-amber-100 text-sm">
                                  {event.name}
                                </span>
                            )}

                            <div className="flex items-center gap-1.5">
                                {event.significance && (
                                    <span className="text-[9px] bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold uppercase tracking-wide">
                                        {event.significance}
                                    </span>
                                )}
                                {event.event_scale && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide bg-amber-50/50 dark:bg-amber-900/20 text-amber-900/70 dark:text-amber-100/80 border border-amber-200/50 dark:border-amber-800/50">
                                        {event.event_scale}
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-[10px] font-bold uppercase text-amber-600/70">
                            {event.city}, {event.country_code}
                        </p>

                        {event.description && (
                            <p className="text-[11px] text-foreground/70 leading-snug mt-1">
                                {event.description}
                            </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Public Holidays */}
          {data.holidays && data.holidays.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5 text-blue-500" /> Public Holidays
              </h3>
              <div className="space-y-2">
                {data.holidays.map((holiday, i) => (
                  <div key={i} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <p className="font-bold text-blue-700 dark:text-blue-300 text-lg">{holiday.name}</p>
                    <p className="text-[10px] font-black uppercase text-blue-500/60 mt-1">
                      Target Venue Data
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* School Holidays */}
          {data.schoolHoliday && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-[var(--teal-primary)]" /> School Holidays
              </h3>
              <div className="p-4 bg-[var(--teal-primary)]/5 border border-[var(--teal-primary)]/20 rounded-xl">
                <p className="font-bold text-[var(--teal-dark)] text-lg">
                  {typeof data.schoolHoliday === 'string' ? data.schoolHoliday : data.schoolHoliday.name}
                </p>
                <p className="text-[10px] font-black uppercase text-[var(--teal-primary)] mt-1">
                  Region: {regionName}
                </p>
              </div>
            </section>
          )}

          {/* Weather Prognosis */}
          <section className="pt-8 border-t border-foreground/10">
            <div className="mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40">
                Climatological Context
              </h3>
            </div>
            <WeatherAccordion weather={data.weather} temperatureUnit={temperatureUnit} />
          </section>
        </div>
      </div>
    </div>
  );
}