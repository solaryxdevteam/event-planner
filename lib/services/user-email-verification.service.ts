/**
 * User Email Verification Service
 *
 * After registration (invitation flow), user receives an OTP by email. When they enter
 * the correct OTP, the email is marked verified only. User status remains 'pending' until
 * a Global Director activates them via the Users / Activate flow.
 */

import { createHash, randomBytes } from "crypto";
import * as dal from "@/lib/data-access/user-email-verification.dal";
import * as emailService from "@/lib/services/email/email.service";

const OTP_EXPIRY_MINUTES = 10;
const OTP_LENGTH = 4;
/** User must wait this long before requesting a new OTP (seconds) */
const RESEND_COOLDOWN_SECONDS = 2 * 60;

function generateOtpCode(): string {
  const digits = "0123456789";
  let code = "";
  const bytes = randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[bytes[i]! % 10];
  }
  return code;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Create and send verification OTP for a newly registered user.
 */
export async function createAndSendOtp(userId: string, email: string): Promise<{ expiresAt: Date }> {
  const code = generateOtpCode();
  const otpHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (process.env.NODE_ENV === "development") {
    console.log("[User email verification OTP] code (dev only):", code);
  }

  await dal.create(userId, email, otpHash, expiresAt);
  await emailService.sendUserEmailVerificationOtp(email, code, OTP_EXPIRY_MINUTES);

  return { expiresAt };
}

export interface ResendOtpResult {
  success: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

/**
 * Resend verification OTP to email. Allowed only after RESEND_COOLDOWN_SECONDS since last OTP.
 */
export async function resendOtp(email: string): Promise<ResendOtpResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { success: false, error: "Email is required." };
  }

  const row = await dal.findLatestByEmail(normalizedEmail);
  if (!row) {
    return { success: false, error: "No verification code found for this email. Please register first." };
  }
  if (row.verified_at) {
    return { success: false, error: "This email is already verified. You can sign in." };
  }

  const createdAt = new Date(row.created_at).getTime();
  const elapsed = (Date.now() - createdAt) / 1000;
  if (elapsed < RESEND_COOLDOWN_SECONDS) {
    const retryAfterSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
    return {
      success: false,
      error: `Please wait before requesting a new code. You can resend in ${retryAfterSeconds} seconds.`,
      retryAfterSeconds,
    };
  }

  await createAndSendOtp(row.user_id, row.email);
  return { success: true };
}

/**
 * Verify OTP and activate user. Returns true if successful.
 */
export async function verifyOtpAndActivateUser(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = code.trim().replace(/\s/g, "");
  if (normalized.length !== OTP_LENGTH || !/^\d+$/.test(normalized)) {
    return {
      success: false,
      error: `Please enter the ${OTP_LENGTH}-digit code from your email.`,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const row = await dal.findLatestByEmail(normalizedEmail);

  if (!row) {
    return { success: false, error: "No verification code found for this email. Please register first." };
  }

  if (row.verified_at) {
    return { success: false, error: "This code has already been used. You can sign in." };
  }

  const expiresAt = new Date(row.expires_at);
  if (new Date() > expiresAt) {
    return {
      success: false,
      error: "Verification code has expired. Please request a new one from the registration flow.",
    };
  }

  const codeHash = hashCode(normalized);
  if (codeHash !== row.otp_hash) {
    return { success: false, error: "Invalid verification code." };
  }

  await dal.markVerified(row.id);
  // Do not set status to active here. Invitation users stay pending until a Global Director activates them.

  return { success: true };
}
