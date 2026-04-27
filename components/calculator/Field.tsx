"use client";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  unitOptions?: string[];
  onUnitChange?: (u: string) => void;
  hint?: string;
  type?: "number" | "text";
}

export function InputField({
  label, value, onChange, placeholder = "0",
  unit, unitOptions, onUnitChange, hint, type = "number",
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 transition-all"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          onFocus={e => (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        {unitOptions && onUnitChange ? (
          <select
            value={unit}
            onChange={e => onUnitChange(e.target.value)}
            className="rounded-lg px-2 py-2 text-sm font-medium outline-none focus:ring-2 transition-all min-w-[80px]"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        ) : unit ? (
          <span
            className="flex items-center px-3 py-2 rounded-lg text-sm font-medium min-w-[64px] justify-center"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      {hint && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

interface OutputFieldProps {
  label: string;
  value: string;
  unit?: string;
  warning?: string;
  secondary?: string;
}

export function OutputField({ label, value, unit, warning, secondary }: OutputFieldProps) {
  return (
    <div className="rounded-xl p-4 space-y-1" style={{ background: "var(--output-bg)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-2xl font-mono font-semibold tabular-nums" style={{ color: "var(--output-text)" }}>
        {value}
        {unit && <span className="text-base font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>{unit}</span>}
      </p>
      {secondary && <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{secondary}</p>}
      {warning && <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>⚠ {warning}</p>}
    </div>
  );
}

interface SectionDividerProps { label: string }
export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
    </div>
  );
}
