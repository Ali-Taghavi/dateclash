"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { subDays, addDays, format, parseISO } from "date-fns";
import type { WeatherCacheRow, WeatherHistoryDay } from "@/app/types";

// CONSTANTS (Inlined to prevent module not found errors)
const WEATHER_HISTORICAL_YEARS = 4;
const RAIN_THRESHOLD_MM = 0.1;
const OPEN_METEO_ARCHIVE_API_BASE_URL = "https://archive-api.open-meteo.com/v1/archive";

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
        get(name: string) { return cookieStore.get(name)?.value; },
        set() { },
        remove() { },
      },
    },
  );
}

/**
 * Get weather risk data for a city and month
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
      const parsedTargetDate = parseISO(targetDate);
      if (parsedTargetDate.getMonth() + 1 === month) {
        targetDay = parsedTargetDate.getDate();
      }
    } catch (error) {
      console.error(`[getWeatherRisk] Error parsing targetDate ${targetDate}:`, error);
    }
  }

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
  
  const { data: cached, error: cachedError } = await query.limit(1).single();

  if (cached) {
    const cachedRow = cached as WeatherCacheRow;
    if (cachedRow.history_data && !Array.isArray(cachedRow.history_data)) {
      // FIXED: Assign empty array instead of null to match type
      cachedRow.history_data = []; 
    }
    return cachedRow;
  }

  if (cachedError && cachedError.code !== "PGRST116") {
    console.error(`[getWeatherRisk] Supabase query error: ${cachedError.message}`);
    throw new Error(`Supabase query failed: ${cachedError.message}`);
  }

  // Step B: Fetch fresh data from Open-Meteo Archive API
  const currentYearForFetch = new Date().getFullYear();
  const years = Array.from({ length: WEATHER_HISTORICAL_YEARS }, (_, i) =>
    currentYearForFetch - WEATHER_HISTORICAL_YEARS + i
  );

  const allDailyData: {
    tempMax: number[];
    tempMin: number[];
    precipitation: number[];
    humidity: number[];
    sunset: string[];
  } = {
    tempMax: [], tempMin: [], precipitation: [], humidity: [], sunset: [],
  };

  const rainDaysPerYear: number[] = [];

  try {
    const yearDataResults = [];

    for (const year of years) {
      const targetDateForYear = new Date(year, month - 1, targetDay); 
      const windowStart = subDays(targetDateForYear, 7);
      const windowEnd = addDays(targetDateForYear, 7);
      
      const startDate = format(windowStart, "yyyy-MM-dd");
      const endDate = format(windowEnd, "yyyy-MM-dd");

      const url = new URL(OPEN_METEO_ARCHIVE_API_BASE_URL);
      url.searchParams.set("latitude", lat.toString());
      url.searchParams.set("longitude", lon.toString());
      url.searchParams.set("start_date", startDate);
      url.searchParams.set("end_date", endDate);
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,sunset");
      url.searchParams.set("timezone", "auto");

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Open-Meteo request failed with status ${response.status}`);
      }

      const json = await response.json();
      const daily = json.daily;
      if (!daily || !daily.time) throw new Error(`Invalid response format`);

      const tempMax = daily.temperature_2m_max ?? [];
      const tempMin = daily.temperature_2m_min ?? [];
      const precipitation = daily.precipitation_sum ?? [];
      const humidity = daily.relative_humidity_2m_mean ?? [];
      const sunset = daily.sunset ?? [];
      const time = daily.time ?? [];

      const rainDaysThisYear = precipitation.filter((p: any) => p !== null && p > RAIN_THRESHOLD_MM).length;

      const validHumidity = humidity.filter((h: any) => h !== null) as number[];
      const avgHumidityThisYear = validHumidity.length > 0
        ? Math.round(validHumidity.reduce((sum, val) => sum + val, 0) / validHumidity.length)
        : null;

      const validSunset = sunset.filter((s: any) => s !== null && s.length > 0) as string[];
      let typicalSunsetThisYear: string | null = null;
      if (validSunset.length > 0) {
        const sunsetTimeCounts: Record<string, number> = {};
        for (const sunsetTime of validSunset) {
          const timePart = sunsetTime.split("T")[1]?.split("+")[0]?.split("-")[0] || sunsetTime;
          sunsetTimeCounts[timePart] = (sunsetTimeCounts[timePart] || 0) + 1;
        }
        if (Object.keys(sunsetTimeCounts).length > 0) {
          typicalSunsetThisYear = Object.entries(sunsetTimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        }
      }

      const windowStartDate = time.length > 0 ? time[0] : startDate;
      const windowEndDate = time.length > 0 ? time[Math.min(13, time.length - 1)] : endDate;

      let windowLabel: string | undefined = undefined;
      try {
        windowLabel = `${format(parseISO(windowStartDate), "MMM d")} - ${format(parseISO(windowEndDate), "MMM d")}`;
      } catch (e) {}

      const yearHistory: WeatherHistoryDay[] = [];
      for (let i = 0; i < time.length; i++) {
        if (time[i] && tempMax[i] != null && precipitation[i] != null) {
          yearHistory.push({
            date: time[i],
            temp_max: Math.round(tempMax[i]!),
            rain_sum: Math.round(precipitation[i]! * 100) / 100,
            year: year,
            humidity: (avgHumidityThisYear !== null) ? avgHumidityThisYear : undefined,
            sunset: typicalSunsetThisYear ?? undefined,
            window_start_date: windowStartDate,
            window_end_date: windowEndDate,
            window_label: windowLabel,
          });
        }
      }

      yearDataResults.push({
        tempMax: tempMax.filter((t: any) => t !== null),
        tempMin: tempMin.filter((t: any) => t !== null),
        precipitation: precipitation.filter((p: any) => p !== null),
        humidity: humidity.filter((h: any) => h !== null),
        sunset: sunset.filter((s: any) => s !== null),
        rainDaysThisYear,
        yearHistory,
        year,
      });

      if (year !== years[years.length - 1]) await new Promise((r) => setTimeout(r, 100));
    }

    yearDataResults.sort((a, b) => b.year - a.year);

    const historyData: WeatherHistoryDay[] = [];
    for (const yearData of yearDataResults) {
      allDailyData.tempMax.push(...yearData.tempMax as number[]);
      allDailyData.tempMin.push(...yearData.tempMin as number[]);
      allDailyData.precipitation.push(...yearData.precipitation as number[]);
      allDailyData.humidity.push(...yearData.humidity as number[]);
      allDailyData.sunset.push(...yearData.sunset as string[]);
      rainDaysPerYear.push(yearData.rainDaysThisYear);
      if (yearData.yearHistory) historyData.push(...yearData.yearHistory);
    }

    const avgTempHigh = allDailyData.tempMax.length > 0 ? Math.round(allDailyData.tempMax.reduce((a, b) => a + b, 0) / allDailyData.tempMax.length) : 0;
    const avgTempLow = allDailyData.tempMin.length > 0 ? Math.round(allDailyData.tempMin.reduce((a, b) => a + b, 0) / allDailyData.tempMin.length) : 0;
    const avgRainDaysCount = rainDaysPerYear.length > 0 ? Math.round(rainDaysPerYear.reduce((a, b) => a + b, 0) / rainDaysPerYear.length) : 0;
    const avgHumidity = allDailyData.humidity.length > 0 ? Math.round(allDailyData.humidity.reduce((a, b) => a + b, 0) / allDailyData.humidity.length) : 0;

    const sunsetCounts: Record<string, number> = {};
    for (const s of allDailyData.sunset) {
      const t = s.split("T")[1]?.split("+")[0]?.split("-")[0] || s;
      sunsetCounts[t] = (sunsetCounts[t] || 0) + 1;
    }
    const typicalSunset = Object.entries(sunsetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    const newRow = {
      city,
      month,
      avg_temp_high_c: isNaN(avgTempHigh) ? 0 : avgTempHigh,
      avg_temp_low_c: isNaN(avgTempLow) ? 0 : avgTempLow,
      rain_days_count: isNaN(avgRainDaysCount) ? 0 : avgRainDaysCount,
      humidity_pct: isNaN(avgHumidity) ? 0 : avgHumidity,
      sunset_time: typicalSunset,
      history_data: historyData,
      target_year: targetYear !== undefined ? targetYear : null,
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from("weather_cache")
      .insert(newRow)
      .select()
      .single();

    if (insertError) {
      console.error(`[getWeatherRisk] Supabase insert error:`, insertError);
      throw new Error(`Supabase insert failed: ${insertError.message}`);
    }

    return inserted as WeatherCacheRow;
  } catch (error) {
    console.error(`[getWeatherRisk] Error:`, error);
    return null;
  }
}