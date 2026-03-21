"use client";

import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";

const pageTitles: Record<string, string> = {
  "/contacts": "Contacts",
  "/pipeline": "Pipeline",
  "/opportunities": "Opportunities",
  "/conversations": "Conversations",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return title;
    }
  }
  return "Dashboard";
}

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:hidden">
      {/* Left spacer for hamburger button */}
      <div className="w-10" />

      <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>

      <Link
        href="/contacts/new"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
        aria-label="Quick add"
      >
        <Plus className="h-4 w-4" />
      </Link>
    </header>
  );
}
