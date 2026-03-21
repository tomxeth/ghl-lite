"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ContactTable } from "@/components/contacts/contact-table";
import type { Contact } from "@/components/contacts/contact-table";

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const limit = 25;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const json = await res.json();
        if (res.ok) setTags(json.data);
      } catch {
        // silently fail
      }
    }
    fetchTags();
  }, []);

  // Load contacts
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedTag) params.set("tag", selectedTag);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/contacts?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setContacts(json.data.contacts);
        setTotal(json.data.total);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTag, page]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const totalPages = Math.ceil(total / limit);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Contacts</h1>
        <Button onClick={() => router.push("/contacts/new")}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tag filter */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTagDropdownOpen((prev) => !prev)}
          >
            {selectedTag ? (
              <>
                Tag: {selectedTag}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag("");
                    setPage(1);
                    setTagDropdownOpen(false);
                  }}
                  className="ml-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              "Filter by tag"
            )}
          </Button>

          {tagDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setTagDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg animate-fade-in">
                {tags.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-400">
                    No tags available
                  </p>
                ) : (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => {
                        setSelectedTag(tag.name);
                        setPage(1);
                        setTagDropdownOpen(false);
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <Card noPadding>
        <ContactTable contacts={contacts} loading={loading} />
      </Card>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            Showing {startItem}-{endItem} of {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
