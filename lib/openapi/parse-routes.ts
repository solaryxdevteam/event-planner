/**
 * Compact route table for OpenAPI generation.
 * Format per line: method|path|summary|tag[,tag]|mode
 * mode: omit = session cookie, "public" = no auth, "cron" = Bearer CRON_SECRET
 */

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type SecurityMode = "session" | "public" | "cron";

export type ParsedRoute = {
  method: HttpMethod;
  path: string;
  summary: string;
  tags: string[];
  security: SecurityMode;
};

const ROUTE_LINES = `
get|/api/events|List events with filters|Events
post|/api/events|Create event draft|Events
get|/api/events/drafts/first|Get current user first draft|Events
get|/api/events/short-id/{shortId}|Get event by short ID|Events
get|/api/events/{id}|Get event by ID|Events
put|/api/events/{id}|Update event|Events
delete|/api/events/{id}|Delete event|Events
post|/api/events/{id}/submit|Submit event for review|Events
post|/api/events/{id}/modify|Request modification flow|Events
post|/api/events/{id}/cancel|Cancel event|Events
get|/api/events/{id}/can-cancel|Check if event can be cancelled|Events
post|/api/events/{id}/transition|Transition event status|Events
get|/api/events/{id}/approvals|List approvals for event|Events
get|/api/events/{id}/versions|List event version history|Events
get|/api/events/{id}/audit-logs|List audit logs for event|Events
get|/api/events/{id}/marketing-reports|List marketing reports for event|Events
post|/api/events/{id}/marketing-reports|Create marketing report|Events
post|/api/events/{id}/marketing-assets/upload|Upload marketing asset|Events
get|/api/events/{id}/report|Get or prepare event report|Events
post|/api/events/{id}/report|Submit event report|Events
post|/api/events/{id}/report/upload|Upload report attachment|Events
post|/api/events/upload-proposed-file|Upload proposed event file|Events
get|/api/venues|List venues|Venues
post|/api/venues|Create venue|Venues
get|/api/venues/short-id/{shortId}|Get venue by short ID|Venues
post|/api/venues/check-duplicate|Check duplicate venue|Venues
get|/api/venues/templates|List venue templates|Venues
post|/api/venues/templates|Create venue template|Venues
get|/api/venues/templates/{id}|Get venue template|Venues
put|/api/venues/templates/{id}|Update venue template|Venues
delete|/api/venues/templates/{id}|Delete venue template|Venues
get|/api/venues/{id}|Get venue by ID|Venues
put|/api/venues/{id}|Update venue|Venues
delete|/api/venues/{id}|Delete venue|Venues
post|/api/venues/{id}/ban|Ban venue|Venues
post|/api/venues/{id}/unban|Unban venue|Venues
get|/api/venues/{id}/approvals|List venue approvals|Venues
get|/api/venues/{id}/upcoming-events|Upcoming events at venue|Venues
post|/api/venues/{id}/send-contact-verification|Send venue contact verification email|Venues
post|/api/venues/upload-image|Upload venue image|Venues
post|/api/venues/upload-file|Upload venue file|Venues
delete|/api/venues/delete-image|Delete venue image|Venues
get|/api/djs|List DJs|DJs
post|/api/djs|Create DJ|DJs
get|/api/djs/{id}|Get DJ by ID|DJs
put|/api/djs/{id}|Update DJ|DJs
delete|/api/djs/{id}|Delete DJ|DJs
post|/api/djs/{id}/activate|Activate DJ|DJs
post|/api/djs/{id}/deactivate|Deactivate DJ|DJs
post|/api/djs/{id}/send-verification|Send DJ verification email|DJs
post|/api/djs/upload-file|Upload DJ file|DJs
get|/api/users|List users|Users
post|/api/users|Create user|Users
get|/api/users/hierarchy|Get user hierarchy tree|Users
get|/api/users/potential-parents|List potential parent users|Users
get|/api/users/{id}|Get user by ID|Users
put|/api/users/{id}|Update user|Users
delete|/api/users/{id}|Delete user|Users
post|/api/users/{id}/activate|Activate or update user on activation|Users
get|/api/users/{id}/creator-profile|Get creator profile for user|Users
post|/api/users/check-global-director-password|Verify global director password|Users
get|/api/invitations|List invitations|Invitations
post|/api/invitations|Create invitation|Invitations
delete|/api/invitations/{id}|Revoke invitation|Invitations
post|/api/invitations/{id}/resend|Resend invitation email|Invitations
get|/api/invitations/validate|Validate invitation token|Invitations|public
get|/api/approvals|List pending approvals|Approvals
post|/api/approvals/{eventId}/approve|Approve event|Approvals
post|/api/approvals/{eventId}/reject|Reject event|Approvals
post|/api/venue-approvals/{venueId}/approve|Approve venue|VenueApprovals
post|/api/venue-approvals/{venueId}/reject|Reject venue|VenueApprovals
get|/api/reports|List reports|Reports
put|/api/reports/{id}|Update report|Reports
get|/api/calendar|Calendar data|Calendar
get|/api/dashboard/calendar|Dashboard calendar|Calendar
get|/api/locations|Locations hierarchy|Locations
get|/api/audit-logs|List audit logs|Audit
get|/api/users/profile|Get current profile|Profile
put|/api/users/profile|Update current profile|Profile
patch|/api/users/profile/notification-preferences|Update notification preferences|Profile
post|/api/users/profile/avatar|Upload profile avatar|Profile
delete|/api/users/profile/avatar|Remove profile avatar|Profile
post|/api/otp/approval/request|Request approval OTP|OTP
post|/api/otp/approval/verify|Verify approval OTP|OTP
post|/api/otp/change-email/request|Request email change OTP|OTP
post|/api/otp/change-email/verify|Verify email change OTP|OTP
post|/api/otp/user-email-verification/resend|Resend registration email verification|OTP|public
post|/api/otp/user-email-verification/verify|Verify registration email|OTP|public
post|/api/auth/register|Register with invitation token|Auth|public
get|/api/auth/callback|Supabase auth callback|Auth|public
get|/api/verify-venue|Venue verification (token)|Public|public
post|/api/verify-venue|Submit venue verification|Public|public
get|/api/verify-dj|DJ verification (token)|Public|public
post|/api/verify-dj|Submit DJ verification|Public|public
get|/api/cron/transition-events|Run event status transitions (scheduled job)|Cron|cron
get|/api/dev/email-templates/list|List email templates (dev)|Dev
get|/api/dev/email-templates/preview|Preview email template HTML|Dev
post|/api/dev/email-templates/send-test|Send test email|Dev
get|/api/debug/env-check|Check Supabase env presence|Debug
`.trim();

export function parseRouteTable(): ParsedRoute[] {
  return ROUTE_LINES.split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const method = parts[0] as HttpMethod;
      const path = parts[1];
      const summary = parts[2];
      const tags = parts[3].split(",").map((t) => t.trim());
      const mode = (parts[4] as SecurityMode) || "session";
      return { method, path, summary, tags, security: mode === "cron" || mode === "public" ? mode : "session" };
    });
}
