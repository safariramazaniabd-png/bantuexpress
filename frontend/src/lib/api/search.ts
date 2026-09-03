import { apiClient } from "@/lib/api-client";

export type SearchResultType = "people" | "address" | "landmark";

export interface PeopleResult {
  type: "people";
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profession: string | null;
  avatarUrl: string | null;
  city: string | null;
  languages: string[];
}

export interface AddressSearchResult {
  type: "address";
  id: string;
  label: string | null;
  avenue: string | null;
  quartier: string | null;
  city: string;
  province: string;
  isPublic: boolean;
}

export interface LandmarkSearchResult {
  type: "landmark";
  id: string;
  name: string;
  category: string;
  description: string | null;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

export type SearchResult = PeopleResult | AddressSearchResult | LandmarkSearchResult;

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SearchParams {
  q?: string;
  type?: "people" | "landmarks" | "addresses" | "all";
  city?: string;
  province?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export const searchApi = {
  search: (params: SearchParams) =>
    apiClient.get<PaginatedResponse<SearchResult>>("/search", params as Record<string, string>),
};
