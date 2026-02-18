/**
 * Email Service
 * Sends emails using Resend
 * https://resend.com/
 */

import { Resend } from "resend";
import type { Invitation, User } from "@/lib/types/database.types";
import * as templatesService from "./templates.service";

// Lazy-initialize Resend so we don't throw at module load when RESEND_API_KEY is unset (e.g. in production env)
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (resendInstance) return resendInstance;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set. Add it to your environment variables to enable email sending.");
  }
  resendInstance = new Resend(key);
  return resendInstance;
}

// Get the "from" email address from environment variables
// You should verify this domain in Resend dashboard
const getFromEmail = (): string => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  return fromEmail;
};

// In development, Resend only allows sending to your own email. Override recipient so all emails go to dev inbox.
// const DEV_EMAIL = "dev@solaryxdev.com";
const getEffectiveToEmail = (originalTo: string): string => {
  // if (process.env.NODE_ENV === "development") {
  //   console.log("[Email] Development: redirecting to", DEV_EMAIL, "(original:", originalTo, ")");
  //   return DEV_EMAIL;
  // }
  return originalTo;
};

/**
 * Send invitation email
 *
 * @param invitation - Invitation object
 * @param countryName - Country name for the invitation
 */
export async function sendInvitationEmail(invitation: Invitation, countryName: string): Promise<void> {
  try {
    // Generate invitation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/auth/register?token=${invitation.token}`;

    // Render email template
    const htmlContent = templatesService.renderInvitationEmail(invitation, countryName, invitationLink);

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(invitation.email),
      subject: `You've been invited to join the ${process.env.NEXT_PUBLIC_APP_NAME}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Failed to send invitation email:", error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }

    console.log("Invitation email sent successfully:", data);
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
}

/**
 * Send user email verification OTP (after registration)
 */
export async function sendUserEmailVerificationOtp(
  email: string,
  otpCode: string,
  expiresMinutes: number
): Promise<void> {
  try {
    const htmlContent = templatesService.renderUserEmailVerificationOtp(otpCode, expiresMinutes);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(email),
      subject: `Verify your email - ${process.env.NEXT_PUBLIC_APP_NAME}`,
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send verification OTP email:", error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
    console.log("User email verification OTP sent:", data);
  } catch (error) {
    console.error("Error sending user email verification OTP:", error);
    throw error;
  }
}

/**
 * Send registration congratulation email
 * Sent when user completes registration (status: pending)
 *
 * @param user - Newly registered user
 */
export async function sendRegistrationCongratulationEmail(user: User): Promise<void> {
  try {
    // Render email template
    const htmlContent = templatesService.renderRegistrationCongratulation(user);

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(user.email),
      subject: "Welcome! Your registration is pending activation",
      html: htmlContent,
    });

    if (error) {
      console.error("Failed to send registration congratulation email:", error);
      throw new Error(`Failed to send registration congratulation email: ${error.message}`);
    }

    console.log("Registration congratulation email sent successfully:", data);
  } catch (error) {
    console.error("Error sending registration congratulation email:", error);
    throw error;
  }
}

/**
 * Send user created congratulation email
 * Sent when Global Director creates user directly (status: active)
 *
 * @param user - Newly created user
 * @param creatorName - Name of Global Director who created the user
 */
export async function sendUserCreatedCongratulationEmail(user: User, creatorName: string): Promise<void> {
  try {
    // Render email template
    const htmlContent = templatesService.renderUserCreatedCongratulation(user, creatorName);

    // Send email via Resend
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(user.email),
      subject: `Welcome to the ${process.env.NEXT_PUBLIC_APP_NAME}`,
      html: htmlContent,
    });

    if (error) {
      console.error("Failed to send user created congratulation email:", error);
      throw new Error(`Failed to send user created congratulation email: ${error.message}`);
    }

    console.log("User created congratulation email sent successfully:", data);
  } catch (error) {
    console.error("Error sending user created congratulation email:", error);
    throw error;
  }
}

/**
 * Send event approved email to event creator
 * Sent when event receives final approval (e.g. by Global Director)
 */
export async function sendEventApprovedEmail(toEmail: string, eventTitle: string, eventId: string): Promise<void> {
  try {
    const htmlContent = templatesService.renderEventApprovedEmail(eventTitle, eventId);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Your event has been approved",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send event approved email:", error);
      throw new Error(`Failed to send event approved email: ${error.message}`);
    }
    console.log("Event approved email sent successfully:", data);
  } catch (error) {
    console.error("Error sending event approved email:", error);
    throw error;
  }
}

/**
 * Send event calendar invite email (HTML + .ics attachment)
 * Sent after global approval to event planner, DJs, subordinates, and marketing manager.
 */
export async function sendEventCalendarInviteEmail(
  toEmail: string,
  eventTitle: string,
  eventShortId: string,
  icsContent: string
): Promise<void> {
  try {
    const htmlContent = templatesService.renderEventCalendarInviteEmail(eventTitle, eventShortId);
    const icsBuffer = Buffer.from(icsContent, "utf-8");
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: `Calendar invite: ${eventTitle}`,
      html: htmlContent,
      attachments: [
        {
          filename: "event.ics",
          content: icsBuffer,
        },
      ],
    });
    if (error) {
      console.error("Failed to send event calendar invite email:", error);
      throw new Error(`Failed to send event calendar invite email: ${error.message}`);
    }
    console.log("Event calendar invite email sent successfully:", data);
  } catch (error) {
    console.error("Error sending event calendar invite email:", error);
    throw error;
  }
}

/**
 * Send event rejected email to event creator
 * Sent when an approver rejects the event
 */
export async function sendEventRejectedEmail(
  toEmail: string,
  eventTitle: string,
  eventId: string,
  comment: string
): Promise<void> {
  try {
    const htmlContent = templatesService.renderEventRejectedEmail(eventTitle, eventId, comment);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Your event was not approved",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send event rejected email:", error);
      throw new Error(`Failed to send event rejected email: ${error.message}`);
    }
    console.log("Event rejected email sent successfully:", data);
  } catch (error) {
    console.error("Error sending event rejected email:", error);
    throw error;
  }
}

/**
 * Send report due reminder to event planner
 * Sent when event transitions to completed_awaiting_report
 */
export async function sendReportDueReminderEmail(toEmail: string, eventTitle: string, eventId: string): Promise<void> {
  try {
    const htmlContent = templatesService.renderReportDueReminderEmail(eventTitle, eventId);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Report required for your event",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send report due reminder email:", error);
      throw new Error(`Failed to send report due reminder email: ${error.message}`);
    }
    console.log("Report due reminder email sent successfully:", data);
  } catch (error) {
    console.error("Error sending report due reminder email:", error);
    throw error;
  }
}

/**
 * Send reports pending approval reminder to Global Director
 * Sent when reports are awaiting approval
 */
export async function sendReportsPendingApprovalReminderEmail(toEmail: string, pendingCount: number): Promise<void> {
  try {
    const htmlContent = templatesService.renderReportsPendingApprovalReminderEmail(pendingCount);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Reports awaiting your approval",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send reports pending approval reminder email:", error);
      throw new Error(`Failed to send reports pending approval reminder email: ${error.message}`);
    }
    console.log("Reports pending approval reminder email sent successfully:", data);
  } catch (error) {
    console.error("Error sending reports pending approval reminder email:", error);
    throw error;
  }
}

/**
 * Send verification OTP email to approver.
 * Used before approve/reject actions.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  otpCode: string,
  validMinutes: number = 2
): Promise<void> {
  try {
    const htmlContent = templatesService.renderVerificationOtpEmail(otpCode, validMinutes);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Your verification code for approval",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send verification OTP email:", error);
      throw new Error(`Failed to send verification OTP email: ${error.message}`);
    }
    console.log("Verification OTP email sent successfully:", data);
  } catch (error) {
    console.error("Error sending verification OTP email:", error);
    throw error;
  }
}

/**
 * Send venue contact verification email (link + OTP).
 */
export async function sendVenueContactVerificationEmail(
  toEmail: string,
  contactPersonName: string,
  venueName: string,
  verifyUrl: string,
  otpCode: string,
  validMinutes: number = 15
): Promise<void> {
  try {
    const htmlContent = templatesService.renderVenueContactVerificationEmail(
      contactPersonName,
      venueName,
      verifyUrl,
      otpCode,
      validMinutes
    );
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(toEmail),
      subject: "Verify your email for " + venueName,
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send venue contact verification email:", error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
    console.log("Venue contact verification email sent successfully:", data);
  } catch (error) {
    console.error("Error sending venue contact verification email:", error);
    throw error;
  }
}

/**
 * Send DJ added notification email
 * Sent when a DJ is added to the platform (verification/notification to the DJ)
 */
export async function sendDjAddedEmail(djName: string, djEmail: string): Promise<void> {
  try {
    const htmlContent = templatesService.renderDjAddedEmail(djName, djEmail);
    const { data, error } = await getResend().emails.send({
      from: getFromEmail(),
      to: getEffectiveToEmail(djEmail),
      subject: "You've been added to our DJ roster",
      html: htmlContent,
    });
    if (error) {
      console.error("Failed to send DJ added email:", error);
      throw new Error(`Failed to send DJ added email: ${error.message}`);
    }
    console.log("DJ added email sent successfully:", data);
  } catch (error) {
    console.error("Error sending DJ added email:", error);
    throw error;
  }
}
