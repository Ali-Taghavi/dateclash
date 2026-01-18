"use client";

import { useState } from "react";
import { Plus, X, Globe, Tag, Check } from "lucide-react";
import type { WatchlistLocation, Country } from "../types";
import { getHybridSupportedRegions } from "@/app/lib/api-clients";
import { CountrySearch } from "./CountrySearch"; 

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
  const [customLabel, setCustomLabel] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [availableRegions, setAvailableRegions] = useState<any[]>([]);
  const [isLoadingRegions, setIsLoadingRegions] = useState(false);

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
    const defaultLabel = regionName ? `${regionName}, ${countryName}` : countryName;
    const finalLabel = customLabel.trim() || defaultLabel;

    onAdd({
      id: crypto.randomUUID(),
      country: selectedCountry,
      region: selectedRegion || undefined,
      label: finalLabel,
    });
    
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

      <div className="flex flex-wrap gap-2">
        {watchlist.length === 0 && !isOpen && (
            <p className="text-[10px] text-foreground/30 italic py-2">
                No extra locations being monitored. Add key hubs to track their holidays.
            </p>
        )}
        {watchlist.map((loc) => (
          <div key={loc.id} className="group flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-[var(--teal-primary)] text-white shadow-sm border border-[var(--teal-dark)]/10">
            <span className="text-[10px] font-bold uppercase tracking-wide">{loc.label}</span>
            <button onClick={() => onRemove(loc.id)} className="p-0.5 rounded-full hover:bg-white/20 transition-colors">
              <X className="h-3 w-3 text-white/80 group-hover:text-white" />
            </button>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="mt-4 p-4 bg-foreground/[0.03] rounded-xl border border-foreground/10 animate-in slide-in-from-top-2">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            
            {/* Label Field */}
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
                  className="w-full h-[38px] p-2.5 rounded-lg border border-foreground/10 text-xs bg-background outline-none focus:ring-1 focus:ring-[var(--teal-primary)] placeholder:text-foreground/30"
               />
            </div>

            {/* Country Field (With Compact Prop) */}
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Country</label>
                <CountrySearch 
                  countries={supportedCountries} 
                  value={selectedCountry} 
                  onChange={handleCountryChange}
                  compact
                />
            </div>

            {/* Region Field */}
            <div className="w-full md:w-48 space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-50 ml-1">Region</label>
                <select 
                  value={selectedRegion} 
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  disabled={!selectedCountry || isLoadingRegions}
                  className="w-full p-2.5 h-[38px] rounded-lg border border-foreground/10 text-xs bg-background outline-none focus:ring-1 focus:ring-[var(--teal-primary)] disabled:opacity-50"
                >
                  <option value="">All Regions</option>
                  {availableRegions.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
            </div>
            
            <div className="flex items-center gap-2 pt-2 md:pt-0 md:pb-[1px]">
              <button 
                onClick={() => setIsOpen(false)}
                className="h-[38px] px-3 rounded-lg hover:bg-foreground/5 text-[10px] font-bold uppercase tracking-wider text-foreground/60 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAdd}
                disabled={!selectedCountry}
                className="h-[38px] flex items-center gap-1.5 px-4 rounded-lg bg-[var(--teal-primary)] text-white text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--teal-dark)] disabled:opacity-50 transition-colors shadow-sm"
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