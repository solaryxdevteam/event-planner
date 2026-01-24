/**
 * Setup Storage Buckets Script
 * 
 * Creates the required Supabase Storage buckets for the application:
 * - avatars: Public read, authenticated write, 2MB limit, image/* only
 * - reports: Public read for approved, authenticated write, 50MB limit, image/*, video/*
 * 
 * Run with: npx tsx scripts/setup-storage-buckets.ts
 */

import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("❌ Missing environment variables:");
  console.error("   - NEXT_PUBLIC_SUPABASE_URL");
  console.error("   - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nPlease ensure these are set in your .env.local file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface BucketConfig {
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

const buckets: BucketConfig[] = [
  {
    name: "avatars",
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
  },
  {
    name: "reports",
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "video/*"],
  },
];

async function createBucket(config: BucketConfig): Promise<boolean> {
  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`❌ Error listing buckets: ${listError.message}`);
      return false;
    }

    const bucketExists = existingBuckets?.some((b) => b.name === config.name);

    if (bucketExists) {
      console.log(`✓ Bucket "${config.name}" already exists`);
      return true;
    }

    // Create bucket using Storage REST API
    // Use the Storage REST API endpoint with service role key
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey || "",
      } as HeadersInit,
      body: JSON.stringify({
        name: config.name,
        public: config.public,
        file_size_limit: config.fileSizeLimit,
        allowed_mime_types: config.allowedMimeTypes,
      }),
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      
      // If bucket already exists, that's okay
      if (response.status === 409) {
        console.log(`✓ Bucket "${config.name}" already exists`);
        return true;
      }
      
      console.error(`❌ Failed to create bucket "${config.name}": ${JSON.stringify(errorData)}`);
      
      // Provide manual instructions if API fails
      console.log("\n💡 Tip: Buckets can also be created manually via the Supabase Dashboard:");
      console.log(`   1. Go to: https://supabase.com/dashboard`);
      console.log(`   2. Select your project → Storage → New bucket`);
      console.log(`   3. Name: ${config.name}`);
      console.log(`   4. Public: ${config.public}`);
      console.log(`   5. File size limit: ${config.fileSizeLimit} bytes (${config.fileSizeLimit / 1024 / 1024}MB)`);
      console.log(`   6. Allowed MIME types: ${config.allowedMimeTypes.join(", ")}`);
      
      return false;
    }

    const result = await response.json();
    console.log(`✓ Created bucket "${config.name}"`);
    return true;
  } catch (error) {
    console.error(`❌ Error creating bucket "${config.name}":`, error);
    return false;
  }
}

async function main() {
  console.log("🚀 Setting up storage buckets...\n");

  let successCount = 0;
  for (const bucket of buckets) {
    const success = await createBucket(bucket);
    if (success) {
      successCount++;
    }
    console.log(""); // Empty line for readability
  }

  if (successCount === buckets.length) {
    console.log("✅ All storage buckets are set up!");
  } else {
    console.log(`⚠️  ${successCount}/${buckets.length} buckets set up successfully`);
    console.log("\nIf buckets failed to create, you may need to create them manually:");
    console.log("1. Go to your Supabase Dashboard");
    console.log("2. Navigate to Storage");
    console.log("3. Create buckets with the following settings:");
    buckets.forEach((bucket) => {
      console.log(`\n   Bucket: ${bucket.name}`);
      console.log(`   - Public: ${bucket.public}`);
      console.log(`   - File size limit: ${bucket.fileSizeLimit / 1024 / 1024}MB`);
      console.log(`   - Allowed MIME types: ${bucket.allowedMimeTypes.join(", ")}`);
    });
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
