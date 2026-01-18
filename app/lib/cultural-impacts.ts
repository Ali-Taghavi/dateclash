export interface CulturalObservation {
    name: string;
    segment: string;
    note: string;
    affectedMarkets: string[];
  }
  
  export const GLOBAL_OBSERVATIONS: Record<string, CulturalObservation> = {
    "Passover": {
      name: "Passover / Pesach",
      segment: "Global Jewish Audience",
      note: "Strategic reach into Jewish communities globally is significantly reduced. Expect zero business activity in Israel and reduced engagement in the US and London hubs.",
      affectedMarkets: ["IL", "US", "GB", "FR"]
    },
    "Eid al-Fitr": {
      name: "Eid al-Fitr",
      segment: "Muslim & MENA Markets",
      note: "Major religious observance marking the end of Ramadan. Expect complete office closures across MENA and significant impact on global Muslim audience segments.",
      affectedMarkets: ["AE", "SA", "TR", "EG", "ID", "MY", "GB", "FR"]
    },
    "Lunar New Year": {
      name: "Lunar New Year / Spring Festival",
      segment: "APAC & Global Diaspora",
      note: "Dominant impact on APAC supply chains and corporate teams. High travel volume and office closures for 3-7 days in key Asian markets.",
      affectedMarkets: ["CN", "SG", "VN", "MY", "KR", "AU", "US", "CA"]
    },
    "Diwali": {
      name: "Diwali",
      segment: "Indian & Hindu Markets",
      note: "Festival of Lights. Extensive impact on Indian markets and South Asian diaspora globally. High retail activity but low corporate response.",
      affectedMarkets: ["IN", "SG", "GB", "CA", "US", "AU"]
    }
  };
  
  /**
   * Checks if a holiday name contains keywords for a global cultural event
   */
  export function getGlobalImpact(holidayName: string): CulturalObservation | null {
    if (!holidayName) return null;
    for (const [key, value] of Object.entries(GLOBAL_OBSERVATIONS)) {
      if (holidayName.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    return null;
  }