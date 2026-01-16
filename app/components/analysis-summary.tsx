"use client";

import { Cloud, Calendar, GraduationCap, Building2, Linkedin, Mail, ShieldCheck, Globe, Eye, EyeOff } from "lucide-react";
import type { AnalysisMetadata } from "@/app/types";
import { cn } from "@/lib/utils";

interface VisibleLayers {
  weather: boolean;
  publicHolidays: boolean;
  schoolHolidays: boolean;
  industryEvents: boolean;
}

interface AnalysisSummaryProps {
  metadata: AnalysisMetadata;
  visibleLayers: VisibleLayers;
  toggleLayer: (layer: keyof VisibleLayers) => void;
  temperatureUnit: 'c' | 'f';
  setTemperatureUnit: (unit: 'c' | 'f') => void;
}

export function AnalysisSummary({ metadata, visibleLayers, toggleLayer, temperatureUnit, setTemperatureUnit }: AnalysisSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Weather */}
      <div
        className={cn(
          "border rounded-lg p-4 bg-background relative transition-opacity duration-300",
          metadata.weather.available
            ? "border-foreground/20"
            : "border-dashed border-foreground/30",
          !visibleLayers.weather && "opacity-60"
        )}
      >
        {/* Visibility Toggle */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {visibleLayers.weather ? (
            <Eye className="h-4 w-4 text-foreground/60 dark:text-foreground/60" />
          ) : (
            <EyeOff className="h-4 w-4 text-foreground/40 dark:text-foreground/40" />
          )}
          <button
            onClick={() => toggleLayer("weather")}
            aria-label="Toggle weather visibility"
          >
            <div
              className={cn(
                "relative w-10 h-6 rounded-full transition-colors duration-200",
                visibleLayers.weather
                  ? "bg-[var(--teal-primary)]"
                  : "bg-foreground/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  visibleLayers.weather ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              metadata.weather.available
                ? "bg-green-500"
                : "bg-yellow-500 dark:bg-yellow-600"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="h-4 w-4 text-foreground/60" />
              <span className="text-sm font-medium">Weather</span>
              {/* Temperature Unit Toggle */}
              {metadata.weather.available && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemperatureUnit(temperatureUnit === 'c' ? 'f' : 'c');
                  }}
                  className={cn(
                    "px-1.5 py-0.5 text-xs font-medium rounded transition-colors",
                    "border border-foreground/20",
                    temperatureUnit === 'f'
                      ? "bg-[var(--teal-primary)] text-white border-[var(--teal-primary)]"
                      : "bg-background text-foreground hover:bg-foreground/5"
                  )}
                  aria-label="Toggle temperature unit"
                  title="Switch between Celsius and Fahrenheit"
                >
                  {temperatureUnit === 'c' ? '°C' : '°F'}
                </button>
              )}
            </div>
            {metadata.weather.available ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground/80">
                  Weather Data Loaded
                </p>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                    "border border-slate-200 dark:border-slate-700"
                  )}
                >
                  <Cloud className="h-3.5 w-3.5" />
                  <span>
                    Live API Data
                    <span className="opacity-75 ml-1">(Source: Open-Meteo)</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className="group relative">
                <p className="text-sm text-foreground/60">Weather Unavailable</p>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                  <div className="bg-foreground text-background text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    No city selected
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Public Holidays */}
      <div
        className={cn(
          "border border-foreground/20 rounded-lg p-4 bg-background relative transition-opacity duration-300",
          !visibleLayers.publicHolidays && "opacity-60"
        )}
      >
        {/* Toggle Switch */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {visibleLayers.publicHolidays ? (
            <Eye className="h-4 w-4 text-foreground/60 dark:text-foreground/60" />
          ) : (
            <EyeOff className="h-4 w-4 text-foreground/40 dark:text-foreground/40" />
          )}
          <button
            onClick={() => toggleLayer("publicHolidays")}
            aria-label="Toggle public holidays visibility"
          >
            <div
              className={cn(
                "relative w-10 h-6 rounded-full transition-colors duration-200",
                visibleLayers.publicHolidays
                  ? "bg-[var(--teal-primary)]"
                  : "bg-foreground/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  visibleLayers.publicHolidays ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-foreground/60" />
              <span className="text-sm font-medium">Public Holidays</span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-foreground/80">
                {metadata.publicHolidays.count} found
              </p>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                  "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                  "border border-slate-200 dark:border-slate-700"
                )}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>
                  Live API Data
                  <span className="opacity-75 ml-1">(Source: OpenHolidays)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: School Holidays */}
      <div
        className={cn(
          "border rounded-lg p-4 bg-background relative transition-opacity duration-300",
          metadata.schoolHolidays.checked
            ? "border-foreground/20"
            : "border-dashed border-foreground/30",
          !visibleLayers.schoolHolidays && "opacity-60"
        )}
      >
        {/* Toggle Switch */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {visibleLayers.schoolHolidays ? (
            <Eye className="h-4 w-4 text-foreground/60 dark:text-foreground/60" />
          ) : (
            <EyeOff className="h-4 w-4 text-foreground/40 dark:text-foreground/40" />
          )}
          <button
            onClick={() => toggleLayer("schoolHolidays")}
            aria-label="Toggle school holidays visibility"
          >
            <div
              className={cn(
                "relative w-10 h-6 rounded-full transition-colors duration-200",
                visibleLayers.schoolHolidays
                  ? "bg-[var(--teal-primary)]"
                  : "bg-foreground/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  visibleLayers.schoolHolidays ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              metadata.schoolHolidays.checked
                ? "bg-purple-500"
                : "bg-foreground/30"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="h-4 w-4 text-foreground/60" />
              <span className="text-sm font-medium">School Holidays</span>
            </div>
            {metadata.schoolHolidays.checked ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground/80">
                  {metadata.schoolHolidays.count} found
                </p>
                {metadata.schoolHolidays.isVerified !== undefined && (
                  <div className="mt-2">
                    {metadata.schoolHolidays.isVerified ? (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400",
                          "border border-teal-200 dark:border-teal-800"
                        )}
                        title={metadata.schoolHolidays.sourceUrl ? `Sourced from ${metadata.schoolHolidays.sourceUrl}` : "Official Gov"}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Verified Data</span>
                        <span className="text-teal-600 dark:text-teal-500 text-[10px] ml-1 opacity-75">
                          ({metadata.schoolHolidays.sourceUrl ? `Source: ${metadata.schoolHolidays.sourceUrl}` : "Official Gov"})
                        </span>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
                          "border border-slate-200 dark:border-slate-700"
                        )}
                      >
                        <Globe className="h-3.5 w-3.5" />
                        <span>Live API Data</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-foreground/60">Region Not Selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Card 4: Industry Events */}
      <div
        className={cn(
          "border border-foreground/20 rounded-lg p-4 bg-background relative transition-opacity duration-300",
          !visibleLayers.industryEvents && "opacity-60"
        )}
      >
        {/* Toggle Switch */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          {visibleLayers.industryEvents ? (
            <Eye className="h-4 w-4 text-foreground/60 dark:text-foreground/60" />
          ) : (
            <EyeOff className="h-4 w-4 text-foreground/40 dark:text-foreground/40" />
          )}
          <button
            onClick={() => toggleLayer("industryEvents")}
            aria-label="Toggle industry events visibility"
          >
            <div
              className={cn(
                "relative w-10 h-6 rounded-full transition-colors duration-200",
                visibleLayers.industryEvents
                  ? "bg-[var(--teal-primary)]"
                  : "bg-foreground/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                  visibleLayers.industryEvents ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-3 w-3 rounded-full",
              metadata.industryEvents.confidence === "HIGH"
                ? "bg-green-500"
                : metadata.industryEvents.confidence === "MEDIUM"
                ? "bg-blue-500"
                : metadata.industryEvents.confidence === "LOW"
                ? "bg-yellow-500 dark:bg-yellow-600"
                : "bg-red-500 dark:bg-red-600"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-foreground/60" />
              <span className="text-sm font-medium">Industry Events</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded font-medium",
                  metadata.industryEvents.confidence === "HIGH"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700"
                    : metadata.industryEvents.confidence === "MEDIUM"
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700"
                    : metadata.industryEvents.confidence === "LOW"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700"
                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                )}
              >
                {metadata.industryEvents.confidence}
              </span>
            </div>
            <p className="text-sm text-foreground/80 mt-2">
              {metadata.industryEvents.confidence === "NONE" ? (
                <>Untracked Industry</>
              ) : metadata.industryEvents.confidence === "LOW" ? (
                <>Limited Data ({metadata.industryEvents.totalTracked} tracked)</>
              ) : (
                <>Checked {metadata.industryEvents.totalTracked} events</>
              )}
            </p>
            {metadata.industryEvents.confidence === "NONE" && (
              <div className="mt-3 pt-3 border-t border-foreground/10">
                <p className="text-xs text-foreground/70 mb-2">
                  Missing your industry or a particular event? Please let me know:
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.linkedin.com/in/ali-taghavi-li/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-foreground/70 hover:text-foreground",
                      "transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded"
                    )}
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                  <a
                    href="mailto:taghavi@mergelabs.io"
                    className={cn(
                      "text-foreground/70 hover:text-foreground",
                      "transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-foreground/20 rounded"
                    )}
                    aria-label="Email"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
