/**
 * Map country names to ISO country codes for phone input
 */

export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "United States": "US",
  Canada: "CA",
  "United Kingdom": "GB",
  Australia: "AU",
  Germany: "DE",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  Japan: "JP",
  China: "CN",
  India: "IN",
  Brazil: "BR",
  Mexico: "MX",
  Argentina: "AR",
  "South Africa": "ZA",
  Russia: "RU",
  Netherlands: "NL",
  Belgium: "BE",
  Switzerland: "CH",
  Sweden: "SE",
  Norway: "NO",
  Denmark: "DK",
  Poland: "PL",
  Portugal: "PT",
  Greece: "GR",
  Turkey: "TR",
  "Saudi Arabia": "SA",
  "United Arab Emirates": "AE",
  Singapore: "SG",
  "South Korea": "KR",
  Thailand: "TH",
  Indonesia: "ID",
  Malaysia: "MY",
  Philippines: "PH",
  Vietnam: "VN",
  "New Zealand": "NZ",
  Egypt: "EG",
  Nigeria: "NG",
  Kenya: "KE",
  Israel: "IL",
  Chile: "CL",
  Colombia: "CO",
  Peru: "PE",
  Venezuela: "VE",
  Ecuador: "EC",
};

/**
 * Get country code from country name
 * Returns "US" as default if not found
 */
export function getCountryCode(countryName: string): string {
  return COUNTRY_NAME_TO_CODE[countryName] || "US";
}
