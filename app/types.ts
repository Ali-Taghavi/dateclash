/**
 * 🌡️ WEATHER TYPES
 */
export interface WeatherHistoryDay {
  date: string;
  avg_temp_c?: number;
  min_temp_c?: number;
  max_temp_c?: number; 
  temp_max?: number;   
  temp_c?: number;     
  condition?: string;
  rain_sum?: number;   
  year?: number;
  humidity?: number;
  sunset?: string;
  sunrise?: string;
  window_start_date?: string;
  window_end_date?: string;
  window_label?: string;
}

export interface WeatherCacheRow {
  id?: number; 
  city: string;
  month: number;
  lat?: number;
  lon?: number;
  avg_temp_high_c: number | null;
  avg_temp_low_c: number | null;
  rain_days_count: number | null;
  humidity_pct?: number; 
  sunset_time?: string;
  target_year?: number | null;
  history_data: WeatherHistoryDay[]; 
  last_updated?: string;
}

/**
 * 🏛️ HOLIDAY & EVENT TYPES
 */
export interface PublicHolidayRow {
  date: string;
  name: string;
  localName?: string;
  countryCode?: string;
  country_code?: string;
  year?: number;
  description?: string | null;
  type?: string | null;
  locations?: string | null;
  observed_date?: string | null;
  states?: string | null;
  type_list?: string[] | null;
  isGlobalImpact?: boolean; // Critical for the Global Impact badge logic
}

export type HolidayRow = PublicHolidayRow;

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
  // Projection fields
  is_projected?: boolean;
  projected_from?: number;
}

export type IndustryType = string;
export type EventScale = string;

export interface SchoolHolidayRow {
  startDate: string;
  endDate: string;
  name: string;
  region: string;
}

/**
 * 📊 ANALYSIS & METADATA TYPES
 */
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
    projectedCount: number; // Added for the new Dashboard row
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  };
}

/**
 * 📝 FORM & RESULT TYPES
 */
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

/**
 * 🌍 UI & LOCATION TYPES
 */
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