"use server";

import { createClient } from "@supabase/supabase-js";
import type { Country, Region, PublicHolidayRow, SchoolHolidayRow } from "@/app/types";

/**
 * Service Role Client: Bypasses RLS for administrative data fetching.
 */
function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase Service Role configuration.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Fetches supported countries.
 * Uses Calendarific API (Restored from your original file).
 */
export async function getSupportedCountries(): Promise<Country[]> {
  try {
    const apiKey = process.env.CALENDARIFIC_API_KEY;
    // Fallback if key is missing to prevent crash
    if (!apiKey) return [];
    
    const url = `https://calendarific.com/api/v2/countries?api_key=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 86400 } });
    const json = await response.json();
    
    // Map to our new Country interface
    return (json.response?.countries ?? []).map((c: any) => ({
      "iso-3166": c["iso-3166"],
      country_name: c.country_name
    }));
  } catch (error) {
    console.error("Calendarific Fetch Error:", error);
    return [];
  }
}

/**
 * Fetches Public Holidays.
 * Uses OpenHolidaysAPI (Restored from your original file).
 */
export async function getPublicHolidays(countryCode: string, year: number = 2026): Promise<PublicHolidayRow[]> {
  try {
    const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${countryCode}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    
    return (data as any[]).map(h => ({
      date: h.startDate,
      name: h.name?.[0]?.text || h.name?.text || "Public Holiday",
      localName: h.name?.[1]?.text || "",
      countryCode: countryCode
    }));
  } catch (error) {
    console.error("Public Holiday Fetch Error:", error);
    return [];
  }
}

/**
 * Fetches regions (Hybrid: Supabase + OpenHolidays).
 * FIXED: Returns objects strictly matching the new Region interface (no 'id').
 */
export async function getHybridSupportedRegions(countryCode: string): Promise<Region[]> {
  const regions = new Map<string, Region>();
  
  try {
    // 1. Fetch Manual Overrides from Supabase
    const supabase = createSupabaseServiceClient();
    const { data: manualRegions } = await supabase
      .from('manual_school_holidays')
      .select('region_name, region_id, source_url')
      .eq('country_code', countryCode);

    manualRegions?.forEach(row => {
      // Use region_id as the code
      if (!regions.has(row.region_id)) {
        regions.set(row.region_id, {
          code: row.region_id,
          name: row.region_name,
          sourceUrl: row.source_url || undefined,
          isVerified: true
        });
      }
    });

    // 2. Fetch API Regions
    const apiUrl = `https://openholidaysapi.org/Subdivisions?countryIsoCode=${countryCode}&languageIsoCode=EN`;
    const apiRes = await fetch(apiUrl);
    
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      apiData.forEach((sub: any) => {
        const code = sub.code || sub.isoCode;
        // Only add if not already present (Manual data takes precedence)
        if (!regions.has(code)) {
          regions.set(code, {
            code: code,
            name: sub.name?.[0]?.text || sub.name?.text || code,
            isVerified: false
          });
        }
      });
    }
  } catch (err) {
    console.error("Region Fetch Error:", err);
  }
  
  return Array.from(regions.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetches School Holidays (Hybrid).
 */
export async function getHybridSchoolHolidays(
  countryCode: string,
  subdivisionCode: string,
  year: number,
): Promise<SchoolHolidayRow[]> {
  try {
    // 1. Try Manual Data first
    const supabase = createSupabaseServiceClient();
    const { data: manual } = await supabase
      .from("manual_school_holidays")
      .select("holiday_name, start_date, end_date, source_url")
      .eq("country_code", countryCode)
      .eq("region_id", subdivisionCode)
      .lte("start_date", `${year}-12-31`)
      .gte("end_date", `${year}-01-01`);

    if (manual && manual.length > 0) {
      return manual.map(h => ({
        name: h.holiday_name || "School Holiday",
        startDate: h.start_date,
        endDate: h.end_date,
        region: subdivisionCode
      }));
    }

    // 2. Fallback to API
    const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${countryCode}&subdivisionCode=${subdivisionCode}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
    const res = await fetch(url);
    const apiData = await res.json();
    
    return (apiData as any[]).map(h => ({
       name: h.name?.[0]?.text || h.name?.text || "School Holiday",
       startDate: h.startDate,
       endDate: h.endDate,
       region: subdivisionCode
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Geocoding (Open-Meteo).
 */
export async function getCoordinates(city: string, countryCode: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    
    if (json.results && json.results.length > 0) {
      const match = json.results[0];
      // Basic country check
      if (match.country_code?.toUpperCase() === countryCode.toUpperCase()) {
         return { cityName: match.name, lat: match.latitude, lon: match.longitude };
      }
    }
    return null;
  } catch {
    return null;
  }
}