"use client";

import { 
  MapPin, 
  ChevronDown, 
  Search, 
  Info, 
  Linkedin, 
  Mail 
} from "lucide-react";
import { DateRangePicker } from "../date-range-picker";
import { CountrySearch } from "../CountrySearch"; 
import type { Country, Region } from "@/app/types";
import { type DateRange } from "react-day-picker";

interface StepLocationProps {
  countryCode: string;
  setCountryCode: (val: string) => void;
  countries: Country[];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  city: string;
  setCity: (val: string) => void;
  selectedRegion: string;
  setSelectedRegion: (val: string) => void;
  regions: Region[];
}

export function StepLocation({
  countryCode,
  setCountryCode,
  countries,
  dateRange,
  setDateRange,
  city,
  setCity,
  selectedRegion,
  setSelectedRegion,
  regions,
}: StepLocationProps) {
  return (
    <div className="space-y-12">
      {/* STEP 1a: LOCATION */}
      <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">1a</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold uppercase tracking-tight">where do you plan to host your event?</h3>
            <p className="text-sm text-foreground/50">Select your country and time period.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Replaced old select with searchable CountrySearch */}
          <CountrySearch 
            countries={countries} 
            value={countryCode} 
            onChange={setCountryCode} 
          />
          <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </section>

      {/* STEP 1b: CITY */}
      <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">1b</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold uppercase tracking-tight">Host City Of Your Event
            <span className="relative -top-0 ml-2 text-s font-medium lowercase tracking-normal text-foreground/60">
            (optional)
            </span>
            </h3>
            <p className="text-sm text-foreground/50">Selecting a host city also returns local weather information</p>
          </div>
        </div>
        <div className="max-w-md relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
          <input 
            type="text" 
            value={city} 
            onChange={(e) => setCity(e.target.value)} 
            placeholder="e.g. Heidelberg" 
            className="w-full p-4 pl-12 rounded-xl border border-foreground/10 bg-background outline-none text-sm" 
          />
        </div>
      </section>

      {/* STEP 1c: SCHOOL HOLIDAYS */}
      <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">1c</div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold uppercase tracking-tight">Include school holidays
            <span className="relative -top-0 ml-2 text-s font-medium lowercase tracking-normal text-foreground/60">
            (optional)
            </span>
              </h3>
            <p className="text-sm text-foreground/50 leading-relaxed">
              If you want to include school holidays for your target location, select the region below.
            </p>
          </div>
        </div>
        <div className="space-y-4 max-w-md">
          <div className="relative">
            <select 
              value={selectedRegion} 
              onChange={(e) => setSelectedRegion(e.target.value)} 
              className="w-full p-4 rounded-xl border border-foreground/10 bg-background outline-none text-sm appearance-none cursor-pointer"
            >
              <option value="">None / All Regions</option>
              {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none" />
          </div>

          {/* Blue Pill Note with Contact Icons (Responsive Update) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-3 sm:py-2 rounded-2xl sm:rounded-full bg-blue-500/10 border border-blue-500/20 w-full sm:w-auto text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <Info className="w-3 h-3 text-blue-500 shrink-0" />
              <p className="text-[10px] font-medium text-blue-600 leading-tight">
                School holiday data is manually curated. If yours is missing, please let us know.
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-2 pt-2 sm:pt-0 pl-0 sm:pl-2 border-t sm:border-t-0 sm:border-l border-blue-500/20 w-full sm:w-auto justify-center sm:justify-start">
              <a 
                href="https://www.linkedin.com/in/ali-taghavi-li/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5" />
              </a>
              <a 
                href="mailto:taghavi@mergelabs.io" 
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}