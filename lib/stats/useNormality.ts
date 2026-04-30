// useNormality — React hook that calls /api/statistics/normality
// All components needing normality results must use this hook.
// Never compute normality locally in a component.

import { useState, useEffect, useRef } from "react";
import type { NormalityApiResponse } from "@/app/api/statistics/normality/route";

export type { NormalityApiResponse };

type Status = "idle" | "loading" | "done" | "error";

interface UseNormalityResult {
  results: (NormalityApiResponse | null)[];
  status: Status;
}

/**
 * Runs normality tests for multiple groups via the API.
 * Results are keyed by group index; null means group has < 3 valid values.
 *
 * @param groups  Array of number arrays, one per group
 * @param enabled Whether to run (pass false to skip while data is being typed)
 */
export function useNormality(groups: number[][], enabled = true): UseNormalityResult {
  const [results, setResults] = useState<(NormalityApiResponse | null)[]>([]);
  const [status, setStatus]   = useState<Status>("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Abort any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const validGroups = groups.map(g => g.filter(isFinite));
    const hasAny = validGroups.some(g => g.length >= 3);
    if (!hasAny) {
      setResults(groups.map(() => null));
      setStatus("idle");
      return;
    }

    setStatus("loading");

    Promise.all(
      validGroups.map(async (g): Promise<NormalityApiResponse | null> => {
        if (g.length < 3) return null;
        try {
          const res = await fetch("/api/statistics/normality", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: g }),
            signal: ctrl.signal,
          });
          const json = await res.json() as NormalityApiResponse;
          return json;
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          return null;
        }
      })
    )
      .then(res => {
        if (!ctrl.signal.aborted) {
          setResults(res);
          setStatus("done");
        }
      })
      .catch(err => {
        if (err?.name !== "AbortError") setStatus("error");
      });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(groups), enabled]);

  return { results, status };
}
