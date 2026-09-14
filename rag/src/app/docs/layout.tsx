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
    <div className="min-h-screen flex bg-white text-slate-900 selection:bg-slate-900 selection:text-white relative">
      {/* 100vh Tactical Sidebar */}
      <DocsSidebar />

      {/* Main Documentation Shell */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sovereign Header */}
        <DocsHeader />

        {/* Content Viewport */}
        <main className="flex-1 min-w-0 bg-white px-3.5 sm:px-6 md:px-8 lg:px-16 xl:px-20 py-4 sm:py-8 lg:py-10 pb-24 sm:pb-16">
          <div className="docs-main-container max-w-4xl w-full mx-auto">{children}</div>
        </main>
      </div>

      {/* Global Floating Tactical Assistant Trigger */}
      <FloatingAssistant />
    </div>
  );
}

