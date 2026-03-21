"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertCircle, CheckCircle2 } from "lucide-react";

interface InviteDetails {
  teamName: string;
  inviterName: string;
  role: string;
  email: string;
}

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/team/invite/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid invite");
          return;
        }

        setInvite(data.data);
      } catch {
        setError("Failed to load invite details");
      } finally {
        setLoading(false);
      }
    }

    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        setIsLoggedIn(res.ok);
      } catch {
        setIsLoggedIn(false);
      }
    }

    fetchInvite();
    checkAuth();
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/team/invite/${token}`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invite");
        return;
      }

      setAccepted(true);
      setTimeout(() => router.push("/settings"), 1500);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setAccepting(false);
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "warning" as const;
      case "viewer":
        return "default" as const;
      default:
        return "success" as const;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-sm">
        <Card>
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-12 w-12 rounded-full bg-zinc-100 animate-pulse" />
            <div className="h-4 w-48 rounded bg-zinc-100 animate-pulse" />
            <div className="h-4 w-32 rounded bg-zinc-100 animate-pulse" />
          </div>
        </Card>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="w-full max-w-sm">
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm text-zinc-600">{error}</p>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Go to Login
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="w-full max-w-sm">
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium text-zinc-900">
              You have joined {invite?.teamName}!
            </p>
            <p className="text-xs text-zinc-500">Redirecting to settings...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <Card>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <Users className="h-6 w-6 text-zinc-600" />
          </div>

          <CardHeader className="p-0">
            <CardTitle className="text-lg">Team Invitation</CardTitle>
          </CardHeader>

          <p className="text-sm text-zinc-600">
            You have been invited to join{" "}
            <span className="font-semibold text-zinc-900">
              {invite?.teamName}
            </span>{" "}
            as a{" "}
            <Badge variant={roleBadgeVariant(invite?.role || "member")}>
              {invite?.role}
            </Badge>
          </p>

          <p className="text-xs text-zinc-400">
            Invited by {invite?.inviterName}
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 w-full">
              {error}
            </p>
          )}

          {isLoggedIn ? (
            <Button
              onClick={handleAccept}
              loading={accepting}
              className="w-full"
            >
              Accept Invite
            </Button>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <Link href={`/register?invite=${token}`} className="w-full">
                <Button className="w-full">Register to Accept</Button>
              </Link>
              <Link href={`/login?invite=${token}`} className="w-full">
                <Button variant="secondary" className="w-full">
                  Sign In to Accept
                </Button>
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
