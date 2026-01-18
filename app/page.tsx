"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Moon, Sun, MapPin, Globe, ChevronDown, Filter, ChevronUp, Loader2, ExternalLink, ScanSearch, Globe2 } from "lucide-react"; 
import { getStrategicAnalysis, getUniqueIndustries, getIndustryPreviews } from "./actions"; 
import { 
  getSupportedCountries, 
  getHybridSupportedRegions, 
  getPublicHolidays, 
  getHybridSchoolHolidays 
} from "@/app/lib/api-clients";
import type { StrategicAnalysisResult, Country, Region, WatchlistLocation } from "./types";
import { format, differenceInDays } from "date-fns";
import { type DateRange } from "react-day-picker";
import { DateRangePicker } from "./components/date-range-picker";
import { CalendarGrid } from "./components/calendar-grid";
import { DetailModal } from "./components/detail-modal";
import { AnalysisSummary } from "./components/analysis-summary";
import { AboutSection } from "./components/about-section";
import WatchlistManager from "./components/WatchlistManager";
import { cn } from "@/lib/utils";

// --- REGIONAL MAPPING CONFIGURATION ---
const RADAR_REGIONS: Record<string, string[]> = {
  "NORAM": ["US", "CA"],
  "LATAM": ["BR", "MX", "AR", "CO", "CL"],
  "EUROPE": ["GB", "DE", "FR", "CH", "NL", "SE", "DK", "NO", "FI", "ES", "IT", "PL", "EE", "CZ"],
  "MENA": ["AE", "SA", "IL", "QA", "TR"],
  "AFRICA": ["ZA", "NG", "KE", "EG"],
  "APAC": ["SG", "JP", "CN", "KR", "AU", "IN"],
};

const REGION_LABELS: Record<string, string> = {
  "NORAM": "North America",
  "LATAM": "Latin America",
  "EUROPE": "Europe",
  "MENA": "Middle East & Israel",
  "AFRICA": "Africa",
  "APAC": "Asia Pacific",
};

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<StrategicAnalysisResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState("DE");
  const [city, setCity] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedRegion, setSelectedRegion] = useState("");
  
  // Industry Filter State
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  
  // Market Radar State
  const [selectedRadarRegions, setSelectedRadarRegions] = useState<string[]>([]);

  // Derived: The actual flat list of country codes to send to backend
  const radarCountries = useMemo(() => {
    const allCodes = new Set<string>();
    selectedRadarRegions.forEach(regionKey => {
      RADAR_REGIONS[regionKey]?.forEach(code => {
        // Automatically exclude the target country from radar to avoid duplicates
        if (code !== countryCode) {
          allCodes.add(code);
        }
      });
    });
    return Array.from(allCodes);
  }, [selectedRadarRegions, countryCode]);

  // Preview Ribbon State
  const [previews, setPreviews] = useState<{name: string, url: string, city: string}[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<WatchlistLocation[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);

  // API Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);
  const [isRegionsLoading, setIsRegionsLoading] = useState(false);

  // UI state
  const [visibleLayers, setVisibleLayers] = useState({
    weather: true,
    publicHolidays: true,
    schoolHolidays: true,
    industryEvents: true,
  });
  const [temperatureUnit, setTemperatureUnit] = useState<'c' | 'f'>('c');

  // Handle hydration
  useEffect(() => { setMounted(true); }, []);

  // LIVE PREVIEW LOGIC
  useEffect(() => {
    if (!filtersOpen) return;

    if (selectedIndustries.length === 0 && selectedAudiences.length === 0 && selectedScales.length === 0) {
      setPreviews([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingPreview(true);
      const results = await getIndustryPreviews(countryCode, {
        industries: selectedIndustries,
        audiences: selectedAudiences,
        scales: selectedScales
      });
      setPreviews(results);
      setIsLoadingPreview(false);
    }, 500); 

    return () => clearTimeout(timer);
  }, [selectedIndustries, selectedAudiences, selectedScales, countryCode, filtersOpen]);

  // Performant mapping of region name
  const selectedRegionName = useMemo(() => 
    regions.find(r => r.code === selectedRegion)?.name || 
    countries.find(c => c["iso-3166"] === countryCode)?.country_name || 
    "Target Region",
  [regions, selectedRegion, countries, countryCode]);

  // Fetch Watchlist Data
  useEffect(() => {
    if (watchlist.length === 0) {
      setWatchlistData([]);
      return;
    }
    const fetchWatchlist = async () => {
      const results = await Promise.all(watchlist.map(async (loc) => {
        try {
          const [publicHolidays, schoolHolidays] = await Promise.all([
            getPublicHolidays(loc.country, 2026),
            loc.region ? getHybridSchoolHolidays(loc.country, loc.region, 2026) : Promise.resolve([])
          ]);
          return { ...loc, publicHolidays, schoolHolidays };
        } catch (e) {
          return { ...loc, publicHolidays: [], schoolHolidays: [] };
        }
      }));
      setWatchlistData(results);
    };
    fetchWatchlist();
  }, [watchlist]);

  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
        try {
            const [countriesData, industriesData] = await Promise.all([
                getSupportedCountries(),
                getUniqueIndustries()
            ]);
            setCountries(countriesData.sort((a, b) => a.country_name.localeCompare(b.country_name)));
            setAvailableIndustries(industriesData);
        } catch (error) {
            console.error("Failed to load initial data", error);
        } finally {
            setIsCountriesLoading(false);
        }
    };
    initData();
  }, []);

  // Sync regions when country changes
  useEffect(() => {
    const fetchRegions = async () => {
        setIsRegionsLoading(true);
        setSelectedRegion(""); 
        
        // FIXED: Removed invalid call to setRadarCountries. 
        // The exclusion logic is now handled automatically by useMemo above.
        
        try {
            const data = await getHybridSupportedRegions(countryCode);
            setRegions(data);
        } catch (error) {
            console.error("Failed to fetch regions", error);
        } finally {
            setIsRegionsLoading(false);
        }
    };
    fetchRegions();
  }, [countryCode]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    const daysDiff = range?.from && range?.to ? differenceInDays(range.to, range.from) : 0;
    setDateError(daysDiff > 14 ? "Maximum 14 days allowed for analysis." : null);
    setDateRange(range);
  };

  const handleAnalyze = () => {
    if (!dateRange?.from || !dateRange?.to || dateError) return;
    startTransition(async () => {
      const result = await getStrategicAnalysis({
        countryCode,
        city: city.trim(),
        targetStartDate: format(dateRange.from!, "yyyy-MM-dd"),
        targetEndDate: format(dateRange.to!, "yyyy-MM-dd"),
        subdivisionCode: selectedRegion,
        industries: selectedIndustries,
        audiences: selectedAudiences,
        scales: selectedScales,
        radarCountries, 
      });
      setAnalysisResult(result);
    });
  };

  const toggleLayer = (layer: keyof typeof visibleLayers) => {
    setVisibleLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const toggleSelection = (setter: any, current: string[], item: string) => {
    setter(current.includes(item) ? current.filter(i => i !== item) : [...current, item]);
  };
  
  const toggleAll = (setter: any, current: string[], all: string[]) => {
    setter(current.length === all.length ? [] : [...all]);
  };

  const toggleRadarRegion = (regionKey: string) => {
    setSelectedRadarRegions(prev => {
      if (prev.includes(regionKey)) {
        return prev.filter(r => r !== regionKey);
      } else {
        return [...prev, regionKey];
      }
    });
  };

  const toggleGlobalRadar = () => {
    const allKeys = Object.keys(RADAR_REGIONS);
    if (selectedRadarRegions.length === allKeys.length) {
      setSelectedRadarRegions([]);
    } else {
      setSelectedRadarRegions(allKeys);
    }
  };

  const allAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
  const allScales = ["Global", "Large", "Medium", "Summit"];

  const filteredAnalysisData = useMemo(() => {
    if (!analysisResult?.data) return undefined;
    return new Map(Array.from(analysisResult.data.entries()).map(([dateStr, data]) => [
      dateStr,
      {
        ...data,
        weather: visibleLayers.weather ? data.weather : null,
        holidays: visibleLayers.publicHolidays ? data.holidays : [],
        schoolHoliday: visibleLayers.schoolHolidays ? data.schoolHoliday : null,
        industryEvents: visibleLayers.industryEvents ? data.industryEvents : [],
      }
    ]));
  }, [analysisResult, visibleLayers]);

  const selectedDateData = selectedDate ? analysisResult?.data.get(selectedDate) : null;

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768387131/dateclash/DateClash_Logo_eza9uv.png" alt="Logo" width={32} height={32} />
            <h1 className="text-2xl font-black tracking-tighter uppercase">Date<span className="font-light text-[var(--teal-primary)]">Clash</span></h1>
          </div>
          <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="p-2.5 rounded-xl border border-foreground/10 bg-foreground/5 transition-colors">
            {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div className="mx-[6%] mt-6 mb-2">
        {mounted && resolvedTheme === "dark" ? (
          <Image src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_dark_edcymy.png" alt="DateClash Banner" width={1200} height={300} priority className="w-full h-auto object-cover rounded-xl shadow-md" />
        ) : (
          <Image src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_light_icugc9.png" alt="DateClash Banner" width={1200} height={300} priority className="w-full h-auto object-cover rounded-xl shadow-md" />
        )}
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Find Your Perfect Slot in A Complex Web Of Criterias</h2>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Don't let bad weather or conflicting industry summits derail your success. Select your target <strong>Location</strong> and <strong>Date Range</strong> below to uncover hidden risks.
          </p>
        </div>

        <section className="border border-foreground/10 rounded-2xl p-6 bg-foreground/[0.02] shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-6 flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Target Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* COUNTRY SELECT */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-50">Country</label>
              <div className="relative">
                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full p-3 pr-10 rounded-xl border border-foreground/10 bg-background outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20 transition-all appearance-none cursor-pointer">
                  {countries.map(c => <option key={c["iso-3166"]} value={c["iso-3166"]}>{c.country_name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-50">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Heidelberg" className="w-full p-3 rounded-xl border border-foreground/10 bg-background outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20 transition-all" />
            </div>

            {/* REGION SELECT */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-50">Region</label>
              <div className="relative">
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full p-3 pr-10 rounded-xl border border-foreground/10 bg-background outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20 transition-all appearance-none cursor-pointer">
                  <option value="">None / All Regions</option>
                  {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-50">Date Window</label>
              <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
              {dateError && <p className="text-[10px] text-red-500 font-bold mt-1">{dateError}</p>}
            </div>
          </div>

          <div className="mt-8">
            <WatchlistManager 
              onAdd={(loc) => setWatchlist(prev => [...prev, loc])} 
              onRemove={(id) => setWatchlist(prev => prev.filter(l => l.id !== id))} 
              watchlist={watchlist} 
              supportedCountries={countries} 
            />
          </div>

          {/* Industry Events Filter */}
          <div className="border border-foreground/10 rounded-xl bg-foreground/[0.02] overflow-hidden mt-6 transition-all duration-300">
            <button 
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-foreground/5 transition-colors"
            >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground/70">
                <Filter className="h-4 w-4" /> Industry Events Filter
                </div>
                {filtersOpen ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
            </button>

            {filtersOpen && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                  <div className="p-6 border-t border-foreground/10">
                    
                    {/* 3-Column Filter Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                      {/* Industry */}
                      <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase opacity-50">Industry</h4>
                          <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedIndustries.length === availableIndustries.length && availableIndustries.length > 0 ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                      <input type="checkbox" className="hidden" checked={selectedIndustries.length === availableIndustries.length && availableIndustries.length > 0} onChange={() => toggleAll(setSelectedIndustries, selectedIndustries, availableIndustries)} />
                                      {selectedIndustries.length === availableIndustries.length && availableIndustries.length > 0 && <div className="w-2 h-2 bg-white rounded-sm" />}
                                  </div>
                                  <span className="text-sm font-bold opacity-80">Select All</span>
                              </label>
                              <div className="h-px bg-foreground/10 my-2" />
                              {availableIndustries.map((item) => (
                                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedIndustries.includes(item) ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                          <input type="checkbox" className="hidden" checked={selectedIndustries.includes(item)} onChange={() => toggleSelection(setSelectedIndustries, selectedIndustries, item)} />
                                          {selectedIndustries.includes(item) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                      </div>
                                      <span className="text-sm opacity-70">{item}</span>
                                  </label>
                              ))}
                          </div>
                      </div>

                      {/* Audience */}
                      <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase opacity-50">Audience</h4>
                          <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedAudiences.length === allAudiences.length ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                      <input type="checkbox" className="hidden" checked={selectedAudiences.length === allAudiences.length} onChange={() => toggleAll(setSelectedAudiences, selectedAudiences, allAudiences)} />
                                      {selectedAudiences.length === allAudiences.length && <div className="w-2 h-2 bg-white rounded-sm" />}
                                  </div>
                                  <span className="text-sm font-bold opacity-80">Select All</span>
                              </label>
                              <div className="h-px bg-foreground/10 my-2" />
                              {allAudiences.map((item) => (
                                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedAudiences.includes(item) ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                          <input type="checkbox" className="hidden" checked={selectedAudiences.includes(item)} onChange={() => toggleSelection(setSelectedAudiences, selectedAudiences, item)} />
                                          {selectedAudiences.includes(item) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                      </div>
                                      <span className="text-sm opacity-70">{item}</span>
                                  </label>
                              ))}
                          </div>
                      </div>

                      {/* Scale */}
                      <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase opacity-50">Scale</h4>
                          <div className="space-y-2">
                              <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedScales.length === allScales.length ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                      <input type="checkbox" className="hidden" checked={selectedScales.length === allScales.length} onChange={() => toggleAll(setSelectedScales, selectedScales, allScales)} />
                                      {selectedScales.length === allScales.length && <div className="w-2 h-2 bg-white rounded-sm" />}
                                  </div>
                                  <span className="text-sm font-bold opacity-80">Select All</span>
                              </label>
                              <div className="h-px bg-foreground/10 my-2" />
                              {allScales.map((item) => (
                                  <label key={item} className="flex items-center gap-3 cursor-pointer group">
                                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedScales.includes(item) ? "bg-[var(--teal-primary)] border-[var(--teal-primary)]" : "border-foreground/30 bg-background")}>
                                          <input type="checkbox" className="hidden" checked={selectedScales.includes(item)} onChange={() => toggleSelection(setSelectedScales, selectedScales, item)} />
                                          {selectedScales.includes(item) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                      </div>
                                      <span className="text-sm opacity-70">{item}</span>
                                  </label>
                              ))}
                          </div>
                      </div>
                    </div>

                    {/* MARKET RADAR SECTION (Regional) */}
                    <div className="pt-6 border-t border-foreground/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ScanSearch className="h-4 w-4 text-rose-500" />
                            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground/60">
                                Market Radar (Regional Context)
                            </h4>
                        </div>
                        <button 
                            onClick={toggleGlobalRadar}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                selectedRadarRegions.length === Object.keys(RADAR_REGIONS).length 
                                    ? "bg-rose-500/10 text-rose-600 border border-rose-500 shadow-sm" 
                                    : "bg-background border border-foreground/10 hover:border-rose-500/50 text-foreground/50 hover:text-rose-500"
                            )}
                        >
                            <Globe2 className="w-3 h-3" />
                            Global / All
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(REGION_LABELS).map(([key, label]) => {
                          const isActive = selectedRadarRegions.includes(key);
                          return (
                            <button
                              key={key}
                              onClick={() => toggleRadarRegion(key)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                isActive 
                                  ? "bg-rose-500/10 text-rose-600 border-rose-500 shadow-sm" // Soft Active State
                                  : "bg-background border-foreground/10 hover:border-rose-500/30 text-foreground/60 hover:text-foreground"
                              )}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-foreground/40 mt-3 italic">
                        Select economic regions to scan for conflicting events (highlighted in <span className="text-rose-500 font-bold">Pink</span>). 
                        Target country ({countryCode}) is automatically excluded from radar results.
                      </p>
                    </div>

                  </div>

                  {/* LIVE PREVIEW RIBBON */}
                  <div className="bg-foreground/[0.03] border-t border-foreground/10 px-6 py-3 min-h-[52px] flex items-center">
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
                            className="flex items-center gap-1.5 bg-background border border-foreground/10 rounded-full px-3 py-1 text-xs font-medium hover:border-[var(--teal-primary)] hover:text-[var(--teal-primary)] transition-all whitespace-nowrap shadow-sm group"
                          >
                            {event.name}
                            <ExternalLink className="h-2.5 w-2.5 opacity-30 group-hover:opacity-100" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-foreground/30 italic">
                        Select filters to see matching events in {countryCode}...
                      </span>
                    )}
                  </div>
                </div>
            )}
          </div>

          <button onClick={handleAnalyze} disabled={isPending || !dateRange || !!dateError} className="w-full lg:w-auto mt-8 px-8 py-4 rounded-xl bg-[var(--teal-primary)] text-white font-bold uppercase tracking-widest text-xs hover:bg-[var(--teal-dark)] disabled:opacity-20 transition-all shadow-lg shadow-[var(--teal-primary)]/20">
            {isPending ? "Crunching Data..." : "Analyze Strategic Window"}
          </button>
        </section>

        {analysisResult && (
          <div className="space-y-8 animate-in fade-in duration-700">
            <section className="border border-foreground/10 rounded-2xl p-6 bg-background shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-6 flex items-center gap-2">
                <Globe className="h-4 w-4" /> Data Confidence Dashboard
              </h2>
              <AnalysisSummary 
                metadata={analysisResult.metadata!} 
                visibleLayers={visibleLayers} 
                toggleLayer={toggleLayer} 
                temperatureUnit={temperatureUnit} 
                setTemperatureUnit={setTemperatureUnit} 
                watchlistData={watchlistData}
                startDate={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined} 
                endDate={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined}
                analysisData={analysisResult.data} 
              />
            </section>

            <section className="border border-foreground/10 rounded-2xl p-6 bg-background shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-6">Strategic Calendar Analysis</h2>
              <CalendarGrid 
                analysisData={filteredAnalysisData!} 
                dateRange={dateRange} 
                onDateClick={setSelectedDate} 
                temperatureUnit={temperatureUnit} 
                watchlistData={watchlistData} 
              />
            </section>
          </div>
        )}

        <AboutSection />

        <div className="mt-12 pt-8 border-t border-foreground/10 bg-foreground/[0.02] rounded-2xl p-8">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Legal Notice & Disclaimer</h3>
            <p className="text-xs leading-relaxed text-foreground/60 italic">
              DateClash is a service provided by MergeLabs GmbH. All data, including school holidays, public holidays, weather forecasts, and event listings, is provided "as is" for informational purposes only. MergeLabs GmbH makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, or completeness of the data. Dates are subject to change by local authorities without notice.
            </p>
            <div className="flex items-center justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-foreground/30">
              <a href="/impressum" className="hover:text-[var(--teal-primary)] transition-colors">Impressum</a>
              <span>•</span>
              <a href="/datenschutz" className="hover:text-[var(--teal-primary)] transition-colors">Datenschutzerklärung</a>
            </div>
          </div>
        </div>
      </div>

      {selectedDate && selectedDateData && (
        <DetailModal 
          dateStr={selectedDate} 
          data={selectedDateData} 
          onClose={() => setSelectedDate(null)} 
          temperatureUnit={temperatureUnit}
          watchlistData={watchlistData}
          regionName={selectedRegionName}
        />
      )}
    </main>
  );
}