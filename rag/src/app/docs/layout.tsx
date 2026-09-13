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
        <main className="flex-1 min-w-0 bg-white px-[30px] sm:px-[50px] lg:px-[60px] py-[50px]">
          <div className="docs-main-container max-w-[1120px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Global Floating Tactical Assistant Trigger */}
      <FloatingAssistant />
    </div>
  );
}

