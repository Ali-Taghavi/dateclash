"use client";

import { useState } from "react";
import { Plus, X, Globe, MapPin, Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistLocation, Country } from "../types";
import { getHybridSupportedRegions } from "@/app/lib/api-clients";

interface WatchlistManagerProps {
  watchlist: WatchlistLocation[];
  onAdd: (location: WatchlistLocation) => void;
  onRemove: (id: string) => void;
  supportedCountries: Country[];
}

export default function WatchlistManager({ 
  watchlist, 
  onAdd, 
  onRemove, 
  supportedCountries 
}: WatchlistManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [customLabel, setCustomLabel] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  
  // Data State
  const [availableRegions, setAvailableRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

  // Handle Country Change
  const handleCountryChange = async (iso: string) => {
    setSelectedCountry(iso);
    setSelectedRegion("");
    setIsLoadingRegions(true);
    try {
      if (iso) {
        const regions = await getHybridSupportedRegions(iso);
        setAvailableRegions(regions);
      } else {
        setAvailableRegions([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRegions(false);
    }
  };

  const handleAdd = () => {
    if (!selectedCountry) return;

    const countryName = supportedCountries.find(c => c["iso-3166"] === selectedCountry)?.country_name || selectedCountry;
    const regionName = availableRegions.find(r => r.code === selectedRegion)?.name;

    // Use custom label if provided, otherwise fallback to "Region, Country" or just "Country"
    const defaultLabel = regionName ? `${regionName}, ${countryName}` : countryName;
    const finalLabel = customLabel.trim() || defaultLabel;

    const newLoc: WatchlistLocation = {
      id: crypto.randomUUID(),
      country: selectedCountry,
      region: selectedRegion || undefined,
      label: finalLabel,
    };

    onAdd(newLoc);
    
    // Reset Form
    setIsOpen(false);
    setSelectedCountry("");
    setSelectedRegion("");
    setCustomLabel("");
  };

  return (
    <div className="border border-foreground/10 rounded-xl p-4 bg-background transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-foreground/50" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/60">
            Multi-Location Watchlist
          </h3>
        </div>
        {!isOpen && (
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--teal-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--teal-dark)] transition-colors shadow-sm"
          >
            <Plus className="h-3 w-3" /> Add Location
          </button>
        )}
      </div>

      {/* Active Watchlist Pills */}
      <div className="flex flex-wrap gap-2">
        {watchlist.length === 0 && !isOpen && (
            <p className="text-[10px] text-foreground/30 italic py-2">
                No extra locations being monitored. Add key hubs (e.g., London, NYC) to track their holidays.
            </p>
        )}
        
        {watchlist.map((loc) => (
          <div 
            key={loc.id} 
            className="group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-[var(--teal-primary)] text-white shadow-sm border border-[var(--teal-dark)]/10 animate-in fade-in zoom-in-95 duration-200"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {loc.label}
            </span>
            <button 
              onClick={() => onRemove(loc.id)}
              className="p-0.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-3 w-3 text-white/80 group-hover:text-white" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Location Form - SINGLE ROW LAYOUT */}
      {isOpen && (
        <div className="mt-4 p-4 bg-foreground/[0.03] rounded-xl border border-foreground/10 animate-in slide-in-from-top-2">
          
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            
            {/* Field 1: Label */}
            <div className="w-full md:flex-1 space-y-1.5">
               <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-foreground/40" />
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-50">Label</label>
               </div>
               <input 
                  type="text" 
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. London HQ..."
                  className="w-full p-2.5 rounded-lg border border-foreground/10 text-xs bg-background outline-none focus:ring-1 focus:ring-[var(--teal-primary)] placeholder:text-foreground/30"
               />
            </div>

            {/* Field 2: Country */}
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Country</label>
                <select 
                value={selectedCountry} 
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-foreground/10 text-xs bg-background outline-none focus:ring-1 focus:ring-[var(--teal-primary)]"
                >
                <option value="">Select...</option>
                {supportedCountries.map(c => (
                    <option key={c["iso-3166"]} value={c["iso-3166"]}>{c.country_name}</option>
                ))}
                </select>
            </div>

            {/* Field 3: Region */}
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Region</label>
                <select 
                value={selectedRegion} 
                onChange={(e) => setSelectedRegion(e.target.value)}
                disabled={!selectedCountry || isLoadingRegions}
                className="w-full p-2.5 rounded-lg border border-foreground/10 text-xs bg-background outline-none focus:ring-1 focus:ring-[var(--teal-primary)] disabled:opacity-50"
                >
                <option value="">All Regions</option>
                {availableRegions.map(r => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                ))}
                </select>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 md:pt-0 md:pb-[1px]">
              <button 
                onClick={() => setIsOpen(false)}
                className="h-[34px] px-3 rounded-lg border border-transparent hover:bg-foreground/5 text-[10px] font-bold uppercase tracking-wider text-foreground/60 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                disabled={!selectedCountry}
                className="h-[34px] flex items-center gap-1.5 px-4 rounded-lg bg-[var(--teal-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--teal-dark)] disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check className="h-3 w-3" /> Add
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}