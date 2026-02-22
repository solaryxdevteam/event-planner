/**
 * Change Email Service
 *
 * Non–Global Director users can change their email. OTP is sent to the NEW email;
 * after verification we update both Supabase Auth and the users table.
 */

import { createHash, randomBytes } from "crypto";
import * as userEmailVerificationDal from "@/lib/data-access/user-email-verification.dal";
import * as usersDal from "@/lib/data-access/users.dal";
import * as emailService from "@/lib/services/email/email.service";
import * as passwordService from "@/lib/services/auth/password.service";

const OTP_EXPIRY_MINUTES = 2;
const OTP_LENGTH = 4;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

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
 * Request OTP to change email. Sends code to the new email address.
 * Validates: new email !== current, not already used by another user, cooldown.
 */
export async function requestChangeEmailOtp(
  userId: string,
  currentEmail: string,
  newEmail: string
): Promise<{ expiresAt: Date; otpCode?: string }> {
  const normalizedNew = newEmail.trim().toLowerCase();
  const normalizedCurrent = currentEmail.trim().toLowerCase();

  if (!normalizedNew) {
    throw new Error("New email is required.");
  }

  if (normalizedNew === normalizedCurrent) {
    throw new Error("New email must be different from your current email.");
  }

  const existingUser = await usersDal.findByEmail(normalizedNew);
  if (existingUser && existingUser.id !== userId) {
    throw new Error("This email is already in use by another account.");
  }

  const latest = await userEmailVerificationDal.findLatestByUserAndEmail(userId, normalizedNew);
  if (latest) {
    const created = new Date(latest.created_at).getTime();
    if (Date.now() - created < RESEND_COOLDOWN_MS) {
      const waitMinutes = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - created)) / 60000);
      throw new Error(`Please wait ${waitMinutes} minute(s) before requesting a new code.`);
    }
  }

  const code = generateOtpCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (process.env.NODE_ENV === "development") {
    console.log("[Change email OTP] code (dev only):", code);
  }

  await userEmailVerificationDal.create(userId, normalizedNew, codeHash, expiresAt);
  await emailService.sendVerificationOtpEmail(normalizedNew, code, OTP_EXPIRY_MINUTES);

  return {
    expiresAt,
    otpCode: process.env.NODE_ENV === "development" ? code : undefined,
  };
}

/**
 * Verify OTP and apply email change: update Supabase Auth and users table.
 */
export async function verifyAndApplyChangeEmail(userId: string, newEmail: string, code: string): Promise<void> {
  const normalized = code.replace(/\s/g, "");
  if (normalized.length !== OTP_LENGTH || !/^\d+$/.test(normalized)) {
    throw new Error("Invalid OTP format. Please enter the 4-digit code from your email.");
  }

  const normalizedEmail = newEmail.trim().toLowerCase();
  const row = await userEmailVerificationDal.findLatestByUserAndEmail(userId, normalizedEmail);

  if (!row) {
    throw new Error("No verification code found for this email. Please request a new code.");
  }
  if (row.verified_at) {
    throw new Error("This code has already been used.");
  }
  if (new Date(row.expires_at) < new Date()) {
    throw new Error("This code has expired. Please request a new code.");
  }

  const codeHash = hashCode(normalized);
  if (codeHash !== row.otp_hash) {
    throw new Error("Invalid verification code. Please check and try again.");
  }

  await userEmailVerificationDal.markVerified(row.id);
  await passwordService.updateAuthEmail(userId, normalizedEmail);
  await usersDal.update(userId, { email: normalizedEmail });
}
