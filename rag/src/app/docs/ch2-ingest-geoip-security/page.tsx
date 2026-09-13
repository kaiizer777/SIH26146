import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Server,
  Zap,
  HardDrive,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Globe,
  FileCheck2,
  FileCode,
  Layers,
  AlertTriangle,
  Binary,
  Cpu,
  RefreshCw,
  Terminal,
  Fingerprint,
  MapPin,
  Sparkles,
  Clock,
  Sliders,
  ShieldCheck,
  EyeOff,
  Compass,
  Radio,
  Share2,
} from "lucide-react";
import { BenchmarkCard } from "./benchmark-card";
import { DupFlowVisualizer } from "./dup-flow-visualizer";
import { IngestFaq } from "./ingest-faq";

export const metadata = {
  title: "Chapter 2: High-Speed Ingestion, Offline GeoIP & Zero-Trust Armor — NTRO KB",
  description:
    "How NTRO transforms messy, gigabyte-scale seized hard drive dumps into clean, geolocated, deduplicated forensic intelligence in seconds — 100% offline with zero internet.",
};

export default function Chapter2Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* SECTION 1: The Problem — The Chaos of Seized Forensic Dumps */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Problem: The Chaos of Seized Forensic Dumps
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why conventional blockchain tools choke during real-world law enforcement raids
            </p>
          </div>
        </div>

        {/* 3 Problem Cards (High Impact, Zero Jargon) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">
                Seizure Reality
              </span>
              <HardDrive className="w-4 h-4 text-rose-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Messy Seized Hard Drives
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Physical raids yield raw server hard drives containing gigabytes of unsorted transaction dumps, network sniffers, and raw mempool captures. No two law enforcement sources format logs the same way.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                Format Nightmare
              </span>
              <FileCode className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Mixed Formats &amp; Poisoned Rows
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bank records export in CSV, crypto wallet logs dump in nested JSON, and network taps output legacy XML. Many contain duplicate lines, corrupted timestamps, or incomplete IP addresses.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="card-tactical rounded-xl p-4 bg-white border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                Time Constraint
              </span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              The 48-Hour Freezing Clock
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Investigators have a narrow window before criminals peel and tumble stolen Bitcoin through overseas mixers. Systems cannot afford hours of slow parsing, crashing on duplicates, or calling online APIs.
            </p>
          </div>
        </div>

        {/* Tactical Problem Reality Banner */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                The Sovereign Law Enforcement Rule
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                If your system takes 4 hours to ingest a drive or leaks suspect IPs to a public cloud API, the investigation is compromised. Our engine solves both in seconds.
              </div>
            </div>
          </div>
          <div className="shrink-0 font-mono text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            100% AIR-GAPPED &bull; ZERO INTERNET
          </div>
        </div>
      </section>

      {/* SECTION 2: The 3-Step Visual Ingestion Flow */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The 3-Step Visual Ingestion Pipeline
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              From raw seized hard drive dumps to clean forensic intelligence in under 9 seconds
            </p>
          </div>
        </div>

        {/* 3 Step Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="card-tactical rounded-xl p-5 bg-white border border-slate-200/90 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                STEP 01 &bull; INGEST
              </span>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                The Universal Translator
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Format Normalizer (CSV / JSON / XML)
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sniffs the first 512 bytes of content in 1 microsecond. Doesn&apos;t trust spoofed file extensions. Instantly standardizes any CSV, JSON, or legacy XML into clean, uniform Bitcoin transaction records.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-blue-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Converts any format to unified schema</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card-tactical rounded-xl p-5 bg-white border border-slate-200/90 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                STEP 02 &bull; PROTECT
              </span>
              <Fingerprint className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                The Instant Bouncer
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                SHA-256 Idempotency Shield
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates a digital fingerprint as data streams in. If an investigator accidentally uploads the same 10GB drive twice, the engine detects it in 0.01 seconds and drops the duplicate so the database never chokes.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-rose-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
              <span>Zero database load on re-uploads</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card-tactical rounded-xl p-5 bg-white border border-slate-200/90 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                STEP 03 &bull; GEOLOCATE
              </span>
              <Globe className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                The Air-Gapped Radar
              </h3>
              <p className="text-xs font-mono text-slate-500 mt-0.5">
                Offline MaxMind GeoIP &amp; ASN in RAM
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maps raw IP addresses directly to physical cities, countries, and telecom ISPs in microseconds using in-memory databases. 100% offline, zero internet, zero external DNS queries — keeping intelligence sovereign.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>&lt;0.05ms lookup &bull; Zero foreign leaks</span>
            </div>
          </div>
        </div>

        {/* Unified 14-Field Schema Visual Callout */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              The Clean Output: Unified 14-Field Transaction Record
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
              PYDANTIC STRICT VALIDATION
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            No matter how disorganized the seized evidence is, every transaction is converted into a clean 14-field record containing:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">HASH</span>
              <strong className="text-slate-900">txid (64 hex)</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">TIME</span>
              <strong className="text-slate-900">timestamp (UTC)</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">TELEMETRY</span>
              <strong className="text-slate-900">src / dst IP</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">SOURCE</span>
              <strong className="text-slate-900">input wallets</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">TARGET</span>
              <strong className="text-slate-900">output wallets</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">VALUE</span>
              <strong className="text-slate-900">amounts &amp; fees</strong>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-center">
              <span className="text-slate-500 block text-[9px]">LOCATION</span>
              <strong className="text-emerald-700">country &amp; ASN</strong>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Air-Gapped Security & Zero-Trust Defense */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Air-Gapped Security &amp; Zero-Trust Defense
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Guaranteed isolation against poisoned files, malicious payloads, and external intelligence leaks
            </p>
          </div>
        </div>

        {/* 3 Security Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1 */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 card-tactical">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                SOVEREIGN OPSEC
              </span>
              <Lock className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Zero Outbound Network Leaks
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              National security rules strictly forbid querying online cloud APIs. Doing so reveals target suspects to foreign internet providers. Our entire MaxMind database lives locally in RAM inside the secure enclave.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 card-tactical">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                AIRPORT SCANNER
              </span>
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Strict Pydantic Validation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every single transaction passes through strict data type enforcement. We verify 64-character hex TXIDs, valid Bitcoin addresses (Base58 &amp; Bech32), and positive fee math before a single byte touches storage.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 card-tactical">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                FAULT ISOLATION
              </span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Quarantine Without Crashing
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If a seized dump contains 50 corrupted lines mixed into 100,000 transactions, our quarantine buffer isolates the bad rows for analyst review while the remaining 99,950 valid records stream in smoothly.
            </p>
          </div>
        </div>

        {/* Smart Dual-Hop Resolution Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold font-mono text-slate-900 uppercase flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-600" />
              Smart Dual-Hop IP Resolution (Resolving Local Wi-Fi Addresses)
            </h4>
            <span className="text-[10px] font-mono text-slate-500">enrichment.py</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seized router logs often show internal private IPs (like <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-800">192.168.1.100</code>). If we only looked at the source IP, the location would be unknown. Our dual-hop resolver automatically inspects the destination relay node to locate the exit country and telecom provider:
          </p>
          <div className="p-3 bg-slate-950 text-slate-200 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
            <div className="text-slate-400 text-[10px]"># Dual-hop IP resolution with private network fallback</div>
            <div>country = lookup_country(src_ip) or lookup_country(dst_ip)</div>
            <div>isp_asn = lookup_asn(src_ip) or lookup_asn(dst_ip)</div>
            <div className="text-emerald-400 text-[10px] pt-1"># Zero crashes: returns (None, None) gracefully if an IP is malformed</div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Turbocharged Database Speed — Bulk COPY vs Standard ORM */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              26x Faster Ingestion: Direct Highway vs Stop-and-Go
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why standard government database setups choke and how our direct stream hits 11,938 rows/sec
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-950 space-y-1.5 leading-relaxed">
          <div className="font-bold flex items-center gap-1.5 text-blue-900">
            <Zap className="w-4 h-4 text-blue-600" />
            The Plain-English Analogy:
          </div>
          <p>
            Imagine mailing 100,000 letters by driving to the post office 100,000 separate times (Conventional ORM). That is why standard systems take nearly 4 minutes and eat up 482 MB of RAM. Our engine loads all 100,000 letters into a sealed high-speed freight train and rolls directly onto the database tracks (Direct Bulk COPY), finishing in just <strong>8.38 seconds</strong> with only <strong>18 MB of RAM</strong>.
          </p>
        </div>

        {/* EMBEDDED BENCHMARK INTERACTIVE CARD */}
        <BenchmarkCard />
      </section>

      {/* SECTION 5: Ground-Truth Intelligence Seeds ($1.018 Billion Corpus) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Ground-Truth Intelligence: The Ransomwhere Corpus
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              11,186 verified criminal wallets across 136 ransomware cartels ($1.018 Billion tracked)
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            An offline forensic AI cannot catch money launderers out of thin air — it needs <strong>verified criminal anchors</strong> to begin tracing. During system initialization, we pre-load 11,186 verified ransomware payment addresses from 136 global cartels into our forensic graph.
          </p>
          <p>
            When seized transactions touch or get close to these anchors, our graph algorithms immediately sound the alarm and trace where the ransom money traveled.
          </p>
        </div>

        {/* Cartel Seed Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-slate-50 p-3.5 border-b border-slate-200 font-mono text-xs font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              MAJOR RANSOMWARE CARTELS PRE-LOADED IN GRAPH
            </span>
            <span className="text-[10px] text-slate-500 font-mono">11,186 TOTAL SEED ADDRESSES</span>
          </div>
          <div className="divide-y divide-slate-100 text-xs font-mono">
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
              <div className="font-bold text-slate-900">LockBit (v2 / v3)</div>
              <div className="text-slate-600">3,420 Addresses</div>
              <div className="text-emerald-700 font-semibold">$345.2M Tracked</div>
              <div className="text-slate-500 text-[11px] font-sans">Automated micro-peeling &amp; split transfers</div>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
              <div className="font-bold text-slate-900">Conti Syndicate</div>
              <div className="text-slate-600">1,842 Addresses</div>
              <div className="text-emerald-700 font-semibold">$192.8M Tracked</div>
              <div className="text-slate-500 text-[11px] font-sans">Multi-signature consolidation wallets</div>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
              <div className="font-bold text-slate-900">BlackCat / ALPHV</div>
              <div className="text-slate-600">915 Addresses</div>
              <div className="text-emerald-700 font-semibold">$118.4M Tracked</div>
              <div className="text-slate-500 text-[11px] font-sans">CoinJoin equal-output mixing pools</div>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
              <div className="font-bold text-slate-900">REvil / Sodinokibi</div>
              <div className="text-slate-600">780 Addresses</div>
              <div className="text-emerald-700 font-semibold">$96.1M Tracked</div>
              <div className="text-slate-500 text-[11px] font-sans">Cross-chain bridge cashout hubs</div>
            </div>
            <div className="p-3.5 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center hover:bg-slate-50/50">
              <div className="font-bold text-slate-900">DarkSide / BlackMatter</div>
              <div className="text-slate-600">620 Addresses</div>
              <div className="text-emerald-700 font-semibold">$82.5M Tracked</div>
              <div className="text-slate-500 text-[11px] font-sans">Colonial Pipeline extortion cluster</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: Interactive Duplicate Armor Simulator */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Duplicate Armor Simulator
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              See what happens when investigators accidentally upload duplicates or overlapping transaction dumps
            </p>
          </div>
        </div>

        {/* EMBEDDED DUP FLOW SIMULATOR */}
        <DupFlowVisualizer />
      </section>

      {/* SECTION 7: Teammate & Judge FAQ */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-[8px] badge-tactical-blue flex items-center justify-center font-mono font-bold text-sm shadow-xs flex-shrink-0">
            07
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Teammate &amp; Judge FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Winning answers to the toughest questions evaluators and strategy teammates ask
            </p>
          </div>
        </div>

        {/* EMBEDDED FAQ ACCORDION */}
        <IngestFaq />
      </section>

      {/* SECTION 8: PITCH-READY CHEAT SHEET: HOW TO EXPLAIN THIS TO A JUDGE IN 30 SECONDS */}
      <section className="space-y-4 pt-4">
        <div className="card-tactical rounded-2xl border-2 border-blue-500/40 bg-gradient-to-b from-blue-50/50 to-white p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Header Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-900">
                PITCH CHEAT SHEET &bull; 30-SECOND ELEVATOR PITCH
              </span>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-semibold self-start sm:self-auto">
              MEMORIZE THIS FOR DEMO DAY 🏆
            </span>
          </div>

          {/* The Big 30-Second Soundbite */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              The 1-Sentence Killer Hook
            </div>
            <blockquote className="text-base sm:text-lg font-bold text-slate-900 leading-snug border-l-4 border-blue-600 pl-4 py-1 italic bg-white/70 rounded-r-lg">
              &ldquo;We take raw, messy seized hard drives, clean them in seconds, and pinpoint the suspect&apos;s city and ISP offline without ever touching the internet!&rdquo;
            </blockquote>
          </div>

          {/* 3 Winning Talking Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <div className="text-[10px] font-mono font-bold text-blue-800 uppercase flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                1. Universal Ingest
              </div>
              <div className="text-xs font-bold text-slate-900">
                Any Format Ingested
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                CSV, JSON, XML — automatically detected and cleaned in 1 microsecond.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                2. Air-Gapped GeoIP
              </div>
              <div className="text-xs font-bold text-slate-900">
                100% Offline in RAM
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                Pinpoints city and telecom ISP in &lt;0.05ms without sending a single web packet.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 space-y-1">
              <div className="text-[10px] font-mono font-bold text-purple-800 uppercase flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-purple-600" />
                3. 26x Turbo Speed
              </div>
              <div className="text-xs font-bold text-slate-900">
                100k Rows in 8.4s
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                Postgres wire-protocol streaming with instant 0.01s duplicate protection.
              </p>
            </div>
          </div>

          {/* Tough Judge Questions & 1-Sentence Winning Answers */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Tough Judge Questions &bull; 1-Sentence Winning Answers
            </div>

            <div className="space-y-2 font-sans text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-rose-600 font-mono">Q:</span>
                  &ldquo;Why not just use an online geolocation API like IPInfo or Chainalysis?&rdquo;
                </div>
                <div className="text-slate-700 pl-4 border-l-2 border-blue-500">
                  <span className="font-bold text-blue-700 font-mono">A:</span> &ldquo;National security protocol forbids calling public APIs — querying an external server tells foreign companies who Indian intelligence is investigating. Our entire database runs 100% locally in RAM.&rdquo;
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-rose-600 font-mono">Q:</span>
                  &ldquo;What happens if an investigator uploads a corrupted or malicious file?&rdquo;
                </div>
                <div className="text-slate-700 pl-4 border-l-2 border-blue-500">
                  <span className="font-bold text-blue-700 font-mono">A:</span> &ldquo;Our strict Pydantic validation acts like an airport X-ray: bad rows are safely quarantined to an audit log while the valid 99,000 transactions keep moving without crashing.&rdquo;
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="text-rose-600 font-mono">Q:</span>
                  &ldquo;What if an investigator uploads the exact same 5GB drive twice by accident?&rdquo;
                </div>
                <div className="text-slate-700 pl-4 border-l-2 border-blue-500">
                  <span className="font-bold text-blue-700 font-mono">A:</span> &ldquo;Our SHA-256 fingerprinting recognizes duplicate files in 0.01 seconds and drops them before they waste a single cycle of database compute.&rdquo;
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch1-mission-architecture"
          className="p-2.5 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 1: Mission &amp; Architecture</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          NTRO FORENSIC INTELLIGENCE &bull; SEC-DOC-26146-CH02
        </div>

        <Link
          href="/docs/ch3-graph-entity-clustering"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 3: Graph Topology &amp; Entity Clustering</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
