import Link from "next/link";

const STATS_TOOLS = [
  {
    href: "/statistics/descriptive",
    label: "Descriptive Statistics",
    desc: "Mean, median, SD, SEM, 95% CI, IQR, normality tests, outlier detection, and publication-ready output.",
    icon: "📊",
    soon: false,
    tags: ["Mean", "SD", "SEM", "95% CI", "Normality", "Outliers", "Export"],
  },
  {
    href: "#",
    label: "T-tests",
    desc: "One-sample, paired, and independent t-tests with effect size (Cohen's d) and power analysis.",
    icon: "⚖",
    soon: true,
    tags: ["One-sample", "Paired", "Independent", "Cohen's d", "Power"],
  },
  {
    href: "#",
    label: "ANOVA",
    desc: "One-way and two-way ANOVA with post-hoc tests (Tukey, Bonferroni, Dunnett).",
    icon: "📉",
    soon: true,
    tags: ["One-way", "Two-way", "Tukey", "Bonferroni", "Dunnett"],
  },
  {
    href: "#",
    label: "Non-parametric",
    desc: "Mann-Whitney U, Kruskal-Wallis, Wilcoxon signed-rank, and Friedman tests.",
    icon: "🔢",
    soon: true,
    tags: ["Mann-Whitney", "Kruskal-Wallis", "Wilcoxon", "Friedman"],
  },
  {
    href: "#",
    label: "Correlation",
    desc: "Pearson and Spearman correlation, linear regression with confidence bands.",
    icon: "📈",
    soon: true,
    tags: ["Pearson", "Spearman", "Linear regression", "R²"],
  },
  {
    href: "#",
    label: "Survival Analysis",
    desc: "Kaplan-Meier curves and log-rank test for time-to-event data.",
    icon: "⏱",
    soon: true,
    tags: ["Kaplan-Meier", "Log-rank", "Hazard ratio"],
  },
];

export default function StatisticsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <section className="py-16 px-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
          Statistics
        </h1>
        <p className="mt-3 text-base max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
          Publication-ready statistical analysis for life science researchers — built to match journal reporting standards.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STATS_TOOLS.map(f => (
            <div
              key={f.label}
              className="rounded-2xl border p-6 flex flex-col gap-4 transition-all"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
                opacity: f.soon ? 0.55 : 1,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <h2 className="text-base font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                    {f.label}
                  </h2>
                </div>
                {f.soon && (
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: "rgba(166,218,255,0.08)", color: "rgba(166,218,255,0.5)", border: "1px solid rgba(166,218,255,0.12)" }}
                  >
                    COMING SOON
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-auto">
                {f.tags.map(t => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(166,218,255,0.06)", color: "rgba(166,218,255,0.5)", border: "1px solid rgba(166,218,255,0.08)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {!f.soon ? (
                <Link
                  href={f.href}
                  className="mt-2 inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-medium transition-colors"
                  style={{ background: "var(--accent)", color: "#04070d" }}
                >
                  Open {f.label} →
                </Link>
              ) : (
                <div
                  className="mt-2 inline-flex items-center justify-center rounded-xl py-2.5 text-sm font-medium"
                  style={{ background: "rgba(166,218,255,0.05)", color: "rgba(166,218,255,0.3)", border: "1px solid rgba(166,218,255,0.08)" }}
                >
                  Coming soon
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
