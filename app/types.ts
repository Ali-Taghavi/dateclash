// Database Enums (must match Supabase schema exactly)

export enum IndustryType {
  FinTech = 'FinTech',
  Finance = 'Finance',
  AssetManagement = 'Asset Management',
  InvestmentOps = 'Investment Ops',
  WealthManagement = 'Wealth Management',
  Banking = 'Banking',
  Insurance = 'Insurance',
  Technology = 'Technology',
  General = 'General'
}

export enum RiskLevel {
  Critical = "Critical",
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

export enum EventScale {
  Global = "Global", // >5000 attendees
  Large = "Large",
  Medium = "Medium",
  Summit = "Summit",
}

// Database Row Types

export type HolidayRow = {
  id: string;
  country_code: string;
  year: number;
  date: string;
  name: string;
  description: string | null;
  type: string | null;
  locations: string | null;
  observed_date: string | null;
  states: Record<string, unknown> | null;
  type_list: string[] | null;
};

export type WeatherHistoryDay = {
  date: string; // YYYY-MM-DD
  temp_max: number;
  rain_sum: number;
  year: number;
  humidity?: number; // Average humidity for the day
  sunset?: string; // Sunset time (HH:MM format)
  window_start_date?: string; // Start date of the 14-day window (YYYY-MM-DD)
  window_end_date?: string; // End date of the 14-day window (YYYY-MM-DD)
  window_label?: string; // Formatted date label (e.g., "Aug 8 - Aug 21")
};

export type WeatherCacheRow = {
  id: string;
  city: string;
  month: number;
  avg_temp_high_c: number;
  avg_temp_low_c: number;
  rain_days_count: number;
  humidity_pct: number;
  sunset_time: string;
  history_data?: WeatherHistoryDay[] | null; // JSONB column storing historical daily data
  target_year?: number | null; // Target year if this is a projection
};

export type IndustryEventRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  city: string | null;
  country_code: string;
  industry: IndustryType[] | null;
  audience_types: string[] | null;
  event_scale: EventScale | null;
  risk_level: RiskLevel | null;
  significance: string | null;
  description: string | null;
  url: string | null;
};

// API Response Types

export type TestResult = {
  success: boolean;
  message: string;
  holidayName?: string;
  holidayDate?: string;
};

export type EmailResult = {
  success: boolean;
  message: string;
};

export type FrankfurtTestResult = {
  success: boolean;
  message: string;
  data?: {
    holidays: HolidayRow[];
    weather: WeatherCacheRow;
    industryEvents: IndustryEventRow[];
  };
};

// Strategic Analysis Types
export type DateAnalysis = {
  date: string; // YYYY-MM-DD
  holidays: HolidayRow[];
  industryEvents: IndustryEventRow[];
  weather: WeatherCacheRow | null;
};

export type StrategicAnalysisResult = {
  success: boolean;
  message: string;
  data?: Map<string, DateAnalysis>; // Keyed by YYYY-MM-DD
  startDate?: string;
  endDate?: string;
};

export type StrategicAnalysisFormData = {
  countryCode: string;
  city?: string; // Optional - will use default capital if not provided
  targetStartDate: string; // YYYY-MM-DD
  targetEndDate: string; // YYYY-MM-DD
  industries?: IndustryType[];
  audiences?: string[];
  scales?: EventScale[];
  lat?: number;
  lon?: number;
};
