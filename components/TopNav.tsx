"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { name: "Home",        href: "/",           soon: false },
  { name: "Calculators", href: "/calculator", soon: false },
  { name: "Statistics",  href: "/statistics", soon: false },
  { name: "Notebook",    href: "/notebook",   soon: false },
];

export function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-[60px]"
      style={{
        background: "rgba(8,9,10,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 shrink-0">
        <img
          src="/logo-beaker.png"
          alt="LabHelpr"
          className="w-8 h-8 object-contain"
          style={{ filter: "drop-shadow(0 0 8px rgba(166,218,255,0.4))" }}
        />
        <span className="text-[15px] font-semibold tracking-[-0.03em]" style={{ color: "rgb(228,233,242)" }}>
          Lab<span style={{ color: "#a6daff" }}>Helpr</span>
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-1">
        {NAV.map(item => {
          const active = !item.soon && (item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium tracking-[-0.03em] transition-colors duration-200"
              style={{
                color: item.soon ? "rgba(184,199,217,0.3)" : active ? "#ffffff" : "rgba(184,199,217,0.75)",
                background: active ? "rgba(166,218,255,0.06)" : "transparent",
                pointerEvents: item.soon ? "none" : "auto",
              }}
            >
              {item.name}
              {item.soon && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(166,218,255,0.07)", color: "rgba(166,218,255,0.4)" }}>
                  SOON
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <button className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-[5px]" onClick={() => setOpen(o => !o)}>
        <span className="w-[18px] h-[1.5px] rounded-full bg-white/60" />
        <span className="w-[18px] h-[1.5px] rounded-full bg-white/60" />
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-[60px] z-40 flex flex-col gap-1 p-4 md:hidden"
          style={{ background: "rgba(4,7,13,0.97)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          {NAV.map(item => (
            <div
              key={item.name}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-[14px] font-medium"
              style={{ color: item.soon ? "rgba(184,199,217,0.3)" : "rgba(228,233,242,0.85)" }}
              onClick={() => { if (!item.soon) setOpen(false); }}
            >
              {item.soon ? item.name : <Link href={item.href} onClick={() => setOpen(false)}>{item.name}</Link>}
              {item.soon && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(166,218,255,0.08)", color: "rgba(166,218,255,0.45)" }}>
                  SOON
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
