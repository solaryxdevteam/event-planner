import { redirect } from "next/navigation";
import { EmailTemplatesPage } from "@/components/dev/EmailTemplatesPage";

const isDev = process.env.NEXT_PUBLIC_ENABLE_EMAIL_PREVIEW === "true";

export const dynamic = "force-dynamic";

export default function DevEmailTemplatesPage() {
  if (!isDev) {
    redirect("/dashboard");
  }

  return (
    <div className="container py-6">
      <EmailTemplatesPage />
    </div>
  );
}
