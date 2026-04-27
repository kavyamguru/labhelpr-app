"use client";
import { useState } from "react";

interface CalcLayoutProps {
  title: string;
  description: string;
  tips?: React.ReactNode;
  onReset: () => void;
  copyText?: string;
  children: React.ReactNode;
}

export default function CalcLayout({ title, description, tips, onReset, copyText, children }: CalcLayoutProps) {
  const [copied, setCopied] = useState(false);
  const [showTips, setShowTips] = useState(false);

  function handleCopy() {
    if (!copyText) return;
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>{title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{description}</p>
      </div>

      <div className="rounded-2xl border p-6 space-y-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        {children}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          Reset
        </button>
        {copyText !== undefined && (
          <button
            onClick={handleCopy}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ background: copied ? "#16a34a" : "var(--accent)", color: "#fff" }}
          >
            {copied ? "Copied!" : "Copy result"}
          </button>
        )}
        {tips && (
          <button
            onClick={() => setShowTips(v => !v)}
            className="ml-auto px-3 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {showTips ? "Hide tips" : "Tips / Formula"}
          </button>
        )}
      </div>

      {tips && showTips && (
        <div className="rounded-xl border p-4 text-sm space-y-2"
          style={{ background: "var(--accent-light)", borderColor: "var(--accent)", color: "var(--text-muted)" }}>
          {tips}
        </div>
      )}
    </div>
  );
}
