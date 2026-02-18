/**
 * DJ Service
 *
 * Business logic for DJ operations.
 * Only global_director can create, update, delete, activate, deactivate.
 * Everyone (authenticated) can list and view DJs.
 */

import { NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import * as djDAL from "@/lib/data-access/djs.dal";
import type { CreateDjInput, UpdateDjInput } from "@/lib/validation/djs.schema";
import { requireActiveUser } from "@/lib/auth/server";
import { isGlobalDirector } from "@/lib/permissions/roles";
import * as emailService from "@/lib/services/email/email.service";
import type { DJ } from "@/lib/types/database.types";

/**
 * Get DJs with filters (everyone can see; default active, non-deleted)
 */
export async function getDjsWithFilters(filters: djDAL.DJFilterOptions): Promise<djDAL.PaginatedDJs> {
  await requireActiveUser();
  return djDAL.findAll(filters);
}

/**
 * Get all active DJs for selection (e.g. event form)
 */
export async function getActiveDjs(search?: string): Promise<DJ[]> {
  await requireActiveUser();
  return djDAL.findAllActive(search);
}

/**
 * Get a single DJ by ID / UUID (internal use).
 */
export async function getDjById(id: string): Promise<DJ> {
  await requireActiveUser();
  const dj = await djDAL.findById(id);
  if (!dj) {
    throw new NotFoundError("DJ", id);
  }
  if (dj.deleted_at) {
    throw new NotFoundError("DJ", id);
  }
  return dj;
}

/**
 * Get a single DJ by short_id (for URLs and API).
 */
export async function getDjByShortId(shortId: string): Promise<DJ> {
  await requireActiveUser();
  const dj = await djDAL.findByShortId(shortId);
  if (!dj) {
    throw new NotFoundError("DJ", shortId);
  }
  if (dj.deleted_at) {
    throw new NotFoundError("DJ", shortId);
  }
  return dj;
}

/**
 * Create a new DJ. Only global_director. Sends email to DJ.
 */
export async function createDj(input: CreateDjInput): Promise<DJ> {
  const user = await requireActiveUser();
  if (!(await isGlobalDirector(user.id))) {
    throw new ForbiddenError("Only Global Directors can add DJs");
  }

  const dj = await djDAL.insert({
    name: input.name.trim(),
    picture_url: input.picture_url ?? null,
    music_style: input.music_style?.trim() || null,
    price: input.price ?? null,
    email: input.email.trim(),
    email_verified: false,
    technical_rider: input.technical_rider ?? [],
    hospitality_rider: input.hospitality_rider ?? [],
    is_active: true,
    deleted_at: null,
  });

  try {
    await emailService.sendDjAddedEmail(dj.name, dj.email);
  } catch (e) {
    console.error("Failed to send DJ added email:", e);
    // Don't fail create; email is best-effort
  }

  return dj;
}

/**
 * Update a DJ by short_id. Only global_director.
 */
export async function updateDj(shortId: string, input: UpdateDjInput): Promise<DJ> {
  const user = await requireActiveUser();
  if (!(await isGlobalDirector(user.id))) {
    throw new ForbiddenError("Only Global Directors can edit DJs");
  }

  const existing = await djDAL.findByShortId(shortId);
  if (!existing || existing.deleted_at) {
    throw new NotFoundError("DJ", shortId);
  }

  return djDAL.update(existing.id, {
    ...(input.name !== undefined && { name: input.name.trim() }),
    ...(input.picture_url !== undefined && { picture_url: input.picture_url }),
    ...(input.music_style !== undefined && { music_style: input.music_style?.trim() || null }),
    ...(input.price !== undefined && { price: input.price }),
    ...(input.email !== undefined && { email: input.email.trim() }),
    ...(input.technical_rider !== undefined && { technical_rider: input.technical_rider }),
    ...(input.hospitality_rider !== undefined && { hospitality_rider: input.hospitality_rider }),
  });
}

/**
 * Soft delete a DJ by short_id. Only global_director.
 */
export async function deleteDj(shortId: string): Promise<void> {
  const user = await requireActiveUser();
  if (!(await isGlobalDirector(user.id))) {
    throw new ForbiddenError("Only Global Directors can delete DJs");
  }

  const existing = await djDAL.findByShortId(shortId);
  if (!existing) {
    throw new NotFoundError("DJ", shortId);
  }

  await djDAL.softDelete(existing.id);
}

/**
 * Deactivate a DJ by short_id. Only global_director.
 */
export async function deactivateDj(shortId: string): Promise<void> {
  const user = await requireActiveUser();
  if (!(await isGlobalDirector(user.id))) {
    throw new ForbiddenError("Only Global Directors can deactivate DJs");
  }

  const existing = await djDAL.findByShortId(shortId);
  if (!existing || existing.deleted_at) {
    throw new NotFoundError("DJ", shortId);
  }

  await djDAL.deactivate(existing.id);
}

/**
 * Activate a DJ by short_id. Only global_director.
 */
export async function activateDj(shortId: string): Promise<void> {
  const user = await requireActiveUser();
  if (!(await isGlobalDirector(user.id))) {
    throw new ForbiddenError("Only Global Directors can activate DJs");
  }

  const existing = await djDAL.findByShortId(shortId);
  if (!existing || existing.deleted_at) {
    throw new NotFoundError("DJ", shortId);
  }

  await djDAL.activate(existing.id);
}
