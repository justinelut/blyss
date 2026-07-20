import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/utils/client";
import { schemas, unwrap } from "@/lib/api";
import { defaultRetry } from "./retry";

export interface UsePublicProductsParams {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  isFeatured?: boolean;
  isRecurring?: boolean;
  organizationId?: string;
  currency?: string;
  page?: number;
  limit?: number;
}

export const usePublicProducts = (
  parameters?: UsePublicProductsParams,
  options?: {
    initialData?: { items: schemas["Product"][]; pagination: any };
    keepPreviousData?: boolean;
    staleTime?: number;
  },
) =>
  useQuery({
    queryKey: ["products", "public", parameters || {}],
    queryFn: () =>
      unwrap(
        api.GET("/v1/products/public", {
          params: {
            query: {
              search: parameters?.search,
              category: parameters?.category,
              min_price: parameters?.minPrice,
              max_price: parameters?.maxPrice,
              sort: parameters?.sort || "newest",
              is_featured: parameters?.isFeatured,
              is_recurring: parameters?.isRecurring,
              organization_id: parameters?.organizationId,
              currency: parameters?.currency,
              page: parameters?.page || 1,
              limit: parameters?.limit || 24,
            } as Record<string, unknown>,
          },
        }),
      ),
    retry: defaultRetry,
    placeholderData: options?.keepPreviousData ? keepPreviousData : undefined,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: options?.initialData,
  });
