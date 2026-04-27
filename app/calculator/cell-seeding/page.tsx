"use client";
import { useState, useCallback, useEffect } from "react";
import CalcLayout from "@/components/calculator/CalcLayout";
import { InputField, OutputField, SectionDivider } from "@/components/calculator/Field";
import { fmt, parse, isPos } from "@/lib/fmt";

const PLATE_TYPES = [
  { label: "6-well",  wells: 6,  rows: 2, cols: 3,  volPerWell: 2   },
  { label: "12-well", wells: 12, rows: 3, cols: 4,  volPerWell: 1   },
  { label: "24-well", wells: 24, rows: 4, cols: 6,  volPerWell: 0.5 },
  { label: "48-well", wells: 48, rows: 6, cols: 8,  volPerWell: 0.3 },
  { label: "96-well", wells: 96, rows: 8, cols: 12, volPerWell: 0.2 },
  { label: "Custom",  wells: null, rows: null, cols: null, volPerWell: null },
];

const ROW_LABELS = "ABCDEFGH";
const WELL_SIZE: Record<string, number> = {
  "6-well": 52, "12-well": 40, "24-well": 32, "48-well": 26, "96-well": 22,
};

function allSelected(rows: number, cols: number): Set<number> {
  const s = new Set<number>();
  for (let i = 0; i < rows * cols; i++) s.add(i);
  return s;
}

interface PlateLayoutProps {
  rows: number; cols: number; plateLabel: string;
  selected: Set<number>; onToggle: (idx: number) => void;
  onSelectAll: () => void; onClear: () => void; ready: boolean;
}

function PlateLayout({ rows, cols, plateLabel, selected, onToggle, onSelectAll, onClear, ready }: PlateLayoutProps) {
  const size = WELL_SIZE[plateLabel] ?? 22;
  const total = rows * cols;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Plate Layout</span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--accent)" }}>{selected.size} / {total} wells selected</span>
          <button onClick={onSelectAll} className="text-xs hover:opacity-70" style={{ color: "var(--accent)" }}>All</button>
          <button onClick={onClear} className="text-xs hover:opacity-70" style={{ color: "var(--text-muted)" }}>Clear</button>
        </div>
      </div>
      <div className="rounded-xl p-4 overflow-x-auto" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <div className="flex" style={{ marginLeft: size + 6 }}>
          {Array.from({ length: cols }, (_, c) => (
            <div key={c} className="flex items-center justify-center font-mono shrink-0"
              style={{ width: size, height: 16, fontSize: size > 28 ? 10 : 8, color: "var(--text-muted)" }}>
              {c + 1}
            </div>
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center">
            <div className="flex items-center justify-center font-mono shrink-0"
              style={{ width: size, height: size, fontSize: size > 28 ? 10 : 9, color: "var(--text-muted)", marginRight: 6 }}>
              {ROW_LABELS[r]}
            </div>
            {Array.from({ length: cols }, (_, c) => {
              const idx = r * cols + c;
              const isSelected = selected.has(idx);
              return (
                <button key={c} onClick={() => onToggle(idx)} title={`${ROW_LABELS[r]}${c + 1}`}
                  className="shrink-0 transition-all"
                  style={{
                    width: size, height: size, borderRadius: "50%",
                    margin: size > 28 ? 2 : 1.5,
                    background: isSelected ? (ready ? "var(--accent)" : "color-mix(in srgb, var(--accent) 60%, transparent)") : "var(--border)",
                    border: isSelected ? "none" : "1px solid var(--border)",
                    cursor: "pointer", opacity: isSelected ? 1 : 0.5,
                  }} />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--accent)" }} />Seeded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--border)", opacity: 0.5 }} />Skipped
        </span>
      </div>
    </div>
  );
}

export default function CellSeedingPage() {
  const [plateType, setPlateType] = useState("96-well");
  const [customWells, setCustomWells] = useState("6");
  const [volPerWell, setVolPerWell]   = useState("0.2");
  const [cellConc, setCellConc]       = useState("");
  const [targetCells, setTargetCells] = useState("");
  const [extra, setExtra]             = useState("10");

  const preset = PLATE_TYPES.find(p => p.label === plateType)!;
  const hasLayout = preset.rows !== null;
  const [selected, setSelected] = useState<Set<number>>(() => allSelected(8, 12));

  useEffect(() => {
    if (preset.rows !== null && preset.cols !== null) setSelected(allSelected(preset.rows, preset.cols));
  }, [plateType]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleWell = useCallback((idx: number) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(idx)) next.delete(idx); else next.add(idx); return next; });
  }, []);

  function applyPreset(label: string) {
    setPlateType(label);
    const p = PLATE_TYPES.find(p => p.label === label)!;
    if (p.volPerWell !== null) setVolPerWell(String(p.volPerWell));
  }

  const wellCount = hasLayout ? selected.size : parse(customWells);
  const volWell   = parse(volPerWell);
  const stockConc = parse(cellConc);
  const target    = parse(targetCells);
  const extraFrac = (parse(extra) || 0) / 100;
  const multiplier = wellCount * (1 + extraFrac);

  const cellVolPerWell  = isPos(stockConc) && isPos(target) ? target / stockConc : NaN;
  const mediaVolPerWell = isFinite(cellVolPerWell) && isPos(volWell) ? volWell - cellVolPerWell : NaN;
  const totalCellVol    = isFinite(cellVolPerWell) ? cellVolPerWell * multiplier : NaN;
  const totalMediaVol   = isFinite(mediaVolPerWell) ? mediaVolPerWell * multiplier : NaN;
  const totalMixVol     = isPos(volWell) ? volWell * multiplier : NaN;
  const dilutionRatio   = isFinite(cellVolPerWell) && isPos(volWell) ? volWell / cellVolPerWell : NaN;
  const warnCell        = isFinite(cellVolPerWell) && isPos(volWell) && cellVolPerWell > volWell
    ? "Cell stock volume exceeds well volume — stock concentration too low." : undefined;
  const ready = isFinite(cellVolPerWell) && isFinite(mediaVolPerWell) && mediaVolPerWell >= 0;

  function buildCopyText() {
    return [
      `Cell Seeding — ${plateType}, ${wellCount} wells, ${targetCells} cells/well`,
      `Stock: ${cellConc} cells/mL | Vol/well: ${volPerWell} mL | Extra: ${extra}%`,
      ``, `Per well:`,
      `  Cell stock: ${fmt(cellVolPerWell * 1000)} µL`,
      `  Media:      ${fmt((mediaVolPerWell > 0 ? mediaVolPerWell : 0) * 1000)} µL`,
      ``, `Whole plate (×${fmt(multiplier, 3)}):`,
      `  Cell stock: ${fmt(totalCellVol * 1000)} µL`,
      `  Media:      ${fmt(totalMediaVol * 1000)} µL`,
      `  Total mix:  ${fmt(totalMixVol * 1000)} µL`,
    ].join("\n");
  }

  return (
    <CalcLayout
      title="Mammalian Cell Seeding"
      description="Calculate cell and media volumes for any plate format."
      onReset={() => {
        setCellConc(""); setTargetCells(""); setExtra("10");
        if (preset.rows && preset.cols) setSelected(allSelected(preset.rows, preset.cols));
      }}
      copyText={ready ? buildCopyText() : undefined}
      tips={
        <div className="space-y-1.5">
          <p><strong>Cell stock vol / well</strong> = target cells / stock concentration</p>
          <p><strong>Media vol / well</strong> = total vol/well − cell stock vol</p>
          <p>Click individual wells on the plate diagram to include or exclude them.</p>
          <p><strong>Tip:</strong> Count cells just before seeding for accuracy.</p>
        </div>
      }
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Plate Format</label>
        <div className="flex flex-wrap gap-2">
          {PLATE_TYPES.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ background: plateType === p.label ? "var(--accent)" : "var(--bg)", color: plateType === p.label ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {hasLayout && preset.rows && preset.cols && (
        <PlateLayout
          rows={preset.rows} cols={preset.cols} plateLabel={plateType}
          selected={selected} onToggle={toggleWell}
          onSelectAll={() => setSelected(allSelected(preset.rows!, preset.cols!))}
          onClear={() => setSelected(new Set())}
          ready={ready}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!hasLayout && <InputField label="Number of wells" value={customWells} onChange={setCustomWells} placeholder="e.g. 6" />}
        <InputField label="Volume per well" value={volPerWell} onChange={setVolPerWell} unit="mL" placeholder="e.g. 0.2" />
        <InputField label="Overage (%)" value={extra} onChange={setExtra} unit="%" placeholder="10" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Stock cell concentration" value={cellConc} onChange={setCellConc} unit="cells/mL" placeholder="e.g. 5e5" />
        <InputField label="Target cells per well" value={targetCells} onChange={setTargetCells} unit="cells" placeholder="e.g. 1e4" />
      </div>

      <SectionDivider label="Per Well" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OutputField label="Cell stock volume" value={isFinite(cellVolPerWell) ? fmt(cellVolPerWell * 1000) : "—"}
          unit={isFinite(cellVolPerWell) ? "µL" : undefined} warning={warnCell} />
        <OutputField label="Media volume" value={isFinite(mediaVolPerWell) && mediaVolPerWell >= 0 ? fmt(mediaVolPerWell * 1000) : "—"}
          unit={isFinite(mediaVolPerWell) && mediaVolPerWell >= 0 ? "µL" : undefined} />
      </div>

      {isFinite(dilutionRatio) && (
        <div className="rounded-lg p-2.5 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Dilution in well</p>
          <p className="font-mono font-semibold text-sm" style={{ color: "var(--output-text)" }}>1 : {fmt(dilutionRatio, 3)}</p>
        </div>
      )}

      <SectionDivider label={`${wellCount} Wells Selected (×${fmt(multiplier, 3)} with overage)`} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <OutputField label="Cell stock (µL)" value={isFinite(totalCellVol) ? fmt(totalCellVol * 1000) : "—"}
          unit={isFinite(totalCellVol) ? "µL" : undefined} />
        <OutputField label="Media (µL)" value={isFinite(totalMediaVol) && totalMediaVol >= 0 ? fmt(totalMediaVol * 1000) : "—"}
          unit={isFinite(totalMediaVol) && totalMediaVol >= 0 ? "µL" : undefined} />
        <OutputField label="Total mix (µL)" value={isFinite(totalMixVol) ? fmt(totalMixVol * 1000) : "—"}
          unit={isFinite(totalMixVol) ? "µL" : undefined} />
      </div>
    </CalcLayout>
  );
}
