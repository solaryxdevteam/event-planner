/**
 * Script to update a user's password in Supabase
 * Usage: tsx scripts/update-password.ts <email> <new-password>
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

async function updatePassword(email: string, newPassword: string) {
  console.log(`\n📝 Updating password for: ${email}`);

  // Step 1: Find user in database
  console.log("\n1️⃣ Finding user in database...");
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, name, role, status")
    .eq("email", email)
    .single();

  if (userError || !userData) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${userData.name} (${userData.role})`);
  console.log(`   Status: ${userData.status}`);

  // Step 2: Update password in Supabase Auth
  console.log("\n2️⃣ Updating password in Supabase Auth...");
  const { error: passwordError } = await supabase.auth.admin.updateUserById(userData.id, {
    password: newPassword,
  });

  if (passwordError) {
    console.error(`❌ Failed to update password: ${passwordError.message}`);
    process.exit(1);
  }

  console.log(`✅ Password updated successfully!`);
  console.log(`\n📋 User Details:`);
  console.log(`   ID: ${userData.id}`);
  console.log(`   Email: ${userData.email}`);
  console.log(`   Name: ${userData.name}`);
  console.log(`   Role: ${userData.role}`);
  console.log(`   Status: ${userData.status}`);
  console.log(`\n✅ Password updated!`);
  console.log(`   You can now log in with email: ${email}`);
  console.log(`   Password: ${newPassword}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: tsx scripts/update-password.ts <email> <new-password>");
  console.error("\nExample:");
  console.error('  tsx scripts/update-password.ts dev@solaryxdev.com "Admin!123"');
  process.exit(1);
}

const [email, newPassword] = args;

// Run the script
updatePassword(email, newPassword).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
