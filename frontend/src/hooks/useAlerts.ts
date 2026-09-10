"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAlerts, type AlertsParams, type AlertItem, type AlertsResponse } from "@/lib/api";

interface UseAlertsOptions extends AlertsParams {
  pageSize?: number;
  debounceMs?: number;
}

interface UseAlertsReturn {
  items: AlertItem[];
  total: number;
  totalIndexed: number;
  verdictCounts: Record<string, number> | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useAlerts({
  pageSize = 50,
  debounceMs = 200,
  ...params
}: UseAlertsOptions = {}): UseAlertsReturn {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalIndexed, setTotalIndexed] = useState(0);
  const [verdictCounts, setVerdictCounts] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable stringified key of filter params (excluding offset) for change detection
  const paramsKey = JSON.stringify({
    ...params,
    limit: pageSize,
    offset: undefined,
  });

  const doFetch = useCallback(
    async (fetchOffset: number, append: boolean) => {
      // Cancel prior in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setError(null);

      try {
        const data: AlertsResponse = await fetchAlerts({
          ...params,
          limit: pageSize,
          offset: fetchOffset,
        });

        setTotal(data.total);
        if (data.total_indexed != null) {
          setTotalIndexed(data.total_indexed);
        }
        if (data.verdict_counts != null) {
          setVerdictCounts(data.verdict_counts);
        }
        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load alerts");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paramsKey, pageSize],
  );

  // Reset and refetch when filters change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setOffset(0);
      doFetch(0, false);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, debounceMs]);

  const refresh = useCallback(() => {
    setOffset(0);
    doFetch(0, false);
  }, [doFetch, setOffset]);

  const loadMore = useCallback(() => {
    const nextOffset = offset + pageSize;
    setOffset(nextOffset);
    doFetch(nextOffset, true);
  }, [offset, pageSize, doFetch, setOffset]);

  const hasMore = items.length < total;

  return {
    items,
    total,
    totalIndexed,
    verdictCounts,
    isLoading,
    error,
    refresh,
    loadMore,
    hasMore,
  };
}
