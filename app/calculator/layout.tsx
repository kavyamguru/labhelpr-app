import CalcSidebar from "@/components/calculator/CalcSidebar";

export default function CalculatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-16 px-8 max-w-6xl mx-auto w-full text-center">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4 text-glow">
          Lab Calculators
        </h1>
        <p className="text-lg text-white/50 font-light">Interactive bench tools for wet lab scientists.</p>
      </header>

      <div className="sticky top-[60px] z-40 bg-[#050505]/60 backdrop-blur-xl border-y border-white/5">
        <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar px-6">
          <CalcSidebar />
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full py-12 px-8">
        {children}
      </main>
    </div>
  );
}
