/**
 * Venue Template Service
 *
 * Business logic layer for venue template operations
 * Templates are private to each user
 */

import { requireActiveUser } from "@/lib/auth/server";
import * as templateDAL from "@/lib/data-access/venue-templates.dal";
import type { CreateVenueInput } from "@/lib/validation/venues.schema";
import type { VenueTemplate } from "@/lib/data-access/venue-templates.dal";
import { ConflictError } from "@/lib/utils/errors";

/**
 * Get all venue templates for the current user
 */
export async function getVenueTemplates(): Promise<VenueTemplate[]> {
  const user = await requireActiveUser();
  return templateDAL.findByUserId(user.id);
}

/**
 * Get a single venue template by ID
 * Only returns template if it belongs to the current user
 */
export async function getVenueTemplate(templateId: string): Promise<VenueTemplate> {
  const user = await requireActiveUser();

  const template = await templateDAL.findById(templateId, user.id);

  if (!template) {
    throw new Error("Template not found or you don't have permission to access it");
  }

  return template;
}

/**
 * Save a venue as a template
 * Creates a new template with the venue data
 */
export async function saveVenueAsTemplate(name: string, venueData: CreateVenueInput): Promise<VenueTemplate> {
  const user = await requireActiveUser();

  // Validate template name
  if (!name || name.trim().length === 0) {
    throw new Error("Template name is required");
  }

  if (name.length > 200) {
    throw new Error("Template name must be less than 200 characters");
  }

  // Enforce maximum number of templates per user (business rule)
  const existingTemplates = await templateDAL.findByUserId(user.id);
  const MAX_TEMPLATES_PER_USER = 5;

  if (existingTemplates.length >= MAX_TEMPLATES_PER_USER) {
    throw new ConflictError(
      `You have reached the maximum number of venue templates (${MAX_TEMPLATES_PER_USER}). Please delete an existing template before creating a new one.`
    );
  }

  return templateDAL.insert(user.id, name.trim(), venueData);
}

/**
 * Load a venue template
 * Returns the template data that can be used to pre-fill a venue form
 */
export async function loadVenueTemplate(templateId: string): Promise<CreateVenueInput> {
  const user = await requireActiveUser();

  const template = await templateDAL.findById(templateId, user.id);

  if (!template) {
    throw new Error("Template not found or you don't have permission to access it");
  }

  return template.template_data;
}

/**
 * Update a venue template
 */
export async function updateVenueTemplate(
  templateId: string,
  updates: { name?: string; template_data?: CreateVenueInput }
): Promise<VenueTemplate> {
  const user = await requireActiveUser();

  if (updates.name !== undefined) {
    if (!updates.name || updates.name.trim().length === 0) {
      throw new Error("Template name is required");
    }
    if (updates.name.length > 200) {
      throw new Error("Template name must be less than 200 characters");
    }
  }

  return templateDAL.update(templateId, user.id, updates);
}

/**
 * Delete a venue template
 */
export async function deleteVenueTemplate(templateId: string): Promise<void> {
  const user = await requireActiveUser();
  return templateDAL.deleteTemplate(templateId, user.id);
}

// Export as namespace for easier imports
export const venueTemplateService = {
  getVenueTemplates,
  getVenueTemplate,
  saveVenueAsTemplate,
  loadVenueTemplate,
  updateVenueTemplate,
  deleteVenueTemplate,
};
