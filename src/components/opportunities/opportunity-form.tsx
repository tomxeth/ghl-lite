"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface OpportunityFormData {
  title: string;
  contactId: string;
  stageId: string;
  value: number;
  currency: string;
}

interface OpportunityFormProps {
  initialData?: Partial<OpportunityFormData>;
  contacts: Contact[];
  stages: Stage[];
  onSubmit: (data: OpportunityFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (\u20ac)" },
  { value: "GBP", label: "GBP (\u00a3)" },
];

function OpportunityForm({
  initialData,
  contacts,
  stages,
  onSubmit,
  onCancel,
  loading,
}: OpportunityFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [contactId, setContactId] = useState(initialData?.contactId || "");
  const [stageId, setStageId] = useState(
    initialData?.stageId || (stages.length > 0 ? stages[0].id : "")
  );
  const [value, setValue] = useState(
    initialData?.value !== undefined ? String(initialData.value) : "0"
  );
  const [currency, setCurrency] = useState(initialData?.currency || "USD");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contact search
  const [contactSearch, setContactSearch] = useState("");
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false);

  const selectedContact = contacts.find((c) => c.id === contactId);

  const filteredContacts = contactSearch
    ? contacts.filter((c) => {
        const fullName =
          `${c.firstName} ${c.lastName}`.toLowerCase();
        return fullName.includes(contactSearch.toLowerCase());
      })
    : contacts;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!contactId) newErrors.contactId = "Contact is required";
    if (!stageId) newErrors.stageId = "Stage is required";
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0)
      newErrors.value = "Value must be a valid positive number";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      contactId,
      stageId,
      value: parseFloat(value) || 0,
      currency,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Deal Title"
        placeholder="New website project"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      {/* Contact picker with search */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700">Contact</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search contacts..."
            value={
              contactDropdownOpen
                ? contactSearch
                : selectedContact
                  ? `${selectedContact.firstName} ${selectedContact.lastName}`
                  : ""
            }
            onChange={(e) => {
              setContactSearch(e.target.value);
              setContactDropdownOpen(true);
            }}
            onFocus={() => {
              setContactDropdownOpen(true);
              setContactSearch("");
            }}
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1"
          />
          {contactDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setContactDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {filteredContacts.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-zinc-400">
                    No contacts found
                  </p>
                ) : (
                  filteredContacts.slice(0, 20).map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className="flex w-full items-center px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                      onClick={() => {
                        setContactId(contact.id);
                        setContactDropdownOpen(false);
                        setContactSearch("");
                      }}
                    >
                      {contact.firstName} {contact.lastName}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
        {errors.contactId && (
          <p className="text-xs text-red-600">{errors.contactId}</p>
        )}
      </div>

      <Select
        label="Stage"
        options={stages.map((s) => ({ value: s.id, label: s.name }))}
        value={stageId}
        onChange={(e) => setStageId(e.target.value)}
        error={errors.stageId}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Value"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={errors.value}
        />
        <Select
          label="Currency"
          options={CURRENCY_OPTIONS}
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>

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
          {initialData ? "Update Deal" : "Create Deal"}
        </Button>
      </div>
    </form>
  );
}

export { OpportunityForm };
export type { OpportunityFormData, OpportunityFormProps };
