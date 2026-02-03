/**
 * Database Types
 * Generated from Supabase schema
 * These types represent the database structure from 001_initial_schema.sql
 */

// =============================================
// ENUMS
// =============================================

export type Role = "event_planner" | "city_curator" | "regional_curator" | "lead_curator" | "global_director";

export type EventStatus =
  | "draft"
  | "in_review"
  | "rejected"
  | "approved_scheduled"
  | "completed_awaiting_report"
  | "completed_archived"
  | "cancelled";

export type ApprovalStatus = "waiting" | "pending" | "approved" | "rejected";

export type ApprovalType = "event" | "modification" | "cancellation" | "report";

export type ActionType =
  | "create_draft"
  | "submit_for_approval"
  | "approve"
  | "reject"
  | "request_modification"
  | "approve_modification"
  | "reject_modification"
  | "request_cancellation"
  | "approve_cancellation"
  | "reject_cancellation"
  | "submit_report"
  | "approve_report"
  | "reject_report"
  | "update_event"
  | "delete_draft"
  | "create_user"
  | "update_user"
  | "deactivate_user"
  | "create_venue"
  | "update_venue"
  | "delete_venue"
  | "ban_venue";

export type UserStatus = "pending" | "active" | "inactive";

// =============================================
// TABLE TYPES
// =============================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string | null;
  role: Role;
  parent_id: string | null;
  country_id: string;
  state_id: string | null;
  city: string | null;
  phone: string | null;
  company: string | null;
  status: UserStatus;
  is_active: boolean;
  avatar_url: string | null;
  notification_prefs?: {
    email_enabled: boolean;
    frequency?: "instant" | "daily" | "weekly";
    /** Email when my event is approved */
    event_approved?: boolean;
    /** Email when my event is rejected */
    event_rejected?: boolean;
    /** Email when a report is due for my event */
    report_due?: boolean;
    /** Email when reports need my approval (Global Directors) */
    reports_pending_approval?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  short_id: string | null; // Unique short identifier for URL
  name: string;
  address: string; // Full address (kept for backward compatibility)
  street: string | null; // Street address
  city: string;
  state: string | null; // State/Province (kept for backward compatibility)
  country: string; // Country (kept for backward compatibility)
  country_id: string | null; // Country ID from locations table
  state_id: string | null; // State ID from locations table
  location_lat: number | null;
  location_lng: number | null;
  // Step 2 fields
  capacity_standing: number | null;
  capacity_seated: number | null;
  available_rooms_halls: string | null;
  technical_specs: {
    sound?: boolean;
    lights?: boolean;
    screens?: boolean;
    [key: string]: unknown;
  } | null;
  availability_start_date: string | null; // ISO date string
  availability_end_date: string | null; // ISO date string
  base_pricing: number | null; // DECIMAL as number
  // Step 3 fields
  contact_person_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  restrictions: string | null;
  images: string[] | null; // Array of image URLs
  creator_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  short_id: string;
  title: string;
  description: string | null;
  starts_at: string | null; // ISO datetime string
  ends_at: string | null; // ISO datetime string
  venue_id: string | null;
  creator_id: string;
  status: EventStatus;
  expected_attendance: number | null;
  budget_amount: number | null;
  budget_currency: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventVersion {
  id: string;
  event_id: string;
  version_number: number;
  version_data: Record<string, unknown>;
  status: EventStatus;
  change_reason: string | null;
  created_at: string;
}

export interface EventApproval {
  id: string;
  event_id: string;
  approver_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  sequence_order: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  event_id: string;
  attendance_count: number;
  summary: string;
  feedback: string | null;
  media_urls: string[];
  external_links: Array<{ url: string; title: string }>;
  status: ApprovalStatus;
  net_profit: number | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  event_id: string | null;
  user_id: string | null;
  action_type: ActionType;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  template_data: Record<string, unknown>;
  created_at: string;
}

export interface ApprovalConfig {
  id: string;
  config_data: {
    event_planner: boolean;
    city_curator: boolean;
    regional_curator: boolean;
    lead_curator: boolean;
    global_director: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: "country" | "state" | "city";
  parent_id: string | null;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  token: string;
  email: string;
  country_id: string;
  created_by: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// =============================================
// DATABASE SCHEMA TYPE
// =============================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<User, "id" | "created_at">>;
      };
      venues: {
        Row: Venue;
        Insert: Omit<Venue, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Venue, "id" | "created_at">>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Event, "id" | "created_at">>;
      };
      event_versions: {
        Row: EventVersion;
        Insert: Omit<EventVersion, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<EventVersion, "id" | "created_at">>;
      };
      event_approvals: {
        Row: EventApproval;
        Insert: Omit<EventApproval, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<EventApproval, "id" | "created_at">>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Report, "id" | "created_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: never; // Audit logs are immutable
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Template, "id" | "created_at">>;
      };
      approval_configs: {
        Row: ApprovalConfig;
        Insert: Omit<ApprovalConfig, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ApprovalConfig, "id" | "created_at">>;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Invitation, "id" | "created_at">>;
      };
      locations: {
        Row: Location;
        Insert: Omit<Location, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Location, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
      event_status: EventStatus;
      approval_status: ApprovalStatus;
      approval_type: ApprovalType;
      action_type: ActionType;
      user_status: UserStatus;
    };
  };
}
