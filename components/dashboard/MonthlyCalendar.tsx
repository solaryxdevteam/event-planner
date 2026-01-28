"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string | null;
  status: string;
  shortId: string;
}

interface MonthlyCalendarProps {
  events?: CalendarEvent[];
  isLoading?: boolean;
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function MonthlyCalendar({ events = [], isLoading = false }: MonthlyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const eventDate = format(new Date(event.date), "yyyy-MM-dd");
      if (!map.has(eventDate)) {
        map.set(eventDate, []);
      }
      map.get(eventDate)!.push(event);
    });
    return map;
  }, [events]);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case "approved_scheduled":
      case "approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending_approval":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "draft":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Monthly Schedule</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">{format(currentDate, "MMMM yyyy")}</span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DAYS.map((day) => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, dayIdx) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dayKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    "min-h-[100px] border rounded-md p-2",
                    !isCurrentMonth && "opacity-40",
                    isCurrentDay && "ring-2 ring-blue-500 ring-offset-2"
                  )}
                >
                  <div className={cn("text-sm font-medium mb-1", isCurrentDay && "text-blue-600 font-bold")}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <Link
                        key={event.id}
                        href={`/dashboard/events/${event.shortId}`}
                        className={cn(
                          "block text-xs px-2 py-1 rounded border truncate hover:opacity-80 transition-opacity",
                          getEventColor(event.status)
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </Link>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-muted-foreground px-2">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
