// LabHelpr — Descriptive statistics engine
// Uses simple-statistics (v7) and jstat for publication-grade calculations.
//
// References:
//   Royston (1992) Appl. Stat. 41:115–124 (AS R94 algorithm for Shapiro–Wilk)
//   D'Agostino & Pearson (1973) Biometrika 60:613–622
//   D'Agostino, Belanger & D'Agostino Jr. (1990) Am Stat 44:316–321
//   Grubbs (1969) Technometrics 11:1–21
//   Tukey (1977) Exploratory Data Analysis
//   Limpert, Stahel & Abbt (2001) BioScience 51:341–352

import {
  mean as ssMean,
  median as ssMedian,
  sampleStandardDeviation,
  quantile,
  sampleSkewness,
  sampleKurtosis,
  geometricMean,
  min as ssMin,
  max as ssMax,
} from "simple-statistics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import jStat from "jstat";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface DescStats {
  n: number;
  mean: number;
  median: number;
  sd: number;        // sample SD, Bessel's correction (n-1)
  sem: number;
  ci95Low: number;
  ci95High: number;
  iqr: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  cv: number;        // CV%
  range: number;
  skewness: number;  // Fisher's g1 (sample, unbiased)
  kurtosis: number;  // Fisher's g2 excess kurtosis
  geomMean: number | null;
  geomSD: number | null;  // geometric SD factor = exp(SD of ln x)
}

export interface NormalityResult {
  test: "Shapiro-Wilk" | "D'Agostino-Pearson";
  stat: number;
  p: number;
  normal: boolean;   // p > 0.05
  interpretation: string;
  error?: string;
}

export interface GrubbsResult {
  outlierIndex: number;
  outlierValue: number;
  gStat: number;
  gCrit: number;
  isOutlier: boolean;
}

export interface IQROutlier {
  index: number;
  value: number;
  type: "mild" | "extreme";  // 1.5× vs 3× IQR
}

// ─────────────────────────────────────────────────────────────────────────────
// Descriptive statistics
// ─────────────────────────────────────────────────────────────────────────────

export function computeStats(values: number[]): DescStats {
  const n = values.length;

  const mn  = ssMean(values);
  const med = ssMedian(values);
  const q1  = quantile(values, 0.25);   // R type-7 interpolation
  const q3  = quantile(values, 0.75);
  const iqr = q3 - q1;

  const sd  = n > 1 ? sampleStandardDeviation(values) : 0;
  const sem = n > 1 ? sd / Math.sqrt(n) : 0;

  // 95% CI via exact t-distribution (jStat)
  let ci95Low = mn, ci95High = mn;
  if (n > 1) {
    const tCrit = jStat.studentt.inv(0.975, n - 1);
    ci95Low  = mn - tCrit * sem;
    ci95High = mn + tCrit * sem;
  }

  const cv       = mn !== 0 ? (sd / Math.abs(mn)) * 100 : NaN;
  const skewness = n >= 3 ? sampleSkewness(values) : 0;
  const kurtosis = n >= 4 ? sampleKurtosis(values) : 0;

  // Geometric mean + geometric SD factor (Limpert et al. 2001)
  const allPos = values.every(v => v > 0);
  let geomMean: number | null = null;
  let geomSD:   number | null = null;
  if (allPos && n > 1) {
    geomMean = geometricMean(values);
    const lnMean = Math.log(geomMean);
    const lnSD   = Math.sqrt(
      values.reduce((s, v) => s + (Math.log(v) - lnMean) ** 2, 0) / (n - 1)
    );
    geomSD = Math.exp(lnSD);
  }

  return {
    n, mean: mn, median: med, sd, sem, ci95Low, ci95High,
    iqr, q1, q3,
    min: ssMin(values),
    max: ssMax(values),
    cv, range: ssMax(values) - ssMin(values),
    skewness, kurtosis, geomMean, geomSD,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Shapiro–Wilk  — exact port of R's swilk.c (AS R94, Royston 1995)
//   Applied Statistics (1995) vol.44 no.4, 547-551
//   n = 3–5000; falls back to D'Agostino-Pearson for n > 5000
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Horner's method polynomial evaluation: cc[0] + x*(cc[1] + x*(cc[2]+...))
 * Matches R's poly() in swilk.c exactly.
 */
function swPoly(cc: number[], x: number): number {
  let p = x * cc[cc.length - 1];
  for (let j = cc.length - 2; j > 0; j--) p = (p + cc[j]) * x;
  return cc[0] + p;
}

export function shapiroWilk(values: number[]): NormalityResult {
  const n = values.length;

  if (n < 3) {
    return {
      test: "Shapiro-Wilk", stat: NaN, p: NaN, normal: true,
      error: "At least 3 values required for Shapiro–Wilk test",
      interpretation: "Normality test failed — check data",
    };
  }
  if (n > 5000) return dagostinoPearson(values);

  // Sorted data (R scales by range to avoid precision issues)
  const xs = [...values].sort((a, b) => a - b);
  const range = xs[n - 1] - xs[0];
  if (range < 1e-10) {
    return {
      test: "Shapiro-Wilk", stat: NaN, p: NaN, normal: false,
      error: "All values are identical — normality undefined",
      interpretation: "Normality test failed — check data",
    };
  }
  const x = xs.map(v => v / range);   // range-scaled, mirrors R

  // ── AS R94 polynomial constants (exactly as in R's swilk.c) ─────────────
  //  c1, c2: for a-coefficient computation (W statistic)
  //  g, c3, c4: p-value for n ≤ 11
  //  c5, c6: p-value for n ≥ 12
  const c1 = [0, 0.221157, -0.147981, -2.07119,  4.434685, -2.706056];
  const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
  const g  = [-2.273, 0.459];   // gamma correction for n ≤ 11
  const c3 = [0.544,    -0.39978,  0.025054, -6.714e-4];
  const c4 = [1.3822,   -0.77857,  0.062767, -0.0020322];
  const c5 = [-1.5861,  -0.31082, -0.083751,  0.0038915];
  const c6 = [-0.4803,  -0.082676, 0.0030302];

  const nn2 = Math.floor(n / 2);

  // ── Compute a-coefficients (1-based, length nn2) ─────────────────────────
  const a = new Array<number>(nn2 + 1).fill(0);  // 1-based, a[1..nn2]

  if (n === 3) {
    a[1] = Math.SQRT1_2;   // = 1/√2 = 0.70710678
  } else {
    const an25 = n + 0.25;
    let summ2 = 0;
    for (let i = 1; i <= nn2; i++) {
      a[i] = jStat.normal.inv((i - 0.375) / an25, 0, 1);
      summ2 += a[i] * a[i];
    }
    summ2 *= 2;
    const ssumm2 = Math.sqrt(summ2);
    const rsn    = 1 / Math.sqrt(n);

    const a1 = swPoly(c1, rsn) - a[1] / ssumm2;

    let i1: number;
    if (n > 5) {
      i1 = 3;
      const a2 = swPoly(c2, rsn) - a[2] / ssumm2;
      const fac = Math.sqrt(
        (summ2 - 2 * a[1] ** 2 - 2 * a[2] ** 2) /
        (1    - 2 * a1   ** 2 - 2 * a2   ** 2)
      );
      a[2] = a2;
      for (let i = i1; i <= nn2; i++) a[i] /= -fac;
    } else {
      i1 = 2;
      const fac = Math.sqrt(
        (summ2 - 2 * a[1] ** 2) / (1 - 2 * a1 ** 2)
      );
      for (let i = i1; i <= nn2; i++) a[i] /= -fac;
    }
    a[1] = a1;
  }

  // ── W statistic ──────────────────────────────────────────────────────────
  // Accumulate sa (sum of a), sx (sum of x), ssa, ssx, sax (mirrors R)
  let sa = -a[1], sx = x[0];
  for (let i = 1; i < n; i++) {
    const j = n - 1 - i;
    const aij = i !== j ? Math.sign(i - j) * a[1 + Math.min(i, j)] : 0;
    sa += aij;
    sx += x[i];
  }
  sa /= n; sx /= n;

  let ssa = 0, ssx = 0, sax = 0;
  for (let i = 0, j = n - 1; i < n; i++, j--) {
    const asa = i !== j ? Math.sign(i - j) * a[1 + Math.min(i, j)] - sa : -sa;
    const xsx = x[i] - sx;
    ssa += asa * asa;
    ssx += xsx * xsx;
    sax += asa * xsx;
  }

  const ssassx = Math.sqrt(ssa * ssx);
  const w1 = (ssassx - sax) * (ssassx + sax) / (ssa * ssx);
  const W  = Math.max(0, Math.min(1, 1 - w1));

  // ── n = 3 exact p-value ──────────────────────────────────────────────────
  if (n === 3) {
    const PI6 = 6 / Math.PI, STQR = Math.asin(Math.sqrt(3 / 4));
    const p = Math.max(0, PI6 * (Math.asin(Math.sqrt(W)) - STQR));
    return {
      test: "Shapiro-Wilk", stat: W, p,
      normal: p > 0.05,
      interpretation: p > 0.05 ? "Data appears normally distributed" : "Data deviates from normality",
    };
  }

  // ── p-value (Royston 1992 polynomial approximation) ──────────────────────
  let y = Math.log(w1);         // y = log(1-W)
  const xx = Math.log(n);
  let m: number, s: number;

  if (n <= 11) {
    const gamma = swPoly(g, n);
    if (y >= gamma) {
      // W is impossibly large given n — essentially perfect fit
      return {
        test: "Shapiro-Wilk", stat: W, p: 1e-6, normal: false,
        interpretation: "Data deviates from normality",
      };
    }
    y = -Math.log(gamma - y);   // ← the critical gamma correction
    m = swPoly(c3, n);
    s = Math.exp(swPoly(c4, n));
  } else {
    m = swPoly(c5, xx);
    s = Math.exp(swPoly(c6, xx));
  }

  // pnorm upper tail: p = P(Z > (y-m)/s) = 1 - Φ((y-m)/s)
  const z  = (y - m) / s;
  const p  = Math.max(1e-6, Math.min(1 - 1e-6, 1 - jStat.normal.cdf(z, 0, 1)));
  const normal = p > 0.05;

  return {
    test: "Shapiro-Wilk",
    stat: W,
    p,
    normal,
    interpretation: normal
      ? "Data appears normally distributed"
      : "Data deviates from normality",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// D'Agostino-Pearson omnibus K² (n ≥ 8)
// D'Agostino & Pearson (1973); D'Agostino, Belanger & D'Agostino Jr. (1990)
// ─────────────────────────────────────────────────────────────────────────────

export function dagostinoPearson(values: number[]): NormalityResult {
  const n = values.length;

  if (n < 8) {
    return {
      test: "D'Agostino-Pearson", stat: NaN, p: NaN, normal: true,
      error: "D'Agostino-Pearson requires n ≥ 8",
      interpretation: "Normality test failed — check data",
    };
  }

  const mu = ssMean(values);
  const m2 = values.reduce((s, v) => s + (v - mu) ** 2, 0) / n;
  const m3 = values.reduce((s, v) => s + (v - mu) ** 3, 0) / n;
  const m4 = values.reduce((s, v) => s + (v - mu) ** 4, 0) / n;

  const g1 = m3 / m2 ** 1.5;   // Fisher's g1
  const g2 = m4 / m2 ** 2 - 3; // Fisher's g2

  // ── Skewness Z-score (D'Agostino 1970) ──
  const Y     = g1 * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2)));
  const beta2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3)
                / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const W2    = Math.sqrt(2 * (beta2 - 1)) - 1;
  const delta = 1 / Math.sqrt(0.5 * Math.log(W2));
  const alpha = Math.sqrt(2 / (W2 - 1));
  const Zs    = delta * Math.log(Y / alpha + Math.sqrt((Y / alpha) ** 2 + 1));

  // ── Kurtosis Z-score (Anscombe & Glynn 1983) ──
  const Ek  = 3 * (n - 1) / (n + 1);
  const vK  = 24 * n * (n - 2) * (n - 3) / ((n + 1) ** 2 * (n + 3) * (n + 5));
  const xK  = (g2 - Ek) / Math.sqrt(vK);
  const B   = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9))
              * Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3)));
  const A   = 6 + (8 / B) * (2 / B + Math.sqrt(1 + 4 / B ** 2));
  const t   = (1 - 2 / A) / (1 + xK * Math.sqrt(2 / (A - 4)));
  const Zk  = (1 - 2 / (9 * A) - Math.cbrt(t)) / Math.sqrt(2 / (9 * A));

  const K2     = Zs ** 2 + Zk ** 2;
  const p      = Math.max(1e-6, Math.min(1 - 1e-6, 1 - jStat.chisquare.cdf(K2, 2)));
  const normal = p > 0.05;

  return {
    test: "D'Agostino-Pearson",
    stat: K2,
    p,
    normal,
    interpretation: normal
      ? "Data appears normally distributed"
      : "Data deviates from normality",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Grubbs test for a single outlier (Grubbs 1969, two-sided α = 0.05)
// Critical value via exact t-distribution with Bonferroni-adjusted α
// ─────────────────────────────────────────────────────────────────────────────

export function grubbsTest(values: number[]): GrubbsResult | null {
  const n = values.length;
  if (n < 3) return null;

  const mu = ssMean(values);
  const sd = sampleStandardDeviation(values);
  if (sd === 0) return null;

  let maxG = 0, maxIdx = 0;
  values.forEach((v, i) => {
    const g = Math.abs(v - mu) / sd;
    if (g > maxG) { maxG = g; maxIdx = i; }
  });

  // α/(2n) Bonferroni adjustment per Grubbs (1969)
  const alpha  = 0.05;
  const tCrit  = jStat.studentt.inv(1 - alpha / (2 * n), n - 2);
  const gCrit  = ((n - 1) / Math.sqrt(n)) * Math.sqrt(tCrit ** 2 / (n - 2 + tCrit ** 2));

  return {
    outlierIndex: maxIdx,
    outlierValue: values[maxIdx],
    gStat: maxG,
    gCrit,
    isOutlier: maxG > gCrit,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IQR outlier detection — Tukey (1977) inner/outer fences
// ─────────────────────────────────────────────────────────────────────────────

export function iqrOutliers(values: number[]): IQROutlier[] {
  const q1  = quantile(values, 0.25);
  const q3  = quantile(values, 0.75);
  const iqr = q3 - q1;

  const mildLo = q1 - 1.5 * iqr;
  const mildHi = q3 + 1.5 * iqr;
  const extLo  = q1 - 3.0 * iqr;
  const extHi  = q3 + 3.0 * iqr;

  return values
    .map((v, i) => {
      if (v < extLo || v > extHi)   return { index: i, value: v, type: "extreme" as const };
      if (v < mildLo || v > mildHi) return { index: i, value: v, type: "mild" as const };
      return null;
    })
    .filter(Boolean) as IQROutlier[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

/** Parse paste input (tab / comma / newline / semicolon separated) */
export function parsePasteInput(raw: string): number[] {
  return raw
    .split(/[\n\r\t,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s.replace(/[^\d.\-eE+]/g, "")))
    .filter(v => isFinite(v));
}

/** Format p-value per APA 7th / journal style */
export function fmtP(p: number): string {
  if (isNaN(p)) return "N/A";
  if (p < 0.0001) return "< 0.0001";
  if (p < 0.001)  return p.toFixed(4);
  return p.toFixed(3);
}

/** Format number to sig. figures, switching to scientific for extremes */
export function fmtN(v: number, sig = 4): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toPrecision(sig);
  return parseFloat(v.toPrecision(sig)).toString();
}
