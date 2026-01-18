"use server";

import { createClient } from "@supabase/supabase-js";
import type { Country, Region } from "@/app/types";

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
 * Fetches supported countries for the main and watchlist selectors.
 */
export async function getSupportedCountries(): Promise<Country[]> {
  try {
    const apiKey = process.env.CALENDARIFIC_API_KEY;
    const url = `https://calendarific.com/api/v2/countries?api_key=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 86400 } });
    const json = await response.json();
    return json.response?.countries ?? [];
  } catch (error) {
    console.error("Calendarific Fetch Error:", error);
    return [];
  }
}

/**
 * Fetches Public Holidays for a specific year.
 * FIX: Now accepts year parameter to prevent 2025/2026 data mismatches.
 */
export async function getPublicHolidays(countryCode: string, year: number = 2025) {
  try {
    const url = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=${countryCode}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data as any[]).map(h => ({
      name: h.name?.[0]?.text || h.name?.text || "Public Holiday",
      date: h.startDate,
    }));
  } catch (error) {
    console.error("Public Holiday Fetch Error:", error);
    return [];
  }
}

/**
 * Fetches regions from both Supabase (Manual) and OpenHolidays (API).
 */
export async function getHybridSupportedRegions(countryCode: string): Promise<Region[]> {
  const regions = new Map<string, Region>();
  try {
    const supabase = createSupabaseServiceClient();
    const { data: manualRegions } = await supabase
      .from('manual_school_holidays')
      .select('region_name, region_id, source_url')
      .eq('country_code', countryCode);

    manualRegions?.forEach(row => {
      if (!regions.has(row.region_id)) {
        regions.set(row.region_id, {
          id: row.region_id,
          code: row.region_id,
          name: row.region_name,
          source: 'manual',
          sourceUrl: row.source_url || undefined,
          isVerified: true
        });
      }
    });

    const apiUrl = `https://openholidaysapi.org/Subdivisions?countryIsoCode=${countryCode}&languageIsoCode=EN`;
    const apiRes = await fetch(apiUrl);
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      apiData.forEach((sub: any) => {
        const code = sub.code || sub.isoCode;
        if (!regions.has(code)) {
          regions.set(code, {
            id: code,
            code: code,
            name: sub.name?.[0]?.text || sub.name?.text || code,
            source: 'api',
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
 * Fetches School Holidays with priority for verified Manual data.
 */
export async function getHybridSchoolHolidays(
  countryCode: string,
  subdivisionCode: string,
  year: number,
) {
  try {
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
        sourceUrl: h.source_url,
        isVerified: true
      }));
    }

    const url = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${countryCode}&subdivisionCode=${subdivisionCode}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
    const res = await fetch(url);
    const apiData = await res.json();
    return (apiData as any[]).map(h => ({
       name: h.name?.[0]?.text || h.name?.text || "School Holiday",
       startDate: h.startDate,
       endDate: h.endDate,
       isVerified: false
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Geocoding for target destination weather lookup.
 */
export async function getCoordinates(city: string, countryCode: string) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&country_code=${countryCode}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = await response.json();
    const result = json.results?.[0];
    return result ? { cityName: result.name, lat: result.latitude, lon: result.longitude } : null;
  } catch {
    return null;
  }
}