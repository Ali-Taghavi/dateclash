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
  toggleLayer: (layer: string) => void;
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
    // 1. Return zeros if any required data is missing
    if (!startDate || !endDate || !analysisData) {
      return { tp: 0, ts: 0, ti: 0, tr: 0, wp: 0, ws: 0 };
    }
  
    // 2. Use Sets to track unique names/IDs found strictly within the visible range
    const uniqueTargetPublicNames = new Set<string>();
    const uniqueTargetSchoolNames = new Set<string>();
    
    // Separate sets for Target vs Radar events
    const uniqueTargetEvents = new Set<string>();
    const uniqueRadarEvents = new Set<string>();
  
    analysisData.forEach((day, dateStr) => {
      // 3. Strict filtering: Only count if date is inside user selection
      if (dateStr >= startDate && dateStr <= endDate) {
        
        // Public Holidays
        day.holidays?.forEach(h => {
          if (h.name) uniqueTargetPublicNames.add(h.name);
        });
  
        // School Holidays
        if (day.schoolHoliday) {
          const schoolName = typeof day.schoolHoliday === 'string' 
            ? day.schoolHoliday 
            : day.schoolHoliday.name;
          uniqueTargetSchoolNames.add(schoolName);
        }

        // Industry Events (Split by Target vs Radar)
        day.industryEvents?.forEach(event => {
          const id = event.id || event.name; // Use ID or Name for uniqueness
          
          if (event.isRadarEvent) {
            uniqueRadarEvents.add(id);
          } else {
            uniqueTargetEvents.add(id);
          }
        });
      }
    });
  
    // 4. Watchlist Public Holidays
    const wp = watchlistData.reduce((acc, loc) => {
      const uniqueHolidays = new Set(
        loc.publicHolidays
          ?.filter((h: any) => h.date >= startDate && h.date <= endDate)
          .map((h: any) => h.name)
      );
      return acc + uniqueHolidays.size;
    }, 0);
  
    // 5. Watchlist School Holidays
    const ws = watchlistData.reduce((acc, loc) => {
      const overlappingSchools = loc.schoolHolidays?.filter((sh: any) => 
        sh.startDate <= endDate && sh.endDate >= startDate
      ) || [];
      return acc + overlappingSchools.length;
    }, 0);
  
    return { 
      tp: uniqueTargetPublicNames.size, 
      ts: uniqueTargetSchoolNames.size, 
      ti: uniqueTargetEvents.size, // Target Industry
      tr: uniqueRadarEvents.size,  // Radar Industry
      wp, 
      ws 
    };
  }, [watchlistData, startDate, endDate, analysisData]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Weather */}
        <div className={cn(
          "border border-foreground/10 rounded-xl p-4 bg-background transition-opacity duration-300",
          !visibleLayers.weather && "opacity-50"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground/70">Weather</span>
            </div>
            <button 
              onClick={() => toggleLayer('weather')} 
              className={cn("w-8 h-5 rounded-full relative transition-colors", visibleLayers.weather ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.weather ? "translate-x-3" : "")} />
            </button>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 mb-1">Status</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-[var(--teal-primary)] uppercase tracking-tight">
              {metadata.weather.available ? "Live Data Active" : "No Data"}
            </p>
            {metadata.weather.available && (
              <button 
                onClick={() => setTemperatureUnit(temperatureUnit === 'c' ? 'f' : 'c')}
                className="text-[10px] font-black border border-foreground/10 px-1.5 py-0.5 rounded hover:bg-foreground/5 uppercase"
              >
                °{temperatureUnit}
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Public Holidays */}
        <div className={cn(
          "border border-foreground/10 rounded-xl p-4 bg-background transition-opacity duration-300",
          !visibleLayers.publicHolidays && "opacity-50"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground/70">Public Holidays</span>
            </div>
            <button 
              onClick={() => toggleLayer('publicHolidays')} 
              className={cn("w-8 h-5 rounded-full relative transition-colors", visibleLayers.publicHolidays ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.publicHolidays ? "translate-x-3" : "")} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="opacity-30">Target Venue</span>
              <span className="text-blue-500">{counts.tp} Found</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider pt-1 border-t border-foreground/5">
              <span className="opacity-30">Watchlist</span>
              <span className="text-purple-500">{counts.wp} Found</span>
            </div>
          </div>
        </div>

        {/* Card 3: School Holidays */}
        <div className={cn(
          "border border-foreground/10 rounded-xl p-4 bg-background transition-opacity duration-300",
          !visibleLayers.schoolHolidays && "opacity-50"
        )}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground/70">School Holidays</span>
            </div>
            <button 
              onClick={() => toggleLayer('schoolHolidays')} 
              className={cn("w-8 h-5 rounded-full relative transition-colors", visibleLayers.schoolHolidays ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.schoolHolidays ? "translate-x-3" : "")} />
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="opacity-30">Target Region</span>
              <span className="text-purple-500">{counts.ts} Found</span>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider pt-1 border-t border-foreground/5">
              <span className="opacity-30">Watchlist</span>
              <span className="text-purple-500/60">{counts.ws} Found</span>
            </div>
          </div>
        </div>

        {/* Card 4: Events Found (UPDATED: Split Target vs Radar) */}
        <div className={cn(
          "border border-foreground/10 rounded-xl p-4 bg-background transition-opacity duration-300",
          !visibleLayers.industryEvents && "opacity-50"
        )}>
           <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground/70">Events Found</span>
            </div>
            <button 
              onClick={() => toggleLayer('industryEvents')} 
              className={cn("w-8 h-5 rounded-full relative transition-colors", visibleLayers.industryEvents ? "bg-[var(--teal-primary)]" : "bg-foreground/20")}
            >
              <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", visibleLayers.industryEvents ? "translate-x-3" : "")} />
            </button>
          </div>
          
          <div className="space-y-2">
            {/* Target Venue Count */}
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="opacity-30">Target Venue</span>
              <span className="text-amber-500">{counts.ti} Found</span>
            </div>
            
            {/* Market Radar Count (New) */}
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider pt-1 border-t border-foreground/5">
              <span className="opacity-30">Market Radar</span>
              <span className="text-rose-500">{counts.tr} Found</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}