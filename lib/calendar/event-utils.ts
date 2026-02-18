import { addDays, differenceInDays, getWeek, type Locale, startOfWeek, format } from "date-fns";
import { useMemo } from "react";
import {
  type CalendarEvent,
  CalendarViewType,
  type EventPosition,
  type MultiDayEventRowType,
  type TimeFormatType,
} from "./types";
import { CATEGORY_OPTIONS, LOCALES } from "./constants";
import { EVENT_VIEW_CONFIG } from "@/components/calendar/event-calendar/event-list";
import { convertTimeToMinutes, formatTimeDisplay, isSameDay } from "./date-utils";
import { enUS } from "date-fns/locale";

export function useWeekDays(currentDate: Date, daysInWeek: number, locale?: Locale) {
  const weekStart = useMemo(() => startOfWeek(currentDate, { locale }), [currentDate, locale]);

  const weekNumber = useMemo(() => getWeek(currentDate, { locale }), [currentDate, locale]);

  const weekDays = useMemo(() => {
    return Array.from({ length: daysInWeek }, (_, i) => addDays(weekStart, i));
  }, [daysInWeek, weekStart]);

  const todayIndex = useMemo(() => {
    const now = new Date();
    return weekDays.findIndex((day) => isSameDay(day, now));
  }, [weekDays]);

  return { weekStart, weekNumber, weekDays, todayIndex };
}

export function useFilteredEvents(events: CalendarEvent[], daysInWeek: Date[]) {
  return useMemo(() => {
    const singleDayEvents: CalendarEvent[] = [];
    const multiDayEvents: CalendarEvent[] = [];

    const [firstDayOfWeek, lastDayOfWeek] = [daysInWeek[0], daysInWeek[6]];

    events.forEach((event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      const dayDiff = differenceInDays(endDate, startDate);

      const isSingleDay = dayDiff <= 1;
      const isMultiDayInWeek =
        (startDate >= firstDayOfWeek && startDate <= lastDayOfWeek) ||
        (endDate >= firstDayOfWeek && endDate <= lastDayOfWeek) ||
        (startDate < firstDayOfWeek && endDate > lastDayOfWeek);

      if (isSingleDay) {
        singleDayEvents.push(event);
      } else if (isMultiDayInWeek) {
        multiDayEvents.push(event);
      }
    });

    return { singleDayEvents, multiDayEvents };
  }, [events, daysInWeek]);
}

export function useEventPositions(singleDayEvents: CalendarEvent[], daysInWeek: Date[], hourHeight: number) {
  return useMemo(() => {
    const positions: Record<string, EventPosition> = {};
    const dayEvents: Record<number, Array<{ event: CalendarEvent; start: number; end: number }>> = {};

    daysInWeek.forEach((_, index) => {
      dayEvents[index] = [];
    });

    singleDayEvents.forEach((event) => {
      const eventDate = new Date(event.startDate);
      const dayIndex = daysInWeek.findIndex((day) => isSameDay(day, eventDate));

      if (dayIndex !== -1) {
        dayEvents[dayIndex].push({
          event,
          start: convertTimeToMinutes(event.startTime),
          end: convertTimeToMinutes(event.endTime),
        });
      }
    });

    Object.entries(dayEvents).forEach(([dayIndexStr, eventsList]) => {
      const dayIndex = parseInt(dayIndexStr);
      const columns: number[][] = [];

      eventsList.sort((a, b) => a.start - b.start);

      eventsList.forEach(({ event, start, end }) => {
        let columnIndex = 0;

        while (columns[columnIndex]?.some((endTime) => start < endTime)) {
          columnIndex++;
        }

        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }

        columns[columnIndex].push(end);

        positions[`${dayIndex}-${event.id}`] = {
          id: event.id,
          top: (start / 60) * hourHeight,
          height: ((end - start) / 60) * hourHeight,
          column: columnIndex,
          totalColumns: columns.length,
          dayIndex,
        };
      });

      const totalColumns = columns.length;
      Object.keys(positions).forEach((key) => {
        if (key.startsWith(`${dayIndex}-`)) {
          positions[key].totalColumns = totalColumns;
        }
      });
    });

    return positions;
  }, [daysInWeek, singleDayEvents, hourHeight]);
}

export function useMultiDayEventRows(multiDayEvents: CalendarEvent[], daysInWeek: Date[]) {
  return useMemo(() => {
    const rows: Array<MultiDayEventRowType & { event: CalendarEvent }> = [];
    const [weekStart, weekEnd] = [daysInWeek[0], daysInWeek[6]];

    multiDayEvents.forEach((event) => {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);

      [startDate, endDate].forEach((d) => d.setHours(12, 0, 0, 0));

      const isVisibleInWeek =
        (startDate >= weekStart && startDate <= weekEnd) ||
        (endDate >= weekStart && endDate <= weekEnd) ||
        (startDate < weekStart && endDate > weekEnd);

      if (isVisibleInWeek) {
        let startDayIndex = daysInWeek.findIndex((d) => isSameDay(d, startDate));
        let endDayIndex = daysInWeek.findIndex((d) => isSameDay(d, endDate));

        startDayIndex = startDayIndex === -1 ? 0 : startDayIndex;
        endDayIndex = endDayIndex === -1 ? 6 : endDayIndex;

        let rowIndex = 0;
        while (rows.some((r) => r.row === rowIndex && !(endDayIndex < r.startIndex || startDayIndex > r.endIndex))) {
          rowIndex++;
        }

        rows.push({ event, startIndex: startDayIndex, endIndex: endDayIndex, row: rowIndex });
      }
    });

    return rows;
  }, [multiDayEvents, daysInWeek]);
}

export function useDayEventPositions(events: CalendarEvent[], hourHeight: number) {
  return useMemo(() => {
    const positions: Record<string, EventPosition> = {};

    const timeRanges = events.map((event) => {
      const start = convertTimeToMinutes(event.startTime);
      const end = convertTimeToMinutes(event.endTime);
      return { event, start, end };
    });

    timeRanges.sort((a, b) => a.start - b.start);

    const columns: number[][] = [];

    timeRanges.forEach(({ event, start, end }) => {
      let columnIndex = 0;

      while (true) {
        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }

        const available = !columns[columnIndex].some((endTime) => start < endTime);

        if (available) {
          columns[columnIndex].push(end);

          const top = (start / 60) * hourHeight;
          const height = ((end - start) / 60) * hourHeight;

          positions[event.id] = {
            id: event.id,
            top,
            height,
            column: columnIndex,
            totalColumns: 0,
          };
          break;
        }
        columnIndex++;
      }
    });

    const totalColumns = columns.length;
    Object.values(positions).forEach((pos) => {
      pos.totalColumns = totalColumns;
    });

    return positions;
  }, [events, hourHeight]);
}

export function useEventFilter(events: CalendarEvent[], currentDate: Date, viewType: CalendarViewType) {
  return useMemo(() => {
    try {
      const { filterFn } = EVENT_VIEW_CONFIG[viewType];
      return events.filter((event) => {
        const eventDate = new Date(event.startDate);
        return filterFn(eventDate, currentDate);
      });
    } catch {
      return [];
    }
  }, [events, currentDate, viewType]);
}

export function useEventGrouper(
  events: CalendarEvent[],
  viewType: CalendarViewType,
  timeFormat: TimeFormatType,
  locale?: Locale
) {
  return useMemo(() => {
    const { groupFormat, titleFormat } = EVENT_VIEW_CONFIG[viewType];
    const isDayView = viewType === CalendarViewType.DAY;

    const groupMap = events.reduce(
      (acc, event) => {
        const eventDate = new Date(event.startDate);
        const groupKey = isDayView ? event.startTime : format(eventDate, groupFormat, { locale });

        const groupTitle = isDayView
          ? formatTimeDisplay(groupKey, timeFormat)
          : format(eventDate, titleFormat, { locale });

        if (!acc[groupKey]) {
          acc[groupKey] = { key: groupKey, title: groupTitle, events: [] };
        }
        acc[groupKey].events.push(event);
        return acc;
      },
      {} as Record<string, { key: string; title: string; events: CalendarEvent[] }>
    );

    return Object.values(groupMap).sort((a, b) => a.key.localeCompare(b.key));
  }, [events, viewType, timeFormat, locale]);
}

export function getContrastColor(hexColor: string): string {
  const [r, g, b] = hexColor
    .slice(1)
    .match(/.{2}/g)!
    .map((x) => parseInt(x, 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function getCategoryLabel(categoryValue: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === categoryValue)?.label || categoryValue;
}

export const COLOR_CLASSES = {
  blue: {
    bg: "bg-blue-700 hover:bg-blue-800",
    border: "border-blue-800 hover:border-blue-700",
    text: "text-blue-800 hover:text-blue-700",
    badge: { bg: "bg-blue-700 dark:bg-blue-900/20", text: "text-blue-800 dark:text-blue-200" },
  },
  red: {
    bg: "bg-red-700 hover:bg-red-800",
    border: "border-red-800 hover:border-red-700",
    text: "text-red-800 hover:text-red-700",
    badge: { bg: "bg-red-700 dark:bg-red-900/20", text: "text-red-800 dark:text-red-200" },
  },
  lime: {
    bg: "bg-lime-700 hover:bg-lime-800",
    border: "border-lime-800 hover:border-lime-700",
    text: "text-lime-800 hover:text-lime-700",
    badge: { bg: "bg-lime-700 dark:bg-lime-900/20", text: "text-lime-800 dark:text-lime-900" },
  },
  green: {
    bg: "bg-green-700 hover:bg-green-800",
    border: "border-green-800 hover:border-green-700",
    text: "text-green-800 hover:text-green-700",
    badge: { bg: "bg-green-700 dark:bg-green-900/20", text: "text-green-800 dark:text-green-200" },
  },
  amber: {
    bg: "bg-amber-700 hover:bg-amber-800",
    border: "border-amber-800 hover:border-amber-700",
    text: "text-amber-800 hover:text-amber-700",
    badge: { bg: "bg-amber-700 dark:bg-amber-900/20", text: "text-amber-800 dark:text-amber-900" },
  },
  yellow: {
    bg: "bg-yellow-700 hover:bg-yellow-800",
    border: "border-yellow-800 hover:border-yellow-700",
    text: "text-yellow-800 hover:text-yellow-700",
    badge: { bg: "bg-yellow-700 dark:bg-yellow-900/20", text: "text-yellow-800 dark:text-yellow-900" },
  },
  purple: {
    bg: "bg-purple-700 hover:bg-purple-800",
    border: "border-purple-800 hover:border-purple-700",
    text: "text-purple-800 hover:text-purple-700",
    badge: { bg: "bg-purple-700 dark:bg-purple-900/20", text: "text-purple-800 dark:text-purple-200" },
  },
  pink: {
    bg: "bg-pink-700 hover:bg-pink-800",
    border: "border-pink-800 hover:border-pink-700",
    text: "text-pink-800 hover:text-pink-700",
    badge: { bg: "bg-pink-700 dark:bg-pink-900/20", text: "text-pink-800 dark:text-pink-200" },
  },
  indigo: {
    bg: "bg-indigo-700 hover:bg-indigo-800",
    border: "border-indigo-800 hover:border-indigo-700",
    text: "text-indigo-800 hover:text-indigo-700",
    badge: { bg: "bg-indigo-700 dark:bg-indigo-900/20", text: "text-indigo-800 dark:text-indigo-200" },
  },
  teal: {
    bg: "bg-teal-700 hover:bg-teal-800",
    border: "border-teal-800 hover:border-teal-700",
    text: "text-teal-800 hover:text-teal-700",
    badge: { bg: "bg-teal-700 dark:bg-teal-900/20", text: "text-teal-800 dark:text-teal-200" },
  },
} satisfies Record<string, { bg: string; border: string; text: string; badge: { bg: string; text: string } }>;

export type ColorName = keyof typeof COLOR_CLASSES;

export const getColorClasses = (color: string) => COLOR_CLASSES[color as ColorName] || COLOR_CLASSES.blue;

export const getLocaleFromCode = (code: string) => {
  return LOCALES.find((l) => l.value === code)?.locale || enUS;
};
