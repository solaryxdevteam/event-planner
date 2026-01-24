/**
 * Country and State center coordinates for map centering
 * Common countries and US states with their approximate center coordinates
 */

export const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "United States": { lat: 39.8283, lng: -98.5795 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  "United Kingdom": { lat: 55.3781, lng: -3.436 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Germany: { lat: 51.1657, lng: 10.4515 },
  France: { lat: 46.2276, lng: 2.2137 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  Spain: { lat: 40.4637, lng: -3.7492 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  China: { lat: 35.8617, lng: 104.1954 },
  India: { lat: 20.5937, lng: 78.9629 },
  Brazil: { lat: -14.235, lng: -51.9253 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
  Argentina: { lat: -38.4161, lng: -63.6167 },
  "South Africa": { lat: -30.5595, lng: 22.9375 },
  Russia: { lat: 61.524, lng: 105.3188 },
  Netherlands: { lat: 52.1326, lng: 5.2913 },
  Belgium: { lat: 50.5039, lng: 4.4699 },
  Switzerland: { lat: 46.8182, lng: 8.2275 },
  Sweden: { lat: 60.1282, lng: 18.6435 },
  Norway: { lat: 60.472, lng: 8.4689 },
  Denmark: { lat: 56.2639, lng: 9.5018 },
  Poland: { lat: 51.9194, lng: 19.1451 },
  Portugal: { lat: 39.3999, lng: -8.2245 },
  Greece: { lat: 39.0742, lng: 21.8243 },
  Turkey: { lat: 38.9637, lng: 35.2433 },
  "Saudi Arabia": { lat: 23.8859, lng: 45.0792 },
  "United Arab Emirates": { lat: 23.4241, lng: 53.8478 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  "South Korea": { lat: 35.9078, lng: 127.7669 },
  Thailand: { lat: 15.87, lng: 100.9925 },
  Indonesia: { lat: -0.7893, lng: 113.9213 },
  Malaysia: { lat: 4.2105, lng: 101.9758 },
  Philippines: { lat: 12.8797, lng: 121.774 },
  Vietnam: { lat: 14.0583, lng: 108.2772 },
  "New Zealand": { lat: -40.9006, lng: 174.886 },
  Egypt: { lat: 26.8206, lng: 30.8025 },
  Nigeria: { lat: 9.082, lng: 8.6753 },
  Kenya: { lat: -0.0236, lng: 37.9062 },
  Israel: { lat: 31.0461, lng: 34.8516 },
  Chile: { lat: -35.6751, lng: -71.543 },
  Colombia: { lat: 4.5709, lng: -74.2973 },
  Peru: { lat: -9.19, lng: -75.0152 },
  Venezuela: { lat: 6.4238, lng: -66.5897 },
  Ecuador: { lat: -1.8312, lng: -78.1834 },
};

// US State coordinates (approximate centers)
export const US_STATE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Alabama: { lat: 32.806671, lng: -86.79113 },
  Alaska: { lat: 61.370716, lng: -152.404419 },
  Arizona: { lat: 33.729759, lng: -111.431221 },
  Arkansas: { lat: 34.969704, lng: -92.373123 },
  California: { lat: 36.116203, lng: -119.681564 },
  Colorado: { lat: 39.059811, lng: -105.311104 },
  Connecticut: { lat: 41.597782, lng: -72.755371 },
  Delaware: { lat: 39.318523, lng: -75.507141 },
  Florida: { lat: 27.766279, lng: -81.686783 },
  Georgia: { lat: 33.040619, lng: -83.643074 },
  Hawaii: { lat: 21.094318, lng: -157.498337 },
  Idaho: { lat: 44.240459, lng: -114.478828 },
  Illinois: { lat: 40.349457, lng: -88.986137 },
  Indiana: { lat: 39.849426, lng: -86.258278 },
  Iowa: { lat: 42.011539, lng: -93.210526 },
  Kansas: { lat: 38.5266, lng: -96.726486 },
  Kentucky: { lat: 37.66814, lng: -84.670067 },
  Louisiana: { lat: 31.169546, lng: -91.867805 },
  Maine: { lat: 44.323535, lng: -69.765261 },
  Maryland: { lat: 39.063946, lng: -76.802101 },
  Massachusetts: { lat: 42.230171, lng: -71.530106 },
  Michigan: { lat: 43.326618, lng: -84.536095 },
  Minnesota: { lat: 45.694454, lng: -93.900192 },
  Mississippi: { lat: 32.741646, lng: -89.678696 },
  Missouri: { lat: 38.456085, lng: -92.288368 },
  Montana: { lat: 46.921925, lng: -110.454353 },
  Nebraska: { lat: 41.12537, lng: -98.268082 },
  Nevada: { lat: 38.313515, lng: -117.055374 },
  "New Hampshire": { lat: 43.452492, lng: -71.563896 },
  "New Jersey": { lat: 40.298904, lng: -74.521011 },
  "New Mexico": { lat: 34.840515, lng: -106.248482 },
  "New York": { lat: 42.165726, lng: -74.948051 },
  "North Carolina": { lat: 35.630066, lng: -79.806419 },
  "North Dakota": { lat: 47.528912, lng: -99.784012 },
  Ohio: { lat: 40.388783, lng: -82.764915 },
  Oklahoma: { lat: 35.565342, lng: -96.928917 },
  Oregon: { lat: 44.572021, lng: -123.070938 },
  Pennsylvania: { lat: 40.590752, lng: -77.209755 },
  "Rhode Island": { lat: 41.680893, lng: -71.51178 },
  "South Carolina": { lat: 33.856892, lng: -80.945007 },
  "South Dakota": { lat: 44.299782, lng: -99.438828 },
  Tennessee: { lat: 35.747845, lng: -86.692345 },
  Texas: { lat: 31.054487, lng: -97.563461 },
  Utah: { lat: 40.150032, lng: -111.862434 },
  Vermont: { lat: 44.045876, lng: -72.710686 },
  Virginia: { lat: 37.769337, lng: -78.169968 },
  Washington: { lat: 47.400902, lng: -121.490494 },
  "West Virginia": { lat: 38.491226, lng: -80.954453 },
  Wisconsin: { lat: 44.268543, lng: -89.616508 },
  Wyoming: { lat: 41.145548, lng: -107.30249 },
  "District of Columbia": { lat: 38.907192, lng: -77.036873 },
};

/**
 * Get country center coordinates
 * Returns default (United States) if country not found
 */
export function getCountryCoordinates(countryName: string): { lat: number; lng: number } {
  return COUNTRY_COORDINATES[countryName] || COUNTRY_COORDINATES["United States"];
}

/**
 * Get state center coordinates (for US states)
 * Returns country center if state not found
 */
export function getStateCoordinates(stateName: string, countryName: string): { lat: number; lng: number } {
  if (countryName === "United States" && US_STATE_COORDINATES[stateName]) {
    return US_STATE_COORDINATES[stateName];
  }
  return getCountryCoordinates(countryName);
}
