"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Country } from "@/app/types";

interface CountrySearchProps {
  countries: Country[];
  value: string;
  onChange: (val: string) => void;
  compact?: boolean;
}

export function CountrySearch({ countries, value, onChange, compact }: CountrySearchProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredCountries = React.useMemo(() => {
    return countries.filter((c) =>
      c.country_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [countries, search]);

  const selectedCountry = countries.find((c) => c["iso-3166"] === value);

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        // We use identical classes to a standard input: border-foreground/10, bg-background, text-xs
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-foreground/10 bg-background outline-none transition-all text-left",
          compact 
            ? "h-[38px] px-2.5 text-xs font-normal" 
            : "h-[54px] px-4 text-sm font-bold"
        )}
      >
        <span className="truncate opacity-80">
          {selectedCountry ? selectedCountry.country_name : "Select..."}
        </span>
        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-30" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-foreground/20 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center border-b border-foreground/5 p-2">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-30" />
            <input
              autoFocus
              className="flex w-full bg-transparent text-xs outline-none placeholder:text-foreground/30 py-1.5"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto p-1 overflow-x-hidden">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-[10px] text-foreground/40 text-center uppercase font-bold tracking-widest">No match</div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country["iso-3166"]}
                  className={cn(
                    "flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-xs outline-none transition-colors mb-0.5 last:mb-0",
                    value === country["iso-3166"] 
                      ? "bg-[var(--teal-primary)] text-white" 
                      : "hover:bg-foreground/5 text-foreground/70"
                  )}
                  onClick={() => {
                    onChange(country["iso-3166"]);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  {country.country_name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}