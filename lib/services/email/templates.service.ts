/**
 * Email Templates Service
 * Renders HTML email templates
 */

import type { Invitation, User } from "@/lib/types/database.types";

/**
 * Helper function to get full name from first_name and last_name
 */
function getFullName(user: User): string {
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

/**
 * Base email template wrapper
 */
function baseTemplate(content: string): string {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Event Management Platform";
  const supportEmail = process.env.SUPPORT_EMAIL || "support@example.com";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin: 0;">${appName}</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e5e7eb;">
    ${content}
  </div>
  
  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
    <p>This email was sent by ${appName}</p>
    <p>For support, contact <a href="mailto:${supportEmail}" style="color: #2563eb;">${supportEmail}</a></p>
  </div>
</body>
</html>
  `.trim();
}

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
    <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
    <p>Hello,</p>
    <p>You have been invited to join the Event Management Platform. Your invitation is for <strong>${countryName}</strong>.</p>
    <p>Click the button below to complete your registration:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${link}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Complete Registration</a>
    </div>
    <p style="color: #6b7280; font-size: 14px;">This invitation link will expire on ${expiresDate}.</p>
    <p style="color: #6b7280; font-size: 14px;">If you did not request this invitation, you can safely ignore this email.</p>
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
    <h2 style="color: #1f2937; margin-top: 0;">Registration Successful!</h2>
    <p>Hello ${fullName},</p>
    <p>Thank you for registering with the Event Management Platform. Your account has been created successfully.</p>
    <p><strong>Your account is currently pending activation.</strong> A Global Director will review your registration and activate your account soon.</p>
    <p>You will receive an email notification once your account has been activated.</p>
    <p>If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}

/**
 * Render user created congratulation email
 * Sent when Global Director creates user directly (status: active)
 */
export function renderUserCreatedCongratulation(user: User, creatorName: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/auth/login`;
  const fullName = getFullName(user);

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Welcome to the Event Management Platform!</h2>
    <p>Hello ${fullName},</p>
    <p>Your account has been created by ${creatorName}. You can now log in to the platform.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${loginUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Log In</a>
    </div>
    <p>Use your email address and the password that was set for your account to log in.</p>
    <p>If you have any questions, please contact your administrator.</p>
  `;

  return baseTemplate(content);
}
