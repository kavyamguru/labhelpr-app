"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getExperiments, saveExperiment, createExperiment, deleteExperiment,
  getSamples, saveSample, deleteSample,
  getReagents, saveReagent, deleteReagent,
  getInstruments, saveInstrument, deleteInstrument,
  getReferences, saveReference, deleteReference, lookupDOI, lookupPMID,
  getTasks, saveTask, deleteTask,
  getTemplates, seedTemplates,
  searchAll,
} from "@/lib/notebook/db";
import { BUILT_IN_TEMPLATES } from "@/lib/notebook/templates";
import type {
  Experiment, Sample, Reagent, Instrument, Reference, LabTask, Template,
  ExpStatus, TaskPriority, SampleType, StorageTemp, RefType, EquipmentBooking,
} from "@/lib/notebook/types";
import { uid, nowISO, todayISO } from "@/lib/notebook/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<ExpStatus, string> = {
  DRAFT: "#a6daff",
  IN_PROGRESS: "#f0a070",
  COMPLETE: "#64dc82",
  FLAGGED: "#fbbf24",
};
const PRIORITY_COLOR: Record<TaskPriority, string> = {
  LOW: "#a6daff",
  MEDIUM: "#f0a070",
  HIGH: "#f06459",
};
const STORAGE_TEMPS: StorageTemp[] = ["-80°C", "-20°C", "4°C", "RT", "37°C"];
const SAMPLE_TYPES: SampleType[] = ["Cell line", "Primary cells", "Tissue", "DNA", "RNA", "Protein", "Plasmid", "Bacteria", "Virus", "Other"];
const REF_TYPES: RefType[] = ["PAPER", "SOP", "KIT_MANUAL", "PROTOCOL", "BOOK"];

const TABS = [
  { id: "home",        label: "🏠 Home" },
  { id: "experiments", label: "🧪 Experiments" },
  { id: "protocols",   label: "📋 Protocols" },
  { id: "samples",     label: "🧬 Samples" },
  { id: "reagents",    label: "🧴 Reagents" },
  { id: "equipment",   label: "⚙️ Equipment" },
  { id: "references",  label: "📚 References" },
  { id: "tasks",       label: "✅ Tasks" },
  { id: "calendar",   label: "📅 Calendar" },
  { id: "search",     label: "🔍 Search" },
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
function Card({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl p-4 space-y-2${onClick ? " cursor-pointer active:opacity-80" : ""}`} style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}
function PrimaryBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="py-3 px-5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#04070d" }}>{children}</button>;
}
function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className="py-3 px-4 rounded-xl text-sm font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>{children}</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="w-full md:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl md:rounded-2xl p-5 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between sticky top-0 pb-2 z-10" style={{ background: "var(--bg-card)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-sm" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SaveBtn({ onClick, label = "Save" }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="w-full py-3 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "#04070d" }}>{label}</button>;
}
function DeleteBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="w-full py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(240,100,90,0.1)", color: "#f06459", border: "1px solid rgba(240,100,90,0.2)" }}>Delete entry</button>;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Tab: Home ────────────────────────────────────────────────────────────────
function HomeTab({ experiments, tasks, onTab, onNewExp, onNewTask }: {
  experiments: Experiment[];
  tasks: LabTask[];
  onTab: (t: string) => void;
  onNewExp: () => void;
  onNewTask: () => void;
}) {
  const activeCount = experiments.filter(e => e.status === "IN_PROGRESS").length;
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const dueSoon = tasks.filter(t => !t.completed && new Date(t.dueAt).getTime() - now < sevenDays && new Date(t.dueAt).getTime() > now);
  const pendingCount = tasks.filter(t => !t.completed).length;
  const recent = [...experiments].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <div className="space-y-5 pb-10">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Active experiments", value: activeCount, color: "#f0a070" },
          { label: "Pending tasks", value: pendingCount, color: "#a6daff" },
          { label: "Running timers", value: 0, color: "#64dc82" },
          { label: "Total experiments", value: experiments.length, color: "var(--text-muted)" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <PrimaryBtn onClick={onNewExp}>New experiment</PrimaryBtn>
        <GhostBtn onClick={onNewTask}>New task</GhostBtn>
      </div>

      {/* Recent experiments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Recent experiments</h2>
          <button className="text-xs" style={{ color: "var(--accent)" }} onClick={() => onTab("experiments")}>View all</button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No experiments yet. Create your first one!</p>
        ) : (
          <div className="space-y-2">
            {recent.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-3 gap-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{e.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{e.uniqueCode} · {fmtDate(e.updatedAt)}</div>
                </div>
                <Badge label={e.status} color={STATUS_COLOR[e.status]} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tasks due soon */}
      {dueSoon.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Due within 7 days</h2>
            <button className="text-xs" style={{ color: "var(--accent)" }} onClick={() => onTab("tasks")}>View all</button>
          </div>
          <div className="space-y-2">
            {dueSoon.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-xl px-3 py-3 gap-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{t.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Due {fmtDate(t.dueAt)}</div>
                </div>
                <Badge label={t.priority} color={PRIORITY_COLOR[t.priority]} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Experiments ────────────────────────────────────────────────────────
function ExperimentsTab({ experiments, onNew, onNavigate }: {
  experiments: Experiment[];
  onNew: () => void;
  onNavigate: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | ExpStatus>("ALL");
  const filtered = experiments.filter(e => {
    const matchStatus = filter === "ALL" || e.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || e.uniqueCode.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q));
    return matchStatus && matchSearch;
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search experiments…" className={`${inputCls} flex-1`} style={inputStyle} />
        <PrimaryBtn onClick={onNew}>New</PrimaryBtn>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", "DRAFT", "IN_PROGRESS", "COMPLETE", "FLAGGED"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium transition-all"
            style={{ background: filter === s ? "var(--accent)" : "var(--bg-card)", color: filter === s ? "#04070d" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No experiments found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => (
            <Card key={e.id} onClick={() => onNavigate(e.id)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{e.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{e.uniqueCode}</div>
                </div>
                <Badge label={e.status} color={STATUS_COLOR[e.status]} />
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtDate(e.updatedAt)}</div>
              {e.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {e.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-dim)" }}>{t}</span>)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Protocols ───────────────────────────────────────────────────────────
function ProtocolsTab({ templates, onUse }: { templates: Template[]; onUse: (t: Template) => void }) {
  type Cat = "ALL" | Template["category"];
  const [filter, setFilter] = useState<Cat>("ALL");
  const cats: { value: Cat; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "NUCLEIC_ACIDS", label: "Nucleic Acids" },
    { value: "PROTEIN", label: "Protein" },
    { value: "CELL_WORK", label: "Cell Work" },
    { value: "IMMUNOASSAY", label: "Immunoassays" },
    { value: "IN_VIVO", label: "In Vivo" },
    { value: "OTHER", label: "Other" },
  ];
  const filtered = templates.filter(t => filter === "ALL" || t.category === filter);
  const diffColor = { beginner: "#64dc82", intermediate: "#f0a070", advanced: "#f06459" };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {cats.map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)} className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: filter === c.value ? "var(--accent)" : "var(--bg-card)", color: filter === c.value ? "#04070d" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map(t => (
          <Card key={t.id}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.name}</span>
                  <Badge label={t.difficulty} color={diffColor[t.difficulty]} />
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t.description}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>Est. {t.estimatedTime}</div>
              </div>
            </div>
            <button onClick={() => onUse(t)} className="w-full py-2.5 rounded-xl text-sm font-medium mt-1" style={{ background: "rgba(166,218,255,0.1)", color: "var(--accent)", border: "1px solid rgba(166,218,255,0.2)" }}>
              Use template
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Samples ─────────────────────────────────────────────────────────────
function SamplesTab({ samples, onSave, onDelete }: { samples: Sample[]; onSave: (s: Sample) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState<Sample | null>(null);
  const blank = (): Sample => ({
    id: uid(), name: "", type: "Cell line", organism: "", passage: "",
    concentration: "", volume: "", storageLocation: "", dateStored: todayISO(),
    expiryDate: "", notes: "", createdAt: nowISO(),
  });

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Sample bank ({samples.length})</h2>
        <PrimaryBtn onClick={() => setEditing(blank())}>Add sample</PrimaryBtn>
      </div>
      {samples.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No samples stored yet.</p>
      ) : (
        <div className="space-y-3">
          {samples.map(s => (
            <Card key={s.id} onClick={() => setEditing(s)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{s.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.type} · {s.organism}</div>
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--text-dim)" }}>P{s.passage}</span>
              </div>
              <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                {s.concentration && <span>{s.concentration}</span>}
                {s.volume && <span>{s.volume}</span>}
                {s.storageLocation && <span>📍 {s.storageLocation}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <SampleModal
          sample={editing}
          onChange={setEditing}
          onSave={() => { onSave(editing); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SampleModal({ sample, onChange, onSave, onDelete, onClose }: {
  sample: Sample; onChange: (s: Sample) => void;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const u = (f: Partial<Sample>) => onChange({ ...sample, ...f });
  return (
    <Modal title={sample.createdAt === sample.createdAt ? "Sample" : "Edit sample"} onClose={onClose}>
      <Field label="Name"><Input value={sample.name} onChange={v => u({ name: v })} placeholder="e.g. HeLa P12" /></Field>
      <Field label="Type"><Select value={sample.type} onChange={v => u({ type: v as SampleType })} options={SAMPLE_TYPES.map(t => ({ value: t, label: t }))} /></Field>
      <Field label="Organism"><Input value={sample.organism} onChange={v => u({ organism: v })} placeholder="e.g. Homo sapiens" /></Field>
      <Field label="Passage number"><Input value={sample.passage} onChange={v => u({ passage: v })} placeholder="e.g. 12" /></Field>
      <Field label="Concentration"><Input value={sample.concentration} onChange={v => u({ concentration: v })} placeholder="e.g. 1×10⁶/mL" /></Field>
      <Field label="Volume"><Input value={sample.volume} onChange={v => u({ volume: v })} placeholder="e.g. 1 mL" /></Field>
      <Field label="Storage location"><Input value={sample.storageLocation} onChange={v => u({ storageLocation: v })} placeholder="e.g. -80°C Freezer A, Box 3" /></Field>
      <Field label="Date stored"><Input type="date" value={sample.dateStored} onChange={v => u({ dateStored: v })} /></Field>
      <Field label="Expiry date"><Input type="date" value={sample.expiryDate} onChange={v => u({ expiryDate: v })} /></Field>
      <Field label="Notes"><Textarea value={sample.notes} onChange={v => u({ notes: v })} placeholder="Any special handling notes…" /></Field>
      <SaveBtn onClick={onSave} />
      <DeleteBtn onClick={onDelete} />
    </Modal>
  );
}

// ─── Tab: Reagents ────────────────────────────────────────────────────────────
function ReagentsTab({ reagents, onSave, onDelete }: { reagents: Reagent[]; onSave: (r: Reagent) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState<Reagent | null>(null);
  const blank = (): Reagent => ({
    id: uid(), name: "", catalogNumber: "", supplier: "", lotNumber: "",
    currentStock: "", unit: "", minStock: "", storageTemp: "4°C",
    location: "", expiryDate: "", notes: "", createdAt: nowISO(),
  });

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Reagent stock ({reagents.length})</h2>
        <PrimaryBtn onClick={() => setEditing(blank())}>Add reagent</PrimaryBtn>
      </div>
      {reagents.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reagents logged yet.</p>
      ) : (
        <div className="space-y-3">
          {reagents.map(r => {
            const low = r.minStock && parseFloat(r.currentStock) < parseFloat(r.minStock);
            return (
              <Card key={r.id} onClick={() => setEditing(r)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.supplier} {r.catalogNumber && `· ${r.catalogNumber}`}</div>
                  </div>
                  {low && <Badge label="LOW STOCK" color="#f06459" />}
                </div>
                <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>Stock: {r.currentStock} {r.unit}</span>
                  <span>{r.storageTemp}</span>
                  {r.location && <span>📍 {r.location}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {editing && (
        <ReagentModal
          reagent={editing}
          onChange={setEditing}
          onSave={() => { onSave(editing); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ReagentModal({ reagent, onChange, onSave, onDelete, onClose }: {
  reagent: Reagent; onChange: (r: Reagent) => void;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const u = (f: Partial<Reagent>) => onChange({ ...reagent, ...f });
  return (
    <Modal title="Reagent" onClose={onClose}>
      <Field label="Name"><Input value={reagent.name} onChange={v => u({ name: v })} placeholder="e.g. PBS 10×" /></Field>
      <Field label="Supplier"><Input value={reagent.supplier} onChange={v => u({ supplier: v })} placeholder="e.g. Sigma-Aldrich" /></Field>
      <Field label="Catalogue number"><Input value={reagent.catalogNumber} onChange={v => u({ catalogNumber: v })} /></Field>
      <Field label="Lot number"><Input value={reagent.lotNumber} onChange={v => u({ lotNumber: v })} /></Field>
      <Field label="Current stock"><Input value={reagent.currentStock} onChange={v => u({ currentStock: v })} placeholder="e.g. 500" /></Field>
      <Field label="Unit"><Input value={reagent.unit} onChange={v => u({ unit: v })} placeholder="e.g. mL" /></Field>
      <Field label="Min stock alert"><Input value={reagent.minStock} onChange={v => u({ minStock: v })} placeholder="e.g. 50" /></Field>
      <Field label="Storage temp"><Select value={reagent.storageTemp} onChange={v => u({ storageTemp: v as StorageTemp })} options={STORAGE_TEMPS.map(t => ({ value: t, label: t }))} /></Field>
      <Field label="Location"><Input value={reagent.location} onChange={v => u({ location: v })} placeholder="e.g. Cold room shelf 2" /></Field>
      <Field label="Expiry date"><Input type="date" value={reagent.expiryDate} onChange={v => u({ expiryDate: v })} /></Field>
      <Field label="Notes"><Textarea value={reagent.notes} onChange={v => u({ notes: v })} /></Field>
      <SaveBtn onClick={onSave} />
      <DeleteBtn onClick={onDelete} />
    </Modal>
  );
}

// ─── Tab: Equipment ───────────────────────────────────────────────────────────
function EquipmentTab({ instruments, onSave, onDelete }: { instruments: Instrument[]; onSave: (i: Instrument) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState<Instrument | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const blank = (): Instrument => ({
    id: uid(), name: "", model: "", serialNumber: "", location: "",
    calibrationDate: todayISO(), nextCalibrationDate: "", maintenanceNotes: "", bookings: [], createdAt: nowISO(),
  });

  function calStatus(inst: Instrument): { label: string; color: string } {
    if (!inst.nextCalibrationDate) return { label: "Unknown", color: "#a6daff" };
    const diff = new Date(inst.nextCalibrationDate).getTime() - Date.now();
    if (diff < 0) return { label: "Overdue", color: "#f06459" };
    if (diff < 30 * 24 * 60 * 60 * 1000) return { label: "Due soon", color: "#fbbf24" };
    return { label: "Valid", color: "#64dc82" };
  }

  const detail = instruments.find(i => i.id === detailId);

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Instruments ({instruments.length})</h2>
        <PrimaryBtn onClick={() => setEditing(blank())}>Add instrument</PrimaryBtn>
      </div>
      <div className="space-y-3">
        {instruments.map(i => {
          const cs = calStatus(i);
          return (
            <Card key={i.id} onClick={() => setDetailId(i.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{i.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{i.model} · {i.location}</div>
                </div>
                <Badge label={cs.label} color={cs.color} />
              </div>
              {i.nextCalibrationDate && (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>Next calibration: {fmtDate(i.nextCalibrationDate)}</div>
              )}
            </Card>
          );
        })}
      </div>

      {editing && (
        <InstrumentFormModal
          instrument={editing}
          onChange={setEditing}
          onSave={() => { onSave(editing); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {detail && (
        <InstrumentDetailModal
          instrument={detail}
          onClose={() => setDetailId(null)}
          onEdit={() => { setEditing(detail); setDetailId(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function InstrumentFormModal({ instrument, onChange, onSave, onDelete, onClose }: {
  instrument: Instrument; onChange: (i: Instrument) => void;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const u = (f: Partial<Instrument>) => onChange({ ...instrument, ...f });
  return (
    <Modal title="Instrument" onClose={onClose}>
      <Field label="Name"><Input value={instrument.name} onChange={v => u({ name: v })} placeholder="e.g. PCR Thermal Cycler" /></Field>
      <Field label="Model"><Input value={instrument.model} onChange={v => u({ model: v })} placeholder="e.g. Bio-Rad C1000 Touch" /></Field>
      <Field label="Serial number"><Input value={instrument.serialNumber} onChange={v => u({ serialNumber: v })} /></Field>
      <Field label="Location"><Input value={instrument.location} onChange={v => u({ location: v })} placeholder="e.g. Room 204, Bench 3" /></Field>
      <Field label="Last calibration date"><Input type="date" value={instrument.calibrationDate} onChange={v => u({ calibrationDate: v })} /></Field>
      <Field label="Next calibration date"><Input type="date" value={instrument.nextCalibrationDate} onChange={v => u({ nextCalibrationDate: v })} /></Field>
      <Field label="Maintenance notes"><Textarea value={instrument.maintenanceNotes} onChange={v => u({ maintenanceNotes: v })} /></Field>
      <SaveBtn onClick={onSave} />
      <DeleteBtn onClick={onDelete} />
    </Modal>
  );
}

function InstrumentDetailModal({ instrument, onClose, onEdit, onSave }: {
  instrument: Instrument;
  onClose: () => void;
  onEdit: () => void;
  onSave: (i: Instrument) => void;
}) {
  const [addingBooking, setAddingBooking] = useState(false);
  const [booking, setBooking] = useState<EquipmentBooking>({
    id: uid(), startAt: "", endAt: "", purpose: "", userName: "",
  });

  function saveBooking() {
    const updated = { ...instrument, bookings: [...instrument.bookings, { ...booking, id: uid() }] };
    onSave(updated);
    setAddingBooking(false);
    setBooking({ id: uid(), startAt: "", endAt: "", purpose: "", userName: "" });
  }

  function downloadICS(b: EquipmentBooking) {
    const fmt = (s: string) => s.replace(/[-:]/g, "").replace("T", "T").slice(0, 15) + "Z";
    const now = new Date().toISOString();
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LabHelpr//EN",
      "BEGIN:VEVENT",
      `UID:${b.id}@labhelpr`,
      `DTSTAMP:${fmt(now)}`,
      `DTSTART:${fmt(b.startAt)}`,
      `DTEND:${fmt(b.endAt)}`,
      `SUMMARY:[LabHelpr] ${instrument.name} — ${b.purpose}`,
      `DESCRIPTION:Booked by: ${b.userName}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `booking-${instrument.name.replace(/\s+/g, "-")}.ics`;
    a.click();
  }

  const ub = (f: Partial<EquipmentBooking>) => setBooking(prev => ({ ...prev, ...f }));

  return (
    <Modal title={instrument.name} onClose={onClose}>
      <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
        <div>Model: {instrument.model}</div>
        <div>Serial: {instrument.serialNumber}</div>
        <div>Location: {instrument.location}</div>
        <div>Next calibration: {fmtDate(instrument.nextCalibrationDate)}</div>
      </div>
      <button onClick={onEdit} className="w-full py-2.5 rounded-xl text-sm font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Edit instrument</button>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Bookings ({instrument.bookings.length})</span>
          <button onClick={() => setAddingBooking(true)} className="text-xs py-1.5 px-3 rounded-lg" style={{ background: "var(--accent)", color: "#04070d" }}>Add booking</button>
        </div>
        {instrument.bookings.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {instrument.bookings.map(b => (
              <div key={b.id} className="rounded-xl p-3 text-xs space-y-1" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="font-medium" style={{ color: "var(--text)" }}>{b.purpose}</div>
                <div style={{ color: "var(--text-muted)" }}>{fmtDate(b.startAt)} → {fmtDate(b.endAt)}</div>
                <div style={{ color: "var(--text-muted)" }}>By: {b.userName}</div>
                <button onClick={() => downloadICS(b)} className="text-xs py-1 px-2 rounded-lg mt-1" style={{ background: "rgba(166,218,255,0.1)", color: "var(--accent)", border: "1px solid rgba(166,218,255,0.2)" }}>
                  Add to calendar (.ics)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {addingBooking && (
        <div className="space-y-3 rounded-xl p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="text-sm font-medium" style={{ color: "var(--text)" }}>New booking</div>
          <Field label="Start (date/time)"><Input type="datetime-local" value={booking.startAt} onChange={v => ub({ startAt: v })} /></Field>
          <Field label="End (date/time)"><Input type="datetime-local" value={booking.endAt} onChange={v => ub({ endAt: v })} /></Field>
          <Field label="Purpose"><Input value={booking.purpose} onChange={v => ub({ purpose: v })} placeholder="e.g. PCR amplification run" /></Field>
          <Field label="Your name"><Input value={booking.userName} onChange={v => ub({ userName: v })} placeholder="e.g. Jane Smith" /></Field>
          <div className="flex gap-2">
            <SaveBtn onClick={saveBooking} label="Save booking" />
            <GhostBtn onClick={() => setAddingBooking(false)}>Cancel</GhostBtn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Tab: References ──────────────────────────────────────────────────────────
function ReferencesTab({ references, onSave, onDelete }: { references: Reference[]; onSave: (r: Reference) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<"ALL" | RefType>("ALL");
  const [editing, setEditing] = useState<Reference | null>(null);
  const [doiInput, setDoiInput] = useState("");
  const [pmidInput, setPmidInput] = useState("");
  const [looking, setLooking] = useState(false);

  const blank = (): Reference => ({
    id: uid(), type: "PAPER", title: "", authors: "", year: "", journal: "", doi: "", pmid: "", url: "", notes: "", createdAt: nowISO(),
  });

  const filtered = references.filter(r => filter === "ALL" || r.type === filter);

  async function handleDOI() {
    if (!doiInput.trim()) return;
    setLooking(true);
    const result = await lookupDOI(doiInput.trim());
    setLooking(false);
    if (result) setEditing({ ...blank(), ...result });
  }

  async function handlePMID() {
    if (!pmidInput.trim()) return;
    setLooking(true);
    const result = await lookupPMID(pmidInput.trim());
    setLooking(false);
    if (result) setEditing({ ...blank(), ...result });
  }

  function exportBibTeX() {
    const content = references.map(r => {
      const key = (r.doi || r.id).replace(/[^a-z0-9]/gi, "_");
      return `@article{${key},\n  author = {${r.authors}},\n  title = {${r.title}},\n  journal = {${r.journal}},\n  year = {${r.year}},\n  doi = {${r.doi}}\n}`;
    }).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "references.bib";
    a.click();
  }

  function exportRIS() {
    const content = references.map(r =>
      `TY  - JOUR\nAU  - ${r.authors}\nTI  - ${r.title}\nJO  - ${r.journal}\nPY  - ${r.year}\nDO  - ${r.doi}\nER  -`
    ).join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "references.ris";
    a.click();
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-2 flex-wrap">
        <PrimaryBtn onClick={() => setEditing(blank())}>Add manually</PrimaryBtn>
        {references.length > 0 && (
          <>
            <GhostBtn onClick={exportBibTeX}>BibTeX</GhostBtn>
            <GhostBtn onClick={exportRIS}>RIS</GhostBtn>
          </>
        )}
      </div>
      {/* DOI / PMID lookup */}
      <div className="rounded-xl p-3 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Quick lookup</div>
        <div className="flex gap-2">
          <input value={doiInput} onChange={e => setDoiInput(e.target.value)} placeholder="DOI" className={`${inputCls} flex-1`} style={inputStyle} />
          <button onClick={handleDOI} disabled={looking} className="py-2.5 px-4 rounded-xl text-sm font-medium shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>
            {looking ? "…" : "Fetch"}
          </button>
        </div>
        <div className="flex gap-2">
          <input value={pmidInput} onChange={e => setPmidInput(e.target.value)} placeholder="PMID" className={`${inputCls} flex-1`} style={inputStyle} />
          <button onClick={handlePMID} disabled={looking} className="py-2.5 px-4 rounded-xl text-sm font-medium shrink-0" style={{ background: "var(--accent)", color: "#04070d" }}>
            {looking ? "…" : "Fetch"}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["ALL", ...REF_TYPES] as const).map(t => (
          <button key={t} onClick={() => setFilter(t)} className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: filter === t ? "var(--accent)" : "var(--bg-card)", color: filter === t ? "#04070d" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {t === "ALL" ? "All" : t.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(r => (
          <Card key={r.id} onClick={() => setEditing(r)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.title || "(untitled)"}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.authors} {r.year && `(${r.year})`}</div>
                {r.journal && <div className="text-xs italic mt-0.5" style={{ color: "var(--text-dim)" }}>{r.journal}</div>}
                {r.doi && <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>DOI: {r.doi}</div>}
              </div>
              <Badge label={r.type} color="#a6daff" />
            </div>
          </Card>
        ))}
      </div>

      {editing && (
        <ReferenceModal
          ref_={editing}
          onChange={setEditing}
          onSave={() => { onSave(editing); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ReferenceModal({ ref_, onChange, onSave, onDelete, onClose }: {
  ref_: Reference; onChange: (r: Reference) => void;
  onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const u = (f: Partial<Reference>) => onChange({ ...ref_, ...f });
  return (
    <Modal title="Reference" onClose={onClose}>
      <Field label="Type"><Select value={ref_.type} onChange={v => u({ type: v as RefType })} options={REF_TYPES.map(t => ({ value: t, label: t.replace("_", " ") }))} /></Field>
      <Field label="Title"><Textarea value={ref_.title} onChange={v => u({ title: v })} rows={2} /></Field>
      <Field label="Authors"><Input value={ref_.authors} onChange={v => u({ authors: v })} placeholder="Smith, J.; Jones, A." /></Field>
      <Field label="Year"><Input value={ref_.year} onChange={v => u({ year: v })} placeholder="2024" /></Field>
      <Field label="Journal / Source"><Input value={ref_.journal} onChange={v => u({ journal: v })} /></Field>
      <Field label="DOI"><Input value={ref_.doi} onChange={v => u({ doi: v })} /></Field>
      <Field label="PMID"><Input value={ref_.pmid} onChange={v => u({ pmid: v })} /></Field>
      <Field label="URL"><Input value={ref_.url} onChange={v => u({ url: v })} /></Field>
      <Field label="Notes"><Textarea value={ref_.notes} onChange={v => u({ notes: v })} /></Field>
      <SaveBtn onClick={onSave} />
      <DeleteBtn onClick={onDelete} />
    </Modal>
  );
}

// ─── Tab: Tasks ───────────────────────────────────────────────────────────────
function TasksTab({ tasks, experiments, onSave, onDelete }: {
  tasks: LabTask[];
  experiments: Experiment[];
  onSave: (t: LabTask) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<LabTask | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DONE">("ALL");

  const blank = (): LabTask => ({
    id: uid(), title: "", dueAt: todayISO(), priority: "MEDIUM", completed: false,
    experimentId: "", notes: "", createdAt: nowISO(),
  });

  const filtered = tasks.filter(t =>
    filter === "ALL" || (filter === "PENDING" && !t.completed) || (filter === "DONE" && t.completed)
  ).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Tasks ({tasks.filter(t => !t.completed).length} pending)</h2>
        <PrimaryBtn onClick={() => setEditing(blank())}>Add task</PrimaryBtn>
      </div>
      <div className="flex gap-2">
        {(["ALL", "PENDING", "DONE"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className="text-xs px-3 py-2 rounded-lg font-medium"
            style={{ background: filter === s ? "var(--accent)" : "var(--bg-card)", color: filter === s ? "#04070d" : "var(--text-muted)", border: "1px solid var(--border)" }}>
            {s}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(t => {
          const exp = experiments.find(e => e.id === t.experimentId);
          return (
            <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <button onClick={() => onSave({ ...t, completed: !t.completed, completedAt: !t.completed ? nowISO() : undefined })}
                className="w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center"
                style={{ borderColor: t.completed ? "#64dc82" : "var(--border)", background: t.completed ? "#64dc82" : "transparent" }}>
                {t.completed && <span className="text-xs text-black">✓</span>}
              </button>
              <div className="flex-1 min-w-0" onClick={() => setEditing(t)}>
                <div className="text-sm" style={{ color: "var(--text)", textDecoration: t.completed ? "line-through" : "none", opacity: t.completed ? 0.5 : 1 }}>{t.title}</div>
                <div className="text-xs mt-0.5 flex gap-2 flex-wrap" style={{ color: "var(--text-muted)" }}>
                  <span>Due {fmtDate(t.dueAt)}</span>
                  {exp && <span>· {exp.uniqueCode}</span>}
                </div>
              </div>
              <Badge label={t.priority} color={PRIORITY_COLOR[t.priority]} />
            </div>
          );
        })}
      </div>
      {editing && (
        <TaskModal
          task={editing}
          experiments={experiments}
          onChange={setEditing}
          onSave={() => { onSave(editing); setEditing(null); }}
          onDelete={() => { onDelete(editing.id); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TaskModal({ task, experiments, onChange, onSave, onDelete, onClose }: {
  task: LabTask; experiments: Experiment[];
  onChange: (t: LabTask) => void; onSave: () => void; onDelete: () => void; onClose: () => void;
}) {
  const u = (f: Partial<LabTask>) => onChange({ ...task, ...f });
  return (
    <Modal title="Task" onClose={onClose}>
      <Field label="Title"><Input value={task.title} onChange={v => u({ title: v })} placeholder="e.g. Analyse gel results" /></Field>
      <Field label="Due date"><Input type="date" value={task.dueAt.slice(0, 10)} onChange={v => u({ dueAt: v })} /></Field>
      <Field label="Priority"><Select value={task.priority} onChange={v => u({ priority: v as TaskPriority })} options={["LOW", "MEDIUM", "HIGH"].map(p => ({ value: p, label: p }))} /></Field>
      <Field label="Linked experiment">
        <Select value={task.experimentId ?? ""} onChange={v => u({ experimentId: v || undefined })}
          options={[{ value: "", label: "— None —" }, ...experiments.map(e => ({ value: e.id, label: `${e.uniqueCode}: ${e.title}` }))]} />
      </Field>
      <Field label="Notes"><Textarea value={task.notes} onChange={v => u({ notes: v })} /></Field>
      <SaveBtn onClick={onSave} />
      <DeleteBtn onClick={onDelete} />
    </Modal>
  );
}

// ─── Tab: Calendar ────────────────────────────────────────────────────────────
function CalendarTab({ tasks, instruments }: { tasks: LabTask[]; instruments: Instrument[] }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const firstDay = new Date(month.year, month.month, 1);
  const lastDay = new Date(month.year, month.month + 1, 0);
  const startPad = firstDay.getDay(); // 0 = Sun
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function getTasksForDay(day: number) {
    const iso = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return tasks.filter(t => !t.completed && t.dueAt.startsWith(iso));
  }
  function getBookingsForDay(day: number) {
    const iso = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return instruments.flatMap(i => i.bookings.filter(b => b.startAt.startsWith(iso)));
  }

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(m => {
          const d = new Date(m.year, m.month - 1, 1);
          return { year: d.getFullYear(), month: d.getMonth() };
        })} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}>‹</button>
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{monthNames[month.month]} {month.year}</span>
        <button onClick={() => setMonth(m => {
          const d = new Date(m.year, m.month + 1, 1);
          return { year: d.getFullYear(), month: d.getMonth() };
        })} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text)" }}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} />;
          const taskDots = getTasksForDay(day);
          const bookingDots = getBookingsForDay(day);
          const today = new Date();
          const isToday = today.getDate() === day && today.getMonth() === month.month && today.getFullYear() === month.year;
          return (
            <div key={day} className="rounded-lg p-1 min-h-[40px] flex flex-col items-center" style={{ background: isToday ? "rgba(166,218,255,0.1)" : "var(--bg-card)", border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}` }}>
              <span className="text-xs" style={{ color: isToday ? "var(--accent)" : "var(--text)" }}>{day}</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                {taskDots.slice(0, 3).map((_, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: "#f0a070" }} />)}
                {bookingDots.slice(0, 2).map((_, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: "#a6daff" }} />)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f0a070" }} /> Tasks due</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#a6daff" }} /> Equipment bookings</span>
      </div>
    </div>
  );
}

// ─── Tab: Search ──────────────────────────────────────────────────────────────
function SearchTab({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchAll>> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      const r = await searchAll(query.trim());
      setResults(r);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const total = results ? (results.experiments.length + results.samples.length + results.reagents.length + results.references.length) : 0;

  return (
    <div className="space-y-4 pb-10">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search experiments, samples, reagents, references…" className={inputCls} style={inputStyle} autoFocus />
      {query && results && (
        <div className="space-y-4">
          {total === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No results found.</p>}
          {results.experiments.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Experiments</div>
              {results.experiments.map(e => (
                <div key={e.id} onClick={() => onNavigate(e.id)} className="flex items-center justify-between rounded-xl px-3 py-3 mb-2 cursor-pointer" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{e.title}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{e.uniqueCode}</div>
                  </div>
                  <Badge label={e.status} color={STATUS_COLOR[e.status]} />
                </div>
              ))}
            </div>
          )}
          {results.samples.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Samples</div>
              {results.samples.map(s => (
                <div key={s.id} className="rounded-xl px-3 py-3 mb-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{s.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.type} · {s.organism}</div>
                </div>
              ))}
            </div>
          )}
          {results.reagents.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Reagents</div>
              {results.reagents.map(r => (
                <div key={r.id} className="rounded-xl px-3 py-3 mb-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.supplier}</div>
                </div>
              ))}
            </div>
          )}
          {results.references.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>References</div>
              {results.references.map(r => (
                <div key={r.id} className="rounded-xl px-3 py-3 mb-2" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.title}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.authors} {r.year && `(${r.year})`}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Experiment Modal ─────────────────────────────────────────────────────
function NewExperimentModal({ onClose, onCreate }: { onClose: () => void; onCreate: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const exp = await createExperiment({
      title: title.trim(),
      objective: objective.trim(),
      hypothesis: hypothesis.trim(),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setSaving(false);
    onCreate(exp.id);
  }

  return (
    <Modal title="New experiment" onClose={onClose}>
      <Field label="Title"><Input value={title} onChange={setTitle} placeholder="e.g. CRISPR knockdown validation" /></Field>
      <Field label="Objective"><Textarea value={objective} onChange={setObjective} placeholder="What are you trying to achieve?" /></Field>
      <Field label="Hypothesis"><Textarea value={hypothesis} onChange={setHypothesis} placeholder="Your expected outcome…" /></Field>
      <Field label="Tags (comma-separated)"><Input value={tags} onChange={setTags} placeholder="e.g. CRISPR, gene expression, HEK293" /></Field>
      <SaveBtn onClick={save} label={saving ? "Creating…" : "Create experiment"} />
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotebookPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [tasks, setTasks] = useState<LabTask[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showNewExp, setShowNewExp] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState<LabTask | null>(null);

  const load = useCallback(async () => {
    await seedTemplates(BUILT_IN_TEMPLATES);
    const [exps, samps, reags, insts, refs, tks, tmpls] = await Promise.all([
      getExperiments(), getSamples(), getReagents(), getInstruments(), getReferences(), getTasks(), getTemplates(),
    ]);
    setExperiments(exps);
    setSamples(samps);
    setReagents(reags);
    setInstruments(insts);
    setReferences(refs);
    setTasks(tks);
    setTemplates(tmpls);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveExperiment(exp: Experiment) {
    await saveExperiment(exp);
    setExperiments(prev => prev.map(e => e.id === exp.id ? exp : e));
  }

  async function handleSaveSample(s: Sample) {
    await saveSample(s);
    setSamples(prev => {
      const idx = prev.findIndex(x => x.id === s.id);
      return idx >= 0 ? prev.map(x => x.id === s.id ? s : x) : [...prev, s];
    });
  }
  async function handleDeleteSample(id: string) {
    await deleteSample(id);
    setSamples(prev => prev.filter(s => s.id !== id));
  }

  async function handleSaveReagent(r: Reagent) {
    await saveReagent(r);
    setReagents(prev => {
      const idx = prev.findIndex(x => x.id === r.id);
      return idx >= 0 ? prev.map(x => x.id === r.id ? r : x) : [...prev, r];
    });
  }
  async function handleDeleteReagent(id: string) {
    await deleteReagent(id);
    setReagents(prev => prev.filter(r => r.id !== id));
  }

  async function handleSaveInstrument(i: Instrument) {
    await saveInstrument(i);
    setInstruments(prev => {
      const idx = prev.findIndex(x => x.id === i.id);
      return idx >= 0 ? prev.map(x => x.id === i.id ? i : x) : [...prev, i];
    });
  }
  async function handleDeleteInstrument(id: string) {
    await deleteInstrument(id);
    setInstruments(prev => prev.filter(i => i.id !== id));
  }

  async function handleSaveReference(r: Reference) {
    await saveReference(r);
    setReferences(prev => {
      const idx = prev.findIndex(x => x.id === r.id);
      return idx >= 0 ? prev.map(x => x.id === r.id ? r : x) : [...prev, r];
    });
  }
  async function handleDeleteReference(id: string) {
    await deleteReference(id);
    setReferences(prev => prev.filter(r => r.id !== id));
  }

  async function handleSaveTask(t: LabTask) {
    await saveTask(t);
    setTasks(prev => {
      const idx = prev.findIndex(x => x.id === t.id);
      return idx >= 0 ? prev.map(x => x.id === t.id ? t : x) : [...prev, t];
    });
  }
  async function handleDeleteTask(id: string) {
    await deleteTask(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function handleUseTemplate(tmpl: Template) {
    const sections = tmpl.sections.map((sec, si) => ({
      id: uid(), title: sec.title, order: si,
      blocks: sec.blocks.map((b, bi) => ({
        id: uid(), type: b.type, data: { ...b.defaultData } as import("@/lib/notebook/types").BlockData,
        order: bi,
      })),
    }));
    const exp = await createExperiment({ title: tmpl.name, sections });
    setExperiments(prev => [...prev, exp]);
    router.push(`/notebook/experiment/${exp.id}`);
  }

  function navigateToExp(id: string) {
    router.push(`/notebook/experiment/${id}`);
  }

  function openNewTask() {
    const blank: LabTask = {
      id: uid(), title: "", dueAt: todayISO(), priority: "MEDIUM", completed: false,
      experimentId: "", notes: "", createdAt: nowISO(),
    };
    setNewTask(blank);
    setShowNewTask(true);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Tab bar */}
      <div className="sticky top-0 z-40 flex overflow-x-auto border-b" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2"
            style={{
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              borderBottomColor: activeTab === tab.id ? "var(--accent)" : "transparent",
              background: "transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-5 max-w-xl mx-auto w-full">
        {activeTab === "home" && (
          <HomeTab
            experiments={experiments}
            tasks={tasks}
            onTab={setActiveTab}
            onNewExp={() => setShowNewExp(true)}
            onNewTask={openNewTask}
          />
        )}
        {activeTab === "experiments" && (
          <ExperimentsTab experiments={experiments} onNew={() => setShowNewExp(true)} onNavigate={navigateToExp} />
        )}
        {activeTab === "protocols" && (
          <ProtocolsTab templates={templates} onUse={handleUseTemplate} />
        )}
        {activeTab === "samples" && (
          <SamplesTab samples={samples} onSave={handleSaveSample} onDelete={handleDeleteSample} />
        )}
        {activeTab === "reagents" && (
          <ReagentsTab reagents={reagents} onSave={handleSaveReagent} onDelete={handleDeleteReagent} />
        )}
        {activeTab === "equipment" && (
          <EquipmentTab instruments={instruments} onSave={handleSaveInstrument} onDelete={handleDeleteInstrument} />
        )}
        {activeTab === "references" && (
          <ReferencesTab references={references} onSave={handleSaveReference} onDelete={handleDeleteReference} />
        )}
        {activeTab === "tasks" && (
          <TasksTab tasks={tasks} experiments={experiments} onSave={handleSaveTask} onDelete={handleDeleteTask} />
        )}
        {activeTab === "calendar" && (
          <CalendarTab tasks={tasks} instruments={instruments} />
        )}
        {activeTab === "search" && (
          <SearchTab onNavigate={navigateToExp} />
        )}
      </div>

      {/* New experiment modal */}
      {showNewExp && (
        <NewExperimentModal
          onClose={() => setShowNewExp(false)}
          onCreate={id => { setShowNewExp(false); navigateToExp(id); load(); }}
        />
      )}

      {/* New task modal */}
      {showNewTask && newTask && (
        <TaskModal
          task={newTask}
          experiments={experiments}
          onChange={setNewTask}
          onSave={async () => {
            await handleSaveTask(newTask);
            setShowNewTask(false);
            setNewTask(null);
          }}
          onDelete={() => { setShowNewTask(false); setNewTask(null); }}
          onClose={() => { setShowNewTask(false); setNewTask(null); }}
        />
      )}
    </div>
  );
}
