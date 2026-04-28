// LabHelpr Notebook — Data Types
// Mobile-first lab notebook for life science researchers

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function nowISO(): string { return new Date().toISOString(); }
export function todayISO(): string { return new Date().toISOString().slice(0, 10); }

export type ExpStatus    = "DRAFT" | "IN_PROGRESS" | "COMPLETE" | "FLAGGED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type SampleType   = "Cell line" | "Primary cells" | "Tissue" | "DNA" | "RNA" | "Protein" | "Plasmid" | "Bacteria" | "Virus" | "Other";
export type StorageTemp  = "-80°C" | "-20°C" | "4°C" | "RT" | "37°C";
export type RefType      = "PAPER" | "SOP" | "KIT_MANUAL" | "PROTOCOL" | "BOOK";
export type TempCategory = "NUCLEIC_ACIDS" | "PROTEIN" | "CELL_WORK" | "IMMUNOASSAY" | "IN_VIVO" | "OTHER";
export type BlockType    = "text" | "checklist" | "sample_table" | "reagent_table" | "timer" | "thermocycler" | "gel" | "deviation" | "results" | "cell_count" | "antibody" | "qpcr";

export interface ChecklistItem { id: string; label: string; checked: boolean; checkedAt?: string; required: boolean; notes?: string }
export interface SampleRow { id: string; name: string; type: string; concentration?: string; volume?: string; passage?: string; notes?: string }
export interface ReagentRow { id: string; name: string; supplier?: string; catalogueNumber?: string; lotNumber?: string; concentration?: string; volumeUsed?: string; unit?: string }
export interface ThermocyclerStep { id: string; label: string; temp: string; duration: string; cycles?: number }
export interface DeviationEntry { id: string; step: string; description: string; impact: "LOW" | "MEDIUM" | "HIGH"; action: string; recordedAt: string }
export interface AntibodyRow { id: string; name: string; target: string; host: string; dilution: string; supplier?: string; catalogueNumber?: string; incubation?: string }
export interface QPCRRow { id: string; gene: string; ct: string; efficiency?: string; notes?: string }

export type BlockData =
  | { type: "text"; content: string }
  | { type: "checklist"; title: string; items: ChecklistItem[] }
  | { type: "sample_table"; title: string; rows: SampleRow[] }
  | { type: "reagent_table"; title: string; rows: ReagentRow[] }
  | { type: "timer"; label: string; durationMin: number; startedAt?: string; completedAt?: string }
  | { type: "thermocycler"; programName: string; steps: ThermocyclerStep[]; totalCycles?: number }
  | { type: "gel"; description: string; bands: string; imageNote: string }
  | { type: "deviation"; entries: DeviationEntry[] }
  | { type: "results"; summary: string; quantitative: string; interpretation: string }
  | { type: "cell_count"; cellLine: string; viability: string; density: string; method: string; notes: string }
  | { type: "antibody"; title: string; rows: AntibodyRow[] }
  | { type: "qpcr"; referenceGene: string; rows: QPCRRow[] };

export interface Block { id: string; type: BlockType; data: BlockData; order: number; completedAt?: string }
export interface ExperimentSection { id: string; title: string; order: number; blocks: Block[] }

export interface Experiment {
  id: string; uniqueCode: string; title: string; objective: string; hypothesis: string;
  status: ExpStatus; tags: string[]; sections: ExperimentSection[];
  reproducibilityScore: number; startedAt?: string; completedAt?: string;
  createdAt: string; updatedAt: string;
}

export interface Sample {
  id: string; name: string; type: SampleType; organism: string; passage: string;
  concentration: string; volume: string; storageLocation: string;
  dateStored: string; expiryDate: string; notes: string; createdAt: string;
}

export interface Reagent {
  id: string; name: string; catalogNumber: string; supplier: string; lotNumber: string;
  currentStock: string; unit: string; minStock: string; storageTemp: StorageTemp;
  location: string; expiryDate: string; notes: string; createdAt: string;
}

export interface EquipmentBooking { id: string; startAt: string; endAt: string; purpose: string; userName: string; experimentId?: string }
export interface Instrument {
  id: string; name: string; model: string; serialNumber: string; location: string;
  calibrationDate: string; nextCalibrationDate: string; maintenanceNotes: string;
  bookings: EquipmentBooking[]; createdAt: string;
}

export interface Reference {
  id: string; type: RefType; title: string; authors: string; year: string;
  journal: string; doi: string; pmid: string; url: string; notes: string; createdAt: string;
}

export interface LabTask {
  id: string; title: string; dueAt: string; priority: TaskPriority;
  completed: boolean; completedAt?: string; experimentId?: string;
  notes: string; createdAt: string;
}

export interface TemplateBlock { type: BlockType; defaultData: Partial<BlockData>; required: boolean }
export interface TemplateSection { title: string; blocks: TemplateBlock[] }
export interface Template {
  id: string; name: string; description: string; category: TempCategory;
  difficulty: "beginner" | "intermediate" | "advanced"; icon: string;
  estimatedTime: string; sections: TemplateSection[]; isBuiltIn: boolean; createdAt: string;
}
