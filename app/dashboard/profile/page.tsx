import { getCurrentUserProfile } from "@/lib/services/profile/profile.service";
import { redirect } from "next/navigation";
import { PendingActivationCard } from "@/components/profile/PendingActivationCard";
import { ProfileAccountSection } from "@/components/profile/ProfileAccountSection";
import { ProfileChangeEmail } from "@/components/profile/ProfileChangeEmail";
import { ProfileNotificationPreferences } from "@/components/profile/ProfileNotificationPreferences";
import { ProfilePersonalInfo } from "@/components/profile/ProfilePersonalInfo";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  let user;
  try {
    user = await getCurrentUserProfile();
  } catch {
    redirect("/auth/login");
  }
  if (!user) {
    redirect("/auth/login");
  }
  const isPending = user.status === "pending";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your profile settings and personal information</p>
      </div>

      {isPending && <PendingActivationCard />}

      <div className="space-y-6">
        <ProfileAccountSection user={user} />
        <ProfilePersonalInfo user={user} />
        <ProfileChangeEmail user={user} />
        <ProfileNotificationPreferences user={user} />
      </div>
    </div>
  );
}
