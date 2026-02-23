/**
 * DJ contact verification: create token + OTP, send email, verify OTP
 */

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import * as djContactVerificationDal from "@/lib/data-access/dj-contact-verification.dal";
import * as djDAL from "@/lib/data-access/djs.dal";
import * as emailService from "@/lib/services/email/email.service";

const OTP_LENGTH = 4;
/** OTP valid for 12 hours so DJ has time to check email */
const OTP_VALID_MINUTES = 12 * 60;
const TOKEN_VALID_DAYS = 7;

function generateOtp(): string {
  const digits = "0123456789";
  let code = "";
  const bytes = randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += digits[bytes[i]! % 10];
  }
  return code;
}

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Create verification record and send email to DJ.
 * Call when GD creates a DJ (or when resending verification).
 */
export async function sendVerificationEmail(djId: string): Promise<void> {
  const dj = await djDAL.findById(djId);
  if (!dj) throw new Error("DJ not found");
  if (!dj.email?.trim()) throw new Error("DJ has no email");
  const djName = dj.name?.trim() || "there";

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS);

  const otpCode = generateOtp();
  const otpHash = hashOtp(otpCode);
  const otpExpiresAt = new Date();
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + OTP_VALID_MINUTES);

  await djContactVerificationDal.create(djId, token, tokenExpiresAt, otpHash, otpExpiresAt);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const verifyUrl = `${baseUrl}/verify-dj?token=${token}`;

  await emailService.sendDjContactVerificationEmail(dj.email, djName, verifyUrl, otpCode, OTP_VALID_MINUTES);
}

/**
 * DJ info returned for the public verify-dj page (read-only summary).
 */
export interface VerifyDjInfo {
  id: string;
  short_id: string | null;
  name: string;
  email: string;
  picture_url: string | null;
  music_style: string | null;
}

/**
 * Get DJ by verification token (for public verify-dj page).
 * Uses admin client so unauthenticated users can load the page (RLS blocks anon/authenticated on djs).
 */
export async function getDjByToken(token: string): Promise<VerifyDjInfo | null> {
  const row = await djContactVerificationDal.findByToken(token);
  if (!row) return null;
  const tokenExpires = new Date(row.token_expires_at);
  if (tokenExpires < new Date()) return null;

  const admin = createAdminClient();
  const dj = await djDAL.findById(row.dj_id, admin);
  if (!dj || dj.deleted_at) return null;
  return {
    id: dj.id,
    short_id: dj.short_id,
    name: dj.name,
    email: dj.email,
    picture_url: dj.picture_url,
    music_style: dj.music_style,
  };
}

/**
 * Verify OTP and mark DJ email as verified. Token is then invalidated.
 */
export async function verifyOtpAndMarkDj(token: string, code: string): Promise<{ success: boolean; error?: string }> {
  const normalized = code.replace(/\s/g, "");
  if (normalized.length !== OTP_LENGTH || !/^\d+$/.test(normalized)) {
    return { success: false, error: "Invalid code. Please enter the 4-digit code from your email." };
  }

  const row = await djContactVerificationDal.findByToken(token);
  if (!row) {
    return { success: false, error: "Invalid or expired link. Please request a new verification email." };
  }

  const otpExpires = new Date(row.otp_expires_at);
  if (otpExpires < new Date()) {
    return { success: false, error: "This code has expired. Please request a new verification email." };
  }

  const codeHash = hashOtp(normalized);
  if (codeHash !== row.otp_hash) {
    return { success: false, error: "Incorrect code. Please check and try again." };
  }

  const admin = createAdminClient();
  await djContactVerificationDal.markVerified(row.id);
  await djDAL.update(row.dj_id, { email_verified: true }, admin);

  return { success: true };
}
