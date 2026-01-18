"use server";

import { format, parseISO, eachDayOfInterval, getMonth, isValid } from "date-fns";
import type {
  WeatherCacheRow,
  StrategicAnalysisResult,
  StrategicAnalysisFormData,
  DateAnalysis,
  AnalysisMetadata,
} from "./types";
import { 
  getHybridSchoolHolidays, 
  getCoordinates, 
  getHybridSupportedRegions 
} from "@/app/lib/api-clients";
import { getHolidays, getIndustryEvents, getUniqueIndustries } from "@/app/lib/services/events";
import { getWeatherRisk } from "@/app/lib/services/weather";
import { getGlobalImpact } from "@/app/lib/cultural-impacts";

export { getUniqueIndustries };

/**
 * ⚡️ LIGHTWEIGHT ACTION: Live Preview Ribbon
 */
export async function getIndustryPreviews(
  countryCode: string,
  filters: { industries: string[]; audiences: string[]; scales: string[] }
) {
  try {
    const { industries, audiences, scales } = filters;
    if (!industries.length && !audiences.length && !scales.length) return [];

    const startStr = "2026-01-01";
    const endStr = "2026-12-31";

    const result = await getIndustryEvents(
      startStr, endStr, countryCode, industries, audiences, scales as any 
    );

    return result.events.slice(0, 8).map(e => ({
      name: e.name,
      url: e.url,
      city: e.city
    }));
  } catch (error) {
    console.error("Preview fetch failed:", error);
    return []; 
  }
}

/**
 * 🚀 MAIN ACTION: Strategic Analysis
 */
export async function getStrategicAnalysis(
  formData: StrategicAnalysisFormData,
): Promise<StrategicAnalysisResult> {
  try {
    const {
      countryCode, city, targetStartDate, targetEndDate,
      industries = [], audiences = [], scales = [], radarCountries = [], 
      lat: providedLat, lon: providedLon, subdivisionCode,
    } = formData;

    const targetStart = parseISO(targetStartDate);
    const targetEnd = parseISO(targetEndDate);
    
    if (!isValid(targetStart) || !isValid(targetEnd)) {
      throw new Error("Invalid date range provided.");
    }

    const analysisStartStr = targetStartDate;
    const analysisEndStr = targetEndDate;
    const years = Array.from(new Set([targetStart.getFullYear(), targetEnd.getFullYear()]));

    let cityCoords: { cityName: string; lat: number; lon: number } | null = null;
    if (providedLat && providedLon) {
      // Clean city name (e.g., "London, UK" -> "London")
      const cleanName = city?.split(',')[0].trim() || "Selected Location";
      cityCoords = { cityName: cleanName, lat: providedLat, lon: providedLon };
    } else if (city?.trim()) {
      const geocoded = await getCoordinates(city.trim(), countryCode);
      if (geocoded) {
        // Use clean name from geocoder
        cityCoords = { cityName: geocoded.cityName.split(',')[0].trim(), lat: geocoded.lat, lon: geocoded.lon };
      }
    }

    // 3. Fetch Data in Parallel + Global Proxy Fetch (IL, AE, CN)
    const [
        holidaysResults, 
        industryEventsResult, 
        radarEventsResult, 
        schoolHolidaysResults, 
        weatherData,
        culturalProxyHolidays 
    ] = await Promise.all([
      Promise.all(years.map(year => getHolidays(countryCode, year))),
      getIndustryEvents(analysisStartStr, analysisEndStr, countryCode, industries, audiences, scales as any),
      radarCountries.length > 0 
        ? Promise.all(radarCountries.map(code => 
            getIndustryEvents(analysisStartStr, analysisEndStr, code, industries, audiences, scales as any)
            .catch(() => ({ events: [] }))
          )).then(results => results.flatMap(r => r.events))
        : Promise.resolve([]),
      subdivisionCode 
        ? Promise.all(years.map(year => getHybridSchoolHolidays(countryCode, subdivisionCode, year)))
        : Promise.resolve([]),
      cityCoords 
        ? (async () => {
            const months = new Set<number>();
            eachDayOfInterval({ start: targetStart, end: targetEnd }).forEach(date => months.add(getMonth(date) + 1));
            
            const weatherPromises = Array.from(months).map(async (month) => {
              try {
                // ROBUST FETCH: Handles uncached cities on-the-fly
                const res = await getWeatherRisk(
                  cityCoords!.cityName, 
                  month, 
                  cityCoords!.lat, 
                  cityCoords!.lon, 
                  targetStart.getFullYear(), 
                  targetStartDate
                );
                return res;
              } catch (err) {
                console.error(`Weather fetch failed for month ${month}:`, err);
                return null;
              }
            });
            
            const results = await Promise.all(weatherPromises);
            return results.filter((w): w is WeatherCacheRow => w !== null);
          })()
        : Promise.resolve([]),
      // Background fetch for Jewish, Muslim, and APAC calendars
      Promise.all([
        ...years.map(y => getHolidays("IL", y).catch(() => [])),
        ...years.map(y => getHolidays("AE", y).catch(() => [])),
        ...years.map(y => getHolidays("CN", y).catch(() => [])),
      ]).then(res => res.flat())
    ]);

    const dateMap = new Map<string, DateAnalysis>();
    eachDayOfInterval({ start: targetStart, end: targetEnd }).forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      dateMap.set(dateStr, {
        date: dateStr,
        holidays: [],
        industryEvents: [],
        weather: null,
        schoolHoliday: null,
      });
    });

    // Map data to dates (Keep all your existing mapping logic)
    const allPublicHolidays = [...holidaysResults.flat(), ...culturalProxyHolidays];
    allPublicHolidays.forEach((holiday) => {
      if (!holiday.date) return;
      const entry = dateMap.get(holiday.date);
      if (entry) {
        const isDuplicate = entry.holidays.some(h => h.name === holiday.name);
        if (!isDuplicate) entry.holidays.push(holiday);
      }
    });

    const mapEvents = (events: any[], isRadar: boolean) => {
      events.forEach((event) => {
        const eventStart = parseISO(event.start_date);
        const eventEnd = parseISO(event.end_date);
        if (!isValid(eventStart) || !isValid(eventEnd)) return;
        const clampedStart = eventStart < targetStart ? targetStart : eventStart;
        const clampedEnd = eventEnd > targetEnd ? targetEnd : eventEnd;
        if (clampedStart <= clampedEnd) {
          eachDayOfInterval({ start: clampedStart, end: clampedEnd }).forEach((date) => {
            const entry = dateMap.get(format(date, "yyyy-MM-dd"));
            if (entry) entry.industryEvents.push({ ...event, isRadarEvent: isRadar });
          });
        }
      });
    };
    mapEvents(industryEventsResult.events, false);
    mapEvents(radarEventsResult, true);

    schoolHolidaysResults.flat().forEach((sh) => {
      const holidayStart = parseISO(sh.startDate);
      const holidayEnd = parseISO(sh.endDate);
      if (!isValid(holidayStart) || !isValid(holidayEnd)) return;
      const clampedStart = holidayStart < targetStart ? targetStart : holidayStart;
      const clampedEnd = holidayEnd > targetEnd ? targetEnd : holidayEnd;
      if (clampedStart <= clampedEnd) {
        eachDayOfInterval({ start: clampedStart, end: clampedEnd }).forEach((date) => {
          const entry = dateMap.get(format(date, "yyyy-MM-dd"));
          if (entry && !entry.schoolHoliday) entry.schoolHoliday = sh.name;
        });
      }
    });

    if (weatherData.length > 0) {
      const weatherByMonth = new Map(weatherData.map(w => [w.month, w]));
      dateMap.forEach((entry, dateStr) => {
        const dateObj = parseISO(dateStr);
        const monthWeather = weatherByMonth.get(getMonth(dateObj) + 1);
        if (monthWeather) entry.weather = monthWeather;
      });
    }

    const totalTracked = industryEventsResult.totalTracked;
    const confidence = totalTracked >= 50 ? 'HIGH' : totalTracked >= 10 ? 'MEDIUM' : totalTracked > 0 ? 'LOW' : 'NONE';
    
    let regionInfo = { name: subdivisionCode || null, isVerified: false, url: null as string | null };
    if (subdivisionCode) {
      const allRegions = await getHybridSupportedRegions(countryCode);
      const match = allRegions.find(r => r.code === subdivisionCode);
      if (match) regionInfo = { name: match.name, isVerified: !!match.isVerified, url: match.sourceUrl || null };
    }

    const metadata: AnalysisMetadata = {
      weather: { available: !!cityCoords && weatherData.length > 0, city: cityCoords?.cityName || null },
      publicHolidays: { count: holidaysResults.flat().length, countryCode },
      schoolHolidays: {
        checked: !!subdivisionCode,
        regionName: regionInfo.name,
        regionCode: subdivisionCode || null,
        count: Array.from(dateMap.values()).filter(d => !!d.schoolHoliday).length,
        isVerified: regionInfo.isVerified,
        sourceUrl: regionInfo.url,
      },
      industryEvents: { 
        matchCount: industryEventsResult.events.length + radarEventsResult.length, 
        totalTracked, 
        confidence 
      },
    };

    return {
      success: true,
      message: "Strategic analysis completed.",
      data: dateMap,
      startDate: analysisStartStr,
      endDate: analysisEndStr,
      metadata,
    };
  } catch (error) {
    console.error("Analysis Error:", error);
    return { success: false, message: error instanceof Error ? error.message : "Analysis failed" };
  }
}