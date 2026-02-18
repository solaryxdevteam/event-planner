/**
 * Backfill Venue Approval Chains
 *
 * Creates approval chains in the database for all venues that were created by
 * Event Planners and do not yet have a venue_approvals chain.
 *
 * Uses the same hierarchy-based chain as venue creation: buildApprovalChain(venue.creator_id).
 *
 * Usage:
 *   npx tsx scripts/backfill-venue-approval-chains.ts
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env.local");
config({ path: envPath });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  console.error("Set them in .env.local or as environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const EVENT_PLANNER_ROLE = "event_planner";

type ApprovalConfigData = Record<string, boolean>;

async function getApprovalConfig(sb: SupabaseClient): Promise<ApprovalConfigData> {
  const { data: configs, error } = await sb
    .from("approval_configs")
    .select("config_data")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch approval config: ${error.message}`);
  }

  if (!configs?.length) {
    return {
      event_planner: false,
      city_curator: true,
      regional_curator: true,
      lead_curator: true,
      global_director: true,
      marketing_manager: false,
    };
  }

  return configs[0].config_data as ApprovalConfigData;
}

async function getPathToRoot(sb: SupabaseClient, userId: string): Promise<{ id: string; role: string }[]> {
  const path: { id: string; role: string }[] = [];
  let currentId: string | null = userId;
  const visited = new Set<string>();

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Circular reference detected in user hierarchy");
    }
    visited.add(currentId);

    const { data: user, error } = await sb
      .from("users")
      .select("id, parent_id, role")
      .eq("id", currentId)
      .eq("is_active", true)
      .single<{ id: string; parent_id: string | null; role: string }>();

    if (error || !user) {
      break;
    }

    path.push({ id: user.id, role: user.role });
    currentId = user.parent_id;
  }

  return path;
}

async function buildApprovalChain(sb: SupabaseClient, creatorUserId: string): Promise<string[]> {
  const configData = await getApprovalConfig(sb);
  const path = await getPathToRoot(sb, creatorUserId);

  // Remove the creator (first element)
  const potentialApprovers = path.slice(1);

  const approvers = potentialApprovers.filter((user) => {
    const enabled = configData[user.role];
    return enabled === true;
  });

  return approvers.map((u) => u.id);
}

async function main(): Promise<void> {
  console.log("Backfilling venue approval chains for venues created by Event Planners...\n");

  // 1) Venues whose creator is event_planner
  const { data: venues, error: venuesError } = await supabase
    .from("venues")
    .select(
      `
      id,
      short_id,
      name,
      creator_id,
      approval_status,
      creator:users!venues_creator_id_fkey ( id, role )
    `
    )
    .is("deleted_at", null);

  if (venuesError) {
    console.error("Failed to fetch venues:", venuesError.message);
    process.exit(1);
  }

  const eventPlannerVenues = (venues || []).filter((v: { creator?: { role: string } | null }) => {
    const creator = v.creator as { role: string } | null;
    return creator?.role === EVENT_PLANNER_ROLE;
  });

  console.log(`Found ${eventPlannerVenues.length} venue(s) created by Event Planners.`);

  if (eventPlannerVenues.length === 0) {
    console.log("Nothing to backfill.");
    return;
  }

  // 2) Which of these already have an approval chain?
  const venueIds = eventPlannerVenues.map((v: { id: string }) => v.id);
  const { data: existingApprovals, error: approvalsError } = await supabase
    .from("venue_approvals")
    .select("venue_id")
    .in("venue_id", venueIds);

  if (approvalsError) {
    console.error("Failed to fetch existing venue approvals:", approvalsError.message);
    process.exit(1);
  }

  const venueIdsWithChain = new Set((existingApprovals || []).map((r: { venue_id: string }) => r.venue_id));
  const toBackfill = eventPlannerVenues.filter((v: { id: string }) => !venueIdsWithChain.has(v.id));

  console.log(`${venueIdsWithChain.size} already have an approval chain.`);
  console.log(`${toBackfill.length} venue(s) need a chain.\n`);

  if (toBackfill.length === 0) {
    console.log("Done. No chains to create.");
    return;
  }

  let created = 0;
  let failed = 0;

  for (const venue of toBackfill) {
    const venueId = venue.id as string;
    const creatorId = venue.creator_id as string;
    const shortId = (venue.short_id as string) || venueId;
    const name = (venue.name as string) || "Unnamed";

    try {
      const approverIds = await buildApprovalChain(supabase, creatorId);

      if (approverIds.length === 0) {
        console.log(`  [${shortId}] ${name}: no approvers in hierarchy, skipping (no chain created).`);
        continue;
      }

      const approvals = approverIds.map((approverId: string, index: number) => ({
        venue_id: venueId,
        approver_id: approverId,
        sequence_order: index + 1,
        status: index === 0 ? "pending" : "waiting",
        comment: null,
      }));

      const { error: insertError } = await supabase.from("venue_approvals").insert(approvals);

      if (insertError) {
        console.error(`  [${shortId}] ${name}: failed to insert chain:`, insertError.message);
        failed++;
        continue;
      }

      console.log(`  [${shortId}] ${name}: created chain with ${approverIds.length} approver(s).`);
      created++;
    } catch (err) {
      console.error(`  [${shortId}] ${name}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log("\nDone.");
  console.log(`  Created: ${created}`);
  if (failed > 0) {
    console.log(`  Failed:  ${failed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
