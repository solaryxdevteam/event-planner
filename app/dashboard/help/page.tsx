import { HelpCenterClient } from "@/components/help/HelpCenterClient";

export const dynamic = "force-dynamic";

export default async function HelpCenterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
        <p className="text-muted-foreground">Find answers, get support, and learn how to use the system</p>
      </div>
      <HelpCenterClient />
    </div>
  );
}
