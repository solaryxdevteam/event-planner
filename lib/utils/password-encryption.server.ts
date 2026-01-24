/**
 * Server-side Password Decryption Utility
 *
 * Decrypts passwords received from client using AES-GCM
 * Uses Node.js crypto module
 */

import { createDecipheriv, randomBytes } from "node:crypto";

/**
 * Decrypts a password using AES-GCM
 *
 * @param encryptedPassword - Base64-encoded encrypted password (format: iv:encrypted:authTag)
 * @returns Plain text password
 * @throws Error if decryption fails
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    // Get encryption key from environment variable (base64 encoded)
    const keyString = process.env.ENCRYPTION_KEY;

    if (!keyString) {
      throw new Error("Encryption key not configured");
    }

    // Convert base64 key to Buffer
    const key = Buffer.from(keyString, "base64");

    // Decode the encrypted password from base64
    const combined = Buffer.from(encryptedPassword, "base64");

    // Extract IV (first 12 bytes), encrypted data (middle), and auth tag (last 16 bytes)
    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(combined.length - 16);
    const encryptedData = combined.subarray(12, combined.length - 16);

    // Decrypt using AES-256-GCM
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Password decryption error:", error);
    throw new Error("Failed to decrypt password");
  }
}

/**
 * Generates a random encryption key (for setup purposes)
 * Run this once to generate a key and add it to .env files
 *
 * @returns Base64-encoded 32-byte key
 */
export function generateEncryptionKey(): string {
  const key = randomBytes(32);
  return key.toString("base64");
}
