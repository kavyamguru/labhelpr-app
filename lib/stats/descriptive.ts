// Descriptive statistics engine
// All formulas follow standard biostatistics textbooks (Motulsky, GraphPad)

export interface DescStats {
  n: number;
  mean: number;
  median: number;
  sd: number;          // sample SD (n-1)
  sem: number;
  ci95Low: number;
  ci95High: number;
  iqr: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  cv: number;          // CV%
  range: number;
  skewness: number;
  kurtosis: number;    // excess kurtosis
  geomMean: number | null;   // null if any value ≤ 0
  geomSD: number | null;
}

export interface NormalityResult {
  test: "Shapiro-Wilk" | "D'Agostino-Pearson";
  stat: number;
  p: number;
  normal: boolean;     // p > 0.05
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
  type: "mild" | "extreme"; // 1.5x vs 3x IQR
}

// ── core percentile (sorted array assumed) ──────────────────────────────────
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ── t-distribution quantile (two-tailed 95 CI) using Hill's algorithm ──────
// Accurate for df ≥ 2
function tQuantile95(df: number): number {
  // Approximation via Cornish-Fisher for df ≥ 30, exact lookup table for small df
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
    16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
    21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
    26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
  };
  if (df <= 30 && table[df]) return table[df];
  // Approximation for large df (Gleason 1999)
  const a = df - 0.5;
  return Math.sqrt(a * (Math.exp(3.8415 / a) - 1));
}

export function computeStats(values: number[]): DescStats {
  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median = percentile(sorted, 50);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;

  const variance = n > 1
    ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);
  const sem = n > 1 ? sd / Math.sqrt(n) : 0;

  const t = tQuantile95(n - 1);
  const ci95Low  = mean - t * sem;
  const ci95High = mean + t * sem;

  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : NaN;

  // Skewness (sample, Fisher's method)
  const m3 = values.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
  const m2 = variance * (n - 1) / n; // population variance
  const skewness = m2 > 0 ? m3 / m2 ** 1.5 : 0;

  // Excess kurtosis
  const m4 = values.reduce((s, v) => s + (v - mean) ** 4, 0) / n;
  const kurtosis = m2 > 0 ? m4 / m2 ** 2 - 3 : 0;

  // Geometric mean (only valid when all values > 0)
  const allPos = values.every(v => v > 0);
  let geomMean: number | null = null;
  let geomSD: number | null = null;
  if (allPos && n > 1) {
    const logMean = values.reduce((s, v) => s + Math.log(v), 0) / n;
    geomMean = Math.exp(logMean);
    const logSD = Math.sqrt(values.reduce((s, v) => s + (Math.log(v) - logMean) ** 2, 0) / (n - 1));
    geomSD = Math.exp(logSD); // geometric SD factor
  }

  return {
    n, mean, median, sd, sem, ci95Low, ci95High,
    iqr, q1, q3, min: sorted[0], max: sorted[n - 1],
    cv, range: sorted[n - 1] - sorted[0],
    skewness, kurtosis, geomMean, geomSD,
  };
}

// ── Shapiro-Wilk approximation (Royston 1992, n = 3–50) ────────────────────
// Returns W statistic and approximate p-value
export function shapiroWilk(values: number[]): NormalityResult {
  const n = values.length;

  if (n < 3) return { test: "Shapiro-Wilk", stat: NaN, p: NaN, normal: true };

  const sorted = [...values].sort((a, b) => a - b);

  // Coefficients a_i for Shapiro-Wilk (Royston's approximation polynomial)
  // For simplicity, compute W via an approximation good enough for n ≤ 50
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const ss = values.reduce((s, v) => s + (v - mean) ** 2, 0);

  // Expected order statistics coefficients (m_i) for standard normal
  // Use Blom's formula: Phi^-1((i - 3/8) / (n + 1/4))
  function probitBlom(i: number, n: number): number {
    const p = (i - 0.375) / (n + 0.25);
    return normalQuantile(p);
  }

  const m: number[] = [];
  for (let i = 1; i <= n; i++) m.push(probitBlom(i, n));

  const mss = m.reduce((s, v) => s + v * v, 0);
  const u = 1 / Math.sqrt(n);

  // Polynomial coefficients for a_n (Royston 1992 Table 1, abridged)
  // a_n = c1 + c2*u + c3*u^2 ...
  const c3 = -2.706056, c4 = 4.434685, c5 = -2.071190,
        c6 = -0.147981, c7 = 0.221157, c8 = 0.0;
  const an = c3 * u ** 3 + c4 * u ** 4 + c5 * u ** 5 + c6 + c7 * u + c8;

  // Normalise
  const phi2 = n >= 6
    ? -(c3 * u ** 3 + c4 * u ** 4 + c5 * u ** 5 + c6 + c7 * u)
    : m[1] / Math.sqrt(mss);

  // Build a coefficients
  const a = new Array(n).fill(0);
  a[n - 1] = an;
  a[0] = -an;

  // For n >= 6, use approximation for middle coefficients
  if (n >= 6) {
    const eps1 = phi2 - 2 * an * m[n - 1];
    const eps2 = -2 * an * m[0];
    const sumM2 = mss - 2 * m[n - 1] ** 2 - 2 * m[0] ** 2;
    const scale = Math.sqrt((1 - 2 * an ** 2 - 2 * phi2 ** 2) / sumM2);

    if (n > 4) {
      a[n - 2] = phi2;
      a[1] = -phi2;
      for (let i = 2; i < n - 2; i++) {
        a[i] = m[i] * scale;
      }
    }
  } else {
    for (let i = 1; i < n - 1; i++) {
      a[i] = m[i] / Math.sqrt(mss);
    }
  }

  let b = 0;
  for (let i = 0; i < n; i++) b += a[i] * sorted[i];

  const W = (b * b) / ss;

  // Royston's approximation for p-value
  let p: number;
  const lnW = Math.log(1 - W);

  if (n <= 11) {
    const mu = -0.0006714 * n ** 3 + 0.025054 * n ** 2 - 0.6714 * n + 0.7240;
    const sigma = Math.exp(-0.0020322 * n ** 3 + 0.062767 * n ** 2 - 0.53664 * n + 0.56930);
    const z = (lnW - mu) / sigma;
    p = 1 - normalCDF(z);
  } else {
    const mu = 0.0038915 * (Math.log(n)) ** 3 - 0.083751 * (Math.log(n)) ** 2 - 0.31082 * Math.log(n) - 1.5861;
    const sigma = Math.exp(0.0030302 * (Math.log(n)) ** 2 - 0.082676 * Math.log(n) - 0.4803);
    const z = (lnW - mu) / sigma;
    p = 1 - normalCDF(z);
  }

  p = Math.max(0.0001, Math.min(0.9999, p));

  return { test: "Shapiro-Wilk", stat: Math.max(0, Math.min(1, W)), p, normal: p > 0.05 };
}

// ── D'Agostino-Pearson omnibus K² test (n > 20) ────────────────────────────
export function dagostinoPearson(values: number[]): NormalityResult {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;

  const m2 = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const m3 = values.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
  const m4 = values.reduce((s, v) => s + (v - mean) ** 4, 0) / n;

  // Skewness
  const g1 = m3 / m2 ** 1.5;
  // Kurtosis
  const g2 = m4 / m2 ** 2 - 3;

  // D'Agostino skewness transform
  const Y = g1 * Math.sqrt((n + 1) * (n + 3) / (6 * (n - 2)));
  const beta2 = 3 * (n * n + 27 * n - 70) * (n + 1) * (n + 3) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const W2 = -1 + Math.sqrt(2 * (beta2 - 1));
  const delta = 1 / Math.sqrt(Math.log(Math.sqrt(W2)));
  const alpha = Math.sqrt(2 / (W2 - 1));
  const Zs = delta * Math.log(Y / alpha + Math.sqrt((Y / alpha) ** 2 + 1));

  // Anscombe-Glynn kurtosis transform
  const Ek = 3 * (n - 1) / (n + 1);
  const vark = 24 * n * (n - 2) * (n - 3) / ((n + 1) ** 2 * (n + 3) * (n + 5));
  const x = (g2 - Ek) / Math.sqrt(vark);
  const B = 6 * (n * n - 5 * n + 2) / ((n + 7) * (n + 9)) * Math.sqrt(6 * (n + 3) * (n + 5) / (n * (n - 2) * (n - 3)));
  const A = 6 + 8 / B * (2 / B + Math.sqrt(1 + 4 / (B ** 2)));
  const Zk = ((1 - 2 / (9 * A)) - Math.cbrt((1 - 2 / A) / (1 + x * Math.sqrt(2 / (A - 4))))) / Math.sqrt(2 / (9 * A));

  const K2 = Zs ** 2 + Zk ** 2;
  // K2 ~ chi-squared(2)
  const p = 1 - chi2CDF(K2, 2);

  return { test: "D'Agostino-Pearson", stat: K2, p: Math.max(0.0001, Math.min(0.9999, p)), normal: p > 0.05 };
}

// ── Grubbs test for single outlier ─────────────────────────────────────────
export function grubbsTest(values: number[]): GrubbsResult | null {
  const n = values.length;
  if (n < 3) return null;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  if (sd === 0) return null;

  let maxG = 0, maxIdx = 0;
  values.forEach((v, i) => {
    const g = Math.abs(v - mean) / sd;
    if (g > maxG) { maxG = g; maxIdx = i; }
  });

  // Critical value at alpha=0.05 (two-sided, Grubbs 1969)
  const tCrit = tQuantile95(n - 2);
  const gCrit = ((n - 1) / Math.sqrt(n)) * Math.sqrt(tCrit ** 2 / (n - 2 + tCrit ** 2));

  return {
    outlierIndex: maxIdx,
    outlierValue: values[maxIdx],
    gStat: maxG,
    gCrit,
    isOutlier: maxG > gCrit,
  };
}

// ── IQR outlier detection ───────────────────────────────────────────────────
export function iqrOutliers(values: number[]): IQROutlier[] {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const mildLo = q1 - 1.5 * iqr, mildHi = q3 + 1.5 * iqr;
  const extLo  = q1 - 3.0 * iqr, extHi  = q3 + 3.0 * iqr;

  return values
    .map((v, i) => {
      if (v < extLo || v > extHi)   return { index: i, value: v, type: "extreme" as const };
      if (v < mildLo || v > mildHi) return { index: i, value: v, type: "mild" as const };
      return null;
    })
    .filter(Boolean) as IQROutlier[];
}

// ── normal distribution helpers ────────────────────────────────────────────
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const cdf = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-x * x / 2) * poly;
  return x >= 0 ? cdf : 1 - cdf;
}

function normalQuantile(p: number): number {
  // Rational approximation (Beasley-Springer-Moro)
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [0, -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
  const b = [0, -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5; const r = q * q;
    return (((((a[1]*r+a[2])*r+a[3])*r+a[4])*r+a[5])*r+a[6])*q / (((((b[1]*r+b[2])*r+b[3])*r+b[4])*r+b[5])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

function chi2CDF(x: number, df: number): number {
  // Regularized incomplete gamma function P(df/2, x/2)
  return gammaInc(df / 2, x / 2);
}

function gammaInc(a: number, x: number): number {
  if (x < 0) return 0;
  if (x === 0) return 0;
  // Series expansion
  let sum = 1 / a, term = 1 / a;
  for (let i = 1; i <= 100; i++) {
    term *= x / (a + i);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.min(1, sum * Math.exp(-x + a * Math.log(x) - logGamma(a)));
}

function logGamma(x: number): number {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp = (x + 0.5) * Math.log(tmp) - tmp;
  let ser = 1.000000000190015;
  for (const ci of c) { y++; ser += ci / y; }
  return tmp + Math.log(2.5066282746310005 * ser / x);
}

// ── Parse paste input (tab/comma/newline separated) ────────────────────────
export function parsePasteInput(raw: string): number[] {
  return raw
    .split(/[\n\r\t,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s.replace(/[^\d.\-eE+]/g, "")))
    .filter(v => isFinite(v));
}

// ── Format p-value per APA/journal standards ───────────────────────────────
export function fmtP(p: number): string {
  if (isNaN(p)) return "N/A";
  if (p < 0.0001) return "< 0.0001";
  if (p < 0.001)  return p.toFixed(4);
  return p.toFixed(3);
}

export function fmtN(v: number, sig = 4): string {
  if (!isFinite(v)) return "—";
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toPrecision(sig);
  return parseFloat(v.toPrecision(sig)).toString();
}
