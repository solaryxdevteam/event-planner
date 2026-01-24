/**
 * Script to create Supabase Auth user for existing database user
 * Usage: tsx scripts/create-auth-user.ts <email> <password>
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

async function createAuthUserForExistingUser(email: string, password: string) {
  console.log(`\n📝 Creating Auth user for existing database user: ${email}`);

  // Step 1: Find user in database
  console.log("\n1️⃣ Finding user in database...");
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id, email, name, role, status")
    .eq("email", email)
    .single();

  if (userError || !userData) {
    console.error(`❌ User not found in database: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${userData.name} (${userData.role})`);
  console.log(`   Database ID: ${userData.id}`);
  console.log(`   Status: ${userData.status}`);

  // Step 2: Check if auth user already exists
  console.log("\n2️⃣ Checking if Auth user exists...");
  const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingAuthUsers?.users.find((u) => u.email === email);

  if (existingUser) {
    console.log(`⚠️  Auth user already exists with ID: ${existingUser.id}`);
    console.log(`   Updating password instead...`);

    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
    });

    if (updateError) {
      console.error(`❌ Failed to update password: ${updateError.message}`);
      process.exit(1);
    }

    console.log(`✅ Password updated!`);
    console.log(`\n📋 User Details:`);
    console.log(`   Auth ID: ${existingUser.id}`);
    console.log(`   Database ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Status: ${userData.status}`);
    console.log(`\n⚠️  Note: Auth ID and Database ID don't match.`);
    console.log(`   You may need to update the database user ID to match the Auth ID.`);
    return;
  }

  // Step 3: Create auth user
  console.log("\n3️⃣ Creating Supabase Auth user...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: userData.name,
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

  const authUserId = authData.user.id;
  console.log(`✅ Auth user created with ID: ${authUserId}`);

  // Step 4: Update database user ID to match auth user ID
  console.log("\n4️⃣ Updating database user ID to match Auth ID...");
  const { error: updateError } = await supabase.from("users").update({ id: authUserId }).eq("id", userData.id);

  if (updateError) {
    console.error(`❌ Failed to update database user ID: ${updateError.message}`);
    console.error(`   You may need to manually update the user ID or handle foreign key constraints.`);
    process.exit(1);
  }

  console.log(`✅ Database user ID updated!`);
  console.log(`\n📋 User Details:`);
  console.log(`   ID: ${authUserId} (matches in both Auth and Database)`);
  console.log(`   Email: ${userData.email}`);
  console.log(`   Name: ${userData.name}`);
  console.log(`   Role: ${userData.role}`);
  console.log(`   Status: ${userData.status}`);
  console.log(`\n✅ Auth user created and linked!`);
  console.log(`   You can now log in with email: ${email}`);
  console.log(`   Password: ${password}`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: tsx scripts/create-auth-user.ts <email> <password>");
  console.error("\nExample:");
  console.error('  tsx scripts/create-auth-user.ts dev@solaryxdev.com "Admin!123"');
  process.exit(1);
}

const [email, password] = args;

// Run the script
createAuthUserForExistingUser(email, password).catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
