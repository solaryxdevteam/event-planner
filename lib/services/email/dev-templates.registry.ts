/**
 * Dev-only: registry of email template IDs with render + subject for preview and test send.
 * Used by /api/dev/email-templates and /dashboard/dev/email-templates page.
 */

import * as templates from "./templates.service";
import {
  fixtureInvitation,
  fixtureUser,
  fixtureCountryName,
  fixtureInvitationLink,
  fixtureOtpCode,
  fixtureExpiresMinutes,
  fixtureValidMinutes,
  fixtureCreatorName,
  fixtureEventTitle,
  fixtureEventId,
  fixtureComment,
  fixturePendingCount,
  fixtureContactPersonName,
  fixtureVenueName,
  fixtureVerifyUrl,
  fixtureDjVerifyUrl,
  fixtureDjName,
  fixtureDjEmail,
} from "./fixtures";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Event Management Platform";

export type TemplateId =
  | "invitation"
  | "user-email-verification-otp"
  | "registration-congratulation"
  | "user-created-congratulation"
  | "event-approved"
  | "event-calendar-invite"
  | "event-rejected"
  | "report-due-reminder"
  | "reports-pending-approval"
  | "venue-contact-verification"
  | "dj-contact-verification"
  | "verification-otp"
  | "dj-added";

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  description: string;
}

export const TEMPLATES: TemplateMeta[] = [
  { id: "invitation", label: "Invitation", description: "User invited to join the platform" },
  { id: "user-email-verification-otp", label: "User email verification OTP", description: "OTP after registration" },
  {
    id: "registration-congratulation",
    label: "Registration congratulation",
    description: "After user completes registration (pending)",
  },
  {
    id: "user-created-congratulation",
    label: "User created congratulation",
    description: "When GD creates user directly (active)",
  },
  { id: "event-approved", label: "Event approved", description: "Event received final approval" },
  { id: "event-calendar-invite", label: "Event calendar invite", description: "Approved event + .ics attachment" },
  { id: "event-rejected", label: "Event rejected", description: "Approver rejected the event" },
  { id: "report-due-reminder", label: "Report due reminder", description: "Event completed, report required" },
  { id: "reports-pending-approval", label: "Reports pending approval", description: "Reminder for Global Director" },
  {
    id: "venue-contact-verification",
    label: "Venue contact verification",
    description: "Verify venue contact email + OTP",
  },
  { id: "dj-contact-verification", label: "DJ contact verification", description: "Verify DJ email + OTP" },
  { id: "verification-otp", label: "Verification OTP (approver)", description: "OTP for approval step" },
  { id: "dj-added", label: "DJ added", description: "Notification when DJ is added to roster" },
];

function renderTemplate(id: TemplateId): string {
  switch (id) {
    case "invitation":
      return templates.renderInvitationEmail(fixtureInvitation, fixtureCountryName, fixtureInvitationLink);
    case "user-email-verification-otp":
      return templates.renderUserEmailVerificationOtp(fixtureOtpCode, fixtureExpiresMinutes);
    case "registration-congratulation":
      return templates.renderRegistrationCongratulation(fixtureUser);
    case "user-created-congratulation":
      return templates.renderUserCreatedCongratulation(fixtureUser, fixtureCreatorName);
    case "event-approved":
      return templates.renderEventApprovedEmail(fixtureEventTitle, fixtureEventId);
    case "event-calendar-invite":
      return templates.renderEventCalendarInviteEmail(fixtureEventTitle, fixtureEventId);
    case "event-rejected":
      return templates.renderEventRejectedEmail(fixtureEventTitle, fixtureEventId, fixtureComment);
    case "report-due-reminder":
      return templates.renderReportDueReminderEmail(fixtureEventTitle, fixtureEventId);
    case "reports-pending-approval":
      return templates.renderReportsPendingApprovalReminderEmail(fixturePendingCount);
    case "venue-contact-verification":
      return templates.renderVenueContactVerificationEmail(
        fixtureContactPersonName,
        fixtureVenueName,
        fixtureVerifyUrl,
        fixtureOtpCode,
        fixtureExpiresMinutes
      );
    case "dj-contact-verification":
      return templates.renderDjContactVerificationEmail(
        fixtureDjName,
        fixtureDjVerifyUrl,
        fixtureOtpCode,
        fixtureExpiresMinutes
      );
    case "verification-otp":
      return templates.renderVerificationOtpEmail(fixtureOtpCode, fixtureValidMinutes);
    case "dj-added":
      return templates.renderDjAddedEmail(fixtureDjName, fixtureDjEmail);
    default: {
      throw new Error(`Unknown template: ${id}`);
    }
  }
}

function getSubject(id: TemplateId): string {
  switch (id) {
    case "invitation":
      return `You've been invited to join ${appName}`;
    case "user-email-verification-otp":
      return `Verify your email - ${appName}`;
    case "registration-congratulation":
      return "Welcome! Your registration is pending activation";
    case "user-created-congratulation":
      return `Welcome to the ${appName}`;
    case "event-approved":
      return "Your event has been approved";
    case "event-calendar-invite":
      return `Calendar invite: ${fixtureEventTitle}`;
    case "event-rejected":
      return "Your event was not approved";
    case "report-due-reminder":
      return "Report required for your event";
    case "reports-pending-approval":
      return "Reports awaiting your approval";
    case "venue-contact-verification":
      return `Verify your email for ${fixtureVenueName}`;
    case "dj-contact-verification":
      return `Verify your DJ profile on ${appName}`;
    case "verification-otp":
      return "Your verification code for approval";
    case "dj-added":
      return "You've been added to our DJ roster";
    default: {
      return "Test email";
    }
  }
}

export function getRenderedHtml(id: TemplateId): string {
  return renderTemplate(id);
}

export function getTemplateSubject(id: TemplateId): string {
  return getSubject(id);
}

export function isValidTemplateId(id: string): id is TemplateId {
  return TEMPLATES.some((t) => t.id === id);
}
