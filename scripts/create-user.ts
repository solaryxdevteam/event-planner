/**
 * Script to create a user directly in Supabase
 * Usage: tsx scripts/create-user.ts <email> <password> <name> [role]
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createUser(email: string, password: string, name: string, role: string = "global_director") {
  console.log(`\n📝 Creating user: ${email}`);
  console.log(`   Name: ${name}`);
  console.log(`   Role: ${role}`);

  // Step 1: Create Supabase Auth user
  console.log("\n1️⃣ Creating Supabase Auth user...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
    },
  });

  if (authError) {
    console.error(`❌ Failed to create auth user: ${authError.message}`);
    process.exit(1);
  }

  if (!authData.user) {
    console.error("❌ Failed to create auth user: No user returned");
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Auth user created with ID: ${userId}`);

  // Step 2: Create user record in database
  console.log("\n2️⃣ Creating user record in database...");
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert({
      id: userId,
      email,
      name,
      role,
      status: "active",
      is_active: true,
      parent_id: null, // Global Director has no parent
      notification_prefs: {
        email_enabled: true,
        frequency: "instant",
      },
    })
    .select()
    .single();

  if (userError) {
    console.error(`❌ Failed to create user record: ${userError.message}`);
    // Try to clean up auth user
    await supabase.auth.admin.deleteUser(userId);
    console.log("   (Cleaned up auth user)");
    process.exit(1);
  }

  console.log(`✅ User record created successfully!`);
  console.log(`\n📋 User Details:`);
  console.log(`   ID: ${userData.id}`);
  console.log(`   Email: ${userData.email}`);
  console.log(`   Name: ${userData.name}`);
  console.log(`   Role: ${userData.role}`);
  console.log(`   Status: ${userData.status}`);
  console.log(`\n✅ User created successfully!`);
  console.log(`   You can now log in with email: ${email}`);
  console.log(`   Password: ${password}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error("Usage: tsx scripts/create-user.ts <email> <password> <name> [role]");
  console.error("\nExample:");
  console.error('  tsx scripts/create-user.ts dev@solaryxdev.com "Admin!123" "Dev User" global_director');
  process.exit(1);
}

const [email, password, name, role = "global_director"] = args;

// Validate role
const validRoles = ["event_planner", "city_curator", "regional_curator", "lead_curator", "global_director"];
if (!validRoles.includes(role)) {
  console.error(`❌ Invalid role: ${role}`);
  console.error(`   Valid roles: ${validRoles.join(", ")}`);
  process.exit(1);
}

// Run the script
createUser(email, password, name, role).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
