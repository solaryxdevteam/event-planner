/**
 * Email Templates Service
 * Renders HTML email templates
 * Unified design: Shiraz House logo, black/dark backgrounds, red action buttons and links.
 */

import type { Invitation, User } from "@/lib/types/database.types";

// Base URL for links; logo must be a direct static URL so email clients can load it (not /_next/image).
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
// Use PNG in email when available for sharper rendering in Gmail (proxy often degrades WebP). Add public/images/shiraz-house-logo.png for best results.
const EMAIL_LOGO_URL = `${BASE_URL}/images/shiraz-house-logo.png`;
// Explicit dimensions prevent Gmail/image proxies from resizing and blurring. Aspect from source logo ~325:204.
const LOGO_WIDTH = 96;
const LOGO_HEIGHT = 60;
const BRAND_RED = "#b91c1c";
const BRAND_RED_LINK = "#dc2626";

/**
 * Helper function to get full name from first_name and last_name
 */
function getFullName(user: User): string {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

/**
 * Shared email layout: logo, black/dark background, red CTAs.
 * Use buttonStyle and linkStyle in content for actions.
 */
function baseTemplate(content: string): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Event Management Platform";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #171717; border-radius: 8px; overflow: hidden; border: 1px solid #262626;">
      <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #262626;">
        <img src="${EMAIL_LOGO_URL}" alt="${appName}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display: inline-block; width: ${LOGO_WIDTH}px; height: ${LOGO_HEIGHT}px; max-width: ${LOGO_WIDTH}px; border: 0; outline: none; -ms-interpolation-mode: bicubic;" />
      </div>
      <div style="padding: 30px;">
        ${content}
      </div>
      <div style="background-color: #0a0a0a; padding: 20px; border-top: 1px solid #262626; font-size: 12px; color: #737373; text-align: center;">
        <p style="margin: 0 0 8px;">This email was sent by ${appName}</p>
        <p style="margin: 0;">For support, contact <a href="mailto:${supportEmail}" style="color: ${BRAND_RED_LINK}; text-decoration: none;">${supportEmail}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/** Inline style for primary action buttons (red). */
const buttonStyle = `background-color: ${BRAND_RED}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;`;
/** Inline style for text links (red). */
// const linkStyle = `color: ${BRAND_RED_LINK}; text-decoration: none;`;

/**
 * Render invitation email template
 */
export function renderInvitationEmail(invitation: Invitation, countryName: string, link: string): string {
  const expiresAt = new Date(invitation.expires_at);
  const expiresDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">You've been invited!</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">You have been invited to join the Event Management Platform. Your invitation is for <strong>${countryName}</strong>.</p>
    <p style="color: #e5e5e5;">Click the button below to complete your registration:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="${buttonStyle}">Complete Registration</a>
    </div>
    <p style="color: #a3a3a3; font-size: 14px;">This invitation link will expire on ${expiresDate}.</p>
    <p style="color: #a3a3a3; font-size: 14px;">If you did not request this invitation, you can safely ignore this email.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render user email verification OTP email
 * Sent after registration (invitation flow); user enters OTP to verify email. Account stays pending until a Global Director activates it.
 */
export function renderUserEmailVerificationOtp(otpCode: string, expiresMinutes: number): string {
  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Verify your email</h2>
    <p style="color: #e5e5e5;">Your verification code is:</p>
    <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; color: ${BRAND_RED_LINK};">${otpCode}</p>
    <p style="color: #a3a3a3; font-size: 14px;">This code expires in ${expiresMinutes} minutes.</p>
    <p style="color: #e5e5e5;">Enter this code on the verification page to verify your email.</p>
    <p style="color: #e5e5e5;">Your account will remain pending until a Global Director activates it. You will be notified once you can sign in and use the platform.</p>
    <p style="color: #a3a3a3;">If you did not register, you can safely ignore this email.</p>
  `;
  return baseTemplate(content);
}

/**
 * Render registration congratulation email
 * Sent when user completes registration (status: pending)
 */
export function renderRegistrationCongratulation(user: User): string {
  const fullName = getFullName(user);
  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Registration Successful!</h2>
    <p style="color: #e5e5e5;">Hello ${fullName},</p>
    <p style="color: #e5e5e5;">Thank you for registering with the Event Management Platform. Your account has been created successfully.</p>
    <p style="color: #e5e5e5;"><strong>Your account is currently pending activation.</strong> A Global Director will review your registration and activate your account soon.</p>
    <p style="color: #e5e5e5;">You will receive an email notification once your account has been activated.</p>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render user created congratulation email
 * Sent when Global Director creates user directly (status: active)
 */
export function renderUserCreatedCongratulation(user: User, creatorName: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const loginUrl = `${baseUrl}/auth/login`;
  const fullName = getFullName(user);

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Welcome to the Event Management Platform!</h2>
    <p style="color: #e5e5e5;">Hello ${fullName},</p>
    <p style="color: #e5e5e5;">Your account has been created by ${creatorName}. You can now log in to the platform.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="${buttonStyle}">Log In</a>
    </div>
    <p style="color: #e5e5e5;">Use your email address and the password that was set for your account to log in.</p>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render event approved email
 * Sent when event receives final approval (e.g. by Global Director)
 */
export function renderEventApprovedEmail(eventTitle: string, eventId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const eventUrl = `${baseUrl}/dashboard/events/${eventId}`;

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Event Approved</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">Your event <strong>${eventTitle}</strong> has been approved and is now scheduled.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${eventUrl}" style="${buttonStyle}">View Event</a>
    </div>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render calendar invite email (event approved + .ics attachment)
 * Sent to event planner, DJs, subordinates, and marketing manager after global approval.
 */
export function renderEventCalendarInviteEmail(eventTitle: string, eventShortId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const eventUrl = `${baseUrl}/dashboard/events/${eventShortId}`;

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Event approved – add to your calendar</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">The event <strong>${escapeHtml(eventTitle)}</strong> has been approved. A calendar invite is attached so you can add it to your calendar.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${eventUrl}" style="${buttonStyle}">View Event</a>
    </div>
    <p style="color: #a3a3a3; font-size: 14px;">Open the attached .ics file in your email client or calendar app to add the event.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render event rejected email
 * Sent when an approver rejects the event
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderEventRejectedEmail(eventTitle: string, eventId: string, comment: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const eventUrl = `${baseUrl}/dashboard/events/${eventId}`;

  const commentBlock = comment?.trim()
    ? `<p style="color: #e5e5e5;"><strong>Comment from approver:</strong></p><p style="background-color: #262626; padding: 12px; border-radius: 6px; color: #fca5a5; border: 1px solid #b91c1c;">${escapeHtml(comment)}</p>`
    : "";

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Event Not Approved</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">Your event <strong>${eventTitle}</strong> was not approved.</p>
    ${commentBlock}
    <div style="text-align: center; margin: 30px 0;">
      <a href="${eventUrl}" style="${buttonStyle}">View Event</a>
    </div>
    <p style="color: #e5e5e5;">You may edit and resubmit the event for approval.</p>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render report due reminder email
 * Sent to event planner when event transitions to awaiting report
 */
export function renderReportDueReminderEmail(eventTitle: string, eventId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const eventUrl = `${baseUrl}/dashboard/events/${eventId}`;

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Report Required</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">Your event <strong>${eventTitle}</strong> has been completed. Please submit a post-event report.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${eventUrl}" style="${buttonStyle}">Submit Report</a>
    </div>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render reports pending approval reminder email
 * Sent to Global Director(s) when reports are awaiting approval
 */
export function renderReportsPendingApprovalReminderEmail(pendingCount: number): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const approvalsUrl = `${baseUrl}/dashboard/approvals`;

  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">Reports Awaiting Approval</h2>
    <p style="color: #e5e5e5;">Hello,</p>
    <p style="color: #e5e5e5;">You have <strong>${pendingCount}</strong> report${pendingCount === 1 ? "" : "s"} awaiting your approval.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${approvalsUrl}" style="${buttonStyle}">Review Approvals</a>
    </div>
    <p style="color: #a3a3a3;">If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render venue contact verification email
 * "Dear [name], Shiraz House has requested you to verify your email"
 * Includes button link to verify-venue page and OTP code
 */
export function renderVenueContactVerificationEmail(
  contactPersonName: string,
  venueName: string,
  verifyUrl: string,
  otpCode: string,
  validMinutes: number
): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Shiraz House";
  const validText =
    validMinutes >= 60
      ? `${Math.round(validMinutes / 60)} hour${validMinutes >= 120 ? "s" : ""}`
      : `${validMinutes} minutes`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #171717; border-radius: 8px; overflow: hidden; border: 1px solid #262626;">
      <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #262626;">
        <img src="${EMAIL_LOGO_URL}" alt="${appName}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display: inline-block; width: ${LOGO_WIDTH}px; height: ${LOGO_HEIGHT}px; max-width: ${LOGO_WIDTH}px; border: 0; outline: none; -ms-interpolation-mode: bicubic;" />
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f5f5f5; margin-top: 0;">Verify your email</h2>
        <p style="color: #e5e5e5; margin: 0 0 1rem;">Dear ${contactPersonName},</p>
        <p style="color: #e5e5e5; margin: 0 0 1rem;">${appName} has requested you to verify your email for the venue <strong>${venueName}</strong>.</p>
        <p style="color: #e5e5e5; margin: 0 0 1.5rem;">Click the button below to go to the verification page, then enter the code shown in this email.</p>
        <div style="text-align: center; margin: 1.5rem 0;">
          <a href="${verifyUrl}" style="${buttonStyle}">Go to verification page</a>
        </div>
        <p style="color: #a3a3a3; margin: 1rem 0 0.5rem;">Your verification code:</p>
        <div style="background-color: #262626; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; border: 1px solid #404040;">
          <p style="margin: 0; font-size: 1.5rem; font-weight: bold; text-align: center; letter-spacing: 0.25em; color: ${BRAND_RED_LINK};">${otpCode}</p>
        </div>
        <p style="color: #a3a3a3; font-size: 0.875rem; margin: 0;">This code is valid for ${validText}. Do not share it with anyone.</p>
      </div>
      <div style="background-color: #0a0a0a; padding: 1rem 2rem; border-top: 1px solid #262626;">
        <p style="margin: 0; font-size: 0.75rem; color: #737373; text-align: center;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render DJ contact verification email
 * "Dear [name], Shiraz House has invited you to verify as a DJ"
 * Includes button link to verify-dj page and OTP code
 */
export function renderDjContactVerificationEmail(
  djName: string,
  verifyUrl: string,
  otpCode: string,
  validMinutes: number
): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Shiraz House";
  const validText =
    validMinutes >= 60
      ? `${Math.round(validMinutes / 60)} hour${validMinutes >= 120 ? "s" : ""}`
      : `${validMinutes} minutes`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your DJ profile</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #171717; border-radius: 8px; overflow: hidden; border: 1px solid #262626;">
      <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #262626;">
        <img src="${EMAIL_LOGO_URL}" alt="${appName}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display: inline-block; width: ${LOGO_WIDTH}px; height: ${LOGO_HEIGHT}px; max-width: ${LOGO_WIDTH}px; border: 0; outline: none; -ms-interpolation-mode: bicubic;" />
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f5f5f5; margin-top: 0;">Verify your DJ profile</h2>
        <p style="color: #e5e5e5; margin: 0 0 1rem;">Dear ${djName},</p>
        <p style="color: #e5e5e5; margin: 0 0 1rem;">You have been added as a DJ on ${appName}. Please verify your email to be recognized as a verified DJ.</p>
        <p style="color: #e5e5e5; margin: 0 0 1.5rem;">Click the button below to go to the verification page, then enter the code shown in this email.</p>
        <div style="text-align: center; margin: 1.5rem 0;">
          <a href="${verifyUrl}" style="${buttonStyle}">Go to verification page</a>
        </div>
        <p style="color: #a3a3a3; margin: 1rem 0 0.5rem;">Your verification code:</p>
        <div style="background-color: #262626; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; border: 1px solid #404040;">
          <p style="margin: 0; font-size: 1.5rem; font-weight: bold; text-align: center; letter-spacing: 0.25em; color: ${BRAND_RED_LINK};">${otpCode}</p>
        </div>
        <p style="color: #a3a3a3; font-size: 0.875rem; margin: 0;">This code is valid for ${validText}. Do not share it with anyone.</p>
      </div>
      <div style="background-color: #0a0a0a; padding: 1rem 2rem; border-top: 1px solid #262626;">
        <p style="margin: 0; font-size: 0.75rem; color: #737373; text-align: center;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render verification OTP email for approvers.
 * Sent when an approver requests OTP for an approval step.
 */
export function renderVerificationOtpEmail(otpCode: string, validMinutes: number): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Event Management Platform";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OTP Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background-color: #171717; border-radius: 8px; overflow: hidden; border: 1px solid #262626;">
      <div style="background-color: #0a0a0a; padding: 24px; text-align: center; border-bottom: 1px solid #262626;">
        <img src="${EMAIL_LOGO_URL}" alt="${appName}" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display: inline-block; width: ${LOGO_WIDTH}px; height: ${LOGO_HEIGHT}px; max-width: ${LOGO_WIDTH}px; border: 0; outline: none; -ms-interpolation-mode: bicubic;" />
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #f5f5f5; margin-top: 0;">Your OTP Code</h2>
        <p style="color: #e5e5e5; margin: 0 0 1.5rem;">Hello,</p>
        <p style="color: #e5e5e5; margin: 0 0 1.5rem;">Your One-Time Password (OTP) for approval verification is:</p>
        <div style="background-color: #262626; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid #404040;">
          <p style="margin: 0; font-size: 2rem; font-weight: bold; text-align: center; color: ${BRAND_RED_LINK}; letter-spacing: 0.25em;">${otpCode}</p>
        </div>
        <p style="color: #a3a3a3; margin: 0 0 1.5rem;">This OTP is valid for <span style="font-weight: 600; color: #f5f5f5;">${validMinutes} minutes</span>. Please do not share this code with anyone.</p>
        <p style="color: #a3a3a3; margin: 0 0 0.5rem;">If you didn't request this code, please ignore this email.</p>
        <p style="color: #a3a3a3; margin: 0;">Thank you for using ${appName}!</p>
      </div>
      <div style="background-color: #0a0a0a; padding: 1rem 2rem; border-top: 1px solid #262626;">
        <p style="margin: 0; font-size: 0.75rem; color: #737373; text-align: center;">&copy; ${new Date().getFullYear()} ${appName}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Render DJ added notification email
 * Sent when a DJ is added to the platform (email verification / notification)
 */
export function renderDjAddedEmail(djName: string, djEmail: string): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Event Management Platform";
  const content = `
    <h2 style="color: #f5f5f5; margin-top: 0;">You've been added to our DJ roster</h2>
    <p style="color: #e5e5e5;">Hello${djName ? ` ${djName}` : ""},</p>
    <p style="color: #e5e5e5;">You have been added to the DJ list on the ${appName}. Your profile is now visible to event planners.</p>
    <p style="color: #e5e5e5;">Registered email: <strong>${djEmail}</strong></p>
    <p style="color: #a3a3a3;">If you have any questions or need to update your information, please contact your administrator.</p>
  `;
  return baseTemplate(content);
}
