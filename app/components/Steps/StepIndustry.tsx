"use client";

import { Globe2, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndustryProps {
  availableIndustries: string[];
  selectedIndustries: string[];
  setSelectedIndustries: (val: any) => void;
  selectedAudiences: string[];
  setSelectedAudiences: (val: any) => void;
  selectedScales: string[];
  setSelectedScales: (val: any) => void;
  allAudiences: string[];
  allScales: string[];
  selectedRadarRegions: string[];
  setSelectedRadarRegions: (val: any) => void;
  regionLabels: Record<string, string>;
  radarRegions: Record<string, string[]>;
  toggleAll: (setter: any, current: string[], all: string[]) => void;
  toggleSelection: (setter: any, current: string[], item: string) => void;
  toggleGlobalRadar: () => void;
  
  // Preview Props
  previews: any[];
  isLoadingPreview: boolean;
  countryCode: string;
}

export function StepIndustry({
  availableIndustries,
  selectedIndustries,
  setSelectedIndustries,
  selectedAudiences,
  setSelectedAudiences,
  selectedScales,
  setSelectedScales,
  allAudiences,
  allScales,
  selectedRadarRegions,
  setSelectedRadarRegions,
  regionLabels,
  radarRegions,
  toggleAll,
  toggleSelection,
  toggleGlobalRadar,
  previews,
  isLoadingPreview,
  countryCode
}: StepIndustryProps) {
  return (
    <div className="space-y-12">
      {/* STEP 3a: INDUSTRY EVENTS */}
      <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">3a</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold uppercase tracking-tight">Step 3a: Include Events to Watch For (Optional)</h3>
            <p className="text-sm text-foreground/50">Select the filters to include industry events to your search.</p>
          </div>
        </div>
        
        {/* FILTERS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: "Industry", items: availableIndustries, setter: setSelectedIndustries, current: selectedIndustries },
            { label: "Audience", items: allAudiences, setter: setSelectedAudiences, current: selectedAudiences },
            { label: "Event Scale", items: allScales, setter: setSelectedScales, current: selectedScales }
          ].map((col) => (
            <div key={col.label} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40">{col.label}</h4>
              <label className="flex items-center gap-3 cursor-pointer group mb-2 pb-2 border-b border-foreground/5">
                <div className={cn("w-4 h-4 rounded border flex items-center transition-colors", col.current.length === col.items.length && col.items.length > 0 ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/20 bg-background")}>
                  <input type="checkbox" className="hidden" checked={col.current.length === col.items.length && col.items.length > 0} onChange={() => toggleAll(col.setter, col.current, col.items)} />
                  {col.current.length === col.items.length && col.items.length > 0 && <div className="w-2 h-2 bg-white rounded-sm m-auto" />}
                </div>
                <span className="text-[10px] font-black text-[var(--teal-primary)] uppercase tracking-widest">Select All</span>
              </label>
              <div className="h-auto max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {col.items.map(item => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn("w-4 h-4 rounded border flex items-center transition-colors", col.current.includes(item) ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/20 bg-background")}>
                      <input type="checkbox" className="hidden" checked={col.current.includes(item)} onChange={() => toggleSelection(col.setter, col.current, item)} />
                      {col.current.includes(item) && <div className="w-2 h-2 bg-white rounded-sm m-auto" />}
                    </div>
                    <span className="text-xs opacity-70 group-hover:opacity-100">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* INTEGRATED PREVIEW RIBBON (Moved Here) */}
        <div className="mt-8 pt-6 border-t border-foreground/5">
          <div className="bg-background border border-foreground/10 px-6 py-3 min-h-[52px] flex items-center rounded-2xl shadow-sm transition-all">
            {isLoadingPreview ? (
              <div className="flex items-center gap-2 text-xs text-foreground/40 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                Scanning database...
              </div>
            ) : previews.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar mask-gradient-right w-full">
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 whitespace-nowrap">
                  {previews.length === 8 ? "Top Matches:" : `${previews.length} Matches Found:`}
                </span>
                {previews.map((event, i) => (
                  <a
                    key={i}
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-foreground/[0.03] border border-foreground/10 rounded-full px-3 py-1 text-xs font-medium hover:border-[var(--teal-primary)] hover:text-[var(--teal-primary)] transition-all whitespace-nowrap shadow-sm group"
                  >
                    {event.name}
                    <ExternalLink className="h-2.5 w-2.5 opacity-30 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-foreground/30 italic">
                Select filters above to see upcoming events in {countryCode}...
              </span>
            )}
          </div>
        </div>
      </section>

      {/* STEP 3b: RADAR */}
      <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">3b</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold uppercase tracking-tight">Step 3b: Include events outside your target country (Optional)</h3>
            <p className="text-sm text-foreground/50">Select the regions you want to include.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {Object.entries(regionLabels).map(([key, label]) => (
              <button 
                key={key} 
                onClick={() => toggleSelection(setSelectedRadarRegions, selectedRadarRegions, key)} 
                className={cn("px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border", selectedRadarRegions.includes(key) ? "bg-rose-500/10 text-rose-600 border-rose-500 shadow-sm" : "bg-background border-foreground/10 text-foreground/50 hover:border-rose-500/50")}
              >
                {label}
              </button>
            ))}
          </div>
          <button 
            onClick={toggleGlobalRadar} 
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all", selectedRadarRegions.length === Object.keys(radarRegions).length ? "bg-rose-500 text-white shadow-lg" : "bg-background border border-foreground/10 text-foreground/50")}
          >
            <Globe2 className="w-3 h-3" /> Global
          </button>
        </div>
      </section>
    </div>
  );
}