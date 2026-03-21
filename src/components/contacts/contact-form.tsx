"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  tags: string[];
}

interface ContactFormProps {
  initialData?: Partial<ContactFormData>;
  availableTags?: Tag[];
  onSubmit: (data: ContactFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const SOURCE_OPTIONS = [
  { value: "Manual", label: "Manual" },
  { value: "Import", label: "Import" },
  { value: "Web Form", label: "Web Form" },
  { value: "Referral", label: "Referral" },
];

function ContactForm({
  initialData,
  availableTags = [],
  onSubmit,
  onCancel,
  loading,
}: ContactFormProps) {
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [phone, setPhone] = useState(initialData?.phone || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [source, setSource] = useState(initialData?.source || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags || []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      source,
      tags: selectedTags,
    });
  }

  function toggleTag(tagName: string) {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          placeholder="John"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={errors.firstName}
          required
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={errors.lastName}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Company"
          placeholder="Acme Inc."
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <Select
          label="Source"
          options={SOURCE_OPTIONS}
          placeholder="Select source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      {/* Tags */}
      {availableTags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Tags</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.name)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant="custom"
                    color={tag.color}
                    className={
                      isSelected
                        ? "ring-2 ring-offset-1 ring-zinc-400"
                        : "opacity-60 hover:opacity-100"
                    }
                  >
                    {tag.name}
                    {isSelected && <X className="ml-1 h-3 w-3" />}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Save Contact
        </Button>
      </div>
    </form>
  );
}

export { ContactForm };
export type { ContactFormData, ContactFormProps };
