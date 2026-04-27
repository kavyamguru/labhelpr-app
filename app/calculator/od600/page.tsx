"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

const PRESETS = [
  { label: "E. coli", factor: 8e8  },
  { label: "Yeast",   factor: 3e7  },
  { label: "Custom",  factor: null },
];
const VOL_UNITS = ["mL", "L", "µL"];
const VOL_FACTOR: Record<string, number> = { mL: 1e-3, L: 1, µL: 1e-6 };

export default function OD600Page() {
  const [mode, setMode] = useState<"od_to_cells" | "dilution">("od_to_cells");
  const [preset, setPreset] = useState("E. coli");
  const [customFactor, setCustomFactor] = useState("");
  const [od, setOd]               = useState("");
  const [dilution, setDilution]   = useState("1");
  const [sampleVol, setSampleVol] = useState(""); const [sampleVolU, setSampleVolU] = useState("mL");
  const [currentOd, setCurrentOd] = useState("");
  const [targetOd, setTargetOd]   = useState("");
  const [finalVol, setFinalVol]   = useState(""); const [finalVolU, setFinalVolU]   = useState("mL");

  function reset() {
    setOd(""); setDilution("1"); setSampleVol("");
    setCurrentOd(""); setTargetOd(""); setFinalVol("");
  }

  const presetData = PRESETS.find(p => p.label === preset)!;
  const factor = presetData.factor ?? parse(customFactor);

  const odV  = parse(od);
  const dilV = parse(dilution);
  const cellsPerMl = isPos(odV) && isFinite(factor) && isPos(dilV) ? odV * factor * dilV : NaN;
  const sVolV = parse(sampleVol);
  const totalCellsCalc = isPos(sVolV) && isFinite(cellsPerMl)
    ? cellsPerMl * sVolV * (VOL_FACTOR[sampleVolU] / VOL_FACTOR["mL"]) : NaN;

  const c1 = parse(currentOd), c2 = parse(targetOd), v2 = parse(finalVol);
  const v1 = isPos(c1) && isPos(c2) && isPos(v2) ? (c2 * v2) / c1 : NaN;
  const diluentVol = isFinite(v1) ? v2 - v1 : NaN;

  let copyText = "";
  if (mode === "od_to_cells" && isFinite(cellsPerMl)) {
    copyText = `OD600=${od} (dilution ${dilution}×) → ${fmt(cellsPerMl)} cells/mL`;
    if (isFinite(totalCellsCalc)) copyText += `\nTotal cells (${sampleVol} ${sampleVolU}): ${fmt(totalCellsCalc)}`;
  } else if (mode === "dilution" && isFinite(v1)) {
    copyText = `Culture: ${fmt(v1)} ${finalVolU} → add ${fmt(diluentVol)} ${finalVolU} media`;
  }

  return (
    <CalcLayout
      title="OD600 Calculator"
      description="Convert optical density to cell count, or plan dilutions for target density."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Formula:</strong> Cells/mL = OD600 × conversion factor × dilution</p>
          <p>E. coli at OD600=1: ~8×10⁸ cells/mL. Yeast at OD600=1: ~3×10⁷ cells/mL.</p>
          <p><strong>Dilution planning</strong> uses C₁V₁ = C₂V₂ with OD as concentration proxy.</p>
          <p><strong>Tip:</strong> Keep OD readings below 0.4 for linearity.</p>
        </div>
      }
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Organism Preset</label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setPreset(p.label)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: preset === p.label ? "var(--accent)" : "var(--bg)", color: preset === p.label ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {p.label} {p.factor !== null ? `(${p.factor.toExponential(0)}/mL)` : ""}
            </button>
          ))}
        </div>
        {preset === "Custom" && (
          <InputField label="Conversion factor (cells/mL per OD)" value={customFactor} onChange={setCustomFactor} placeholder="e.g. 8e8" />
        )}
      </div>

      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        {(["od_to_cells", "dilution"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{ background: mode === m ? "var(--accent)" : "var(--bg)", color: mode === m ? "#fff" : "var(--text-muted)" }}>
            {m === "od_to_cells" ? "OD → Cells/mL" : "Dilution Planning"}
          </button>
        ))}
      </div>

      {mode === "od_to_cells" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="OD600 reading" value={od} onChange={setOd} placeholder="e.g. 0.6" />
            <InputField label="Sample dilution" value={dilution} onChange={setDilution} placeholder="1" hint="1 = undiluted" />
          </div>
          <InputField label="Sample volume (optional, for total cells)" value={sampleVol} onChange={setSampleVol}
            unit={sampleVolU} unitOptions={VOL_UNITS} onUnitChange={setSampleVolU} />
          <SectionDivider label="Results" />
          <OutputField label="Cells / mL" value={isFinite(cellsPerMl) ? fmt(cellsPerMl) : "—"} unit={isFinite(cellsPerMl) ? "cells/mL" : undefined} />
          {isFinite(totalCellsCalc) && (
            <OutputField label="Total cells" value={fmt(totalCellsCalc)} unit="cells" />
          )}
        </>
      )}

      {mode === "dilution" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Current OD600" value={currentOd} onChange={setCurrentOd} placeholder="e.g. 1.2" />
            <InputField label="Target OD600" value={targetOd} onChange={setTargetOd} placeholder="e.g. 0.1" />
          </div>
          <InputField label="Final volume" value={finalVol} onChange={setFinalVol}
            unit={finalVolU} unitOptions={VOL_UNITS} onUnitChange={setFinalVolU} />
          {parse(targetOd) >= parse(currentOd) && isPos(parse(targetOd)) && isPos(parse(currentOd)) && (
            <p className="text-xs" style={{ color: "#f59e0b" }}>⚠ Target OD ≥ current OD — cannot dilute to reach this density.</p>
          )}
          <SectionDivider label="Results" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OutputField label="Culture to add" value={isFinite(v1) && v1 > 0 ? fmt(v1) : "—"} unit={isFinite(v1) ? finalVolU : undefined} />
            <OutputField label="Media to add" value={isFinite(diluentVol) && diluentVol >= 0 ? fmt(diluentVol) : "—"} unit={isFinite(diluentVol) && diluentVol >= 0 ? finalVolU : undefined} />
          </div>
        </>
      )}
    </CalcLayout>
  );
}
