"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { subDays, addDays, format, parseISO } from "date-fns";
import type { WeatherCacheRow, WeatherHistoryDay } from "@/app/types";

// CONSTANTS
const WEATHER_HISTORICAL_YEARS = 4;
const RAIN_THRESHOLD_MM = 0.1;
const OPEN_METEO_ARCHIVE_API_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

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
    // 3. ULTIMATE FALLBACK: If cookies() throws for ANY reason, use the standard client
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
}

/**
 * 🛠️ INTERNAL HELPER: Separated to resolve the Next.js cache-cookie conflict
 */
async function fetchAndCacheWeather(
  city: string,
  month: number,
  lat: number,
  lon: number,
  targetYear?: number, 
  targetDay: number = 15
): Promise<WeatherCacheRow | null> {
  const supabase = await createSupabaseServerClient();

  // Step A: Check Supabase cache first
  let query = supabase
    .from("weather_cache")
    .select("*")
    .eq("city", city)
    .eq("month", month);
  
  if (targetYear !== undefined) {
    query = query.eq("target_year", targetYear);
  } else {
    query = query.is("target_year", null);
  }
  
  const { data: cached } = await query.limit(1).maybeSingle();

  if (cached) {
    const cachedRow = cached as WeatherCacheRow;
    if (cachedRow.history_data && !Array.isArray(cachedRow.history_data)) {
      cachedRow.history_data = []; 
    }
    return cachedRow;
  }

  // Step B: Fetch fresh data from Open-Meteo Archive API
  const currentYearForFetch = new Date().getFullYear();
  const years = Array.from({ length: WEATHER_HISTORICAL_YEARS }, (_, i) =>
    currentYearForFetch - WEATHER_HISTORICAL_YEARS + i
  );

  const allDailyData: any = { tempMax: [], tempMin: [], precipitation: [], humidity: [], sunset: [] };
  const rainDaysPerYear: number[] = [];
  const yearDataResults = [];

  for (const year of years) {
    const targetDateForYear = new Date(year, month - 1, targetDay); 
    const windowStart = subDays(targetDateForYear, 7);
    const windowEnd = addDays(targetDateForYear, 7);
    
    const url = new URL(OPEN_METEO_ARCHIVE_API_BASE_URL);
    url.searchParams.set("latitude", lat.toString());
    url.searchParams.set("longitude", lon.toString());
    url.searchParams.set("start_date", format(windowStart, "yyyy-MM-dd"));
    url.searchParams.set("end_date", format(windowEnd, "yyyy-MM-dd"));
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,sunset");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString(), { cache: 'force-cache' });
    if (!response.ok) continue;

    const json = await response.json();
    const daily = json.daily;
    if (!daily) continue;

    const rainDaysThisYear = (daily.precipitation_sum || []).filter((p: any) => p > RAIN_THRESHOLD_MM).length;
    
    const yearHistory: WeatherHistoryDay[] = (daily.time || []).map((t: string, i: number) => ({
      date: t,
      temp_max: Math.round(daily.temperature_2m_max[i]),
      rain_sum: Math.round(daily.precipitation_sum[i] * 100) / 100,
      year
    }));

    yearDataResults.push({
      tempMax: daily.temperature_2m_max || [],
      tempMin: daily.temperature_2m_min || [],
      precipitation: daily.precipitation_sum || [],
      humidity: daily.relative_humidity_2m_mean || [],
      sunset: daily.sunset || [],
      rainDaysThisYear,
      yearHistory,
      year
    });
  }

  // Aggregate Data
  yearDataResults.forEach(yd => {
    allDailyData.tempMax.push(...yd.tempMax);
    allDailyData.tempMin.push(...yd.tempMin);
    allDailyData.precipitation.push(...yd.precipitation);
    allDailyData.humidity.push(...yd.humidity);
    allDailyData.sunset.push(...yd.sunset);
    rainDaysPerYear.push(yd.rainDaysThisYear);
  });

  const newRow = {
    city,
    month,
    avg_temp_high_c: Math.round(allDailyData.tempMax.reduce((a:any,b:any)=>a+b,0)/allDailyData.tempMax.length) || 0,
    avg_temp_low_c: Math.round(allDailyData.tempMin.reduce((a:any,b:any)=>a+b,0)/allDailyData.tempMin.length) || 0,
    rain_days_count: Math.round(rainDaysPerYear.reduce((a:any,b:any)=>a+b,0)/rainDaysPerYear.length) || 0,
    humidity_pct: Math.round(allDailyData.humidity.reduce((a:any,b:any)=>a+b,0)/allDailyData.humidity.length) || 0,
    sunset_time: allDailyData.sunset[0]?.split("T")[1] || "",
    history_data: yearDataResults.flatMap(yd => yd.yearHistory),
    target_year: targetYear ?? null,
  };

  const { data: inserted } = await supabase.from("weather_cache").insert(newRow).select().single();
  return inserted as WeatherCacheRow;
}

/**
 * 🚀 EXPORTED ACTION
 */
export async function getWeatherRisk(
  city: string,
  month: number,
  lat: number,
  lon: number,
  targetYear?: number, 
  targetDate?: string, 
): Promise<WeatherCacheRow | null> {
  let targetDay = 15; 
  if (targetDate) {
    try {
      const parsedDate = parseISO(targetDate);
      if (parsedDate.getMonth() + 1 === month) targetDay = parsedDate.getDate();
    } catch (e) {}
  }

  return fetchAndCacheWeather(city, month, lat, lon, targetYear, targetDay);
}