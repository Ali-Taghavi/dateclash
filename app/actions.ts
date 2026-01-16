"use server";

import type {
  WeatherCacheRow,
  StrategicAnalysisResult,
  StrategicAnalysisFormData,
  DateAnalysis,
  EventScale,
  AnalysisMetadata,
} from "./types";
import { getHybridSchoolHolidays, getCoordinates, getHybridSupportedRegions } from "@/app/lib/api-clients";
import { getHolidays, getIndustryEvents, getUniqueIndustries } from "@/app/lib/services/events";
import { getWeatherRisk } from "@/app/lib/services/weather";

// Re-export for client use
export { getUniqueIndustries };
import { subDays, addDays, format, parseISO, eachDayOfInterval, getMonth } from "date-fns";




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
      subdivisionCode,
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

    // Determine city coordinates (for weather only, using Geocoding API)
    let cityCoords: { cityName: string; lat: number; lon: number } | null = null;

    if (providedLat && providedLon) {
      // Use explicitly provided coordinates
      cityCoords = { cityName: city || "Unknown", lat: providedLat, lon: providedLon };
    } else if (city && city.trim()) {
      // City was provided - use Geocoding API
      console.log(`[getStrategicAnalysis] Geocoding city: ${city} in country: ${countryCode}`);
      const geocodedCoords = await getCoordinates(city.trim(), countryCode);

      if (geocodedCoords) {
        console.log(`[getStrategicAnalysis] Geocoded ${city} to: ${geocodedCoords.cityName} (${geocodedCoords.lat}, ${geocodedCoords.lon})`);
        cityCoords = { cityName: geocodedCoords.cityName, lat: geocodedCoords.lat, lon: geocodedCoords.lon };
      } else {
        console.log(`[getStrategicAnalysis] Geocoding failed for ${city}. Weather data will be skipped.`);
      }
    } else {
      // No city provided - skip weather fetching
      console.log(`[getStrategicAnalysis] No city provided. Weather data will be skipped.`);
    }

    // Note: If cityCoords is null, we proceed without weather data (no error thrown)

    // Fetch school holidays for all years in the range (if subdivisionCode provided)
    const schoolHolidaysPromises = subdivisionCode
      ? years.map((year) => getHybridSchoolHolidays(countryCode, subdivisionCode, year))
      : [];
    const schoolHolidaysResults = schoolHolidaysPromises.length > 0
      ? await Promise.all(schoolHolidaysPromises)
      : [];
    const allSchoolHolidays = schoolHolidaysResults.flat();
    console.log(`[getStrategicAnalysis] Found ${allSchoolHolidays.length} school holiday ranges for subdivision: ${subdivisionCode || 'none'}`);

    // Fetch data in parallel
    const [holidaysResults, industryEventsResult, weatherData] = await Promise.all([
      // Fetch holidays for all years in parallel
      Promise.all(years.map((year) => getHolidays(countryCode, year))),
      // Fetch industry events for the analysis range
      getIndustryEvents(analysisStartStr, analysisEndStr, countryCode, industries, audiences, scales).then((result) => {
        console.log(`[getStrategicAnalysis] Fetched ${result.events.length} industry events for range ${analysisStartStr} to ${analysisEndStr}, country: ${countryCode} (total tracked: ${result.totalTracked})`);
        if (result.events.length > 0) {
          console.log(`[getStrategicAnalysis] Sample events:`, result.events.slice(0, 3).map(e => ({ name: e.name, start: e.start_date, end: e.end_date, country: e.country_code })));
        }
        return result;
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
              // console.log(`[getStrategicAnalysis] Calling getWeatherRisk for month ${month} with targetYear: ${targetYear}`);
              
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

    // Industry events are already filtered by the service (industries, audiences, scales)
    const filteredEvents = industryEventsResult.events;
    console.log(`[getStrategicAnalysis] Using ${filteredEvents.length} filtered events from service (total tracked: ${industryEventsResult.totalTracked})`);

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
        schoolHoliday: null,
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

    // Add school holidays (check if each date falls within any school holiday range)
    let schoolHolidayDatesAdded = 0;
    console.log(`[getStrategicAnalysis] Processing ${allSchoolHolidays.length} school holiday ranges`);
    
    if (allSchoolHolidays.length > 0) {
      console.log(`[getStrategicAnalysis] Sample school holidays:`, allSchoolHolidays.slice(0, 3).map(sh => ({
        name: sh.name,
        startDate: sh.startDate,
        endDate: sh.endDate,
      })));
    }

    allSchoolHolidays.forEach((schoolHoliday) => {
      try {
        const holidayStart = parseISO(schoolHoliday.startDate);
        const holidayEnd = parseISO(schoolHoliday.endDate);
        
        // Check if holiday range overlaps with analysis range
        if (holidayEnd < analysisStart || holidayStart > analysisEnd) {
          console.log(`[getStrategicAnalysis] School holiday '${schoolHoliday.name}' (${schoolHoliday.startDate} to ${schoolHoliday.endDate}) is outside analysis range (${analysisStartStr} to ${analysisEndStr})`);
          return;
        }

        const holidayDates = eachDayOfInterval({
          start: holidayStart,
          end: holidayEnd,
        });

        let datesInRange = 0;
        holidayDates.forEach((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const analysis = dateMap.get(dateStr);
          if (analysis) {
            // Only set if not already set (in case of overlapping holidays, use the first one found)
            if (!analysis.schoolHoliday) {
              analysis.schoolHoliday = schoolHoliday.name;
              schoolHolidayDatesAdded++;
              datesInRange++;
            }
          }
        });
        console.log(`[getStrategicAnalysis] Mapped school holiday '${schoolHoliday.name}' (${schoolHoliday.startDate} to ${schoolHoliday.endDate}) to ${datesInRange} dates within analysis range (total ${holidayDates.length} dates in holiday)`);
      } catch (error) {
        console.error(`[getStrategicAnalysis] Error processing school holiday ${schoolHoliday.name}:`, error);
        if (error instanceof Error) {
          console.error(`[getStrategicAnalysis] Error details:`, error.message, error.stack);
        }
      }
    });
    console.log(`[getStrategicAnalysis] Added school holiday information to ${schoolHolidayDatesAdded} date entries out of ${dateMap.size} total dates`);

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
    
    // Calculate confidence level for industry events
    const totalTracked = industryEventsResult.totalTracked;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';
    if (totalTracked === 0) {
      confidence = 'NONE';
    } else if (totalTracked < 10) {
      confidence = 'LOW';
    } else if (totalTracked < 50) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'HIGH';
    }

    // Count unique school holiday dates
    const schoolHolidayDates = new Set<string>();
    allSchoolHolidays.forEach((holiday) => {
      try {
        const holidayStart = parseISO(holiday.startDate);
        const holidayEnd = parseISO(holiday.endDate);
        const holidayDates = eachDayOfInterval({
          start: holidayStart,
          end: holidayEnd,
        });
        holidayDates.forEach((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          if (date >= analysisStart && date <= analysisEnd) {
            schoolHolidayDates.add(dateStr);
          }
        });
      } catch (error) {
        // Skip invalid dates
      }
    });

    // Get region verification info if subdivisionCode is provided
    let regionInfo: { regionName: string | null; regionCode: string | null; isVerified?: boolean; sourceUrl?: string | null } = {
      regionName: null,
      regionCode: null,
    };
    
    if (subdivisionCode) {
      try {
        const allRegions = await getHybridSupportedRegions(countryCode);
        const selectedRegion = allRegions.find((r) => r.code === subdivisionCode);
        if (selectedRegion) {
          regionInfo = {
            regionName: selectedRegion.name,
            regionCode: selectedRegion.code,
            isVerified: selectedRegion.isVerified || selectedRegion.source === 'manual',
            sourceUrl: selectedRegion.sourceUrl || null,
          };
        }
      } catch (error) {
        console.error(`[getStrategicAnalysis] Error fetching region info:`, error);
      }
    }

    // Build metadata
    const metadata: AnalysisMetadata = {
      weather: {
        available: cityCoords !== null && weatherData.length > 0,
        city: cityCoords?.cityName || null,
      },
      publicHolidays: {
        count: relevantHolidays.length,
        countryCode,
      },
      schoolHolidays: {
        checked: subdivisionCode !== undefined && subdivisionCode !== null && subdivisionCode !== '',
        regionName: regionInfo.regionName || subdivisionCode || null,
        regionCode: regionInfo.regionCode || subdivisionCode || null,
        count: schoolHolidayDates.size,
        isVerified: regionInfo.isVerified,
        sourceUrl: regionInfo.sourceUrl,
      },
      industryEvents: {
        matchCount: filteredEvents.length,
        totalTracked,
        confidence,
      },
    };
    
    return {
      success: true,
      message: "Strategic analysis completed successfully.",
      data: dateMap,
      startDate: analysisStartStr,
      endDate: analysisEndStr,
      metadata,
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


