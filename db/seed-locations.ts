/**
 * Locations Seeder
 *
 * Seeds the locations table with data from:
 * https://github.com/dr5hn/countries-states-cities-database
 *
 * Usage:
 *   npm run seed:locations
 *
 * Requirements:
 *   - NEXT_PUBLIC_SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as zlib from "zlib";
import { pipeline } from "stream/promises";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
const result = config({ path: envPath });

if (result.error) {
  console.warn(`Warning: Could not load .env.local: ${result.error.message}`);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  console.error("Set them in your .env.local file or export as environment variables");
  console.error(`NEXT_PUBLIC_SUPABASE_URL: ${SUPABASE_URL ? "SET" : "NOT SET"}`);
  console.error(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET"}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Base URL for raw GitHub files
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json";

interface Country {
  id: number;
  name: string;
  iso2: string;
  iso3: string;
}

interface State {
  id: number;
  name: string;
  state_code: string;
  country_id: number;
  country_code: string;
}

interface City {
  id: number;
  name: string;
  state_id: number;
  state_code: string;
  country_id: number;
  country_code: string;
}

/**
 * Download a file from URL and save to local path
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        // Handle redirects
        if (
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error(`Redirect location not found for ${url}`));
            return;
          }
          // Close the current file and retry with redirect URL
          file.close();
          fs.unlinkSync(filePath);
          return downloadFile(redirectUrl, filePath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          file.close();
          fs.unlinkSync(filePath);
          reject(err);
        });
      })
      .on("error", (err) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(err);
      });
  });
}

/**
 * Download and decompress a gzipped file
 */
async function downloadGzippedFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);

    https
      .get(url, (response) => {
        // Handle redirects
        if (
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 307 ||
          response.statusCode === 308
        ) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error(`Redirect location not found for ${url}`));
            return;
          }
          file.close();
          fs.unlinkSync(filePath);
          return downloadGzippedFile(redirectUrl, filePath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(filePath);
          reject(new Error(`Failed to download ${url}: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        // Pipe through gunzip and then to file
        const gunzip = zlib.createGunzip();
        response.pipe(gunzip).pipe(file);

        file.on("finish", () => {
          file.close();
          resolve();
        });

        file.on("error", (err) => {
          file.close();
          fs.unlinkSync(filePath);
          reject(err);
        });

        gunzip.on("error", (err) => {
          file.close();
          fs.unlinkSync(filePath);
          reject(err);
        });
      })
      .on("error", (err) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(err);
      });
  });
}

/**
 * Download JSON data from GitHub
 */
async function downloadJsonData(): Promise<{ countries: Country[]; states: State[]; cities: City[] }> {
  const dataDir = path.join(process.cwd(), "db", "temp-locations-data");

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const countriesPath = path.join(dataDir, "countries.json");
  const statesPath = path.join(dataDir, "states.json");
  const citiesPath = path.join(dataDir, "cities.json");

  console.log("Downloading data from GitHub...");
  console.log("  - Downloading countries.json...");

  try {
    // Download countries and states (uncompressed)
    await downloadFile(`${GITHUB_BASE_URL}/countries.json`, countriesPath);
    console.log("  - Downloading states.json...");
    await downloadFile(`${GITHUB_BASE_URL}/states.json`, statesPath);
    console.log("  - Downloading cities.json.gz (this may take a while due to file size)...");

    // Download cities (compressed, needs decompression)
    await downloadGzippedFile(`${GITHUB_BASE_URL}/cities.json.gz`, citiesPath);

    console.log("✓ Files downloaded successfully");
    console.log("  - Parsing countries...");

    // Read and parse JSON files
    const countries = JSON.parse(fs.readFileSync(countriesPath, "utf-8")) as Country[];
    console.log("  - Parsing states...");
    const states = JSON.parse(fs.readFileSync(statesPath, "utf-8")) as State[];
    console.log("  - Parsing cities (this may take a moment)...");
    const cities = JSON.parse(fs.readFileSync(citiesPath, "utf-8")) as City[];

    // Clean up temp files
    fs.unlinkSync(countriesPath);
    fs.unlinkSync(statesPath);
    fs.unlinkSync(citiesPath);
    fs.rmdirSync(dataDir);

    return { countries, states, cities };
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(countriesPath)) fs.unlinkSync(countriesPath);
    if (fs.existsSync(statesPath)) fs.unlinkSync(statesPath);
    if (fs.existsSync(citiesPath)) fs.unlinkSync(citiesPath);
    if (fs.existsSync(dataDir)) {
      try {
        fs.rmdirSync(dataDir);
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

/**
 * Seed countries
 */
async function seedCountries(countries: Country[]): Promise<Map<number, string>> {
  console.log(`\nSeeding ${countries.length} countries...`);

  const countryIdMap = new Map<number, string>(); // Maps original ID to UUID

  // Insert countries in batches
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < countries.length; i += batchSize) {
    const batch = countries.slice(i, i + batchSize);

    const locations = batch.map((country) => ({
      name: country.name,
      type: "country" as const,
      parent_id: null,
      code: country.iso2,
      is_active: country.iso2 === "US", // Only US is active
    }));

    const { data, error } = await supabase.from("locations").insert(locations).select("id, code");

    if (error) {
      console.error(`Error inserting countries batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      // Try to continue with next batch
      continue;
    }

    // Map original IDs to new UUIDs
    batch.forEach((country) => {
      const insertedLocation = data?.find((loc) => loc.code === country.iso2);
      if (insertedLocation) {
        countryIdMap.set(country.id, insertedLocation.id);
      }
    });

    inserted += data?.length || 0;
    process.stdout.write(`\r  Progress: ${inserted}/${countries.length} countries`);
  }

  console.log(`\n✓ Inserted ${inserted} countries`);
  return countryIdMap;
}

/**
 * Seed states
 */
async function seedStates(states: State[], countryIdMap: Map<number, string>): Promise<Map<number, string>> {
  console.log(`\nSeeding ${states.length} states...`);

  const stateIdMap = new Map<number, string>(); // Maps original ID to UUID

  // Filter states that have valid country IDs
  const validStates = states.filter((state) => countryIdMap.has(state.country_id));

  // First, fetch all existing states to build a lookup map
  console.log("  - Checking existing states...");
  const { data: existingStates } = await supabase
    .from("locations")
    .select("id, name, parent_id, code")
    .eq("type", "state");

  const existingStateMap = new Map<string, string>(); // key: "name|parent_id", value: uuid
  existingStates?.forEach((state) => {
    const key = `${state.name}|${state.parent_id}`;
    existingStateMap.set(key, state.id);
  });

  // Insert states in batches, skipping duplicates
  const batchSize = 100;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < validStates.length; i += batchSize) {
    const batch = validStates.slice(i, i + batchSize);

    // Filter out states that already exist
    const newStates = batch.filter((state) => {
      const countryUuid = countryIdMap.get(state.country_id);
      if (!countryUuid) return false;
      const key = `${state.name}|${countryUuid}`;
      if (existingStateMap.has(key)) {
        // Map existing state
        stateIdMap.set(state.id, existingStateMap.get(key)!);
        skipped++;
        return false;
      }
      return true;
    });

    if (newStates.length === 0) {
      process.stdout.write(
        `\r  Progress: ${Math.min(i + batchSize, validStates.length)}/${validStates.length} states (${inserted} inserted, ${skipped} skipped)`
      );
      continue;
    }

    const locations = newStates
      .map((state) => {
        const countryUuid = countryIdMap.get(state.country_id);
        if (!countryUuid) return null;

        return {
          name: state.name,
          type: "state" as const,
          parent_id: countryUuid,
          code: state.state_code,
          is_active: state.country_code === "US", // Only US states are active
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    if (locations.length === 0) continue;

    const { data, error } = await supabase.from("locations").insert(locations).select("id, name, parent_id");

    if (error) {
      // If batch fails, try individual inserts
      for (const state of newStates) {
        const countryUuid = countryIdMap.get(state.country_id);
        if (!countryUuid) continue;

        const { data: individualData, error: individualError } = await supabase
          .from("locations")
          .insert({
            name: state.name,
            type: "state" as const,
            parent_id: countryUuid,
            code: state.state_code,
            is_active: state.country_code === "US", // Only US states are active
          })
          .select("id")
          .single();

        if (!individualError && individualData) {
          stateIdMap.set(state.id, individualData.id);
          inserted++;
          const key = `${state.name}|${countryUuid}`;
          existingStateMap.set(key, individualData.id);
        } else {
          // Try to find existing
          const { data: found } = await supabase
            .from("locations")
            .select("id")
            .eq("type", "state")
            .eq("name", state.name)
            .eq("parent_id", countryUuid)
            .maybeSingle();

          if (found) {
            stateIdMap.set(state.id, found.id);
            skipped++;
            const key = `${state.name}|${countryUuid}`;
            existingStateMap.set(key, found.id);
          }
        }
      }
    } else if (data) {
      // Map inserted states
      newStates.forEach((state) => {
        const countryUuid = countryIdMap.get(state.country_id);
        if (!countryUuid) return;
        const insertedLocation = data.find((loc) => loc.name === state.name && loc.parent_id === countryUuid);
        if (insertedLocation) {
          stateIdMap.set(state.id, insertedLocation.id);
          const key = `${state.name}|${countryUuid}`;
          existingStateMap.set(key, insertedLocation.id);
        }
      });
      inserted += data.length;
    }

    process.stdout.write(
      `\r  Progress: ${Math.min(i + batchSize, validStates.length)}/${validStates.length} states (${inserted} inserted, ${skipped} skipped)`
    );
  }

  console.log(`\n✓ Processed ${validStates.length} states (${inserted} inserted, ${skipped} already existed)`);
  return stateIdMap;
}

/**
 * Seed cities
 */
async function seedCities(cities: City[], stateIdMap: Map<number, string>): Promise<void> {
  console.log(`\nSeeding cities...`);
  console.log(`  Total cities in dataset: ${cities.length}`);

  // Filter cities to only include US cities with valid state IDs
  const validCities = cities.filter((city) => city.country_code === "US" && stateIdMap.has(city.state_id));
  console.log(`  Found ${validCities.length} US cities with valid state references`);

  if (validCities.length === 0) {
    console.log("  ⚠ No cities to insert (no valid state references found)");
    return;
  }

  // First, fetch all existing cities to build a lookup map (for duplicate detection)
  console.log("  - Checking existing cities...");
  const { data: existingCities } = await supabase.from("locations").select("id, name, parent_id").eq("type", "city");

  const existingCityMap = new Map<string, boolean>(); // key: "name|parent_id", value: exists
  existingCities?.forEach((city) => {
    const key = `${city.name}|${city.parent_id}`;
    existingCityMap.set(key, true);
  });
  console.log(`  - Found ${existingCityMap.size} existing cities`);

  // Insert cities in batches, filtering out duplicates
  const batchSize = 500; // Larger batch size for cities
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < validCities.length; i += batchSize) {
    const batch = validCities.slice(i, i + batchSize);

    // Filter out cities that already exist
    const newCities = batch.filter((city) => {
      const stateUuid = stateIdMap.get(city.state_id);
      if (!stateUuid) return false;
      const key = `${city.name}|${stateUuid}`;
      if (existingCityMap.has(key)) {
        skipped++;
        return false;
      }
      return true;
    });

    if (newCities.length === 0) {
      if ((i + batchSize) % 5000 === 0 || i + batchSize >= validCities.length) {
        process.stdout.write(
          `\r  Progress: ${Math.min(i + batchSize, validCities.length)}/${validCities.length} cities (${inserted} inserted, ${skipped} skipped)`
        );
      }
      continue;
    }

    const locations = newCities
      .map((city) => {
        const stateUuid = stateIdMap.get(city.state_id);
        if (!stateUuid) return null;

        return {
          name: city.name,
          type: "city" as const,
          parent_id: stateUuid,
          code: null, // Cities don't have codes in the source data
          is_active: city.country_code === "US", // Only US cities are active
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    if (locations.length === 0) continue;

    const { data, error } = await supabase.from("locations").insert(locations).select("id, name, parent_id");

    if (error) {
      // If batch fails, try inserting individually to identify which ones are duplicates
      for (const city of newCities) {
        const stateUuid = stateIdMap.get(city.state_id);
        if (!stateUuid) continue;

        const key = `${city.name}|${stateUuid}`;

        // Double-check if it exists now (might have been inserted by another process)
        if (existingCityMap.has(key)) {
          skipped++;
          continue;
        }

        const { error: individualError } = await supabase
          .from("locations")
          .insert({
            name: city.name,
            type: "city" as const,
            parent_id: stateUuid,
            code: null,
            is_active: city.country_code === "US", // Only US cities are active
          })
          .select("id")
          .single();

        if (!individualError) {
          inserted++;
          existingCityMap.set(key, true); // Mark as existing
        } else {
          // Duplicate - mark it so we skip it in future batches
          skipped++;
          existingCityMap.set(key, true);
        }
      }
    } else if (data) {
      // Successfully inserted - update the existing map
      data.forEach((city) => {
        const key = `${city.name}|${city.parent_id}`;
        existingCityMap.set(key, true);
      });
      inserted += data.length;
    }

    if ((i + batchSize) % 5000 === 0 || i + batchSize >= validCities.length) {
      process.stdout.write(
        `\r  Progress: ${Math.min(i + batchSize, validCities.length)}/${validCities.length} cities (${inserted} inserted, ${skipped} skipped)`
      );
    }
  }

  console.log(`\n✓ Processed ${validCities.length} cities (${inserted} inserted, ${skipped} skipped)`);
}

/**
 * Main seeder function
 */
async function main() {
  console.log("==========================================");
  console.log("Locations Seeder");
  console.log("==========================================");
  console.log("Source: https://github.com/dr5hn/countries-states-cities-database");
  console.log("==========================================\n");

  try {
    // Download data
    const { countries, states, cities } = await downloadJsonData();

    // Seed in hierarchical order
    const countryIdMap = await seedCountries(countries);
    const stateIdMap = await seedStates(states, countryIdMap);
    await seedCities(cities, stateIdMap);

    console.log("\n==========================================");
    console.log("✓ Seeding completed successfully!");
    console.log("==========================================");
    console.log(`Countries: ${countryIdMap.size}`);
    console.log(`States: ${stateIdMap.size}`);
    console.log(
      `Cities (US only): ${cities.filter((c) => c.country_code === "US" && stateIdMap.has(c.state_id)).length}`
    );
    console.log("==========================================");
  } catch (error) {
    console.error("\n✗ Error during seeding:", error);
    process.exit(1);
  }
}

// Run seeder
main();
