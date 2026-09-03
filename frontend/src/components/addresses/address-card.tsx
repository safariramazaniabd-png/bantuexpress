"use client";

import type { Address } from "@/lib/api/addresses";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Home, Building2, Store, GraduationCap, Trees, Church, Star, Pencil, Trash2, Globe } from "lucide-react";

const typeIcons: Record<string, typeof MapPin> = {
  HOME: Home,
  BUSINESS: Building2,
  SHOP: Store,
  SCHOOL: GraduationCap,
  FARM: Trees,
  ORGANIZATION: Church,
  OTHER: MapPin,
};

const typeLabels: Record<string, string> = {
  HOME: "Domicile",
  BUSINESS: "Entreprise",
  OFFICE: "Bureau",
  SHOP: "Boutique",
  SCHOOL: "École",
  FARM: "Ferme",
  ORGANIZATION: "Organisation",
  EVENT: "Événement",
  OTHER: "Autre",
};

interface AddressCardProps {
  address: Address;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSelect?: (address: Address) => void;
}

export function AddressCard({ address, onEdit, onDelete, onSelect }: AddressCardProps) {
  const Icon = typeIcons[address.type] ?? MapPin;

  return (
    <Card
      className={`transition hover:shadow-sm ${onSelect ? "cursor-pointer" : ""}`}
      onClick={() => onSelect?.(address)}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">
              {address.label || typeLabels[address.type] || address.type}
            </h3>
            {address.isPrimary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                <Star className="h-3 w-3" />
                Principale
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-500 mt-0.5">
            {[address.avenue, address.quartier].filter(Boolean).join(", ")}
            {address.avenue || address.quartier ? " — " : ""}
            {address.city}
            {address.province ? `, ${address.province}` : ""}
          </p>

          {address.latitude && address.longitude && (
            <p className="text-xs text-zinc-400 mt-1">
              {address.latitude.toFixed(4)}, {address.longitude.toFixed(4)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {address.isPublic && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                <Globe className="h-3 w-3" />
                Public
              </span>
            )}
          </div>
        </div>

        {(onEdit || onDelete) && (
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onEdit(address.id); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={(e) => { e.stopPropagation(); onDelete(address.id); }}
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
