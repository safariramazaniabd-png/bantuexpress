"use client";

import type { SearchResult } from "@/lib/api/search";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Building2, User, Briefcase, Globe, Languages, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface SearchResultCardProps {
  result: SearchResult;
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const router = useRouter();

  if (result.type === "people") {
    return (
      <Card className="transition hover:shadow-sm cursor-pointer" onClick={() => router.push(`/u/${result.userId}`)}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{result.firstName} {result.lastName}</h3>
            {result.profession && (
              <p className="flex items-center gap-1 text-sm text-zinc-500">
                <Briefcase className="h-3 w-3" />
                {result.profession}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-0.5">
              {result.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{result.city}</span>}
              {result.languages.length > 0 && (
                <span className="flex items-center gap-1"><Languages className="h-3 w-3" />{result.languages.join(", ")}</span>
              )}
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
        </CardContent>
      </Card>
    );
  }

  if (result.type === "landmark") {
    return (
      <Card className="transition hover:shadow-sm cursor-pointer" onClick={() => router.push(`/landmarks/${result.id}/edit`)}>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <Building2 className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{result.name}</h3>
            {result.description && <p className="text-sm text-zinc-500 line-clamp-1">{result.description}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-0.5">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{result.category}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{result.city}</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition hover:shadow-sm cursor-pointer" onClick={() => router.push(`/addresses/${result.id}/edit`)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <MapPin className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{result.label ?? result.avenue ?? "Adresse"}</h3>
          <p className="text-sm text-zinc-500">
            {[result.avenue, result.quartier].filter(Boolean).join(", ")}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-0.5">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{result.city}, {result.province}</span>
            {result.isPublic && <Globe className="h-3 w-3" />}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0" />
      </CardContent>
    </Card>
  );
}
