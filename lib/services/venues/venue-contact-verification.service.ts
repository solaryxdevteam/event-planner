/**
 * Venue contact verification: create token + OTP, send email, verify OTP
 */

import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/server";
import * as venueContactVerificationDal from "@/lib/data-access/venue-contact-verification.dal";
import * as venueDAL from "@/lib/data-access/venues.dal";
import * as emailService from "@/lib/services/email/email.service";

const OTP_LENGTH = 4;
/** OTP valid for 12 hours so contact person has time to check email */
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
 * Create verification record and send email to venue contact.
 * Call when user clicks "Send verification email" for a venue.
 */
export async function sendVerificationEmail(venueId: string): Promise<void> {
  const venue = await venueDAL.findById(venueId, null, false);
  if (!venue) throw new Error("Venue not found");
  if (!venue.contact_email?.trim()) throw new Error("Venue has no contact email");
  const contactName = venue.contact_person_name?.trim() || "there";
  const venueName = venue.name;

  const token = randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date();
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + TOKEN_VALID_DAYS);

  const otpCode = generateOtp();
  const otpHash = hashOtp(otpCode);
  const otpExpiresAt = new Date();
  otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + OTP_VALID_MINUTES);

  await venueContactVerificationDal.create(venueId, token, tokenExpiresAt, otpHash, otpExpiresAt);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";
  const verifyUrl = `${baseUrl}/verify-venue?token=${token}`;

  await emailService.sendVenueContactVerificationEmail(
    venue.contact_email,
    contactName,
    venueName,
    verifyUrl,
    otpCode,
    OTP_VALID_MINUTES
  );
}

/**
 * Venue info returned for the public verify-venue page (read-only summary).
 */
export interface VerifyVenueInfo {
  cover_image: string | null;
  id: string;
  short_id: string | null;
  name: string;
  street: string | null;
  city: string;
  country: string;
  contact_person_name: string | null;
  total_capacity: number | null;
  number_of_tables: number | null;
  ticket_capacity: number | null;
  sounds: string | null;
  lights: string | null;
  screens: string | null;
}

/**
 * Get venue by verification token (for public verify-venue page).
 * Uses admin client so unauthenticated users can load the page (RLS blocks anon/authenticated on venues).
 */
export async function getVenueByToken(token: string): Promise<VerifyVenueInfo | null> {
  const row = await venueContactVerificationDal.findByToken(token);
  if (!row) return null;
  const tokenExpires = new Date(row.token_expires_at);
  if (tokenExpires < new Date()) return null;

  const admin = createAdminClient();
  const venue = await venueDAL.findById(row.venue_id, null, false, admin);
  if (!venue) return null;
  const hasCoverImage = venue.media?.find((m) => m.isCover) ?? false;
  const coverImage = hasCoverImage ? venue.media?.find((m) => m.isCover)?.url : venue.media?.[0]?.url;
  return {
    cover_image: coverImage ?? null,
    id: venue.id,
    short_id: venue.short_id,
    name: venue.name,
    street: venue.street,
    city: venue.city,
    country: venue.country,
    contact_person_name: venue.contact_person_name,
    total_capacity: venue.total_capacity,
    number_of_tables: venue.number_of_tables,
    ticket_capacity: venue.ticket_capacity,
    sounds: venue.sounds,
    lights: venue.lights,
    screens: venue.screens,
  };
}

/**
 * Verify OTP and mark venue contact as verified. Token is then invalidated.
 */
export async function verifyOtpAndMarkVenue(
  token: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = code.replace(/\s/g, "");
  if (normalized.length !== OTP_LENGTH || !/^\d+$/.test(normalized)) {
    return { success: false, error: "Invalid code. Please enter the 4-digit code from your email." };
  }

  const row = await venueContactVerificationDal.findByToken(token);
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
  await venueContactVerificationDal.markVerified(row.id);
  await venueDAL.update(row.venue_id, { contact_email_verified: true }, admin);

  return { success: true };
}
