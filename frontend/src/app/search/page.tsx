"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchApi, type SearchResult, type SearchParams } from "@/lib/api/search";
import { SearchResultCard } from "@/components/search/search-result-card";
import { SearchFilters } from "@/components/search/search-filters";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Loader2, AlertCircle, Users, Building2, MapPin } from "lucide-react";

const typeMap: Record<string, "all" | "people" | "landmarks" | "addresses"> = {
  all: "all",
  people: "people",
  landmarks: "landmarks",
  addresses: "addresses",
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState<"all" | "people" | "landmarks" | "addresses">(
    typeMap[searchParams.get("type") ?? "all"] ?? "all"
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const apiType = type === "all" ? undefined : type;

  async function doSearch(params: SearchParams, append = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await searchApi.search(params);
      if (append) {
        setResults((prev) => [...prev, ...res.data]);
      } else {
        setResults(res.data);
      }
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError("Aucun résultat trouvé ou erreur de recherche.");
      if (!append) setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get("q");
    const t = searchParams.get("type");
    if (q) {
      const mappedType = typeMap[t ?? "all"] ?? "all";
      searchApi.search({ q, type: mappedType === "all" ? undefined : mappedType, page: 1 }).then((res) => {
        setResults(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
      }).catch(() => {
        setResults([]);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setPage(1);
    const params: SearchParams = { q: query.trim(), type: apiType, page: 1 };
    doSearch(params);
    const paramsStr = new URLSearchParams({ q: query.trim(), type }).toString();
    router.replace(`/search?${paramsStr}`);
  }

  function handleTypeChange(newType: typeof type) {
    setType(newType);
    setPage(1);
    if (query.trim()) {
      const params: SearchParams = { q: query.trim(), type: newType === "all" ? undefined : newType, page: 1 };
      doSearch(params);
      const paramsStr = new URLSearchParams({ q: query.trim(), type: newType }).toString();
      router.replace(`/search?${paramsStr}`);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch({ q: query.trim(), type: apiType, page: nextPage }, true);
  }

  const counts = {
    all: total,
    people: results.filter((r) => r.type === "people").length,
    landmarks: results.filter((r) => r.type === "landmark").length,
    addresses: results.filter((r) => r.type === "address").length,
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-3xl space-y-4 p-4 pb-20">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher des personnes, repères, adresses..."
              className="pl-10 h-12 text-lg"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-zinc-400" />}
          </div>
        </form>

        <SearchFilters active={type} onChange={handleTypeChange} counts={counts} />

        {loading && results.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : error ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">{error}</p>
            {query.trim() && (
              <p className="text-sm text-zinc-400">Essayez de modifier votre recherche</p>
            )}
          </CardContent></Card>
        ) : results.length === 0 && query.trim() ? (
          <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Search className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">Aucun résultat pour &ldquo;{query}&rdquo;</p>
          </CardContent></Card>
        ) : results.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <Search className="h-8 w-8 text-zinc-300" />
            <p className="text-zinc-500">Que recherchez-vous ?</p>
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <Users className="h-6 w-6 text-emerald-600" />
                <span className="text-xs">Personnes</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <Building2 className="h-6 w-6 text-amber-600" />
                <span className="text-xs">Repères</span>
              </div>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <MapPin className="h-6 w-6 text-blue-600" />
                <span className="text-xs">Adresses</span>
              </div>
            </div>
          </CardContent></Card>
        ) : (
          <>
            <p className="text-sm text-zinc-500">{total} résultat{total > 1 ? "s" : ""}</p>
            <div className="space-y-3">
              {results.map((r, i) => (
                <SearchResultCard key={`${r.type}-${r.id}-${i}`} result={r} />
              ))}
            </div>
            {page < totalPages && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Charger plus
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
