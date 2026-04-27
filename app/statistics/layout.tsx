import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LabHelpr — Statistics",
  description: "Statistical analysis tools for life science researchers.",
};

export default function StatisticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
