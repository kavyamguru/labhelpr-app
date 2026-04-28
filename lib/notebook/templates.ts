import { type Template, uid, nowISO } from "./types";

function t(id: string, name: string, description: string, category: Template["category"], difficulty: Template["difficulty"], icon: string, estimatedTime: string, sections: Template["sections"]): Template {
  return { id, name, description, category, difficulty, icon, estimatedTime, sections, isBuiltIn: true, createdAt: nowISO() };
}

export const BUILT_IN_TEMPLATES: Template[] = [
  t("tpl-pcr", "PCR", "Standard PCR protocol with master mix setup, thermocycler programme, and gel analysis.", "NUCLEIC_ACIDS", "beginner", "🧬", "3 h",
    [
      { title: "Pre-PCR checks", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "Pre-PCR checks", items: [
        { id: uid(), label: "Template DNA quantified (NanoDrop/Qubit)", checked: false, required: true },
        { id: uid(), label: "Primers aliquoted and diluted to working concentration", checked: false, required: true },
        { id: uid(), label: "PCR tubes labelled", checked: false, required: true },
        { id: uid(), label: "Ice ready for master mix setup", checked: false, required: false },
      ] }, required: true }] },
      { title: "Master mix", blocks: [{ type: "reagent_table", defaultData: { type: "reagent_table", title: "PCR master mix", rows: [
        { id: uid(), name: "10× Buffer", volumeUsed: "2.5 µL", unit: "µL" },
        { id: uid(), name: "dNTPs (10 mM each)", volumeUsed: "0.5 µL", unit: "µL" },
        { id: uid(), name: "Forward primer (10 µM)", volumeUsed: "1 µL", unit: "µL" },
        { id: uid(), name: "Reverse primer (10 µM)", volumeUsed: "1 µL", unit: "µL" },
        { id: uid(), name: "Taq polymerase", volumeUsed: "0.25 µL", unit: "µL" },
        { id: uid(), name: "Template DNA", volumeUsed: "1 µL", unit: "µL" },
        { id: uid(), name: "Nuclease-free water", volumeUsed: "to 25 µL", unit: "µL" },
      ] }, required: true }] },
      { title: "Thermocycler programme", blocks: [{ type: "thermocycler", defaultData: { type: "thermocycler", programName: "Standard PCR", totalCycles: 35, steps: [
        { id: uid(), label: "Initial denaturation", temp: "95°C", duration: "3 min" },
        { id: uid(), label: "Denaturation", temp: "95°C", duration: "30 s", cycles: 35 },
        { id: uid(), label: "Annealing", temp: "60°C", duration: "30 s", cycles: 35 },
        { id: uid(), label: "Extension", temp: "72°C", duration: "1 min/kb", cycles: 35 },
        { id: uid(), label: "Final extension", temp: "72°C", duration: "5 min" },
        { id: uid(), label: "Hold", temp: "4°C", duration: "∞" },
      ] }, required: true }] },
      { title: "Gel analysis", blocks: [{ type: "gel", defaultData: { type: "gel", description: "2% agarose gel, 100V, 30 min", bands: "", imageNote: "" }, required: true }] },
      { title: "Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-qpcr", "qPCR (RT-qPCR)", "Quantitative PCR for gene expression analysis with reference gene normalisation.", "NUCLEIC_ACIDS", "intermediate", "📊", "4 h",
    [
      { title: "RNA extraction checks", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "RNA quality checks", items: [
        { id: uid(), label: "RNA integrity checked (RIN ≥ 7 or A260/A280 ≥ 1.8)", checked: false, required: true },
        { id: uid(), label: "RNA concentration measured", checked: false, required: true },
        { id: uid(), label: "gDNA contamination ruled out (no-RT control)", checked: false, required: true },
      ] }, required: true }] },
      { title: "Reverse transcription", blocks: [{ type: "reagent_table", defaultData: { type: "reagent_table", title: "cDNA synthesis", rows: [
        { id: uid(), name: "RNA template", unit: "ng" },
        { id: uid(), name: "Random hexamers or oligo-dT" },
        { id: uid(), name: "Reverse transcriptase buffer" },
        { id: uid(), name: "dNTPs" },
        { id: uid(), name: "Reverse transcriptase enzyme" },
      ] }, required: true }] },
      { title: "qPCR setup", blocks: [{ type: "qpcr", defaultData: { type: "qpcr", referenceGene: "GAPDH / β-actin", rows: [] }, required: true }] },
      { title: "Thermocycler programme", blocks: [{ type: "thermocycler", defaultData: { type: "thermocycler", programName: "qPCR", totalCycles: 40, steps: [
        { id: uid(), label: "UDG activation", temp: "50°C", duration: "2 min" },
        { id: uid(), label: "Polymerase activation", temp: "95°C", duration: "10 min" },
        { id: uid(), label: "Denaturation", temp: "95°C", duration: "15 s", cycles: 40 },
        { id: uid(), label: "Annealing/Extension", temp: "60°C", duration: "1 min", cycles: 40 },
      ] }, required: true }] },
      { title: "Results & Analysis", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "Ct values, ΔCt, ΔΔCt, fold change", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-wb", "Western Blot", "Protein detection by SDS-PAGE and immunoblotting with antibody incubation steps.", "PROTEIN", "intermediate", "📌", "2 days",
    [
      { title: "Sample preparation", blocks: [{ type: "sample_table", defaultData: { type: "sample_table", title: "Protein samples", rows: [] }, required: true }] },
      { title: "SDS-PAGE", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "SDS-PAGE steps", items: [
        { id: uid(), label: "Samples denatured (95°C, 5 min, loading buffer)", checked: false, required: true },
        { id: uid(), label: "Gel percentage selected for target protein size", checked: false, required: true },
        { id: uid(), label: "Protein ladder loaded", checked: false, required: true },
        { id: uid(), label: "Run at 120V until dye front reaches bottom", checked: false, required: true },
        { id: uid(), label: "Transfer to membrane (PVDF/nitrocellulose)", checked: false, required: true },
      ] }, required: true }] },
      { title: "Antibody incubation", blocks: [{ type: "antibody", defaultData: { type: "antibody", title: "Antibody panel", rows: [
        { id: uid(), name: "Primary antibody", target: "", host: "", dilution: "1:1000", incubation: "Overnight at 4°C" },
        { id: uid(), name: "HRP-conjugated secondary", target: "", host: "", dilution: "1:5000", incubation: "1 h at RT" },
        { id: uid(), name: "Loading control (e.g. β-actin)", target: "β-actin", host: "Mouse", dilution: "1:10000", incubation: "1 h at RT" },
      ] }, required: true }] },
      { title: "Detection & Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "Band intensities (densitometry), normalised to loading control", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-elisa", "ELISA", "Enzyme-linked immunosorbent assay for protein quantification in samples.", "IMMUNOASSAY", "intermediate", "🫙", "6 h",
    [
      { title: "Plate coating", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "Plate coating", items: [
        { id: uid(), label: "Capture antibody diluted in coating buffer", checked: false, required: true },
        { id: uid(), label: "100 µL/well added to 96-well plate", checked: false, required: true },
        { id: uid(), label: "Incubated overnight at 4°C (or 2 h at 37°C)", checked: false, required: true },
        { id: uid(), label: "Plate washed 3× with wash buffer", checked: false, required: true },
        { id: uid(), label: "Blocked (2% BSA or 5% skimmed milk, 1 h at RT)", checked: false, required: true },
      ] }, required: true }] },
      { title: "Sample & standards", blocks: [{ type: "sample_table", defaultData: { type: "sample_table", title: "Samples and standard curve", rows: [] }, required: true }] },
      { title: "Detection", blocks: [{ type: "antibody", defaultData: { type: "antibody", title: "Detection antibodies", rows: [
        { id: uid(), name: "Detection antibody", target: "", host: "", dilution: "1:1000", incubation: "2 h at RT" },
        { id: uid(), name: "HRP-streptavidin conjugate", target: "", host: "", dilution: "1:200", incubation: "20 min at RT" },
      ] }, required: true }] },
      { title: "Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "OD450 readings, standard curve, interpolated concentrations", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-cellculture", "Cell Culture & Passaging", "Routine cell line maintenance, passaging, and viability assessment.", "CELL_WORK", "beginner", "🔬", "1 h",
    [
      { title: "Pre-passage checks", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "Pre-passage checks", items: [
        { id: uid(), label: "Media pre-warmed to 37°C", checked: false, required: true },
        { id: uid(), label: "Cells checked for contamination (microscopy)", checked: false, required: true },
        { id: uid(), label: "Confluence assessed (aim 70–90%)", checked: false, required: true },
        { id: uid(), label: "Biosafety cabinet UV'd for 15 min", checked: false, required: false },
      ] }, required: true }] },
      { title: "Cell count & viability", blocks: [{ type: "cell_count", defaultData: { type: "cell_count", cellLine: "", viability: "", density: "", method: "Trypan blue exclusion (haemocytometer) or automated counter", notes: "" }, required: true }] },
      { title: "Passaging record", blocks: [{ type: "text", defaultData: { type: "text", content: "Passage number:\nSplit ratio:\nNew flask size:\nSeeding density:\nMedia volume:" }, required: true }] },
    ]
  ),

  t("tpl-transfection", "Transfection", "Lipid-mediated or electroporation-based transfection of plasmid DNA or siRNA.", "CELL_WORK", "intermediate", "🧪", "48 h",
    [
      { title: "Cell seeding (Day -1)", blocks: [{ type: "cell_count", defaultData: { type: "cell_count", cellLine: "", viability: "", density: "Seed to achieve 60–80% confluency at time of transfection", method: "Haemocytometer / automated counter", notes: "" }, required: true }] },
      { title: "Transfection setup", blocks: [{ type: "reagent_table", defaultData: { type: "reagent_table", title: "Transfection reagents (per well)", rows: [
        { id: uid(), name: "Plasmid DNA / siRNA", unit: "µg / nM" },
        { id: uid(), name: "Transfection reagent (e.g. Lipofectamine 3000)" },
        { id: uid(), name: "P3000 reagent (if applicable)" },
        { id: uid(), name: "Opti-MEM reduced serum medium" },
      ] }, required: true }] },
      { title: "Post-transfection checks", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "48 h post-transfection", items: [
        { id: uid(), label: "Fluorescence/reporter confirmed (if applicable)", checked: false, required: false },
        { id: uid(), label: "Knockdown confirmed by qPCR or western blot", checked: false, required: false },
        { id: uid(), label: "Cell viability checked", checked: false, required: false },
      ] }, required: false }] },
      { title: "Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "Transfection efficiency (%)", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-flowcyt", "Flow Cytometry", "Cell surface or intracellular staining for flow cytometric analysis.", "IMMUNOASSAY", "intermediate", "📈", "4 h",
    [
      { title: "Sample preparation", blocks: [{ type: "cell_count", defaultData: { type: "cell_count", cellLine: "", viability: "", density: "1×10⁶ cells per staining tube", method: "Trypan blue / automated counter", notes: "" }, required: true }] },
      { title: "Staining panel", blocks: [{ type: "antibody", defaultData: { type: "antibody", title: "Staining panel", rows: [
        { id: uid(), name: "Viability dye (e.g. DAPI / Zombie NIR)", target: "Dead cells", host: "N/A", dilution: "1:1000", incubation: "15 min on ice" },
        { id: uid(), name: "Primary/conjugated antibody 1", target: "", host: "", dilution: "", incubation: "30 min on ice" },
        { id: uid(), name: "Primary/conjugated antibody 2", target: "", host: "", dilution: "", incubation: "30 min on ice" },
      ] }, required: true }] },
      { title: "Acquisition & gating", blocks: [{ type: "text", defaultData: { type: "text", content: "Instrument:\nLaser configuration:\nFSC/SSC gate:\nViability gate (% live):\nPositive gate controls used:\nEvents acquired per sample:" }, required: true }] },
      { title: "Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "% positive, MFI, absolute counts", interpretation: "" }, required: false }] },
    ]
  ),

  t("tpl-protein-purif", "Protein Purification (His-tag)", "Affinity purification of His-tagged recombinant protein from bacterial or mammalian expression.", "PROTEIN", "advanced", "⚗️", "2 days",
    [
      { title: "Expression check", blocks: [{ type: "checklist", defaultData: { type: "checklist", title: "Pre-purification checks", items: [
        { id: uid(), label: "Expression confirmed by SDS-PAGE / western blot", checked: false, required: true },
        { id: uid(), label: "Cell pellet stored at -80°C or ready to lyse", checked: false, required: true },
        { id: uid(), label: "Protease inhibitor cocktail added to lysis buffer", checked: false, required: true },
        { id: uid(), label: "Ni-NTA resin equilibrated", checked: false, required: true },
      ] }, required: true }] },
      { title: "Lysis & binding", blocks: [{ type: "text", defaultData: { type: "text", content: "Lysis method: (sonication / French press / detergent)\nBuffer: 50 mM NaH₂PO₄, 300 mM NaCl, 10 mM imidazole, pH 8.0\nClarified lysate: ___mL\nProtein concentration (BCA): ___mg/mL" }, required: true }] },
      { title: "Elution fractions", blocks: [{ type: "sample_table", defaultData: { type: "sample_table", title: "Elution fractions", rows: [
        { id: uid(), name: "Flow-through", type: "Protein", concentration: "", notes: "" },
        { id: uid(), name: "Wash", type: "Protein", concentration: "", notes: "" },
        { id: uid(), name: "Elution 1 (250 mM imidazole)", type: "Protein", concentration: "", notes: "" },
        { id: uid(), name: "Elution 2", type: "Protein", concentration: "", notes: "" },
      ] }, required: true }] },
      { title: "Results", blocks: [{ type: "results", defaultData: { type: "results", summary: "", quantitative: "Yield (mg), purity (% by densitometry)", interpretation: "" }, required: false }] },
    ]
  ),
];
