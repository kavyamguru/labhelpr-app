const ATOMIC_WEIGHTS: Record<string, number> = {
  H:  1.008,  He: 4.003,  Li: 6.941,  Be: 9.012,  B:  10.811,
  C:  12.011, N:  14.007, O:  15.999, F:  18.998, Ne: 20.180,
  Na: 22.990, Mg: 24.305, Al: 26.982, Si: 28.086, P:  30.974,
  S:  32.065, Cl: 35.453, Ar: 39.948, K:  39.098, Ca: 40.078,
  Sc: 44.956, Ti: 47.867, V:  50.942, Cr: 51.996, Mn: 54.938,
  Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904,
  Kr: 83.798, Rb: 85.468, Sr: 87.62,  Y:  88.906, Zr: 91.224,
  Nb: 92.906, Mo: 95.96,  Tc: 98,     Ru: 101.07, Rh: 102.906,
  Pd: 106.42, Ag: 107.868,Cd: 112.411,In: 114.818,Sn: 118.710,
  Sb: 121.760,Te: 127.60, I:  126.904,Xe: 131.293,Cs: 132.905,
  Ba: 137.327,La: 138.905,Ce: 140.116,Pr: 140.908,Nd: 144.242,
  Sm: 150.36, Eu: 151.964,Gd: 157.25, Tb: 158.925,Dy: 162.500,
  Ho: 164.930,Er: 167.259,Tm: 168.934,Yb: 173.054,Lu: 174.967,
  Hf: 178.49, Ta: 180.948,W:  183.84, Re: 186.207,Os: 190.23,
  Ir: 192.217,Pt: 195.084,Au: 196.967,Hg: 200.592,Tl: 204.383,
  Pb: 207.2,  Bi: 208.980,Po: 209,    At: 210,    Rn: 222,
  Fr: 223,    Ra: 226,    Ac: 227,    Th: 232.038,Pa: 231.036,
  U:  238.029,
};

type ParseResult = { mw: number; error?: never } | { mw?: never; error: string };

export function parseMW(formula: string): ParseResult {
  if (!formula.trim()) return { error: "Empty formula" };
  const clean = formula.trim().replace(/·/g, "·");
  try {
    const mw = parseFormula(clean, 0).mw;
    return { mw: Math.round(mw * 1000) / 1000 };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

interface ParseState { mw: number; pos: number }

function parseFormula(s: string, pos: number): ParseState {
  let mw = 0;
  while (pos < s.length) {
    const ch = s[pos];
    if (ch === "·" || ch === "." && /\d/.test(s[pos + 1] ?? "")) {
      const { mw: hydrateMW, pos: newPos } = parseFormula(s, pos + 1);
      mw += hydrateMW;
      pos = newPos;
      break;
    }
    if (ch === "(" || ch === "[") {
      const { mw: innerMW, pos: innerEnd } = parseGroup(s, pos + 1, ch === "(" ? ")" : "]");
      const { coeff, end } = readCoeff(s, innerEnd);
      mw += innerMW * coeff;
      pos = end;
      continue;
    }
    if (ch === ")" || ch === "]") break;
    if (/[A-Z]/.test(ch)) {
      let sym = ch;
      let i = pos + 1;
      while (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
      const w = ATOMIC_WEIGHTS[sym];
      if (w === undefined) throw new Error(`Unknown element: ${sym}`);
      const { coeff, end } = readCoeff(s, i);
      mw += w * coeff;
      pos = end;
      continue;
    }
    if (/[\+\-\d\s]/.test(ch)) { pos++; continue; }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return { mw, pos };
}

function parseGroup(s: string, pos: number, closing: string): ParseState {
  let mw = 0;
  while (pos < s.length) {
    const ch = s[pos];
    if (ch === closing) { return { mw, pos: pos + 1 }; }
    if (ch === "(" || ch === "[") {
      const { mw: innerMW, pos: innerEnd } = parseGroup(s, pos + 1, ch === "(" ? ")" : "]");
      const { coeff, end } = readCoeff(s, innerEnd);
      mw += innerMW * coeff;
      pos = end;
      continue;
    }
    if (/[A-Z]/.test(ch)) {
      let sym = ch;
      let i = pos + 1;
      while (i < s.length && /[a-z]/.test(s[i])) { sym += s[i]; i++; }
      const w = ATOMIC_WEIGHTS[sym];
      if (w === undefined) throw new Error(`Unknown element: ${sym}`);
      const { coeff, end } = readCoeff(s, i);
      mw += w * coeff;
      pos = end;
      continue;
    }
    if (/[\+\-\s]/.test(ch)) { pos++; continue; }
    throw new Error(`Unexpected character: ${ch}`);
  }
  throw new Error(`Unclosed bracket`);
}

function readCoeff(s: string, pos: number): { coeff: number; end: number } {
  let num = "";
  while (pos < s.length && /\d/.test(s[pos])) { num += s[pos]; pos++; }
  return { coeff: num ? parseInt(num, 10) : 1, end: pos };
}
