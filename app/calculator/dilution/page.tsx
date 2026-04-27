"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

const CONC_UNITS = ["M", "mM", "µM", "nM", "mg/mL", "µg/mL", "ng/µL", "ng/mL", "% (v/v)", "x"];
const VOL_UNITS  = ["mL", "µL", "L"];

export default function DilutionPage() {
  const [c1, setC1] = useState("");   const [c1u, setC1u] = useState("mM");
  const [c2, setC2] = useState("");   const [c2u, setC2u] = useState("mM");
  const [v2, setV2] = useState("");   const [v2u, setV2u] = useState("mL");
  const [v1u, setV1u] = useState("mL");

  function reset() { setC1(""); setC2(""); setV2(""); }

  const c1v = parse(c1), c2v = parse(c2), v2v = parse(v2);
  const valid = isPos(c1v) && isPos(c2v) && isPos(v2v);
  const v1 = valid ? (c2v * v2v) / c1v : NaN;
  const diluent = valid ? v2v - v1 : NaN;
  const warn = valid && v1 > v2v ? "V1 > V2: check your concentrations." : undefined;
  const warnNeg = valid && diluent < 0 ? "Diluent volume is negative — stock is too dilute." : undefined;

  const copyText = valid
    ? `Stock volume (V1): ${fmt(v1)} ${v1u}\nDiluent volume: ${fmt(diluent)} ${v2u}\nC1=${c1}${c1u}, C2=${c2}${c2u}, V2=${v2}${v2u}`
    : "";

  return (
    <CalcLayout
      title="Dilution Calculator"
      description="Find stock and diluent volumes using C₁V₁ = C₂V₂."
      onReset={reset}
      copyText={valid ? copyText : undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Formula:</strong> C₁ × V₁ = C₂ × V₂</p>
          <p><strong>V1</strong> = stock volume to take. <strong>Diluent</strong> = V₂ − V₁.</p>
          <p>Keep concentration units consistent. Unit labels are for reference only.</p>
          <p><strong>Tip:</strong> If C₂ ≥ C₁, you need more stock than final volume — check your numbers.</p>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Stock concentration (C1)" value={c1} onChange={setC1}
          unit={c1u} unitOptions={CONC_UNITS} onUnitChange={setC1u} />
        <InputField label="Target concentration (C2)" value={c2} onChange={setC2}
          unit={c2u} unitOptions={CONC_UNITS} onUnitChange={setC2u} />
      </div>
      <InputField label="Final volume (V2)" value={v2} onChange={setV2}
        unit={v2u} unitOptions={VOL_UNITS} onUnitChange={setV2u} />

      <SectionDivider label="Results" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputField label="Stock volume (V1)" value={valid ? fmt(v1) : "—"}
          unit={valid ? v1u : undefined} warning={warn} />
        <OutputField label="Diluent volume (V2 − V1)" value={valid && diluent >= 0 ? fmt(diluent) : "—"}
          unit={valid && diluent >= 0 ? v2u : undefined} warning={warnNeg} />
      </div>

      {valid && !warn && (
        <div className="rounded-lg p-3 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dilution ratio</p>
          <p className="font-mono font-semibold text-sm" style={{ color: "var(--output-text)" }}>
            1 : {fmt(c1v / c2v, 3)}
          </p>
        </div>
      )}
    </CalcLayout>
  );
}
