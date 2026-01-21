"use client";

import WatchlistManager from "../WatchlistManager";
import type { Country, WatchlistLocation } from "@/app/types";

interface StepWatchlistProps {
  watchlist: WatchlistLocation[];
  setWatchlist: (val: any) => void;
  countries: Country[];
}

export function StepWatchlist({ watchlist, setWatchlist, countries }: StepWatchlistProps) {
  return (
    <section className="bg-foreground/[0.02] border border-foreground/10 rounded-3xl p-8 space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--teal-primary)] text-white font-bold text-sm shrink-0">2a</div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold uppercase tracking-tight">Audience Locations
          <span className="relative -top-0 ml-2 text-s font-medium lowercase tracking-normal text-foreground/60">
            (optional)
            </span>
          </h3>
          <p className="text-sm text-foreground/50">
          Include additional regions to detect potential holiday and school break conflicts for your attendees and team.
          </p>
        </div>
      </div>
      <WatchlistManager 
        onAdd={(l) => setWatchlist((p: any) => [...p, l])} 
        onRemove={(id) => setWatchlist((p: any) => p.filter((l: any) => l.id !== id))} 
        watchlist={watchlist} 
        supportedCountries={countries} 
      />
    </section>
  );
}