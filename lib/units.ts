export interface Unit {
  label: string;
  factor: number;
}

export interface UnitGroup {
  id: string;
  name: string;
  base: string;
  units: Unit[];
}

export const UNIT_GROUPS: UnitGroup[] = [
  {
    id: "volume", name: "Volume", base: "L",
    units: [
      { label: "L",  factor: 1       },
      { label: "dL", factor: 1e-1    },
      { label: "mL", factor: 1e-3    },
      { label: "µL", factor: 1e-6    },
      { label: "nL", factor: 1e-9    },
      { label: "pL", factor: 1e-12   },
    ],
  },
  {
    id: "mass", name: "Mass", base: "g",
    units: [
      { label: "kg", factor: 1e3  },
      { label: "g",  factor: 1    },
      { label: "mg", factor: 1e-3 },
      { label: "µg", factor: 1e-6 },
      { label: "ng", factor: 1e-9 },
      { label: "pg", factor: 1e-12},
      { label: "fg", factor: 1e-15},
    ],
  },
  {
    id: "amount", name: "Amount (mol)", base: "mol",
    units: [
      { label: "mol",  factor: 1    },
      { label: "mmol", factor: 1e-3 },
      { label: "µmol", factor: 1e-6 },
      { label: "nmol", factor: 1e-9 },
      { label: "pmol", factor: 1e-12},
      { label: "fmol", factor: 1e-15},
    ],
  },
  {
    id: "concentration", name: "Molar Conc.", base: "M",
    units: [
      { label: "M",  factor: 1    },
      { label: "mM", factor: 1e-3 },
      { label: "µM", factor: 1e-6 },
      { label: "nM", factor: 1e-9 },
      { label: "pM", factor: 1e-12},
      { label: "fM", factor: 1e-15},
    ],
  },
  {
    id: "mass_conc", name: "Mass Conc.", base: "g/L",
    units: [
      { label: "g/L",   factor: 1    },
      { label: "mg/mL", factor: 1    },
      { label: "g/dL",  factor: 10   },
      { label: "mg/L",  factor: 1e-3 },
      { label: "µg/mL", factor: 1e-3 },
      { label: "ng/µL", factor: 1e-3 },
      { label: "µg/L",  factor: 1e-6 },
      { label: "ng/mL", factor: 1e-6 },
      { label: "pg/µL", factor: 1e-6 },
      { label: "pg/mL", factor: 1e-9 },
    ],
  },
  {
    id: "length", name: "Length", base: "m",
    units: [
      { label: "m",  factor: 1    },
      { label: "cm", factor: 1e-2 },
      { label: "mm", factor: 1e-3 },
      { label: "µm", factor: 1e-6 },
      { label: "nm", factor: 1e-9 },
      { label: "Å",  factor: 1e-10},
    ],
  },
  {
    id: "area", name: "Area", base: "m²",
    units: [
      { label: "m²",  factor: 1    },
      { label: "cm²", factor: 1e-4 },
      { label: "mm²", factor: 1e-6 },
    ],
  },
];

export function convert(value: number, fromLabel: string, toLabel: string, groupId: string): number {
  const group = UNIT_GROUPS.find(g => g.id === groupId);
  if (!group) return NaN;
  const from = group.units.find(u => u.label === fromLabel);
  const to   = group.units.find(u => u.label === toLabel);
  if (!from || !to) return NaN;
  return (value * from.factor) / to.factor;
}

export function getUnits(groupId: string): Unit[] {
  return UNIT_GROUPS.find(g => g.id === groupId)?.units ?? [];
}
