"use client";

import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: AvatarSize;
  className?: string;
}

const AVATAR_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#06B6D4", // cyan
  "#6366F1", // indigo
  "#F97316", // orange
];

function getColorFromName(firstName: string, lastName: string): string {
  const str = `${firstName}${lastName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ firstName, lastName, size = "md", className }: AvatarProps) {
  const initials = getInitials(firstName, lastName);
  const bgColor = getColorFromName(firstName, lastName);

  const sizes: Record<AvatarSize, string> = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-11 w-11 text-base",
  };

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        sizes[size],
        className
      )}
      style={{ backgroundColor: bgColor }}
      title={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}

export { Avatar };
export type { AvatarProps };
