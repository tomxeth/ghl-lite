"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonAvatar } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  tags: Tag[];
  createdAt: string;
}

interface ContactTableProps {
  contacts: Contact[];
  loading?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-4 w-32" />
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Skeleton className="h-4 w-40" />
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Skeleton className="h-4 w-28" />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </td>
      <td className="px-4 py-3 hidden xl:table-cell">
        <Skeleton className="h-4 w-20" />
      </td>
    </tr>
  );
}

function ContactTable({ contacts, loading }: ContactTableProps) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium hidden sm:table-cell">
              Email
            </th>
            <th className="px-4 py-3 font-medium hidden md:table-cell">
              Phone
            </th>
            <th className="px-4 py-3 font-medium hidden lg:table-cell">
              Tags
            </th>
            <th className="px-4 py-3 font-medium hidden xl:table-cell">
              Created
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : contacts.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-12 text-center text-zinc-400"
              >
                No contacts found.
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className={cn(
                  "border-b border-zinc-100 transition-colors cursor-pointer",
                  "hover:bg-zinc-50"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      firstName={contact.firstName}
                      lastName={contact.lastName}
                      size="sm"
                    />
                    <span className="font-medium text-zinc-900">
                      {contact.firstName} {contact.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600 hidden sm:table-cell">
                  {contact.email || "--"}
                </td>
                <td className="px-4 py-3 text-zinc-600 hidden md:table-cell">
                  {contact.phone ? formatPhone(contact.phone) : "--"}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1.5">
                    {contact.tags.length > 0
                      ? contact.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="custom"
                            color={tag.color}
                          >
                            {tag.name}
                          </Badge>
                        ))
                      : <span className="text-zinc-400">--</span>}
                    {contact.tags.length > 3 && (
                      <Badge variant="default">
                        +{contact.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 hidden xl:table-cell">
                  {formatDistanceToNow(new Date(contact.createdAt), {
                    addSuffix: true,
                  })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export { ContactTable };
export type { Contact, Tag, ContactTableProps };
