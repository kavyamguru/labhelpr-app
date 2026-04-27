"use client";
import { useState, useEffect, useCallback } from "react";
import {
  loadStore, saveStore, uid, today, fmtDate,
  type NotebookStore, type Experiment, type Sample,
  type Reagent, type LabTask,
  type ExpStatus, type Priority, type TaskStatus, type StorageTemp, type SampleType,
} from "@/lib/notebook/store";

// ── shared tiny components ───────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: color + "22", color, border: `1px solid ${color}44` }}>
      {label}
    </span>
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

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all";
const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" };

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={inputCls} style={inputStyle}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value} placeholder={placeholder} rows={rows}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} resize-none`} style={inputStyle}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── slide-up modal ───────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div
        className="w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5 space-y-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between sticky top-0 pb-2" style={{ background: "var(--bg-card)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveBtn({ onClick, label = "Save" }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="w-full py-3 rounded-xl text-sm font-semibold transition-colors" style={{ background: "var(--accent)", color: "#04070d" }}>
      {label}
    </button>
  );
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(240,100,90,0.1)", color: "#f06459", border: "1px solid rgba(240,100,90,0.2)" }}>
      Delete entry
    </button>
  );
}

// ── status/priority colours ───────────────────────────────────────────────────
const EXP_STATUS_COLOR: Record<ExpStatus, string> = {
  "planned": "#a6daff",
  "in-progress": "#f0a070",
  "completed": "#64dc82",
  "failed": "#f06459",
  "repeat": "#c4a0f0",
};

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "#a6daff",
  medium: "#f0a070",
  high: "#f06459",
};

const TASK_STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "#a6daff",
  "in-progress": "#f0a070",
  done: "#64dc82",
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPERIMENTS
// ══════════════════════════════════════════════════════════════════════════════
const COMMON_TAGS = ["PCR", "Western blot", "ELISA", "Flow cytometry", "Microscopy", "Cell culture", "qPCR", "Gel electrophoresis", "Cloning", "Transfection", "Immunostaining", "CRISPR", "Protein purification", "RNA-seq"];

function blankExp(): Experiment {
  return { id: uid(), title: "", date: today(), aim: "", protocol: "", observations: "", results: "", conclusion: "", status: "planned", tags: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function ExpForm({ initial, onSave, onDelete }: { initial: Experiment; onSave: (e: Experiment) => void; onDelete?: () => void }) {
  const [exp, setExp] = useState(initial);
  const set = (k: keyof Experiment, v: unknown) => setExp(p => ({ ...p, [k]: v }));

  function toggleTag(t: string) {
    setExp(p => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }));
  }

  return (
    <div className="space-y-4">
      <Field label="Experiment title"><Input value={exp.title} onChange={v => set("title", v)} placeholder="e.g. Knockdown efficiency of siRNA-X in HeLa" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Input type="date" value={exp.date} onChange={v => set("date", v)} /></Field>
        <Field label="Status">
          <Select value={exp.status} onChange={v => set("status", v as ExpStatus)} options={[
            { value: "planned", label: "Planned" }, { value: "in-progress", label: "In Progress" },
            { value: "completed", label: "Completed" }, { value: "failed", label: "Failed" }, { value: "repeat", label: "Repeat" },
          ]} />
        </Field>
      </div>
      <Field label="Aim / Hypothesis"><Textarea value={exp.aim} onChange={v => set("aim", v)} placeholder="What are you trying to show or test?" rows={2} /></Field>
      <Field label="Protocol / Conditions"><Textarea value={exp.protocol} onChange={v => set("protocol", v)} placeholder="Key steps, concentrations, incubation times, instruments used…" rows={3} /></Field>
      <Field label="Observations"><Textarea value={exp.observations} onChange={v => set("observations", v)} placeholder="What did you see? Band sizes, fluorescence, cell morphology…" rows={3} /></Field>
      <Field label="Results"><Textarea value={exp.results} onChange={v => set("results", v)} placeholder="Quantitative results, statistics, image descriptions…" rows={3} /></Field>
      <Field label="Conclusion / Next steps"><Textarea value={exp.conclusion} onChange={v => set("conclusion", v)} placeholder="What does this tell you? What to do next?" rows={2} /></Field>
      <Field label="Technique tags">
        <div className="flex flex-wrap gap-1.5 mt-1">
          {COMMON_TAGS.map(t => (
            <button key={t} onClick={() => toggleTag(t)}
              className="text-[11px] px-2.5 py-1 rounded-full transition-colors"
              style={{ background: exp.tags.includes(t) ? "rgba(166,218,255,0.15)" : "rgba(166,218,255,0.05)", color: exp.tags.includes(t) ? "#a6daff" : "rgba(166,218,255,0.4)", border: `1px solid ${exp.tags.includes(t) ? "rgba(166,218,255,0.3)" : "rgba(166,218,255,0.08)"}` }}>
              {t}
            </button>
          ))}
        </div>
      </Field>
      <SaveBtn onClick={() => onSave({ ...exp, updatedAt: new Date().toISOString() })} />
      {onDelete && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function ExperimentsTab({ store, setStore }: { store: NotebookStore; setStore: (s: NotebookStore) => void }) {
  const [modal, setModal] = useState<"new" | Experiment | null>(null);
  const [search, setSearch] = useState("");

  const filtered = store.experiments.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => b.date.localeCompare(a.date));

  function save(exp: Experiment) {
    const exists = store.experiments.find(e => e.id === exp.id);
    const next = exists
      ? store.experiments.map(e => e.id === exp.id ? exp : e)
      : [exp, ...store.experiments];
    setStore({ ...store, experiments: next });
    setModal(null);
  }

  function del(id: string) {
    setStore({ ...store, experiments: store.experiments.filter(e => e.id !== id) });
    setModal(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search experiments or techniques…"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <button onClick={() => setModal("new")} className="px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>+ New</button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">🧪</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No experiments yet</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Tap + New to log your first experiment</p>
        </div>
      )}

      {filtered.map(exp => (
        <button key={exp.id} onClick={() => setModal(exp)}
          className="w-full text-left rounded-2xl border p-4 space-y-2 transition-all active:scale-[0.98]"
          style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>{exp.title || "Untitled"}</p>
            <Badge label={exp.status.replace("-", " ")} color={EXP_STATUS_COLOR[exp.status]} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(exp.date)}</p>
          {exp.aim && <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{exp.aim}</p>}
          {exp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {exp.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(166,218,255,0.06)", color: "rgba(166,218,255,0.5)" }}>{t}</span>)}
            </div>
          )}
        </button>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "New Experiment" : "Edit Experiment"} onClose={() => setModal(null)}>
          <ExpForm
            initial={modal === "new" ? blankExp() : modal}
            onSave={save}
            onDelete={modal !== "new" ? () => del((modal as Experiment).id) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE BANK
// ══════════════════════════════════════════════════════════════════════════════
const SAMPLE_TYPES: SampleType[] = ["Cell line", "Primary cells", "Tissue", "DNA", "RNA", "Protein", "Plasmid", "Bacteria", "Virus", "Other"];

function blankSample(): Sample {
  return { id: uid(), name: "", type: "Cell line", organism: "", passage: "", concentration: "", volume: "", storageLocation: "", dateStored: today(), expiryDate: "", notes: "", createdAt: new Date().toISOString() };
}

function SampleForm({ initial, onSave, onDelete }: { initial: Sample; onSave: (s: Sample) => void; onDelete?: () => void }) {
  const [s, setS] = useState(initial);
  const set = (k: keyof Sample, v: string) => setS(p => ({ ...p, [k]: v }));
  const needsPassage = s.type === "Cell line" || s.type === "Primary cells" || s.type === "Bacteria";

  return (
    <div className="space-y-4">
      <Field label="Sample name / ID"><Input value={s.name} onChange={v => set("name", v)} placeholder="e.g. HeLa-GFP clone 3, pUC19-insert" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sample type">
          <Select value={s.type} onChange={v => set("type", v as SampleType)} options={SAMPLE_TYPES.map(t => ({ value: t, label: t }))} />
        </Field>
        <Field label="Organism / Source"><Input value={s.organism} onChange={v => set("organism", v)} placeholder="e.g. Human, Mouse, E. coli" /></Field>
      </div>
      {needsPassage && <Field label="Passage / Generation"><Input value={s.passage} onChange={v => set("passage", v)} placeholder="e.g. P12" /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Concentration"><Input value={s.concentration} onChange={v => set("concentration", v)} placeholder="e.g. 1×10⁶ cells/mL" /></Field>
        <Field label="Volume / Amount"><Input value={s.volume} onChange={v => set("volume", v)} placeholder="e.g. 500 µL, 1 mg" /></Field>
      </div>
      <Field label="Storage location"><Input value={s.storageLocation} onChange={v => set("storageLocation", v)} placeholder="e.g. -80°C Freezer 2, Box 4, Row A, Col 3" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date stored"><Input type="date" value={s.dateStored} onChange={v => set("dateStored", v)} /></Field>
        <Field label="Expiry date (optional)"><Input type="date" value={s.expiryDate} onChange={v => set("expiryDate", v)} /></Field>
      </div>
      <Field label="Notes"><Textarea value={s.notes} onChange={v => set("notes", v)} placeholder="Quality, viability %, origin, any concerns…" rows={2} /></Field>
      <SaveBtn onClick={() => onSave(s)} />
      {onDelete && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function SamplesTab({ store, setStore }: { store: NotebookStore; setStore: (s: NotebookStore) => void }) {
  const [modal, setModal] = useState<"new" | Sample | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");

  const filtered = store.samples.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.organism.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "All" || s.type === filterType;
    return matchSearch && matchType;
  }).sort((a, b) => b.dateStored.localeCompare(a.dateStored));

  function save(sample: Sample) {
    const exists = store.samples.find(s => s.id === sample.id);
    const next = exists ? store.samples.map(s => s.id === sample.id ? sample : s) : [sample, ...store.samples];
    setStore({ ...store, samples: next });
    setModal(null);
  }

  function del(id: string) {
    setStore({ ...store, samples: store.samples.filter(s => s.id !== id) });
    setModal(null);
  }

  const isExpired = (s: Sample) => s.expiryDate && s.expiryDate < today();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sample bank…"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <button onClick={() => setModal("new")} className="px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>+ Add</button>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {["All", ...SAMPLE_TYPES].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className="px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-colors"
            style={{ background: filterType === t ? "var(--accent)" : "rgba(166,218,255,0.06)", color: filterType === t ? "#04070d" : "rgba(166,218,255,0.5)" }}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">🧬</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No samples logged</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Tap + Add to register your first sample</p>
        </div>
      )}

      {filtered.map(s => (
        <button key={s.id} onClick={() => setModal(s)}
          className="w-full text-left rounded-2xl border p-4 space-y-1.5 transition-all active:scale-[0.98]"
          style={{ background: "var(--bg-card)", borderColor: isExpired(s) ? "rgba(240,100,90,0.3)" : "var(--border)" }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.name || "Unnamed sample"}</p>
            <Badge label={s.type} color="#a6daff" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {s.organism && <p className="text-xs" style={{ color: "var(--text-muted)" }}>🧫 {s.organism}{s.passage ? ` · P${s.passage}` : ""}</p>}
            {s.storageLocation && <p className="text-xs" style={{ color: "var(--text-muted)" }}>📍 {s.storageLocation}</p>}
          </div>
          {isExpired(s) && <p className="text-xs font-medium" style={{ color: "#f06459" }}>⚠ Expired {fmtDate(s.expiryDate)}</p>}
        </button>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "Register Sample" : "Edit Sample"} onClose={() => setModal(null)}>
          <SampleForm
            initial={modal === "new" ? blankSample() : modal}
            onSave={save}
            onDelete={modal !== "new" ? () => del((modal as Sample).id) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REAGENT STOCK
// ══════════════════════════════════════════════════════════════════════════════
const STORAGE_TEMPS: StorageTemp[] = ["-80°C", "-20°C", "4°C", "RT", "37°C"];

function blankReagent(): Reagent {
  return { id: uid(), name: "", catalogNumber: "", supplier: "", currentStock: "", unit: "", minStock: "", storageTemp: "4°C", location: "", expiryDate: "", lotNumber: "", notes: "", createdAt: new Date().toISOString() };
}

function ReagentForm({ initial, onSave, onDelete }: { initial: Reagent; onSave: (r: Reagent) => void; onDelete?: () => void }) {
  const [r, setR] = useState(initial);
  const set = (k: keyof Reagent, v: string) => setR(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <Field label="Reagent / Consumable name"><Input value={r.name} onChange={v => set("name", v)} placeholder="e.g. DAPI, Anti-β-actin antibody, PBS" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier"><Input value={r.supplier} onChange={v => set("supplier", v)} placeholder="e.g. Sigma, Thermo, Abcam" /></Field>
        <Field label="Catalogue #"><Input value={r.catalogNumber} onChange={v => set("catalogNumber", v)} placeholder="e.g. D9542" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lot number"><Input value={r.lotNumber} onChange={v => set("lotNumber", v)} placeholder="e.g. SLBX1234" /></Field>
        <Field label="Expiry date"><Input type="date" value={r.expiryDate} onChange={v => set("expiryDate", v)} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Current stock"><Input value={r.currentStock} onChange={v => set("currentStock", v)} placeholder="50" /></Field>
        <Field label="Unit"><Input value={r.unit} onChange={v => set("unit", v)} placeholder="mL, mg, units" /></Field>
        <Field label="Low stock alert"><Input value={r.minStock} onChange={v => set("minStock", v)} placeholder="10" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Storage temp">
          <Select value={r.storageTemp} onChange={v => set("storageTemp", v as StorageTemp)} options={STORAGE_TEMPS.map(t => ({ value: t, label: t }))} />
        </Field>
        <Field label="Location in lab"><Input value={r.location} onChange={v => set("location", v)} placeholder="e.g. Fridge 1, Shelf 3" /></Field>
      </div>
      <Field label="Notes"><Textarea value={r.notes} onChange={v => set("notes", v)} placeholder="Working dilution, reconstitution, handling notes…" rows={2} /></Field>
      <SaveBtn onClick={() => onSave(r)} />
      {onDelete && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function InventoryTab({ store, setStore }: { store: NotebookStore; setStore: (s: NotebookStore) => void }) {
  const [modal, setModal] = useState<"new" | Reagent | null>(null);
  const [search, setSearch] = useState("");

  const filtered = store.reagents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.supplier.toLowerCase().includes(search.toLowerCase())
  );

  function save(r: Reagent) {
    const exists = store.reagents.find(x => x.id === r.id);
    const next = exists ? store.reagents.map(x => x.id === r.id ? r : x) : [r, ...store.reagents];
    setStore({ ...store, reagents: next });
    setModal(null);
  }

  function del(id: string) {
    setStore({ ...store, reagents: store.reagents.filter(r => r.id !== id) });
    setModal(null);
  }

  const isLow = (r: Reagent) => r.minStock && r.currentStock && parseFloat(r.currentStock) <= parseFloat(r.minStock);
  const isExpired = (r: Reagent) => r.expiryDate && r.expiryDate < today();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reagents, antibodies, kits…"
          className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none" style={inputStyle} />
        <button onClick={() => setModal("new")} className="px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>+ Add</button>
      </div>

      {/* Low stock / expired alerts */}
      {store.reagents.some(r => isLow(r) || isExpired(r)) && (
        <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(240,100,90,0.07)", border: "1px solid rgba(240,100,90,0.2)" }}>
          <p className="text-xs font-semibold" style={{ color: "#f06459" }}>⚠ Attention needed</p>
          {store.reagents.filter(isExpired).map(r => <p key={r.id} className="text-xs" style={{ color: "#f06459" }}>{r.name} — expired {fmtDate(r.expiryDate)}</p>)}
          {store.reagents.filter(isLow).map(r => <p key={r.id} className="text-xs" style={{ color: "#f59e0b" }}>{r.name} — low stock ({r.currentStock} {r.unit} remaining)</p>)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">🧴</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No reagents logged</p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Track your antibodies, buffers, kits, and consumables</p>
        </div>
      )}

      {filtered.map(r => (
        <button key={r.id} onClick={() => setModal(r)}
          className="w-full text-left rounded-2xl border p-4 space-y-1.5 transition-all active:scale-[0.98]"
          style={{ background: "var(--bg-card)", borderColor: isExpired(r) ? "rgba(240,100,90,0.3)" : isLow(r) ? "rgba(245,158,11,0.3)" : "var(--border)" }}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.name || "Unnamed"}</p>
            <Badge label={r.storageTemp} color="#7dd3b4" />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {r.supplier && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.supplier}{r.catalogNumber ? ` · ${r.catalogNumber}` : ""}</p>}
            {r.currentStock && <p className="text-xs font-medium" style={{ color: isLow(r) ? "#f59e0b" : "var(--text-muted)" }}>Stock: {r.currentStock} {r.unit}</p>}
            {r.location && <p className="text-xs" style={{ color: "var(--text-muted)" }}>📍 {r.location}</p>}
          </div>
          {isExpired(r) && <p className="text-xs font-medium" style={{ color: "#f06459" }}>⚠ Expired {fmtDate(r.expiryDate)}</p>}
        </button>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "Add Reagent / Consumable" : "Edit Reagent"} onClose={() => setModal(null)}>
          <ReagentForm
            initial={modal === "new" ? blankReagent() : modal}
            onSave={save}
            onDelete={modal !== "new" ? () => del((modal as Reagent).id) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LAB TASKS
// ══════════════════════════════════════════════════════════════════════════════
function blankTask(): LabTask {
  return { id: uid(), title: "", dueDate: "", priority: "medium", status: "todo", notes: "", createdAt: new Date().toISOString() };
}

function TaskForm({ initial, onSave, onDelete }: { initial: LabTask; onSave: (t: LabTask) => void; onDelete?: () => void }) {
  const [t, setT] = useState(initial);
  const set = (k: keyof LabTask, v: string) => setT(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <Field label="Task"><Input value={t.title} onChange={v => set("title", v)} placeholder="e.g. Order anti-GAPDH antibody, Run western blot" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <Select value={t.priority} onChange={v => set("priority", v as Priority)} options={[
            { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" },
          ]} />
        </Field>
        <Field label="Status">
          <Select value={t.status} onChange={v => set("status", v as TaskStatus)} options={[
            { value: "todo", label: "To do" }, { value: "in-progress", label: "In progress" }, { value: "done", label: "Done" },
          ]} />
        </Field>
      </div>
      <Field label="Due date (optional)"><Input type="date" value={t.dueDate} onChange={v => set("dueDate", v)} /></Field>
      <Field label="Notes"><Textarea value={t.notes} onChange={v => set("notes", v)} placeholder="Extra details, linked experiment, reagents needed…" rows={2} /></Field>
      <SaveBtn onClick={() => onSave(t)} />
      {onDelete && <DeleteBtn onClick={onDelete} />}
    </div>
  );
}

function TasksTab({ store, setStore }: { store: NotebookStore; setStore: (s: NotebookStore) => void }) {
  const [modal, setModal] = useState<"new" | LabTask | null>(null);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  const filtered = store.tasks
    .filter(t => filter === "all" || t.status === filter)
    .sort((a, b) => {
      const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority] || (a.dueDate || "").localeCompare(b.dueDate || "");
    });

  function save(task: LabTask) {
    const exists = store.tasks.find(t => t.id === task.id);
    const next = exists ? store.tasks.map(t => t.id === task.id ? task : t) : [task, ...store.tasks];
    setStore({ ...store, tasks: next });
    setModal(null);
  }

  function del(id: string) {
    setStore({ ...store, tasks: store.tasks.filter(t => t.id !== id) });
    setModal(null);
  }

  function toggleDone(task: LabTask) {
    const next = task.status === "done" ? { ...task, status: "todo" as TaskStatus } : { ...task, status: "done" as TaskStatus };
    save(next);
  }

  const isOverdue = (t: LabTask) => t.dueDate && t.dueDate < today() && t.status !== "done";

  const counts = { todo: store.tasks.filter(t => t.status === "todo").length, "in-progress": store.tasks.filter(t => t.status === "in-progress").length, done: store.tasks.filter(t => t.status === "done").length };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {(["all", "todo", "in-progress", "done"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-colors"
              style={{ background: filter === s ? "var(--accent)" : "var(--bg-card)", color: filter === s ? "#04070d" : "var(--text-muted)", border: `1px solid ${filter === s ? "var(--accent)" : "var(--border)"}` }}>
              {s === "all" ? `All (${store.tasks.length})` : s === "todo" ? `To do (${counts.todo})` : s === "in-progress" ? `In progress (${counts["in-progress"]})` : `Done (${counts.done})`}
            </button>
          ))}
        </div>
        <button onClick={() => setModal("new")} className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>+ Add</button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">✅</p>
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {filter === "done" ? "No completed tasks" : "No tasks here"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>Keep track of what needs to be done in the lab</p>
        </div>
      )}

      {filtered.map(task => (
        <div key={task.id}
          className="rounded-2xl border p-4 flex items-start gap-3 transition-all"
          style={{ background: "var(--bg-card)", borderColor: isOverdue(task) ? "rgba(240,100,90,0.3)" : "var(--border)", opacity: task.status === "done" ? 0.6 : 1 }}>
          {/* Checkbox */}
          <button onClick={() => toggleDone(task)}
            className="mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
            style={{ borderColor: task.status === "done" ? "#64dc82" : "rgba(166,218,255,0.3)", background: task.status === "done" ? "#64dc8222" : "transparent" }}>
            {task.status === "done" && <span style={{ color: "#64dc82", fontSize: 10 }}>✓</span>}
          </button>

          {/* Content */}
          <button className="flex-1 text-left space-y-1" onClick={() => setModal(task)}>
            <p className="text-sm font-medium" style={{ color: "var(--text)", textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title || "Untitled task"}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={task.priority} color={PRIORITY_COLOR[task.priority]} />
              <Badge label={task.status.replace("-", " ")} color={TASK_STATUS_COLOR[task.status]} />
              {task.dueDate && <p className="text-xs" style={{ color: isOverdue(task) ? "#f06459" : "var(--text-muted)" }}>Due {fmtDate(task.dueDate)}{isOverdue(task) ? " — overdue" : ""}</p>}
            </div>
          </button>
        </div>
      ))}

      {modal && (
        <Modal title={modal === "new" ? "New Task" : "Edit Task"} onClose={() => setModal(null)}>
          <TaskForm
            initial={modal === "new" ? blankTask() : modal}
            onSave={save}
            onDelete={modal !== "new" ? () => del((modal as LabTask).id) : undefined}
          />
        </Modal>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
type Tab = "experiments" | "samples" | "inventory" | "tasks";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "experiments", label: "Experiments", icon: "🧪" },
  { id: "samples",     label: "Sample Bank", icon: "🧬" },
  { id: "inventory",   label: "Reagent Stock", icon: "🧴" },
  { id: "tasks",       label: "Lab Tasks", icon: "✅" },
];

export default function NotebookPage() {
  const [tab, setTab] = useState<Tab>("experiments");
  const [store, setStoreState] = useState<NotebookStore>({ experiments: [], samples: [], reagents: [], tasks: [] });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStoreState(loadStore());
    setHydrated(true);
  }, []);

  const setStore = useCallback((next: NotebookStore) => {
    setStoreState(next);
    saveStore(next);
  }, []);

  if (!hydrated) return null;

  const activeTab = TABS.find(t => t.id === tab)!;

  // counts for badges
  const counts: Record<Tab, number> = {
    experiments: store.experiments.length,
    samples: store.samples.length,
    inventory: store.reagents.length,
    tasks: store.tasks.filter(t => t.status !== "done").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="sticky top-[60px] z-30" style={{ background: "rgba(4,7,13,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>Lab Notebook</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>All data saved locally on this device</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-colors"
                style={{
                  background: tab === t.id ? "rgba(166,218,255,0.1)" : "transparent",
                  color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
                  border: `1px solid ${tab === t.id ? "rgba(166,218,255,0.2)" : "transparent"}`,
                }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {counts[t.id] > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: tab === t.id ? "rgba(166,218,255,0.15)" : "rgba(166,218,255,0.08)", color: tab === t.id ? "var(--accent)" : "rgba(166,218,255,0.4)" }}>
                    {counts[t.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {tab === "experiments" && <ExperimentsTab store={store} setStore={setStore} />}
        {tab === "samples"     && <SamplesTab store={store} setStore={setStore} />}
        {tab === "inventory"   && <InventoryTab store={store} setStore={setStore} />}
        {tab === "tasks"       && <TasksTab store={store} setStore={setStore} />}
      </div>
    </div>
  );
}
