"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

const CONC_UNITS = ["M", "mM", "µM", "nM", "pM", "µg/mL", "ng/mL", "cells/mL"];
const VOL_UNITS  = ["µL", "mL"];

export default function SerialDilutionPage() {
  const [startConc, setStartConc] = useState(""); const [startConcU, setStartConcU] = useState("mM");
  const [factor, setFactor]       = useState("10");
  const [tubes, setTubes]         = useState("8");
  const [volPerTube, setVolPerTube] = useState("1"); const [volUnit, setVolUnit] = useState("mL");

  function reset() { setStartConc(""); setFactor("10"); setTubes("8"); setVolPerTube("1"); }

  const c0  = parse(startConc);
  const df  = parse(factor);
  const n   = Math.max(1, Math.min(20, Math.round(parse(tubes) || 8)));
  const vol = parse(volPerTube);
  const valid = isPos(c0) && isPos(df) && df > 1 && isPos(vol);

  const transfer = valid ? vol / df : NaN;
  const diluent  = valid ? vol - transfer : NaN;

  const rows: { tube: number; conc: number }[] = [];
  if (valid) {
    for (let i = 0; i < n; i++) rows.push({ tube: i + 1, conc: c0 / Math.pow(df, i + 1) });
  }

  function buildCopyText() {
    const lines = [`Serial dilution — Start: ${startConc} ${startConcU}, 1:${factor}, ${tubes} tubes`];
    lines.push(`Transfer: ${fmt(transfer)} ${volUnit} | Diluent: ${fmt(diluent)} ${volUnit}`);
    rows.forEach(r => lines.push(`Tube ${r.tube}: ${fmt(r.conc)} ${startConcU}`));
    return lines.join("\n");
  }

  return (
    <CalcLayout
      title="Serial Dilution"
      description="Plan transfer and diluent volumes for a dilution series."
      onReset={reset}
      copyText={valid ? buildCopyText() : undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Each step:</strong> Transfer = V / df; Diluent = V × (df−1) / df</p>
          <p><strong>Concentrations:</strong> Cₙ = C₀ / dfⁿ</p>
          <p><strong>Tip:</strong> 1:10 series over 8 tubes gives a 10⁸-fold range.</p>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Starting concentration (C0)" value={startConc} onChange={setStartConc}
          unit={startConcU} unitOptions={CONC_UNITS} onUnitChange={setStartConcU} />
        <InputField label="Dilution factor (1:X)" value={factor} onChange={setFactor}
          placeholder="e.g. 10" hint="e.g. 10 = 1:10 dilution each step" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Number of tubes" value={tubes} onChange={setTubes} placeholder="8" hint="Max 20" />
        <InputField label="Volume per tube" value={volPerTube} onChange={setVolPerTube}
          unit={volUnit} unitOptions={VOL_UNITS} onUnitChange={setVolUnit} />
      </div>

      {valid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: "var(--output-bg)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Transfer volume</p>
            <p className="text-2xl font-mono font-semibold" style={{ color: "var(--output-text)" }}>
              {fmt(transfer)} <span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>{volUnit}</span>
            </p>
          </div>
          <div className="rounded-xl p-4" style={{ background: "var(--output-bg)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Diluent volume</p>
            <p className="text-2xl font-mono font-semibold" style={{ color: "var(--output-text)" }}>
              {fmt(diluent)} <span className="text-base font-normal" style={{ color: "var(--text-muted)" }}>{volUnit}</span>
            </p>
          </div>
        </div>
      )}

      {valid && rows.length > 0 && (
        <>
          <SectionDivider label="Dilution Series" />
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tube</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Concentration ({startConcU})</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fold from C0</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.tube} className="border-t" style={{ borderColor: "var(--border)", background: i % 2 === 0 ? "var(--bg-card)" : "var(--bg)" }}>
                    <td className="px-4 py-2 font-medium">{r.tube}</td>
                    <td className="px-4 py-2 font-mono" style={{ color: "var(--output-text)" }}>{fmt(r.conc)}</td>
                    <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--text-muted)" }}>1 : {fmt(Math.pow(df, r.tube), 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CalcLayout>
  );
}
