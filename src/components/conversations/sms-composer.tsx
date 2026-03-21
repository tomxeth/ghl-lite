"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SmsComposerProps {
  contactId: string;
  hasPhone: boolean;
  onSent: (message: {
    id: string;
    direction: string;
    body: string;
    status: string;
    createdAt: string;
    kind: string;
  }) => void;
}

function SmsComposer({ contactId, hasPhone, onSent }: SmsComposerProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!body.trim() || sending) return;

    setSending(true);

    // Optimistically add the message
    const optimistic = {
      id: `temp-${Date.now()}`,
      direction: "outbound",
      body: body.trim(),
      status: "sending",
      createdAt: new Date().toISOString(),
      kind: "sms",
    };
    onSent(optimistic);

    const messageBody = body.trim();
    setBody("");

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, body: messageBody }),
      });

      if (!res.ok) {
        const json = await res.json();
        console.error("Send SMS failed:", json.error);
      }
    } catch (error) {
      console.error("Send SMS error:", error);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const charCount = body.length;
  const maxChars = 1600;

  return (
    <div className="border-t border-zinc-200 p-3">
      {!hasPhone ? (
        <p className="text-center text-sm text-zinc-400">
          Ce contact n'a pas de numéro de téléphone.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tapez un message..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!body.trim() || sending}
              loading={sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-end">
            <span
              className={`text-[11px] ${
                charCount > maxChars ? "text-red-500" : "text-zinc-400"
              }`}
            >
              {charCount} / {maxChars}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { SmsComposer };
export type { SmsComposerProps };
