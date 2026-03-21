"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppointmentFormData {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  contactId: string;
  status: string;
}

interface AppointmentFormProps {
  initialData?: Partial<AppointmentFormData>;
  initialContact?: ContactOption | null;
  isEditMode?: boolean;
  loading?: boolean;
  onSubmit: (data: AppointmentFormData) => void;
  onCancel: () => void;
}

export function AppointmentForm({
  initialData,
  initialContact,
  isEditMode = false,
  loading = false,
  onSubmit,
  onCancel,
}: AppointmentFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );
  const [date, setDate] = useState(
    initialData?.date || format(new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(initialData?.startTime || "09:00");
  const [endTime, setEndTime] = useState(initialData?.endTime || "10:00");
  const [location, setLocation] = useState(initialData?.location || "");
  const [contactId, setContactId] = useState(initialData?.contactId || "");
  const [status, setStatus] = useState(initialData?.status || "scheduled");

  // Contact search
  const [contactSearch, setContactSearch] = useState(
    initialContact
      ? `${initialContact.firstName} ${initialContact.lastName}`
      : ""
  );
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setContacts([]);
      return;
    }

    setContactsLoading(true);
    try {
      const res = await fetch(
        `/api/contacts?search=${encodeURIComponent(query)}&limit=10`
      );
      const json = await res.json();
      if (res.ok) {
        setContacts(
          json.data.contacts.map(
            (c: { id: string; firstName: string; lastName: string }) => ({
              id: c.id,
              firstName: c.firstName,
              lastName: c.lastName,
            })
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (contactSearch.trim() && showContactDropdown) {
        searchContacts(contactSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [contactSearch, showContactDropdown, searchContacts]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!date) {
      newErrors.date = "Date is required";
    }

    if (!startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!endTime) {
      newErrors.endTime = "End time is required";
    }

    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = "End time must be after start time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      location: location.trim(),
      contactId,
      status,
    });
  }

  function selectContact(contact: ContactOption) {
    setContactId(contact.id);
    setContactSearch(`${contact.firstName} ${contact.lastName}`);
    setShowContactDropdown(false);
  }

  function clearContact() {
    setContactId("");
    setContactSearch("");
    setContacts([]);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Appointment title"
        error={errors.title}
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={3}
          className={cn(
            "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900",
            "placeholder:text-zinc-400 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1",
            "resize-none"
          )}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          required
        />
        <Input
          label="Start Time"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          error={errors.startTime}
          required
        />
        <Input
          label="End Time"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          error={errors.endTime}
          required
        />
      </div>

      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Meeting room, Zoom link, etc."
      />

      {/* Contact search */}
      <div className="relative flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Contact</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={contactSearch}
            onChange={(e) => {
              setContactSearch(e.target.value);
              if (!e.target.value.trim()) {
                clearContact();
              }
              setShowContactDropdown(true);
            }}
            onFocus={() => setShowContactDropdown(true)}
            onBlur={() => {
              // Delay to allow click on dropdown
              setTimeout(() => setShowContactDropdown(false), 200);
            }}
            placeholder="Search contacts..."
            className={cn(
              "h-9 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900",
              "placeholder:text-zinc-400 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
            )}
          />
          {contactId && (
            <button
              type="button"
              onClick={clearContact}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showContactDropdown && contactSearch.trim() && !contactId && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            {contactsLoading ? (
              <div className="px-3 py-2 text-sm text-zinc-400">
                Searching...
              </div>
            ) : contacts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-zinc-400">
                No contacts found
              </div>
            ) : (
              contacts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectContact(c)}
                  className="w-full cursor-pointer px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  {c.firstName} {c.lastName}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {isEditMode && (
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEditMode ? "Update" : "Create"} Appointment
        </Button>
      </div>
    </form>
  );
}

export type { AppointmentFormData };
