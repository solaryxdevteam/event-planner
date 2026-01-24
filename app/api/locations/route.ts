/**
 * Locations API Route
 *
 * GET /api/locations - Get locations (countries, states, cities)
 */

import { NextRequest, NextResponse } from "next/server";
import * as locationsDAL from "@/lib/data-access/locations.dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/locations
 * Get locations based on query parameters
 *
 * Query params:
 * - type: "countries" | "states" | "cities" | "default-country"
 * - countryId: string (required for states)
 * - stateId: string (required for cities)
 * - id: string (optional, get location by ID)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const countryId = searchParams.get("countryId");
    const stateId = searchParams.get("stateId");
    const id = searchParams.get("id");

    // Get location by ID
    if (id) {
      const location = await locationsDAL.getLocationById(id);
      return NextResponse.json({
        success: true,
        data: location,
      });
    }

    // Get default country
    if (type === "default-country") {
      const country = await locationsDAL.getDefaultCountry();
      return NextResponse.json({
        success: true,
        data: country,
      });
    }

    // Get countries
    if (type === "countries" || !type) {
      const countries = await locationsDAL.getCountries();
      return NextResponse.json({
        success: true,
        data: countries,
      });
    }

    // Get states by country
    if (type === "states") {
      if (!countryId) {
        return NextResponse.json(
          { success: false, error: "countryId parameter is required for states" },
          { status: 400 }
        );
      }
      const states = await locationsDAL.getStatesByCountry(countryId);
      return NextResponse.json({
        success: true,
        data: states,
      });
    }

    // Get cities by state
    if (type === "cities") {
      if (!stateId) {
        return NextResponse.json(
          { success: false, error: "stateId parameter is required for cities" },
          { status: 400 }
        );
      }
      const cities = await locationsDAL.getCitiesByState(stateId);
      return NextResponse.json({
        success: true,
        data: cities,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid type parameter" }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch locations:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch locations",
      },
      { status: 500 }
    );
  }
}
