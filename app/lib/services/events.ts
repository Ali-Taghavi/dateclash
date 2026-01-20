"use server";

import { cookies } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { 
  parseISO,
  isValid,
  getMonth,
  getDate,
  getDay,
  getDaysInMonth,
  getYear,
  setYear,
  addDays,
  subDays
} from "date-fns";
import type { HolidayRow, IndustryEventRow, EventScale } from "@/app/types";

// --- ENVIRONMENT VALIDATION ---
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Missing required Supabase environment variables.");
}

// --- CONSTANTS ---
const AUDIENCE_MAP: Record<string, string> = {
  "Founder": "C-Level & Founders", 
  "Executive": "C-Level & Founders",
  "VC": "Investors",
  "PE": "Investors",
  "Asset Manager": "Investors"
};

// --- HELPERS ---

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
                    setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch { } },
                },
            },
        );
    } catch (e) {
        const { createClient } = await import("@supabase/supabase-js");
        return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    }
}

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

function getSeriesKey(name: string): string {
    return name.toLowerCase().replace(/\b(202\d|'2\d)\b/g, "").replace(/[^a-z0-9]/g, "").trim();
}

function projectDate(originalDateStr: string, targetYear: number): string {
  const date = parseISO(originalDateStr);
  if (!isValid(date)) return originalDateStr;

  const month = getMonth(date); 
  const originalDay = getDay(date); 
  const dayOfMonth = getDate(date); 

  const occurrence = Math.ceil(dayOfMonth / 7);
  const targetMonthStart = new Date(targetYear, month, 1, 12, 0, 0);
  const startDay = getDay(targetMonthStart); 
  let daysToFirst = (originalDay - startDay + 7) % 7;
  let targetDateNum = 1 + daysToFirst + (occurrence - 1) * 7;
  
  const daysInTargetMonth = getDaysInMonth(targetMonthStart);
  if (targetDateNum > daysInTargetMonth) {
    targetDateNum -= 7; 
  }

  const targetDate = new Date(targetYear, month, targetDateNum, 12, 0, 0);
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

// --- DATA ACCESS METHODS ---

export const getUniqueAudiences = cache(async (): Promise<string[]> => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("industry_events").select("audience_types");
    const allAudiences: string[] = [];
    (data ?? []).forEach((row: any) => { allAudiences.push(...normalizeEnumArray(row.audience_types, true)); });
    return Array.from(new Set(allAudiences)).filter(Boolean).sort();
});

export const getUniqueIndustries = cache(async (): Promise<string[]> => {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("industry_events").select("industry");
    const allIndustries: string[] = [];
    (data ?? []).forEach((row: any) => { allIndustries.push(...normalizeEnumArray(row.industry)); });
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

  // A. FETCH REAL EVENTS
  let query = supabase.from("industry_events").select("*");
  query = query.or(`start_date.lte.${endDate},end_date.gte.${startDate}`);
  if (countryCode) query = query.in("country_code", [countryCode, "Global"]);

  const { data: eventsData, error: eventsError } = await query
    .order("risk_level", { ascending: false })
    .order("start_date", { ascending: true });

  if (eventsError) throw new Error(eventsError.message);

  let realEvents: IndustryEventRow[] = (eventsData ?? []).map((e: any) => {
    const normIndustry = normalizeEnumArray(e.industry);
    const normAudiences = normalizeEnumArray(e.audience_types, true); 
    const normScale = normalizeScale(e.event_scale);
    return {
      ...e,
      industry: normIndustry,
      audience_types: normAudiences,
      event_scale: normScale,
      category: normIndustry[0] || "General",
      url: e.url || "",
      is_projected: false
    };
  });

  // B. PROJECTION LOGIC
  const requestStartObj = parseISO(startDate);
  const requestEndObj = parseISO(endDate);
  const currentYear = new Date().getFullYear(); 
  const targetProjectionYear = getYear(requestEndObj);

  if (targetProjectionYear > currentYear) {
    const sourceYear = targetProjectionYear - 1; 

    // Deduplicate
    const existingTargetYearKeys = new Set(
      realEvents
        .filter(e => getYear(parseISO(e.start_date)) === targetProjectionYear)
        .map(e => getSeriesKey(e.name))
    );

    let sourceStartObj = subDays(setYear(requestStartObj, sourceYear), 45); 
    let sourceEndObj = addDays(setYear(requestEndObj, sourceYear), 45);
    const sourceStart = sourceStartObj.toISOString().split('T')[0];
    const sourceEnd = sourceEndObj.toISOString().split('T')[0];

    let sourceQuery = supabase.from("industry_events").select("*")
      .or(`start_date.lte.${sourceEnd},end_date.gte.${sourceStart}`);
      
    if (countryCode) sourceQuery = sourceQuery.in("country_code", [countryCode, "Global"]);
    
    const { data: sourceData } = await sourceQuery;

    if (sourceData && sourceData.length > 0) {
      const projectedEvents: IndustryEventRow[] = [];

      sourceData.forEach((sourceEvent: any) => {
        const seriesKey = getSeriesKey(sourceEvent.name);
        
        if (!existingTargetYearKeys.has(seriesKey)) {
          const newStart = projectDate(sourceEvent.start_date, targetProjectionYear);
          const newEnd = projectDate(sourceEvent.end_date, targetProjectionYear);

          if (newStart >= startDate && newStart <= endDate) {
            const normIndustry = normalizeEnumArray(sourceEvent.industry);
            const normAudiences = normalizeEnumArray(sourceEvent.audience_types, true);
            const normScale = normalizeScale(sourceEvent.event_scale);

            projectedEvents.push({
              ...sourceEvent,
              id: `proj_${sourceEvent.id}`, 
              name: `${sourceEvent.name}`, 
              start_date: newStart,
              end_date: newEnd,
              industry: normIndustry,
              audience_types: normAudiences,
              event_scale: normScale,
              category: normIndustry[0] || "General",
              url: sourceEvent.url || "",
              is_projected: true,
              projected_from: sourceYear
            });
          }
        }
      });
      realEvents = [...realEvents, ...projectedEvents];
    }
  }

  // C. FILTERING
  let filteredEvents = realEvents;
  if (industries?.length) filteredEvents = filteredEvents.filter(e => e.industry.some((i: string) => industries.includes(i)));
  if (audiences?.length) filteredEvents = filteredEvents.filter(e => { if (e.audience_types.length === 0) return true; return e.audience_types.some((a: string) => audiences.includes(a)); });
  if (scales?.length) filteredEvents = filteredEvents.filter(e => scales.includes(e.event_scale || ""));

  filteredEvents.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  return { events: filteredEvents, totalTracked: filteredEvents.length };
});

// --- HOLIDAY LOGIC (With Sanity Check & Cache Busting) ---

async function fetchAndCacheHolidays(countryCode: string, year: number): Promise<HolidayRow[]> {
  const supabase = await createSupabaseServerClient();
  
  // 1. Try fetching from Database first
  const { data: cached } = await supabase
    .from("holidays")
    .select("*")
    .eq("country_code", countryCode)
    .eq("year", year);

  // 2. SANITY CHECK: Verify the cached dates actually belong to the requested year
  if (cached && cached.length > 0) {
    const isCacheValid = cached.every((h: any) => h.date && h.date.startsWith(String(year)));
    
    if (isCacheValid) {
      return cached as HolidayRow[];
    } else {
      console.warn(`[DateClash] Corrupt cache detected for ${countryCode} ${year}. Refetching from API...`);
      // Delete corrupt data so upsert can cleanly replace it
      await supabase.from("holidays").delete().eq("country_code", countryCode).eq("year", year);
    }
  }

  // 3. If no cache or corrupt cache, fetch from Calendarific
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) return [];

  const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`;
  const response = await fetch(url, { cache: 'force-cache' });
  
  if (!response.ok) {
    console.error(`[DateClash] API Fetch failed for ${countryCode} ${year}: ${response.statusText}`);
    return [];
  }

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

  // 4. Update Database
  if (rows.length > 0) {
    await supabase.from("holidays").upsert(rows, { 
      onConflict: 'country_code,year,date,name', 
      ignoreDuplicates: false 
    });
  }
  
  return rows as HolidayRow[];
}

export const getHolidays = cache(async (countryCode: string, year: number): Promise<HolidayRow[]> => {
    const isWebContext = process.env.NEXT_PHASE !== undefined;
    if (!isWebContext) return fetchAndCacheHolidays(countryCode, year);
    
    return unstable_cache(
      () => fetchAndCacheHolidays(countryCode, year),
      [`holidays-v2-${countryCode}-${year}`], // <--- KEY CHANGED TO 'v2' TO FORCE CACHE BUST
      { revalidate: 604800, tags: ['holidays'] }
    )();
});