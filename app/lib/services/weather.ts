"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { subDays, addDays, format, parseISO } from "date-fns";
import type { WeatherCacheRow, WeatherHistoryDay } from "@/app/types";
import {
  WEATHER_HISTORICAL_YEARS,
  RAIN_THRESHOLD_MM,
  OPEN_METEO_ARCHIVE_API_BASE_URL,
} from "@/lib/constants";

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
 * Get weather risk data for a city and month
 * Fetches historical weather data from Open-Meteo Archive API and caches it in Supabase
 */
export async function getWeatherRisk(
  city: string,
  month: number,
  lat: number,
  lon: number,
  targetYear?: number, // Optional target year for cache lookup
  targetDate?: string, // Optional target date (YYYY-MM-DD) for window centering
): Promise<WeatherCacheRow | null> {
  // Calculate target day from targetDate if provided, otherwise default to 15th (middle of month)
  let targetDay = 15; // Default to middle of month
  if (targetDate) {
    try {
      const parsedTargetDate = parseISO(targetDate);
      if (parsedTargetDate.getMonth() + 1 === month) {
        // Only use targetDate if it's in the same month we're fetching
        targetDay = parsedTargetDate.getDate();
      }
    } catch (error) {
      console.error(`[getWeatherRisk] Error parsing targetDate ${targetDate}:`, error);
    }
  }

  const supabase = await createSupabaseServerClient();

  // Step A: Check Supabase cache first
  // Logic: If targetYear is provided, look for matching target_year
  // If targetYear is not provided, look for null target_year (generic historical data)
  let query = supabase
    .from("weather_cache")
    .select("*")
    .eq("city", city)
    .eq("month", month);
  
  if (targetYear !== undefined) {
    // If targetYear is provided (could be future or past), match it exactly
    query = query.eq("target_year", targetYear);
  } else {
    // For generic historical data, look for null target_year
    query = query.is("target_year", null);
  }
  
  const { data: cached, error: cachedError } = await query.limit(1).single();

  // Log cache result
  if (cached) {
    // Ensure history_data is properly typed (Supabase returns JSONB as parsed JSON)
    const cachedRow = cached as WeatherCacheRow;
    // If history_data exists but is not an array, ensure it's properly formatted
    if (cachedRow.history_data && !Array.isArray(cachedRow.history_data)) {
      cachedRow.history_data = null;
    }
    return cachedRow;
  }

  // Handle cache miss
  if (cachedError && cachedError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is expected if cache miss
    console.error(`[getWeatherRisk] Supabase query error: ${cachedError.message}`);
    throw new Error(`Supabase query failed: ${cachedError.message}`);
  }

  // Step B: Fetch fresh data from Open-Meteo Archive API
  // Calculate the last 4 years for the same month (using constant)
  // Ensure we don't request future dates - exclude current year entirely
  const currentYearForFetch = new Date().getFullYear();
  
  // Calculate years: last 4 years, excluding current year to avoid requesting future dates
  // Example: If currentYearForFetch is 2026 and WEATHER_HISTORICAL_YEARS is 4, 
  // this will fetch: [2022, 2023, 2024, 2025]
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
    tempMax: [],
    tempMin: [],
    precipitation: [],
    humidity: [],
    sunset: [],
  };

  const rainDaysPerYear: number[] = [];

  try {
    // Fetch data for all years sequentially to avoid rate limiting
    // Changed from Promise.all parallel fetching to sequential for...of loop
    const yearDataResults: Array<{
      tempMax: number[];
      tempMin: number[];
      precipitation: number[];
      humidity: number[];
      sunset: string[];
      rainDaysThisYear: number;
      yearHistory: WeatherHistoryDay[];
      year: number;
      fourteenDayTrend: number[];
      avgHumidityThisYear: number | null;
      typicalSunsetThisYear: string | null;
    }> = [];

    for (const year of years) {
      // Calculate window centered around target day: targetDay ± 7 days
      // Window Start = Target Day - 7 days
      // Window End = Target Day + 7 days
      const targetDateForYear = new Date(year, month - 1, targetDay); // month is 1-indexed, Date uses 0-indexed
      const windowStart = subDays(targetDateForYear, 7);
      const windowEnd = addDays(targetDateForYear, 7);
      
      // Format dates as YYYY-MM-DD
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
        const errorText = await response.text().catch(() => "No error details");
        throw new Error(
          `Open-Meteo request failed with status ${response.status} for year ${year}. Response: ${errorText}`,
        );
      }

      const json = (await response.json()) as {
        daily?: {
          time?: string[];
          temperature_2m_max?: (number | null)[];
          temperature_2m_min?: (number | null)[];
          precipitation_sum?: (number | null)[];
          relative_humidity_2m_mean?: (number | null)[];
          sunset?: (string | null)[];
        };
      };

      const daily = json.daily;
      if (!daily || !daily.time) {
        throw new Error(`Invalid response format from Open-Meteo for year ${year}.`);
      }

      const tempMax = daily.temperature_2m_max ?? [];
      const tempMin = daily.temperature_2m_min ?? [];
      const precipitation = daily.precipitation_sum ?? [];
      const humidity = daily.relative_humidity_2m_mean ?? [];
      const sunset = daily.sunset ?? [];
      const time = daily.time ?? [];

      // Count rain days for this year's 14-day window (using constant threshold)
      // Note: precipitation array only contains data for the fetched window (targetDay ± 7 days),
      // so this correctly counts rain days in the 14-day window, not the whole month
      const rainDaysThisYear = precipitation.filter(
        (p) => p !== null && p > RAIN_THRESHOLD_MM
      ).length;

      // Calculate average humidity for this year's month
      const validHumidity = humidity.filter((h) => h !== null) as number[];
      const avgHumidityThisYear = validHumidity.length > 0
        ? Math.round(validHumidity.reduce((sum, val) => sum + val, 0) / validHumidity.length)
        : null;

      // Extract typical sunset time for this year's month
      const validSunset = sunset.filter((s) => s !== null && s.length > 0) as string[];
      let typicalSunsetThisYear: string | null = null;
      if (validSunset.length > 0) {
        // Extract just the time part (HH:MM) from ISO strings and find most common
        const sunsetTimeCounts: Record<string, number> = {};
        for (const sunsetTime of validSunset) {
          const timePart = sunsetTime.split("T")[1]?.split("+")[0]?.split("-")[0] || sunsetTime;
          sunsetTimeCounts[timePart] = (sunsetTimeCounts[timePart] || 0) + 1;
        }
        if (Object.keys(sunsetTimeCounts).length > 0) {
          typicalSunsetThisYear =
            Object.entries(sunsetTimeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
            validSunset[0]?.split("T")[1]?.split("+")[0]?.split("-")[0] ||
            null;
        }
      }

      // Calculate 14-day window dates (centered around target day)
      // Use the actual fetched dates from the API response
      const windowStartDate = time.length > 0 ? time[0] : startDate;
      const windowEndDate = time.length > 0 
        ? time[Math.min(13, time.length - 1)] // Use 14th day (index 13) or last available
        : endDate;

      // Format window label (e.g., "Aug 8 - Aug 21")
      let windowLabel: string | undefined = undefined;
      try {
        const startDateParsed = parseISO(windowStartDate);
        const endDateParsed = parseISO(windowEndDate);
        windowLabel = `${format(startDateParsed, "MMM d")} - ${format(endDateParsed, "MMM d")}`;
      } catch (error) {
        console.error(`[getWeatherRisk] Error formatting window label:`, error);
      }

      // Build history data for this year (include humidity and sunset per year)
      // Add null safety to prevent NaN values
      const yearHistory: WeatherHistoryDay[] = [];
      for (let i = 0; i < time.length; i++) {
        if (time[i] && tempMax[i] !== null && tempMax[i] !== undefined && precipitation[i] !== null && precipitation[i] !== undefined) {
          const safeTempMax = isNaN(tempMax[i]!) ? 0 : Math.round(tempMax[i]!);
          const safeRainSum = isNaN(precipitation[i]!) ? 0 : Math.round(precipitation[i]! * 100) / 100;
          
          yearHistory.push({
            date: time[i],
            temp_max: safeTempMax,
            rain_sum: safeRainSum,
            year: year,
            humidity: (avgHumidityThisYear !== null && !isNaN(avgHumidityThisYear)) ? avgHumidityThisYear : undefined,
            sunset: typicalSunsetThisYear ?? undefined,
            window_start_date: windowStartDate,
            window_end_date: windowEndDate,
            window_label: windowLabel,
          });
        }
      }

      // Calculate 14-day trend for this year (from the fetched window data)
      // Note: The precipitation array only contains data for the window (targetDay ± 7 days),
      // so rainDaysThisYear is correctly calculated for the 14-day window, not the whole month
      // Add null safety to prevent NaN values
      const fourteenDayTrend: number[] = [];
      for (let i = 0; i < Math.min(14, tempMax.length); i++) {
        if (tempMax[i] !== null && tempMax[i] !== undefined && !isNaN(tempMax[i]!)) {
          fourteenDayTrend.push(tempMax[i]!);
        }
      }

      yearDataResults.push({
        tempMax: tempMax.filter((t): t is number => t !== null),
        tempMin: tempMin.filter((t): t is number => t !== null),
        precipitation: precipitation.filter((p): p is number => p !== null),
        humidity: humidity.filter((h): h is number => h !== null),
        sunset: sunset.filter((s): s is string => s !== null),
        rainDaysThisYear,
        yearHistory,
        year,
        fourteenDayTrend,
        avgHumidityThisYear,
        typicalSunsetThisYear,
      });

      // Add a small delay between requests to avoid rate limiting (100ms)
      // Skip delay after the last request
      if (year !== years[years.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Sort yearDataResults by year (descending - most recent first)
    yearDataResults.sort((a, b) => b.year - a.year);

    // Build complete history data array from all years
    const historyData: WeatherHistoryDay[] = [];

    // Aggregate all data from all years
    for (const yearData of yearDataResults) {
      // Collect all valid data points
      for (let i = 0; i < yearData.tempMax.length; i++) {
        if (yearData.tempMax[i] !== null) allDailyData.tempMax.push(yearData.tempMax[i]!);
        if (yearData.tempMin[i] !== null) allDailyData.tempMin.push(yearData.tempMin[i]!);
        if (yearData.precipitation[i] !== null) allDailyData.precipitation.push(yearData.precipitation[i]!);
        if (yearData.humidity[i] !== null) allDailyData.humidity.push(yearData.humidity[i]!);
        if (yearData.sunset[i] !== null) allDailyData.sunset.push(yearData.sunset[i]!);
      }

      rainDaysPerYear.push(yearData.rainDaysThisYear);
      
      // Add year history to complete history array
      if (yearData.yearHistory) {
        historyData.push(...yearData.yearHistory);
      }
    }

    // Step C: Calculate averages
    const avgTempHigh =
      allDailyData.tempMax.length > 0
        ? Math.round(
            allDailyData.tempMax.reduce((sum, val) => sum + val, 0) /
              allDailyData.tempMax.length,
          )
        : 0;

    const avgTempLow =
      allDailyData.tempMin.length > 0
        ? Math.round(
            allDailyData.tempMin.reduce((sum, val) => sum + val, 0) /
              allDailyData.tempMin.length,
          )
        : 0;

    // Average the rain days count across the 7 years
    const avgRainDaysCount =
      rainDaysPerYear.length > 0
        ? Math.round(
            rainDaysPerYear.reduce((sum, val) => sum + val, 0) /
              rainDaysPerYear.length,
          )
        : 0;

    const avgHumidity =
      allDailyData.humidity.length > 0
        ? Math.round(
            allDailyData.humidity.reduce((sum, val) => sum + val, 0) /
              allDailyData.humidity.length,
          )
        : 0;

    // Extract typical sunset time (use the most common one, or first if all different)
    const sunsetCounts: Record<string, number> = {};
    for (const sunsetTime of allDailyData.sunset) {
      // Extract just the time part (HH:MM) from ISO string
      const timePart = sunsetTime.split("T")[1]?.split("+")[0]?.split("-")[0] || sunsetTime;
      sunsetCounts[timePart] = (sunsetCounts[timePart] || 0) + 1;
    }

    let typicalSunset = "";
    if (Object.keys(sunsetCounts).length > 0) {
      typicalSunset =
        Object.entries(sunsetCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        allDailyData.sunset[0] ||
        "";
    }

    // Step D: Save to cache and return (prediction logic removed - only verified history)
    // Logic: If targetYear is provided, save it (whether future or past)
    // If targetYear is not provided, save null (generic historical data)
    // Ensure all numeric values are safe (no NaN)
    const safeAvgTempHigh = isNaN(avgTempHigh) ? 0 : avgTempHigh;
    const safeAvgTempLow = isNaN(avgTempLow) ? 0 : avgTempLow;
    const safeRainDaysCount = isNaN(avgRainDaysCount) ? 0 : avgRainDaysCount;
    const safeHumidity = isNaN(avgHumidity) ? 0 : avgHumidity;
    
    const newRow = {
      city,
      month,
      avg_temp_high_c: safeAvgTempHigh,
      avg_temp_low_c: safeAvgTempLow,
      rain_days_count: safeRainDaysCount,
      humidity_pct: safeHumidity,
      sunset_time: typicalSunset || "",
      history_data: historyData, // Store the complete history data (includes window_label in each day)
      target_year: targetYear !== undefined ? targetYear : null, // Save targetYear if provided, otherwise null (matches database column name)
    };
    
    // Final safety check: ensure no NaN values in numeric fields
    const hasNaN = Object.entries(newRow).some(([key, value]) => {
      if (typeof value === 'number' && isNaN(value)) {
        console.error(`[getWeatherRisk] WARNING: NaN detected in ${key}: ${value}`);
        return true;
      }
      return false;
    });
    
    if (hasNaN) {
      console.error(`[getWeatherRisk] ERROR: NaN values detected in insert object!`);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("weather_cache")
      .insert(newRow)
      .select()
      .single();

    if (insertError) {
      console.error(`[getWeatherRisk] Supabase insert error:`, insertError);
      console.error(`[getWeatherRisk] Insert object that failed:`, JSON.stringify(newRow, null, 2));
      throw new Error(`Supabase insert failed: ${insertError.message}`);
    }

    return inserted as WeatherCacheRow;
  } catch (error) {
    // Log the exact error with console.error
    console.error(`[getWeatherRisk] Error occurred:`, error);
    if (error instanceof Error) {
      console.error(`[getWeatherRisk] Error message: ${error.message}`);
      console.error(`[getWeatherRisk] Error stack: ${error.stack}`);
    }
    // Return null instead of throwing, but log the error
    return null;
  }
}
