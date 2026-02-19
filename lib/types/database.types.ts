/**
 * Database Types
 * Generated from Supabase schema
 * These types represent the database structure from 001_initial_schema.sql
 */

// =============================================
// ENUMS
// =============================================

export type Role =
  | "event_planner"
  | "city_curator"
  | "regional_curator"
  | "lead_curator"
  | "global_director"
  | "marketing_manager";

export type EventStatus =
  | "draft"
  | "in_review"
  | "rejected"
  | "approved_scheduled"
  | "completed_awaiting_report"
  | "completed_archived"
  | "cancelled";

export type ApprovalStatus = "waiting" | "pending" | "approved" | "rejected";

export type ApprovalType = "event" | "modification" | "cancellation" | "report" | "marketing_report";

export type ActionType =
  | "create_draft"
  | "create_event_as_approved"
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
  | "ban_venue"
  | "approve_venue"
  | "reject_venue";

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
  city: string | null;
  phone: string | null;
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

/** Media item: photo or video with optional cover flag */
export interface VenueMediaItem {
  url: string;
  type: "photo" | "video";
  isCover?: boolean;
}

export interface Venue {
  id: string;
  short_id: string | null;
  name: string;
  address: string;
  street: string | null;
  city: string;
  country: string;
  country_id: string | null;
  location_lat: number | null;
  location_lng: number | null;
  total_capacity: number | null;
  number_of_tables: number | null;
  ticket_capacity: number | null;
  sounds: string | null;
  lights: string | null;
  screens: string | null;
  /** URLs only (legacy) or { url, name? }[] for display of original file names */
  floor_plans: (string | { url: string; name?: string })[] | null;
  contact_person_name: string | null;
  contact_email: string | null;
  contact_email_verified: boolean;
  media: VenueMediaItem[] | null;
  creator_id: string;
  is_active: boolean;
  approval_status: "pending" | "approved" | "rejected";
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueContactVerification {
  id: string;
  venue_id: string;
  token: string;
  token_expires_at: string;
  otp_hash: string;
  otp_expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface DjContactVerification {
  id: string;
  dj_id: string;
  token: string;
  token_expires_at: string;
  otp_hash: string;
  otp_expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export interface VenueApproval {
  id: string;
  venue_id: string;
  approver_id: string;
  status: ApprovalStatus;
  sequence_order: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/** Rider file item: url + type (photo, video, or file) */
export interface DJRiderFile {
  url: string;
  type: "photo" | "video" | "file";
}

export interface DJ {
  id: string;
  short_id: string;
  name: string;
  picture_url: string | null;
  music_style: string | null;
  price: number | null;
  email: string;
  email_verified: boolean;
  technical_rider: DJRiderFile[];
  hospitality_rider: DJRiderFile[];
  is_active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Marketing asset file: url + optional display name */
export interface EventMarketingFile {
  url: string;
  name?: string;
}

export interface Event {
  id: string;
  short_id: string;
  title: string;
  starts_at: string | null; // ISO datetime string (no ends_at; transition 5h after start)
  venue_id: string | null;
  dj_id: string | null;
  creator_id: string;
  status: EventStatus;
  expected_attendance: number | null;
  minimum_ticket_price: number | null;
  minimum_table_price: number | null;
  notes: string | null;
  marketing_flyers?: EventMarketingFile[];
  marketing_videos?: EventMarketingFile[];
  marketing_budget?: number | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingReport {
  id: string;
  event_id: string;
  submitted_by: string;
  status: ApprovalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Marketing report with submitter display name (from API list) */
export interface MarketingReportWithSubmitter extends MarketingReport {
  submitted_by_name?: string | null;
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
  feedback: string | null;
  media_urls: string[];
  external_links: Array<{ url: string; title: string }>;
  status: ApprovalStatus;
  total_ticket_sales: number | null;
  total_bar_sales: number | null;
  total_table_sales: number | null;
  reels_urls: string[];
  detailed_report: string | null;
  incidents: string | null;
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
    marketing_manager?: boolean;
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

export type VerificationOtpContextType = "event_approval" | "venue_approval" | "venue_create" | "event_create";

export type VerificationOtpAction = "approve" | "reject" | "create";

export interface VerificationOtp {
  id: string;
  user_id: string;
  code_hash: string;
  context_type: VerificationOtpContextType;
  context_id: string;
  action: VerificationOtpAction;
  expires_at: string;
  used_at: string | null;
  one_time_token: string | null;
  token_expires_at: string | null;
  created_at: string;
}

export interface UserEmailVerificationOtp {
  id: string;
  user_id: string;
  email: string;
  otp_hash: string;
  expires_at: string;
  verified_at: string | null;
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
        Insert: Omit<Venue, "id" | "created_at" | "updated_at" | "deleted_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Omit<Venue, "id" | "created_at">>;
      };
      djs: {
        Row: DJ;
        Insert: Omit<DJ, "id" | "created_at" | "updated_at" | "short_id"> & {
          id?: string;
          short_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DJ, "id" | "created_at">>;
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
      venue_approvals: {
        Row: VenueApproval;
        Insert: Omit<VenueApproval, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<VenueApproval, "id" | "created_at">>;
      };
      venue_contact_verifications: {
        Row: VenueContactVerification;
        Insert: Omit<VenueContactVerification, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<VenueContactVerification, "id" | "created_at">>;
      };
      dj_contact_verifications: {
        Row: DjContactVerification;
        Insert: Omit<DjContactVerification, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DjContactVerification, "id" | "created_at">>;
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
      marketing_reports: {
        Row: MarketingReport;
        Insert: Omit<MarketingReport, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<MarketingReport, "id" | "created_at">>;
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
      verification_otps: {
        Row: VerificationOtp;
        Insert: Omit<VerificationOtp, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<VerificationOtp, "id" | "created_at">>;
      };
      user_email_verification_otps: {
        Row: UserEmailVerificationOtp;
        Insert: Omit<UserEmailVerificationOtp, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<UserEmailVerificationOtp, "id" | "created_at">>;
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
