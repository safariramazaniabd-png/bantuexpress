"use client";

import type { BusinessProfile } from "@/lib/api/business-profiles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Globe, ShieldCheck, Pencil, Trash2 } from "lucide-react";

const typeLabels: Record<string, string> = {
  ENTERPRISE: "Entreprise",
  NGO: "ONG",
  GOVERNMENT: "Administration",
};

interface BusinessCardProps {
  business: BusinessProfile;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}

export function BusinessCard({ business, onEdit, onDelete, onClick }: BusinessCardProps) {
  return (
    <Card className={`transition hover:shadow-sm ${onClick ? "cursor-pointer" : ""}`} onClick={onClick}>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-violet-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{business.name}</h3>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {typeLabels[business.type] ?? business.type}
            </span>
            {business.isVerified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />}
          </div>
          {business.sector && (
            <p className="text-sm text-zinc-500 mt-0.5">{business.sector}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-1">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{business.city}</span>
            {business.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />Site web</span>}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={(e) => { e.stopPropagation(); onEdit(business.id); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                onClick={(e) => { e.stopPropagation(); onDelete(business.id); }}
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
