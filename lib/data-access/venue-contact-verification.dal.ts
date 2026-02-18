/**
 * Venue contact verification DAL
 */

import { createClient } from "@/lib/supabase/server";

const TABLE = "venue_contact_verifications";

export interface VenueContactVerificationRow {
  id: string;
  venue_id: string;
  token: string;
  token_expires_at: string;
  otp_hash: string;
  otp_expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export async function create(
  venueId: string,
  token: string,
  tokenExpiresAt: Date,
  otpHash: string,
  otpExpiresAt: Date
): Promise<VenueContactVerificationRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    // @ts-expect-error - Supabase type inference
    .insert({
      venue_id: venueId,
      token,
      token_expires_at: tokenExpiresAt.toISOString(),
      otp_hash: otpHash,
      otp_expires_at: otpExpiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as VenueContactVerificationRow;
}

export async function findByToken(token: string): Promise<(VenueContactVerificationRow & { venue_id: string }) | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("token", token)
    .is("verified_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as (VenueContactVerificationRow & { venue_id: string }) | null;
}

export async function markVerified(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from(TABLE)
    // @ts-expect-error - Supabase type inference
    .update({ verified_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
