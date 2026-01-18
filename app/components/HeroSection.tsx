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
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Find Your Perfect Slot in A Complex Web Of Criterias
        </h2>
        <p className="text-lg text-foreground/70 leading-relaxed text-balance italic">
          Don't let bad weather or conflicting industry summits derail your success. 
          Select your target <strong>Location</strong> and <strong>Date Range</strong> below to uncover hidden risks.
        </p>
      </div>
    </>
  );
}