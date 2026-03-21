"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface Pipeline {
  id: string;
  name: string;
}

interface OpportunityRow {
  id: string;
  title: string;
  value: number;
  currency: string;
  status: string;
  createdAt: string;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
  };
  stage: {
    id: string;
    name: string;
    color: string;
    pipeline: {
      id: string;
      name: string;
    };
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function getStatusVariant(status: string) {
  switch (status) {
    case "won":
      return "success";
    case "lost":
      return "danger";
    default:
      return "default";
  }
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load pipelines for filter
  useEffect(() => {
    async function fetchPipelines() {
      try {
        const res = await fetch("/api/pipelines");
        const json = await res.json();
        if (res.ok) setPipelines(json.data || []);
      } catch {
        // silently fail
      }
    }
    fetchPipelines();
  }, []);

  // Load opportunities
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all")
        params.set("status", statusFilter);
      if (pipelineFilter) params.set("pipelineId", pipelineFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/opportunities?${params.toString()}`);
      const json = await res.json();

      if (res.ok) {
        setOpportunities(json.data.opportunities || []);
        setTotal(json.data.total || 0);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, pipelineFilter, page]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const totalPages = Math.ceil(total / limit);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Opportunities</h1>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-36"
        />

        {pipelines.length > 0 && (
          <Select
            options={[
              { value: "", label: "All Pipelines" },
              ...pipelines.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={pipelineFilter}
            onChange={(e) => {
              setPipelineFilter(e.target.value);
              setPage(1);
            }}
            className="w-44"
          />
        )}
      </div>

      {/* Table */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Stage
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600">
                  Value
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))
              ) : opportunities.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-zinc-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Target className="h-8 w-8 text-zinc-300" />
                      <p>No opportunities found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => router.push(`/opportunities/${opp.id}`)}
                    className={cn(
                      "border-b border-zinc-100 transition-colors cursor-pointer",
                      "hover:bg-zinc-50"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {opp.title}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {opp.contact.firstName} {opp.contact.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="custom" color={opp.stage.color}>
                        {opp.stage.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(opp.value, opp.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusVariant(opp.status) as "success" | "danger" | "default"}>
                        {opp.status.charAt(0).toUpperCase() +
                          opp.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {format(new Date(opp.createdAt), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
