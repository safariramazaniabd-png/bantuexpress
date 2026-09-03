"use client";

import type { Landmark } from "@/lib/api/landmarks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin, Route, Building2, Landmark as Monument, Trees, School, Hospital, Store, Pencil, Trash2, Globe,
} from "lucide-react";

const categoryIcons: Record<string, typeof MapPin> = {
  ROUTE: Route,
  NEIGHBORHOOD: MapPin,
  BUILDING: Building2,
  MONUMENT: Monument,
  PARK: Trees,
  SCHOOL: School,
  HOSPITAL: Hospital,
  MARKET: Store,
  OTHER: MapPin,
};

const categoryLabels: Record<string, string> = {
  ROUTE: "Route",
  NEIGHBORHOOD: "Quartier",
  BUILDING: "Bâtiment",
  MONUMENT: "Monument",
  PARK: "Parc",
  SCHOOL: "École",
  HOSPITAL: "Hôpital",
  MARKET: "Marché",
  OTHER: "Autre",
};

interface LandmarkCardProps {
  landmark: Landmark;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (landmark: Landmark) => void;
}

export function LandmarkCard({ landmark, onEdit, onDelete, onSelect }: LandmarkCardProps) {
  const Icon = categoryIcons[landmark.category] ?? MapPin;

  return (
    <Card
      className={`transition hover:shadow-sm ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => onSelect?.(landmark)}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <Icon className="h-5 w-5 text-amber-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{landmark.name}</h3>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {categoryLabels[landmark.category] ?? landmark.category}
            </span>
          </div>

          {landmark.description && (
            <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{landmark.description}</p>
          )}

          <p className="text-sm text-zinc-400 mt-1">
            {landmark.address ? `${landmark.address}, ` : ""}
            {landmark.city}{landmark.province ? `, ${landmark.province}` : ""}
          </p>

          <p className="text-xs text-zinc-400 mt-0.5">
            {landmark.latitude.toFixed(4)}, {landmark.longitude.toFixed(4)}
          </p>

          {landmark.isPublic && (
            <Globe className="h-3 w-3 text-zinc-400 mt-1" />
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onEdit(landmark.id); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(landmark.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
