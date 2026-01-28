import { NextRequest, NextResponse } from "next/server";
import { venueTemplateService } from "@/lib/services/venues/venue-template.service";
import { UnauthorizedError, NotFoundError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/venues/templates/[id]
 * Get a single venue template by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const template = await venueTemplateService.getVenueTemplate(id);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Failed to fetch venue template:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof NotFoundError || (error instanceof Error && error.message.includes("not found"))) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch venue template",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/venues/templates/[id]
 * Update a venue template
 *
 * Body: { name?: string, template_data?: CreateVenueInput }
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, template_data } = body;

    const updates: { name?: string; template_data?: any } = {};
    if (name !== undefined) {
      updates.name = name;
    }
    if (template_data !== undefined) {
      updates.template_data = template_data;
    }

    const template = await venueTemplateService.updateVenueTemplate(id, updates);

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Failed to update venue template:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof NotFoundError || (error instanceof Error && error.message.includes("not found"))) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update venue template",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venues/templates/[id]
 * Delete a venue template
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await venueTemplateService.deleteVenueTemplate(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to delete venue template:", error);

    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (error instanceof NotFoundError || (error instanceof Error && error.message.includes("not found"))) {
      return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete venue template",
      },
      { status: 500 }
    );
  }
}
