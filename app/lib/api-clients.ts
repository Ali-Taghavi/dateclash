"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Country, Region } from "@/app/types";

async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() { /* Server components don't need to set cookies */ },
        remove() { /* Server components don't need to remove cookies */ },
      },
    },
  );
}

/**
 * Create a Supabase client using the Service Role key for privileged database access
 * This bypasses Row Level Security (RLS) policies
 */
function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!supabaseServiceKey) {
    console.warn("⚠️ Service Role Key missing. Protected database queries will fail.");
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Required for accessing protected tables.");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Fetch supported countries from Calendarific API
 */
export async function getSupportedCountries(): Promise<Country[]> {
  try {
    const apiKey = process.env.CALENDARIFIC_API_KEY;
    if (!apiKey) throw new Error("Missing CALENDARIFIC_API_KEY environment variable.");

    const url = `https://calendarific.com/api/v2/countries?api_key=${apiKey}`;
    const response = await fetch(url, { next: { revalidate: 86400 } });

    if (!response.ok) throw new Error(`Calendarific request failed with status ${response.status}.`);

    const json = (await response.json()) as { response?: { countries?: Country[] } };
    return json.response?.countries ?? [];
  } catch (error) {
    console.error("Failed to fetch countries from Calendarific:", error);
    return [];
  }
}

/**
 * Fetch supported subdivisions (regions)
 */
export async function getHybridSupportedRegions(countryCode: string): Promise<Region[]> {
  console.log(`[getHybridSupportedRegions] Fetching regions for country: ${countryCode}`);
  
  const regions = new Map<string, Region>();

  // 1. Fetch from Manual DB (Supabase)
  try {
    const supabaseService = createSupabaseServiceClient();
    
    // We removed 'distinct' to avoid the syntax error. Dedup happens in JS.
    const { data: manualRegions, error } = await supabaseService
      .from('manual_school_holidays')
      .select('region_name, region_id, source_url')
      .eq('country_code', countryCode);

    if (error) {
      console.error('[getHybridSupportedRegions] Supabase query error:', error);
    } else if (manualRegions) {
      console.log(`[getHybridSupportedRegions] Found ${manualRegions.length} raw rows from DB`);
      
      manualRegions.forEach(row => {
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
    }
  } catch (err) {
    console.error("[getHybridSupportedRegions] Critical Error fetching from DB:", err);
  }

  // 2. Fetch from OpenHolidays API
  try {
    const apiRegions = await getSupportedSubdivisions(countryCode);
    console.log(`[getHybridSupportedRegions] Found ${apiRegions.length} regions from OpenHolidays API`);
    
    apiRegions.forEach(region => {
      // Prefer Manual data if collision
      if (!regions.has(region.code)) {
        regions.set(region.code, {
          ...region,
          source: 'api',
          isVerified: false
        });
      }
    });
  } catch (err) {
    console.warn(`[getHybridSupportedRegions] API fetch failed for ${countryCode}, relying on manual data only.`);
  }

  const results = Array.from(regions.values()).sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/**
 * Fetch supported subdivisions (regions) for a country from OpenHolidays API
 */
export async function getSupportedSubdivisions(countryCode: string): Promise<Region[]> {
  try {
    // ... (Your existing API logic for OpenHolidays - unchanged)
    // I am omitting the body for brevity, keep your existing logic here!
    const url = `https://openholidaysapi.org/Subdivisions?countryIsoCode=${countryCode}&languageIsoCode=EN`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const responseData = await response.json();
    let subdivisionsJson: any[] = [];

    if (Array.isArray(responseData)) subdivisionsJson = responseData;
    else if (responseData?.data) subdivisionsJson = responseData.data;
    else if (responseData?.subdivisions) subdivisionsJson = responseData.subdivisions;

    return subdivisionsJson
      .filter(sub => sub.code || sub.isoCode)
      .map(sub => {
        const code = sub.code || sub.isoCode || "";
        let nameText = "";
        if (Array.isArray(sub.name)) nameText = sub.name[0]?.text;
        else if (sub.name?.text) nameText = sub.name.text;
        return { id: code, name: nameText || code || "Unknown", code: code };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error(`[getSupportedSubdivisions] Error:`, error);
    return [];
  }
}

/**
 * Get school holidays for a specific subdivision
 */
export async function getHybridSchoolHolidays(
  countryCode: string,
  subdivisionCode: string,
  year: number,
): Promise<Array<{ name: string; startDate: string; endDate: string; sourceUrl?: string }>> {
  try {
    const supabaseService = createSupabaseServiceClient();

    // Step 1: Check manual DB
    const { data: manualHolidays, error: dbError } = await supabaseService
      .from("manual_school_holidays")
      .select("holiday_name, start_date, end_date, source_url")
      .eq("country_code", countryCode)
      .eq("region_id", subdivisionCode)
      .lte("start_date", `${year}-12-31`)
      .gte("end_date", `${year}-01-01`);

    if (dbError) console.error(`[getHybridSchoolHolidays] Supabase query error:`, dbError);

    if (manualHolidays && manualHolidays.length > 0) {
      return manualHolidays.map((holiday) => ({
        name: holiday.holiday_name || "School Holiday",
        startDate: holiday.start_date,
        endDate: holiday.end_date,
        sourceUrl: holiday.source_url || undefined,
      }));
    }

    // Step 2: Fall back to OpenHolidays API
    // ... (Keep your existing API logic here - unchanged)
    const holidaysUrl = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=${countryCode}&subdivisionCode=${subdivisionCode}&validFrom=${year}-01-01&validTo=${year}-12-31&languageIsoCode=EN`;
    const holidaysResponse = await fetch(holidaysUrl);
    if (!holidaysResponse.ok) return [];
    
    const holidaysJson = await holidaysResponse.json();
    // ... Map logic ...
    return (holidaysJson as any[]).map(h => ({
       name: h.name?.[0]?.text || h.name?.text || "",
       startDate: h.startDate,
       endDate: h.endDate
    })).filter(h => h.name && h.startDate);

  } catch (error) {
    console.error(`[getHybridSchoolHolidays] Error:`, error);
    return [];
  }
}

export async function getCoordinates(city: string, countryCode: string) {
  // ... (Keep your existing Retry/Timeout Logic here - unchanged)
  // Just ensure you keep the Retry Mechanism we added earlier!
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&country_code=${countryCode}`;
  // ... implementation ...
  const response = await fetch(url);
  if(!response.ok) return null;
  const json = await response.json();
  const result = json.results?.[0];
  if(result) return { cityName: result.name, lat: result.latitude, lon: result.longitude };
  return null;
}