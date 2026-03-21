"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Skeleton, SkeletonAvatar, SkeletonText } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils";
import { ActivityTimeline } from "@/components/contacts/activity-timeline";
import { TagPicker } from "@/components/contacts/tag-picker";
import { ContactForm } from "@/components/contacts/contact-form";
import type { ContactFormData } from "@/components/contacts/contact-form";
import type { Activity } from "@/components/contacts/activity-timeline";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  tags: Tag[];
  notes: Note[];
  opportunitiesCount: number;
  createdAt: string;
  updatedAt: string;
}

type TabValue = "activity" | "notes" | "deals";

export default function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabValue>("activity");

  // Activity
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Notes
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editTags, setEditTags] = useState<Tag[]>([]);

  // Fetch contact
  const fetchContact = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setContact(json.data);
        setNotes(json.data.notes || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  // Fetch activities when tab changes
  useEffect(() => {
    if (activeTab !== "activity") return;

    async function fetchActivities() {
      setActivitiesLoading(true);
      try {
        const res = await fetch(`/api/contacts/${id}/activities`);
        const json = await res.json();
        if (res.ok) setActivities(json.data.activities);
      } catch {
        // silently fail
      } finally {
        setActivitiesLoading(false);
      }
    }

    fetchActivities();
  }, [id, activeTab]);

  // Fetch full notes when notes tab opens
  useEffect(() => {
    if (activeTab !== "notes") return;

    async function fetchNotes() {
      setNotesLoading(true);
      try {
        const res = await fetch(`/api/contacts/${id}/notes`);
        const json = await res.json();
        if (res.ok) setNotes(json.data);
      } catch {
        // silently fail
      } finally {
        setNotesLoading(false);
      }
    }

    fetchNotes();
  }, [id, activeTab]);

  // Load available tags for edit modal
  useEffect(() => {
    if (!editOpen) return;

    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const json = await res.json();
        if (res.ok) setEditTags(json.data);
      } catch {
        // silently fail
      }
    }

    fetchTags();
  }, [editOpen]);

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await fetch(`/api/contacts/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotes((prev) => [json.data, ...prev]);
        setNewNote("");
      }
    } catch {
      // silently fail
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      const res = await fetch(`/api/contacts/${id}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
    } catch {
      // silently fail
    }
  }

  async function handleEditSubmit(data: ContactFormData) {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || null,
          phone: data.phone || null,
          company: data.company || null,
          source: data.source || null,
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        fetchContact();
      }
    } catch {
      // silently fail
    } finally {
      setEditLoading(false);
    }
  }

  function handleTagAdded(tag: Tag) {
    setContact((prev) =>
      prev ? { ...prev, tags: [...prev.tags, tag] } : prev
    );
  }

  function handleTagRemoved(tagId: string) {
    setContact((prev) =>
      prev
        ? { ...prev, tags: prev.tags.filter((t) => t.id !== tagId) }
        : prev
    );
  }

  // 404 state
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold text-zinc-900">
          Contact not found
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          The contact you are looking for does not exist.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading || !contact) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-36" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <div className="flex items-center gap-4">
                <SkeletonAvatar size="lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
            </Card>
            <Card>
              <SkeletonText lines={6} />
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <SkeletonText lines={5} />
            </Card>
            <Card>
              <SkeletonText lines={3} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { value: TabValue; label: string }[] = [
    { value: "activity", label: "Activity" },
    { value: "notes", label: "Notes" },
    { value: "deals", label: "Deals" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Left column - 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Contact header */}
          <Card>
            <div className="flex items-start gap-4">
              <Avatar
                firstName={contact.firstName}
                lastName={contact.lastName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-zinc-900">
                  {contact.firstName} {contact.lastName}
                </h2>
                {contact.email && (
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {contact.email}
                  </p>
                )}
                {contact.phone && (
                  <p className="text-sm text-zinc-500">
                    {formatPhone(contact.phone)}
                  </p>
                )}
                {contact.company && (
                  <p className="mt-1 text-sm text-zinc-500">
                    {contact.company}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors cursor-pointer",
                  "border-b-2 -mb-px",
                  activeTab === tab.value
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <Card>
            {activeTab === "activity" && (
              <ActivityTimeline
                activities={activities}
                loading={activitiesLoading}
              />
            )}

            {activeTab === "notes" && (
              <div className="flex flex-col gap-4">
                {/* Add note */}
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      disabled={!newNote.trim()}
                      loading={addingNote}
                      onClick={handleAddNote}
                    >
                      Add Note
                    </Button>
                  </div>
                </div>

                {/* Notes list */}
                {notesLoading ? (
                  <SkeletonText lines={4} />
                ) : notes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    No notes yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-lg border border-zinc-100 bg-zinc-50 p-3"
                      >
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-zinc-400">
                            {formatDistanceToNow(new Date(note.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                            aria-label="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "deals" && (
              <div className="py-8 text-center text-sm text-zinc-400">
                No deals yet.
              </div>
            )}
          </Card>
        </div>

        {/* Right column - 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                Edit
              </Button>
            </CardHeader>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="text-zinc-900">
                    {contact.email || "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Phone</dt>
                  <dd className="text-zinc-900">
                    {contact.phone ? formatPhone(contact.phone) : "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Company</dt>
                  <dd className="text-zinc-900">
                    {contact.company || "--"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400" />
                <div>
                  <dt className="text-zinc-500">Created</dt>
                  <dd className="text-zinc-900">
                    {formatDistanceToNow(new Date(contact.createdAt), {
                      addSuffix: true,
                    })}
                  </dd>
                </div>
              </div>
              {contact.source && (
                <div className="flex items-start gap-3">
                  <div className="h-4 w-4 shrink-0" />
                  <div>
                    <dt className="text-zinc-500">Source</dt>
                    <dd className="text-zinc-900">
                      <Badge variant="default">{contact.source}</Badge>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <TagPicker
              contactId={contact.id}
              currentTags={contact.tags}
              onTagAdded={handleTagAdded}
              onTagRemoved={handleTagRemoved}
            />
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" size="sm" disabled>
                <MessageSquare className="h-4 w-4" />
                Send SMS
              </Button>
              <Button variant="secondary" size="sm" disabled>
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
              <Button variant="secondary" size="sm" disabled>
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Contact"
        className="max-w-xl"
      >
        <ContactForm
          initialData={{
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || "",
            phone: contact.phone || "",
            company: contact.company || "",
            source: contact.source || "",
          }}
          availableTags={editTags}
          onSubmit={handleEditSubmit}
          onCancel={() => setEditOpen(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
