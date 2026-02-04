"use client";

import { useMemo, useState } from "react";

type VolUnit = "µL" | "mL" | "L";
const VOL_TO_L: Record<VolUnit, number> = {
  "µL": 1e-6,
  mL: 1e-3,
  L: 1,
};

type ConcUnit = "nM" | "µM" | "mM" | "M";
const CONC_TO_M: Record<ConcUnit, number> = {
  nM: 1e-9,
  "µM": 1e-6,
  mM: 1e-3,
  M: 1,
};

function fmt(x: number, maxFrac = 6) {
  if (!Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  // show scientific only for extreme values
  if ((ax !== 0 && ax < 1e-6) || ax >= 1e9) return x.toExponential(4);
  return x.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

// Convert from M (mol/L) into a chosen concentration unit
function fromM(valueM: number, unit: ConcUnit) {
  return valueM / CONC_TO_M[unit];
}

export default function MolarityPage() {
  const [mode, setMode] = useState<"mass-needed" | "conc-from-mass">("mass-needed");

  // Common inputs
  const [mw, setMw] = useState(58.44); // g/mol (NaCl)
  const [vol, setVol] = useState(1);
  const [volUnit, setVolUnit] = useState<VolUnit>("L");

  // Mode A: mass needed
  const [targetConc, setTargetConc] = useState(150);
  const [targetConcUnit, setTargetConcUnit] = useState<ConcUnit>("mM");

  // Mode B: concentration from mass
  const [massG, setMassG] = useState(1);
  const [outConcUnit, setOutConcUnit] = useState<ConcUnit>("mM");

  const result = useMemo(() => {
    const MW = Number(mw) || 0; // g/mol
    const V_L = (Number(vol) || 0) * VOL_TO_L[volUnit];

    if (mode === "mass-needed") {
      const C_M = (Number(targetConc) || 0) * CONC_TO_M[targetConcUnit]; // mol/L
      const grams = C_M * V_L * MW;
      return { grams };
    } else {
      const grams = Number(massG) || 0;
      const molarity_M = MW === 0 || V_L === 0 ? 0 : (grams / MW) / V_L;
      return { molarity_M };
    }
  }, [mode, mw, vol, volUnit, targetConc, targetConcUnit, massG]);

  return (
    <main style={{ padding: 24, maxWidth: 780 }}>
      <h1>Molarity Calculator</h1>
      <p style={{ opacity: 0.8 }}>
        Calculate grams needed for a solution, or calculate concentration from a weighed mass.
      </p>

      <div style={{ marginTop: 12 }}>
        <label>
          <input
            type="radio"
            checked={mode === "mass-needed"}
            onChange={() => setMode("mass-needed")}
          />{" "}
          Mass needed (given M, V, MW)
        </label>
        <br />
        <label>
          <input
            type="radio"
            checked={mode === "conc-from-mass"}
            onChange={() => setMode("conc-from-mass")}
          />{" "}
          Concentration from mass (given g, V, MW)
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ width: 170 }}>Molecular weight (g/mol)</label>
          <input
            type="number"
            value={mw}
            onChange={(e) => setMw(Number(e.target.value))}
            style={{ padding: 8, width: 160 }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ width: 170 }}>Final volume (V)</label>
          <input
            type="number"
            value={vol}
            onChange={(e) => setVol(Number(e.target.value))}
            style={{ padding: 8, width: 160 }}
          />
          <select value={volUnit} onChange={(e) => setVolUnit(e.target.value as VolUnit)}>
            <option value="µL">µL</option>
            <option value="mL">mL</option>
            <option value="L">L</option>
          </select>
        </div>

        {mode === "mass-needed" ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ width: 170 }}>Target concentration (C)</label>
            <input
              type="number"
              value={targetConc}
              onChange={(e) => setTargetConc(Number(e.target.value))}
              style={{ padding: 8, width: 160 }}
            />
            <select
              value={targetConcUnit}
              onChange={(e) => setTargetConcUnit(e.target.value as ConcUnit)}
            >
              <option value="nM">nM</option>
              <option value="µM">µM</option>
              <option value="mM">mM</option>
              <option value="M">M</option>
            </select>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ width: 170 }}>Mass weighed (g)</label>
            <input
              type="number"
              value={massG}
              onChange={(e) => setMassG(Number(e.target.value))}
              style={{ padding: 8, width: 160 }}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        {mode === "mass-needed" ? (
          <div>
            <strong>Weigh:</strong> {fmt(result.grams ?? 0, 6)} g
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>Concentration:</strong>
            <span>
              {fmt(fromM(result.molarity_M ?? 0, outConcUnit), 6)} {outConcUnit}
            </span>
            <select
              value={outConcUnit}
              onChange={(e) => setOutConcUnit(e.target.value as ConcUnit)}
            >
              <option value="nM">nM</option>
              <option value="µM">µM</option>
              <option value="mM">mM</option>
              <option value="M">M</option>
            </select>
          </div>
        )}
      </div>

      <p style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
        Tip: For buffers/mixtures, MW may be an “effective MW” or you may need component-wise calculations.
      </p>
    </main>
  );
}

