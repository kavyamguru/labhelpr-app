"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { UNIT_GROUPS, convert } from "@/lib/units";
import { fmt, parse } from "@/lib/fmt";

export default function UnitConversionPage() {
  const [family, setFamily] = useState("volume");
  const [value, setValue]   = useState("");
  const [fromUnit, setFromUnit] = useState("mL");
  const [toUnit, setToUnit]     = useState("µL");

  const group = UNIT_GROUPS.find(g => g.id === family)!;

  function handleFamily(f: string) {
    const g = UNIT_GROUPS.find(g => g.id === f)!;
    setFamily(f);
    setFromUnit(g.units[0].label);
    setToUnit(g.units[1]?.label ?? g.units[0].label);
    setValue("");
  }

  const v = parse(value);
  const result  = isNaN(v) ? NaN : convert(v, fromUnit, toUnit, family);
  const reverse = isNaN(v) ? NaN : convert(v, toUnit, fromUnit, family);

  function reset() { setValue(""); }

  const copyText = isFinite(result) ? `${fmt(result)} ${toUnit}` : "";

  return (
    <CalcLayout
      title="Unit Conversion"
      description="Convert between laboratory units instantly."
      onReset={reset}
      copyText={copyText}
      tips={
        <div className="space-y-2">
          <p><strong>Formula:</strong> result = value × (from_factor / to_factor)</p>
          <p>All conversions are multiplicative.</p>
          <p><strong>Tip:</strong> µL for pipetting; mL for tubes; L for culture flasks.</p>
        </div>
      }
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Unit Type</label>
        <div className="flex flex-wrap gap-2">
          {UNIT_GROUPS.map(g => (
            <button key={g.id} onClick={() => handleFamily(g.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: family === g.id ? "var(--accent)" : "var(--bg)", color: family === g.id ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {g.name}
            </button>
          ))}
        </div>
      </div>

      <InputField label={`Value (${fromUnit})`} value={value} onChange={setValue} placeholder="e.g. 1.5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>From</label>
          <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {group.units.map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>To</label>
          <select value={toUnit} onChange={e => setToUnit(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {group.units.map(u => <option key={u.label} value={u.label}>{u.label}</option>)}
          </select>
        </div>
      </div>

      <SectionDivider label="Result" />
      <OutputField label={`${fromUnit} → ${toUnit}`} value={isFinite(result) ? fmt(result) : "—"} unit={isFinite(result) ? toUnit : undefined} />
      {isFinite(reverse) && (
        <div className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
          Reverse: 1 {toUnit} = {fmt(convert(1, toUnit, fromUnit, family))} {fromUnit}
        </div>
      )}
    </CalcLayout>
  );
}
