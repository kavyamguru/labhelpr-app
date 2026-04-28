// LabHelpr Notebook — IndexedDB persistence layer
// All data stored client-side in the browser (no account or server required)

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Experiment, Sample, Reagent, Instrument, Reference, LabTask, Template } from "./types";
import { uid, nowISO } from "./types";

interface NoteDB extends DBSchema {
  experiments: { key: string; value: Experiment; indexes: { by_status: string } };
  samples:     { key: string; value: Sample };
  reagents:    { key: string; value: Reagent };
  instruments: { key: string; value: Instrument };
  references:  { key: string; value: Reference };
  tasks:       { key: string; value: LabTask; indexes: { by_experiment: string } };
  templates:   { key: string; value: Template; indexes: { by_category: string } };
  counters:    { key: string; value: { id: string; year: number; n: number } };
}

const DB_NAME = "labhelpr_notebook_v2";
let _db: ReturnType<typeof openDB<NoteDB>> | null = null;

function db(): ReturnType<typeof openDB<NoteDB>> {
  if (_db) return _db;
  _db = openDB<NoteDB>(DB_NAME, 1, {
    upgrade(db) {
      const expStore = db.createObjectStore("experiments", { keyPath: "id" });
      expStore.createIndex("by_status", "status");
      db.createObjectStore("samples", { keyPath: "id" });
      db.createObjectStore("reagents", { keyPath: "id" });
      db.createObjectStore("instruments", { keyPath: "id" });
      db.createObjectStore("references", { keyPath: "id" });
      const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
      taskStore.createIndex("by_experiment", "experimentId");
      const tmplStore = db.createObjectStore("templates", { keyPath: "id" });
      tmplStore.createIndex("by_category", "category");
      db.createObjectStore("counters", { keyPath: "id" });
    },
  });
  return _db;
}

// ── Experiment counter (EXP-2026-001 style codes) ──────────────────────────
async function nextExpCode(): Promise<string> {
  const d = await db();
  const year = new Date().getFullYear();
  const key = `exp_counter_${year}`;
  let rec = await d.get("counters", key);
  if (!rec) rec = { id: key, year, n: 0 };
  rec.n += 1;
  await d.put("counters", rec);
  return `EXP-${year}-${String(rec.n).padStart(3, "0")}`;
}

// ── Experiments ────────────────────────────────────────────────────────────
export async function getExperiments(): Promise<Experiment[]> {
  return (await db()).getAll("experiments");
}
export async function getExperiment(id: string): Promise<Experiment | undefined> {
  return (await db()).get("experiments", id);
}
export async function saveExperiment(exp: Experiment): Promise<void> {
  await (await db()).put("experiments", { ...exp, updatedAt: nowISO() });
}
export async function createExperiment(data: Partial<Experiment>): Promise<Experiment> {
  const code = await nextExpCode();
  const exp: Experiment = {
    id: uid(), uniqueCode: code, title: data.title ?? "Untitled experiment",
    objective: data.objective ?? "", hypothesis: data.hypothesis ?? "",
    status: "DRAFT", tags: data.tags ?? [], sections: data.sections ?? [],
    reproducibilityScore: 0, startedAt: nowISO(),
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  await (await db()).put("experiments", exp);
  return exp;
}
export async function deleteExperiment(id: string): Promise<void> {
  await (await db()).delete("experiments", id);
}

// ── Samples ────────────────────────────────────────────────────────────────
export async function getSamples(): Promise<Sample[]> { return (await db()).getAll("samples"); }
export async function saveSample(s: Sample): Promise<void> { await (await db()).put("samples", s); }
export async function deleteSample(id: string): Promise<void> { await (await db()).delete("samples", id); }

// ── Reagents ───────────────────────────────────────────────────────────────
export async function getReagents(): Promise<Reagent[]> { return (await db()).getAll("reagents"); }
export async function saveReagent(r: Reagent): Promise<void> { await (await db()).put("reagents", r); }
export async function deleteReagent(id: string): Promise<void> { await (await db()).delete("reagents", id); }

// ── Instruments ────────────────────────────────────────────────────────────
export async function getInstruments(): Promise<Instrument[]> { return (await db()).getAll("instruments"); }
export async function saveInstrument(i: Instrument): Promise<void> { await (await db()).put("instruments", i); }
export async function deleteInstrument(id: string): Promise<void> { await (await db()).delete("instruments", id); }

// ── References ─────────────────────────────────────────────────────────────
export async function getReferences(): Promise<Reference[]> { return (await db()).getAll("references"); }
export async function saveReference(r: Reference): Promise<void> { await (await db()).put("references", r); }
export async function deleteReference(id: string): Promise<void> { await (await db()).delete("references", id); }

// DOI lookup via CrossRef
export async function lookupDOI(doi: string): Promise<Partial<Reference> | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!res.ok) return null;
    const { message: m } = await res.json();
    const authors = (m.author ?? []).slice(0, 3).map((a: { family?: string; given?: string }) => `${a.family ?? ""}, ${a.given ?? ""}`.trim()).join("; ");
    return {
      title: (m.title ?? [])[0] ?? "",
      authors,
      year: String((m.published?.["date-parts"]?.[0]?.[0]) ?? ""),
      journal: (m["container-title"] ?? [])[0] ?? "",
      doi: m.DOI ?? doi,
      type: "PAPER",
    };
  } catch { return null; }
}

// PubMed PMID lookup
export async function lookupPMID(pmid: string): Promise<Partial<Reference> | null> {
  try {
    const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`);
    if (!res.ok) return null;
    const data = await res.json();
    const art = data?.result?.[pmid];
    if (!art) return null;
    const authors = (art.authors ?? []).slice(0, 3).map((a: { name: string }) => a.name).join("; ");
    return {
      title: art.title ?? "",
      authors,
      year: art.pubdate?.split(" ")[0] ?? "",
      journal: art.source ?? "",
      pmid,
      type: "PAPER",
    };
  } catch { return null; }
}

// ── Tasks ──────────────────────────────────────────────────────────────────
export async function getTasks(): Promise<LabTask[]> { return (await db()).getAll("tasks"); }
export async function saveTask(t: LabTask): Promise<void> { await (await db()).put("tasks", t); }
export async function deleteTask(id: string): Promise<void> { await (await db()).delete("tasks", id); }

// ── Templates ──────────────────────────────────────────────────────────────
export async function getTemplates(): Promise<Template[]> { return (await db()).getAll("templates"); }
export async function saveTemplate(t: Template): Promise<void> { await (await db()).put("templates", t); }
export async function deleteTemplate(id: string): Promise<void> { await (await db()).delete("templates", id); }
export async function seedTemplates(templates: Template[]): Promise<void> {
  const d = await db();
  for (const t of templates) {
    const existing = await d.get("templates", t.id);
    if (!existing) await d.put("templates", t);
  }
}

// ── Global search ──────────────────────────────────────────────────────────
export async function searchAll(q: string) {
  const lq = q.toLowerCase();
  const [exps, samples, reagents, refs] = await Promise.all([getExperiments(), getSamples(), getReagents(), getReferences()]);
  return {
    experiments: exps.filter(e => e.title.toLowerCase().includes(lq) || e.objective.toLowerCase().includes(lq) || e.tags.some(t => t.toLowerCase().includes(lq))),
    samples:     samples.filter(s => s.name.toLowerCase().includes(lq) || s.organism.toLowerCase().includes(lq)),
    reagents:    reagents.filter(r => r.name.toLowerCase().includes(lq) || r.supplier.toLowerCase().includes(lq)),
    references:  refs.filter(r => r.title.toLowerCase().includes(lq) || r.authors.toLowerCase().includes(lq)),
  };
}
