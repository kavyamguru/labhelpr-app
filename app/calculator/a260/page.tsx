"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

const NA_TYPES = [
  { label: "dsDNA",  factor: 50   },
  { label: "RNA",    factor: 40   },
  { label: "ssDNA",  factor: 33   },
  { label: "Custom", factor: null },
];

export default function A260Page() {
  const [a260, setA260]         = useState("");
  const [dilution, setDilution] = useState("1");
  const [naType, setNaType]     = useState("dsDNA");
  const [customFactor, setCustomFactor] = useState("");
  const [a280, setA280] = useState("");
  const [a230, setA230] = useState("");

  const preset = NA_TYPES.find(t => t.label === naType)!;
  const factor = preset.factor ?? parse(customFactor);

  const a260v     = parse(a260);
  const dilutionV = parse(dilution);
  const concUgMl  = isPos(a260v) && isFinite(factor) && isPos(dilutionV) ? a260v * factor * dilutionV : NaN;
  const concNgUl  = concUgMl;

  const a280v = parse(a280);
  const a230v = parse(a230);
  const ratio260_280 = isPos(a260v) && isPos(a280v) ? a260v / a280v : NaN;
  const ratio260_230 = isPos(a260v) && isPos(a230v) ? a260v / a230v : NaN;

  let purityHint = "";
  if (isFinite(ratio260_280)) {
    if (ratio260_280 >= 1.8 && ratio260_280 <= 2.1) purityHint = "Good purity";
    else if (ratio260_280 < 1.8) purityHint = "Possible protein contamination";
    else purityHint = "Possible RNA contamination (if DNA)";
  }

  function reset() { setA260(""); setDilution("1"); setA280(""); setA230(""); }

  const copyText = isFinite(concUgMl)
    ? `${naType} concentration: ${fmt(concUgMl)} µg/mL (${fmt(concNgUl)} ng/µL)\nA260 = ${a260}, Dilution = ${dilution}x, Factor = ${factor}`
    : "";

  return (
    <CalcLayout
      title="Nucleic Acid (A260)"
      description="Calculate DNA/RNA concentration from absorbance readings."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Formula:</strong> Conc (µg/mL) = A260 × factor × dilution</p>
          <p>Factors: dsDNA = 50, RNA = 40, ssDNA = 33</p>
          <p>260/280 ≈ 1.8 (DNA), ≈ 2.0 (RNA) → good purity</p>
          <p>260/230 ≈ 2.0–2.2 → good purity</p>
        </div>
      }
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Nucleic Acid Type</label>
        <div className="flex flex-wrap gap-2">
          {NA_TYPES.map(t => (
            <button key={t.label} onClick={() => setNaType(t.label)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: naType === t.label ? "var(--accent)" : "var(--bg)", color: naType === t.label ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {t.label} {t.factor !== null ? `(×${t.factor})` : ""}
            </button>
          ))}
        </div>
        {naType === "Custom" && (
          <InputField label="Custom factor" value={customFactor} onChange={setCustomFactor} placeholder="e.g. 45" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="A260 absorbance" value={a260} onChange={setA260} placeholder="e.g. 0.42" />
        <InputField label="Dilution factor" value={dilution} onChange={setDilution} placeholder="1" hint="1 = undiluted" />
      </div>

      <SectionDivider label="Concentration" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputField label="Concentration" value={isFinite(concUgMl) ? fmt(concUgMl) : "—"} unit={isFinite(concUgMl) ? "µg/mL" : undefined} />
        <OutputField label="Concentration" value={isFinite(concNgUl) ? fmt(concNgUl) : "—"} unit={isFinite(concNgUl) ? "ng/µL" : undefined} />
      </div>

      <SectionDivider label="Purity Ratios (optional)" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="A280 absorbance" value={a280} onChange={setA280} placeholder="optional" />
        <InputField label="A230 absorbance" value={a230} onChange={setA230} placeholder="optional" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputField
          label="260 / 280 ratio"
          value={isFinite(ratio260_280) ? fmt(ratio260_280, 3) : "—"}
          warning={purityHint && ratio260_280 < 1.8 ? purityHint : undefined}
          secondary={purityHint && ratio260_280 >= 1.8 ? purityHint : undefined}
        />
        <OutputField
          label="260 / 230 ratio"
          value={isFinite(ratio260_230) ? fmt(ratio260_230, 3) : "—"}
          warning={isFinite(ratio260_230) && ratio260_230 < 1.8 ? "Possible organic contamination" : undefined}
        />
      </div>
    </CalcLayout>
  );
}
