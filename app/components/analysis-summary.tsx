"use client";

import { useMemo } from "react";
import { parseISO, differenceInDays } from "date-fns";
import { 
  Thermometer, 
  Umbrella, 
  CalendarDays, 
  GraduationCap, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  MapPin,
  ExternalLink
} from "lucide-react";
import type { AnalysisMetadata, DateAnalysis } from "../types";
import { cn } from "@/lib/utils";

interface AnalysisSummaryProps {
  metadata: AnalysisMetadata;
  visibleLayers: {
    weather: boolean;
    publicHolidays: boolean;
    schoolHolidays: boolean;
    industryEvents: boolean;
  };
  toggleLayer: (layer: keyof AnalysisSummaryProps['visibleLayers']) => void;
  temperatureUnit: 'c' | 'f';
  setTemperatureUnit: (unit: 'c' | 'f') => void;
  watchlistData: any[];
  startDate?: string;
  endDate?: string;
  analysisData: Map<string, DateAnalysis>;
}

export function AnalysisSummary({ 
  metadata, 
  visibleLayers, 
  toggleLayer,
  temperatureUnit,
  setTemperatureUnit,
  watchlistData,
  startDate,
  endDate,
  analysisData
}: AnalysisSummaryProps) {
  
  // 1. Calculate Date Duration
  const duration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  }, [startDate, endDate]);

  // 2. Aggregate Watchlist Conflicts
  const watchlistStats = useMemo(() => {
    let totalConflicts = 0;
    const impactedLocations = new Set<string>();

    watchlistData.forEach(loc => {
        const publicConflicts = loc.publicHolidays?.filter((h: any) => h.date >= startDate! && h.date <= endDate!).length || 0;
        
        const schoolConflicts = loc.schoolHolidays?.filter((h: any) => {
             const start = parseISO(h.startDate);
             const end = parseISO(h.endDate);
             const targetStart = parseISO(startDate!);
             const targetEnd = parseISO(endDate!);
             return (start <= targetEnd && end >= targetStart);
        }).length || 0;

        if (publicConflicts + schoolConflicts > 0) {
            totalConflicts += (publicConflicts + schoolConflicts);
            impactedLocations.add(loc.label);
        }
    });

    return { count: totalConflicts, locations: Array.from(impactedLocations) };
  }, [watchlistData, startDate, endDate]);

  // 3. Collect Unique Event Names for "At a Glance"
  const eventHighlights = useMemo(() => {
     const uniqueTargetSchoolNames = new Set<string>();
     const uniquePublicHolidayNames = new Set<string>();
     
     if (!analysisData) return { school: [], public: [] };

     Array.from(analysisData.values()).forEach(day => {
         // Filter to only user-selected range
         if (startDate && endDate && (day.date < startDate || day.date > endDate)) return;

         if (day.schoolHoliday) {
            // FIXED: Directly add the string, no need to check for object
            uniqueTargetSchoolNames.add(day.schoolHoliday);
         }
         
         day.holidays.forEach(h => uniquePublicHolidayNames.add(h.name));
     });

     return {
        school: Array.from(uniqueTargetSchoolNames),
        public: Array.from(uniquePublicHolidayNames)
     };
  }, [analysisData, startDate, endDate]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* WEATHER CARD */}
        <div className={cn("p-4 rounded-xl border transition-all", visibleLayers.weather ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : "bg-background border-foreground/10 opacity-60")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              {metadata.weather.available ? <Thermometer className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span className="text-xs font-bold uppercase tracking-wider">Weather</span>
            </div>
            <div className="flex items-center gap-2">
                 {metadata.weather.available && (
                    <button 
                        onClick={() => setTemperatureUnit(temperatureUnit === 'c' ? 'f' : 'c')}
                        className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-background border border-foreground/10 hover:border-blue-500/50 transition-colors"
                    >
                        °{temperatureUnit.toUpperCase()}
                    </button>
                 )}
                 <div onClick={() => toggleLayer('weather')} className={cn("w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors", visibleLayers.weather ? "bg-blue-500" : "bg-foreground/20")}>
                    <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", visibleLayers.weather ? "translate-x-4" : "translate-x-0")} />
                 </div>
            </div>
          </div>
          {metadata.weather.available ? (
             <div className="space-y-1">
                <p className="text-xs text-foreground/70">Forecast available for <span className="font-bold text-foreground">{metadata.weather.city}</span>.</p>
             </div>
          ) : (
             <p className="text-xs text-foreground/50 italic">Historical data unavailable for this specific geolocation.</p>
          )}
        </div>

        {/* PUBLIC HOLIDAYS CARD */}
        <div className={cn("p-4 rounded-xl border transition-all", visibleLayers.publicHolidays ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" : "bg-background border-foreground/10 opacity-60")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Public Holidays</span>
            </div>
            <div onClick={() => toggleLayer('publicHolidays')} className={cn("w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors", visibleLayers.publicHolidays ? "bg-emerald-500" : "bg-foreground/20")}>
               <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", visibleLayers.publicHolidays ? "translate-x-4" : "translate-x-0")} />
            </div>
          </div>
          <div className="space-y-1">
             {eventHighlights.public.length > 0 ? (
                <>
                    <p className="text-2xl font-black text-foreground">{eventHighlights.public.length}</p>
                    <p className="text-[10px] uppercase font-bold text-foreground/40">National Holidays Found</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {eventHighlights.public.slice(0, 2).map(n => (
                            <span key={n} className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800 truncate max-w-full">
                                {n}
                            </span>
                        ))}
                        {eventHighlights.public.length > 2 && <span className="text-[9px] text-foreground/40">+{eventHighlights.public.length - 2} more</span>}
                    </div>
                </>
             ) : (
                <p className="text-xs text-foreground/50 italic">No public holidays in selected range.</p>
             )}
          </div>
        </div>

        {/* SCHOOL HOLIDAYS CARD */}
        <div className={cn("p-4 rounded-xl border transition-all", visibleLayers.schoolHolidays ? "bg-[var(--teal-primary)]/5 border-[var(--teal-primary)]/20" : "bg-background border-foreground/10 opacity-60")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[var(--teal-primary)]">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">School Holidays</span>
            </div>
            <div onClick={() => toggleLayer('schoolHolidays')} className={cn("w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors", visibleLayers.schoolHolidays ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}>
               <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", visibleLayers.schoolHolidays ? "translate-x-4" : "translate-x-0")} />
            </div>
          </div>
          
          <div className="space-y-2">
            {!metadata.schoolHolidays.checked ? (
                <p className="text-xs text-foreground/50 italic">Select a <strong>Region</strong> to enable school holiday scanning.</p>
            ) : (
                <>
                    <div>
                        <p className="text-2xl font-black text-foreground">{eventHighlights.school.length}</p>
                        <p className="text-[10px] uppercase font-bold text-foreground/40">Vacation Periods Active</p>
                    </div>
                    {eventHighlights.school.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {eventHighlights.school.map(n => (
                                <span key={n} className="text-[9px] px-1.5 py-0.5 bg-[var(--teal-primary)]/10 text-[var(--teal-dark)] rounded border border-[var(--teal-primary)]/20">
                                    {n}
                                </span>
                            ))}
                        </div>
                    )}
                    {metadata.schoolHolidays.isVerified && (
                        <div className="flex items-center gap-1.5 text-[9px] text-[var(--teal-primary)] font-bold uppercase bg-[var(--teal-primary)]/5 py-1 px-2 rounded w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified 2026 Data
                        </div>
                    )}
                </>
            )}
          </div>
        </div>

        {/* INDUSTRY & WATCHLIST CARD */}
        <div className={cn("p-4 rounded-xl border transition-all", visibleLayers.industryEvents ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-background border-foreground/10 opacity-60")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Events & Watchlist</span>
            </div>
            <div onClick={() => toggleLayer('industryEvents')} className={cn("w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors", visibleLayers.industryEvents ? "bg-amber-500" : "bg-foreground/20")}>
               <div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", visibleLayers.industryEvents ? "translate-x-4" : "translate-x-0")} />
            </div>
          </div>
          
          <div className="space-y-3">
             {/* Industry Stats */}
             <div className="flex items-center justify-between">
                <div>
                    <p className="text-xl font-black text-foreground">{metadata.industryEvents.matchCount}</p>
                    <p className="text-[9px] uppercase font-bold text-foreground/40">Conflicting Events</p>
                </div>
                <div className={cn("px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider border", 
                    metadata.industryEvents.confidence === 'HIGH' ? "bg-green-100 text-green-700 border-green-200" :
                    metadata.industryEvents.confidence === 'MEDIUM' ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                    "bg-gray-100 text-gray-500 border-gray-200"
                )}>
                    {metadata.industryEvents.confidence} Confidence
                </div>
             </div>

             {/* Watchlist Alerts */}
             {watchlistStats.count > 0 && (
                 <div className="pt-2 border-t border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                {watchlistStats.count} Watchlist Alerts
                            </p>
                            <p className="text-[9px] text-foreground/60 leading-tight mt-0.5">
                                Conflicts in {watchlistStats.locations.slice(0, 2).join(", ")} 
                                {watchlistStats.locations.length > 2 && "..."}
                            </p>
                        </div>
                    </div>
                 </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}