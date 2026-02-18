import { format, type FormatOptions, type Locale } from "date-fns";

export const formatTimeDisplay = (timeInput: string | number, timeFormat: "12" | "24", minutes?: number): string => {
  let hours: number;
  let mins: number | undefined;

  if (typeof timeInput === "string") {
    [hours, mins] = timeInput.split(":").map(Number);
  } else {
    hours = timeInput;
    mins = minutes;
  }

  if (timeFormat === "12") {
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "PM" : "AM";
    return mins !== undefined ? `${hour12}:${mins.toString().padStart(2, "0")} ${ampm}` : `${hour12} ${ampm}`;
  } else {
    return mins !== undefined
      ? `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
      : `${hours.toString().padStart(2, "0")}:00`;
  }
};

export const formatDate = (date: Date, formatStr: string, options?: FormatOptions): string => {
  return options?.locale ? format(date, formatStr, { locale: options.locale }) : format(date, formatStr);
};

export const generateTimeSlots = (startHour: number, endHour: number, interval: number = 60): Date[] => {
  const slots: Date[] = [];
  const baseDate = new Date();
  baseDate.setSeconds(0, 0);

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const time = new Date(baseDate);
      time.setHours(hour, minute);
      slots.push(time);
    }
  }

  return slots;
};

export const calculateDuration = (
  startTime: string,
  endTime: string,
  fmt: "hours" | "auto" = "auto"
): number | string => {
  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);

  if (endMinutes < startMinutes) {
    throw new Error("End time cannot be earlier than start time");
  }

  const totalMinutes = endMinutes - startMinutes;

  if (fmt === "hours") {
    return totalMinutes / 60;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const convertTimeToMinutes = (timeString: string): number => {
  const [hour, minute] = timeString.split(":").map(Number);
  return hour * 60 + minute;
};

export const addMinutesToTime = (timeStr: string, minutesToAdd: number = 30): string => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes + minutesToAdd);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const ensureDate = (dateValue: Date | string | undefined): Date => {
  if (!dateValue) return new Date();
  if (typeof dateValue === "string") {
    try {
      return new Date(dateValue);
    } catch {
      return new Date();
    }
  }
  return dateValue;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

export const isDifferentDay = (date1: Date, date2: Date): boolean => {
  return !isSameDay(date1, date2);
};

const dayOfWeekCache = new Map<string, Array<{ value: number; label: string }>>();

export const getLocalizedDaysOfWeek = (locale: Locale) => {
  const cacheKey = locale.code || "en-US";

  if (dayOfWeekCache.has(cacheKey)) {
    return dayOfWeekCache.get(cacheKey)!;
  }

  const baseDate = new Date(2023, 0, 1);
  const days = [0, 1, 2, 3, 4, 5, 6].map((dayValue) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + dayValue);

    return {
      value: dayValue as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      label: format(date, "EEEE", { locale }),
    };
  });

  dayOfWeekCache.set(cacheKey, days);
  return days;
};
