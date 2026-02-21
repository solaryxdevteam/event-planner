/**
 * Register User API Route
 *
 * POST /api/auth/register - Register a user with an invitation token
 */

import { NextRequest, NextResponse } from "next/server";
import * as userService from "@/lib/services/users/user.service";
import { registerWithInvitationSchema } from "@/lib/validation/users.schema";
import { NotFoundError } from "@/lib/utils/errors";
import { decryptPassword, EncryptionKeyNotConfiguredError } from "@/lib/utils/password-encryption.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 * Register a user with an invitation token
 *
 * Body: RegisterWithInvitationInput (JSON)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.password == null || typeof body.password !== "string") {
      return NextResponse.json({ success: false, error: "Password is required" }, { status: 400 });
    }

    // Decrypt password before validation (or use plain text if in development)
    let decryptedPassword: string;

    // Check if password is plain text (development fallback)
    if (body.password.startsWith("__PLAIN__")) {
      // Development mode: use plain text password
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          {
            success: false,
            error: "Plain text passwords are only allowed in development mode",
          },
          { status: 400 }
        );
      }
      decryptedPassword = body.password.replace("__PLAIN__", "");
    } else {
      // Production: decrypt password (client must encrypt with same key as ENCRYPTION_KEY)
      try {
        decryptedPassword = decryptPassword(body.password);
      } catch (err) {
        if (err instanceof EncryptionKeyNotConfiguredError) {
          console.error("Registration failed: ENCRYPTION_KEY is not set on the server.");
          return NextResponse.json(
            {
              success: false,
              error: "Server configuration error. Please try again later.",
            },
            { status: 503 }
          );
        }
        return NextResponse.json(
          {
            success: false,
            error: "Invalid encrypted password format",
          },
          { status: 400 }
        );
      }
    }

    // Validate input (with decrypted password)
    const validatedInput = registerWithInvitationSchema.parse({
      ...body,
      password: decryptedPassword,
    });

    // Register user
    const newUser = await userService.registerWithInvitation(validatedInput.token, validatedInput);

    return NextResponse.json(
      {
        success: true,
        data: newUser,
        needsEmailVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to register user:", error);

    if (error instanceof NotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 404 });
    }

    // Handle validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: error,
        },
        { status: 400 }
      );
    }

    // Handle specific error messages
    const errorMessage = error instanceof Error ? error.message : "Failed to register user";

    // Check for common error messages
    if (errorMessage.includes("Invalid or expired invitation token")) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 404 });
    }

    if (errorMessage.includes("Email does not match invitation") || errorMessage.includes("already exists")) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
