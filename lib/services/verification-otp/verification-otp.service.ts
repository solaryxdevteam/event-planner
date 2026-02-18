/**
 * Verification OTP Service
 *
 * Request OTP (send email), verify OTP (return one-time token), consume token (for approve/reject API).
 * OTP expires in 2 minutes; resend allowed after 2 minutes; one-time token valid 5 minutes.
 */

import { createHash, randomBytes } from "crypto";
import * as verificationOtpDal from "@/lib/data-access/verification-otp.dal";
import * as emailService from "@/lib/services/email/email.service";
import type { VerificationOtpContextType, VerificationOtpAction } from "@/lib/types/database.types";

const OTP_EXPIRY_MINUTES = 2;
const RESEND_COOLDOWN_MINUTES = 2;
const OTP_LENGTH = 4;
const TOKEN_VALID_MINUTES = 5;

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
 * Request OTP: create record, send email to user.
 * Throws if resend requested within RESEND_COOLDOWN_MINUTES.
 */
export async function requestOtp(
  userId: string,
  userEmail: string,
  contextType: VerificationOtpContextType,
  contextId: string,
  action: VerificationOtpAction
): Promise<{ expiresAt: Date }> {
  const latest = await verificationOtpDal.findLatestByUserAndContext(userId, contextType, contextId, action);
  if (latest) {
    const created = new Date(latest.created_at).getTime();
    const cooldownMs = RESEND_COOLDOWN_MINUTES * 60 * 1000;
    if (Date.now() - created < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - (Date.now() - created)) / 60000);
      throw new Error(`Please wait ${waitMinutes} minute(s) before requesting a new code.`);
    }
  }

  const code = generateOtpCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  if (process.env.NODE_ENV === "development") {
    console.log("[Verification OTP] code (dev only):", code, "| codeHash:", codeHash);
  }

  await verificationOtpDal.createVerificationOtp(userId, codeHash, contextType, contextId, action, expiresAt);
  await emailService.sendVerificationOtpEmail(userEmail, code, OTP_EXPIRY_MINUTES);

  return { expiresAt };
}

/**
 * Verify OTP: check code, mark used, set one-time token, return token.
 */
export async function verifyOtp(
  userId: string,
  contextType: VerificationOtpContextType,
  contextId: string,
  action: VerificationOtpAction,
  code: string
): Promise<{ verificationToken: string }> {
  const normalized = code.replace(/\s/g, "");
  if (normalized.length !== OTP_LENGTH || !/^\d+$/.test(normalized)) {
    throw new Error("Invalid OTP format. Please enter the 4-digit code from your email.");
  }

  const latest = await verificationOtpDal.findLatestByUserAndContext(userId, contextType, contextId, action);
  if (!latest) {
    throw new Error("No verification code found. Please request a new code.");
  }
  if (latest.used_at) {
    throw new Error("This code has already been used. Please request a new code.");
  }
  if (new Date(latest.expires_at) < new Date()) {
    throw new Error("This code has expired. Please request a new code.");
  }

  const codeHash = hashCode(normalized);
  if (codeHash !== latest.code_hash) {
    throw new Error("Invalid verification code. Please check and try again.");
  }

  const oneTimeToken = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + TOKEN_VALID_MINUTES * 60 * 1000);
  await verificationOtpDal.markUsedAndSetToken(latest.id, oneTimeToken, tokenExpiresAt);

  return { verificationToken: oneTimeToken };
}

/**
 * Consume verification token: validate and invalidate. Call before performing approve/reject.
 */
export async function consumeVerificationToken(
  userId: string,
  contextType: VerificationOtpContextType,
  contextId: string,
  action: VerificationOtpAction,
  verificationToken: string
): Promise<void> {
  if (!verificationToken?.trim()) {
    throw new Error("Verification is required. Please complete OTP verification first.");
  }

  const row = await verificationOtpDal.findByToken(verificationToken.trim());
  if (!row) {
    throw new Error("Invalid or already used verification. Please complete OTP verification again.");
  }
  if (row.user_id !== userId) {
    throw new Error("Verification does not match current user.");
  }
  if (row.context_type !== contextType || row.context_id !== contextId || row.action !== action) {
    throw new Error("Verification does not match this action.");
  }
  const tokenExpiresAt = row.token_expires_at ? new Date(row.token_expires_at) : null;
  if (!tokenExpiresAt || tokenExpiresAt < new Date()) {
    throw new Error("Verification has expired. Please complete OTP verification again.");
  }

  await verificationOtpDal.invalidateToken(row.id);
}
