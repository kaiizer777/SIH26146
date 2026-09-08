import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter: primary UI font — loaded at build time, zero CDN requests at runtime
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// JetBrains Mono: cryptographic data font (addresses, TXIDs, amounts, IPs)
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NTRO · Bitcoin AML Surveillance System",
  description:
    "AI-powered offline Bitcoin transaction monitoring and money-laundering detection for NTRO. " +
    "Correlates network-layer (IP/ASN) with blockchain-layer (wallet/TXID) data using ML clustering, " +
    "anomaly detection, and GraphSAGE risk scoring with full SHAP + GNNExplainer explainability.",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="en"
      // No 'dark' class — strict light mode per WORK-2.md Section 1.2
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
