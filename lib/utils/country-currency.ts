/**
 * Country Code to Currency Mapping
 *
 * Maps ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes
 * Used to automatically set budget currency based on venue country
 */

/**
 * Maps country codes (ISO 3166-1 alpha-2) to currency codes (ISO 4217)
 * Key: Country code (e.g., "US", "CA", "GB")
 * Value: Currency code (e.g., "USD", "CAD", "GBP")
 */
export const COUNTRY_CODE_TO_CURRENCY: Record<string, string> = {
  // North America
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  GT: "GTQ",
  CR: "CRC",
  PA: "PAB",
  CU: "CUP",
  DO: "DOP",
  HT: "HTG",
  JM: "JMD",
  TT: "TTD",
  BB: "BBD",
  BS: "BSD",
  BZ: "BZD",

  // Europe
  GB: "GBP",
  IE: "EUR",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  GR: "EUR",
  FI: "EUR",
  LU: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  SK: "EUR",
  SI: "EUR",
  MT: "EUR",
  CY: "EUR",
  CH: "CHF",
  NO: "NOK",
  SE: "SEK",
  DK: "DKK",
  IS: "ISK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  HR: "HRK",
  TR: "TRY",
  RS: "RSD",
  BA: "BAM",
  MK: "MKD",
  AL: "ALL",
  ME: "EUR",
  XK: "EUR",

  // Asia Pacific
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CN: "CNY",
  IN: "INR",
  KR: "KRW",
  SG: "SGD",
  HK: "HKD",
  TW: "TWD",
  TH: "THB",
  MY: "MYR",
  ID: "IDR",
  PH: "PHP",
  VN: "VND",
  MM: "MMK",
  LA: "LAK",
  KH: "KHR",
  BN: "BND",
  FJ: "FJD",
  PG: "PGK",
  SB: "SBD",
  VU: "VUV",
  NC: "XPF",
  PF: "XPF",
  WS: "WST",
  TO: "TOP",
  TV: "AUD",
  KI: "AUD",
  NR: "AUD",
  PW: "USD",
  FM: "USD",
  MH: "USD",

  // Middle East
  SA: "SAR",
  AE: "AED",
  IL: "ILS",
  EG: "EGP",
  JO: "JOD",
  LB: "LBP",
  SY: "SYP",
  IQ: "IQD",
  IR: "IRR",
  KW: "KWD",
  QA: "QAR",
  BH: "BHD",
  OM: "OMR",
  YE: "YER",

  // South America
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  VE: "VES",
  EC: "USD",
  UY: "UYU",
  PY: "PYG",
  BO: "BOB",
  GY: "GYD",
  SR: "SRD",
  GF: "EUR",
  FK: "FKP",

  // Africa
  ZA: "ZAR",
  NG: "NGN",
  KE: "KES",
  ET: "ETB",
  TZ: "TZS",
  UG: "UGX",
  RW: "RWF",
  GH: "GHS",
  SN: "XOF",
  CI: "XOF",
  ML: "XOF",
  BF: "XOF",
  NE: "XOF",
  TG: "XOF",
  BJ: "XOF",
  GW: "XOF",
  GN: "GNF",
  SL: "SLL",
  LR: "LRD",
  CM: "XAF",
  TD: "XAF",
  CF: "XAF",
  GA: "XAF",
  CG: "XAF",
  GQ: "XAF",
  ST: "STN",
  AO: "AOA",
  MZ: "MZN",
  MW: "MWK",
  ZM: "ZMW",
  ZW: "ZWL",
  BW: "BWP",
  LS: "LSL",
  SZ: "SZL",
  NA: "NAD",
  MG: "MGA",
  MU: "MUR",
  SC: "SCR",
  KM: "KMF",
  DJ: "DJF",
  ER: "ERN",
  SD: "SDG",
  SS: "SSP",
  LY: "LYD",
  TN: "TND",
  DZ: "DZD",
  MA: "MAD",
  EH: "MAD",
  MR: "MRU",

  // Central Asia & Russia
  RU: "RUB",
  KZ: "KZT",
  UZ: "UZS",
  TM: "TMT",
  TJ: "TJS",
  KG: "KGS",
  AF: "AFN",
  PK: "PKR",
  BD: "BDT",
  LK: "LKR",
  MV: "MVR",
  NP: "NPR",
  BT: "BTN",

  // Other
  UA: "UAH",
  BY: "BYN",
  MD: "MDL",
  GE: "GEL",
  AM: "AMD",
  AZ: "AZN",
};

/**
 * Get currency code for a country code
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "US", "CA")
 * @returns ISO 4217 currency code (e.g., "USD", "CAD"), defaults to "USD"
 */
export function getCurrencyForCountryCode(countryCode: string | null | undefined): string {
  if (!countryCode) return "USD";
  const upperCode = countryCode.toUpperCase().trim();
  return COUNTRY_CODE_TO_CURRENCY[upperCode] || "USD";
}

/**
 * Get currency code for a country location object
 * @param location - Location object with code property
 * @returns ISO 4217 currency code, defaults to "USD"
 */
export function getCurrencyForCountry(location: { code: string | null } | null | undefined): string {
  if (!location?.code) return "USD";
  return getCurrencyForCountryCode(location.code);
}
