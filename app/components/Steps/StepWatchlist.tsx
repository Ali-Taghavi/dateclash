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
          <h3 className="text-xl font-bold uppercase tracking-tight">Step 2a: Create a "Watchlist"</h3>
          <p className="text-sm text-foreground/50">
            You can create a "Watchlist" of additional regions to include in the holiday search. 
            eg., public/school holidays in the region of your headquarters.
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