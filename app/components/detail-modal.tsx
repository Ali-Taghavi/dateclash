"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { X, Calendar, GraduationCap, Landmark, AlertTriangle, Building2, ExternalLink, Globe } from "lucide-react";
import type { DateAnalysis } from "@/app/types";
import { WeatherAccordion } from "./weather-accordion";
import { getGlobalImpact } from "@/app/lib/cultural-impacts";
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
  
  const { watchlistEvents, globalAlerts, filteredPublicHolidays } = useMemo(() => {
    const alerts: any[] = [];
    const seenAlerts = new Set<string>();

    const getMarketDetails = (country: string, label: string) => {
      const regionMaps: Record<string, { segment: string; note?: string }> = {
        'US': { segment: "US Domestic", note: "Federal holiday: Expect banking, shipping, and government closures." },
        'CA': { segment: "Canadian Market", note: "Statutory holiday: Significant retail and business service closures." },
        'IL': { segment: "Israeli Market", note: "National holiday: Sabbath-like restrictions apply; no business or travel." },
        'AE': { segment: "UAE / Middle East Hub", note: "Public sector holiday: Expect modified working hours." },
        'SA': { segment: "Saudi Arabian Market", note: "National observance: Major corporate and public sector closures." },
        'DE': { segment: "DACH Region", note: "Strict 'Silent Day' laws: Public events and loud activities may be restricted." },
        'AT': { segment: "DACH Region", note: "National holiday: Comprehensive retail and corporate office closures." },
        'CH': { segment: "DACH Region", note: "Cantonal holiday: Business impact varies by region." },
        'GB': { segment: "UK Market", note: "Bank Holiday: Full office closures; expect zero corporate response." },
        'FR': { segment: "French Market", note: "Public holiday: 'Pont' (bridge) days often result in extended absences." },
        'SG': { segment: "Singapore / APAC Hub", note: "Public holiday: Major regional logistics and financial delays." },
        'JP': { segment: "Japanese Market", note: "National holiday: Corporate communication typically pauses entirely." },
        'CN': { segment: "Mainland China", note: "Golden Week: Significant supply chain and corporate downtime." },
        'AU': { segment: "Australian Market", note: "Public holiday: State-specific closures may impact coordination." },
        'BR': { segment: "Brazilian Market", note: "National holiday: Business and financial markets are offline." },
        'ZA': { segment: "South African Market", note: "National holiday: Corporate offices generally closed." }
      };

      const details = regionMaps[country];
      if (details) return details;
      if (["IT", "NL", "SE", "DK", "NO", "FI", "PL"].includes(country)) 
        return { segment: "European Market", note: "Standard European holiday: Local office closures expected." };
      return { segment: `${label} Audience`, note: "Local holiday: Check regional leads for availability." };
    };

    // 1. Process Watchlist
    const watchlist = watchlistData.flatMap(loc => {
      const locEvents: any[] = [];
      
      loc.publicHolidays?.filter((h: any) => h.date === dateStr).forEach((h: any) => {
        const details = getMarketDetails(loc.country, loc.label);
        locEvents.push({ name: h.name, location: loc.label, type: "Public Holiday", segment: details.segment, impactNote: details.note });
        
        const globalImpact = getGlobalImpact(h.name);
        if (globalImpact && !seenAlerts.has(globalImpact.name)) {
          alerts.push(globalImpact);
          seenAlerts.add(globalImpact.name);
        }
      });

      loc.schoolHolidays?.filter((h: any) => {
        if (!h.startDate || !h.endDate) return false;
        const current = parseISO(dateStr);
        return current >= parseISO(h.startDate) && current <= parseISO(h.endDate);
      }).forEach((h: any) => {
        locEvents.push({ 
          name: h.name, location: loc.label, type: "School Holiday", 
          segment: "Family / Education Segment", 
          impactNote: "Increased annual leave requests; high family travel volume." 
        });
      });

      return locEvents;
    });

    // 2. Process Data from Server (Separator Logic)
    const localHolidays: any[] = [];

    data.holidays?.forEach(h => {
      // Logic: If it's a Global Impact, it goes to alerts. Otherwise, it's a local public holiday.
      if ((h as any).isGlobalImpact) {
        if (!seenAlerts.has(h.name)) {
          const helperImpact = getGlobalImpact(h.name);
          alerts.push({
            name: h.name,
            segment: helperImpact?.segment || "Global Strategic Impact",
            note: helperImpact?.note || "Significant cross-border business disruption expected."
          });
          seenAlerts.add(h.name);
        }
      } else {
        localHolidays.push(h);
      }
    });

    return { 
      watchlistEvents: watchlist, 
      globalAlerts: alerts, 
      filteredPublicHolidays: localHolidays 
    };
  }, [watchlistData, dateStr, data.holidays]);

  // --- NEW: CALCULATE RISK LEVEL FOR HEADER COLOR ---
  const headerStyle = useMemo(() => {
    // 1. HIGH RISK (Red) - Target Public Holiday
    if (filteredPublicHolidays.length > 0) {
      return {
        container: "bg-rose-500/10 border-rose-500/20",
        iconBg: "bg-rose-500 text-white",
        labelColor: "text-rose-600 dark:text-rose-400"
      };
    }
    
    // 2. CAUTION (Amber) - Any other conflict
    if (
      globalAlerts.length > 0 || 
      watchlistEvents.length > 0 || 
      data.schoolHoliday || 
      (data.industryEvents && data.industryEvents.length > 0)
    ) {
      return {
        container: "bg-amber-500/10 border-amber-500/20",
        iconBg: "bg-amber-500 text-white",
        labelColor: "text-amber-700 dark:text-amber-500"
      };
    }

    // 3. SAFE (Teal) - No conflicts
    return {
      container: "bg-[var(--teal-primary)]/10 border-[var(--teal-primary)]/20",
      iconBg: "bg-[var(--teal-primary)] text-white",
      labelColor: "text-[var(--teal-primary)]"
    };
  }, [filteredPublicHolidays, globalAlerts, watchlistEvents, data]);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background border border-foreground/20 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (Dynamic Color) */}
        <div className={cn("p-4 border-b flex items-center justify-between transition-colors duration-300", headerStyle.container)}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl shadow-sm", headerStyle.iconBg)}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter" suppressHydrationWarning>
                {format(date, "EEEE, MMMM d")}
              </h2>
              <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", headerStyle.labelColor)}>
                Strategic Analysis • {format(date, "yyyy")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-foreground/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* 1. Global Audience Alerts (Strategic Priority) */}
          {globalAlerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Global Audience Alerts
              </h3>
              <div className="space-y-3">
                {globalAlerts.map((alert, idx) => (
                  <div key={idx} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200 text-lg leading-tight">{alert.name}</p>
                        <p className="text-[10px] font-black uppercase text-amber-600/70 mt-1">Cross-Border Cultural Impact</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black uppercase tracking-tighter shadow-sm">
                        Reach: {alert.segment}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border-l-4 border-amber-500">
                      <p className="text-[11px] leading-relaxed text-amber-900 dark:text-amber-100 font-semibold italic">
                        {alert.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Watchlist Section */}
          {watchlistEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" /> Watchlist Notifications
              </h3>
              <div className="space-y-3">
                {watchlistEvents.map((event, idx) => (
                  <div key={idx} className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-bold text-purple-700 dark:text-purple-300 text-lg leading-tight">{event.name}</p>
                        <p className="text-[10px] font-black uppercase text-purple-500/60 mt-1">{event.type} • {event.location}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-purple-500 text-white text-[8px] font-black uppercase tracking-tighter shadow-sm">
                        Impact: {event.segment}
                      </span>
                    </div>
                    {event.impactNote && (
                      <div className="flex gap-2 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg border-l-4 border-purple-600">
                        <p className="text-[11px] leading-relaxed text-purple-900 dark:text-purple-100 font-semibold italic">
                          {event.impactNote}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Industry Events */}
          {data.industryEvents && data.industryEvents.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Industry Events
              </h3>
              <div className="space-y-3">
                {data.industryEvents.map((event, i) => (
                  <div key={i} className="p-4 bg-foreground/[0.03] dark:bg-white/5 border border-foreground/10 rounded-2xl transition-all hover:bg-foreground/[0.05]">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.url ? (
                            <a href={event.url} target="_blank" rel="noopener noreferrer" className={cn("font-black text-base hover:underline decoration-2 underline-offset-4 flex items-center gap-1.5", event.isRadarEvent ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400")}>
                              {event.name} <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                            </a>
                          ) : (
                            <span className={cn("font-black text-base", event.isRadarEvent ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400")}>
                              {event.name}
                            </span>
                          )}
                          {event.is_projected && (
                            <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/50 text-[9px] font-black uppercase tracking-wider whitespace-nowrap border border-foreground/5">
                              Est. {event.projected_from}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-foreground/50">{event.city}, {event.country_code}</p>
                      {event.description && <p className="text-sm text-foreground/70 leading-relaxed mt-1">{event.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Primary Public Holidays (Cleaned Filter) */}
          {filteredPublicHolidays.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <Landmark className="w-3.5 h-3.5 text-blue-500" /> Public Holidays
              </h3>
              <div className="space-y-2">
                {filteredPublicHolidays.map((holiday, i) => (
                  <div key={i} className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <p className="font-bold text-blue-700 dark:text-blue-300 text-lg">{holiday.name}</p>
                    <p className="text-[10px] font-black uppercase text-blue-500/60 mt-1">Primary Target: {regionName}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. School Holidays */}
          {data.schoolHoliday && (
            <section className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-[var(--teal-primary)]" /> School Holidays
              </h3>
              <div className="p-4 bg-[var(--teal-primary)]/5 border border-[var(--teal-primary)]/20 rounded-xl">
                <p className="font-bold text-[var(--teal-dark)] text-lg">{data.schoolHoliday}</p>
                <p className="text-[10px] font-black uppercase text-[var(--teal-primary)] mt-1">Region: {regionName}</p>
              </div>
            </section>
          )}

          {/* 6. Weather Prognosis */}
          <section className="pt-8 border-t border-foreground/10">
            <div className="mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Climatological Context</h3>
            </div>
            <WeatherAccordion weather={data.weather} temperatureUnit={temperatureUnit} />
          </section>
        </div>
      </div>
    </div>
  );
}