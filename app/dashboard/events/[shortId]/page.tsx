import { notFound } from "next/navigation";
import { requireActiveUser } from "@/lib/auth/server";
import { getSubordinateUserIds } from "@/lib/services/users/hierarchy.service";
import * as eventDAL from "@/lib/data-access/events.dal";
import { EventDetailClient } from "@/components/events/EventDetailClient";

interface EventDetailPageProps {
  params: Promise<{ shortId: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { shortId } = await params;
  const user = await requireActiveUser();

  // Get subordinate user IDs for authorization
  const subordinateIds = await getSubordinateUserIds(user.id);

  // Fetch event by short_id
  const event = await eventDAL.findByShortId(shortId, subordinateIds);

  if (!event) {
    notFound();
  }

  return <EventDetailClient event={event} />;
}
