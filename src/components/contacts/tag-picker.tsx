"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagPickerProps {
  contactId: string;
  currentTags: Tag[];
  onTagAdded: (tag: Tag) => void;
  onTagRemoved: (tagId: string) => void;
}

function TagPicker({
  contactId,
  currentTags,
  onTagAdded,
  onTagRemoved,
}: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setNewTagName("");
  }, []);

  useEffect(() => {
    if (!open) return;

    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const json = await res.json();
        if (res.ok) setAllTags(json.data);
      } catch {
        // silently fail
      }
    }

    fetchTags();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  const currentTagIds = new Set(currentTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !currentTagIds.has(t.id));

  async function handleAddExistingTag(tag: Tag) {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: tag.id }),
      });
      if (res.ok) {
        onTagAdded(tag);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAndAddTag() {
    if (!newTagName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        onTagAdded(json.data);
        setNewTagName("");
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    try {
      const res = await fetch(`/api/contacts/${contactId}/tags/${tagId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onTagRemoved(tagId);
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5">
        {currentTags.map((tag) => (
          <Badge key={tag.id} variant="custom" color={tag.color}>
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 inline-flex cursor-pointer hover:opacity-70"
              aria-label={`Remove tag ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {currentTags.length === 0 && (
          <span className="text-sm text-zinc-400">No tags</span>
        )}
      </div>

      {/* Add tag button + dropdown */}
      <div ref={containerRef} className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((prev) => !prev)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tag
        </Button>

        {open && (
          <div
            className={cn(
              "absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg",
              "animate-fade-in"
            )}
          >
            <div className="max-h-48 overflow-y-auto p-2">
              {availableTags.length > 0 ? (
                <div className="space-y-0.5">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      disabled={loading}
                      onClick={() => handleAddExistingTag(tag)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer disabled:opacity-50"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-2 py-1.5 text-xs text-zinc-400">
                  No more tags available
                </p>
              )}
            </div>

            <div className="border-t border-zinc-200 p-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateAndAddTag();
                }}
                className="flex gap-1.5"
              >
                <Input
                  placeholder="New tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="h-7 text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!newTagName.trim() || loading}
                  className="h-7 shrink-0 px-2"
                >
                  Add
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { TagPicker };
export type { TagPickerProps };
