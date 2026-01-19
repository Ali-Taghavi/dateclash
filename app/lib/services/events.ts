"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import type { HolidayRow, IndustryEventRow, EventScale } from "@/app/types";

// --- ENV VALIDATION ---
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables.");
}

// --- MAPPING CONFIGURATION ---
// CLEANED UP: Removing old singular-to-plural mappings since labels are now dynamic
const AUDIENCE_MAP: Record<string, string> = {
  "Founder": "C-Level & Founders", 
  "Executive": "C-Level & Founders",
  "VC": "Investors",
  "PE": "Investors",
  "Asset Manager": "Investors"
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
  
  if (Array.isArray(input)) {
    rawList = input;
  } else if (typeof input === 'string') {
    if (input.startsWith('{') && input.endsWith('}')) {
      rawList = input.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
    } else {
      rawList = [input.trim()];
    }
  }

  if (useAudienceMapping) {
    return rawList.map(item => {
      const cleanItem = item.trim();
      return AUDIENCE_MAP[cleanItem] || cleanItem;
    });
  }

  return rawList;
}

function normalizeScale(input: any): string {
  if (!input) return "";
  const str = String(input).trim();
  return str.split(' ')[0]; 
}

// --- FETCHERS ---

/**
 * NEW: Fetches unique audience types from the audience_types column
 */
export const getUniqueAudiences = cache(async (): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("industry_events").select("audience_types");
  
  const allAudiences: string[] = [];
  (data ?? []).forEach((row: any) => {
    // Normalizing because audience_types might be stored as an array or a string in DB
    allAudiences.push(...normalizeEnumArray(row.audience_types, true));
  });

  // Return a unique, sorted list, filtered for empty strings
  return Array.from(new Set(allAudiences))
    .filter(Boolean)
    .sort();
});

export const getUniqueIndustries = cache(async (): Promise<string[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("industry_events").select("industry");
  
  const allIndustries: string[] = [];
  (data ?? []).forEach((row: any) => {
    allIndustries.push(...normalizeEnumArray(row.industry));
  });

  return Array.from(new Set(allIndustries)).filter(Boolean).sort();
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

  const { data: eventsData, error: eventsError } = await query
    .order("risk_level", { ascending: false })
    .order("start_date", { ascending: true });

  if (eventsError) throw new Error(eventsError.message);

  let filteredEvents: IndustryEventRow[] = (eventsData ?? []).map((e: any) => {
    const normIndustry = normalizeEnumArray(e.industry);
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

  if (industries?.length) {
    filteredEvents = filteredEvents.filter(e => 
      e.industry.some((i: string) => industries.includes(i))
    );
  }
  
  if (audiences?.length) {
    filteredEvents = filteredEvents.filter(e => {
      if (e.audience_types.length === 0) return true; 
      return e.audience_types.some((a: string) => audiences.includes(a));
    });
  }
  
  if (scales?.length) {
    filteredEvents = filteredEvents.filter(e => 
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

  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) return [];

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) return [];

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
});