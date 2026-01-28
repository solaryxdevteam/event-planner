import { redirect } from "next/navigation";

// Let middleware handle auth and user status; this page is a simple redirect.
export const dynamic = "force-dynamic";

/**
 * Main Page
 * Always redirects to /dashboard.
 * Middleware then decides whether the user should see dashboard,
 * login, or a pending/profile page based on auth status.
 */
export default function Home() {
  redirect("/dashboard");
}
