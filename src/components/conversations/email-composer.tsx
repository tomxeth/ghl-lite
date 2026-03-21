"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactEmail: string | null;
  onSent: () => void;
}

function EmailComposer({
  open,
  onClose,
  contactId,
  contactEmail,
  onSent,
}: EmailComposerProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const toast = useToast();

  async function handleSend() {
    if (!subject.trim() || !body.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Email envoyé avec succès");
        setSubject("");
        setBody("");
        onSent();
        onClose();
      } else {
        const json = await res.json();
        toast.error(json.error || "Échec de l'envoi de l'email");
      }
    } catch {
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rédiger un email">
      <div className="flex flex-col gap-4">
        {!contactEmail && (
          <p className="text-sm text-red-600">
            Ce contact n'a pas d'adresse email.
          </p>
        )}

        <div className="text-sm text-zinc-500">
          À : {contactEmail || "Pas d'email"}
        </div>

        <Input
          label="Objet"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Objet de l'email..."
          disabled={!contactEmail || sending}
        />

        <Textarea
          label="Corps"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Rédigez votre email..."
          rows={6}
          disabled={!contactEmail || sending}
        />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!contactEmail || !subject.trim() || !body.trim()}
            loading={sending}
          >
            <Send className="h-4 w-4" />
            Envoyer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { EmailComposer };
export type { EmailComposerProps };
