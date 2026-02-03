/**
 * Email Service
 * Sends emails using Resend
 * https://resend.com/
 */

import { Resend } from "resend";
import type { Invitation, User } from "@/lib/types/database.types";
import * as templatesService from "./templates.service";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Get the "from" email address from environment variables
// You should verify this domain in Resend dashboard
const getFromEmail = (): string => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || "onboarding@resend.dev";
  return fromEmail;
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: invitation.email,
      subject: "You've been invited to join the Event Management Platform",
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: user.email,
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: user.email,
      subject: "Welcome to the Event Management Platform",
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: toEmail,
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: toEmail,
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: toEmail,
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
    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: toEmail,
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
