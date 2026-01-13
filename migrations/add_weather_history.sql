-- Add history_data column to weather_cache table
-- This column stores the raw daily data for the last 7 years as JSONB

ALTER TABLE weather_cache
ADD COLUMN IF NOT EXISTS history_data JSONB;

-- Add a comment to document the column
COMMENT ON COLUMN weather_cache.history_data IS 'Stores historical daily weather data for the last 7 years. Format: [{ date: string, temp_max: number, rain_sum: number, year: number }, ...]';
