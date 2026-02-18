/**
 * User Service
 *
 * Business logic for user management operations
 */

import { createClient } from "@/lib/supabase/server";
import * as usersDal from "@/lib/data-access/users.dal";
import * as hierarchyService from "./hierarchy.service";
import * as invitationsDal from "@/lib/data-access/invitations.dal";
import * as invitationsService from "../invitations/invitation.service";
import * as passwordService from "../auth/password.service";
import * as emailService from "../email/email.service";
import { getVisibleUserIds } from "@/lib/permissions/pyramid";
import type {
  CreateUserInput,
  UpdateUserInput,
  RegisterWithInvitationInput,
  ActivateUserInput,
  Role,
} from "@/lib/validation/users.schema";
import type { Database } from "@/lib/types/database.types";
import { UserRole } from "@/lib/types/roles";

type User = Database["public"]["Tables"]["users"]["Row"];

/**
 * Password for creating Global Director (should be environment variable in production)
 */
const GLOBAL_DIRECTOR_PASSWORD = process.env.GLOBAL_DIRECTOR_PASSWORD || "SecurePassword123!";

/**
 * Get minimal user info by ID (Global Director only, for combobox display)
 */
export async function getUserMinimal(
  userId: string
): Promise<Pick<User, "id" | "first_name" | "last_name" | "email" | "role"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Pick<User, "id" | "first_name" | "last_name" | "email" | "role">;
}

/**
 * Creator profile for event display (avatar, name, email, phone).
 * Allowed when requester can view the target user (pyramid visibility).
 */
export interface CreatorProfileInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
}

export async function getUserCreatorProfile(requesterId: string, userId: string): Promise<CreatorProfileInfo | null> {
  const { canViewData } = await import("@/lib/permissions/pyramid");
  const canView = await canViewData(requesterId, userId);
  if (!canView) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, avatar_url")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  const row = data as Pick<User, "id" | "first_name" | "last_name" | "email" | "phone" | "avatar_url">;
  const name = row.last_name ? `${row.first_name} ${row.last_name}`.trim() : row.first_name.trim();
  return {
    id: row.id,
    name,
    email: row.email,
    phone: row.phone ?? null,
    avatar_url: row.avatar_url ?? null,
  };
}

/**
 * Get all users (Global Director only)
 *
 * @param requesterId - ID of user making the request
 * @returns Array of all users
 * @throws Error if requester is not Global Director
 */
export async function getAllUsers(requesterId: string): Promise<User[]> {
  const supabase = await createClient();

  // Check if requester is Global Director
  const { data: requester, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (error || !requester) {
    throw new Error("Failed to verify permissions");
  }

  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can view all users");
  }

  return usersDal.findAllUnfiltered();
}

/**
 * Get paginated users with search and filters (Global Director only)
 *
 * @param requesterId - ID of user making the request
 * @param options - Pagination and filter options
 * @returns Paginated users and total count
 * @throws Error if requester is not Global Director
 */
export async function getAllUsersPaginated(
  requesterId: string,
  options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    roleFilter?: string | null;
    statusFilter?: "pending" | "active" | "inactive" | null;
    includeInactive?: boolean;
  }
): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  // Check if requester is Global Director
  const { data: requester, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (error || !requester) {
    throw new Error("Failed to verify permissions");
  }

  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can view all users");
  }

  return usersDal.findAllUnfilteredPaginated({
    page: options?.page,
    limit: options?.limit,
    searchQuery: options?.searchQuery,
    roleFilter: options?.roleFilter as Role | null | undefined,
    statusFilter: options?.statusFilter,
    includeInactive: options?.includeInactive,
  });
}

/**
 * Get paginated users for the requester: all users for Global Director, pyramid only for others
 *
 * @param requesterId - ID of user making the request
 * @param options - Pagination and filter options
 * @returns Paginated users and total count
 */
export async function getUsersPaginatedForRequester(
  requesterId: string,
  options?: {
    page?: number;
    limit?: number;
    searchQuery?: string;
    roleFilter?: string | null;
    statusFilter?: "pending" | "active" | "inactive" | null;
    includeInactive?: boolean;
  }
): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  const { data: requester, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (error || !requester) {
    throw new Error("Failed to verify permissions");
  }

  if (requester.role === UserRole.GLOBAL_DIRECTOR) {
    return getAllUsersPaginated(requesterId, options);
  }

  const visibleUserIds = await getVisibleUserIds(requesterId);
  return usersDal.findAllPaginated(visibleUserIds, {
    page: options?.page,
    limit: options?.limit,
    searchQuery: options?.searchQuery,
    roleFilter: options?.roleFilter as Role | null | undefined,
    statusFilter: options?.statusFilter,
    includeInactive: options?.includeInactive,
  });
}

/**
 * Create a new user
 *
 * @param requesterId - ID of user making the request
 * @param data - User data
 * @returns Created user
 * @throws Error if validation fails or requester lacks permissions
 */
export async function createUser(requesterId: string, data: CreateUserInput): Promise<User> {
  const supabase = await createClient();

  // Get requester details
  const { data: requester, error: requesterError } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (requesterError || !requester) {
    throw new Error("Failed to verify permissions");
  }

  // Only Global Directors can create users
  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can create users");
  }

  // Validate parent_id if provided
  if (data.parent_id) {
    const validation = await hierarchyService.validateParentAssignment(
      "new-user", // Temporary ID for new user
      data.parent_id
    );

    if (!validation.valid) {
      throw new Error(validation.error || "Invalid parent assignment");
    }
  }

  // Role-based validation: ensure parent exists and is appropriate for the role
  if (data.role !== UserRole.GLOBAL_DIRECTOR && !data.parent_id) {
    throw new Error("Non-Global Director roles must have a parent");
  }

  if (data.role === UserRole.GLOBAL_DIRECTOR && data.parent_id) {
    throw new Error("Global Director cannot have a parent");
  }

  // Check if email already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("email", data.email).maybeSingle();

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Get default US country ID if country_id not provided
  let countryId = data.country_id;
  if (!countryId) {
    const { data: usCountry }: { data: { id: string } | null } = await supabase
      .from("locations")
      .select("id")
      .eq("type", "country")
      .eq("code", "US")
      .single();

    if (!usCountry) {
      throw new Error("US country not found in locations table");
    }
    countryId = usCountry.id;
  }

  // Create user record (Supabase Auth user will be created when they log in via magic link)
  const newUser = await usersDal.insert({
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name || null,
    role: data.role,
    parent_id: data.parent_id || null,
    country_id: countryId as string,
    city: data.city || null,
    status: "pending" as const,
    phone: null,
    is_active: true,
    avatar_url: null,
    notification_prefs: null,
  });

  // await emailService.sendInvitation(newUser.email);

  return newUser;
}

/**
 * Update an existing user
 *
 * @param requesterId - ID of user making the request
 * @param userId - ID of user to update
 * @param data - Fields to update
 * @returns Updated user
 * @throws Error if validation fails or requester lacks permissions
 */
export async function updateUser(requesterId: string, userId: string, data: UpdateUserInput): Promise<User> {
  const supabase = await createClient();

  // Get requester details
  const { data: requester, error: requesterError } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (requesterError || !requester) {
    throw new Error("Failed to verify permissions");
  }

  // Only Global Directors can update users (for now)
  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can update users");
  }

  // Get user being updated
  const { data: userToUpdate, error: userError }: { data: User | null; error: Error | null } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (userError || !userToUpdate) {
    throw new Error("User not found");
  }

  // Validate parent_id if being changed
  if (data.parent_id !== undefined) {
    const validation = await hierarchyService.validateParentAssignment(userId, data.parent_id);

    if (!validation.valid) {
      throw new Error(validation.error || "Invalid parent assignment");
    }
  }

  // Role-based validation
  if (data.role && data.role !== userToUpdate.role) {
    // Prevent removing the last Global Director
    if (userToUpdate.role === UserRole.GLOBAL_DIRECTOR) {
      const { data: globalDirectors } = await supabase
        .from("users")
        .select("id")
        .eq("role", UserRole.GLOBAL_DIRECTOR)
        .eq("is_active", true);

      if (globalDirectors && globalDirectors.length === 1) {
        throw new Error("Cannot change role of the last Global Director");
      }
    }

    // Ensure role change is compatible with parent
    if (data.role === UserRole.GLOBAL_DIRECTOR && userToUpdate.parent_id) {
      throw new Error("Global Director cannot have a parent");
    }
  }

  // Handle password update separately if provided
  const { password, notification_prefs, ...userUpdateData } = data;
  if (password) {
    await passwordService.updatePassword(userId, password);
  }

  // When email is changed, update Supabase Auth so the user can sign in with the new email
  if (userUpdateData.email !== undefined) {
    const newEmail = userUpdateData.email.trim().toLowerCase();
    const currentEmail = (userToUpdate.email ?? "").trim().toLowerCase();
    if (newEmail !== currentEmail) {
      await passwordService.updateAuthEmail(userId, newEmail);
    }
    userUpdateData.email = newEmail;
  }

  // Transform notification_prefs if provided (schema uses 'email', DB uses 'email_enabled')
  const updateData: typeof userUpdateData & {
    notification_prefs?: { email_enabled: boolean; frequency: "instant" | "daily" | "weekly" } | null;
  } = {
    ...userUpdateData,
    ...(notification_prefs
      ? {
          notification_prefs: {
            email_enabled: notification_prefs.email,
            frequency: notification_prefs.frequency,
          },
        }
      : {}),
  };

  return usersDal.update(userId, updateData);
}

/**
 * Deactivate a user (soft delete)
 *
 * @param requesterId - ID of user making the request
 * @param userId - ID of user to deactivate
 * @throws Error if requester lacks permissions or action is not allowed
 */
export async function deactivateUser(requesterId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  // Get requester details
  const { data: requester, error: requesterError } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (requesterError || !requester) {
    throw new Error("Failed to verify permissions");
  }

  // Only Global Directors can deactivate users
  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can deactivate users");
  }

  // Cannot deactivate self
  if (requesterId === userId) {
    throw new Error("Cannot deactivate your own account");
  }

  // Get user being deactivated
  const { data: userToDeactivate, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single<{ role: UserRole }>();

  if (userError || !userToDeactivate) {
    throw new Error("User not found");
  }

  // Prevent deactivating the last Global Director
  if (userToDeactivate.role === UserRole.GLOBAL_DIRECTOR) {
    const { data: globalDirectors } = await supabase
      .from("users")
      .select("id")
      .eq("role", UserRole.GLOBAL_DIRECTOR)
      .eq("is_active", true);

    if (globalDirectors && globalDirectors.length === 1) {
      throw new Error("Cannot deactivate the last Global Director");
    }
  }

  await usersDal.deactivate(userId);
}

/**
 * Check Global Director password for confirmation
 *
 * @param password - Password to check
 * @returns True if password is correct
 */
export async function checkGlobalDirectorPassword(password: string): Promise<boolean> {
  return password === GLOBAL_DIRECTOR_PASSWORD;
}

/**
 * Get role hierarchy level (higher number = higher authority)
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    [UserRole.EVENT_PLANNER]: 1,
    [UserRole.CITY_CURATOR]: 2,
    [UserRole.REGIONAL_CURATOR]: 3,
    [UserRole.LEAD_CURATOR]: 4,
    [UserRole.GLOBAL_DIRECTOR]: 5,
    [UserRole.MARKETING_MANAGER]: 1,
  };
  return levels[role] ?? 0;
}

/**
 * Create a user directly (Global Director creates user with password)
 * User is immediately active
 *
 * @param creatorId - ID of Global Director creating the user
 * @param data - User data
 * @param password - User password
 * @returns Created user
 * @throws Error if validation fails or creator lacks permissions
 */
export async function createUserDirectly(creatorId: string, data: CreateUserInput, password: string): Promise<User> {
  const supabase = await createClient();

  // Verify creator is Global Director
  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", creatorId)
    .single<{ role: UserRole }>();

  if (creatorError || !creator) {
    throw new Error("Failed to verify permissions");
  }

  if (creator.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can create users directly");
  }

  // Validate parent_id if provided
  if (data.parent_id) {
    const validation = await hierarchyService.validateParentAssignment("new-user", data.parent_id);
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid parent assignment");
    }
  }

  // Role-based validation
  if (data.role !== UserRole.GLOBAL_DIRECTOR && !data.parent_id) {
    throw new Error("Non-Global Director roles must have a parent");
  }

  if (data.role === UserRole.GLOBAL_DIRECTOR && data.parent_id) {
    throw new Error("Global Director cannot have a parent");
  }

  // Check if email already exists
  const { data: existingUser } = await supabase.from("users").select("id").eq("email", data.email).maybeSingle();

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Get default US country ID if country_id not provided
  let countryId = data.country_id;
  if (!countryId) {
    const { data: usCountry }: { data: { id: string } | null } = await supabase
      .from("locations")
      .select("id")
      .eq("type", "country")
      .eq("code", "US")
      .single();

    if (!usCountry) {
      throw new Error("US country not found in locations table");
    }
    countryId = usCountry.id;
  }

  // Construct full name for auth user metadata
  const fullName = data.last_name ? `${data.first_name} ${data.last_name}` : data.first_name;

  // Create auth user with password
  const authUserId = await passwordService.createAuthUser(data.email, password, {
    name: fullName,
  });

  // Create user record in database
  const newUser = await usersDal.insert({
    id: authUserId,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name || null,
    role: data.role,
    parent_id: data.parent_id || null,
    country_id: countryId as string,
    city: data.city || null,
    phone: data.phone || null,
    status: "active",
    is_active: true,
    avatar_url: null,
  });

  // Get creator name for email
  const { data: creatorData }: { data: { first_name: string; last_name: string | null } | null } = await supabase
    .from("users")
    .select("first_name, last_name")
    .eq("id", creatorId)
    .single();

  // Send congratulation email
  try {
    const creatorName = creatorData
      ? creatorData.last_name
        ? `${creatorData.first_name} ${creatorData.last_name}`
        : creatorData.first_name
      : "Administrator";
    await emailService.sendUserCreatedCongratulationEmail(newUser, creatorName);
  } catch (error) {
    // Log error but don't fail user creation
    console.error("Failed to send user created email:", error);
  }

  return newUser;
}

/**
 * Register a user with an invitation token
 * User status is 'pending' and must be activated by Global Director
 *
 * @param token - Invitation token
 * @param registrationData - Registration data (name, email, phone, password)
 * @returns Created user (status: pending)
 * @throws Error if invitation is invalid or registration fails
 */
export async function registerWithInvitation(
  token: string,
  registrationData: RegisterWithInvitationInput
): Promise<User> {
  // Validate invitation
  const invitation = await invitationsService.validateInvitation(token);

  if (!invitation) {
    throw new Error("Invalid or expired invitation token");
  }

  // Verify email matches invitation
  if (invitation.email !== registrationData.email) {
    throw new Error("Email does not match invitation");
  }

  // Check if user already exists
  const supabase = await createClient();
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", registrationData.email)
    .maybeSingle();

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  // Create auth user with password
  const fullName = registrationData.last_name
    ? `${registrationData.first_name} ${registrationData.last_name}`
    : registrationData.first_name;
  const authUserId = await passwordService.createAuthUser(registrationData.email, registrationData.password, {
    name: fullName,
  });

  // Create user record in database (status: pending, country from invitation)
  const newUser = await usersDal.insert({
    id: authUserId,
    email: registrationData.email,
    first_name: registrationData.first_name,
    last_name: registrationData.last_name || null,
    role: UserRole.EVENT_PLANNER, // Default role, can be changed on activation
    parent_id: null, // Will be assigned on activation
    country_id: invitation.country_id, // From invitation
    city: registrationData.city || null,
    phone: registrationData.phone || null,
    status: "pending",
    is_active: false, // Inactive until activated
    avatar_url: null,
  });

  // Mark invitation as used
  await invitationsDal.markAsUsed(token);

  // Send email verification OTP (user must verify to activate account)
  try {
    const { createAndSendOtp } = await import("../user-email-verification.service");
    await createAndSendOtp(newUser.id, newUser.email);
  } catch (error) {
    console.error("Failed to send verification OTP email:", error);
    // Don't fail registration; user can request resend from verify page if we add that later
  }

  return newUser;
}

/**
 * Activate a user and assign role/permissions
 * Only Global Directors can activate users
 *
 * @param creatorId - ID of Global Director activating the user
 * @param data - Activation data (userId, role, country_id, city)
 * @returns Activated user
 * @throws Error if validation fails or creator lacks permissions
 */
export async function activateUser(creatorId: string, data: ActivateUserInput): Promise<User> {
  const supabase = await createClient();

  // Verify creator is Global Director
  const { data: creator, error: creatorError } = await supabase
    .from("users")
    .select("role")
    .eq("id", creatorId)
    .single<{ role: UserRole }>();

  if (creatorError || !creator) {
    throw new Error("Failed to verify permissions");
  }

  if (creator.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can activate users");
  }

  // Get user to activate
  const { data: userToActivate, error: userError }: { data: User | null; error: Error | null } = await supabase
    .from("users")
    .select("*")
    .eq("id", data.userId)
    .single();

  if (userError || !userToActivate) {
    throw new Error("User not found");
  }

  // Update user: activate and assign role/permissions
  const updates: Partial<UpdateUserInput> = {
    status: "active",
    is_active: true,
  };

  if (data.role) {
    updates.role = data.role;

    // If role requires a parent, validate and assign parent
    if (data.role !== UserRole.GLOBAL_DIRECTOR) {
      // Validate parent_id if provided
      if (data.parent_id) {
        const validation = await hierarchyService.validateParentAssignment(data.userId, data.parent_id);
        if (!validation.valid) {
          throw new Error(validation.error || "Invalid parent assignment");
        }
        updates.parent_id = data.parent_id;
      } else {
        // If no parent_id provided and user doesn't have one, require it
        if (!userToActivate.parent_id) {
          throw new Error("Non-Global Director roles must have a parent assigned");
        }
        // Keep existing parent_id if not provided
      }
    } else {
      // Global Director cannot have a parent
      updates.parent_id = null;
    }
  }

  // Note: country_id and city are not updated during activation
  // They are set during registration and can be edited later via the user edit form

  // Transform notification_prefs if present (schema uses 'email', DB uses 'email_enabled')
  const { notification_prefs, ...updatesWithoutPrefs } = updates;
  const finalUpdates: typeof updatesWithoutPrefs & {
    notification_prefs?: { email_enabled: boolean; frequency: "instant" | "daily" | "weekly" } | null;
  } = {
    ...updatesWithoutPrefs,
    ...(notification_prefs
      ? {
          notification_prefs: {
            email_enabled: notification_prefs.email,
            frequency: notification_prefs.frequency,
          },
        }
      : {}),
  };

  return usersDal.update(data.userId, finalUpdates);
}

const ROLE_HIERARCHY_PARENTS: Record<string, string[]> = {
  [UserRole.EVENT_PLANNER]: [
    UserRole.CITY_CURATOR,
    UserRole.REGIONAL_CURATOR,
    UserRole.LEAD_CURATOR,
    UserRole.GLOBAL_DIRECTOR,
  ],
  [UserRole.CITY_CURATOR]: [UserRole.REGIONAL_CURATOR, UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
  [UserRole.REGIONAL_CURATOR]: [UserRole.LEAD_CURATOR, UserRole.GLOBAL_DIRECTOR],
  [UserRole.LEAD_CURATOR]: [UserRole.GLOBAL_DIRECTOR],
  [UserRole.GLOBAL_DIRECTOR]: [],
  [UserRole.MARKETING_MANAGER]: [UserRole.GLOBAL_DIRECTOR],
};

/**
 * Get paginated potential parents for a role (for Reports To combobox with search + scroll)
 */
export async function getPotentialParentsPaginated(
  requesterId: string,
  role: string,
  options?: {
    searchQuery?: string;
    page?: number;
    limit?: number;
    excludeUserId?: string;
  }
): Promise<{ data: User[]; total: number }> {
  const supabase = await createClient();

  const { data: requester, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", requesterId)
    .single<{ role: UserRole }>();

  if (error || !requester) {
    throw new Error("Failed to verify permissions");
  }

  if (requester.role !== UserRole.GLOBAL_DIRECTOR) {
    throw new Error("Only Global Directors can access potential parents");
  }

  const validRoles = ROLE_HIERARCHY_PARENTS[role] || [];
  return usersDal.findPotentialParentsPaginated(validRoles as Role[], {
    searchQuery: options?.searchQuery,
    page: options?.page,
    limit: options?.limit,
    excludeUserId: options?.excludeUserId,
  });
}
