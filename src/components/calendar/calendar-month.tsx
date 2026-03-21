"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { cn } from "@/lib/utils";

interface AppointmentData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  contact: { id: string; firstName: string; lastName: string } | null;
}

interface CalendarMonthProps {
  currentDate: Date;
  appointments: AppointmentData[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appointment: AppointmentData) => void;
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusPillColors: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200 line-through",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendarMonth({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick,
}: CalendarMonthProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getAppointmentsForDay(day: Date) {
    return appointments.filter((apt) => isSameDay(new Date(apt.startTime), day));
  }

  return (
    <div className="flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDay(day);
          const inCurrentMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const maxVisible = 3;
          const overflow = dayAppointments.length - maxVisible;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[100px] border-b border-r border-zinc-100 p-1.5 cursor-pointer transition-colors hover:bg-zinc-50",
                !inCurrentMonth && "bg-zinc-50/50"
              )}
            >
              {/* Day number */}
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    today && "bg-zinc-900 text-white",
                    !today && inCurrentMonth && "text-zinc-900",
                    !today && !inCurrentMonth && "text-zinc-400"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Appointment pills */}
              <div className="flex flex-col gap-0.5">
                {dayAppointments.slice(0, maxVisible).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(apt);
                    }}
                    className={cn(
                      "w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium border cursor-pointer transition-opacity hover:opacity-80",
                      statusPillColors[apt.status] || statusPillColors.scheduled
                    )}
                  >
                    <span
                      className={cn(
                        "mr-1 inline-block h-1.5 w-1.5 rounded-full",
                        statusColors[apt.status] || statusColors.scheduled
                      )}
                    />
                    {format(new Date(apt.startTime), "HH:mm")}{" "}
                    {apt.title}
                  </button>
                ))}
                {overflow > 0 && (
                  <span className="px-1.5 text-[11px] font-medium text-zinc-500">
                    +{overflow} autre(s)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { AppointmentData };
