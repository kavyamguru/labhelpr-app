"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

function rcfFromRpm(rpm: number, r: number) { return 1.118e-5 * r * rpm * rpm; }
function rpmFromRcf(rcf: number, r: number) { return Math.sqrt(rcf / (1.118e-5 * r)); }

const RADIUS_PRESETS = [
  { label: "Custom",                       r: null },
  { label: "Eppendorf 5424 (8.7 cm)",      r: 8.7  },
  { label: "Benchtop 15/50 mL (12 cm)",    r: 12   },
  { label: "Beckman Allegra (16 cm)",      r: 16   },
];

export default function CentrifugePage() {
  const [radius, setRadius] = useState("8.7");
  const [rpm, setRpm]       = useState("");
  const [rcf, setRcf]       = useState("");
  const [lastEdited, setLastEdited] = useState<"rpm"|"rcf">("rpm");

  const r = parse(radius);

  function handleRpm(v: string) {
    setRpm(v); setLastEdited("rpm");
    if (isPos(parse(v)) && isPos(r)) setRcf(fmt(rcfFromRpm(parse(v), r)));
  }
  function handleRcf(v: string) {
    setRcf(v); setLastEdited("rcf");
    if (isPos(parse(v)) && isPos(r)) setRpm(fmt(rpmFromRcf(parse(v), r)));
  }
  function handleRadius(v: string) {
    setRadius(v);
    const newR = parse(v);
    if (!isPos(newR)) return;
    if (lastEdited === "rpm" && isPos(parse(rpm))) setRcf(fmt(rcfFromRpm(parse(rpm), newR)));
    else if (lastEdited === "rcf" && isPos(parse(rcf))) setRpm(fmt(rpmFromRcf(parse(rcf), newR)));
  }
  function reset() { setRpm(""); setRcf(""); setRadius("8.7"); }

  const rpmV = parse(rpm), rcfV = parse(rcf);
  const copyText = isPos(rpmV) && isPos(rcfV)
    ? `RPM: ${fmt(rpmV)} → RCF: ${fmt(rcfV)} g (r = ${radius} cm)` : "";

  return (
    <CalcLayout
      title="Centrifuge Calculator"
      description="Convert between RPM and RCF (× g) using rotor radius."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Formula:</strong> RCF = 1.118 × 10⁻⁵ × r(cm) × RPM²</p>
          <p><strong>Radius</strong> = distance from center to sample mid-point (in cm).</p>
          <p>Check your rotor manual for the correct radius.</p>
          <p><strong>Tip:</strong> Cell pellet: 300–400 × g; bacteria: 5,000–8,000 × g.</p>
        </div>
      }
    >
      <div className="space-y-2">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Rotor Preset</label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_PRESETS.map(p => (
            <button key={p.label} onClick={() => p.r !== null && handleRadius(String(p.r))}
              className="px-2.5 py-1 rounded-md text-xs transition-colors"
              style={{
                background: p.r !== null && radius === String(p.r) ? "var(--accent)" : "var(--bg)",
                color: p.r !== null && radius === String(p.r) ? "#fff" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <InputField label="Rotor radius (cm)" value={radius} onChange={handleRadius} unit="cm" placeholder="e.g. 8.7" />
      <SectionDivider label="Enter RPM or RCF" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Speed (RPM)" value={rpm} onChange={handleRpm} placeholder="e.g. 13000" unit="RPM" />
        <InputField label="Relative centrifugal force" value={rcf} onChange={handleRcf} placeholder="e.g. 16000" unit="× g" />
      </div>
      <SectionDivider label="Converted Value" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputField label="RCF (× g)" value={isPos(parse(rpm)) && isPos(r) ? fmt(rcfFromRpm(parse(rpm), r)) : "—"} unit="× g" />
        <OutputField label="RPM" value={isPos(parse(rcf)) && isPos(r) ? fmt(rpmFromRcf(parse(rcf), r)) : "—"} unit="RPM" />
      </div>
    </CalcLayout>
  );
}
