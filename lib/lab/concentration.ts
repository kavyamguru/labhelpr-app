export function percentDensityToMolarity(percent: number, density: number, mw: number): number {
  if (
    !isFinite(percent) || percent <= 0 || percent > 100 ||
    !isFinite(density) || density <= 0 ||
    !isFinite(mw)      || mw <= 0
  ) return NaN;
  return (density * (percent / 100) * 1000) / mw;
}

export function molarityToPercent(molarity: number, density: number, mw: number): number {
  if (
    !isFinite(molarity) || molarity <= 0 ||
    !isFinite(density)  || density <= 0 ||
    !isFinite(mw)       || mw <= 0
  ) return NaN;
  return (molarity * mw) / (density * 10);
}

export function calcDilutionVolume(c1: number, c2: number, v2: number): number {
  if (
    !isFinite(c1) || c1 <= 0 ||
    !isFinite(c2) || c2 <= 0 ||
    !isFinite(v2) || v2 <= 0 ||
    c2 > c1
  ) return NaN;
  return (c2 * v2) / c1;
}

export function fmtVolume(litres: number): { value: number; unit: string } {
  if (!isFinite(litres) || litres <= 0) return { value: NaN, unit: "mL" };
  if (litres < 1e-6)  return { value: litres * 1e9,  unit: "nL" };
  if (litres < 1e-3)  return { value: litres * 1e6,  unit: "µL" };
  if (litres < 1)     return { value: litres * 1e3,  unit: "mL" };
  return                     { value: litres,         unit: "L"  };
}
