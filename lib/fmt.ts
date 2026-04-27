export function fmt(n: number, sig = 4): string {
  if (!isFinite(n) || isNaN(n) || n === undefined || n === null) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 0.0001 && abs < 1e7) {
    return parseFloat(n.toPrecision(sig)).toString();
  }
  return n.toExponential(sig - 1);
}

export function parse(s: string): number {
  const v = parseFloat(s);
  return isNaN(v) ? NaN : v;
}

export function isPos(n: number): boolean {
  return isFinite(n) && n > 0;
}
