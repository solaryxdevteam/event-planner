import { enUS, enGB, es, fr, de } from "date-fns/locale";

export const EVENT_DEFAULTS = {
  START_TIME: "09:00",
  END_TIME: "10:00",
  COLOR: "blue",
  CATEGORY: "workshop",
} as const;

export const EVENT_COLORS = [
  { value: "red", label: "Red" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "yellow", label: "Yellow" },
  { value: "lime", label: "Lime" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "pink", label: "Pink" },
  { value: "indigo", label: "Indigo" },
  { value: "teal", label: "Teal" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "approved_scheduled", label: "Upcoming" },
  { value: "in_review", label: "In Review" },
  { value: "completed_awaiting_report", label: "Awaiting Report" },
  { value: "completed_archived", label: "Archived" },
  { value: "draft", label: "Draft" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const STATUS_COLOR_MAP: Record<string, string> = {
  approved_scheduled: "blue",
  in_review: "amber",
  completed_awaiting_report: "green",
  completed_archived: "teal",
  draft: "purple",
  rejected: "red",
  cancelled: "pink",
};

export const LOCALES = [
  { value: "en-US", label: "English (US)", locale: enUS },
  { value: "en-GB", label: "English (UK)", locale: enGB },
  { value: "es-ES", label: "Español", locale: es },
  { value: "fr-FR", label: "Français", locale: fr },
  { value: "de-DE", label: "Deutsch", locale: de },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["value"];
