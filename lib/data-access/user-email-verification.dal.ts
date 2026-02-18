/**
 * User Email Verification OTP Data Access Layer
 */

import { createClient } from "@/lib/supabase/server";

const TABLE = "user_email_verification_otps";

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
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      email: email.toLowerCase().trim(),
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create verification OTP: ${error.message}`);
  return data as UserEmailVerificationOtpRow;
}

export async function findLatestByEmail(email: string): Promise<UserEmailVerificationOtpRow | null> {
  const supabase = await createClient();
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

export async function markVerified(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE).update({ verified_at: new Date().toISOString() }).eq("id", id);

  if (error) throw new Error(`Failed to mark OTP verified: ${error.message}`);
}
