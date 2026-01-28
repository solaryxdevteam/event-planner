import { redirect } from "next/navigation";

/**
 * Root Page
 * Middleware handles all redirects for the root path.
 * This is a fallback in case middleware doesn't run.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  // Fallback redirect - middleware should handle this before reaching here
  redirect("/auth/login");
}
