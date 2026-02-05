import Link from "next/link";

export default function CalculatorPage() {
  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <h1>Lab Calculator</h1>
      <p style={{ marginBottom: 16 }}>
        Quick life-science calculations commonly used at the bench.
      </p>

      <ul style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <li>
          <Link href="/calculator/unit-conversion">
            → Unit Conversion (µL ↔ mL, µM ↔ mM, etc.)
          </Link>
        </li>

	<li>
	  <Link href="/calculator/dilution">
	→ Dilution Calculator (C1V1 = C2V2)</Link>
	</li>

	<li>
	  <Link href="/calculator/molarity">→ Molarity Calculator (grams ↔ molarity)</Link>
	</li>

	<li>
	  <Link href="/calculator/centrifuge">→ Centrifuge (RCF ↔ RPM)</Link>
	</li>

	<li>
	  <Link href="/calculator/pcr-mastermix">→ PCR Mastermix</Link>
	</li>

	<li>
	  <Link href="/calculator/a260">→ A260 (DNA/RNA concentration)</Link>
	</li>
	
	<li>
	  <Link href="/calculator/serial-dilution">→ Serial Dilution</Link>
	</li>

	<li>
	  <a href="/calculator/stock-prep">→ Stock Preparation</a>
	</li>
	        
	<li>
	  <Link href="/calculator/od600">→ OD600 (cells/mL + dilution)</Link>
	</li>
	
	<li>
	  <Link href="/calculator/molecular-weight">→ Molecular Weight (from formula)</Link>
	</li>

      </ul>
    </main>
  );
}

