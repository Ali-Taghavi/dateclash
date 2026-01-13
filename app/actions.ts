"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { Resend } from "resend";
import type {
  HolidayRow,
  WeatherCacheRow,
  IndustryEventRow,
  TestResult,
  EmailResult,
  FrankfurtTestResult,
  StrategicAnalysisResult,
  StrategicAnalysisFormData,
  DateAnalysis,
  IndustryType,
  EventScale,
  WeatherHistoryDay,
} from "./types";
import { subDays, addDays, format, parseISO, eachDayOfInterval, getMonth } from "date-fns";
import {
  WEATHER_HISTORICAL_YEARS,
  RAIN_THRESHOLD_MM,
  OPEN_METEO_ARCHIVE_API_BASE_URL,
  DEFAULT_CAPITALS,
  CITY_COORDINATES,
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
          // For this simple system check we don't need to modify cookies.
        },
        remove() {
          // For this simple system check we don't need to modify cookies.
        },
      },
    },
  );
}

async function getHolidays(countryCode: string, year: number) {
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

export async function testHolidayCheck(
  _prevState: TestResult | null,
  _formData: FormData,
): Promise<TestResult> {
  try {
    const countryCode = "US";
    const year = 2026;

    const holidays = await getHolidays(countryCode, year);

    const newYears = holidays.find(
      (holiday) => holiday.name.toLowerCase() === "new year's day",
    );

    if (!newYears) {
      return {
        success: false,
        message:
          "Connection succeeded, but 'New Year's Day' was not found in the data.",
      };
    }

    return {
      success: true,
      message: "Successfully fetched holiday from backend.",
      holidayName: newYears.name,
      holidayDate: newYears.date,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return {
      success: false,
      message,
    };
  }
}

export async function getWeatherRisk(
  city: string,
  month: number,
  lat: number,
  lon: number,
  targetYear?: number, // Optional target year for cache lookup
  targetDate?: string, // Optional target date (YYYY-MM-DD) for window centering
): Promise<WeatherCacheRow | null> {
  // Add logging at the start
  console.log(`[getWeatherRisk] Starting for city: ${city}, month: ${month}, coords: (${lat}, ${lon}), targetYear: ${targetYear ?? "none"}, targetDate: ${targetDate ?? "none"}`);
  
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
  
  console.log(`[getWeatherRisk] Using targetDay: ${targetDay} for month ${month}`);

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
    console.log(`[getWeatherRisk] Cache lookup: Looking for target_year = ${targetYear}`);
  } else {
    // For generic historical data, look for null target_year
    query = query.is("target_year", null);
    console.log(`[getWeatherRisk] Cache lookup: Looking for generic data (target_year is null)`);
  }
  
  const { data: cached, error: cachedError } = await query.limit(1).single();

  // Log cache result
  if (cached) {
    console.log('Cache Hit:', JSON.stringify(cached, null, 2));
    // Ensure history_data is properly typed (Supabase returns JSONB as parsed JSON)
    const cachedRow = cached as WeatherCacheRow;
    // If history_data exists but is not an array, ensure it's properly formatted
    if (cachedRow.history_data && !Array.isArray(cachedRow.history_data)) {
      cachedRow.history_data = null;
    }
    console.log(`[getWeatherRisk] Cache hit for ${city}, month ${month}, targetYear: ${targetYear ?? "none"}`);
    return cachedRow;
  }

  // Handle cache miss
  if (cachedError && cachedError.code !== "PGRST116") {
    // PGRST116 is "not found" error, which is expected if cache miss
    console.error(`[getWeatherRisk] Supabase query error: ${cachedError.message}`);
    throw new Error(`Supabase query failed: ${cachedError.message}`);
  }

  console.log('Cache Miss, fetching...');

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
  
  console.log(`[getWeatherRisk] Fetching historical data for ${WEATHER_HISTORICAL_YEARS} years: ${years.join(", ")}`);

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
      
      console.log(`[getWeatherRisk] Fetching year ${year}: ${startDate} to ${endDate} (centered around day ${targetDay})`);

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
      
      // Verify: rainDaysThisYear is calculated from the window data only
      // The precipitation array length matches the window size (~14 days)
      console.log(`[getWeatherRisk] Year ${year}: Window has ${precipitation.length} days, ${rainDaysThisYear} rain days (threshold: ${RAIN_THRESHOLD_MM}mm)`);

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
    
    console.log(`[getWeatherRisk] Saving row with ${historyData.length} history days (no projected_data)`);

    // Verify that all data is included in the insert object
    console.log(`[getWeatherRisk] Preparing to insert row for ${city}, month ${month}, target_year: ${newRow.target_year ?? "null"}`);
    console.log(`[getWeatherRisk] Insert object keys: ${Object.keys(newRow).join(", ")}`);
    console.log(`[getWeatherRisk] history_data length: ${historyData.length}`);
    console.log(`[getWeatherRisk] history_data in object: ${"history_data" in newRow ? "YES" : "NO"}`);
    console.log(`[getWeatherRisk] history_data value type: ${Array.isArray(newRow.history_data) ? "Array" : typeof newRow.history_data}`);
    console.log(`[getWeatherRisk] target_year in object: ${"target_year" in newRow ? "YES" : "NO"}`);
    console.log(`[getWeatherRisk] target_year value: ${newRow.target_year ?? "null"} (type: ${typeof newRow.target_year})`);
    
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
      console.error(`[getWeatherRisk] Full object:`, JSON.stringify(newRow, null, 2));
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

    console.log(`[getWeatherRisk] Successfully inserted weather data for ${city}, month ${month}, target_year: ${inserted?.target_year ?? "null"}`);
    console.log(`[getWeatherRisk] Inserted row ID: ${inserted?.id}`);
    console.log(`[getWeatherRisk] Inserted data:`, JSON.stringify(inserted, null, 2));
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

export async function getIndustryEvents(
  startDate: string,
  endDate: string,
  countryCode?: string,
): Promise<IndustryEventRow[]> {
  const supabase = await createSupabaseServerClient();

  try {
    console.log(`[getIndustryEvents] Querying events for date range: ${startDate} to ${endDate}, country: ${countryCode ?? "any"}`);
    
    // Build query with date overlap logic: (event_start <= input_end) AND (event_end >= input_start)
    let query = supabase
      .from("industry_events")
      .select("id, name, start_date, end_date, city, country_code, industry, audience_types, event_scale, risk_level, significance, description, url")
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    // Filter by country_code if provided (include 'Global' events if they exist)
    if (countryCode) {
      // Use .in() for safe array-based filtering instead of string interpolation
      query = query.in("country_code", [countryCode, "Global"]);
      console.log(`[getIndustryEvents] Filtering by country_code: ${countryCode} or Global`);
    }

    // Sort by risk_level (Critical first), then start_date
    query = query
      .order("risk_level", { ascending: false })
      .order("start_date", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error(`[getIndustryEvents] Supabase query error:`, error);
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    console.log(`[getIndustryEvents] Found ${data?.length ?? 0} events matching criteria`);
    if (data && data.length > 0) {
      console.log(`[getIndustryEvents] Sample events:`, data.slice(0, 3).map(e => ({ 
        name: e.name, 
        start: e.start_date, 
        end: e.end_date, 
        country: e.country_code,
        industry: e.industry,
        scale: e.event_scale
      })));
    }

    return (data ?? []) as IndustryEventRow[];
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";
    console.error(`[getIndustryEvents] Error:`, message);
    throw new Error(`Failed to fetch industry events: ${message}`);
  }
}

export async function testFrankfurtData(
  _prevState: FrankfurtTestResult | null,
  _formData: FormData,
): Promise<FrankfurtTestResult> {
  try {
    const city = "Frankfurt";
    const countryCode = "DE";
    const year = 2026;
    const month = 3; // March
    // Frankfurt coordinates
    const lat = 50.1109;
    const lon = 8.6821;

    // Call getHolidays and filter for March
    const allHolidays = await getHolidays(countryCode, year);
    const marchHolidays = allHolidays.filter((holiday) => {
      if (!holiday.date) return false;
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() + 1 === month; // getMonth() is 0-indexed
    });

    // Call getWeatherRisk
    const weather = await getWeatherRisk(city, month, lat, lon);
    
    if (!weather) {
      return {
        success: false,
        message: "Failed to fetch weather data for Frankfurt.",
      };
    }

    // Call getIndustryEvents for March 2026
    const industryEvents = await getIndustryEvents(
      "2026-03-01",
      "2026-03-31",
      countryCode,
    );

    return {
      success: true,
      message: "Successfully fetched all Frankfurt data for March 2026.",
      data: {
        holidays: marchHolidays,
        weather,
        industryEvents,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return {
      success: false,
      message: `Failed to fetch Frankfurt data: ${message}`,
    };
  }
}

// Helper function to get city coordinates
function getCityCoordinates(
  city: string | undefined,
  countryCode: string,
): { cityName: string; lat: number; lon: number } | null {
  // If city is provided, try to find it in CITY_COORDINATES
  if (city && city.trim()) {
    const cityKey = city.trim();
    const coordinates = CITY_COORDINATES[cityKey];
    if (coordinates) {
      return {
        cityName: cityKey,
        lat: coordinates.lat,
        lon: coordinates.lon,
      };
    }
  }

  // Fall back to default capital for the country
  const defaultCapital = DEFAULT_CAPITALS[countryCode];
  if (defaultCapital) {
    return {
      cityName: defaultCapital.name,
      lat: defaultCapital.lat,
      lon: defaultCapital.lon,
    };
  }

  return null;
}

export async function getStrategicAnalysis(
  formData: StrategicAnalysisFormData,
): Promise<StrategicAnalysisResult> {
  try {
    const {
      countryCode,
      city,
      targetStartDate,
      targetEndDate,
      industries = [],
      audiences = [],
      scales = [],
      lat: providedLat,
      lon: providedLon,
    } = formData;

    // Calculate extended date range: targetStartDate - 14 days to targetEndDate + 14 days
    const targetStart = parseISO(targetStartDate);
    const targetEnd = parseISO(targetEndDate);
    const analysisStart = subDays(targetStart, 14);
    const analysisEnd = addDays(targetEnd, 14);

    const analysisStartStr = format(analysisStart, "yyyy-MM-dd");
    const analysisEndStr = format(analysisEnd, "yyyy-MM-dd");

    // Get all years needed for holidays
    const startYear = analysisStart.getFullYear();
    const endYear = analysisEnd.getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i,
    );

    // Determine city coordinates - use provided lat/lon if available, otherwise look up
    const cityCoords =
      providedLat && providedLon
        ? { cityName: city || "Unknown", lat: providedLat, lon: providedLon }
        : getCityCoordinates(city, countryCode);

    // Fetch data in parallel
    const [holidaysResults, industryEvents, weatherData] = await Promise.all([
      // Fetch holidays for all years in parallel
      Promise.all(years.map((year) => getHolidays(countryCode, year))),
      // Fetch industry events for the analysis range
      getIndustryEvents(analysisStartStr, analysisEndStr, countryCode).then((events) => {
        console.log(`[getStrategicAnalysis] Fetched ${events.length} industry events for range ${analysisStartStr} to ${analysisEndStr}, country: ${countryCode}`);
        if (events.length > 0) {
          console.log(`[getStrategicAnalysis] Sample events:`, events.slice(0, 3).map(e => ({ name: e.name, start: e.start_date, end: e.end_date, country: e.country_code })));
        }
        return events;
      }),
      // Fetch weather for each month in the range (if city coordinates available)
      cityCoords
        ? (async () => {
            const months = new Set<number>();
            const dateRange = eachDayOfInterval({
              start: analysisStart,
              end: analysisEnd,
            });
            dateRange.forEach((date) => months.add(getMonth(date) + 1)); // getMonth is 0-indexed

            // Extract target year from targetStartDate
            const targetYear = targetStart.getFullYear();
            console.log(`[getStrategicAnalysis] Extracted targetYear: ${targetYear} from targetStartDate: ${targetStartDate}`);
            
            const weatherPromises = Array.from(months).map((month) => {
              // Always pass targetYear to getWeatherRisk (5th argument)
              // This ensures proper cache lookup and data saving
              console.log(`[getStrategicAnalysis] Calling getWeatherRisk for month ${month} with targetYear: ${targetYear}`);
              
              return getWeatherRisk(
                cityCoords.cityName,
                month,
                cityCoords.lat,
                cityCoords.lon,
                targetYear, // Always pass the targetYear from targetStartDate
                targetStartDate, // Pass targetStartDate for window centering
              ).catch((error) => {
                console.error(`[getStrategicAnalysis] Error fetching weather for month ${month}:`, error);
                return null;
              });
            });
            const weatherResults = await Promise.all(weatherPromises);
            return weatherResults.filter(
              (w): w is WeatherCacheRow => w !== null,
            );
          })()
        : Promise.resolve<WeatherCacheRow[]>([]),
    ]);

    // Flatten holidays array
    const allHolidays = holidaysResults.flat();

    // Filter holidays to the analysis date range
    const relevantHolidays = allHolidays.filter((holiday) => {
      if (!holiday.date) return false;
      const holidayDate = parseISO(holiday.date);
      return holidayDate >= analysisStart && holidayDate <= analysisEnd;
    });

    // Filter industry events by user selections
    let filteredEvents = industryEvents;
    console.log(`[getStrategicAnalysis] Starting with ${industryEvents.length} events before filtering`);
    console.log(`[getStrategicAnalysis] Filter criteria - industries: ${industries.length > 0 ? industries.join(", ") : "none"}, audiences: ${audiences.length > 0 ? audiences.join(", ") : "none"}, scales: ${scales.length > 0 ? scales.join(", ") : "none"}`);

    // Filter by industries (if any selected)
    if (industries.length > 0) {
      const beforeCount = filteredEvents.length;
      filteredEvents = filteredEvents.filter((event) => {
        if (!event.industry || event.industry.length === 0) return false;
        return event.industry.some((ind) => industries.includes(ind));
      });
      console.log(`[getStrategicAnalysis] After industry filter: ${filteredEvents.length} events (removed ${beforeCount - filteredEvents.length})`);
    }

    // Filter by audiences (if any selected)
    // If an event has no audience_types specified, include it (it's general/unspecified)
    // If user has selected all standard audiences, include all events (they want to see everything)
    const allStandardAudiences = ["Executives", "Analysts", "Developers", "Investors", "General"];
    const hasAllAudiencesSelected = audiences.length > 0 && 
      allStandardAudiences.every(aud => audiences.includes(aud));
    
    if (audiences.length > 0 && !hasAllAudiencesSelected) {
      const beforeCount = filteredEvents.length;
      filteredEvents = filteredEvents.filter((event) => {
        // If event has no audience types, include it (general/unspecified)
        if (!event.audience_types || event.audience_types.length === 0) {
          return true;
        }
        // Otherwise, check if any of the event's audiences match the selected ones
        return event.audience_types.some((aud) => audiences.includes(aud));
      });
      console.log(`[getStrategicAnalysis] After audience filter: ${filteredEvents.length} events (removed ${beforeCount - filteredEvents.length})`);
    } else if (hasAllAudiencesSelected) {
      console.log(`[getStrategicAnalysis] All standard audiences selected - including all events regardless of audience_types`);
    }

    // Filter by scales (if any selected)
    // Normalize scale values to handle format mismatches (e.g., "Medium (500-1000)" -> "Medium")
    if (scales.length > 0) {
      const beforeCount = filteredEvents.length;
      filteredEvents = filteredEvents.filter((event) => {
        if (!event.event_scale) return false;
        // Normalize the event scale: extract the base scale name (e.g., "Medium (500-1000)" -> "Medium")
        const normalizedEventScale = event.event_scale.split(' ')[0] as EventScale;
        // Check if the normalized scale matches any selected scale
        return scales.includes(normalizedEventScale);
      });
      console.log(`[getStrategicAnalysis] After scale filter: ${filteredEvents.length} events (removed ${beforeCount - filteredEvents.length})`);
    }

    console.log(`[getStrategicAnalysis] Final filtered events count: ${filteredEvents.length}`);

    // Group data by date (YYYY-MM-DD)
    const dateMap = new Map<string, DateAnalysis>();

    // Initialize all dates in the range
    const allDates = eachDayOfInterval({
      start: analysisStart,
      end: analysisEnd,
    });

    allDates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      dateMap.set(dateStr, {
        date: dateStr,
        holidays: [],
        industryEvents: [],
        weather: null,
      });
    });

    // Add holidays
    relevantHolidays.forEach((holiday) => {
      if (holiday.date) {
        const dateStr = format(parseISO(holiday.date), "yyyy-MM-dd");
        const analysis = dateMap.get(dateStr);
        if (analysis) {
          analysis.holidays.push(holiday);
        }
      }
    });

    // Add industry events (events can span multiple days)
    let eventsAddedToDates = 0;
    filteredEvents.forEach((event) => {
      const eventStart = parseISO(event.start_date);
      const eventEnd = parseISO(event.end_date);
      const eventDates = eachDayOfInterval({
        start: eventStart,
        end: eventEnd,
      });

      eventDates.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const analysis = dateMap.get(dateStr);
        if (analysis) {
          analysis.industryEvents.push(event);
          eventsAddedToDates++;
        }
      });
    });
    console.log(`[getStrategicAnalysis] Added ${eventsAddedToDates} event-date associations from ${filteredEvents.length} events`);

    // Add weather data (map by month)
    if (weatherData.length > 0) {
      const weatherByMonth = new Map<number, WeatherCacheRow>();
      weatherData.forEach((weather) => {
        weatherByMonth.set(weather.month, weather);
      });

      allDates.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const month = getMonth(date) + 1; // getMonth is 0-indexed
        const weather = weatherByMonth.get(month);
        const analysis = dateMap.get(dateStr);
        if (analysis && weather) {
          analysis.weather = weather;
        }
      });
    }

    // Count total events across all dates for debugging
    let totalEventDates = 0;
    dateMap.forEach((analysis) => {
      totalEventDates += analysis.industryEvents.length;
    });

    console.log(`[getStrategicAnalysis] Final result: ${dateMap.size} dates, ${totalEventDates} event-date associations`);
    
    return {
      success: true,
      message: "Strategic analysis completed successfully.",
      data: dateMap,
      startDate: analysisStartStr,
      endDate: analysisEndStr,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return {
      success: false,
      message: `Failed to perform strategic analysis: ${message}`,
    };
  }
}

export async function sendTestEmail(
  _prevState: EmailResult | null,
  _formData: FormData,
): Promise<EmailResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        message: "Missing RESEND_API_KEY environment variable.",
      };
    }

    const resend = new Resend(apiKey);

    try {
      const response = await resend.emails.send({
        from: "onboarding@resend.dev",
        to: "services@mergelabs.io",
        subject: "DateClash System Test",
        html: "<h1>It works!</h1><p>This is a test from your DateClash app.</p>",
      });

      return {
        success: true,
        message: "Email sent successfully!",
      };
    } catch (resendError) {
      const message =
        resendError instanceof Error
          ? resendError.message
          : "Unknown Resend error occurred.";

      return {
        success: false,
        message,
      };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return {
      success: false,
      message,
    };
  }
}

