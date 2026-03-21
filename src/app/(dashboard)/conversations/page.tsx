"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  ArrowDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import { MessageThread } from "@/components/conversations/message-thread";
import { SmsComposer } from "@/components/conversations/sms-composer";
import { EmailList } from "@/components/conversations/email-list";
import { CallLog } from "@/components/conversations/call-log";
import type { SmsMessage } from "@/components/conversations/message-thread";
import type { EmailMessage } from "@/components/conversations/email-list";
import type { CallRecord } from "@/components/conversations/call-log";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  hasInbound?: boolean;
}

type TabKey = "sms" | "email" | "calls";

export default function ConversationsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("sms");

  // Conversation data
  const [smsMessages, setSmsMessages] = useState<SmsMessage[]>([]);
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loadingConversation, setLoadingConversation] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch contacts with communications
  useEffect(() => {
    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        params.set("limit", "100");

        const res = await fetch(`/api/contacts?${params.toString()}`);
        const json = await res.json();

        if (res.ok) {
          setContacts(json.data.contacts);
        }
      } catch {
        // silently fail
      } finally {
        setLoadingContacts(false);
      }
    }
    fetchContacts();
  }, [debouncedSearch]);

  // Fetch conversation when contact or tab changes
  const fetchConversation = useCallback(async (options?: { silent?: boolean }) => {
    if (!selectedContact) return;

    if (!options?.silent) setLoadingConversation(true);
    try {
      const res = await fetch(
        `/api/conversations/${selectedContact.id}?type=${activeTab === "calls" ? "calls" : activeTab}`
      );
      const json = await res.json();

      if (res.ok) {
        const data = json.data as Array<{
          kind: string;
          [key: string]: unknown;
        }>;

        if (activeTab === "sms") {
          setSmsMessages(
            data
              .filter((d) => d.kind === "sms")
              .map((d) => d as unknown as SmsMessage)
          );
        } else if (activeTab === "email") {
          setEmailMessages(
            data
              .filter((d) => d.kind === "email")
              .map((d) => d as unknown as EmailMessage)
          );
        } else if (activeTab === "calls") {
          setCalls(
            data
              .filter((d) => d.kind === "call")
              .map((d) => d as unknown as CallRecord)
          );
        }
      }
    } catch {
      // silently fail
    } finally {
      if (!options?.silent) setLoadingConversation(false);
    }
  }, [selectedContact, activeTab]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!selectedContact) return;
    const interval = setInterval(() => {
      fetchConversation({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedContact, fetchConversation]);

  function handleSmsSent(message: SmsMessage & { kind: string }) {
    setSmsMessages((prev) => [...prev, message as unknown as SmsMessage]);
  }

  const tabs: { key: TabKey; label: string; icon: typeof MessageSquare }[] = [
    { key: "sms", label: "SMS", icon: MessageSquare },
    { key: "email", label: "Email", icon: Mail },
    { key: "calls", label: "Appels", icon: Phone },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 lg:gap-0">
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-xl font-semibold text-zinc-900">Conversations</h1>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {/* Left panel - Contact list */}
        <div className="flex w-full flex-col border-r border-zinc-200 lg:w-1/3">
          {/* Search */}
          <div className="border-b border-zinc-200 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Rechercher des contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex flex-col">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3"
                  >
                    <SkeletonAvatar />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-zinc-300" />
                <p className="text-sm text-zinc-400">Aucun contact trouvé.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {contacts.map((contact) => {
                  const isSelected = selectedContact?.id === contact.id;

                  return (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setSelectedContact(contact);
                        setActiveTab("sms");
                      }}
                      className={cn(
                        "flex items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors cursor-pointer",
                        isSelected
                          ? "bg-zinc-100"
                          : "hover:bg-zinc-50"
                      )}
                    >
                      <Avatar
                        firstName={contact.firstName}
                        lastName={contact.lastName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.hasInbound && (
                            <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-green-500" />
                          )}
                        </div>
                        <p className="truncate text-xs text-zinc-500">
                          {contact.email || contact.phone || "Aucune info de contact"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Conversation */}
        <div className="hidden flex-1 flex-col lg:flex">
          {!selectedContact ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <MessageSquare className="h-10 w-10 text-zinc-300" />
              <p className="text-sm text-zinc-400">
                Sélectionnez un contact pour voir la conversation
              </p>
            </div>
          ) : (
            <>
              {/* Contact header */}
              <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3">
                <Avatar
                  firstName={selectedContact.firstName}
                  lastName={selectedContact.lastName}
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {selectedContact.email || selectedContact.phone || ""}
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-200">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                        activeTab === tab.key
                          ? "border-b-2 border-zinc-900 text-zinc-900"
                          : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {activeTab === "sms" && (
                  <>
                    <MessageThread
                      messages={smsMessages}
                      loading={loadingConversation}
                    />
                    <SmsComposer
                      contactId={selectedContact.id}
                      hasPhone={!!selectedContact.phone}
                      onSent={handleSmsSent}
                    />
                  </>
                )}

                {activeTab === "email" && (
                  <div className="flex-1 overflow-y-auto">
                    <EmailList
                      emails={emailMessages}
                      loading={loadingConversation}
                      contactId={selectedContact.id}
                      contactEmail={selectedContact.email}
                      onRefresh={fetchConversation}
                    />
                  </div>
                )}

                {activeTab === "calls" && (
                  <div className="flex-1 overflow-y-auto">
                    <CallLog
                      calls={calls}
                      loading={loadingConversation}
                      contactId={selectedContact.id}
                      hasPhone={!!selectedContact.phone}
                      onRefresh={fetchConversation}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
