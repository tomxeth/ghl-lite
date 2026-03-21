"use client";

import { useCallback, useEffect, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { CalendarMonth } from "@/components/calendar/calendar-month";
import { CalendarWeek } from "@/components/calendar/calendar-week";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";
import type { AppointmentData } from "@/components/calendar/calendar-month";
import type { AppointmentFormData } from "@/components/calendar/appointment-form";
import type { AppointmentDetailData } from "@/components/calendar/appointment-detail";

type ViewMode = "month" | "week";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createInitialDate, setCreateInitialDate] = useState<string>("");

  // Detail modal
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentDetailData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch appointments for the visible range
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let start: Date;
      let end: Date;

      if (viewMode === "month") {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        start = startOfWeek(monthStart, { weekStartsOn: 1 });
        end = endOfWeek(monthEnd, { weekStartsOn: 1 });
      } else {
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
      }

      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });

      const res = await fetch(`/api/appointments?${params}`);
      const json = await res.json();
      if (res.ok) {
        setAppointments(json.data.appointments);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  function handlePrev() {
    if (viewMode === "month") {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else {
      setCurrentDate((prev) => subWeeks(prev, 1));
    }
  }

  function handleNext() {
    if (viewMode === "month") {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addWeeks(prev, 1));
    }
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  function handleDayClick(date: Date) {
    setCreateInitialDate(format(date, "yyyy-MM-dd"));
    setCreateOpen(true);
  }

  function handleAppointmentClick(appointment: AppointmentData) {
    setSelectedAppointment(appointment as AppointmentDetailData);
    setDetailOpen(true);
  }

  async function handleCreate(data: AppointmentFormData) {
    setCreateLoading(true);
    try {
      const startTime = new Date(`${data.date}T${data.startTime}`).toISOString();
      const endTime = new Date(`${data.date}T${data.endTime}`).toISOString();

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          contactId: data.contactId || undefined,
          startTime,
          endTime,
          location: data.location || undefined,
        }),
      });

      if (res.ok) {
        setCreateOpen(false);
        setCreateInitialDate("");
        fetchAppointments();
      }
    } catch {
      // silently fail
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleEdit(data: AppointmentFormData) {
    if (!selectedAppointment) return;
    setEditLoading(true);
    try {
      const startTime = new Date(`${data.date}T${data.startTime}`).toISOString();
      const endTime = new Date(`${data.date}T${data.endTime}`).toISOString();

      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          contactId: data.contactId || null,
          startTime,
          endTime,
          location: data.location || null,
          status: data.status,
        }),
      });

      if (res.ok) {
        setEditOpen(false);
        setDetailOpen(false);
        setSelectedAppointment(null);
        fetchAppointments();
      }
    } catch {
      // silently fail
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedAppointment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDetailOpen(false);
        setSelectedAppointment(null);
        fetchAppointments();
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  }

  const headerTitle =
    viewMode === "month"
      ? format(currentDate, "MMMM yyyy")
      : `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-900">Calendar</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-zinc-200 p-0.5">
            <button
              onClick={() => setViewMode("month")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                viewMode === "month"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors cursor-pointer",
                viewMode === "week"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              Week
            </button>
          </div>

          <Button
            onClick={() => {
              setCreateInitialDate(format(new Date(), "yyyy-MM-dd"));
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Appointment
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={handleToday}>
          Today
        </Button>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={handleNext}
            className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <h2 className="text-base font-semibold text-zinc-900">{headerTitle}</h2>
      </div>

      {/* Calendar */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {loading && appointments.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-sm text-zinc-400">Loading...</div>
          </div>
        ) : viewMode === "month" ? (
          <CalendarMonth
            currentDate={currentDate}
            appointments={appointments}
            onDayClick={handleDayClick}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : (
          <CalendarWeek
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </div>

      {/* Create Appointment Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitialDate("");
        }}
        title="New Appointment"
        className="max-w-lg"
      >
        <AppointmentForm
          initialData={createInitialDate ? { date: createInitialDate } : undefined}
          loading={createLoading}
          onSubmit={handleCreate}
          onCancel={() => {
            setCreateOpen(false);
            setCreateInitialDate("");
          }}
        />
      </Modal>

      {/* Appointment Detail Modal */}
      <Modal
        open={detailOpen && !editOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedAppointment(null);
        }}
        title="Appointment Details"
        className="max-w-md"
      >
        {selectedAppointment && (
          <AppointmentDetail
            appointment={selectedAppointment}
            onEdit={() => setEditOpen(true)}
            onDelete={handleDelete}
            deleting={deleting}
          />
        )}
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Appointment"
        className="max-w-lg"
      >
        {selectedAppointment && (
          <AppointmentForm
            isEditMode
            initialData={{
              title: selectedAppointment.title,
              description: selectedAppointment.description || "",
              date: format(new Date(selectedAppointment.startTime), "yyyy-MM-dd"),
              startTime: format(new Date(selectedAppointment.startTime), "HH:mm"),
              endTime: format(new Date(selectedAppointment.endTime), "HH:mm"),
              location: selectedAppointment.location || "",
              contactId: selectedAppointment.contact?.id || "",
              status: selectedAppointment.status,
            }}
            initialContact={selectedAppointment.contact}
            loading={editLoading}
            onSubmit={handleEdit}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
}
