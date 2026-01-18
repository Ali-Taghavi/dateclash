"use client";

import { Globe2 } from "lucide-react";
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
              <div className="h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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