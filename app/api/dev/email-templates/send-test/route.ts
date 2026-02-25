import { NextRequest, NextResponse } from "next/server";
import { buildIcsContent } from "@/lib/services/calendar/ics.service";
import { getRenderedHtml, getTemplateSubject, isValidTemplateId } from "@/lib/services/email/dev-templates.registry";
import { sendEventCalendarInviteEmail, sendTestEmail } from "@/lib/services/email/email.service";
import {
  fixtureEventId,
  fixtureEventTitle,
  fixtureEventStartsAt,
  fixtureEventEndsAt,
  fixtureVenueName,
} from "@/lib/services/email/fixtures";

const isDev = process.env.NODE_ENV === "development" || process.env.ENABLE_EMAIL_PREVIEW === "true";

export async function POST(request: NextRequest) {
  if (!isDev) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  let body: { templateId?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { templateId, to } = body;
  if (!templateId || !isValidTemplateId(templateId)) {
    return NextResponse.json({ error: "Missing or invalid templateId" }, { status: 400 });
  }
  if (!to || typeof to !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Missing or invalid email address (to)" }, { status: 400 });
  }

  try {
    if (templateId === "event-calendar-invite") {
      const icsContent = buildIcsContent({
        title: fixtureEventTitle,
        startsAt: fixtureEventStartsAt.toISOString(),
        endsAt: fixtureEventEndsAt.toISOString(),
        venueName: fixtureVenueName,
        venueAddress: "123 Main St, New York",
        uid: fixtureEventId,
      });
      await sendEventCalendarInviteEmail(to, fixtureEventTitle, fixtureEventId, icsContent);
    } else {
      const html = getRenderedHtml(templateId);
      const subject = getTemplateSubject(templateId);
      await sendTestEmail(to, subject, html);
    }
    return NextResponse.json({ ok: true, message: "Test email sent" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send";
    return NextResponse.json({ error: "Send failed", details: message }, { status: 500 });
  }
}
