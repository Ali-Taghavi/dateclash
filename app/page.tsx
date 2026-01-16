"use client";

import { useState, useTransition, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Moon, Sun, MapPin, Filter, ChevronDown, ChevronUp, ShieldCheck, Globe } from "lucide-react";
import { getStrategicAnalysis, getUniqueIndustries } from "./actions";
import { getSupportedCountries, getHybridSupportedRegions } from "@/app/lib/api-clients";
import type { StrategicAnalysisResult, DateAnalysis, Country, Region } from "./types";
import { EventScale } from "./types";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { type DateRange } from "react-day-picker";
import { DateRangePicker } from "./components/date-range-picker";
import { CalendarGrid } from "./components/calendar-grid";
import { DetailModal } from "./components/detail-modal";
import { AnalysisSummary } from "./components/analysis-summary";
import { AboutSection } from "./components/about-section";

export default function Home() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<StrategicAnalysisResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState("DE");
  const [city, setCity] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<EventScale[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");

  // Countries state
  const [countries, setCountries] = useState<Country[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);

  // Regions state
  const [regions, setRegions] = useState<Region[]>([]);
  const [isRegionsLoading, setIsRegionsLoading] = useState(false);

  // Available industries from database
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  // Date range validation error
  const [dateError, setDateError] = useState<string | null>(null);

  // Handle theme hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const fetchedCountries = await getSupportedCountries();
        // Sort countries alphabetically by country_name
        fetchedCountries.sort((a, b) => a.country_name.localeCompare(b.country_name));
        setCountries(fetchedCountries);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      } finally {
        setIsCountriesLoading(false);
      }
    };

    fetchCountries();
  }, []);

  // Fetch available industries on mount
  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const industries = await getUniqueIndustries();
        setAvailableIndustries(industries);
      } catch (error) {
        console.error("Failed to fetch industries:", error);
      }
    };

    fetchIndustries();
  }, []);

  // Fetch regions when country changes
  useEffect(() => {
    const fetchRegions = async () => {
      console.log(`[Home] Fetching regions for country: ${countryCode}`);
      setIsRegionsLoading(true);
      setSelectedRegion(""); // Reset selection when country changes
      try {
        const fetchedRegions = await getHybridSupportedRegions(countryCode);
        console.log(`[Home] Received ${fetchedRegions.length} regions for ${countryCode}`);
        setRegions(fetchedRegions);
      } catch (error) {
        console.error("[Home] Failed to fetch regions:", error);
        if (error instanceof Error) {
          console.error("[Home] Error details:", error.message, error.stack);
        }
        setRegions([]);
      } finally {
        setIsRegionsLoading(false);
      }
    };

    fetchRegions();
  }, [countryCode]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from || !range?.to) {
      setDateRange(range);
      setDateError(null);
      return;
    }

    const daysDiff = differenceInDays(range.to, range.from);
    
    if (daysDiff > 14) {
      setDateRange(range); // Still update so user can see their selection
      setDateError("To keep analysis fast, please select a maximum of 14 days. We automatically analyze the 2 weeks before and after your dates for you!");
    } else {
      setDateRange(range);
      setDateError(null);
    }
  };

  const handleAnalyze = () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert("Please select a date range");
      return;
    }

    // Safety check: ensure date range is not more than 14 days
    const daysDiff = differenceInDays(dateRange.to, dateRange.from);
    if (daysDiff > 14) {
      return;
    }

    const targetStartDate = format(dateRange.from, "yyyy-MM-dd");
    const targetEndDate = format(dateRange.to, "yyyy-MM-dd");

    startTransition(async () => {
      const result = await getStrategicAnalysis({
        countryCode,
        ...(city.trim() && { city: city.trim() }),
        targetStartDate,
        targetEndDate,
        ...(selectedIndustries.length > 0 && { industries: selectedIndustries }),
        ...(selectedAudiences.length > 0 && { audiences: selectedAudiences }),
        ...(selectedScales.length > 0 && { scales: selectedScales }),
        ...(selectedRegion && { subdivisionCode: selectedRegion }),
      });
      setAnalysisResult(result);
    });
  };

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  };

  const toggleAudience = (audience: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(audience) ? prev.filter((a) => a !== audience) : [...prev, audience]
    );
  };

  const toggleScale = (scale: EventScale) => {
    setSelectedScales((prev) =>
      prev.includes(scale) ? prev.filter((s) => s !== scale) : [...prev, scale]
    );
  };

  // Select All helpers
  const allAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
  const allScales = Object.values(EventScale);

  const areAllIndustriesSelected =
    availableIndustries.length > 0 &&
    selectedIndustries.length === availableIndustries.length &&
    availableIndustries.every((industry) => selectedIndustries.includes(industry));
  const areAllAudiencesSelected =
    selectedAudiences.length === allAudiences.length &&
    allAudiences.every((audience) => selectedAudiences.includes(audience));
  const areAllScalesSelected =
    selectedScales.length === allScales.length &&
    allScales.every((scale) => selectedScales.includes(scale));

  const toggleSelectAllIndustries = () => {
    if (areAllIndustriesSelected) {
      setSelectedIndustries([]);
    } else {
      setSelectedIndustries([...availableIndustries]);
    }
  };

  const toggleSelectAllAudiences = () => {
    if (areAllAudiencesSelected) {
      setSelectedAudiences([]);
    } else {
      setSelectedAudiences([...allAudiences]);
    }
  };

  const toggleSelectAllScales = () => {
    if (areAllScalesSelected) {
      setSelectedScales([]);
    } else {
      setSelectedScales([...allScales]);
    }
  };

  const selectedDateData = selectedDate && analysisResult?.data
    ? analysisResult.data.get(selectedDate)
    : null;

  // Structured Data (JSON-LD) for SEO and AI bots
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DateClash",
    description:
      "A business intelligence tool for identifying scheduling conflicts caused by school holidays, public holidays, religious holidays, weather information, and industry events.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    author: {
      "@type": "Organization",
      name: "MergeLabs GmbH",
      url: "https://mergelabs.io",
    },
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Structured Data for SEO and AI Bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Header */}
      <header className="border-b border-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768387131/dateclash/DateClash_Logo_eza9uv.png"
              alt="DateClash Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-2xl" style={{ fontFamily: 'var(--font-inter)' }}>
              <span className="font-[700]">Date</span>
              <span className="font-[300]">Clash</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold hidden sm:block">
              Strategic Schedule Analysis
            </h2>
            <button
              onClick={() => {
                const newTheme = resolvedTheme === "dark" ? "light" : "dark";
                setTheme(newTheme);
              }}
              className={cn(
                "p-2 rounded-md border border-foreground/20",
                "hover:bg-foreground/5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-foreground/20"
              )}
              aria-label="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

{/* --- HERO BANNER START --- */}
<div className="mx-[6%] mt-6 mb-2">
        {mounted && resolvedTheme === "dark" ? (
          <Image
            src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_dark_edcymy.png"
            alt="DateClash Banner"
            width={1200}
            height={300}
            priority
            className="w-full h-auto object-cover rounded-xl shadow-md"
          />
        ) : (
          <Image
            src="https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_light_icugc9.png"
            alt="DateClash Banner"
            width={1200}
            height={300}
            priority
            className="w-full h-auto object-cover rounded-xl shadow-md"
          />
        )}
      </div>
      {/* --- HERO BANNER END --- */}

      <div className="container mx-auto px-4 py-8 space-y-8">
        
        {/* --- NEW INTRO COPY START --- */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tight">
            Find Your Perfect Slot in A Complex Web Of Criterias
          </h2>
          <p className="text-lg text-foreground/70 leading-relaxed">
            Don't let bad weather or conflicting industry summits derail your success. 
            Select your target <strong>Location</strong> and <strong>Date Range</strong> below to uncover hidden risks.
          </p>
        </div>
        {/* --- NEW INTRO COPY END --- */}
        
        
        {/* Section A: Control Panel */}
        <section className="border border-foreground/20 rounded-lg p-6 bg-background">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Select Your Target Location & Date
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                disabled={isCountriesLoading}
                className={cn(
                  "w-full px-3 py-2 rounded-md border border-foreground/20",
                  "bg-background text-foreground transition-colors",
                  "hover:border-[var(--teal-primary)] hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)] focus:border-[var(--teal-primary)]",
                  isCountriesLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {countries.map(c => (
                  <option key={c["iso-3166"]} value={c["iso-3166"]}>
                    {c.country_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                City <span className="text-foreground/60 text-xs">(optional - defaults to capital)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Heidelberg"
                className={cn(
                  "w-full px-3 py-2 rounded-md border border-foreground/20",
                  "bg-background text-foreground transition-colors",
                  "hover:border-[var(--teal-primary)] hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)] focus:border-[var(--teal-primary)]"
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                {isRegionsLoading
                  ? "Loading regions..."
                  : regions.length > 0
                  ? "School Holiday Region (optional)"
                  : "School Holidays not supported for this country"}
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                disabled={isRegionsLoading || regions.length === 0}
                className={cn(
                  "w-full px-3 py-2 rounded-md border border-foreground/20",
                  "bg-background text-foreground transition-colors",
                  "hover:border-[var(--teal-primary)] hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)] focus:border-[var(--teal-primary)]",
                  (isRegionsLoading || regions.length === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                <option value="">{regions.length === 0 && !isRegionsLoading ? "Not available" : "None"}</option>
                {regions.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Date Range <span className="text-foreground/60 text-xs">(max 14 days intervals)</span>
              </label>
              <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
              {dateError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {dateError}
                </p>
              )}
            </div>
          </div>

          {/* Industry Events (Collapsible) */}
          <div className="border-t border-foreground/10 pt-4 mt-4">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 text-sm font-medium mb-4 hover:text-foreground/80 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Industry Events
              {filtersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {filtersOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Industry</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors">
                      <input
                        type="checkbox"
                        checked={areAllIndustriesSelected}
                        onChange={toggleSelectAllIndustries}
                        className="rounded border-foreground/20"
                      />
                      <span>Select All</span>
                    </label>
                    <hr className="border-foreground/10 my-1" />
                    {availableIndustries.map((industry) => (
                      <label key={industry} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedIndustries.includes(industry)}
                          onChange={() => toggleIndustry(industry)}
                          className="rounded border-foreground/20"
                        />
                        <span>{industry}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Audience Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Audience</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors">
                      <input
                        type="checkbox"
                        checked={areAllAudiencesSelected}
                        onChange={toggleSelectAllAudiences}
                        className="rounded border-foreground/20"
                      />
                      <span>Select All</span>
                    </label>
                    <hr className="border-foreground/10 my-1" />
                    {["Executives", "Analysts", "Developers", "Investors", "General"].map((audience) => (
                      <label key={audience} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAudiences.includes(audience)}
                          onChange={() => toggleAudience(audience)}
                          className="rounded border-foreground/20"
                        />
                        <span>{audience}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Scale Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Scale</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors">
                      <input
                        type="checkbox"
                        checked={areAllScalesSelected}
                        onChange={toggleSelectAllScales}
                        className="rounded border-foreground/20"
                      />
                      <span>Select All</span>
                    </label>
                    <hr className="border-foreground/10 my-1" />
                    {["Global", "Large", "Medium", "Summit"].map((scale) => (
                      <label key={scale} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedScales.includes(scale as EventScale)}
                          onChange={() => toggleScale(scale as EventScale)}
                          className="rounded border-foreground/20"
                        />
                        <span>{scale}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <div className="mt-6">
            <button
              onClick={handleAnalyze}
              disabled={isPending || !dateRange?.from || !dateRange?.to || dateError !== null}
              className={cn(
                "w-full md:w-auto px-6 py-2 rounded-md font-medium",
                "bg-[var(--teal-primary)] text-white",
                "hover:bg-[var(--teal-dark)] transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)]/20"
              )}
            >
              {isPending ? "Analyzing..." : "Analyze Schedule"}
            </button>
          </div>
        </section>

        {/* Section B: Data Confidence Dashboard */}
        {analysisResult?.data && analysisResult?.metadata && (
          <section className="border border-foreground/20 rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-4">Data Confidence Dashboard</h2>
            <AnalysisSummary metadata={analysisResult.metadata} />
          </section>
        )}

        {/* Section C: Data Strip */}
        {analysisResult?.data && (
          <section className="border border-foreground/20 rounded-lg p-6 bg-background">
            <h2 className="text-xl font-semibold mb-4">Date Range Analysis</h2>
            <CalendarGrid
              analysisData={analysisResult.data}
              dateRange={dateRange}
              onDateClick={(dateStr) => setSelectedDate(dateStr)}
            />
          </section>
        )}

        {/* Error Message */}
        {analysisResult && !analysisResult.success && (
          <div className="border border-foreground/20 rounded-lg p-4 bg-background">
            <p className="text-sm text-foreground/80">{analysisResult.message}</p>
          </div>
        )}

        {/* About & Promo Section */}
        <div className="my-12 border-t border-foreground/10">
          <AboutSection />
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 rounded-lg px-6 py-6">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">
              Legal Notice & Disclaimer
            </h3>
            <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
              DateClash is a service provided by MergeLabs GmbH. All data, including school holidays, public holidays, weather forecasts, and event listings, is provided "as is" for informational purposes only. MergeLabs GmbH makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, or completeness of the data. Dates are subject to change by local authorities without notice. MergeLabs GmbH accepts no liability for financial losses, scheduling conflicts, disrupted travel, or any other consequences resulting from the use of this website. Users are strongly advised to independently verify all critical dates with official local sources before making financial commitments.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4 border-t border-slate-300 dark:border-slate-600">
              <a
                href="/impressum"
                className="text-xs text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Impressum
              </a>
              <span className="text-slate-900 dark:text-white">•</span>
              <a
                href="/datenschutz"
                className="text-xs text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Datenschutzerklärung
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Section C: Detail Modal */}
      {selectedDate && selectedDateData && (
        <DetailModal
          dateStr={selectedDate}
          data={selectedDateData}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </main>
  );
}
