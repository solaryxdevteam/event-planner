/**
 * User Roles Enum
 *
 * Centralized definition of all user roles in the system
 * Used for type safety and consistency across the application
 */

export enum UserRole {
  EVENT_PLANNER = "event_planner",
  CITY_CURATOR = "city_curator",
  REGIONAL_CURATOR = "regional_curator",
  LEAD_CURATOR = "lead_curator",
  GLOBAL_DIRECTOR = "global_director",
  MARKETING_MANAGER = "marketing_manager",
}

/**
 * Role display labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.EVENT_PLANNER]: "Event Planner",
  [UserRole.CITY_CURATOR]: "City Curator",
  [UserRole.REGIONAL_CURATOR]: "Regional Curator",
  [UserRole.LEAD_CURATOR]: "Lead Curator",
  [UserRole.GLOBAL_DIRECTOR]: "Global Director",
  [UserRole.MARKETING_MANAGER]: "Marketing Manager",
};

/**
 * Role options for select components
 */
export const ROLE_OPTIONS = Object.values(UserRole).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));
