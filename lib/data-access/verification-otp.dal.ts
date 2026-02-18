/**
 * Verification OTP Data Access Layer (DAL)
 *
 * Pure database operations for verification_otps table.
 * Used for OTP verification before approval/reject actions.
 */

import { createClient } from "@/lib/supabase/server";
import type { VerificationOtpContextType, VerificationOtpAction } from "@/lib/types/database.types";

const TABLE = "verification_otps";

export interface VerificationOtpRow {
  id: string;
  user_id: string;
  code_hash: string;
  context_type: string;
  context_id: string;
  action: string;
  expires_at: string;
  used_at: string | null;
  one_time_token: string | null;
  token_expires_at: string | null;
  created_at: string;
}

/**
 * Create a new OTP record (code_hash stored; plain code never stored).
 */
export async function createVerificationOtp(
  userId: string,
  codeHash: string,
  contextType: VerificationOtpContextType,
  contextId: string,
  action: VerificationOtpAction,
  expiresAt: Date
): Promise<VerificationOtpRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    // @ts-expect-error - Supabase type inference
    .insert({
      user_id: userId,
      code_hash: codeHash,
      context_type: contextType,
      context_id: contextId,
      action,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as VerificationOtpRow;
}

/**
 * Get the most recent OTP for this user + context + action (for verify and resend cooldown).
 */
export async function findLatestByUserAndContext(
  userId: string,
  contextType: VerificationOtpContextType,
  contextId: string,
  action: VerificationOtpAction
): Promise<VerificationOtpRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .eq("action", action)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as VerificationOtpRow | null;
}

/**
 * Mark OTP as used and set one-time token for API consumption.
 */
export async function markUsedAndSetToken(id: string, oneTimeToken: string, tokenExpiresAt: Date): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    // @ts-expect-error - Supabase type inference
    .update({
      used_at: new Date().toISOString(),
      one_time_token: oneTimeToken,
      token_expires_at: tokenExpiresAt.toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Find a valid (unused, not expired) OTP record by one-time token.
 */
export async function findByToken(oneTimeToken: string): Promise<VerificationOtpRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("one_time_token", oneTimeToken)
    .not("used_at", "is", null)
    .maybeSingle();

  if (error) throw error;
  return data as VerificationOtpRow | null;
}

/**
 * Invalidate a one-time token after it has been consumed by approve/reject API.
 */
export async function invalidateToken(id: string): Promise<void> {
  const supabase = await createClient();
  // @ts-expect-error - Supabase type inference
  await supabase.from(TABLE).update({ one_time_token: null, token_expires_at: null }).eq("id", id);
}
