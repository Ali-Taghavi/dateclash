import { parseISO, isWithinInterval } from "date-fns";

export interface StrategicEvent {
  name: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // For multi-day events
  description?: string;
  region: string;
  impactLevel: "High" | "Critical";
}

// ---------------------------------------------------------------------------
// 🌍 THE GOLDEN LIST (2026 - 2030)
// Manually verified strategic dates to avoid API dependency.
// ---------------------------------------------------------------------------
const EVENTS_DATA: StrategicEvent[] = [
  // --- 2026 ---
  { date: "2026-02-17", name: "Lunar New Year", region: "East Asia", impactLevel: "High" },
  { date: "2026-03-20", endDate: "2026-03-22", name: "Eid al-Fitr", region: "MENA/Global", impactLevel: "High" },
  { date: "2026-03-21", name: "Nowruz", region: "Central Asia/Iran", impactLevel: "High" },
  { date: "2026-04-01", endDate: "2026-04-09", name: "Passover", region: "Global Jewish", impactLevel: "High" },
  { date: "2026-04-03", endDate: "2026-04-06", name: "Easter (Western)", region: "US/EU/AUS", impactLevel: "High" },
  { date: "2026-04-12", name: "Easter (Orthodox)", region: "East Europe/Russia", impactLevel: "High" },
  { date: "2026-04-29", endDate: "2026-05-05", name: "Golden Week (Japan)", region: "Japan", impactLevel: "High" },
  { date: "2026-05-27", endDate: "2026-05-30", name: "Eid al-Adha", region: "MENA/Global", impactLevel: "High" },
  { date: "2026-09-12", endDate: "2026-09-13", name: "Rosh Hashanah", region: "Global Jewish", impactLevel: "High" },
  { date: "2026-09-21", name: "Yom Kippur", region: "Global Jewish", impactLevel: "Critical" },
  { date: "2026-10-01", endDate: "2026-10-07", name: "National Day (China)", region: "China", impactLevel: "High" },
  { date: "2026-11-08", name: "Diwali", region: "India/Global", impactLevel: "High" },
  { date: "2026-11-26", name: "Thanksgiving (US)", region: "USA", impactLevel: "High" },

  // --- 2027 ---
  { date: "2027-02-06", name: "Lunar New Year", region: "East Asia", impactLevel: "High" },
  { date: "2027-03-09", endDate: "2027-03-11", name: "Eid al-Fitr", region: "MENA/Global", impactLevel: "High" },
  { date: "2027-03-21", name: "Nowruz", region: "Central Asia/Iran", impactLevel: "High" },
  { date: "2027-03-28", endDate: "2027-03-31", name: "Easter (Western)", region: "US/EU/AUS", impactLevel: "High" },
  { date: "2027-04-22", endDate: "2027-04-30", name: "Passover", region: "Global Jewish", impactLevel: "High" },
  { date: "2027-04-29", endDate: "2027-05-05", name: "Golden Week (Japan)", region: "Japan", impactLevel: "High" },
  { date: "2027-05-02", name: "Easter (Orthodox)", region: "East Europe/Russia", impactLevel: "High" },
  { date: "2027-05-16", endDate: "2027-05-19", name: "Eid al-Adha", region: "MENA/Global", impactLevel: "High" },
  { date: "2027-10-01", endDate: "2027-10-07", name: "National Day (China)", region: "China", impactLevel: "High" },
  { date: "2027-10-02", endDate: "2027-10-04", name: "Rosh Hashanah", region: "Global Jewish", impactLevel: "High" },
  { date: "2027-10-11", name: "Yom Kippur", region: "Global Jewish", impactLevel: "Critical" },
  { date: "2027-10-29", name: "Diwali", region: "India/Global", impactLevel: "High" },
  { date: "2027-11-25", name: "Thanksgiving (US)", region: "USA", impactLevel: "High" },

  // --- 2028 ---
  { date: "2028-01-26", name: "Lunar New Year", region: "East Asia", impactLevel: "High" },
  { date: "2028-02-26", endDate: "2028-02-28", name: "Eid al-Fitr", region: "MENA/Global", impactLevel: "High" },
  { date: "2028-03-21", name: "Nowruz", region: "Central Asia/Iran", impactLevel: "High" },
  { date: "2028-04-11", endDate: "2028-04-19", name: "Passover", region: "Global Jewish", impactLevel: "High" },
  { date: "2028-04-16", endDate: "2028-04-17", name: "Easter (Western)", region: "US/EU/AUS", impactLevel: "High" },
  { date: "2028-04-16", name: "Easter (Orthodox)", region: "East Europe/Russia", impactLevel: "High" },
  { date: "2028-04-29", endDate: "2028-05-05", name: "Golden Week (Japan)", region: "Japan", impactLevel: "High" },
  { date: "2028-05-05", endDate: "2028-05-08", name: "Eid al-Adha", region: "MENA/Global", impactLevel: "High" },
  { date: "2028-09-21", endDate: "2028-09-22", name: "Rosh Hashanah", region: "Global Jewish", impactLevel: "High" },
  { date: "2028-09-30", name: "Yom Kippur", region: "Global Jewish", impactLevel: "Critical" },
  { date: "2028-10-01", endDate: "2028-10-07", name: "National Day (China)", region: "China", impactLevel: "High" },
  { date: "2028-10-17", name: "Diwali", region: "India/Global", impactLevel: "High" },
  { date: "2028-11-23", name: "Thanksgiving (US)", region: "USA", impactLevel: "High" },

  // --- 2029 ---
  { date: "2029-02-13", name: "Lunar New Year", region: "East Asia", impactLevel: "High" },
  { date: "2029-02-14", endDate: "2029-02-16", name: "Eid al-Fitr", region: "MENA/Global", impactLevel: "High" },
  { date: "2029-03-21", name: "Nowruz", region: "Central Asia/Iran", impactLevel: "High" },
  { date: "2029-03-31", endDate: "2029-04-08", name: "Passover", region: "Global Jewish", impactLevel: "High" },
  { date: "2029-04-01", name: "Easter (Western)", region: "US/EU/AUS", impactLevel: "High" },
  { date: "2029-04-08", name: "Easter (Orthodox)", region: "East Europe/Russia", impactLevel: "High" },
  { date: "2029-04-24", endDate: "2029-04-27", name: "Eid al-Adha", region: "MENA/Global", impactLevel: "High" },
  { date: "2029-09-10", endDate: "2029-09-11", name: "Rosh Hashanah", region: "Global Jewish", impactLevel: "High" },
  { date: "2029-09-19", name: "Yom Kippur", region: "Global Jewish", impactLevel: "Critical" },
  { date: "2029-11-05", name: "Diwali", region: "India/Global", impactLevel: "High" },
  { date: "2029-11-22", name: "Thanksgiving (US)", region: "USA", impactLevel: "High" },

  // --- 2030 ---
  { date: "2030-02-03", name: "Lunar New Year", region: "East Asia", impactLevel: "High" },
  { date: "2030-02-04", endDate: "2030-02-06", name: "Eid al-Fitr", region: "MENA/Global", impactLevel: "High" },
  { date: "2030-03-21", name: "Nowruz", region: "Central Asia/Iran", impactLevel: "High" },
  { date: "2030-04-14", endDate: "2030-04-22", name: "Passover", region: "Global Jewish", impactLevel: "High" },
  { date: "2030-04-14", endDate: "2030-04-16", name: "Eid al-Adha", region: "MENA/Global", impactLevel: "High" },
  { date: "2030-04-21", name: "Easter (Western)", region: "US/EU/AUS", impactLevel: "High" },
  { date: "2030-04-28", name: "Easter (Orthodox)", region: "East Europe/Russia", impactLevel: "High" },
  { date: "2030-09-28", endDate: "2030-09-29", name: "Rosh Hashanah", region: "Global Jewish", impactLevel: "High" },
  { date: "2030-10-07", name: "Yom Kippur", region: "Global Jewish", impactLevel: "Critical" },
  { date: "2030-10-26", name: "Diwali", region: "India/Global", impactLevel: "High" },
  { date: "2030-11-28", name: "Thanksgiving (US)", region: "USA", impactLevel: "High" },
];

export function getStrategicEventsForDate(dateStr: string): StrategicEvent[] {
  const target = parseISO(dateStr);
  return EVENTS_DATA.filter(event => {
    const start = parseISO(event.date);
    if (event.endDate) {
      const end = parseISO(event.endDate);
      return isWithinInterval(target, { start, end });
    }
    return event.date === dateStr;
  });
}