"use client";

import { useEffect, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  differenceInMinutes,
  setHours,
  setMinutes,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { AppointmentData } from "./calendar-month";

interface CalendarWeekProps {
  currentDate: Date;
  appointments: AppointmentData[];
  onAppointmentClick: (appointment: AppointmentData) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 60; // pixels per hour

const statusBlockColors: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-400 text-blue-800",
  completed: "bg-green-100 border-green-400 text-green-800",
  cancelled: "bg-red-100 border-red-400 text-red-800 line-through",
};

export function CalendarWeek({
  currentDate,
  appointments,
  onAppointmentClick,
}: CalendarWeekProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  function getAppointmentsForDay(day: Date) {
    return appointments.filter((apt) =>
      isSameDay(new Date(apt.startTime), day)
    );
  }

  function getTopOffset(time: Date): number {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const totalMinutesFromStart = (hours - START_HOUR) * 60 + minutes;
    return Math.max(0, (totalMinutesFromStart / 60) * HOUR_HEIGHT);
  }

  function getHeight(start: Date, end: Date): number {
    const minutes = differenceInMinutes(end, start);
    return Math.max(20, (minutes / 60) * HOUR_HEIGHT);
  }

  // Current time indicator
  const nowInView = now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = getTopOffset(now);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200">
        <div className="border-r border-zinc-100" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-r border-zinc-100 px-2 py-2 text-center",
              isToday(day) && "bg-blue-50"
            )}
          >
            <div className="text-xs font-medium text-zinc-500">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                isToday(day) && "bg-zinc-900 text-white",
                !isToday(day) && "text-zinc-900"
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
        <div
          className="grid grid-cols-[60px_repeat(7,1fr)]"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r border-zinc-100">
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 px-2"
                style={{ top: (hour - START_HOUR) * HOUR_HEIGHT - 8 }}
              >
                <span className="text-xs text-zinc-400">
                  {format(setMinutes(setHours(new Date(), hour), 0), "ha")}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative border-r border-zinc-100",
                  today && "bg-blue-50/30"
                )}
              >
                {/* Hour lines */}
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-zinc-100"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {today && nowInView && (
                  <div
                    className="absolute left-0 right-0 z-10"
                    style={{ top: nowTop }}
                  >
                    <div className="relative flex items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500 -ml-1" />
                      <div className="h-[2px] flex-1 bg-red-500" />
                    </div>
                  </div>
                )}

                {/* Appointments */}
                {dayAppointments.map((apt) => {
                  const start = new Date(apt.startTime);
                  const end = new Date(apt.endTime);
                  const top = getTopOffset(start);
                  const height = getHeight(start, end);

                  return (
                    <button
                      key={apt.id}
                      onClick={() => onAppointmentClick(apt)}
                      className={cn(
                        "absolute left-1 right-1 z-10 overflow-hidden rounded border-l-2 px-1.5 py-0.5 text-left transition-opacity hover:opacity-80 cursor-pointer",
                        statusBlockColors[apt.status] || statusBlockColors.scheduled
                      )}
                      style={{ top, height, minHeight: 20 }}
                    >
                      <div className="text-[11px] font-semibold truncate">
                        {apt.title}
                      </div>
                      <div className="text-[10px] opacity-75 truncate">
                        {format(start, "HH:mm")} - {format(end, "HH:mm")}
                      </div>
                      {apt.contact && (
                        <div className="text-[10px] opacity-75 truncate">
                          {apt.contact.firstName} {apt.contact.lastName}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
