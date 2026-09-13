import type { Metadata } from "next";
import { DocsSidebar } from "@/components/docs-sidebar";
import { DocsHeader } from "@/components/docs-header";
import { FloatingAssistant } from "@/components/FloatingAssistant";

export const metadata: Metadata = {
  title: "NTRO Bitcoin Forensic Intelligence System — Technical Documentation",
  description: "Offline Sovereign Intelligence Platform for Monitoring Bitcoin Transaction Traffic & Illicit Flow De-anonymization",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 selection:bg-slate-900 selection:text-white relative">
      {/* Sovereign Header */}
      <DocsHeader />

      {/* Main Documentation Shell */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sticky Tactical Sidebar */}
        <DocsSidebar />

        {/* Content Viewport */}
        <main className="flex-1 min-w-0 bg-white px-6 sm:px-10 lg:px-12 py-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Global Floating Tactical Assistant Trigger */}
      <FloatingAssistant />
    </div>
  );
}
