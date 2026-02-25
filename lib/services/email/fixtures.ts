/**
 * Fixture data for email template preview and test send.
 * Used only by dev email-templates page and API.
 */

import type { Invitation, User } from "@/lib/types/database.types";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://panel.shirazhouse.com";

export const fixtureInvitation: Invitation = {
  id: "fixture-invitation-id",
  token: "fixture-token-abc123",
  email: "invitee@example.com",
  country_id: "fixture-country-id",
  created_by: "fixture-creator-id",
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  used_at: null,
  created_at: new Date().toISOString(),
};

export const fixtureUser: User = {
  id: "fixture-user-id",
  email: "jane.doe@example.com",
  first_name: "Jane",
  last_name: "Doe",
  role: "event_planner",
  parent_id: null,
  country_id: "fixture-country-id",
  city: "New York",
  phone: "+1234567890",
  status: "pending",
  is_active: true,
  avatar_url: null,
  notification_prefs: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const fixtureCountryName = "United States";

export const fixtureInvitationLink = `${baseUrl}/auth/register?token=${fixtureInvitation.token}`;

export const fixtureOtpCode = "1234";
export const fixtureExpiresMinutes = 15;
export const fixtureValidMinutes = 2;

export const fixtureCreatorName = "Admin User";

export const fixtureEventTitle = "Summer Gala 2025";
export const fixtureEventId = "evt_short_abc123";
/** For calendar invite .ics: start next week, 5h duration */
export const fixtureEventStartsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
export const fixtureEventEndsAt = new Date(fixtureEventStartsAt.getTime() + 5 * 60 * 60 * 1000);

export const fixtureComment = "Please update the venue capacity and resubmit.";

export const fixturePendingCount = 5;

export const fixtureContactPersonName = "John Smith";
export const fixtureVenueName = "Grand Ballroom";
export const fixtureVerifyUrl = `${baseUrl}/verify-venue?token=fixture-venue-token`;
export const fixtureDjVerifyUrl = `${baseUrl}/verify-dj?token=fixture-dj-token`;

export const fixtureDjName = "DJ Alex";
export const fixtureDjEmail = "dj.alex@example.com";
