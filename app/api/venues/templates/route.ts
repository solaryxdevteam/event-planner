import { NextRequest, NextResponse } from "next/server";
import { venueTemplateService } from "@/lib/services/venues/venue-template.service";
import { UnauthorizedError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/venues/templates
 * Get all venue templates for the current user
 */
export async function GET() {
  try {
    const templates = await venueTemplateService.getVenueTemplates();

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error("Failed to fetch venue templates:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch venue templates",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venues/templates
 * Create a new venue template
 *
 * Body: { name: string, template_data: CreateVenueInput }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, template_data } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ success: false, error: "Template name is required" }, { status: 400 });
    }

    if (!template_data || typeof template_data !== "object") {
      return NextResponse.json({ success: false, error: "Template data is required" }, { status: 400 });
    }

    const template = await venueTemplateService.saveVenueAsTemplate(name, template_data);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Failed to create venue template:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create venue template",
      },
      { status: 500 }
    );
  }
}
