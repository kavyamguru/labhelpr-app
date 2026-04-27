"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

interface Reagent { id: number; name: string; volPerRxn: string; included: boolean; }
let nextId = 5;
const DEFAULT_REAGENTS: Reagent[] = [
  { id: 1, name: "2× Master Mix",          volPerRxn: "10",  included: true },
  { id: 2, name: "Forward Primer (10µM)",   volPerRxn: "0.5", included: true },
  { id: 3, name: "Reverse Primer (10µM)",   volPerRxn: "0.5", included: true },
  { id: 4, name: "Template DNA",            volPerRxn: "1",   included: true },
];

export default function PCRMastermixPage() {
  const [reactions, setReactions]       = useState("10");
  const [extra, setExtra]               = useState("10");
  const [reagents, setReagents]         = useState<Reagent[]>(DEFAULT_REAGENTS);
  const [waterInMix, setWaterInMix]     = useState(true);
  const [totalPerRxn, setTotalPerRxn]   = useState("20");

  const rxnCount  = parse(reactions);
  const extraFrac = parse(extra) / 100;
  const multiplier = isPos(rxnCount) ? rxnCount * (1 + (isFinite(extraFrac) ? extraFrac : 0)) : NaN;
  const totalV = parse(totalPerRxn);
  const includedReagents = reagents.filter(r => r.included);
  const reagentSum = includedReagents.reduce((s, r) => s + (parse(r.volPerRxn) || 0), 0);
  const waterPerRxn = (isPos(totalV) ? totalV : 20) - reagentSum;

  function updateReagent(id: number, field: keyof Reagent, value: string | boolean) {
    setReagents(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function addReagent() {
    setReagents(prev => [...prev, { id: nextId++, name: "Reagent", volPerRxn: "1", included: true }]);
  }
  function removeReagent(id: number) { setReagents(prev => prev.filter(r => r.id !== id)); }
  function reset() { setReactions("10"); setExtra("10"); setReagents(DEFAULT_REAGENTS.map(r => ({ ...r }))); }

  function buildCopyText() {
    const lines = [`PCR Mastermix — ${reactions} reactions + ${extra}% overage (×${fmt(multiplier, 3)})`];
    reagents.filter(r => r.included).forEach(r => lines.push(`  ${r.name}: ${fmt(parse(r.volPerRxn) * multiplier, 3)} µL`));
    if (waterInMix) lines.push(`  Water: ${fmt(waterPerRxn * multiplier, 3)} µL`);
    const total = ((waterInMix ? waterPerRxn : 0) + reagentSum) * multiplier;
    lines.push(`Total: ${fmt(total, 4)} µL`);
    return lines.join("\n");
  }

  const totalMixVol = ((waterInMix ? waterPerRxn : 0) + reagentSum) * multiplier;

  return (
    <CalcLayout
      title="PCR Mastermix"
      description="Scale reagent volumes for any number of reactions with overage."
      onReset={reset}
      copyText={isFinite(multiplier) ? buildCopyText() : undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Multiplier</strong> = reactions × (1 + extra%/100)</p>
          <p>Water = total reaction vol − sum of other reagents.</p>
          <p><strong>Tip:</strong> 10% overage is standard; 5% for ≥ 24 reactions.</p>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InputField label="# Reactions" value={reactions} onChange={setReactions} placeholder="10" />
        <InputField label="Overage (%)" value={extra} onChange={setExtra} placeholder="10" unit="%" />
        <InputField label="Vol / reaction" value={totalPerRxn} onChange={setTotalPerRxn} placeholder="20" unit="µL" />
      </div>

      {isPos(rxnCount) && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Preparing for <strong style={{ color: "var(--accent)" }}>{fmt(multiplier, 3)}</strong> reactions total
        </p>
      )}

      <SectionDivider label="Reagents" />
      <div className="space-y-2">
        <div className="grid grid-cols-[auto_1fr_100px_80px_32px] gap-2 px-1 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          <span>On</span><span>Reagent</span><span>µL / rxn</span><span>Total µL</span><span></span>
        </div>
        {reagents.map(r => {
          const perRxn = parse(r.volPerRxn);
          const total  = isFinite(multiplier) && isPos(parse(r.volPerRxn)) ? perRxn * multiplier : NaN;
          return (
            <div key={r.id} className="grid grid-cols-[auto_1fr_100px_80px_32px] gap-2 items-center">
              <input type="checkbox" checked={r.included} onChange={e => updateReagent(r.id, "included", e.target.checked)} className="w-4 h-4 rounded" />
              <input value={r.name} onChange={e => updateReagent(r.id, "name", e.target.value)}
                className="rounded-lg px-2 py-1.5 text-sm outline-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <input type="number" value={r.volPerRxn} onChange={e => updateReagent(r.id, "volPerRxn", e.target.value)}
                className="rounded-lg px-2 py-1.5 text-sm font-mono outline-none text-right"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
              <span className="text-sm font-mono text-right px-2 py-1.5 rounded-lg"
                style={{ background: r.included && isFinite(total) ? "var(--output-bg)" : "var(--bg)", color: r.included && isFinite(total) ? "var(--output-text)" : "var(--text-muted)", border: "1px solid var(--border)", opacity: r.included ? 1 : 0.4 }}>
                {r.included && isFinite(total) ? fmt(total, 3) : "—"}
              </span>
              <button onClick={() => removeReagent(r.id)} className="text-xs rounded px-1 py-1 hover:opacity-70" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
          );
        })}
        <div className="grid grid-cols-[auto_1fr_100px_80px_32px] gap-2 items-center">
          <input type="checkbox" checked={waterInMix} onChange={e => setWaterInMix(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm px-2 py-1.5" style={{ color: "var(--text-muted)" }}>Nuclease-free water</span>
          <span className="text-sm font-mono text-right px-2 py-1.5 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {fmt(waterPerRxn, 3)}
          </span>
          <span className="text-sm font-mono text-right px-2 py-1.5 rounded-lg"
            style={{ background: waterInMix && isFinite(multiplier) ? "var(--output-bg)" : "var(--bg)", color: waterInMix && isFinite(multiplier) ? "var(--output-text)" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {waterInMix && isFinite(multiplier) ? fmt(waterPerRxn * multiplier, 3) : "—"}
          </span>
          <span />
        </div>
      </div>

      <button onClick={addReagent} className="text-sm font-medium hover:opacity-70 transition-colors" style={{ color: "var(--accent)" }}>
        + Add reagent
      </button>

      <SectionDivider label="Summary" />
      <div className="rounded-xl p-4 flex justify-between items-center"
        style={{ background: "var(--output-bg)", border: "1px solid var(--border)" }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total mastermix volume</p>
          <p className="text-2xl font-mono font-semibold" style={{ color: "var(--output-text)" }}>
            {isFinite(totalMixVol) ? fmt(totalMixVol, 4) : "—"}
            <span className="text-base font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>µL</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Per reaction</p>
          <p className="font-mono font-semibold" style={{ color: "var(--output-text)" }}>{isPos(totalV) ? fmt(totalV) : "—"} µL</p>
        </div>
      </div>
    </CalcLayout>
  );
}
