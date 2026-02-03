import { getCurrentUserProfile } from "@/lib/actions/profile";
import { redirect } from "next/navigation";
import { PendingActivationCard } from "@/components/profile/PendingActivationCard";
import { ProfileAccountSection } from "@/components/profile/ProfileAccountSection";
import { ProfileNotificationPreferences } from "@/components/profile/ProfileNotificationPreferences";
import { ProfilePersonalInfo } from "@/components/profile/ProfilePersonalInfo";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profileResponse = await getCurrentUserProfile();

  if (!profileResponse.success || !profileResponse.data) {
    redirect("/auth/login");
  }

  const user = profileResponse.data;
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
        <ProfileNotificationPreferences user={user} />
      </div>
    </div>
  );
}
