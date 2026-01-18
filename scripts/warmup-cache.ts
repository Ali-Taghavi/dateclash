// 1. CRITICAL: Load environment variables BEFORE any other imports
import dotenv from "dotenv";
import path from "path";

// Explicitly resolve the path to .env.local in your project root
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// 2. NOW import your service functions
// This ensures that when 'weather.ts' is loaded, process.env is already populated
import { getWeatherRisk } from "../app/lib/services/weather";
import { getHolidays } from "../app/lib/services/events";

const PRIORITY_CITIES = [
  { name: "London", lat: 51.5074, lon: -0.1278, country: "GB" },
  { name: "New York", lat: 40.7128, lon: -74.0060, country: "US" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, country: "AE" },
  { name: "Berlin", lat: 52.5200, lon: 13.4050, country: "DE" },
  { name: "Frankfurt", lat: 50.1109, lon: 8.6821, country: "DE" },
  { name: "Heidelberg", lat: 49.3988, lon: 8.6724, country: "DE" },
  { name: "Copenhagen", lat: 55.6761, lon: 12.5683, country: "DK" }
];

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const TARGET_YEAR = 2026;

async function runWarmup() {
  // Final verify that variables loaded
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL is still undefined.");
    console.log("Current working directory:", process.cwd());
    process.exit(1);
  }

  console.log("🚀 Starting Strategic Cache Warmup for Priority Hubs...");

  for (const city of PRIORITY_CITIES) {
    console.log(`\n--- Processing: ${city.name} (${city.country}) ---`);
    
    try {
      await getHolidays(city.country, TARGET_YEAR);
      console.log(`✅ Holidays cached for ${city.country}`);
    } catch (e: any) {
      console.error(`❌ Holiday error for ${city.country}:`, e?.message || e);
    }
    
    console.log(`🌡️  Caching weather months:`);
    for (const month of MONTHS) {
      try {
        await getWeatherRisk(city.name, month, city.lat, city.lon, TARGET_YEAR);
        process.stdout.write(`${month} `); 
      } catch (e: any) {
        console.error(`\n❌ Weather error for ${city.name} (Month ${month}):`, e?.message || e);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    console.log(`\nDone with ${city.name}`);
  }

  console.log("\n✨ Warmup Complete. All priority data is persisted in Supabase.");
  process.exit(0);
}

runWarmup().catch(console.error);