// NEW: Added missing interface for Weather Accordion
export interface WeatherHistoryDay {
  date: string;
  avg_temp_c: number;
  min_temp_c: number;
  max_temp_c: number;
  condition: string;
  sunrise: string;
  sunset: string;
  // Optional fallbacks for different data providers
  temp_c?: number; 
}

export interface WeatherCacheRow {
  id: number;
  city: string;
  month: number;
  lat: number;
  lon: number;
  avg_temp_high_c: number | null;
  avg_temp_low_c: number | null;
  rain_days_count: number | null;
  history_data: WeatherHistoryDay[]; 
  last_updated?: string;
}

export interface IndustryEventRow {
  id: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  city: string;
  country_code: string;
  
  // FIXED: Aligned with Database Schema & User's events.ts
  industry: string[];       // Array from DB
  audience_types: string[]; // Array from DB
  
  // Compatibility field (derived from industry[0])
  category: string; 
  
  url: string;
  description?: string;
  significance?: string; 
  event_scale?: string;  
  risk_level?: string;   
  isRadarEvent?: boolean; 
}

export interface PublicHolidayRow {
  date: string;
  name: string;
  localName?: string;
  countryCode?: string;
}

// Alias for legacy 'HolidayRow' usage
export type HolidayRow = PublicHolidayRow;

export type IndustryType = string;
export type EventScale = string;

export interface SchoolHolidayRow {
  startDate: string;
  endDate: string;
  name: string;
  region: string;
}

export interface DateAnalysis {
  date: string;
  holidays: PublicHolidayRow[];
  industryEvents: IndustryEventRow[];
  weather: WeatherCacheRow | null;
  schoolHoliday: string | null; 
}

export interface AnalysisMetadata {
  weather: {
    available: boolean;
    city: string | null;
  };
  publicHolidays: {
    count: number;
    countryCode: string;
  };
  schoolHolidays: {
    checked: boolean;
    regionName: string | null;
    regionCode: string | null;
    count: number;
    isVerified: boolean;
    sourceUrl: string | null;
  };
  industryEvents: {
    matchCount: number;
    totalTracked: number;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  };
}

export interface StrategicAnalysisFormData {
  countryCode: string;
  city: string;
  targetStartDate: string;
  targetEndDate: string;
  lat?: number;
  lon?: number;
  subdivisionCode?: string; 
  industries?: string[];
  audiences?: string[];
  scales?: string[];
  radarCountries?: string[]; 
}

export type StrategicAnalysisResult = 
  | { success: true; message: string; data: Map<string, DateAnalysis>; startDate: string; endDate: string; metadata: AnalysisMetadata }
  | { success: false; message: string; data?: undefined; startDate?: undefined; endDate?: undefined; metadata?: undefined };

// UI Types
export interface Country {
  "iso-3166": string;
  country_name: string;
}

export interface Region {
  code: string;
  name: string;
  sourceUrl?: string; 
  isVerified?: boolean;
}

export interface WatchlistLocation {
  id: string;
  country: string;
  region?: string;
  label: string;
}