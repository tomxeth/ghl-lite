"use client";

import { useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface CallControlsProps {
  contactId: string;
  hasPhone: boolean;
  onCallInitiated: () => void;
}

function CallControls({
  contactId,
  hasPhone,
  onCallInitiated,
}: CallControlsProps) {
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const toast = useToast();

  async function handleCall() {
    if (calling) return;

    setCalling(true);
    setCallStatus("initiating");

    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });

      if (res.ok) {
        setCallStatus("initiated");
        toast.success("Call initiated");
        onCallInitiated();

        // Reset status after a delay
        setTimeout(() => {
          setCallStatus(null);
          setCalling(false);
        }, 5000);
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to initiate call");
        setCallStatus(null);
        setCalling(false);
      }
    } catch {
      toast.error("An unexpected error occurred");
      setCallStatus(null);
      setCalling(false);
    }
  }

  if (!hasPhone) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <PhoneOff className="h-5 w-5 text-zinc-400" />
        <p className="text-sm text-zinc-400">
          No phone number on file for this contact.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <Button onClick={handleCall} disabled={calling} loading={calling}>
        <Phone className="h-4 w-4" />
        Call
      </Button>
      {callStatus && (
        <Badge
          variant={
            callStatus === "initiated"
              ? "success"
              : callStatus === "initiating"
              ? "warning"
              : "default"
          }
        >
          {callStatus === "initiating" ? "Connecting..." : "Call in progress"}
        </Badge>
      )}
    </div>
  );
}

export { CallControls };
export type { CallControlsProps };
