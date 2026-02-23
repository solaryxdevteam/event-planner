/**
 * User Email Verification OTP Data Access Layer
 *
 * Uses admin client because the flow runs unauthenticated: registration creates
 * the OTP before the user is logged in, and resend/verify are called from the
 * verify-email page with no session. RLS on this table only allows authenticated;
 * admin bypasses RLS so these operations succeed.
 */

import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

const TABLE = "user_email_verification_otps";

type InsertOtp = Database["public"]["Tables"]["user_email_verification_otps"]["Insert"];

export interface UserEmailVerificationOtpRow {
  id: string;
  user_id: string;
  email: string;
  otp_hash: string;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export async function create(
  userId: string,
  email: string,
  otpHash: string,
  expiresAt: Date
): Promise<UserEmailVerificationOtpRow> {
  const supabase = createAdminClient();
  const insertRow: InsertOtp = {
    user_id: userId,
    email: email.toLowerCase().trim(),
    otp_hash: otpHash,
    expires_at: expiresAt.toISOString(),
    verified_at: null,
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(insertRow as never)
    .select()
    .single();

  if (error) throw new Error(`Failed to create verification OTP: ${error.message}`);
  return data as UserEmailVerificationOtpRow;
}

export async function findLatestByEmail(email: string): Promise<UserEmailVerificationOtpRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to find verification OTP: ${error.message}`);
  return data as UserEmailVerificationOtpRow | null;
}

/**
 * Find latest OTP for a specific user and email (e.g. for change-email flow).
 */
export async function findLatestByUserAndEmail(
  userId: string,
  email: string
): Promise<UserEmailVerificationOtpRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("email", email.toLowerCase().trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to find verification OTP: ${error.message}`);
  return data as UserEmailVerificationOtpRow | null;
}

export async function markVerified(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ verified_at: new Date().toISOString() } as never)
    .eq("id", id);

  if (error) throw new Error(`Failed to mark OTP verified: ${error.message}`);
}
