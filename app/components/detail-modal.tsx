"use client";

import { format, parseISO } from "date-fns";
import { Calendar, X } from "lucide-react";
import type { DateAnalysis } from "@/app/types";
import { cn } from "@/lib/utils";
import { WeatherAccordion } from "./weather-accordion";

interface DetailModalProps {
  dateStr: string;
  data: DateAnalysis;
  onClose: () => void;
}

export function DetailModal({ dateStr, data, onClose }: DetailModalProps) {
  const date = parseISO(dateStr);

  return (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={cn("bg-background border-2 border-foreground/20 rounded-lg p-6", "max-w-2xl w-full max-h-[90vh] overflow-y-auto", "shadow-lg")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{format(date, "EEEE, MMMM d, yyyy")}</h2>
          <button onClick={onClose} className={cn("p-1 rounded-md hover:bg-foreground/10 transition-colors", "focus:outline-none focus:ring-2 focus:ring-foreground/20")} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6">
          {data.weather && data.weather.history_data && data.weather.history_data.length > 0 && (
            <WeatherAccordion weather={data.weather} />
          )}
          {data.holidays.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Calendar className="h-5 w-5" /> Holidays ({data.holidays.length})</h3>
              <div className="border border-foreground/20 rounded-md p-4 space-y-2">
                {data.holidays.map((holiday) => (
                  <div key={holiday.id} className="pb-2 border-b border-foreground/10 last:border-0 last:pb-0">
                    <div className="font-medium">{holiday.name}</div>
                    {holiday.description && <div className="text-sm text-foreground/70 mt-1">{holiday.description}</div>}
                    {holiday.type && <div className="text-xs text-foreground/60 mt-1">Type: {holiday.type}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.industryEvents.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Calendar className="h-5 w-5" /> Industry Events ({data.industryEvents.length})</h3>
              <div className="border border-foreground/20 rounded-md p-4 space-y-4">
                {data.industryEvents.map((event) => (
                  <div key={event.id} className={cn("pb-4 border-b border-foreground/10 last:border-0 last:pb-0", "space-y-2")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-lg">{event.name}</div>
                      {event.risk_level && <span className={cn("px-2 py-1 rounded text-xs font-medium border-2", "border-foreground/30")}>{event.risk_level}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {event.city && <div><span className="text-foreground/60">City:</span> <span className="font-medium">{event.city}</span></div>}
                      {event.event_scale && <div><span className="text-foreground/60">Scale:</span> <span className="font-medium">{event.event_scale}</span></div>}
                      {event.industry && event.industry.length > 0 && <div><span className="text-foreground/60">Industry:</span> <span className="font-medium">{event.industry.join(", ")}</span></div>}
                      {event.audience_types && event.audience_types.length > 0 && <div><span className="text-foreground/60">Audience:</span> <span className="font-medium">{event.audience_types.join(", ")}</span></div>}
                    </div>
                    {event.description && <div className="text-sm text-foreground/70 mt-2">{event.description}</div>}
                    {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" className={cn("text-sm text-foreground underline", "hover:text-foreground/80 transition-colors")}>Learn more →</a>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.holidays.length === 0 && data.industryEvents.length === 0 && !data.weather && (
            <div className="text-center py-8 text-foreground/60">No data available for this date.</div>
          )}
        </div>
      </div>
    </div>
  );
}
