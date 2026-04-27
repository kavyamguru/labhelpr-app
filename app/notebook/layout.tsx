import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LabHelpr — Lab Notebook",
  description: "Digital lab notebook for life science researchers.",
};

export default function NotebookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
