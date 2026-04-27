"use client";
import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    href: "/calculator",
    label: "Calculator",
    desc: "12 bench tools — molarity, dilution, PCR mastermix, OD600, molecular weight, and more.",
    icon: "⚗",
    soon: false,
    tools: ["Molarity", "Dilution", "Centrifuge", "PCR Mastermix", "A260", "OD600", "Serial Dilution", "Molecular Weight"],
  },
  {
    href: "/statistics",
    label: "Statistics",
    desc: "Descriptive stats, t-tests, ANOVA, correlation, survival analysis — all in your browser.",
    icon: "📊",
    soon: false,
    tools: ["Descriptive", "T-tests", "ANOVA", "Correlation", "Non-parametric", "Survival"],
  },
  {
    href: "#",
    label: "Notebook",
    desc: "Record experiments, manage samples, track inventory, and keep your lab organised.",
    icon: "📓",
    soon: true,
    tools: ["Experiments", "Samples", "Inventory", "Instruments", "Tasks", "Calendar"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero */}
      <section className="py-24 px-6 text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo-beaker.png"
            alt="LabHelpr"
            width={80}
            height={80}
            className="object-contain"
            style={{ filter: "drop-shadow(0 0 24px rgba(166,218,255,0.45))" }}
          />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-glow" style={{ color: "var(--text)" }}>
          Lab<span style={{ color: "#a6daff" }}>Helpr</span>
        </h1>
        <p className="mt-4 text-lg max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
          Your all-in-one toolkit for wet lab science — calculators, statistics, and a lab notebook in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3 flex-wrap">
          <Link href="/calculator" className="btn-primary text-sm px-6 py-3">
            Open Calculators
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.label}
              className="rounded-2xl border p-6 flex flex-col gap-4 transition-all"
              style={{
                background: "var(--bg-card)",
                borderColor: "var(--border)",
                opacity: f.soon ? 0.6 : 1,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
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

              {/* Description */}
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>

              {/* Tool tags */}
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {f.tools.map(t => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(166,218,255,0.06)", color: "rgba(166,218,255,0.5)", border: "1px solid rgba(166,218,255,0.08)" }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* CTA */}
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
