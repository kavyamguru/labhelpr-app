"use client";
import { useState, useCallback, useMemo } from "react";
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, ErrorBar, ReferenceLine,
  ComposedChart, Line,
} from "recharts";
import {
  computeStats, shapiroWilk, dagostinoPearson,
  grubbsTest, iqrOutliers,
  parsePasteInput, fmtP, fmtN,
  type DescStats, type NormalityResult, type GrubbsResult, type IQROutlier,
} from "@/lib/stats/descriptive";

// ── color palette ────────────────────────────────────────────────────────────
const COLORS = ["#a6daff", "#7dd3b4", "#f0a070", "#c4a0f0", "#f5d88a", "#f0879a"];

interface Group {
  id: string;
  label: string;
  raw: string;
  values: number[];
  excluded: Set<number>; // indices excluded by user
}

type Transform = "none" | "log10" | "log2" | "ln";
type ErrorType = "sd" | "sem" | "ci95";
type PlotType = "dot" | "box" | "bar" | "histogram" | "qq";

function newGroup(id: string, label = ""): Group {
  return { id, label, raw: "", values: [], excluded: new Set() };
}

function applyTransform(values: number[], t: Transform): number[] {
  if (t === "none") return values;
  return values.map(v => {
    if (t === "log10") return v > 0 ? Math.log10(v) : NaN;
    if (t === "log2")  return v > 0 ? Math.log2(v)  : NaN;
    if (t === "ln")    return v > 0 ? Math.log(v)   : NaN;
    return v;
  }).filter(isFinite);
}

// ── compact stat row ────────────────────────────────────────────────────────
function StatRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b" style={{ borderColor: "rgba(166,218,255,0.07)" }}>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-sm font-mono font-medium tabular-nums" style={{ color: warn ? "#f59e0b" : "var(--output-text)" }}>{value}</span>
    </div>
  );
}

// ── dot/strip plot ───────────────────────────────────────────────────────────
function DotPlot({ groups, transform }: { groups: Group[]; transform: Transform }) {
  const data = groups.flatMap((g, gi) =>
    applyTransform(
      g.values.filter((_, i) => !g.excluded.has(i)),
      transform,
    ).map((v, vi) => ({ group: gi, x: gi + 1 + (Math.random() - 0.5) * 0.25, y: v, label: g.label || `G${gi+1}`, vi }))
  );

  const stats = groups.map((g, gi) => {
    const vals = applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
    if (vals.length < 2) return null;
    const s = computeStats(vals);
    return { group: gi + 1, mean: s.mean, low: s.ci95Low, high: s.ci95High };
  }).filter(Boolean) as { group: number; mean: number; low: number; high: number }[];

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,218,255,0.06)" />
        <XAxis
          dataKey="x" type="number"
          domain={[0.5, groups.length + 0.5]}
          ticks={groups.map((_, i) => i + 1)}
          tickFormatter={i => {
            const g = groups[Math.round(i) - 1];
            return g?.label || `G${Math.round(i)}`;
          }}
          tick={{ fill: "rgba(166,218,255,0.6)", fontSize: 11 }}
          axisLine={{ stroke: "rgba(166,218,255,0.1)" }}
          tickLine={false}
        />
        <YAxis tick={{ fill: "rgba(166,218,255,0.6)", fontSize: 11 }} axisLine={{ stroke: "rgba(166,218,255,0.1)" }} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#10131c", border: "1px solid rgba(166,218,255,0.15)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#a6daff" }}
          formatter={(v: unknown) => [fmtN(v as number), "value"]}
        />
        {groups.map((g, gi) => {
          const pts = data.filter(d => d.group === gi);
          return (
            <Scatter
              key={g.id}
              data={pts}
              dataKey="y"
              fill={COLORS[gi % COLORS.length]}
              fillOpacity={0.75}
              r={4}
            />
          );
        })}
        {stats.map(s => (
          <ReferenceLine key={s.group} x={s.group} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── bar + error bar chart ────────────────────────────────────────────────────
function BarErrorChart({ groups, transform, errorType }: { groups: Group[]; transform: Transform; errorType: ErrorType }) {
  const data = groups.map((g, gi) => {
    const vals = applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
    if (vals.length < 2) return null;
    const s = computeStats(vals);
    const err = errorType === "sd" ? s.sd : errorType === "sem" ? s.sem : (s.ci95High - s.mean);
    return {
      name: g.label || `G${gi+1}`,
      mean: parseFloat(s.mean.toPrecision(4)),
      err,
      fill: COLORS[gi % COLORS.length],
    };
  }).filter(Boolean) as { name: string; mean: number; err: number; fill: string }[];

  if (data.length === 0) return null;
  const label = errorType === "sd" ? "± SD" : errorType === "sem" ? "± SEM" : "95% CI";

  return (
    <div>
      <p className="text-xs mb-2 text-right" style={{ color: "var(--text-muted)" }}>Error bars: {label}</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,218,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(166,218,255,0.6)", fontSize: 11 }} axisLine={{ stroke: "rgba(166,218,255,0.1)" }} tickLine={false} />
          <YAxis tick={{ fill: "rgba(166,218,255,0.6)", fontSize: 11 }} axisLine={{ stroke: "rgba(166,218,255,0.1)" }} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#10131c", border: "1px solid rgba(166,218,255,0.15)", borderRadius: 8, fontSize: 12 }}
            formatter={(v: unknown) => [fmtN(v as number)]}
          />
          <Bar dataKey="mean" radius={[4, 4, 0, 0]}>
            <ErrorBar dataKey="err" width={6} strokeWidth={2} stroke="rgba(255,255,255,0.6)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── histogram ────────────────────────────────────────────────────────────────
function Histogram({ values, color }: { values: number[]; color: string }) {
  if (values.length < 3) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const bins = Math.max(5, Math.min(20, Math.ceil(Math.sqrt(values.length))));
  const width = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  values.forEach(v => {
    const i = Math.min(bins - 1, Math.floor((v - min) / width));
    counts[i]++;
  });
  const data = counts.map((c, i) => ({ x: fmtN(min + i * width + width / 2, 3), count: c }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,218,255,0.06)" />
        <XAxis dataKey="x" tick={{ fill: "rgba(166,218,255,0.5)", fontSize: 10 }} axisLine={{ stroke: "rgba(166,218,255,0.1)" }} tickLine={false} />
        <YAxis tick={{ fill: "rgba(166,218,255,0.5)", fontSize: 10 }} axisLine={{ stroke: "rgba(166,218,255,0.1)" }} tickLine={false} />
        <Bar dataKey="count" fill={color} fillOpacity={0.7} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Q-Q plot ─────────────────────────────────────────────────────────────────
function QQPlot({ values, color }: { values: number[]; color: string }) {
  if (values.length < 4) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));

  function probit(p: number): number {
    // simple rational approximation
    const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
    const x = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    return p < 0.5 ? -x : x;
  }

  const pts = sorted.map((v, i) => {
    const theoretical = mean + sd * probit((i + 0.5) / n);
    return { theoretical: parseFloat(fmtN(theoretical, 4)), observed: parseFloat(fmtN(v, 4)) };
  });

  const refMin = Math.min(...pts.map(p => p.theoretical));
  const refMax = Math.max(...pts.map(p => p.theoretical));
  const refLine = [{ theoretical: refMin, ref: refMin }, { theoretical: refMax, ref: refMax }];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(166,218,255,0.06)" />
        <XAxis dataKey="theoretical" type="number" name="Theoretical quantile" tick={{ fill: "rgba(166,218,255,0.5)", fontSize: 10 }} tickLine={false} label={{ value: "Theoretical", position: "insideBottom", offset: -12, fill: "rgba(166,218,255,0.4)", fontSize: 10 }} />
        <YAxis dataKey="observed" type="number" name="Observed" tick={{ fill: "rgba(166,218,255,0.5)", fontSize: 10 }} tickLine={false} label={{ value: "Observed", angle: -90, position: "insideLeft", fill: "rgba(166,218,255,0.4)", fontSize: 10 }} />
        <Tooltip contentStyle={{ background: "#10131c", border: "1px solid rgba(166,218,255,0.15)", borderRadius: 8, fontSize: 11 }} />
        <Scatter data={pts} dataKey="observed" fill={color} fillOpacity={0.7} r={3} />
        <Line data={refLine} dataKey="ref" stroke="rgba(255,255,255,0.25)" strokeWidth={1} dot={false} type="linear" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── methods sentence ──────────────────────────────────────────────────────────
function generateMethods(groups: Group[], transform: Transform, errorType: ErrorType, normalityResults: NormalityResult[]): string {
  const n_total = groups.reduce((s, g) => s + g.values.filter((_, i) => !g.excluded.has(i)).length, 0);
  if (n_total === 0) return "";

  const transformText = transform !== "none"
    ? ` Data were ${transform === "log10" ? "log\u2081\u2080" : transform === "log2" ? "log\u2082" : "ln"}-transformed prior to analysis.`
    : "";

  const allNormal = normalityResults.length > 0 && normalityResults.every(r => r.normal);
  const normalityTest = normalityResults.length > 0 ? normalityResults[0].test : "";
  const normalityText = normalityResults.length > 0
    ? ` Normality was assessed using the ${normalityTest} test.`
    : "";

  const nonParamNote = normalityResults.length > 0 && !allNormal
    ? " As data did not pass the normality test, non-parametric analyses are recommended."
    : "";

  const errorLabel = errorType === "sd" ? "standard deviation (SD)" : errorType === "sem" ? "standard error of the mean (SEM)" : "95% confidence interval (95% CI)";

  const groupDesc = groups.length > 1
    ? `${groups.length} groups (${groups.map((g, i) => g.label || `Group ${i+1}`).join(", ")})`
    : `one group (n = ${n_total})`;

  return `Data are presented as mean ± ${errorLabel} for ${groupDesc}.${transformText}${normalityText}${nonParamNote} Statistical analyses were performed using LabHelpr (labhelpr.vercel.app).`;
}

// ── export to CSV ─────────────────────────────────────────────────────────────
function exportCSV(groups: Group[], transform: Transform) {
  const rows: string[][] = [];
  // Header
  const headers = ["Group", "N", "Mean", "Median", "SD", "SEM", "95% CI Low", "95% CI High", "IQR", "Min", "Max", "CV%"];
  rows.push(headers);

  groups.forEach((g, gi) => {
    const vals = applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
    if (vals.length < 2) return;
    const s = computeStats(vals);
    rows.push([
      g.label || `Group${gi+1}`,
      String(s.n), fmtN(s.mean), fmtN(s.median), fmtN(s.sd), fmtN(s.sem),
      fmtN(s.ci95Low), fmtN(s.ci95High), fmtN(s.iqr), fmtN(s.min), fmtN(s.max),
      isFinite(s.cv) ? fmtN(s.cv) + "%" : "—",
    ]);
  });

  // Raw data
  rows.push([]);
  rows.push(["--- Raw Data ---"]);
  const maxLen = Math.max(...groups.map(g => g.values.length));
  rows.push(groups.map((g, i) => g.label || `Group${i+1}`));
  for (let r = 0; r < maxLen; r++) {
    rows.push(groups.map(g => g.values[r] !== undefined ? String(g.values[r]) : ""));
  }

  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "descriptive_stats.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
export default function DescriptiveStatsPage() {
  const [groups, setGroups] = useState<Group[]>([newGroup("g1", "Group 1")]);
  const [transform, setTransform] = useState<Transform>("none");
  const [errorType, setErrorType] = useState<ErrorType>("sd");
  const [plotType, setPlotType] = useState<PlotType>("dot");
  const [showOutliers, setShowOutliers] = useState(false);
  const [showMethods, setShowMethods] = useState(false);
  const [copiedMethods, setCopiedMethods] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);

  // ── computed values ────────────────────────────────────────────────────────
  const groupStats = useMemo(() =>
    groups.map(g => {
      const vals = applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
      return vals.length >= 2 ? computeStats(vals) : null;
    }),
  [groups, transform]);

  const normalityResults = useMemo(() =>
    groups.map(g => {
      const vals = applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
      if (vals.length < 3) return null;
      return vals.length <= 50 ? shapiroWilk(vals) : dagostinoPearson(vals);
    }),
  [groups, transform]);

  const grubbsResults = useMemo(() =>
    groups.map(g => {
      const vals = g.values.filter((_, i) => !g.excluded.has(i));
      return vals.length >= 3 ? grubbsTest(vals) : null;
    }),
  [groups]);

  const iqrOutlierResults = useMemo(() =>
    groups.map(g => {
      const vals = g.values.filter((_, i) => !g.excluded.has(i));
      return vals.length >= 4 ? iqrOutliers(vals) : [];
    }),
  [groups]);

  const methodsText = useMemo(() =>
    generateMethods(groups, transform, errorType, normalityResults.filter(Boolean) as NormalityResult[]),
  [groups, transform, errorType, normalityResults]);

  // ── group mutations ─────────────────────────────────────────────────────────
  const updateGroupRaw = useCallback((idx: number, raw: string) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== idx) return g;
      const values = parsePasteInput(raw);
      return { ...g, raw, values, excluded: new Set<number>() };
    }));
  }, []);

  const updateGroupLabel = useCallback((idx: number, label: string) => {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, label } : g));
  }, []);

  const addGroup = () => {
    const id = `g${Date.now()}`;
    setGroups(prev => [...prev, newGroup(id, `Group ${prev.length + 1}`)]);
    setActiveGroup(groups.length);
  };

  const removeGroup = (idx: number) => {
    if (groups.length === 1) return;
    setGroups(prev => prev.filter((_, i) => i !== idx));
    setActiveGroup(Math.max(0, activeGroup - 1));
  };

  const toggleExclude = (groupIdx: number, valueIdx: number) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== groupIdx) return g;
      const excluded = new Set(g.excluded);
      excluded.has(valueIdx) ? excluded.delete(valueIdx) : excluded.add(valueIdx);
      return { ...g, excluded };
    }));
  };

  // ── plot data for active group ─────────────────────────────────────────────
  const activeVals = useMemo(() => {
    const g = groups[activeGroup];
    return applyTransform(g.values.filter((_, i) => !g.excluded.has(i)), transform);
  }, [groups, activeGroup, transform]);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Descriptive Statistics
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Paste your data, get publication-ready summary statistics, normality tests, and figures.
          </p>
        </div>

        {/* Transform + Error bar controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Transform</span>
            {(["none", "log10", "log2", "ln"] as Transform[]).map(t => (
              <button
                key={t}
                onClick={() => setTransform(t)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: transform === t ? "var(--accent)" : "var(--bg-card)",
                  color: transform === t ? "#04070d" : "var(--text-muted)",
                  border: `1px solid ${transform === t ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {t === "none" ? "None" : t === "log10" ? "log₁₀" : t === "log2" ? "log₂" : "ln"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Error bars</span>
            {(["sd", "sem", "ci95"] as ErrorType[]).map(e => (
              <button
                key={e}
                onClick={() => setErrorType(e)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: errorType === e ? "var(--accent)" : "var(--bg-card)",
                  color: errorType === e ? "#04070d" : "var(--text-muted)",
                  border: `1px solid ${errorType === e ? "var(--accent)" : "var(--border)"}`,
                }}
              >
                {e === "sd" ? "SD" : e === "sem" ? "SEM" : "95% CI"}
              </button>
            ))}
          </div>
        </div>

        {/* Main grid: input + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Left: data input */}
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Data Input</h2>
              <button
                onClick={addGroup}
                className="text-xs px-3 py-1 rounded-lg border transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              >
                + Add group
              </button>
            </div>

            {/* Group tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {groups.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(i)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: activeGroup === i ? COLORS[i % COLORS.length] + "22" : "transparent",
                    color: activeGroup === i ? COLORS[i % COLORS.length] : "var(--text-muted)",
                    border: `1px solid ${activeGroup === i ? COLORS[i % COLORS.length] + "55" : "var(--border)"}`,
                  }}
                >
                  {g.label || `G${i+1}`} {g.values.length > 0 && `(n=${g.values.filter((_, j) => !g.excluded.has(j)).length})`}
                </button>
              ))}
            </div>

            {/* Active group editor */}
            {groups[activeGroup] && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={groups[activeGroup].label}
                    onChange={e => updateGroupLabel(activeGroup, e.target.value)}
                    placeholder="Group name"
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
                  />
                  {groups.length > 1 && (
                    <button
                      onClick={() => removeGroup(activeGroup)}
                      className="px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: "rgba(240,100,90,0.12)", color: "#f06459", border: "1px solid rgba(240,100,90,0.2)" }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    Paste data — one value per line, or tab/comma separated (e.g. from Excel)
                  </label>
                  <textarea
                    value={groups[activeGroup].raw}
                    onChange={e => updateGroupRaw(activeGroup, e.target.value)}
                    placeholder={"23.4\n18.7\n25.1\n21.3\n19.8"}
                    rows={8}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-mono outline-none resize-none"
                    style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", lineHeight: 1.6 }}
                  />
                </div>

                {groups[activeGroup].values.length > 0 && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {groups[activeGroup].values.length} values parsed
                    {groups[activeGroup].excluded.size > 0 && ` · ${groups[activeGroup].excluded.size} excluded`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: stats table */}
          <div className="space-y-4">
            {groups.map((g, gi) => {
              const s = groupStats[gi];
              if (!s) return (
                <div key={g.id} className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{g.label || `Group ${gi+1}`} — enter ≥ 2 values</p>
                </div>
              );
              const norm = normalityResults[gi];
              const cvWarn = isFinite(s.cv) && s.cv > 15;
              return (
                <div key={g.id} className="rounded-2xl border p-5 space-y-1" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: COLORS[gi % COLORS.length] }}>
                      {g.label || `Group ${gi+1}`}
                    </h3>
                    {norm && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: norm.normal ? "rgba(100,220,130,0.1)" : "rgba(240,100,90,0.1)",
                          color: norm.normal ? "#64dc82" : "#f06459",
                          border: `1px solid ${norm.normal ? "rgba(100,220,130,0.2)" : "rgba(240,100,90,0.2)"}`,
                        }}
                      >
                        {norm.normal ? "Normal" : "Non-normal"} (p={fmtP(norm.p)})
                      </span>
                    )}
                  </div>
                  <StatRow label="N" value={String(s.n)} />
                  <StatRow label="Mean" value={fmtN(s.mean)} />
                  <StatRow label="Median" value={fmtN(s.median)} />
                  <StatRow label="SD" value={fmtN(s.sd)} />
                  <StatRow label="SEM" value={fmtN(s.sem)} />
                  <StatRow label="95% CI" value={`[${fmtN(s.ci95Low)}, ${fmtN(s.ci95High)}]`} />
                  <StatRow label="IQR (Q1 – Q3)" value={`${fmtN(s.q1)} – ${fmtN(s.q3)}`} />
                  <StatRow label="Min / Max" value={`${fmtN(s.min)} / ${fmtN(s.max)}`} />
                  <StatRow label="CV%" value={isFinite(s.cv) ? `${fmtN(s.cv, 3)}%` : "—"} warn={cvWarn} />
                  <StatRow label="Skewness" value={fmtN(s.skewness, 3)} />
                  <StatRow label="Excess kurtosis" value={fmtN(s.kurtosis, 3)} />
                  {s.geomMean !== null && <StatRow label="Geometric mean" value={fmtN(s.geomMean)} />}
                  {cvWarn && (
                    <p className="text-xs pt-1" style={{ color: "#f59e0b" }}>
                      ⚠ CV% &gt; 15% — high variability, check your data
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Normality section */}
        {normalityResults.some(Boolean) && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Normality Test</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groups.map((g, gi) => {
                const r = normalityResults[gi];
                if (!r) return null;
                return (
                  <div key={g.id} className="rounded-xl p-3 space-y-1" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <p className="text-xs font-medium" style={{ color: COLORS[gi % COLORS.length] }}>{g.label || `Group ${gi+1}`}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{r.test}</p>
                    <p className="text-sm font-mono" style={{ color: "var(--output-text)" }}>
                      stat = {fmtN(r.stat, 4)}, p = {fmtP(r.p)}
                    </p>
                    <p className="text-xs font-medium" style={{ color: r.normal ? "#64dc82" : "#f06459" }}>
                      {r.normal
                        ? "Normally distributed (parametric tests OK)"
                        : "Not normal — consider Mann-Whitney / Kruskal-Wallis"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              Shapiro-Wilk used for n ≤ 50; D'Agostino-Pearson K² for n &gt; 50. Threshold: p &gt; 0.05 = normal.
            </p>
          </div>
        )}

        {/* Outlier detection */}
        <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Outlier Detection</h2>
            <button
              onClick={() => setShowOutliers(v => !v)}
              className="text-xs px-3 py-1 rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              {showOutliers ? "Hide" : "Show"}
            </button>
          </div>
          {showOutliers && groups.map((g, gi) => {
            const grubbs = grubbsResults[gi];
            const iqrOut = iqrOutlierResults[gi];
            if (!grubbs && iqrOut.length === 0) return (
              <p key={g.id} className="text-xs" style={{ color: "var(--text-muted)" }}>{g.label || `G${gi+1}`}: no outliers detected (n &lt; 3)</p>
            );
            return (
              <div key={g.id} className="rounded-xl p-3 space-y-2" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-medium" style={{ color: COLORS[gi % COLORS.length] }}>{g.label || `Group ${gi+1}`}</p>

                {grubbs && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Grubbs test (α = 0.05)</p>
                    <p className="text-sm font-mono" style={{ color: grubbs.isOutlier ? "#f06459" : "var(--text-muted)" }}>
                      {grubbs.isOutlier
                        ? `Outlier detected: ${fmtN(grubbs.outlierValue)} (G = ${fmtN(grubbs.gStat, 3)}, G_crit = ${fmtN(grubbs.gCrit, 3)})`
                        : `No significant outlier (G = ${fmtN(grubbs.gStat, 3)}, G_crit = ${fmtN(grubbs.gCrit, 3)})`
                      }
                    </p>
                    {grubbs.isOutlier && (
                      <button
                        onClick={() => toggleExclude(gi, grubbs.outlierIndex)}
                        className="text-xs px-2.5 py-1 rounded-lg"
                        style={{
                          background: g.excluded.has(grubbs.outlierIndex) ? "rgba(100,220,130,0.12)" : "rgba(240,100,90,0.12)",
                          color: g.excluded.has(grubbs.outlierIndex) ? "#64dc82" : "#f06459",
                          border: `1px solid ${g.excluded.has(grubbs.outlierIndex) ? "rgba(100,220,130,0.2)" : "rgba(240,100,90,0.2)"}`,
                        }}
                      >
                        {g.excluded.has(grubbs.outlierIndex) ? "Restored" : "Exclude outlier"}
                      </button>
                    )}
                  </div>
                )}

                {iqrOut.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>IQR method</p>
                    {iqrOut.map(o => (
                      <div key={o.index} className="flex items-center gap-2">
                        <span className="text-sm font-mono" style={{ color: o.type === "extreme" ? "#f06459" : "#f59e0b" }}>
                          {fmtN(o.value)} ({o.type})
                        </span>
                        <button
                          onClick={() => toggleExclude(gi, o.index)}
                          className="text-xs px-2 py-0.5 rounded-lg"
                          style={{
                            background: g.excluded.has(o.index) ? "rgba(100,220,130,0.1)" : "rgba(240,100,90,0.1)",
                            color: g.excluded.has(o.index) ? "#64dc82" : "#f06459",
                          }}
                        >
                          {g.excluded.has(o.index) ? "Restore" : "Exclude"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {iqrOut.length === 0 && grubbs && !grubbs.isOutlier && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>No outliers detected by IQR ± 1.5×</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Plots */}
        {groups.some(g => g.values.filter((_, i) => !g.excluded.has(i)).length >= 2) && (
          <div className="rounded-2xl border p-5 space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold mr-2" style={{ color: "var(--text)" }}>Visualisation</h2>
              {(["dot", "bar", "histogram", "qq"] as PlotType[]).map(pt => (
                <button
                  key={pt}
                  onClick={() => setPlotType(pt)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: plotType === pt ? "var(--accent)" : "transparent",
                    color: plotType === pt ? "#04070d" : "var(--text-muted)",
                    border: `1px solid ${plotType === pt ? "var(--accent)" : "var(--border)"}`,
                  }}
                >
                  {pt === "dot" ? "Strip" : pt === "bar" ? "Bar+Error" : pt === "histogram" ? "Histogram" : "Q-Q"}
                </button>
              ))}
              <p className="text-xs ml-auto" style={{ color: "var(--text-dim)" }}>
                {plotType === "dot" && "Strip plot — each dot = one observation (recommended n ≤ 20, eLife guidelines)"}
                {plotType === "bar" && `Bar chart ± ${errorType.toUpperCase().replace("CI95","95% CI")}`}
                {plotType === "histogram" && "Frequency distribution (active group)"}
                {plotType === "qq" && "Q-Q plot for normality assessment (active group)"}
              </p>
            </div>

            {plotType === "dot" && <DotPlot groups={groups} transform={transform} />}
            {plotType === "bar" && <BarErrorChart groups={groups} transform={transform} errorType={errorType} />}
            {plotType === "histogram" && activeVals.length >= 3 && (
              <Histogram values={activeVals} color={COLORS[activeGroup % COLORS.length]} />
            )}
            {plotType === "qq" && activeVals.length >= 4 && (
              <QQPlot values={activeVals} color={COLORS[activeGroup % COLORS.length]} />
            )}

            {plotType === "bar" && (
              <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                Note: Bar charts with error bars are discouraged for n &lt; 10 (Weissgerber et al. 2015, PLOS Biology). Consider strip plot for small n.
              </p>
            )}
          </div>
        )}

        {/* Methods sentence + export */}
        <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Publication Output</h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Methods sentence</p>
            <div
              className="rounded-xl p-3 text-sm leading-relaxed"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-body)" }}
            >
              {methodsText || <span style={{ color: "var(--text-dim)" }}>Enter data to generate methods text.</span>}
            </div>
            {methodsText && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(methodsText);
                  setCopiedMethods(true);
                  setTimeout(() => setCopiedMethods(false), 1500);
                }}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ background: copiedMethods ? "#16a34a" : "var(--accent)", color: copiedMethods ? "#fff" : "#04070d" }}
              >
                {copiedMethods ? "Copied!" : "Copy methods text"}
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={() => exportCSV(groups, transform)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              Export CSV (source data)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
