"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";

// Icons (Added Info, Linkedin, Mail here)
import { Sun, Moon, Loader2, ExternalLink, Info, Linkedin, Mail } from "lucide-react"; 

// Utils & Types
import { cn } from "@/lib/utils";
import type { StrategicAnalysisResult, Country, Region, WatchlistLocation } from "./types";

// Server Actions & API
import { getStrategicAnalysis, getUniqueIndustries, getIndustryPreviews } from "./actions"; 
import { 
  getSupportedCountries, 
  getHybridSupportedRegions, 
  getPublicHolidays, 
  getHybridSchoolHolidays 
} from "@/app/lib/api-clients";

// Components
import { CalendarGrid } from "./components/calendar-grid";
import { DetailModal } from "./components/detail-modal";
import { AnalysisSummary } from "./components/analysis-summary";

// MODULAR CONTENT COMPONENTS
import { HeroSection } from "./components/HeroSection";
import { AboutSection } from "./components/AboutSection";
import { LegalSection } from "./components/LegalSection";

// Refactored Step Components
import { StepLocation } from "./components/Steps/StepLocation";
import { StepWatchlist } from "./components/Steps/StepWatchlist";
import { StepIndustry } from "./components/Steps/StepIndustry";

// --- CONSTANTS ---
const RADAR_REGIONS: Record<string, string[]> = {
  "NORAM": ["US", "CA"],
  "LATAM": ["BR", "MX", "AR", "CO", "CL"],
  "EUROPE": ["GB", "DE", "FR", "CH", "NL", "SE", "DK", "NO", "FI", "ES", "IT", "PL", "EE", "CZ"],
  "MENA": ["AE", "SA", "IL", "QA", "TR"],
  "AFRICA": ["ZA", "NG", "KE", "EG"],
  "APAC": ["SG", "JP", "CN", "KR", "AU", "IN"],
};

const REGION_LABELS: Record<string, string> = {
  "NORAM": "North America", "LATAM": "Latin America", "EUROPE": "Europe",
  "MENA": "Middle East & Israel", "AFRICA": "Africa", "APAC": "Asia Pacific",
};

const ALL_AUDIENCES = ["Executives", "Analysts", "Developers", "Investors", "General"];
const ALL_SCALES = ["Global", "Large", "Medium", "Summit"];

export default function Home() {
  const { resolvedTheme, setTheme } = useTheme();
  
  // --- STATE ---
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<StrategicAnalysisResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form Inputs
  const [countryCode, setCountryCode] = useState("DE");
  const [city, setCity] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedRegion, setSelectedRegion] = useState("");

  // Filters
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [selectedRadarRegions, setSelectedRadarRegions] = useState<string[]>([]);

  // Preview Ribbon State
  const [previews, setPreviews] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Data
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistLocation[]>([]);
  const [watchlistData, setWatchlistData] = useState<any[]>([]);

  // UI Layers
  const [visibleLayers, setVisibleLayers] = useState({
    weather: true,
    publicHolidays: true,
    schoolHolidays: true,
    industryEvents: true,
  });
  const [temperatureUnit, setTemperatureUnit] = useState<'c' | 'f'>('c');

  // --- EFFECTS ---
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const initData = async () => {
        const [cData, iData] = await Promise.all([getSupportedCountries(), getUniqueIndustries()]);
        setCountries(cData.sort((a, b) => a.country_name.localeCompare(b.country_name)));
        setAvailableIndustries(iData);
    };
    initData();
  }, []);

  useEffect(() => {
    const fetchRegions = async () => {
        setSelectedRegion(""); 
        const data = await getHybridSupportedRegions(countryCode);
        setRegions(data);
    };
    fetchRegions();
  }, [countryCode]);

  // Watchlist Fetch
  useEffect(() => {
    if (watchlist.length === 0) {
      setWatchlistData([]);
      return;
    }
    const fetchWatchlist = async () => {
      const results = await Promise.all(watchlist.map(async (loc) => {
        try {
          const [pub, sch] = await Promise.all([
            getPublicHolidays(loc.country, 2026),
            loc.region ? getHybridSchoolHolidays(loc.country, loc.region, 2026) : Promise.resolve([])
          ]);
          return { ...loc, publicHolidays: pub, schoolHolidays: sch };
        } catch (e) {
          return { ...loc, publicHolidays: [], schoolHolidays: [] };
        }
      }));
      setWatchlistData(results);
    };
    fetchWatchlist();
  }, [watchlist]);

  // LIVE PREVIEW EFFECT (Debounced)
  useEffect(() => {
    const fetchPreviews = async () => {
      // Only fetch if at least one filter is active
      if (!selectedIndustries.length && !selectedAudiences.length && !selectedScales.length) {
        setPreviews([]);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const results = await getIndustryPreviews(countryCode, {
          industries: selectedIndustries,
          audiences: selectedAudiences,
          scales: selectedScales
        });
        setPreviews(results);
      } catch (error) {
        console.error("Preview fetch failed", error);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    // Debounce: Wait 500ms after the last click before fetching
    const timeoutId = setTimeout(fetchPreviews, 500);
    return () => clearTimeout(timeoutId);
  }, [selectedIndustries, selectedAudiences, selectedScales, countryCode]);

  // --- MEMOS ---
  const isBasicsReady = !!(countryCode && dateRange?.from && dateRange?.to);
  const radarCountries = useMemo(() => {
    const allCodes = new Set<string>();
    selectedRadarRegions.forEach(k => RADAR_REGIONS[k]?.forEach(c => { if (c !== countryCode) allCodes.add(c); }));
    return Array.from(allCodes);
  }, [selectedRadarRegions, countryCode]);

  const filteredAnalysisData = useMemo(() => {
    if (!analysisResult?.data) return new Map();
    return new Map(Array.from(analysisResult.data.entries()).map(([d, val]) => [d, {
        ...val,
        weather: visibleLayers.weather ? val.weather : null,
        holidays: visibleLayers.publicHolidays ? val.holidays : [],
        schoolHoliday: visibleLayers.schoolHolidays ? val.schoolHoliday : null,
        industryEvents: visibleLayers.industryEvents ? val.industryEvents : [],
    }]));
  }, [analysisResult, visibleLayers]);

  // --- HANDLERS ---
  const handleAnalyze = () => {
    if (!isBasicsReady) return;
    startTransition(async () => {
      const result = await getStrategicAnalysis({
        countryCode, city: city.trim(),
        targetStartDate: format(dateRange!.from!, "yyyy-MM-dd"),
        targetEndDate: format(dateRange!.to!, "yyyy-MM-dd"),
        subdivisionCode: selectedRegion,
        industries: selectedIndustries, audiences: selectedAudiences, scales: selectedScales,
        radarCountries, 
      });
      setAnalysisResult(result);
    });
  };

  const toggleSelection = (setter: any, current: string[], item: string) => {
    setter(current.includes(item) ? current.filter(i => i !== item) : [...current, item]);
  };
  
  const toggleAll = (setter: any, current: string[], all: string[]) => {
    setter(current.length === all.length ? [] : [...all]);
  };

  const toggleGlobalRadar = () => {
    const allKeys = Object.keys(RADAR_REGIONS);
    setSelectedRadarRegions(selectedRadarRegions.length === allKeys.length ? [] : allKeys);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768387131/dateclash/DateClash_Logo_eza9uv.png" alt="Logo" width={32} height={32} />
            <h1 className="text-2xl font-black tracking-tighter uppercase">Date<span className="font-light text-[var(--teal-primary)]">Clash</span></h1>
          </div>
          <button 
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} 
            className="p-2.5 rounded-xl border border-foreground/10 bg-foreground/5 transition-colors hover:bg-foreground/10"
            aria-label="Toggle Theme"
          >
            {mounted && resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </div>
      </header>

      {/* MODULAR HERO (Banners & Intro Text) */}
      <HeroSection mounted={mounted} resolvedTheme={resolvedTheme} />

      <div className="container mx-auto px-4 py-12 space-y-12 max-w-5xl">
        
        {/* GUIDED STEPS */}
        <StepLocation 
          countryCode={countryCode} setCountryCode={setCountryCode} countries={countries}
          dateRange={dateRange} setDateRange={setDateRange}
          city={city} setCity={setCity}
          selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} regions={regions}
        />

        <StepWatchlist watchlist={watchlist} setWatchlist={setWatchlist} countries={countries} />

        {/* STEP 3: Industry & Audience Selection */}
        <div className="space-y-4">
          <StepIndustry 
            availableIndustries={availableIndustries} selectedIndustries={selectedIndustries} setSelectedIndustries={setSelectedIndustries}
            selectedAudiences={selectedAudiences} setSelectedAudiences={setSelectedAudiences}
            selectedScales={selectedScales} setSelectedScales={setSelectedScales}
            allAudiences={ALL_AUDIENCES} allScales={ALL_SCALES}
            selectedRadarRegions={selectedRadarRegions} setSelectedRadarRegions={setSelectedRadarRegions}
            regionLabels={REGION_LABELS} radarRegions={RADAR_REGIONS}
            toggleAll={toggleAll} toggleSelection={toggleSelection} toggleGlobalRadar={toggleGlobalRadar}
            // NEW PROPS
            previews={previews}
            isLoadingPreview={isLoadingPreview}
            countryCode={countryCode}
          />
        </div>

        {/* ANALYZE BUTTON (Fixed Position) */}
        <div className="text-center pt-8">
          <button 
            onClick={handleAnalyze} 
            disabled={isPending || !isBasicsReady} 
            className={cn(
              "px-12 py-6 rounded-2xl font-black uppercase tracking-[0.3em] text-sm transition-all shadow-2xl", 
              isBasicsReady 
                ? "bg-[var(--teal-primary)] text-white hover:scale-105 active:scale-95 shadow-[var(--teal-primary)]/30" 
                : "bg-foreground/10 text-foreground/30 grayscale cursor-not-allowed"
            )}
          >
            {isPending ? (
              <span className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin" /> Crunching Data...</span>
            ) : (
              "Crunch the Data and Analyze Results"
            )}
          </button>
        </div>

        {/* RESULTS SECTION */}
        {analysisResult && (
          <div className="space-y-12 pt-12 border-t border-foreground/10">
            <section className="bg-background border border-foreground/10 rounded-3xl p-8 shadow-xl">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-8">Data Confidence Dashboard</h2>
              <AnalysisSummary 
                metadata={analysisResult.metadata!} 
                visibleLayers={visibleLayers} 
                toggleLayer={(l) => setVisibleLayers(p => ({...p, [l]: !p[l]}))} 
                temperatureUnit={temperatureUnit} 
                setTemperatureUnit={setTemperatureUnit} 
                watchlistData={watchlistData} 
                startDate={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined} 
                endDate={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined} 
                analysisData={analysisResult.data ?? new Map()} 
              />
            </section>
            <section className="bg-background border border-foreground/10 rounded-3xl p-8 shadow-xl">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-8 italic text-balance">
                Calendar Visualization - click on a tile for more information
              </h2>
              <CalendarGrid 
                analysisData={filteredAnalysisData} 
                dateRange={dateRange} 
                onDateClick={(d) => setSelectedDate(d)} 
                temperatureUnit={temperatureUnit} 
                watchlistData={watchlistData} 
              />
            </section>
          </div>
        )}

    {/* CONTACT BANNER (Blue Pill) */}
    {analysisResult && (
          <div className="flex justify-center pt-8 px-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3 sm:py-2 rounded-2xl sm:rounded-full bg-blue-500/10 border border-blue-500/20 w-full sm:w-auto text-center sm:text-left">
              
              {/* Message Content */}
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Info className="w-3 h-3 text-blue-500 shrink-0" />
                <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 leading-tight">
                  Please reach out if you want me to add your event/s to this list.
                </p>
              </div>

              {/* Social Links (Stacked with border-top on mobile, Left-border on desktop) */}
              <div className="flex items-center gap-4 sm:gap-2 pt-2 sm:pt-0 pl-0 sm:pl-2 border-t sm:border-t-0 sm:border-l border-blue-500/20 w-full sm:w-auto justify-center sm:justify-start">
                <a 
                  href="https://www.linkedin.com/in/ali-taghavi-li/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a 
                  href="mailto:taghavi@mergelabs.io" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}


        {/* SEPARATED STATIC COMPONENTS */}
        <AboutSection />
        <LegalSection />
      </div>

      {/* DETAIL MODAL */}
      {selectedDate && analysisResult?.data?.get(selectedDate) && (
        <DetailModal 
          dateStr={selectedDate} 
          data={analysisResult.data.get(selectedDate)!} 
          onClose={() => setSelectedDate(null)} 
          temperatureUnit={temperatureUnit} 
          watchlistData={watchlistData} 
          regionName={selectedRegion ? regions.find(r => r.code === selectedRegion)?.name : countries.find(c => c["iso-3166"] === countryCode)?.country_name} 
        />
      )}
    </main>
  );
}