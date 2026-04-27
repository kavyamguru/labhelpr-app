"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";
import { percentDensityToMolarity, molarityToPercent, calcDilutionVolume, fmtVolume } from "@/lib/lab/concentration";

type Mode     = "pct_to_M" | "M_to_pct" | "dilute";
type ConcUnit = "M" | "mM";

const PRESETS = [
  { label: "HCl (conc.)",         percent: "37",   density: "1.19",  mw: "36.46",  molarity: "12.08" },
  { label: "H₂SO₄ (conc.)",      percent: "98",   density: "1.84",  mw: "98.079", molarity: "18.37" },
  { label: "Acetic acid (glac.)", percent: "99.7", density: "1.049", mw: "60.052", molarity: "17.4"  },
  { label: "HNO₃ (conc.)",        percent: "70",   density: "1.41",  mw: "63.01",  molarity: "15.65" },
];

const MODE_LABELS: Record<Mode, string> = {
  pct_to_M: "% → Molarity",
  M_to_pct: "M → % w/w",
  dilute:   "Prep Solution",
};

export default function ConcentrationConverterPage() {
  const [mode, setMode] = useState<Mode>("pct_to_M");

  const [aPct,  setAPct]  = useState("");
  const [aDens, setADens] = useState("");
  const [aMw,   setAMw]   = useState("");

  const [bMol,  setBMol]  = useState("");
  const [bDens, setBDens] = useState("");
  const [bMw,   setBMw]   = useState("");

  const [cPct,      setCPct]      = useState("");
  const [cDens,     setCDens]     = useState("");
  const [cMw,       setCMw]       = useState("");
  const [cTarget,   setCTarget]   = useState("");
  const [cTargetU,  setCTargetU]  = useState<ConcUnit>("mM");
  const [cFinalVol, setCFinalVol] = useState("");

  const aPctV  = parse(aPct);
  const aDensV = parse(aDens);
  const aMwV   = parse(aMw);
  const molarityResult = percentDensityToMolarity(aPctV, aDensV, aMwV);

  const bMolV  = parse(bMol);
  const bDensV = parse(bDens);
  const bMwV   = parse(bMw);
  const percentResult = molarityToPercent(bMolV, bDensV, bMwV);

  const cPctV      = parse(cPct);
  const cDensV     = parse(cDens);
  const cMwV       = parse(cMw);
  const cTargetV   = parse(cTarget);
  const cFinalVolV = parse(cFinalVol);
  const cStockM    = percentDensityToMolarity(cPctV, cDensV, cMwV);
  const cTargetM   = isFinite(cTargetV) ? (cTargetU === "mM" ? cTargetV / 1000 : cTargetV) : NaN;
  const cFinalVolL = isPos(cFinalVolV) ? cFinalVolV / 1000 : NaN;
  const cV1L       = calcDilutionVolume(cStockM, cTargetM, cFinalVolL);
  const cV1        = fmtVolume(cV1L);
  const cDiluentL  = isFinite(cV1L) ? cFinalVolL - cV1L : NaN;
  const cDiluent   = fmtVolume(cDiluentL);

  const labSentence = (() => {
    if (!isFinite(cV1L) || !isFinite(cFinalVolL)) return null;
    const volStr = `${fmt(cV1.value, 4)} ${cV1.unit}`;
    const finalStr = `${fmt(cFinalVolV)} mL`;
    const concStr = `${fmt(cTargetV)} ${cTargetU}`;
    const stockStr = cPct ? `${cPct}% reagent` : "stock solution";
    return `Take ${volStr} of ${stockStr} and make up to ${finalStr} with water to obtain a ${concStr} solution.`;
  })();

  function applyPreset(p: typeof PRESETS[0]) {
    if (mode === "pct_to_M") { setAPct(p.percent); setADens(p.density); setAMw(p.mw); }
    else if (mode === "M_to_pct") { setBMol(p.molarity); setBDens(p.density); setBMw(p.mw); }
    else { setCPct(p.percent); setCDens(p.density); setCMw(p.mw); }
  }

  function reset() {
    setAPct(""); setADens(""); setAMw("");
    setBMol(""); setBDens(""); setBMw("");
    setCPct(""); setCDens(""); setCMw(""); setCTarget(""); setCFinalVol("");
  }

  let copyText = "";
  if (mode === "pct_to_M" && isFinite(molarityResult))
    copyText = `${aPct}% w/w, ${aDens} g/mL, MW ${aMw} g/mol → ${fmt(molarityResult)} M`;
  else if (mode === "M_to_pct" && isFinite(percentResult))
    copyText = `${bMol} M, ${bDens} g/mL, MW ${bMw} g/mol → ${fmt(percentResult)} % w/w`;
  else if (mode === "dilute" && labSentence)
    copyText = labSentence;

  return (
    <CalcLayout
      title="Concentration Converter"
      description="Convert between % w/w and molarity, or calculate how much stock to use for any preparation."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>% w/w → M:</strong> M = (density × (% / 100) × 1000) / MW</p>
          <p><strong>M → % w/w:</strong> % w/w = (M × MW) / (density × 10)</p>
          <p><strong>Prep Solution:</strong> Converts stock % → M₁, then solves C₁V₁ = C₂V₂.</p>
          <p>Density is the density of the solution — check the SDS or bottle label.</p>
        </div>
      }
    >
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 text-xs sm:text-sm font-medium transition-colors"
            style={{ background: mode === m ? "var(--accent)" : "var(--bg)", color: mode === m ? "#fff" : "var(--text-muted)" }}>
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--border)", background: "var(--bg)", color: "var(--text-muted)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "pct_to_M" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="% w/w" value={aPct} onChange={setAPct} placeholder="e.g. 37" unit="%" />
            <InputField label="Density (g/mL)" value={aDens} onChange={setADens} placeholder="e.g. 1.19" unit="g/mL" />
            <InputField label="Mol. weight (g/mol)" value={aMw} onChange={setAMw} placeholder="e.g. 36.46" unit="g/mol" />
          </div>
          <SectionDivider label="Result" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OutputField label="Molarity (M)" value={isFinite(molarityResult) ? fmt(molarityResult) : "—"} unit={isFinite(molarityResult) ? "M" : undefined} />
            <OutputField label="Molarity (mM)" value={isFinite(molarityResult) ? fmt(molarityResult * 1000) : "—"} unit={isFinite(molarityResult) ? "mM" : undefined} />
          </div>
        </>
      )}

      {mode === "M_to_pct" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="Molarity (M)" value={bMol} onChange={setBMol} placeholder="e.g. 12" unit="M" />
            <InputField label="Density (g/mL)" value={bDens} onChange={setBDens} placeholder="e.g. 1.19" unit="g/mL" />
            <InputField label="Mol. weight (g/mol)" value={bMw} onChange={setBMw} placeholder="e.g. 36.46" unit="g/mol" />
          </div>
          <SectionDivider label="Result" />
          <OutputField label="% w/w" value={isFinite(percentResult) ? fmt(percentResult, 3) : "—"} unit={isFinite(percentResult) ? "% w/w" : undefined}
            warning={isFinite(percentResult) && percentResult > 100 ? "Result > 100% — check inputs." : undefined} />
        </>
      )}

      {mode === "dilute" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="% w/w (stock)" value={cPct} onChange={setCPct} placeholder="e.g. 37" unit="%" />
            <InputField label="Density (g/mL)" value={cDens} onChange={setCDens} placeholder="e.g. 1.19" unit="g/mL" />
            <InputField label="Mol. weight (g/mol)" value={cMw} onChange={setCMw} placeholder="e.g. 36.46" unit="g/mol" />
          </div>
          {isFinite(cStockM) && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Stock molarity: <span style={{ color: "var(--accent)" }}>{fmt(cStockM)} M</span>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InputField label="Target concentration" value={cTarget} onChange={setCTarget} placeholder="e.g. 1"
              unit={cTargetU} unitOptions={["M", "mM"]} onUnitChange={u => setCTargetU(u as ConcUnit)} />
            <InputField label="Final volume (mL)" value={cFinalVol} onChange={setCFinalVol} placeholder="e.g. 100" unit="mL" />
          </div>
          <SectionDivider label="Result" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OutputField label="Stock to take" value={isFinite(cV1.value) ? fmt(cV1.value, 4) : "—"} unit={isFinite(cV1.value) ? cV1.unit : undefined}
              warning={isFinite(cV1L) && cV1L < 5e-6 ? `Very small volume — dilute stock first.` : undefined} />
            <OutputField label="Water/diluent to add" value={isFinite(cDiluent.value) ? fmt(cDiluent.value, 4) : "—"} unit={isFinite(cDiluent.value) ? cDiluent.unit : undefined} />
          </div>
          {labSentence && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "var(--accent-light)", border: "1px solid var(--accent)", color: "var(--text-muted)" }}>
              {labSentence}
            </div>
          )}
        </>
      )}
    </CalcLayout>
  );
}
