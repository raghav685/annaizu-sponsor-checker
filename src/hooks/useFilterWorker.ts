"use client";

import { useEffect, useRef } from "react";
import { useExplorerStore } from "@/lib/store";

export function useFilterWorker() {
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef(false);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFiltersRef = useRef<ReturnType<typeof useExplorerStore.getState>["filters"] | null>(null);

  const sponsors = useExplorerStore((s) => s.sponsors);
  const filters = useExplorerStore((s) => s.filters);
  const setResult = useExplorerStore((s) => s.setResult);
  const setIsFiltering = useExplorerStore((s) => s.setIsFiltering);

  useEffect(() => {
    const worker = new Worker(new URL("../workers/filter.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "ready") {
        readyRef.current = true;
        if (pendingFiltersRef.current) {
          send(pendingFiltersRef.current);
        }
        return;
      }
      if (msg.type === "result" && msg.requestId === requestIdRef.current) {
        setResult({ ids: msg.ids, stats: msg.stats });
        setIsFiltering(false);
      }
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(f: typeof filters) {
    if (!workerRef.current || !readyRef.current) {
      pendingFiltersRef.current = f;
      return;
    }
    requestIdRef.current += 1;
    workerRef.current.postMessage({ type: "query", filters: f, requestId: requestIdRef.current });
  }

  // Initialise the worker's dataset once sponsors are loaded.
  useEffect(() => {
    if (!sponsors || !workerRef.current) return;
    workerRef.current.postMessage({ type: "init", sponsors });
  }, [sponsors]);

  // Debounced query on every filter change.
  useEffect(() => {
    if (!sponsors) return;
    setIsFiltering(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => send(filters), 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, sponsors]);
}
