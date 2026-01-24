/**
 * Client-side Password Encryption Utility
 *
 * Encrypts passwords before sending to API using AES-GCM
 * Uses Web Crypto API available in browsers
 */

/**
 * Encrypts a password using AES-GCM
 *
 * @param password - Plain text password to encrypt
 * @returns Base64-encoded encrypted password (format: iv:encrypted:authTag)
 * @throws Error if encryption fails
 */
export async function encryptPassword(password: string): Promise<string> {
  try {
    // Get encryption key from environment variable (base64 encoded)
    const keyString = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

    if (!keyString) {
      // In development, allow plain text passwords if encryption key is not configured
      // This is a fallback for development environments
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "⚠️  Encryption key not configured. Password will be sent in plain text (development only). " +
            "Run 'npx tsx scripts/generate-encryption-key.ts' to generate a key."
        );
        // Return a special marker to indicate plain text password
        return `__PLAIN__${password}`;
      }
      throw new Error(
        "Encryption key not configured. Please set NEXT_PUBLIC_ENCRYPTION_KEY in your environment variables. " +
          "Run 'npx tsx scripts/generate-encryption-key.ts' to generate a key."
      );
    }

    // Decode the base64 key
    const keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0));

    // Import the key for AES-GCM
    const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);

    // Generate a random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Convert password to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Encrypt the password
    // Note: Web Crypto API's encrypt() for AES-GCM returns ciphertext + auth tag (last 16 bytes)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      data
    );

    // Combine IV (12 bytes) + encrypted data (which includes auth tag at the end)
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv, 0);
    combined.set(encryptedArray, iv.length);

    // Convert to base64 for transmission
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error("Password encryption error:", error);
    throw new Error("Failed to encrypt password");
  }
}
