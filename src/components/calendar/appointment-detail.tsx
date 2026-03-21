"use client";

import { format } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Edit2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AppointmentDetailData {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  contact: { id: string; firstName: string; lastName: string } | null;
}

interface AppointmentDetailProps {
  appointment: AppointmentDetailData;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

const statusVariant: Record<string, "default" | "success" | "danger"> = {
  scheduled: "default",
  completed: "success",
  cancelled: "danger",
};

const statusLabel: Record<string, string> = {
  scheduled: "Planifié",
  completed: "Terminé",
  cancelled: "Annulé",
};

export function AppointmentDetail({
  appointment,
  onEdit,
  onDelete,
  deleting = false,
}: AppointmentDetailProps) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);

  return (
    <div className="flex flex-col gap-4">
      {/* Title + status */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-zinc-900">
          {appointment.title}
        </h3>
        <Badge variant={statusVariant[appointment.status] || "default"}>
          {statusLabel[appointment.status] || appointment.status}
        </Badge>
      </div>

      {/* Description */}
      {appointment.description && (
        <p className="text-sm text-zinc-600 whitespace-pre-wrap">
          {appointment.description}
        </p>
      )}

      {/* Details */}
      <dl className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <dt className="sr-only">Date</dt>
            <dd className="text-zinc-900">
              {format(start, "EEEE, MMMM d, yyyy")}
            </dd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
          <div>
            <dt className="sr-only">Time</dt>
            <dd className="text-zinc-900">
              {format(start, "h:mm a")} - {format(end, "h:mm a")}
            </dd>
          </div>
        </div>

        {appointment.location && (
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <dt className="sr-only">Location</dt>
              <dd className="text-zinc-900">{appointment.location}</dd>
            </div>
          </div>
        )}

        {appointment.contact && (
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 shrink-0 text-zinc-400" />
            <div>
              <dt className="sr-only">Contact</dt>
              <dd className="text-zinc-900">
                <a
                  href={`/contacts/${appointment.contact.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {appointment.contact.firstName}{" "}
                  {appointment.contact.lastName}
                </a>
              </dd>
            </div>
          </div>
        )}
      </dl>

      {/* Actions */}
      <div className="flex gap-2 border-t border-zinc-100 pt-4">
        <Button variant="secondary" size="sm" onClick={onEdit}>
          <Edit2 className="h-3.5 w-3.5" />
          Modifier
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          loading={deleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Annuler
        </Button>
      </div>
    </div>
  );
}

export type { AppointmentDetailData };
