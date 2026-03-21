"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/contacts/contact-form";
import type { ContactFormData } from "@/components/contacts/contact-form";

interface Tag {
  id: string;
  name: string;
  color: string;
}

export default function NewContactPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    async function fetchTags() {
      try {
        const res = await fetch("/api/tags");
        const json = await res.json();
        if (res.ok) setTags(json.data);
      } catch {
        // silently fail
      }
    }
    fetchTags();
  }, []);

  async function handleSubmit(data: ContactFormData) {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Échec de la création du contact");
        return;
      }

      router.push(`/contacts/${json.data.id}`);
    } catch {
      setError("Une erreur inattendue s'est produite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/contacts")}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux Contacts
        </Button>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Nouveau contact</CardTitle>
        </CardHeader>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <ContactForm
          availableTags={tags}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/contacts")}
          loading={loading}
        />
      </Card>
    </div>
  );
}
