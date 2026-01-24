/**
 * Generate Encryption Key Script
 *
 * Run this script to generate a secure encryption key for password encryption
 *
 * Usage: npx tsx scripts/generate-encryption-key.ts
 */

import { randomBytes } from "node:crypto";

function generateEncryptionKey(): string {
  // Generate a random 32-byte (256-bit) key for AES-256
  const key = randomBytes(32);
  return key.toString("base64");
}

const key = generateEncryptionKey();

console.log("\n=== Encryption Key Generated ===\n");
console.log("Add this to your .env.local file:");
console.log(`ENCRYPTION_KEY=${key}`);
console.log(`NEXT_PUBLIC_ENCRYPTION_KEY=${key}`);
console.log("\n⚠️  Keep this key secure and never commit it to version control!\n");
