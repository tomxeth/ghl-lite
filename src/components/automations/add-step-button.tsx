"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Mail,
  MessageSquare,
  Tag,
  ArrowRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_OPTIONS = [
  {
    value: "send_email",
    label: "Envoyer un email",
    icon: Mail,
    color: "text-blue-500",
  },
  {
    value: "send_sms",
    label: "Envoyer un SMS",
    icon: MessageSquare,
    color: "text-green-500",
  },
  {
    value: "add_tag",
    label: "Ajouter un tag",
    icon: Tag,
    color: "text-purple-500",
  },
  {
    value: "remove_tag",
    label: "Retirer un tag",
    icon: Tag,
    color: "text-orange-500",
  },
  {
    value: "move_stage",
    label: "Changer d'etape",
    icon: ArrowRight,
    color: "text-indigo-500",
  },
  {
    value: "wait",
    label: "Attendre",
    icon: Clock,
    color: "text-zinc-500",
  },
];

interface AddStepButtonProps {
  onAdd: (action: string) => void;
}

export function AddStepButton({ onAdd }: AddStepButtonProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="flex justify-center relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-full border-2 border-dashed",
          "bg-white transition-all duration-200 cursor-pointer",
          "hover:scale-110 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100",
          open
            ? "border-blue-400 bg-blue-50 scale-110 shadow-md shadow-blue-100"
            : "border-zinc-300"
        )}
        title="Ajouter une etape"
      >
        <Plus
          className={cn(
            "h-4 w-4 transition-colors",
            open ? "text-blue-500" : "text-zinc-400"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50",
            "w-56 rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50",
            "animate-slide-in"
          )}
        >
          <div className="p-1.5">
            {ACTION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onAdd(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left",
                    "text-sm text-zinc-700 transition-colors cursor-pointer",
                    "hover:bg-zinc-50"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", option.color)} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
