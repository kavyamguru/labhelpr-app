// Lab Notebook — local storage data layer
// All data lives in the browser (no server needed)

export type ExpStatus = "planned" | "in-progress" | "completed" | "failed" | "repeat";
export type Priority  = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "done";
export type StorageTemp = "-80°C" | "-20°C" | "4°C" | "RT" | "37°C";
export type SampleType = "Cell line" | "Primary cells" | "Tissue" | "DNA" | "RNA" | "Protein" | "Plasmid" | "Bacteria" | "Virus" | "Other";

export interface Experiment {
  id: string;
  title: string;
  date: string;
  aim: string;
  protocol: string;
  observations: string;
  results: string;
  conclusion: string;
  status: ExpStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Sample {
  id: string;
  name: string;
  type: SampleType;
  organism: string;
  passage: string;
  concentration: string;
  volume: string;
  storageLocation: string;
  dateStored: string;
  expiryDate: string;
  notes: string;
  createdAt: string;
}

export interface Reagent {
  id: string;
  name: string;
  catalogNumber: string;
  supplier: string;
  currentStock: string;
  unit: string;
  minStock: string;
  storageTemp: StorageTemp;
  location: string;
  expiryDate: string;
  lotNumber: string;
  notes: string;
  createdAt: string;
}

export interface LabTask {
  id: string;
  title: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  notes: string;
  createdAt: string;
}

export interface NotebookStore {
  experiments: Experiment[];
  samples: Sample[];
  reagents: Reagent[];
  tasks: LabTask[];
}

const KEY = "labhelpr_notebook_v1";

export function loadStore(): NotebookStore {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return JSON.parse(raw) as NotebookStore;
  } catch {
    return empty();
  }
}

export function saveStore(store: NotebookStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

function empty(): NotebookStore {
  return { experiments: [], samples: [], reagents: [], tasks: [] };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
