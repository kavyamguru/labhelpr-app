import Link from "next/link";

const CALCS = [
  { href: "/calculator/unit-conversion",  label: "Unit Conversion",     desc: "Convert between lab units — volume, mass, molarity, length.", icon: "⇄" },
  { href: "/calculator/dilution",         label: "Dilution",            desc: "C₁V₁ = C₂V₂ — find stock or diluent volume.", icon: "💧" },
  { href: "/calculator/molarity",         label: "Molarity",            desc: "Calculate mass to weigh out or solution concentration.", icon: "M" },
  { href: "/calculator/centrifuge",       label: "Centrifuge",          desc: "Convert RPM ↔ RCF using rotor radius.", icon: "⟳" },
  { href: "/calculator/pcr-mastermix",    label: "PCR Mastermix",       desc: "Scale reagent volumes for any number of reactions.", icon: "🧬" },
  { href: "/calculator/a260",             label: "Nucleic Acid (A260)", desc: "Calculate DNA/RNA concentration from absorbance.", icon: "A" },
  { href: "/calculator/serial-dilution",  label: "Serial Dilution",     desc: "Plan transfer and diluent volumes across a dilution series.", icon: "↓" },
  { href: "/calculator/stock-prep",       label: "Stock Preparation",   desc: "Calculate mass or volume for molar, %w/v, and %v/v stocks.", icon: "⚗" },
  { href: "/calculator/concentration",    label: "Concentration Converter", desc: "Convert % w/w + density ↔ molarity for concentrated reagents.", icon: "⇌" },
  { href: "/calculator/od600",            label: "OD600",               desc: "Convert optical density to cell count.", icon: "~" },
  { href: "/calculator/molecular-weight", label: "Molecular Weight",    desc: "Parse a chemical formula and compute molecular weight.", icon: "MW" },
  { href: "/calculator/cell-seeding",     label: "Cell Seeding",        desc: "Plan volumes and cell counts for any plate format.", icon: "⬡" },
];

export default function CalculatorIndex() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text)" }}>Calculator</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Fast, minimal calculators for wet lab scientists. Select one to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CALCS.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border p-4 transition-all hover-bounce"
            style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <span className="text-xl w-8 mt-0.5 text-center">{c.icon}</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{c.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
