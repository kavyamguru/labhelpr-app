"use client";

import { useMemo, useState } from "react";

/**
 * Atomic weights (g/mol). Rounded standard values (good for lab calculations).
 * If you want ultra-high precision later, we can swap to a data file.
 */
const AW: Record<string, number> = {
  H: 1.008, He: 4.0026,
  Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18,
  Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948,
  K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845,
  Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971,
  Br: 79.904, Kr: 83.798,
  Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95, Tc: 98, Ru: 101.07,
  Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41, In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.6,
  I: 126.9, Xe: 131.29,
  Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24, Pm: 145, Sm: 150.36,
  Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.5, Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05,
  Lu: 174.97,
  Hf: 178.49, Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22, Pt: 195.08, Au: 196.97,
  Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98, Po: 209, At: 210, Rn: 222,
  Fr: 223, Ra: 226, Ac: 227, Th: 232.04, Pa: 231.04, U: 238.03, Np: 237, Pu: 244, Am: 243,
  Cm: 247, Bk: 247, Cf: 251, Es: 252, Fm: 257, Md: 258, No: 259, Lr: 266,
  Rf: 267, Db: 268, Sg: 269, Bh: 270, Hs: 270, Mt: 278, Ds: 281, Rg: 282, Cn: 285, Nh: 286,
  Fl: 289, Mc: 290, Lv: 293, Ts: 294, Og: 294,
};

function fmt(x: number, maxFrac = 4) {
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

// --- Parser helpers ---
function isUpper(ch: string) {
  return ch >= "A" && ch <= "Z";
}
function isLower(ch: string) {
  return ch >= "a" && ch <= "z";
}
function isDigit(ch: string) {
  return ch >= "0" && ch <= "9";
}

function parseNumber(s: string, i: number) {
  let j = i;
  while (j < s.length && isDigit(s[j])) j++;
  const num = j > i ? Number(s.slice(i, j)) : 1;
  return { num, next: j };
}

/**
 * Parses one "segment" without hydrate dots.
 * Supports parentheses: Ca(OH)2
 * Supports leading coefficient on group: 5H2O
 */
function computeSegmentMass(segment: string): { mass: number; error?: string } {
  const s = segment.replace(/\s+/g, "");
  let i = 0;

  function parseGroup(): { mass: number; error?: string } {
    let mass = 0;

    while (i < s.length) {
      const ch = s[i];

      if (ch === ")") break;

      // Parentheses group
      if (ch === "(") {
        i++; // consume "("
        const inner = parseGroup();
        if (inner.error) return inner;
        if (i >= s.length || s[i] !== ")") return { mass: 0, error: "Missing closing ')'" };
        i++; // consume ")"
        const { num, next } = parseNumber(s, i);
        i = next;
        mass += inner.mass * num;
        continue;
      }

      // Element symbol
      if (isUpper(ch)) {
        let sym = ch;
        i++;
        if (i < s.length && isLower(s[i])) {
          sym += s[i];
          i++;
        }
        const aw = AW[sym];
        if (!aw) return { mass: 0, error: `Unknown element: ${sym}` };

        const { num, next } = parseNumber(s, i);
        i = next;
        mass += aw * num;
        continue;
      }

      // If user wrote something like "·" inside segment accidentally
      if (ch === "·" || ch === ".") return { mass: 0, error: "Use dots only between hydrate parts (e.g., MgSO4·7H2O)" };

      return { mass: 0, error: `Unexpected character: '${ch}'` };
    }

    return { mass };
  }

  // Optional leading coefficient like "5H2O"
  let leading = 1;
  if (i < s.length && isDigit(s[i])) {
    const out = parseNumber(s, i);
    leading = out.num;
    i = out.next;
  }

  const g = parseGroup();
  if (g.error) return g;

  if (i < s.length && s[i] === ")") return { mass: 0, error: "Unmatched ')'" };
  if (i !== s.length) return { mass: 0, error: "Could not parse entire formula" };

  return { mass: g.mass * leading };
}

/**
 * Full formula supports hydrate dot notation: MgSO4·7H2O
 * We treat dot as "+" of separate segments.
 */
function computeFormulaMass(formulaRaw: string): { mass: number; error?: string } {
  const formula = formulaRaw.trim();
  if (!formula) return { mass: 0, error: "Enter a chemical formula." };

  // Split on dot (middle dot or period)
  const parts = formula.split(/[·.]/).map((p) => p.trim()).filter(Boolean);
  let total = 0;

  for (const p of parts) {
    const seg = computeSegmentMass(p);
    if (seg.error) return seg;
    total += seg.mass;
  }

  return { mass: total };
}

export default function MolecularWeightPage() {
  const [formula, setFormula] = useState("NaCl");

  const computed = useMemo(() => computeFormulaMass(formula), [formula]);

  return (
    <main style={{ padding: 24, maxWidth: 860 }}>
      <h1>Molecular Weight</h1>
      <p style={{ opacity: 0.8 }}>
        Enter a chemical formula to estimate molecular weight (g/mol). Supports parentheses and hydrates (·).
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ width: 170 }}>Formula</label>
        <input
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder="e.g., C6H12O6 or Ca(OH)2 or MgSO4·7H2O"
          style={{ padding: 8, width: 420 }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        {computed.error ? (
          <div style={{ color: "crimson" }}>
            <strong>Error:</strong> {computed.error}
          </div>
        ) : (
          <div>
            <strong>Molecular weight:</strong> {fmt(computed.mass, 4)} g/mol
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>
        Examples: NaCl, C6H12O6, Ca(OH)2, (NH4)2SO4, MgSO4·7H2O
      </div>
    </main>
  );
}

