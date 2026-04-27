"use client";
import { useState } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

type Mode = "mass_needed" | "conc_from_mass";

const VOL_UNITS  = ["mL", "L", "µL"];
const CONC_UNITS = ["M", "mM", "µM", "nM"];
const MASS_UNITS = ["g", "mg", "µg"];

const VOL_FACTOR:  Record<string, number> = { L: 1, mL: 1e-3, µL: 1e-6 };
const CONC_FACTOR: Record<string, number> = { M: 1, mM: 1e-3, µM: 1e-6, nM: 1e-9 };
const MASS_FACTOR: Record<string, number> = { g: 1, mg: 1e-3, µg: 1e-6 };

export default function MolarityPage() {
  const [mode, setMode] = useState<Mode>("mass_needed");
  const [m1mol, setM1mol] = useState(""); const [m1molu, setM1molu] = useState("mM");
  const [m1vol, setM1vol] = useState(""); const [m1volu, setM1volu] = useState("mL");
  const [m1mw, setM1mw]   = useState("");
  const [m2mass, setM2mass] = useState(""); const [m2massu, setM2massu] = useState("mg");
  const [m2vol, setM2vol]   = useState(""); const [m2volu, setM2volu]   = useState("mL");
  const [m2mw, setM2mw]     = useState("");

  function reset() {
    setM1mol(""); setM1vol(""); setM1mw("");
    setM2mass(""); setM2vol(""); setM2mw("");
  }

  const mol1    = parse(m1mol);
  const vol1    = parse(m1vol);
  const mw1     = parse(m1mw);
  const molBase = isPos(mol1) ? mol1 * CONC_FACTOR[m1molu] : NaN;
  const volBase1 = isPos(vol1) ? vol1 * VOL_FACTOR[m1volu] : NaN;
  const mwVal1   = isPos(mw1) ? mw1 : 0;
  const gramsNeeded = isFinite(molBase) && isFinite(volBase1) ? molBase * volBase1 * mwVal1 : NaN;
  const mgNeeded = gramsNeeded * 1e3;

  const mass2    = parse(m2mass);
  const vol2     = parse(m2vol);
  const mw2      = parse(m2mw);
  const massBase = isPos(mass2) ? mass2 * MASS_FACTOR[m2massu] : NaN;
  const volBase2 = isPos(vol2)  ? vol2  * VOL_FACTOR[m2volu]   : NaN;
  const mwVal2   = isPos(mw2) ? mw2 : 0;
  const molarityM = (isFinite(massBase) && isFinite(volBase2) && mwVal2 > 0) ? (massBase / mwVal2) / volBase2 : NaN;
  const molaritymM = molarityM * 1e3;

  let copyText = "";
  if (mode === "mass_needed" && isFinite(gramsNeeded)) {
    copyText = `Mass needed: ${fmt(gramsNeeded)} g (${fmt(mgNeeded)} mg)\nFor ${m1mol} ${m1molu}, ${m1vol} ${m1volu}, MW=${m1mw || "not set"}`;
  } else if (mode === "conc_from_mass" && isFinite(molarityM)) {
    copyText = `Concentration: ${fmt(molarityM)} M (${fmt(molaritymM)} mM)`;
  }

  return (
    <CalcLayout
      title="Molarity Calculator"
      description="Calculate mass to weigh out or the concentration of a solution."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Mode 1 — Mass needed:</strong> g = M × V(L) × MW(g/mol)</p>
          <p><strong>Mode 2 — Concentration:</strong> M = [mass(g) / MW] / V(L)</p>
          <p>Enter MW manually. If MW is 0 or blank, mass output = 0.</p>
          <p><strong>Tip:</strong> Use the Molecular Weight calculator to get MW from a formula.</p>
        </div>
      }
    >
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "var(--border)" }}>
        {(["mass_needed", "conc_from_mass"] as Mode[]).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className="flex-1 py-2 text-sm font-medium transition-colors"
            style={{ background: mode === m ? "var(--accent)" : "var(--bg)", color: mode === m ? "#fff" : "var(--text-muted)" }}>
            {m === "mass_needed" ? "Mass needed" : "Conc. from mass"}
          </button>
        ))}
      </div>

      {mode === "mass_needed" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Target concentration" value={m1mol} onChange={setM1mol}
              unit={m1molu} unitOptions={CONC_UNITS} onUnitChange={setM1molu} />
            <InputField label="Final volume" value={m1vol} onChange={setM1vol}
              unit={m1volu} unitOptions={VOL_UNITS} onUnitChange={setM1volu} />
          </div>
          <InputField label="Molecular weight (g/mol)" value={m1mw} onChange={setM1mw}
            placeholder="e.g. 58.44" hint="Leave blank or 0 if unknown — mass output will be 0." />
          <SectionDivider label="Result" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OutputField label="Mass to weigh (g)" value={isFinite(gramsNeeded) ? fmt(gramsNeeded) : "—"} unit={isFinite(gramsNeeded) ? "g" : undefined} />
            <OutputField label="Mass to weigh (mg)" value={isFinite(mgNeeded) ? fmt(mgNeeded) : "—"} unit={isFinite(mgNeeded) ? "mg" : undefined} />
          </div>
        </>
      )}

      {mode === "conc_from_mass" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Mass dissolved" value={m2mass} onChange={setM2mass}
              unit={m2massu} unitOptions={MASS_UNITS} onUnitChange={setM2massu} />
            <InputField label="Solution volume" value={m2vol} onChange={setM2vol}
              unit={m2volu} unitOptions={VOL_UNITS} onUnitChange={setM2volu} />
          </div>
          <InputField label="Molecular weight (g/mol)" value={m2mw} onChange={setM2mw} placeholder="e.g. 342.3" />
          <SectionDivider label="Result" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <OutputField label="Concentration (M)" value={isFinite(molarityM) ? fmt(molarityM) : "—"} unit={isFinite(molarityM) ? "M" : undefined} />
            <OutputField label="Concentration (mM)" value={isFinite(molaritymM) ? fmt(molaritymM) : "—"} unit={isFinite(molaritymM) ? "mM" : undefined} />
          </div>
        </>
      )}
    </CalcLayout>
  );
}
