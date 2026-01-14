"use client";

import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { Moon, Sun, Calendar, MapPin, Filter, ChevronDown, ChevronUp, X, CloudRain, Sunset } from "lucide-react";
import { getStrategicAnalysis } from "./actions";
import type { StrategicAnalysisResult, DateAnalysis, StrategicAnalysisFormData, WeatherHistoryDay } from "./types";
import { IndustryType, EventScale } from "./types";
import { cn } from "@/lib/utils";
import { format, parseISO, getMonth, getDay, startOfWeek, addDays, subDays, isWithinInterval, isSameDay, getMonth as getMonthNum, getDate as getDateNum } from "date-fns";
import { type DateRange } from "react-day-picker";
import { DateRangePicker } from "./components/date-range-picker";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<StrategicAnalysisResult | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Form state
  const [countryCode, setCountryCode] = useState("US");
  const [city, setCity] = useState("");
  // Date range - starts undefined, user selects via date picker
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedIndustries, setSelectedIndustries] = useState<IndustryType[]>([]);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedScales, setSelectedScales] = useState<EventScale[]>([]);

  const handleAnalyze = () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert("Please select a date range");
      return;
    }

    // Format dates as YYYY-MM-DD strings
    const targetStartDate = format(dateRange.from, "yyyy-MM-dd");
    const targetEndDate = format(dateRange.to, "yyyy-MM-dd");

    startTransition(async () => {
      const result = await getStrategicAnalysis({
        countryCode,
        ...(city.trim() && { city: city.trim() }), // Only include city if not empty
        targetStartDate,
        targetEndDate,
        ...(selectedIndustries.length > 0 && { industries: selectedIndustries }),
        ...(selectedAudiences.length > 0 && { audiences: selectedAudiences }),
        ...(selectedScales.length > 0 && { scales: selectedScales }),
      });
      setAnalysisResult(result);
    });
  };

  const toggleIndustry = (industry: IndustryType) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const toggleAudience = (audience: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(audience)
        ? prev.filter((a) => a !== audience)
        : [...prev, audience]
    );
  };

  const toggleScale = (scale: EventScale) => {
    setSelectedScales((prev) =>
      prev.includes(scale)
        ? prev.filter((s) => s !== scale)
        : [...prev, scale]
    );
  };

  // Select All helpers
  const allIndustries = Object.values(IndustryType);
  const allAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
  const allScales = Object.values(EventScale);

  const areAllIndustriesSelected = 
    selectedIndustries.length === allIndustries.length &&
    allIndustries.every((industry) => selectedIndustries.includes(industry));
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
      setSelectedIndustries([...allIndustries]);
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

  return (
    <main className="min-h-screen bg-background text-foreground">
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
            <h1 className="text-2xl font-bold">DateClash</h1>
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold hidden sm:block">
              Strategic Schedule Analysis
            </h2>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={cn(
                "p-2 rounded-md border border-foreground/20",
                "hover:bg-foreground/5 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-foreground/20"
              )}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Section A: Control Panel */}
        <section className="border border-foreground/20 rounded-lg p-6 bg-background">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Control Panel
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Country
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-md border border-foreground/20",
                  "bg-background text-foreground transition-colors",
                  "hover:border-[var(--teal-primary)] hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--teal-primary)] focus:border-[var(--teal-primary)]"
                )}
              >
                <option value="US">United States</option>
                <option value="DE">Germany</option>
                <option value="GB">United Kingdom</option>
                <option value="FR">France</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
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
                placeholder="e.g., New York (or leave blank for capital)"
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
                Date Range <span className="text-foreground/60">*</span>
              </label>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
          </div>

          {/* Filters (Collapsible) */}
          <div className="border-t border-foreground/10 pt-4 mt-4">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 text-sm font-medium mb-4 hover:text-foreground/80 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              {filtersOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {filtersOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Industry
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    {/* Select All */}
                    <label
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={areAllIndustriesSelected}
                        onChange={toggleSelectAllIndustries}
                        className="rounded border-foreground/20"
                      />
                      <span>Select All</span>
                    </label>
                    <hr className="border-foreground/10 my-1" />
                    {Object.values(IndustryType).map((industry) => (
                      <label
                        key={industry}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors"
                      >
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
                  <label className="block text-sm font-medium mb-2">
                    Audience
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    {/* Select All */}
                    <label
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors"
                    >
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
                      <label
                        key={audience}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors"
                      >
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
                  <label className="block text-sm font-medium mb-2">
                    Scale
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-foreground/10 rounded-md p-2">
                    {/* Select All */}
                    <label
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded font-semibold transition-colors"
                    >
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
                      <label
                        key={scale}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--teal-light)] dark:hover:bg-[var(--teal-light)]/20 p-1 rounded transition-colors"
                      >
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
              disabled={isPending || !dateRange?.from || !dateRange?.to}
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

        {/* Section B: Data Strip */}
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

function CalendarGrid({
  analysisData,
  dateRange,
  onDateClick,
}: {
  analysisData: Map<string, DateAnalysis>;
  dateRange: DateRange | undefined;
  onDateClick: (dateStr: string) => void;
}) {
  // Get all dates and sort them
  const allDates = Array.from(analysisData.keys())
    .map((d) => parseISO(d))
    .sort((a, b) => a.getTime() - b.getTime());

  if (allDates.length === 0) return null;

  const firstDate = allDates[0];
  const lastDate = allDates[allDates.length - 1];

  // Calculate padding to center the selection
  // Start from the Sunday of the week containing the first date
  const firstDayOfWeek = startOfWeek(firstDate, { weekStartsOn: 0 }); // Sunday = 0
  // End at the Saturday of the week containing the last date
  const lastDayOfWeek = startOfWeek(lastDate, { weekStartsOn: 0 });
  const lastSaturday = addDays(lastDayOfWeek, 6);
  
  // Calculate the range size to determine padding
  const rangeSize = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  // Add padding: at least 2 weeks (14 days) before and after, or proportional to range size
  const paddingDays = Math.max(14, Math.ceil(rangeSize * 0.5));
  
  // Add padding before and after, aligned to week boundaries
  const displayStart = subDays(firstDayOfWeek, Math.ceil(paddingDays / 7) * 7);
  const displayEnd = addDays(lastSaturday, Math.ceil(paddingDays / 7) * 7);

  // Build the calendar grid
  const calendarDays: Array<{ date: Date; dateStr: string | null; data: DateAnalysis | null }> = [];
  let currentDate = displayStart;
  
  while (currentDate <= displayEnd) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const data = analysisData.get(dateStr) || null;
    calendarDays.push({
      date: currentDate,
      dateStr: data ? dateStr : null,
      data,
    });
    currentDate = addDays(currentDate, 1);
  }

  // Check if a date is in the selected range
  const isDateInRange = (date: Date): boolean => {
    if (!dateRange?.from || !dateRange?.to) return false;
    return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
  };

  return (
    <div className="overflow-y-auto max-h-[600px]">
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-foreground/60 pb-2"
          >
            {day}
          </div>
        ))}
        
        {/* Calendar cells - rendered in order, grid will naturally flow them */}
        {calendarDays.map((day, index) => {
          const isSelected = isDateInRange(day.date);
          const isEmpty = !day.data;

          return (
            <div key={index} className="min-h-[100px]">
              {isEmpty ? (
                <div className="h-full p-2 rounded-md border border-foreground/10 bg-background/50 opacity-40">
                  <div className="text-xs text-foreground/40">
                    {format(day.date, "d")}
                  </div>
                </div>
              ) : (
                <DateCell
                  dateStr={day.dateStr!}
                  data={day.data!}
                  onClick={() => onDateClick(day.dateStr!)}
                  isSelected={isSelected}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DateCell({
  dateStr,
  data,
  onClick,
  isSelected = false,
}: {
  dateStr: string;
  data: DateAnalysis;
  onClick: () => void;
  isSelected?: boolean;
}) {
  const date = parseISO(dateStr);
  const dayName = format(date, "EEE");
  const dayNum = format(date, "d");

  const hasHighRisk = data.industryEvents.some(
    (e) => e.risk_level === "High" || e.risk_level === "Critical"
  );

  // Get 2025 weather data for this specific date (same month and day)
  const currentMonth = getMonthNum(date);
  const currentDay = getDateNum(date);
  const weather2025 = data.weather?.history_data?.find((day) => {
    try {
      const dayDate = parseISO(day.date);
      return day.year === 2025 && getMonthNum(dayDate) === currentMonth && getDateNum(dayDate) === currentDay;
    } catch {
      return false;
    }
  });

  // Get event color based on risk level
  const getEventColor = (riskLevel: string | null) => {
    switch (riskLevel) {
      case "Critical":
        return "bg-red-500";
      case "High":
        return "bg-orange-500";
      case "Medium":
        return "bg-yellow-500";
      case "Low":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center w-full h-full min-h-[100px] p-3 rounded-md border-2",
        "transition-colors relative",
        "focus:outline-none focus:ring-2 focus:ring-foreground/20",
        isSelected
          ? "bg-[var(--teal-primary)] text-white border-[var(--teal-primary)] hover:bg-[var(--teal-dark)]"
          : "border-foreground/20 hover:border-foreground/40 bg-background text-foreground",
        hasHighRisk && !isSelected && "border-foreground/60 border-dashed"
      )}
    >
      {hasHighRisk && (
        <div
          className="absolute inset-0 pointer-events-none rounded-md z-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              currentColor 8px,
              currentColor 16px
            )`,
            backgroundSize: "16px 16px",
            opacity: 0.15,
          }}
        />
      )}
      {/* Header */}
      <div className="text-xs font-medium mb-2 relative z-10">
        <div>{dayName}</div>
        <div className="text-lg font-bold">{dayNum}</div>
      </div>

      {/* Current Date Information Section */}
      <div className="flex-1 w-full space-y-1 mb-2 relative z-10">
        {/* Event Dots - one per event */}
        {data.industryEvents.length > 0 && (
          <div className="flex items-center justify-center gap-1 flex-wrap">
            {data.industryEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className={cn(
                  "w-2 h-2 rounded-full",
                  getEventColor(event.risk_level)
                )}
                title={event.name}
              />
            ))}
          </div>
        )}

        {/* Holiday Bars - one per holiday */}
        {data.holidays.length > 0 && (
          <div className="flex flex-col gap-0.5 w-full">
            {data.holidays.map((holiday, idx) => (
              <div
                key={holiday.id || idx}
                className={cn(
                  "h-1 w-full rounded",
                  isSelected ? "bg-white/40" : "bg-foreground/30"
                )}
                title={holiday.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Historical Weather Data Section - Separated */}
      {weather2025 && (
        <div className={cn(
          "w-full pt-2 mt-auto relative z-10",
          "border-t",
          isSelected ? "border-white/20" : "border-foreground/20"
        )}>
          <div className="flex items-center justify-center gap-1.5">
            {/* Rain Icon */}
            {weather2025.rain_sum > 1 && (
              <span className="text-sm" title={`${Math.round(weather2025.rain_sum * 100) / 100}mm rain`}>💧</span>
            )}
            {/* Temperature */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "text-xs font-medium",
                  isSelected ? "text-white/90" : "text-foreground"
                )}
              >
                {Math.round(weather2025.temp_max)}°C
              </div>
              <div
                className={cn(
                  "text-[10px] leading-tight",
                  isSelected ? "text-white/60" : "text-foreground/50"
                )}
              >
                {format(parseISO(weather2025.date), "MMM d, yyyy")}
              </div>
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function WeatherAccordion({
  weather,
}: {
  weather: NonNullable<DateAnalysis["weather"]>;
}) {
  // Group history data by year
  const yearGroups = new Map<number, WeatherHistoryDay[]>();
  
  if (weather.history_data && weather.history_data.length > 0) {
    weather.history_data.forEach((day) => {
      const year = day.year;
      if (!yearGroups.has(year)) {
        yearGroups.set(year, []);
      }
      yearGroups.get(year)!.push(day);
    });
  }

  // Calculate stats for each historical year and sort by year (descending - most recent first)
  const historicalYearStats = Array.from(yearGroups.entries())
    .map(([year, days]) => {
      const avgTemp = days.length > 0
        ? Math.round(days.reduce((sum, d) => sum + d.temp_max, 0) / days.length)
        : 0;
      const rainDays = days.filter((d) => d.rain_sum > 1.0).length;
      
      // Get humidity and sunset from first day (they're the same for all days in the year)
      const humidity = days[0]?.humidity ?? null;
      const sunset = days[0]?.sunset ?? null;
      
      // Get window_label from first day (they're the same for all days in the year)
      const windowLabel = days[0]?.window_label ?? null;
      
      // Calculate 14-day trend from first 14 days (include both temp and rain)
      // Use the history_data directly to get both temperature and rain data
      const fourteenDayTrend: Array<{ temp: number; rain: number; date: string }> = [];
      for (let i = 0; i < Math.min(14, days.length); i++) {
        fourteenDayTrend.push({
          temp: days[i].temp_max,
          rain: days[i].rain_sum || 0,
          date: days[i].date,
        });
      }

      return {
        year,
        avgTemp,
        rainDays,
        humidity,
        sunset,
        fourteenDayTrend,
        windowLabel,
      };
    })
    .sort((a, b) => b.year - a.year); // Descending order (most recent first)

  // Only show historical years (no projected data)
  const allYearStats = historicalYearStats;

  // Initialize with the first row (projected if available, otherwise most recent historical) expanded
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    return allYearStats.length > 0 ? new Set([allYearStats[0].year]) : new Set();
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  // Get month name
  const monthName = format(new Date(2024, weather.month - 1, 1), "MMMM");

  // Helper function to get temperature category badge
  const getTempBadge = (temp: number) => {
    if (temp < 10) {
      return {
        label: "❄️ Cold",
        className: "bg-blue-500/20 dark:bg-blue-400/30 text-blue-700 dark:text-blue-300 border-blue-500/30 dark:border-blue-400/30",
      };
    } else if (temp <= 25) {
      return {
        label: "⛅ Mild",
        className: "bg-green-500/20 dark:bg-green-400/30 text-green-700 dark:text-green-300 border-green-500/30 dark:border-green-400/30",
      };
    } else {
      return {
        label: "☀️ Warm",
        className: "bg-orange-500/20 dark:bg-orange-400/30 text-orange-700 dark:text-orange-300 border-orange-500/30 dark:border-orange-400/30",
      };
    }
  };

  // Helper function to render 14-day trend chart with window label and rain indicators
  const renderFourteenDayTrend = (
    trend: Array<{ temp: number; rain: number; date: string }>, 
    windowLabel: string | null
  ) => {
    if (trend.length === 0) return null;
    
    const temps = trend.map((d) => d.temp);
    const maxTemp = Math.max(...temps);
    const minTemp = Math.min(...temps);
    const range = maxTemp - minTemp || 1;
    
    // Use window_label from history data
    const trendHeader = windowLabel 
      ? `14-Day Trend (${windowLabel})`
      : "14-Day Trend";
    
    return (
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-foreground/70">{trendHeader}</div>
        <div className="flex items-end gap-1 h-32 border-b border-foreground/10 pb-2">
          {trend.map((day, idx) => {
            // Calculate bar height as percentage of the range, with minimum 8px for visibility
            const heightPercent = ((day.temp - minTemp) / range) * 100;
            const barHeight = Math.max(heightPercent, 5); // At least 5% of container height
            const hasRain = day.rain > 0.1;
            const dateObj = parseISO(day.date);
            const dateLabel = format(dateObj, "MMM d");
            
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end relative group h-full"
              >
                {/* Rain Droplet - positioned above the bar */}
                {hasRain && (
                  <div className="mb-1 text-blue-500 dark:text-blue-400 text-sm" title={`Rain: ${Math.round(day.rain * 100) / 100}mm`}>
                    💧
                  </div>
                )}
                
                {/* Temperature Bar - neutral grey */}
                <div
                  className="w-2 bg-slate-500/30 dark:bg-slate-400/30 rounded-t hover:bg-slate-500/50 dark:hover:bg-slate-400/50 transition-colors relative group/bar"
                  style={{ height: `${barHeight}%`, minHeight: "8px" }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity text-xs bg-foreground/90 text-background px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    <div className="font-medium">{dateLabel}</div>
                    <div>Temp: {day.temp}°C</div>
                    <div>Rain: {hasRain ? `${Math.round(day.rain * 100) / 100}mm` : "Dry"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sun className="h-5 w-5" />
        Weather History for {weather.city}
      </h3>
      
      <div className="border border-foreground/20 rounded-md overflow-hidden">
        {allYearStats.map((stat) => {
          const isExpanded = expandedYears.has(stat.year);
          const tempBadge = getTempBadge(stat.avgTemp);

          return (
            <div
              key={stat.year}
              className={cn(
                "border-b border-foreground/10 last:border-0",
                "transition-colors",
                isExpanded && "bg-foreground/5"
              )}
            >
              {/* Collapsed State - Clickable Row */}
              <button
                onClick={() => toggleYear(stat.year)}
                className={cn(
                  "w-full flex items-center justify-between p-4",
                  "hover:bg-foreground/5 transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-inset"
                )}
                aria-expanded={isExpanded}
              >
                <div className="font-medium text-lg">{stat.year}</div>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "px-3 py-1 rounded text-sm font-medium border",
                      tempBadge.className
                    )}
                  >
                    {tempBadge.label} {stat.avgTemp}°C
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-foreground/60" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-foreground/60" />
                  )}
                </div>
              </button>

              {/* Expanded State - Detailed Metrics */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-foreground/10 bg-foreground/2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Rain Days */}
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">
                        Rain Days {stat.windowLabel ? `(${stat.windowLabel})` : ""}
                      </div>
                      <div className="text-lg font-semibold flex items-center gap-2">
                        <CloudRain className="h-4 w-4" />
                        {stat.rainDays} days
                      </div>
                    </div>

                    {/* Humidity */}
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">
                        Avg Humidity
                      </div>
                      <div className="text-lg font-semibold">
                        {stat.humidity !== null ? `${stat.humidity}%` : "N/A"}
                      </div>
                    </div>

                    {/* Sunset */}
                    <div className="space-y-1">
                      <div className="text-sm text-foreground/60">
                        Sunset Time
                      </div>
                      <div className="text-lg font-semibold flex items-center gap-2">
                        <Sunset className="h-4 w-4" />
                        {stat.sunset || "N/A"}
                      </div>
                    </div>
                  </div>
                  
                  {/* 14-Day Trend Visualization */}
                  {renderFourteenDayTrend(stat.fourteenDayTrend, stat.windowLabel)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DetailModal({
  dateStr,
  data,
  onClose,
}: {
  dateStr: string;
  data: DateAnalysis;
  onClose: () => void;
}) {
  const date = parseISO(dateStr);

  return (
    <div
      className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-background border-2 border-foreground/20 rounded-lg p-6",
          "max-w-2xl w-full max-h-[90vh] overflow-y-auto",
          "shadow-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "p-1 rounded-md hover:bg-foreground/10 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-foreground/20"
            )}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Weather History Accordion */}
          {data.weather && data.weather.history_data && data.weather.history_data.length > 0 && (
            <WeatherAccordion weather={data.weather} />
          )}

          {/* Holidays */}
          {data.holidays.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Holidays ({data.holidays.length})
              </h3>
              <div className="border border-foreground/20 rounded-md p-4 space-y-2">
                {data.holidays.map((holiday) => (
                  <div key={holiday.id} className="pb-2 border-b border-foreground/10 last:border-0 last:pb-0">
                    <div className="font-medium">{holiday.name}</div>
                    {holiday.description && (
                      <div className="text-sm text-foreground/70 mt-1">
                        {holiday.description}
                      </div>
                    )}
                    {holiday.type && (
                      <div className="text-xs text-foreground/60 mt-1">
                        Type: {holiday.type}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Industry Events */}
          {data.industryEvents.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Industry Events ({data.industryEvents.length})
              </h3>
              <div className="border border-foreground/20 rounded-md p-4 space-y-4">
                {data.industryEvents.map((event) => (
                  <div
                    key={event.id}
                    className={cn(
                      "pb-4 border-b border-foreground/10 last:border-0 last:pb-0",
                      "space-y-2"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-lg">{event.name}</div>
                      {event.risk_level && (
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-xs font-medium border-2",
                            "border-foreground/30"
                          )}
                        >
                          {event.risk_level}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {event.city && (
                        <div>
                          <span className="text-foreground/60">City:</span>{" "}
                          <span className="font-medium">{event.city}</span>
                        </div>
                      )}
                      {event.event_scale && (
                        <div>
                          <span className="text-foreground/60">Scale:</span>{" "}
                          <span className="font-medium">{event.event_scale}</span>
                        </div>
                      )}
                      {event.industry && event.industry.length > 0 && (
                        <div>
                          <span className="text-foreground/60">Industry:</span>{" "}
                          <span className="font-medium">
                            {event.industry.join(", ")}
                          </span>
                        </div>
                      )}
                      {event.audience_types && event.audience_types.length > 0 && (
                        <div>
                          <span className="text-foreground/60">Audience:</span>{" "}
                          <span className="font-medium">
                            {event.audience_types.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <div className="text-sm text-foreground/70 mt-2">
                        {event.description}
                      </div>
                    )}

                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "text-sm text-foreground underline",
                          "hover:text-foreground/80 transition-colors"
                        )}
                      >
                        Learn more →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {data.holidays.length === 0 && data.industryEvents.length === 0 && !data.weather && (
            <div className="text-center py-8 text-foreground/60">
              No data available for this date.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

