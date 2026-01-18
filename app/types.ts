// NEW: Updated to match latest weather.ts logic
export interface WeatherHistoryDay {
  date: string;
  // Core fields used in UI
  avg_temp_c?: number;
  min_temp_c?: number;
  max_temp_c?: number; // Kept for compatibility
  temp_max?: number;   // NEW: Added for latest weather.ts
  temp_c?: number;     
  
  condition?: string;
  rain_sum?: number;   // NEW
  
  // Enriched Data
  year?: number;
  humidity?: number;
  sunset?: string;
  sunrise?: string;
  
  // Window Context
  window_start_date?: string;
  window_end_date?: string;
  window_label?: string;
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
  
  // NEW: Added for latest weather.ts
  humidity_pct?: number; 
  sunset_time?: string;
  target_year?: number | null;

  history_data: WeatherHistoryDay[]; 
  last_updated?: string;
}

export interface IndustryEventRow {
  id: string;
  name: string;
  start_date: string; 
  end_date: string;   
  city: string;
  country_code: string;
  
  industry: string[];       
  audience_types: string[]; 
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