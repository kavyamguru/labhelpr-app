"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

type Mode      = "molar" | "wv" | "vv";
type MolarMode = "solid" | "stock";

const VOL_UNITS  = ["mL", "L", "µL"];
const CONC_UNITS = ["M", "mM", "µM", "nM"];
const VOL_FACTOR:  Record<string, number> = { mL: 1e-3, L: 1, µL: 1e-6 };
const CONC_FACTOR: Record<string, number> = { M: 1, mM: 1e-3, µM: 1e-6, nM: 1e-9 };

const AW: Record<string, number> = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.811, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Na: 22.990, Mg: 24.305, Al: 26.982,
  Si: 28.086, P: 30.974, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Br: 79.904, Ag: 107.868, I: 126.904, Ba: 137.327, Pb: 207.2, Hg: 200.592,
};

function parseFormula(formula: string): { mw: number; error: string | null } {
  const f = formula.trim();
  if (!f) return { mw: NaN, error: null };
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (ch === "(") { stack.push({}); i++; }
    else if (ch === ")") {
      i++; let ns = ""; while (i < f.length && /\d/.test(f[i])) ns += f[i++];
      const mult = ns ? parseInt(ns) : 1;
      if (stack.length < 2) return { mw: NaN, error: "Unmatched )" };
      const top = stack.pop()!; const prev = stack[stack.length - 1];
      for (const [el, n] of Object.entries(top)) prev[el] = (prev[el] ?? 0) + n * mult;
    } else if (/[A-Z]/.test(ch)) {
      let sym = ch; i++;
      while (i < f.length && /[a-z]/.test(f[i])) sym += f[i++];
      let ns = ""; while (i < f.length && /\d/.test(f[i])) ns += f[i++];
      const n = ns ? parseInt(ns) : 1;
      stack[stack.length - 1][sym] = (stack[stack.length - 1][sym] ?? 0) + n;
    } else { return { mw: NaN, error: `Unexpected character "${ch}"` }; }
  }
  if (stack.length !== 1) return { mw: NaN, error: "Unmatched (" };
  let mw = 0;
  for (const [el, n] of Object.entries(stack[0])) {
    if (!(el in AW)) return { mw: NaN, error: `Unknown element "${el}"` };
    mw += AW[el] * n;
  }
  return { mw: parseFloat(mw.toFixed(3)), error: null };
}

function fmtVol(L: number): string {
  if (!isFinite(L) || L <= 0) return "—";
  if (L < 1e-6) return `${fmt(L * 1e9)} nL`;
  if (L < 1e-3) return `${fmt(L * 1e6)} µL`;
  if (L < 1)    return `${fmt(L * 1e3)} mL`;
  return `${fmt(L)} L`;
}
function fmtVolParts(L: number): { value: string; unit: string } {
  if (L < 1e-6) return { value: fmt(L * 1e9), unit: "nL" };
  if (L < 1e-3) return { value: fmt(L * 1e6), unit: "µL" };
  if (L < 1)    return { value: fmt(L * 1e3), unit: "mL" };
  return { value: fmt(L), unit: "L" };
}

export default function StockPrepPage() {
  const [mode, setMode]           = useState<Mode>("molar");
  const [molarMode, setMolarMode] = useState<MolarMode>("solid");

  const [mVol,     setMVol]     = useState(""); const [mVolu,  setMVolu]  = useState("mL");
  const [mConc,    setMConc]    = useState(""); const [mConcu, setMConcu] = useState("mM");
  const [mMw,      setMmw]      = useState("");
  const [mFormula, setMFormula] = useState("");

  const [sStockConc,  setSStockConc]  = useState(""); const [sStockConcu,  setSStockConcu]  = useState("mM");
  const [sTargetConc, setSTargetConc] = useState(""); const [sTargetConcu, setSTargetConcu] = useState("mM");
  const [sFinalVol,   setSFinalVol]   = useState(""); const [sFinalVolu,   setSFinalVolu]   = useState("mL");

  const [wFinalVol, setWFinalVol] = useState(""); const [wFinalVolu, setWFinalVolu] = useState("mL");
  const [wPercent,  setWPercent]  = useState("");
  const [vFinalVol, setVFinalVol] = useState(""); const [vFinalVolu, setVFinalVolu] = useState("mL");
  const [vPercent,  setVPercent]  = useState("");

  function reset() {
    setMVol(""); setMConc(""); setMmw(""); setMFormula("");
    setSStockConc(""); setSTargetConc(""); setSFinalVol("");
    setWFinalVol(""); setWPercent("");
    setVFinalVol(""); setVPercent("");
  }

  const { mw: fmwSolid, error: fErrSolid } = parseFormula(mFormula);
  const effectiveMw = isFinite(fmwSolid) ? fmwSolid : parse(mMw);
  const mVolV  = parse(mVol);
  const mConcV = parse(mConc);
  const solidMassG  = isPos(mVolV) && isPos(mConcV) && isPos(effectiveMw)
    ? mConcV * CONC_FACTOR[mConcu] * mVolV * VOL_FACTOR[mVolu] * effectiveMw : NaN;
  const solidMassMg = solidMassG * 1e3;
  const solidMassUg = solidMassG * 1e6;

  const stockConcM  = parse(sStockConc)  * CONC_FACTOR[sStockConcu];
  const targetConcM = parse(sTargetConc) * CONC_FACTOR[sTargetConcu];
  const finalVolL   = parse(sFinalVol)   * VOL_FACTOR[sFinalVolu];
  const concError   = isPos(stockConcM) && isPos(targetConcM) && stockConcM < targetConcM;
  const stockVolL   = !concError && isPos(stockConcM) && isPos(targetConcM) && isPos(finalVolL)
    ? (targetConcM * finalVolL) / stockConcM : NaN;
  const diluentVolL = isFinite(stockVolL) ? finalVolL - stockVolL : NaN;

  const wvMassCalc = isPos(parse(wFinalVol)) && isPos(parse(wPercent))
    ? (parse(wPercent) / 100) * (parse(wFinalVol) * VOL_FACTOR[wFinalVolu] * 1e3) : NaN;
  const vvVol = isPos(parse(vFinalVol)) && isPos(parse(vPercent))
    ? (parse(vPercent) / 100) * parse(vFinalVol) * (VOL_FACTOR[vFinalVolu] / VOL_FACTOR["mL"]) * 1000 : NaN;

  function preparationText(): string {
    if (mode === "molar" && molarMode === "solid" && isFinite(solidMassG)) {
      const label = mFormula.trim() || "compound";
      const massStr = solidMassG < 1e-3 ? `${fmt(solidMassUg)} µg` : solidMassG < 1 ? `${fmt(solidMassMg)} mg` : `${fmt(solidMassG)} g`;
      return `Weigh ${massStr} of ${label} and make up to ${mVol} ${mVolu} to prepare a ${mConc} ${mConcu} solution.`;
    }
    if (mode === "molar" && molarMode === "stock" && isFinite(stockVolL) && isFinite(diluentVolL))
      return `Take ${fmtVol(stockVolL)} of ${sStockConc} ${sStockConcu} stock and add ${fmtVol(diluentVolL)} of solvent to prepare ${fmtVol(finalVolL)} of ${sTargetConc} ${sTargetConcu} solution.`;
    if (mode === "wv" && isFinite(wvMassCalc))
      return `Weigh ${fmt(wvMassCalc)} g. Dissolve in ~80% of ${wFinalVol} ${wFinalVolu}, then bring to final volume.`;
    if (mode === "vv" && isFinite(vvVol))
      return `Add ${fmt(vvVol)} mL of solute to solvent, bring to ${vFinalVol} ${vFinalVolu}.`;
    return "";
  }

  let copyText = "";
  if (mode === "molar" && molarMode === "solid" && isFinite(solidMassG))
    copyText = `Mass: ${fmt(solidMassG)} g (${fmt(solidMassMg)} mg)\n${preparationText()}`;
  else if (mode === "molar" && molarMode === "stock" && isFinite(stockVolL))
    copyText = `Stock vol: ${fmtVol(stockVolL)}\nDiluent: ${fmtVol(diluentVolL)}\n${preparationText()}`;
  else if (mode === "wv" && isFinite(wvMassCalc))
    copyText = `Mass: ${fmt(wvMassCalc)} g\n${preparationText()}`;
  else if (mode === "vv" && isFinite(vvVol))
    copyText = `Solute volume: ${fmt(vvVol)} mL\n${preparationText()}`;

  return (
    <CalcLayout
      title="Stock Preparation"
      description="Calculate mass or volume required for molar, % w/v, or % v/v solutions."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>From Solid:</strong> mass (g) = C × V(L) × MW(g/mol)</p>
          <p><strong>From Stock:</strong> C₁V₁ = C₂V₂ → V₁ = C₂V₂ / C₁</p>
          <p><strong>% w/v:</strong> mass (g) = (% / 100) × vol (mL)</p>
          <p><strong>% v/v:</strong> vol solute = (% / 100) × final vol</p>
          <p><strong>Tip:</strong> Dissolve in ~80% of final volume first, then bring to volume.</p>
        </div>
      }
    >
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        {(["molar", "wv", "vv"] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{ background: mode === m ? "var(--accent)" : "var(--bg)", color: mode === m ? "#fff" : "var(--text-muted)" }}>
            {m === "molar" ? "Molar" : m === "wv" ? "% w/v" : "% v/v"}
          </button>
        ))}
      </div>

      {mode === "molar" && (
        <>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {(["solid", "stock"] as MolarMode[]).map((m, idx) => (
              <button key={m} onClick={() => setMolarMode(m)}
                className="flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
                style={{
                  background: molarMode === m ? "var(--accent-light)" : "transparent",
                  color: molarMode === m ? "var(--accent)" : "var(--text-muted)",
                  borderRight: idx === 0 ? "1px solid var(--border)" : undefined,
                }}>
                {m === "solid" ? "From Solid" : "From Stock"}
              </button>
            ))}
          </div>

          {molarMode === "solid" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Target concentration" value={mConc} onChange={setMConc}
                  unit={mConcu} unitOptions={CONC_UNITS} onUnitChange={setMConcu} />
                <InputField label="Final volume" value={mVol} onChange={setMVol}
                  unit={mVolu} unitOptions={VOL_UNITS} onUnitChange={setMVolu} />
              </div>
              <InputField label="Chemical formula (optional)" value={mFormula} onChange={setMFormula}
                placeholder="e.g. NaCl, C6H12O6, Ca(OH)2" type="text" />
              {fErrSolid && <p className="text-xs" style={{ color: "#f87171" }}>⚠ {fErrSolid}</p>}
              <InputField
                label={isFinite(fmwSolid) ? "Molecular weight (g/mol) — auto from formula" : "Molecular weight (g/mol)"}
                value={isFinite(fmwSolid) ? String(fmwSolid) : mMw}
                onChange={v => { if (!isFinite(fmwSolid)) setMmw(v); }}
                placeholder="e.g. 58.44"
                hint={isFinite(fmwSolid) ? `Calculated from ${mFormula} — clear formula to override` : undefined}
              />
              <SectionDivider label="Result" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <OutputField label="Mass (g)" value={isFinite(solidMassG) ? fmt(solidMassG) : "—"} unit={isFinite(solidMassG) ? "g" : undefined} />
                <OutputField label="Mass (mg)" value={isFinite(solidMassMg) ? fmt(solidMassMg) : "—"} unit={isFinite(solidMassMg) ? "mg" : undefined} />
                <OutputField label="Mass (µg)" value={isFinite(solidMassUg) ? fmt(solidMassUg) : "—"} unit={isFinite(solidMassUg) ? "µg" : undefined}
                  warning={isFinite(solidMassUg) && solidMassUg < 100 ? "Very small — consider a concentrated intermediate" : undefined} />
              </div>
            </>
          )}

          {molarMode === "stock" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Stock concentration (C1)" value={sStockConc} onChange={setSStockConc}
                  unit={sStockConcu} unitOptions={CONC_UNITS} onUnitChange={setSStockConcu} />
                <InputField label="Target concentration (C2)" value={sTargetConc} onChange={setSTargetConc}
                  unit={sTargetConcu} unitOptions={CONC_UNITS} onUnitChange={setSTargetConcu} />
              </div>
              <InputField label="Final volume (V2)" value={sFinalVol} onChange={setSFinalVol}
                unit={sFinalVolu} unitOptions={VOL_UNITS} onUnitChange={setSFinalVolu} />
              {concError && <p className="text-xs" style={{ color: "#f87171" }}>⚠ Target concentration exceeds stock — dilution impossible.</p>}
              <SectionDivider label="Result" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <OutputField label="Stock volume" value={isFinite(stockVolL) ? fmtVolParts(stockVolL).value : "—"} unit={isFinite(stockVolL) ? fmtVolParts(stockVolL).unit : undefined} />
                <OutputField label="Diluent volume" value={isFinite(diluentVolL) ? fmtVolParts(diluentVolL).value : "—"} unit={isFinite(diluentVolL) ? fmtVolParts(diluentVolL).unit : undefined} />
              </div>
            </>
          )}
        </>
      )}

      {mode === "wv" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Final volume" value={wFinalVol} onChange={setWFinalVol}
              unit={wFinalVolu} unitOptions={VOL_UNITS} onUnitChange={setWFinalVolu} />
            <InputField label="% w/v" value={wPercent} onChange={setWPercent} unit="%" placeholder="e.g. 5" />
          </div>
          <SectionDivider label="Result" />
          <OutputField label="Mass to weigh (g)" value={isFinite(wvMassCalc) ? fmt(wvMassCalc) : "—"} unit={isFinite(wvMassCalc) ? "g" : undefined} />
        </>
      )}

      {mode === "vv" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Final volume" value={vFinalVol} onChange={setVFinalVol}
              unit={vFinalVolu} unitOptions={VOL_UNITS} onUnitChange={setVFinalVolu} />
            <InputField label="% v/v" value={vPercent} onChange={setVPercent} unit="%" placeholder="e.g. 10" />
          </div>
          <SectionDivider label="Result" />
          <OutputField label="Solute volume (mL)" value={isFinite(vvVol) ? fmt(vvVol) : "—"} unit={isFinite(vvVol) ? "mL" : undefined} />
        </>
      )}

      {preparationText() && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--text-muted)" }}>
          {preparationText()}
        </div>
      )}
    </CalcLayout>
  );
}
