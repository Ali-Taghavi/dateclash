"use server";

import { subDays, addDays, format, parseISO, eachDayOfInterval, getMonth } from "date-fns";
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

// Re-export for client-side usage in filters
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

    if (industries.length === 0 && audiences.length === 0 && scales.length === 0) {
      return [];
    }

    const startStr = "2026-01-01";
    const endStr = "2026-12-31";

    const result = await getIndustryEvents(
      startStr, 
      endStr, 
      countryCode, 
      industries, 
      audiences, 
      scales as any 
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
      countryCode,
      city,
      targetStartDate,
      targetEndDate,
      industries = [],
      audiences = [],
      scales = [],
      radarCountries = [], 
      lat: providedLat,
      lon: providedLon,
      subdivisionCode,
    } = formData;

    // 1. Setup Analysis Range 
    const targetStart = parseISO(targetStartDate);
    const targetEnd = parseISO(targetEndDate);
    const analysisStart = subDays(targetStart, 14);
    const analysisEnd = addDays(targetEnd, 14);

    const analysisStartStr = format(analysisStart, "yyyy-MM-dd");
    const analysisEndStr = format(analysisEnd, "yyyy-MM-dd");
    
    const years = Array.from(new Set([analysisStart.getFullYear(), analysisEnd.getFullYear()]));

    // 2. Determine Coordinates 
    let cityCoords: { cityName: string; lat: number; lon: number } | null = null;
    
    if (providedLat && providedLon) {
      cityCoords = { cityName: city || "Selected Location", lat: providedLat, lon: providedLon };
    } else if (city?.trim()) {
      const geocoded = await getCoordinates(city.trim(), countryCode);
      if (geocoded) {
        cityCoords = { cityName: geocoded.cityName, lat: geocoded.lat, lon: geocoded.lon };
      }
    }

    // 3. Fetch Data in Parallel 
    const [
        holidaysResults, 
        industryEventsResult, 
        radarEventsResult, 
        schoolHolidaysResults, 
        weatherData
    ] = await Promise.all([
      Promise.all(years.map((year) => getHolidays(countryCode, year))),
      
      getIndustryEvents(
        analysisStartStr, 
        analysisEndStr, 
        countryCode, 
        industries, 
        audiences, 
        scales as any 
      ),

      radarCountries.length > 0 
        ? Promise.all(radarCountries.map(code => 
            getIndustryEvents(
              analysisStartStr, 
              analysisEndStr, 
              code, 
              industries, 
              audiences, 
              scales as any 
            )
          )).then(results => results.flatMap(r => r.events))
        : Promise.resolve([]),
      
      subdivisionCode 
        ? Promise.all(years.map((year) => getHybridSchoolHolidays(countryCode, subdivisionCode, year)))
        : Promise.resolve([]),

      cityCoords 
        ? (async () => {
            const months = new Set<number>();
            eachDayOfInterval({ start: analysisStart, end: analysisEnd })
              .forEach((date) => months.add(getMonth(date) + 1));

            const weatherPromises = Array.from(months).map((month) => 
              getWeatherRisk(cityCoords!.cityName, month, cityCoords!.lat, cityCoords!.lon, targetStart.getFullYear(), targetStartDate)
                .catch(() => null) 
            );
            const results = await Promise.all(weatherPromises);
            return results.filter((w): w is WeatherCacheRow => w !== null);
          })()
        : Promise.resolve([])
    ]);

    // 4. Initialize Data Structure
    const dateMap = new Map<string, DateAnalysis>();
    const allDates = eachDayOfInterval({ start: analysisStart, end: analysisEnd });

    allDates.forEach((date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      dateMap.set(dateStr, {
        date: dateStr,
        holidays: [],
        industryEvents: [],
        weather: null,
        schoolHoliday: null,
      });
    });

    // 5. Map Public Holidays
    holidaysResults.flat().forEach((holiday) => {
      if (!holiday.date) return;
      const hDate = parseISO(holiday.date);
      if (hDate >= analysisStart && hDate <= analysisEnd) {
        const entry = dateMap.get(holiday.date);
        if (entry) entry.holidays.push(holiday);
      }
    });

    // 6. Map Industry Events 
    const mapEvents = (events: any[], isRadar: boolean) => {
      events.forEach((event) => {
        eachDayOfInterval({ start: parseISO(event.start_date), end: parseISO(event.end_date) })
          .forEach((date) => {
            const entry = dateMap.get(format(date, "yyyy-MM-dd"));
            if (entry) {
              entry.industryEvents.push({
                ...event,
                isRadarEvent: isRadar 
              });
            }
          });
      });
    };

    mapEvents(industryEventsResult.events, false);
    mapEvents(radarEventsResult, true);

    // 7. Map School Holidays
    const allSchoolHolidays = schoolHolidaysResults.flat();
    allSchoolHolidays.forEach((sh) => {
      eachDayOfInterval({ start: parseISO(sh.startDate), end: parseISO(sh.endDate) })
        .forEach((date) => {
          const entry = dateMap.get(format(date, "yyyy-MM-dd"));
          if (entry && !entry.schoolHoliday) {
             entry.schoolHoliday = sh.name;
          }
        });
    });

    // 8. Map Weather Data
    if (weatherData && weatherData.length > 0) {
      const weatherByMonth = new Map(weatherData.map(w => [w.month, w]));
      allDates.forEach((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const entry = dateMap.get(dateStr);
        const monthWeather = weatherByMonth.get(getMonth(date) + 1);
        
        if (entry && monthWeather) {
          entry.weather = monthWeather;
        }
      });
    }

    // 9. Build Metadata 
    const totalTracked = industryEventsResult.totalTracked;
    const confidence = totalTracked >= 50 ? 'HIGH' : totalTracked >= 10 ? 'MEDIUM' : totalTracked > 0 ? 'LOW' : 'NONE';
    
    // FIXED: Explicitly typed 'regionInfo' so 'name' can be string or null
    let regionInfo: { name: string | null; isVerified: boolean; url: string | null } = { 
      name: null, 
      isVerified: false, 
      url: null 
    };
    
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
        regionName: regionInfo.name || subdivisionCode || null,
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
    return { success: false, message: error instanceof Error ? error.message : "Analysis failed" };
  }
}