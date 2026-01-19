"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import type { HolidayRow, IndustryEventRow, EventScale } from "@/app/types";

<<<<<<< HEAD
// Environment Variable Validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables.");
}

/**
 * Standard client for user-facing operations
 * Updated with a robust bypass for standalone scripts (warmup)
 */
async function createSupabaseServerClient() {
  // 1. Detect if we are running in a terminal/script environment
  const isScript = process.env.NEXT_RUNTIME === "nodejs" && !process.env.NEXT_PHASE;

  if (isScript) {
    // DIRECT BYPASS: Use standard client without cookie handling
    const { createClient } = await import("@supabase/supabase-js");
    // Use SERVICE_ROLE_KEY for scripts to bypass RLS if available
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      key
    );
  }

  // 2. Web Request path with safety fallback
  try {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* Ignored in server components */ }
          },
        },
      },
    );
  } catch (e) {
    // 3. Fallback for any other environment issues
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

/**
 * 🛠️ INTERNAL HELPER: Logic moved out of unstable_cache to avoid cookie error
 */
async function fetchAndCacheHolidays(countryCode: string, year: number): Promise<HolidayRow[]> {
  const supabase = await createSupabaseServerClient();

  // 1. Check DB first
  const { data: cached, error: cachedError } = await supabase
    .from("holidays")
    .select("*")
    .eq("country_code", countryCode)
    .eq("year", year);
=======
// --- ENV VALIDATION ---
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables.");
}

// --- MAPPING CONFIGURATION ---
// This translates DB Singulars -> UI Plurals
const AUDIENCE_MAP: Record<string, string> = {
  // Direct Singular -> Plural
  "Executive": "Executives",
  "Investor": "Investors",
  "Developer": "Developers",
  "Analyst": "Analysts",
  "Founder": "Executives", // Map Founders to Executives category
  
  // Domain Specific Mappings (Optional, improves matching)
  "Asset Manager": "Investors",
  "VC": "Investors",
  "PE": "Investors",
  "Risk": "Analysts",
  "Tech": "Developers",
  "Product": "Developers", // or General?
};

// --- CLIENT FACTORY ---
async function createSupabaseServerClient() {
  const isScript = process.env.NEXT_RUNTIME === "nodejs" && !process.env.NEXT_PHASE;
  
  if (isScript) {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
  }

  try {
    const cookieStore = await cookies();
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { /* Ignored */ }
          },
        },
      },
    );
  } catch (e) {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

// --- HELPER: NORMALIZE ENUMS & MAP VALUES ---
function normalizeEnumArray(input: any, useAudienceMapping = false): string[] {
  if (!input) return [];
  
  let rawList: string[] = [];
  
  // 1. Extract Raw Strings
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    if (input.startsWith('{') && input.endsWith('}')) {
      rawList = input.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
    } else {
      rawList = [input.trim()];
    }
  }

  // 2. Map Values (Singular -> Plural)
  if (useAudienceMapping) {
    return rawList.map(item => {
      const cleanItem = item.trim();
      // Return the mapped plural if exists, otherwise original
      return AUDIENCE_MAP[cleanItem] || cleanItem;
    });
  }

  return rawList;
}

function normalizeScale(input: any): string {
  if (!input) return "";
  const str = String(input).trim();
  // "Global Scale" -> "Global"
  return str.split(' ')[0]; 
}

// --- FETCHERS ---

export const getUniqueIndustries = cache(async (): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("industry_events").select("industry");
  
  const allIndustries: string[] = [];
  (data ?? []).forEach((row: any) => {
    allIndustries.push(...normalizeEnumArray(row.industry));
  });

  return Array.from(new Set(allIndustries)).sort();
});

export const getIndustryEvents = cache(async (
  startDate: string,
  endDate: string,
  countryCode?: string,
  industries?: string[],
  audiences?: string[],
  scales?: EventScale[],
): Promise<{ events: IndustryEventRow[]; totalTracked: number }> => {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("industry_events").select("*");
  query = query.or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
  
  if (countryCode) {
    query = query.in("country_code", [countryCode, "Global"]);
  }
>>>>>>> fix/event-fetching-logic

  const { data: eventsData, error: eventsError } = await query
    .order("risk_level", { ascending: false })
    .order("start_date", { ascending: true });

  if (eventsError) throw new Error(eventsError.message);

  // 1. Normalize & Map Data
  let filteredEvents: IndustryEventRow[] = (eventsData ?? []).map((e: any) => {
    // Normalization
    const normIndustry = normalizeEnumArray(e.industry);
    // CRITICAL: Apply Mapping here for Audiences
    const normAudiences = normalizeEnumArray(e.audience_types, true); 
    const normScale = normalizeScale(e.event_scale);

    return {
      ...e,
      industry: normIndustry,
      audience_types: normAudiences,
      event_scale: normScale,
      category: normIndustry[0] || "General",
      url: e.url || ""
    };
  });

  // 2. Filter (Now comparing Plural to Plural)
  if (industries?.length) {
    filteredEvents = filteredEvents.filter(e => 
      e.industry.some((i: string) => industries.includes(i))
    );
  }
  
  if (audiences?.length) {
    filteredEvents = filteredEvents.filter(e => {
      // Permissive: Show events with NO audience data
      if (e.audience_types.length === 0) return true; 
      
      return e.audience_types.some((a: string) => audiences.includes(a));
    });
  }
  
  // 3. In-Memory Filtering
  if (scales?.length) {
    filteredEvents = filteredEvents.filter(e => 
      // Ensure e.event_scale is treated as a string even if it's undefined
      scales.includes(e.event_scale || "")
    );
  }

  return { events: filteredEvents, totalTracked: filteredEvents.length };
});

// --- HOLIDAY LOGIC (Unchanged) ---
async function fetchAndCacheHolidays(countryCode: string, year: number): Promise<HolidayRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data: cached } = await supabase.from("holidays").select("*").eq("country_code", countryCode).eq("year", year);
  if (cached && cached.length > 0) return cached as HolidayRow[];

  // 2. Fetch from Calendarific
  const apiKey = process.env.CALENDARIFIC_API_KEY;
<<<<<<< HEAD
  if (!apiKey) throw new Error("Missing CALENDARIFIC_API_KEY.");

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Calendarific failed: ${response.status}`);
=======
  if (!apiKey) return [];

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) return [];
>>>>>>> fix/event-fetching-logic

  const json = await response.json();
  const holidays = json.response?.holidays ?? [];

  const rows = holidays.map((holiday: any) => ({
    country_code: countryCode,
    year,
    date: holiday.date?.iso ?? null,
    name: holiday.name ?? "",
    description: holiday.description ?? null,
    type: Array.isArray(holiday.type) ? holiday.type[0] ?? null : holiday.type,
    locations: holiday.locations ?? null,
    observed_date: holiday.observed?.iso ?? null,
    states: holiday.states ?? null,
    type_list: Array.isArray(holiday.type) ? holiday.type : null,
  }));

<<<<<<< HEAD
  if (rows.length === 0) return [];

  // 3. Upsert into DB (Prevents 'unique constraint' error by ignoring duplicates)
  const { data: inserted, error: insertError } = await supabase
    .from("holidays")
    .upsert(rows, { 
      onConflict: 'country_code,year,date,name', 
      ignoreDuplicates: true 
    })
    .select();

  if (insertError) throw new Error(`Supabase upsert failed: ${insertError.message}`);
  return (inserted ?? []) as HolidayRow[];
}

/**
 * 🛡️ EXPORTED ACTION: Wrapped in cache layers
 */
export const getHolidays = cache(async (countryCode: string, year: number): Promise<HolidayRow[]> => {
  const isWebContext = process.env.NEXT_PHASE !== undefined;
  
  if (!isWebContext) {
    return fetchAndCacheHolidays(countryCode, year);
  }

  return unstable_cache(
    () => fetchAndCacheHolidays(countryCode, year),
    [`holidays-${countryCode}-${year}`],
    { revalidate: 604800, tags: ['holidays'] }
  )();
});

/**
 * Get unique industries
 */
export const getUniqueIndustries = cache(async (): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("industry_events").select("industry");
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const allIndustries: string[] = [];
  (data ?? []).forEach((row: any) => {
    if (row.industry && Array.isArray(row.industry)) {
      allIndustries.push(...row.industry);
    }
  });

  return Array.from(new Set(allIndustries)).sort();
});

/**
 * Get industry events
 */
export const getIndustryEvents = cache(async (
  startDate: string,
  endDate: string,
  countryCode?: string,
  industries?: string[],
  audiences?: string[],
  scales?: EventScale[],
): Promise<{ events: IndustryEventRow[]; totalTracked: number }> => {
  const supabase = await createSupabaseServerClient();

  const buildBaseQuery = (withDateFilter: boolean) => {
    let query = supabase.from("industry_events").select("*");
    if (withDateFilter) {
      query = query.lte("end_date", endDate).gte("end_date", startDate);
    }
    if (countryCode) {
      query = query.in("country_code", [countryCode, "Global"]);
    }
    return query;
  };

  const { data: eventsData, error: eventsError } = await buildBaseQuery(true)
    .order("risk_level", { ascending: false })
    .order("start_date", { ascending: true });

  if (eventsError) throw new Error(eventsError.message);

  let filteredEvents: IndustryEventRow[] = (eventsData ?? []).map((e: any) => ({
    ...e,
    industry: Array.isArray(e.industry) ? e.industry : [],
    audience_types: Array.isArray(e.audience_types) ? e.audience_types : [],
    category: e.industry?.[0] ?? "General",
    url: e.url || ""
  }));

  if (industries?.length) {
    filteredEvents = filteredEvents.filter(e => e.industry.some(i => industries.includes(i)));
  }
  if (audiences?.length) {
    filteredEvents = filteredEvents.filter(e => !e.audience_types?.length || e.audience_types.some(a => audiences.includes(a)));
  }
  if (scales?.length) {
    filteredEvents = filteredEvents.filter(e => 
      scales.includes(e.event_scale?.split(' ')[0] ?? "")
    );
  }

  const { data: allEvents } = await buildBaseQuery(false);
  return { events: filteredEvents, totalTracked: (allEvents ?? []).length };
=======
  if (rows.length > 0) {
    await supabase.from("holidays").upsert(rows, { onConflict: 'country_code,year,date,name', ignoreDuplicates: true });
  }
  return rows as HolidayRow[];
}

export const getHolidays = cache(async (countryCode: string, year: number): Promise<HolidayRow[]> => {
  const isWebContext = process.env.NEXT_PHASE !== undefined;
  if (!isWebContext) return fetchAndCacheHolidays(countryCode, year);
  return unstable_cache(
    () => fetchAndCacheHolidays(countryCode, year),
    [`holidays-${countryCode}-${year}`],
    { revalidate: 604800, tags: ['holidays'] }
  )();
>>>>>>> fix/event-fetching-logic
});