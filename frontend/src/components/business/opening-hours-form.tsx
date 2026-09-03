"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAYS, type OpeningHourEntry } from "@/lib/api/business-profiles";
import { Loader2, X } from "lucide-react";

interface OpeningHoursFormProps {
  hours?: OpeningHourEntry[];
  onSave: (hours: OpeningHourEntry[]) => Promise<void>;
}

export function OpeningHoursForm({ hours = [], onSave }: OpeningHoursFormProps) {
  const [entries, setEntries] = useState<OpeningHourEntry[]>(
    hours.length > 0 ? hours : DAYS.map((_, i) => ({ dayOfWeek: i, open: "08:00", close: "18:00" }))
  );
  const [saving, setSaving] = useState(false);

  function updateEntry(dayOfWeek: number, field: "open" | "close", value: string) {
    setEntries((prev) => prev.map((e) => e.dayOfWeek === dayOfWeek ? { ...e, [field]: value } : e));
  }

  function toggleDay(dayOfWeek: number) {
    if (entries.some((e) => e.dayOfWeek === dayOfWeek)) {
      setEntries((prev) => prev.filter((e) => e.dayOfWeek !== dayOfWeek));
    } else {
      setEntries([...entries, { dayOfWeek, open: "08:00", close: "18:00" }]);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(entries);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {DAYS.map((day, i) => {
        const entry = entries.find((e) => e.dayOfWeek === i);
        return (
          <div key={i} className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm w-28 shrink-0">
              <input type="checkbox" checked={!!entry} onChange={() => toggleDay(i)} className="rounded border-zinc-300" />
              {day}
            </label>
            {entry && (
              <div className="flex items-center gap-2">
                <Input type="time" value={entry.open} onChange={(e) => updateEntry(i, "open", e.target.value)}
                  className="h-8 w-24 text-xs" />
                <span className="text-xs text-zinc-400">à</span>
                <Input type="time" value={entry.close} onChange={(e) => updateEntry(i, "close", e.target.value)}
                  className="h-8 w-24 text-xs" />
              </div>
            )}
          </div>
        );
      })}
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Enregistrer les horaires
      </Button>
    </div>
  );
}
