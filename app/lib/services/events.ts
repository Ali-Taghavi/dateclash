"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { HolidayRow, IndustryEventRow, IndustryType, EventScale } from "@/app/types";

// Environment Variable Validation
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL",
  );
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // Server components don't need to set cookies
        },
        remove() {
          // Server components don't need to remove cookies
        },
      },
    },
  );
}

/**
 * Get holidays for a country and year
 * Checks Supabase cache first, then fetches from Calendarific API if needed
 */
export async function getHolidays(countryCode: string, year: number): Promise<HolidayRow[]> {
  const supabase = await createSupabaseServerClient();

  // Step A: Try Supabase cache first.
  const { data: cached, error: cachedError } = await supabase
    .from("holidays")
    .select("*")
    .eq("country_code", countryCode)
    .eq("year", year);

  if (cachedError) {
    throw new Error(`Supabase query failed: ${cachedError.message}`);
  }

  if (cached && cached.length > 0) {
    return cached as HolidayRow[];
  }

  // Step C: If not found, call Calendarific, bulk insert, then return.
  const apiKey = process.env.CALENDARIFIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing CALENDARIFIC_API_KEY environment variable.");
  }

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Calendarific request failed with status ${response.status}.`,
    );
  }

  const json = (await response.json()) as {
    response?: { holidays?: any[] };
  };

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

  if (rows.length === 0) {
    return [];
  }

  const { data: inserted, error: insertError } = await supabase
    .from("holidays")
    .insert(rows)
    .select();

  if (insertError) {
    throw new Error(`Supabase insert failed: ${insertError.message}`);
  }

  return (inserted ?? []) as HolidayRow[];
}

/**
 * Get unique industries from the industry_events table
 * Returns a sorted array of unique industry names
 */
export async function getUniqueIndustries(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("industry_events")
      .select("industry");

    if (error) {
      console.error(`[getUniqueIndustries] Supabase query error:`, error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    // Flatten the arrays into a single list
    const allIndustries: string[] = [];
    (data ?? []).forEach((row) => {
      if (row.industry && Array.isArray(row.industry)) {
        allIndustries.push(...row.industry);
      }
    });

    // Get unique values and sort alphabetically
    const uniqueIndustries = Array.from(new Set(allIndustries)).sort();

    console.log(`[getUniqueIndustries] Found ${uniqueIndustries.length} unique industries`);

    return uniqueIndustries;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    console.error(`[getUniqueIndustries] Error:`, message);
    throw new Error(`Failed to fetch unique industries: ${message}`);
  }
}

/**
 * Get industry events for a date range and optional filters
 * Returns both date-filtered events and total count of tracked events (without date filter)
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
    console.log(`[getIndustryEvents] Querying events for date range: ${startDate} to ${endDate}, country: ${countryCode ?? "any"}`);
    
    // Helper function to build base query (without date filter)
    const buildBaseQuery = (withDateFilter: boolean) => {
      // Initialize the query object - let TypeScript infer the type properly
      let query = supabase.from("industry_events").select("id, name, start_date, end_date, city, country_code, industry, audience_types, event_scale, risk_level, significance, description, url");

      // Apply date filter only if requested
      if (withDateFilter) {
        // Reassign query with date filters - TypeScript will properly infer the chained type
        query = query
          .lte("start_date", endDate)
          .gte("end_date", startDate);
      }

      // Filter by country_code if provided (include 'Global' events if they exist)
      if (countryCode) {
        query = query.in("country_code", [countryCode, "Global"]);
      }

      return query;
    };

    // Query 1: Get date-filtered events (will filter by industry/audience/scale in-memory)
    let dateFilteredQuery = buildBaseQuery(true);
    
    // Sort by risk_level (Critical first), then start_date
    dateFilteredQuery = dateFilteredQuery
      .order("risk_level", { ascending: false })
      .order("start_date", { ascending: true });

    const { data: eventsData, error: eventsError } = await dateFilteredQuery;

    if (eventsError) {
      console.error(`[getIndustryEvents] Supabase query error:`, eventsError);
      throw new Error(`Supabase query failed: ${eventsError.message}`);
    }

    let filteredEvents = (eventsData ?? []) as IndustryEventRow[];

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
          if (!event.audience_types || event.audience_types.length === 0) {
            return true;
          }
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

    // Query 2: Get total count (without date filter, but with country/industry/audience/scale filters)
    // Since we can't easily filter by industry/audience/scale in Supabase query for arrays,
    // we'll fetch all matching country events and filter in memory for accurate count
    const { data: allCountryEvents, error: allEventsError } = await buildBaseQuery(false);
    
    if (allEventsError) {
      console.error(`[getIndustryEvents] Total events query error:`, allEventsError);
      throw new Error(`Supabase total events query failed: ${allEventsError.message}`);
    }

    let totalTracked = (allCountryEvents ?? []) as IndustryEventRow[];

    // Apply same filters for total count
    if (industries && industries.length > 0) {
      totalTracked = totalTracked.filter((event) => {
        if (!event.industry || event.industry.length === 0) return false;
        return event.industry.some((ind) => industries.includes(ind));
      });
    }

    if (audiences && audiences.length > 0) {
      const allStandardAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
      const hasAllAudiencesSelected = allStandardAudiences.every(aud => audiences.includes(aud));
      
      if (!hasAllAudiencesSelected) {
        totalTracked = totalTracked.filter((event) => {
          if (!event.audience_types || event.audience_types.length === 0) {
            return true;
          }
          return event.audience_types.some((aud) => audiences.includes(aud));
        });
      }
    }

    if (scales && scales.length > 0) {
      totalTracked = totalTracked.filter((event) => {
        if (!event.event_scale) return false;
        const normalizedEventScale = event.event_scale.split(' ')[0] as EventScale;
        return scales.includes(normalizedEventScale);
      });
    }

    const totalTrackedCount = totalTracked.length;

    console.log(`[getIndustryEvents] Found ${filteredEvents.length} events matching criteria (total tracked: ${totalTrackedCount})`);
    if (filteredEvents.length > 0) {
      console.log(`[getIndustryEvents] Sample events:`, filteredEvents.slice(0, 3).map(e => ({ 
        name: e.name, 
        start: e.start_date, 
        end: e.end_date, 
        country: e.country_code,
        industry: e.industry,
        scale: e.event_scale
      })));
    }

    return { events: filteredEvents, totalTracked: totalTrackedCount };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    console.error(`[getIndustryEvents] Error:`, message);
    throw new Error(`Failed to fetch industry events: ${message}`);
  }
}
