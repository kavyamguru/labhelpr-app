// POST /api/statistics/normality
// Centralized normality testing endpoint — single source of truth for all features.
//
// Any feature that needs normality testing MUST call this endpoint.
// Never duplicate this logic in components or other modules.
//
// Request:  { "data": number[], "test"?: "auto" | "shapiro-wilk" | "dagostino-pearson" }
// Response: NormalityApiResponse (see type below)

import { NextRequest, NextResponse } from "next/server";
import { shapiroWilk, dagostinoPearson } from "@/lib/stats/descriptive";

export interface NormalityApiResponse {
  test: "Shapiro-Wilk" | "D'Agostino-Pearson";
  stat: number;
  p: number;
  is_normal: boolean;
  interpretation: string;
  n: number;
  error?: string;
}

// Selection rule (mirrors GraphPad Prism behaviour):
//   n 3–50   → Shapiro–Wilk  (more powerful for small samples)
//   n 51+    → D'Agostino-Pearson  (better calibrated for large n)
function selectTest(n: number, requested?: string): "sw" | "dp" {
  if (requested === "shapiro-wilk") return "sw";
  if (requested === "dagostino-pearson") return "dp";
  return n <= 50 ? "sw" : "dp";
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data, test: requestedTest } = body as { data?: unknown; test?: unknown };

  if (!Array.isArray(data)) {
    return NextResponse.json({ error: "Field 'data' must be a number array" }, { status: 400 });
  }

  const nums: number[] = data.map(Number).filter(isFinite);

  if (nums.length < 3) {
    return NextResponse.json(
      {
        error: "At least 3 values required for normality testing",
        test: "Shapiro-Wilk",
        stat: null,
        p: null,
        is_normal: null,
        interpretation: "Normality test failed — check data",
        n: nums.length,
      },
      { status: 422 },
    );
  }

  const which = selectTest(nums.length, typeof requestedTest === "string" ? requestedTest : undefined);
  const result = which === "sw" ? shapiroWilk(nums) : dagostinoPearson(nums);

  // Built-in validation (§6 requirement)
  if (result.error || !isFinite(result.stat) || !isFinite(result.p) || result.p <= 0) {
    return NextResponse.json(
      {
        test: result.test,
        stat: result.stat,
        p: result.p,
        is_normal: false,
        interpretation: "Normality test failed — check data",
        n: nums.length,
        error: result.error ?? "Normality test failed — invalid statistical output",
      },
      { status: 422 },
    );
  }

  const response: NormalityApiResponse = {
    test: result.test,
    stat: result.stat,
    p: result.p,
    is_normal: result.normal,
    interpretation: result.interpretation,
    n: nums.length,
  };

  return NextResponse.json(response);
}
