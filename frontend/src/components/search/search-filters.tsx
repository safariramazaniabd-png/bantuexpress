"use client";

import { Button } from "@/components/ui/button";

type SearchTab = "all" | "people" | "landmarks" | "addresses";

interface SearchFiltersProps {
  active: SearchTab;
  onChange: (tab: SearchTab) => void;
  counts: { all: number; people: number; landmarks: number; addresses: number };
}

const tabs: { id: SearchTab; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "people", label: "Personnes" },
  { id: "landmarks", label: "Repères" },
  { id: "addresses", label: "Adresses" },
];

export function SearchFilters({ active, onChange, counts }: SearchFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <Button
          key={t.id}
          variant={active === t.id ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(t.id)}
          className="shrink-0"
        >
          {t.label}
          {counts[t.id] > 0 && (
            <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-xs dark:bg-zinc-700">
              {counts[t.id]}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
