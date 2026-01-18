"use client";

import { useMemo } from "react";
import { Cloud, GraduationCap, Building2, Landmark } from "lucide-react";
import type { AnalysisMetadata, DateAnalysis } from "@/app/types";
import { cn } from "@/lib/utils";

interface AnalysisSummaryProps {
  metadata: AnalysisMetadata;
  visibleLayers: {
    weather: boolean;
    publicHolidays: boolean;
    schoolHolidays: boolean;
    industryEvents: boolean;
  };
  toggleLayer: (layer: "weather" | "publicHolidays" | "schoolHolidays" | "industryEvents") => void;
  temperatureUnit: 'c' | 'f';
  setTemperatureUnit: (unit: 'c' | 'f') => void;
  watchlistData?: any[];
  startDate?: string;
  endDate?: string;
  analysisData?: Map<string, DateAnalysis>;
}

export function AnalysisSummary({ 
  metadata, 
  visibleLayers, 
  toggleLayer, 
  temperatureUnit, 
  setTemperatureUnit,
  watchlistData = [], 
  startDate, 
  endDate, 
  analysisData 
}: AnalysisSummaryProps) {

  const counts = useMemo(() => {
    if (!startDate || !endDate || !analysisData) {
      return { tp: 0, ts: 0, ti: 0, tr: 0, wp: 0, ws: 0 };
    }
  
    const uniqueTargetPublicNames = new Set<string>();
    const uniqueTargetSchoolNames = new Set<string>();
    const uniqueTargetEvents = new Set<string>();
    const uniqueRadarEvents = new Set<string>();
  
    analysisData.forEach((day, dateStr) => {
      if (dateStr >= startDate && dateStr <= endDate) {
        day.holidays?.forEach(h => {
          if (h.name) uniqueTargetPublicNames.add(h.name);
        });
  
        if (day.schoolHoliday) {
          uniqueTargetSchoolNames.add(day.schoolHoliday);
        }

        day.industryEvents?.forEach(event => {
          const id = event.id || event.name;
          if (event.isRadarEvent) {
            uniqueRadarEvents.add(id);
          } else {
            uniqueTargetEvents.add(id);
          }
        });
      }
    });
  
    const wp = watchlistData.reduce((acc, loc) => {
      const uniqueHolidays = new Set(
        loc.publicHolidays
          ?.filter((h: any) => h.date >= startDate && h.date <= endDate)
          .map((h: any) => h.name)
      );
      return acc + uniqueHolidays.size;
    }, 0);
  
    const ws = watchlistData.reduce((acc, loc) => {
      const overlappingSchools = loc.schoolHolidays?.filter((sh: any) => 
        sh.startDate <= endDate && sh.endDate >= startDate
      ) || [];
      return acc + overlappingSchools.length;
    }, 0);
  
    return { 
      tp: uniqueTargetPublicNames.size, 
      ts: uniqueTargetSchoolNames.size, 
      ti: uniqueTargetEvents.size, 
      tr: uniqueRadarEvents.size, 
      wp, 
      ws 
    };
  }, [watchlistData, startDate, endDate, analysisData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Weather Status */}
        <div className={cn(
          "border border-foreground/10 rounded-2xl p-5 bg-background transition-all duration-300",
          !visibleLayers.weather && "opacity-50 grayscale"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Weather</span>
            </div>
            <button 
              onClick={() => toggleLayer('weather')} 
              className={cn("w-9 h-5 rounded-full relative transition-colors", visibleLayers.weather ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.weather ? "translate-x-4" : "")} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm font-black text-[var(--teal-primary)] uppercase tracking-tight">
              {metadata.weather.available ? "Live Data Active" : "No Data"}
            </p>
            {metadata.weather.available && (
              <button 
                onClick={() => setTemperatureUnit(temperatureUnit === 'c' ? 'f' : 'c')}
                className="text-[10px] font-black border border-foreground/10 px-2 py-1 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                °{temperatureUnit.toUpperCase()}
              </button>
            )}
          </div>
        </div>

        {/* Public Holidays Summary */}
        <div className={cn(
          "border border-foreground/10 rounded-2xl p-5 bg-background transition-all duration-300",
          !visibleLayers.publicHolidays && "opacity-50 grayscale"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Public</span>
            </div>
            <button 
              onClick={() => toggleLayer('publicHolidays')} 
              className={cn("w-9 h-5 rounded-full relative transition-colors", visibleLayers.publicHolidays ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.publicHolidays ? "translate-x-4" : "")} />
            </button>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] font-bold uppercase opacity-30">Target Region</span>
              <span className="text-sm font-black text-blue-500">{counts.tp}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-foreground/5">
              <span className="text-[9px] font-bold uppercase opacity-30">Watchlist</span>
              <span className="text-sm font-black text-purple-500">{counts.wp}</span>
            </div>
          </div>
        </div>

        {/* School Holidays Summary */}
        <div className={cn(
          "border border-foreground/10 rounded-2xl p-5 bg-background transition-all duration-300",
          !visibleLayers.schoolHolidays && "opacity-50 grayscale"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">School</span>
            </div>
            <button 
              onClick={() => toggleLayer('schoolHolidays')} 
              className={cn("w-9 h-5 rounded-full relative transition-colors", visibleLayers.schoolHolidays ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.schoolHolidays ? "translate-x-4" : "")} />
            </button>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] font-bold uppercase opacity-30">Target Region</span>
              <span className="text-sm font-black text-purple-500">{counts.ts}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-foreground/5">
              <span className="text-[9px] font-bold uppercase opacity-30">Watchlist</span>
              <span className="text-sm font-black text-purple-500/60">{counts.ws}</span>
            </div>
          </div>
        </div>

        {/* Industry Events Summary */}
        <div className={cn(
          "border border-foreground/10 rounded-2xl p-5 bg-background transition-all duration-300",
          !visibleLayers.industryEvents && "opacity-50 grayscale"
        )}>
           <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">Events</span>
            </div>
            <button 
              onClick={() => toggleLayer('industryEvents')} 
              className={cn("w-9 h-5 rounded-full relative transition-colors", visibleLayers.industryEvents ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.industryEvents ? "translate-x-4" : "")} />
            </button>
          </div>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[9px] font-bold uppercase opacity-30">Target Region</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{counts.ti}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-foreground/5">
              <span className="text-[9px] font-bold uppercase opacity-30">Added Regions</span>
              <span className="text-sm font-black text-rose-500">{counts.tr}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}