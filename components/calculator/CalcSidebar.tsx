"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CALCS = [
  { href: "/calculator/unit-conversion",  label: "Unit Conversion" },
  { href: "/calculator/dilution",         label: "Dilution" },
  { href: "/calculator/molarity",         label: "Molarity" },
  { href: "/calculator/centrifuge",       label: "Centrifuge" },
  { href: "/calculator/pcr-mastermix",    label: "PCR Mastermix" },
  { href: "/calculator/a260",             label: "A260" },
  { href: "/calculator/serial-dilution",  label: "Serial Dilution" },
  { href: "/calculator/stock-prep",       label: "Stock Prep" },
  { href: "/calculator/concentration",    label: "Conc. Converter" },
  { href: "/calculator/od600",            label: "OD600" },
  { href: "/calculator/molecular-weight", label: "Molecular Wt." },
  { href: "/calculator/cell-seeding",     label: "Cell Seeding" },
];

export default function CalcSidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center justify-center gap-8 min-w-max h-16">
      {CALCS.map(c => {
        const active = pathname === c.href;
        return (
          <Link
            key={c.href}
            href={c.href}
            className={`flex items-center h-full text-[13px] tracking-wide uppercase transition-all duration-300 border-b-2 ${
              active
                ? "border-white text-white font-semibold shadow-[0_4px_15px_rgba(255,255,255,0.3)]"
                : "border-transparent text-white/40 hover:text-white/80 hover:border-white/20 font-medium"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </nav>
  );
}
