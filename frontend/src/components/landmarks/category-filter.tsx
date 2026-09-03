"use client";

import { CATEGORIES } from "@/lib/api/landmarks";
import { Button } from "@/components/ui/button";

interface CategoryFilterProps {
  selected: string | null;
  onChange: (category: string | null) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(null)}
      >
        Tous
      </Button>
      {CATEGORIES.map((c) => (
        <Button
          key={c.value}
          variant={selected === c.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(c.value === selected ? null : c.value)}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}
