"use client";
import { useState, useDeferredValue } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { parseMW } from "@/lib/mw-parser";

const EXAMPLES = ["H2O", "NaCl", "C6H12O6", "Ca(OH)2", "CuSO4·5H2O", "C12H22O11", "NaHCO3"];

export default function MolecularWeightPage() {
  const [formula, setFormula] = useState("");
  const deferred = useDeferredValue(formula);
  const result = deferred.trim() ? parseMW(deferred) : null;

  function reset() { setFormula(""); }

  const copyText = result && result.mw !== undefined
    ? `MW(${formula}) = ${result.mw} g/mol` : "";

  return (
    <CalcLayout
      title="Molecular Weight"
      description="Parse a chemical formula and compute its molecular weight."
      onReset={reset}
      copyText={copyText || undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Supported notation:</strong></p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>Parentheses: Ca(OH)2</li>
            <li>Brackets: [Fe(CN)6]3</li>
            <li>Hydrates: CuSO4·5H2O or CuSO4.5H2O</li>
            <li>Capitalization matters: Na (sodium) vs NA (invalid)</li>
          </ul>
          <p>Atomic weights from IUPAC 2021. ~100 elements supported.</p>
        </div>
      }
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Chemical Formula
        </label>
        <input
          type="text"
          value={formula}
          onChange={e => setFormula(e.target.value)}
          placeholder="e.g. C6H12O6"
          className="w-full rounded-lg px-4 py-3 text-lg font-mono outline-none transition-all"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          onFocus={e => (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => setFormula(ex)}
            className="px-2.5 py-1 rounded-md text-xs font-mono transition-colors hover:opacity-80"
            style={{
              background: formula === ex ? "var(--accent)" : "var(--bg)",
              color: formula === ex ? "#fff" : "var(--text-muted)",
              border: "1px solid var(--border)",
            }}>
            {ex}
          </button>
        ))}
      </div>

      {result ? (
        <div className="rounded-xl p-5 space-y-1"
          style={{ background: result.error ? "#fef3c7" : "var(--output-bg)", border: `1px solid ${result.error ? "#f59e0b" : "var(--border)"}` }}>
          {result.error ? (
            <p className="text-sm font-medium" style={{ color: "#92400e" }}>⚠ {result.error}</p>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Molecular Weight</p>
              <p className="text-3xl font-mono font-bold" style={{ color: "var(--output-text)" }}>
                {result.mw}
                <span className="text-base font-normal ml-2" style={{ color: "var(--text-muted)" }}>g/mol</span>
              </p>
              <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>Formula: {formula}</p>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-5 flex items-center justify-center h-24"
          style={{ background: "var(--bg)", border: "1px dashed var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Enter a chemical formula above</p>
        </div>
      )}
    </CalcLayout>
  );
}
