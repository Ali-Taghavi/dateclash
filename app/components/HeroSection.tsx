"use client";

import Image from "next/image";

interface HeroSectionProps {
  mounted: boolean;
  resolvedTheme: string | undefined;
}

export function HeroSection({ mounted, resolvedTheme }: HeroSectionProps) {
  return (
    <>
      {/* DUAL BANNER */}
      <div className="mx-[6%] mt-6 mb-2">
        {mounted && (
          <Image 
            src={resolvedTheme === "dark" 
              ? "https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_dark_edcymy.png" 
              : "https://res.cloudinary.com/mergelabs-io/image/upload/v1768594351/dateclash/dateclash_banner_light_icugc9.png"
            } 
            alt="DateClash Banner" 
            width={1200} 
            height={300} 
            priority 
            className="w-full h-auto object-cover rounded-xl shadow-md transition-opacity duration-300" 
          />
        )}
      </div>

      {/* INTRO TEXT */}
  {/* INTRO TEXT */}
      <div className="text-center max-w-3xl mx-auto space-y-6 mb-8 pt-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          Strategic Date-Vetting for B2B Event Planners
        </h1>
        
        <p className="text-xl text-foreground/80 font-medium">
          The fastest way to scan for scheduling risks and hidden conflicts.
        </p>

        {/* Feature Highlights - Formatted for readability */}
        <div className="pt-2">
          <ul className="text-lg text-foreground/70 leading-relaxed space-y-2 inline-block text-left mx-auto">
            <li className="flex items-start gap-2">
              <span className="text-[var(--teal-primary)] mt-1">✓</span>
              <span>
                <strong className="text-foreground/90">Avoid Cultural Blindspots:</strong> Scan for public, school, and religious holidays.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--teal-primary)] mt-1">✓</span>
              <span>
                <strong className="text-foreground/90">Dodge Industry Clashes:</strong> Filter for major summits and competitor events.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--teal-primary)] mt-1">✓</span>
              <span>
                <strong className="text-foreground/90">Predict the Elements:</strong> Access historic weather trends to ensure safe travel.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}