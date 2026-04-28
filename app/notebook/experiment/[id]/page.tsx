"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  getExperiment,
  saveExperiment,
} from "@/lib/notebook/db";
import type {
  Experiment, ExpStatus, Block, ExperimentSection, BlockType, BlockData,
  ChecklistItem, SampleRow, ReagentRow, ThermocyclerStep, DeviationEntry,
  AntibodyRow, QPCRRow,
} from "@/lib/notebook/types";
import { uid, nowISO, todayISO } from "@/lib/notebook/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ExpStatus, string> = {
  DRAFT: "#a6daff",
  IN_PROGRESS: "#f0a070",
  COMPLETE: "#64dc82",
  FLAGGED: "#fbbf24",
};

const BLOCK_TYPE_OPTIONS: { type: BlockType; label: string; desc: string }[] = [
  { type: "text",           label: "Free notes",         desc: "Rich text notes" },
  { type: "checklist",      label: "Checklist",          desc: "Step-by-step checkbox list" },
  { type: "sample_table",   label: "Sample table",       desc: "Sample bank entries" },
  { type: "reagent_table",  label: "Reagent table",      desc: "Reagent master mix / stock list" },
  { type: "timer",          label: "Timer",              desc: "Incubation / reaction timer" },
  { type: "thermocycler",   label: "Thermocycler",       desc: "PCR / qPCR programme" },
  { type: "gel",            label: "Gel electrophoresis","desc": "Gel description and band pattern" },
  { type: "deviation",      label: "Protocol deviation", desc: "Record deviations from SOP" },
  { type: "results",        label: "Results",            desc: "Summary, quantitative data, interpretation" },
  { type: "cell_count",     label: "Cell count",         desc: "Viability and density record" },
  { type: "antibody",       label: "Antibody panel",     desc: "Primary/secondary antibody details" },
  { type: "qpcr",           label: "qPCR data",          desc: "Ct values and reference gene" },
];

// ─── Shared UI ────────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm outline-none";
const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle} />;
}
function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} placeholder={placeholder} rows={rows} onChange={e => onChange(e.target.value)} className={`${inputCls} resize-none`} style={inputStyle} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}
function Badge({ label, color }: { label: string; color: string }) {
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>{label}</span>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="w-full md:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between sticky top-0 pb-2 z-10" style={{ background: "var(--bg-card)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function AddRowBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
      + Add row
    </button>
  );
}

// ─── Block: text ──────────────────────────────────────────────────────────────
function TextBlock({ data, onChange }: { data: Extract<BlockData, { type: "text" }>; onChange: (d: BlockData) => void }) {
  return (
    <Textarea value={data.content} rows={5} placeholder="Free notes…"
      onChange={v => onChange({ ...data, content: v })} />
  );
}

// ─── Block: checklist ─────────────────────────────────────────────────────────
function ChecklistBlock({ data, onChange }: { data: Extract<BlockData, { type: "checklist" }>; onChange: (d: BlockData) => void }) {
  function toggle(id: string) {
    onChange({
      ...data,
      items: data.items.map(it => it.id === id ? { ...it, checked: !it.checked, checkedAt: !it.checked ? nowISO() : undefined } : it),
    });
  }
  function addItem() {
    const item: ChecklistItem = { id: uid(), label: "", checked: false, required: false };
    onChange({ ...data, items: [...data.items, item] });
  }
  function updateLabel(id: string, label: string) {
    onChange({ ...data, items: data.items.map(it => it.id === id ? { ...it, label } : it) });
  }

  return (
    <div className="space-y-2">
      {data.items.map(item => (
        <div key={item.id} className="flex items-start gap-2">
          <button onClick={() => toggle(item.id)}
            className="mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center"
            style={{ borderColor: item.checked ? "#64dc82" : "var(--border)", background: item.checked ? "#64dc82" : "transparent" }}>
            {item.checked && <span className="text-xs text-black">✓</span>}
          </button>
          <input value={item.label} onChange={e => updateLabel(item.id, e.target.value)}
            placeholder="Step description…"
            className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none"
            style={{ ...inputStyle, textDecoration: item.checked ? "line-through" : "none", opacity: item.checked ? 0.6 : 1 }} />
          {item.required && <span className="text-[10px] shrink-0 mt-1" style={{ color: "#f06459" }}>required</span>}
        </div>
      ))}
      <button onClick={addItem} className="text-sm py-2 px-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
        + Add item
      </button>
    </div>
  );
}

// ─── Block: sample_table ──────────────────────────────────────────────────────
function SampleTableBlock({ data, onChange }: { data: Extract<BlockData, { type: "sample_table" }>; onChange: (d: BlockData) => void }) {
  function update(id: string, f: Partial<SampleRow>) {
    onChange({ ...data, rows: data.rows.map(r => r.id === id ? { ...r, ...f } : r) });
  }
  function addRow() {
    onChange({ ...data, rows: [...data.rows, { id: uid(), name: "", type: "" }] });
  }
  const cols: (keyof SampleRow)[] = ["name", "type", "concentration", "volume", "passage", "notes"];
  const headers = ["Name", "Type", "Concentration", "Volume", "Passage", "Notes"];

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id}>
              {cols.map(col => (
                <td key={col} className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input value={row[col] ?? ""} onChange={e => update(row.id, { [col]: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[80px]"
                    style={inputStyle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <AddRowBtn onClick={addRow} />
    </div>
  );
}

// ─── Block: reagent_table ─────────────────────────────────────────────────────
function ReagentTableBlock({ data, onChange }: { data: Extract<BlockData, { type: "reagent_table" }>; onChange: (d: BlockData) => void }) {
  function update(id: string, f: Partial<ReagentRow>) {
    onChange({ ...data, rows: data.rows.map(r => r.id === id ? { ...r, ...f } : r) });
  }
  function addRow() {
    onChange({ ...data, rows: [...data.rows, { id: uid(), name: "" }] });
  }
  const cols: (keyof ReagentRow)[] = ["name", "supplier", "catalogueNumber", "lotNumber", "concentration", "volumeUsed", "unit"];
  const headers = ["Name", "Supplier", "Cat#", "Lot#", "Concentration", "Volume", "Unit"];

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id}>
              {cols.map(col => (
                <td key={col} className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input value={row[col] ?? ""} onChange={e => update(row.id, { [col]: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[80px]"
                    style={inputStyle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <AddRowBtn onClick={addRow} />
    </div>
  );
}

// ─── Block: timer ─────────────────────────────────────────────────────────────
function TimerBlock({ data, onChange }: { data: Extract<BlockData, { type: "timer" }>; onChange: (d: BlockData) => void }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (data.startedAt && !data.completedAt) {
      const s = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
      setElapsed(s);
      setRunning(true);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [data.startedAt, data.completedAt]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  function start() {
    setRunning(true);
    setElapsed(0);
    onChange({ ...data, startedAt: nowISO(), completedAt: undefined });
  }
  function stop() {
    setRunning(false);
    onChange({ ...data, completedAt: nowISO() });
  }

  const totalSecs = data.durationMin * 60;
  const pct = Math.min(100, totalSecs > 0 ? (elapsed / totalSecs) * 100 : 0);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input value={data.label} onChange={e => onChange({ ...data, label: e.target.value })}
          placeholder="Timer label…" className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <div className="flex items-center gap-1">
          <input type="number" value={data.durationMin} onChange={e => onChange({ ...data, durationMin: Number(e.target.value) })}
            className="w-16 rounded-xl px-2 py-2.5 text-sm outline-none text-center" style={inputStyle} min={0} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>min</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-2xl font-mono font-bold" style={{ color: running ? "var(--accent)" : "var(--text)" }}>
          {fmt(elapsed)}
        </div>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>/ {fmt(totalSecs)}</div>
        {!running ? (
          <button onClick={start} className="py-2 px-4 rounded-xl text-sm font-medium" style={{ background: "var(--accent)", color: "#04070d" }}>Start</button>
        ) : (
          <button onClick={stop} className="py-2 px-4 rounded-xl text-sm font-medium" style={{ background: "rgba(240,100,90,0.15)", color: "#f06459" }}>Stop</button>
        )}
      </div>
      {totalSecs > 0 && (
        <div className="rounded-full overflow-hidden h-2" style={{ background: "var(--border)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "#64dc82" : "var(--accent)" }} />
        </div>
      )}
    </div>
  );
}

// ─── Block: thermocycler ──────────────────────────────────────────────────────
function ThermocyclerBlock({ data, onChange }: { data: Extract<BlockData, { type: "thermocycler" }>; onChange: (d: BlockData) => void }) {
  function updateStep(id: string, f: Partial<ThermocyclerStep>) {
    onChange({ ...data, steps: data.steps.map(s => s.id === id ? { ...s, ...f } : s) });
  }
  function addStep() {
    onChange({ ...data, steps: [...data.steps, { id: uid(), label: "", temp: "", duration: "" }] });
  }

  return (
    <div className="space-y-2 overflow-x-auto">
      <input value={data.programName} onChange={e => onChange({ ...data, programName: e.target.value })}
        placeholder="Programme name…" className={inputCls} style={inputStyle} />
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Step", "Temp (°C)", "Duration", "Cycles"].map(h => (
              <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.steps.map(step => (
            <tr key={step.id}>
              <td className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <input value={step.label} onChange={e => updateStep(step.id, { label: e.target.value })} className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[100px]" style={inputStyle} placeholder="Denaturation…" />
              </td>
              <td className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <input value={step.temp} onChange={e => updateStep(step.id, { temp: e.target.value })} className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[70px]" style={inputStyle} placeholder="95°C" />
              </td>
              <td className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <input value={step.duration} onChange={e => updateStep(step.id, { duration: e.target.value })} className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[70px]" style={inputStyle} placeholder="30 s" />
              </td>
              <td className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                <input type="number" value={step.cycles ?? ""} onChange={e => updateStep(step.id, { cycles: e.target.value ? Number(e.target.value) : undefined })} className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[50px]" style={inputStyle} placeholder="35" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <AddRowBtn onClick={addStep} />
    </div>
  );
}

// ─── Block: gel ───────────────────────────────────────────────────────────────
function GelBlock({ data, onChange }: { data: Extract<BlockData, { type: "gel" }>; onChange: (d: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Description">
        <Textarea value={data.description} placeholder="e.g. 2% agarose, 100V, 30 min" rows={2} onChange={v => onChange({ ...data, description: v })} />
      </Field>
      <Field label="Band pattern">
        <Textarea value={data.bands} placeholder="Describe expected / observed bands…" rows={3} onChange={v => onChange({ ...data, bands: v })} />
      </Field>
      <Field label="Image note">
        <Input value={data.imageNote} placeholder="e.g. gel_20260427.tiff in /data/gels/" onChange={v => onChange({ ...data, imageNote: v })} />
      </Field>
    </div>
  );
}

// ─── Block: deviation ────────────────────────────────────────────────────────
function DeviationBlock({ data, onChange }: { data: Extract<BlockData, { type: "deviation" }>; onChange: (d: BlockData) => void }) {
  function addEntry() {
    const entry: DeviationEntry = { id: uid(), step: "", description: "", impact: "MEDIUM", action: "", recordedAt: nowISO() };
    onChange({ ...data, entries: [...data.entries, entry] });
  }
  function updateEntry(id: string, f: Partial<DeviationEntry>) {
    onChange({ ...data, entries: data.entries.map(e => e.id === id ? { ...e, ...f } : e) });
  }
  const impactColors = { LOW: "#a6daff", MEDIUM: "#f0a070", HIGH: "#f06459" };

  return (
    <div className="space-y-3">
      {data.entries.map(entry => (
        <div key={entry.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="flex gap-2 items-center">
            <input value={entry.step} onChange={e => updateEntry(entry.id, { step: e.target.value })}
              placeholder="Step / section" className="flex-1 rounded-lg px-2 py-1.5 text-sm outline-none" style={inputStyle} />
            <select value={entry.impact} onChange={e => updateEntry(entry.id, { impact: e.target.value as "LOW" | "MEDIUM" | "HIGH" })}
              className="rounded-lg px-2 py-1.5 text-xs outline-none" style={{ ...inputStyle, color: impactColors[entry.impact] }}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
          <Textarea value={entry.description} placeholder="Describe the deviation…" rows={2} onChange={v => updateEntry(entry.id, { description: v })} />
          <Textarea value={entry.action} placeholder="Corrective action taken…" rows={2} onChange={v => updateEntry(entry.id, { action: v })} />
        </div>
      ))}
      <button onClick={addEntry} className="w-full py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
        + Add deviation
      </button>
    </div>
  );
}

// ─── Block: results ───────────────────────────────────────────────────────────
function ResultsBlock({ data, onChange }: { data: Extract<BlockData, { type: "results" }>; onChange: (d: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Summary"><Textarea value={data.summary} placeholder="Brief summary of results…" rows={2} onChange={v => onChange({ ...data, summary: v })} /></Field>
      <Field label="Quantitative data"><Textarea value={data.quantitative} placeholder="Measurements, statistics…" rows={3} onChange={v => onChange({ ...data, quantitative: v })} /></Field>
      <Field label="Interpretation"><Textarea value={data.interpretation} placeholder="What do these results mean?" rows={3} onChange={v => onChange({ ...data, interpretation: v })} /></Field>
    </div>
  );
}

// ─── Block: cell_count ────────────────────────────────────────────────────────
function CellCountBlock({ data, onChange }: { data: Extract<BlockData, { type: "cell_count" }>; onChange: (d: BlockData) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cell line"><Input value={data.cellLine} placeholder="e.g. HEK293T" onChange={v => onChange({ ...data, cellLine: v })} /></Field>
        <Field label="Viability (%)"><Input value={data.viability} placeholder="e.g. 95" onChange={v => onChange({ ...data, viability: v })} /></Field>
        <Field label="Density"><Input value={data.density} placeholder="e.g. 1×10⁶/mL" onChange={v => onChange({ ...data, density: v })} /></Field>
        <Field label="Method"><Input value={data.method} placeholder="e.g. Trypan blue" onChange={v => onChange({ ...data, method: v })} /></Field>
      </div>
      <Field label="Notes"><Textarea value={data.notes} placeholder="Additional observations…" rows={2} onChange={v => onChange({ ...data, notes: v })} /></Field>
    </div>
  );
}

// ─── Block: antibody ─────────────────────────────────────────────────────────
function AntibodyBlock({ data, onChange }: { data: Extract<BlockData, { type: "antibody" }>; onChange: (d: BlockData) => void }) {
  function update(id: string, f: Partial<AntibodyRow>) {
    onChange({ ...data, rows: data.rows.map(r => r.id === id ? { ...r, ...f } : r) });
  }
  function addRow() {
    onChange({ ...data, rows: [...data.rows, { id: uid(), name: "", target: "", host: "", dilution: "" }] });
  }
  const cols: (keyof AntibodyRow)[] = ["name", "target", "host", "dilution", "incubation", "supplier", "catalogueNumber"];
  const headers = ["Name", "Target", "Host", "Dilution", "Incubation", "Supplier", "Cat#"];

  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id}>
              {cols.map(col => (
                <td key={col} className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input value={row[col] ?? ""} onChange={e => update(row.id, { [col]: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[80px]" style={inputStyle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <AddRowBtn onClick={addRow} />
    </div>
  );
}

// ─── Block: qpcr ──────────────────────────────────────────────────────────────
function QPCRBlock({ data, onChange }: { data: Extract<BlockData, { type: "qpcr" }>; onChange: (d: BlockData) => void }) {
  function update(id: string, f: Partial<QPCRRow>) {
    onChange({ ...data, rows: data.rows.map(r => r.id === id ? { ...r, ...f } : r) });
  }
  function addRow() {
    onChange({ ...data, rows: [...data.rows, { id: uid(), gene: "", ct: "" }] });
  }
  const cols: (keyof QPCRRow)[] = ["gene", "ct", "efficiency", "notes"];
  const headers = ["Gene", "Ct value", "Efficiency (%)", "Notes"];

  return (
    <div className="space-y-3">
      <Field label="Reference gene">
        <Input value={data.referenceGene} placeholder="e.g. GAPDH / β-actin" onChange={v => onChange({ ...data, referenceGene: v })} />
      </Field>
      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>{headers.map(h => <th key={h} className="px-2 py-1.5 text-left font-medium" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.rows.map(row => (
            <tr key={row.id}>
              {cols.map(col => (
                <td key={col} className="px-1 py-1" style={{ borderBottom: "1px solid var(--border)" }}>
                  <input value={row[col] ?? ""} onChange={e => update(row.id, { [col]: e.target.value })}
                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none min-w-[80px]" style={inputStyle} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <AddRowBtn onClick={addRow} />
    </div>
  );
}

// ─── Block Renderer ───────────────────────────────────────────────────────────
function BlockRenderer({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  function handleData(d: BlockData) {
    onChange({ ...block, data: d });
  }

  switch (block.data.type) {
    case "text":          return <TextBlock data={block.data} onChange={handleData} />;
    case "checklist":     return <ChecklistBlock data={block.data} onChange={handleData} />;
    case "sample_table":  return <SampleTableBlock data={block.data} onChange={handleData} />;
    case "reagent_table": return <ReagentTableBlock data={block.data} onChange={handleData} />;
    case "timer":         return <TimerBlock data={block.data} onChange={handleData} />;
    case "thermocycler":  return <ThermocyclerBlock data={block.data} onChange={handleData} />;
    case "gel":           return <GelBlock data={block.data} onChange={handleData} />;
    case "deviation":     return <DeviationBlock data={block.data} onChange={handleData} />;
    case "results":       return <ResultsBlock data={block.data} onChange={handleData} />;
    case "cell_count":    return <CellCountBlock data={block.data} onChange={handleData} />;
    case "antibody":      return <AntibodyBlock data={block.data} onChange={handleData} />;
    case "qpcr":          return <QPCRBlock data={block.data} onChange={handleData} />;
    default:              return <div className="text-xs" style={{ color: "var(--text-muted)" }}>Unknown block type</div>;
  }
}

// ─── Block type picker modal ──────────────────────────────────────────────────
function AddBlockModal({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  return (
    <Modal title="Add block" onClose={onClose}>
      <div className="space-y-2">
        {BLOCK_TYPE_OPTIONS.map(opt => (
          <button key={opt.type} onClick={() => onAdd(opt.type)}
            className="w-full text-left rounded-xl px-4 py-3 flex items-start gap-3"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{opt.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Add section modal ────────────────────────────────────────────────────────
function AddSectionModal({ onAdd, onClose }: { onAdd: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  return (
    <Modal title="New section" onClose={onClose}>
      <Field label="Section title"><Input value={title} onChange={setTitle} placeholder="e.g. Sample preparation" /></Field>
      <button onClick={() => title.trim() && onAdd(title.trim())} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#04070d" }}>
        Add section
      </button>
    </Modal>
  );
}

// ─── Reproducibility score ────────────────────────────────────────────────────
function ReproScore({ score }: { score: number }) {
  const color = score >= 70 ? "#64dc82" : score >= 40 ? "#f0a070" : "#f06459";
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Reproducibility score</span>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
      <div className="rounded-full overflow-hidden h-2" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

// ─── Default block data ───────────────────────────────────────────────────────
function defaultBlockData(type: BlockType): BlockData {
  switch (type) {
    case "text":          return { type: "text", content: "" };
    case "checklist":     return { type: "checklist", title: "Checklist", items: [] };
    case "sample_table":  return { type: "sample_table", title: "Samples", rows: [] };
    case "reagent_table": return { type: "reagent_table", title: "Reagents", rows: [] };
    case "timer":         return { type: "timer", label: "Incubation", durationMin: 30 };
    case "thermocycler":  return { type: "thermocycler", programName: "Programme", steps: [] };
    case "gel":           return { type: "gel", description: "", bands: "", imageNote: "" };
    case "deviation":     return { type: "deviation", entries: [] };
    case "results":       return { type: "results", summary: "", quantitative: "", interpretation: "" };
    case "cell_count":    return { type: "cell_count", cellLine: "", viability: "", density: "", method: "", notes: "" };
    case "antibody":      return { type: "antibody", title: "Antibody panel", rows: [] };
    case "qpcr":          return { type: "qpcr", referenceGene: "GAPDH", rows: [] };
  }
}

// ─── Compute reproducibility score ───────────────────────────────────────────
function computeReproScore(exp: Experiment): number {
  let required = 0;
  let completed = 0;
  for (const sec of exp.sections) {
    for (const block of sec.blocks) {
      if (block.data.type === "checklist") {
        const items = block.data.items.filter(i => i.required);
        required += items.length;
        completed += items.filter(i => i.checked).length;
      } else {
        required += 1;
        // Consider non-empty content as completed
        const d = block.data;
        let filled = false;
        if (d.type === "text") filled = d.content.trim().length > 0;
        else if (d.type === "results") filled = d.summary.trim().length > 0;
        else if (d.type === "sample_table" || d.type === "reagent_table") filled = d.rows.length > 0;
        else if (d.type === "thermocycler") filled = d.steps.length > 0;
        else if (d.type === "deviation") filled = d.entries.length > 0;
        else if (d.type === "qpcr") filled = d.rows.length > 0;
        else if (d.type === "antibody") filled = d.rows.length > 0;
        else if (d.type === "cell_count") filled = d.cellLine.trim().length > 0;
        else if (d.type === "gel") filled = d.description.trim().length > 0;
        else if (d.type === "timer") filled = !!d.completedAt;
        if (filled) completed += 1;
      }
    }
  }
  return required === 0 ? 0 : Math.round((completed / required) * 100);
}

// ─── Experiment Detail Page ───────────────────────────────────────────────────
export default function ExperimentPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [exp, setExp] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingBlockToSec, setAddingBlockToSec] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingObjective, setEditingObjective] = useState(false);
  const [editingHypothesis, setEditingHypothesis] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    getExperiment(id).then(e => {
      setExp(e ?? null);
      setLoading(false);
    });
  }, [id]);

  const autoSave = useCallback(async (updated: Experiment) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const score = computeReproScore(updated);
      const withScore = { ...updated, reproducibilityScore: score };
      await saveExperiment(withScore);
    }, 400);
  }, []);

  function update(partial: Partial<Experiment>) {
    if (!exp) return;
    const updated = { ...exp, ...partial };
    setExp(updated);
    autoSave(updated);
  }

  function updateSection(secId: string, partialSec: Partial<ExperimentSection>) {
    if (!exp) return;
    const sections = exp.sections.map(s => s.id === secId ? { ...s, ...partialSec } : s);
    update({ sections });
  }

  function updateBlock(secId: string, block: Block) {
    if (!exp) return;
    const sections = exp.sections.map(s => s.id === secId
      ? { ...s, blocks: s.blocks.map(b => b.id === block.id ? block : b) }
      : s
    );
    update({ sections });
  }

  function addBlock(secId: string, type: BlockType) {
    if (!exp) return;
    const newBlock: Block = { id: uid(), type, data: defaultBlockData(type), order: 999 };
    const sections = exp.sections.map(s => s.id === secId
      ? { ...s, blocks: [...s.blocks, newBlock] }
      : s
    );
    update({ sections });
    setAddingBlockToSec(null);
  }

  function addSection(title: string) {
    if (!exp) return;
    const newSec: ExperimentSection = { id: uid(), title, order: exp.sections.length, blocks: [] };
    update({ sections: [...exp.sections, newSec] });
    setAddingSection(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--bg)", color: "var(--text-muted)" }}>
        <div className="text-sm">Loading experiment…</div>
      </div>
    );
  }
  if (!exp) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Experiment not found.</div>
        <button onClick={() => router.push("/notebook")} className="py-3 px-5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#04070d" }}>
          Back to notebook
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3" style={{ background: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => router.push("/notebook")} className="w-9 h-9 flex items-center justify-center rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text)" }}>
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{exp.uniqueCode}</span>
            <select
              value={exp.status}
              onChange={e => update({ status: e.target.value as ExpStatus })}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full outline-none border"
              style={{
                background: STATUS_COLOR[exp.status] + "22",
                color: STATUS_COLOR[exp.status],
                borderColor: STATUS_COLOR[exp.status] + "44",
              }}
            >
              {(["DRAFT", "IN_PROGRESS", "COMPLETE", "FLAGGED"] as ExpStatus[]).map(s => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5 max-w-2xl mx-auto">
        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={exp.title}
            onChange={e => update({ title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            className="w-full text-xl font-bold rounded-xl px-3 py-2.5 outline-none"
            style={{ ...inputStyle, fontSize: "1.25rem" }}
          />
        ) : (
          <h1 onClick={() => setEditingTitle(true)} className="text-xl font-bold cursor-text" style={{ color: "var(--text)" }}>{exp.title}</h1>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {exp.tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-dim)" }}>{t}</span>
          ))}
        </div>

        {/* Reproducibility score */}
        <ReproScore score={exp.reproducibilityScore} />

        {/* Objective */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Objective</div>
          {editingObjective ? (
            <textarea
              autoFocus rows={3}
              value={exp.objective}
              onChange={e => update({ objective: e.target.value })}
              onBlur={() => setEditingObjective(false)}
              className={`${inputCls} resize-none`} style={inputStyle}
            />
          ) : (
            <p onClick={() => setEditingObjective(true)} className="text-sm cursor-text" style={{ color: exp.objective ? "var(--text)" : "var(--text-muted)" }}>
              {exp.objective || "Tap to add objective…"}
            </p>
          )}
        </div>

        {/* Hypothesis */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Hypothesis</div>
          {editingHypothesis ? (
            <textarea
              autoFocus rows={3}
              value={exp.hypothesis}
              onChange={e => update({ hypothesis: e.target.value })}
              onBlur={() => setEditingHypothesis(false)}
              className={`${inputCls} resize-none`} style={inputStyle}
            />
          ) : (
            <p onClick={() => setEditingHypothesis(true)} className="text-sm cursor-text" style={{ color: exp.hypothesis ? "var(--text)" : "var(--text-muted)" }}>
              {exp.hypothesis || "Tap to add hypothesis…"}
            </p>
          )}
        </div>

        {/* Sections */}
        {exp.sections.map(sec => (
          <div key={sec.id} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <input
                value={sec.title}
                onChange={e => updateSection(sec.id, { title: e.target.value })}
                className="text-base font-semibold flex-1 rounded-lg px-2 py-1 outline-none"
                style={{ background: "transparent", color: "var(--text)", border: "none" }}
              />
              <button
                onClick={() => setAddingBlockToSec(sec.id)}
                className="shrink-0 py-1.5 px-3 rounded-lg text-xs font-medium"
                style={{ background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
              >
                + Block
              </button>
            </div>

            {/* Blocks */}
            {sec.blocks.map(block => (
              <div key={block.id} className="rounded-2xl p-4 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {BLOCK_TYPE_OPTIONS.find(o => o.type === block.type)?.label ?? block.type}
                </div>
                <BlockRenderer block={block} onChange={b => updateBlock(sec.id, b)} />
              </div>
            ))}

            {sec.blocks.length === 0 && (
              <button
                onClick={() => setAddingBlockToSec(sec.id)}
                className="w-full py-3 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}
              >
                + Add first block
              </button>
            )}
          </div>
        ))}

        {/* Add section */}
        <button
          onClick={() => setAddingSection(true)}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px dashed var(--border)" }}
        >
          + Add section
        </button>
      </div>

      {/* Modals */}
      {addingBlockToSec && (
        <AddBlockModal
          onAdd={(type) => addBlock(addingBlockToSec, type)}
          onClose={() => setAddingBlockToSec(null)}
        />
      )}
      {addingSection && (
        <AddSectionModal
          onAdd={addSection}
          onClose={() => setAddingSection(false)}
        />
      )}
    </div>
  );
}
