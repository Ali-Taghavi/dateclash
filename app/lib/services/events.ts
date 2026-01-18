"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { HolidayRow, IndustryEventRow, IndustryType, EventScale } from "@/app/types";

// Environment Variable Validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in server components
          }
        },
      },
    },
  );
}

/**
 * Get holidays for a country and year
 */
export async function getHolidays(countryCode: string, year: number): Promise<HolidayRow[]> {
  const supabase = await createSupabaseServerClient();

  const { data: cached, error: cachedError } = await supabase
    .from("holidays")
    .select("*")
    .eq("country_code", countryCode)
    .eq("year", year);

  if (cachedError) throw new Error(`Supabase query failed: ${cachedError.message}`);
  if (cached && cached.length > 0) return cached as HolidayRow[];

  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) throw new Error("Missing CALENDARIFIC_API_KEY environment variable.");

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Calendarific request failed with status ${response.status}.`);

  const json = (await response.json()) as { response?: { holidays?: any[] }; };
  const holidays = json.response?.holidays ?? [];

  const rows = holidays.map((holiday) => ({
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

  if (rows.length === 0) return [];

  const { data: inserted, error: insertError } = await supabase
    .from("holidays")
    .insert(rows)
    .select();

  if (insertError) throw new Error(`Supabase insert failed: ${insertError.message}`);

  return (inserted ?? []) as HolidayRow[];
}

/**
 * Get unique industries from the industry_events table
 */
export async function getUniqueIndustries(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("industry_events").select("industry");
  if (error) throw new Error(`Supabase query failed: ${error.message}`);

  const allIndustries: string[] = [];
  (data ?? []).forEach((row) => {
    if (row.industry && Array.isArray(row.industry)) {
      allIndustries.push(...row.industry);
    }
  });

  return Array.from(new Set(allIndustries)).sort();
}

/**
 * Get industry events for a date range and optional filters
 */
export async function getIndustryEvents(
  startDate: string,
  endDate: string,
  countryCode?: string,
  industries?: string[],
  audiences?: string[],
  scales?: EventScale[],
): Promise<{ events: IndustryEventRow[]; totalTracked: number }> {
  const supabase = await createSupabaseServerClient();

  try {
    const buildBaseQuery = (withDateFilter: boolean) => {
      let query = supabase.from("industry_events").select("id, name, start_date, end_date, city, country_code, industry, audience_types, event_scale, risk_level, significance, description, url");

      if (withDateFilter) {
        query = query.lte("start_date", endDate).gte("end_date", startDate);
      }
      if (countryCode) {
        query = query.in("country_code", [countryCode, "Global"]);
      }
      return query;
    };

    // Query 1: Get date-filtered events
    let dateFilteredQuery = buildBaseQuery(true)
      .order("risk_level", { ascending: false })
      .order("start_date", { ascending: true });

    const { data: eventsData, error: eventsError } = await dateFilteredQuery;
    if (eventsError) throw new Error(`Supabase query failed: ${eventsError.message}`);

    // FIXED: Explicitly map raw data to IndustryEventRow to satisfy types
    let filteredEvents: IndustryEventRow[] = (eventsData ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      start_date: e.start_date,
      end_date: e.end_date,
      city: e.city,
      country_code: e.country_code,
      
      // Map Arrays directly
      industry: Array.isArray(e.industry) ? e.industry : [],
      audience_types: Array.isArray(e.audience_types) ? e.audience_types : [],
      
      // Derive string fields
      category: Array.isArray(e.industry) && e.industry.length > 0 ? e.industry[0] : "General",
      
      event_scale: e.event_scale,
      risk_level: e.risk_level,
      significance: e.significance,
      description: e.description,
      url: e.url || ""
    }));

    // Apply industry filter (in-memory)
    if (industries && industries.length > 0) {
      filteredEvents = filteredEvents.filter((event) => {
        if (!event.industry || event.industry.length === 0) return false;
        return event.industry.some((ind) => industries.includes(ind));
      });
    }

    // Apply audience filter (in-memory)
    if (audiences && audiences.length > 0) {
      const allStandardAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
      const hasAllAudiencesSelected = allStandardAudiences.every(aud => audiences.includes(aud));
      
      if (!hasAllAudiencesSelected) {
        filteredEvents = filteredEvents.filter((event) => {
          if (!event.audience_types || event.audience_types.length === 0) return true;
          return event.audience_types.some((aud) => audiences.includes(aud));
        });
      }
    }

    // Apply scale filter (in-memory)
    if (scales && scales.length > 0) {
      filteredEvents = filteredEvents.filter((event) => {
        if (!event.event_scale) return false;
        const normalizedEventScale = event.event_scale.split(' ')[0] as EventScale;
        return scales.includes(normalizedEventScale);
      });
    }

    // Query 2: Get total count (without date filter)
    const { data: allCountryEvents, error: allEventsError } = await buildBaseQuery(false);
    if (allEventsError) throw new Error(`Supabase total events query failed: ${allEventsError.message}`);

    // We must map these too if we filter them, or perform a simpler count
    // For performance, we'll cast unsafely here just for counting, 
    // but strictly we should filter on the raw 'any' objects to avoid overhead.
    let totalTrackedRaw = (allCountryEvents ?? []) as any[];

    if (industries && industries.length > 0) {
      totalTrackedRaw = totalTrackedRaw.filter((e) => e.industry?.some((ind: string) => industries.includes(ind)));
    }
    if (audiences && audiences.length > 0) {
       // ... (Audiences Logic) ...
       const allStandardAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
       const hasAll = allStandardAudiences.every(aud => audiences.includes(aud));
       if (!hasAll) {
         totalTrackedRaw = totalTrackedRaw.filter((e) => !e.audience_types || e.audience_types.length === 0 || e.audience_types.some((aud: string) => audiences.includes(aud)));
       }
    }
    if (scales && scales.length > 0) {
      totalTrackedRaw = totalTrackedRaw.filter((e) => e.event_scale && scales.includes(e.event_scale.split(' ')[0]));
    }

    return { events: filteredEvents, totalTracked: totalTrackedRaw.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred.";
    console.error(`[getIndustryEvents] Error:`, message);
    throw new Error(`Failed to fetch industry events: ${message}`);
  }
}