import React from "react";
import Link from "next/link";
import {
  Network,
  GitMerge,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Layers,
  ShieldAlert,
  Zap,
  Terminal,
  Cpu,
  Binary,
  Flame,
  AlertTriangle,
  Server,
  Share2,
  FileCode,
  HardDrive,
  Sparkles,
  Users,
  ShieldCheck,
  Eye,
  HelpCircle,
  Check,
  Globe,
} from "lucide-react";
import { SchemaInspector } from "./schema-inspector";
import { ClusteringSimulator } from "./clustering-simulator";
import { GraphFaq } from "./graph-faq";

export const metadata = {
  title: "Chapter 3: Graph Topology & Entity Clustering — The Detective's Pinboard — NTRO KB",
  description:
    "How NTRO uses Neo4j property graphs, the Pizza Bill heuristic, and Louvain Community Detection to transform scattered Bitcoin addresses into unmasked criminal syndicates in seconds.",
};

export default function Chapter3Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* CHAPTER HERO: Executive Brief & Real-World KPI Strip */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block uppercase tracking-wider mb-1">
              CHAPTER 03 // ENTITY INTELLIGENCE &amp; GRAPH FORENSICS
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Graph Topology &amp; Entity Clustering: The Detective&apos;s Pinboard
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Unmasking organized cybercrime syndicates by connecting Wallets, Transactions, and IP Addresses into a visual web
            </p>
          </div>
        </div>

        {/* 4 Sovereign Intelligence Highlights */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Wallets Mapped
            </div>
            <div className="text-lg font-mono font-bold text-slate-950">
              24,673 Addresses
            </div>
            <div className="text-[10.5px] text-emerald-700 font-medium">
              100% clustered into syndicates
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Discovered Syndicates
            </div>
            <div className="text-lg font-mono font-bold text-amber-700">
              9,794 Entities
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              Ransomware, peeling, &amp; OTC
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Louvain Clustering Time
            </div>
            <div className="text-lg font-mono font-bold text-sky-700">
              6.95 Seconds
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              In-memory CPU GDS execution
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-0.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 uppercase">
              Enclave Security
            </div>
            <div className="text-lg font-mono font-bold text-emerald-700">
              100% Air-Gapped
            </div>
            <div className="text-[10.5px] text-slate-500 font-mono">
              0 external calls / 0 cloud leaks
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: The Detective's Pinboard (Neo4j Graph Database) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The Detective&apos;s Pinboard: How Neo4j Connects the Clues
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Visualizing criminal evidence with suspect photos, money transfers, and physical crime scenes
            </p>
          </div>
        </div>

        {/* Hero Analogy Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>The Core Analogy</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Picture a classic crime thriller movie...
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            A detective stands in front of a giant corkboard. They pin <strong>suspect photos</strong> to the wall, pin <strong>wire transfer receipts</strong> in between them, and pin <strong>physical crime scene map locations</strong> at the bottom. Then, they connect the evidence with <strong>red yarn</strong> to reveal the hidden criminal network.
          </p>
          <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-sky-300 font-medium">
            That corkboard is our <strong>Neo4j Graph Database</strong>. In our system, Bitcoin addresses are not just random strings of letters — they are connected suspects pinned to an interactive evidence board.
          </div>
        </div>

        {/* The 3 Evidence Nodes & 4 Red String Connections */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            The Evidence on the Board (3 Node Types)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Node 1: Wallet */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  :Wallet
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">24,673 NODES</span>
              </div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                The Suspect Photo
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Represents a unique Bitcoin address. Even though criminals use fake names, their wallet addresses are permanently visible. Stores risk scores, anomaly flags, and syndicate IDs.
              </p>
            </div>

            {/* Node 2: Transaction */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  :Transaction
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">100,000 NODES</span>
              </div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                The Transfer Receipt
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The actual movement of money on the blockchain. Records who sent Bitcoin, who received it, exact timestamps, total amounts, and miner processing fees.
              </p>
            </div>

            {/* Node 3: IP */}
            <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  :IP
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">32,840 NODES</span>
              </div>
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-600" />
                The Crime Scene
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The physical internet IP address and server location where the transaction was transmitted. Enriched offline with country codes and bulletproof hosting provider (ASN) tags.
              </p>
            </div>
          </div>
        </div>

        {/* Real-World Forensic Scenario */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-sky-600" />
              Real-World Scenario: Catching a Ransomware Gang in 3 Clicks
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              SUB-15MS TRAVERSAL
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono font-bold text-sky-700 text-[11px]">1. Physical Alert</div>
              <p className="text-slate-600 text-[11px]">
                A malicious bulletproof hosting server in <strong>Bulgaria (ASN 208323)</strong> broadcasts a raw packet.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono font-bold text-emerald-700 text-[11px]">2. Catch Transfer</div>
              <p className="text-slate-600 text-[11px]">
                Follow the <code className="font-mono text-slate-800">:OBSERVED</code> edge to pinpoint transaction <code className="font-mono text-[10px]">9f8b...</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono font-bold text-amber-700 text-[11px]">3. Find Sender</div>
              <p className="text-slate-600 text-[11px]">
                Follow the <code className="font-mono text-slate-800">:SENDS</code> edge back to the funding address <code className="font-mono text-[10px]">1Boat...</code>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono font-bold text-rose-700 text-[11px]">4. Unmask Syndicate</div>
              <p className="text-slate-600 text-[11px]">
                Follow <code className="font-mono text-slate-800">:CO_SPEND</code> red strings to reveal all <strong>14 accomplice wallets</strong> in Syndicate #9451!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Multi-Input Clustering — The "Pizza Bill" Heuristic */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Multi-Input Clustering: The &quot;Pizza Bill&quot; Rule
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Common-Input Ownership Heuristic (CIOH) &amp; The Friendship Bracelet Rule
            </p>
          </div>
        </div>

        {/* The Pizza Bill Analogy */}
        <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-mono font-bold text-amber-900 text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>The Pizza Bill Analogy</span>
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            &quot;If Wallet A and Wallet B are both used together to pay for a single pizza, they belong to the same person.&quot;
          </p>
          <p className="leading-relaxed">
            Imagine Alice goes to a pizza parlor. The bill is $30. She pulls out two different debit cards from her purse — Card A and Card B — and swipes both to settle the single bill. The cashier knows with 100% certainty that both cards belong to Alice.
          </p>
          <p className="leading-relaxed">
            Bitcoin works the exact same way. In Bitcoin rules, spending coins requires proving you own the private keys for <strong>every single wallet</strong> contributing to the payment. If a transaction spends coins from Wallet 1, Wallet 2, and Wallet 3 simultaneously, whoever hit &quot;Send&quot; possessed all three private keys!
          </p>
        </div>

        {/* The Friendship Bracelet Rule */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            The &quot;Friendship Bracelet&quot; Rule (Saving 50% Memory)
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            If Alice and Bob are friends, you only need to draw <strong>one line</strong> between them on your map. You don&apos;t need a second line pointing backward, and Alice doesn&apos;t need a line pointing to herself!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-900 text-xs font-mono uppercase">
                  Without Our Rule (Naive)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">
                  100 LINES CREATED
                </span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                Connecting 10 wallets together naively generates 100 duplicated lines, including wallets pointing to themselves. The database chokes on memory and slows down dramatically.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 text-xs font-mono uppercase">
                  With Our Rule (addr1 &lt; addr2)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                  EXACTLY 45 CLEAN LINES
                </span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                By enforcing alphabetical sorting (<code className="font-mono text-[11px] font-bold">addr1 &lt; addr2</code>), we eliminate self-loops and duplicate lines, cutting database storage and RAM in half (<strong>50% reduction</strong>) with zero lost clues!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Syndicate Clustering — Louvain Community Detection */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Syndicate Clustering: Louvain Community Detection
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Grouping criminal syndicates based on who hangs out with whom in a crowded room
            </p>
          </div>
        </div>

        {/* The Crowded Party Analogy */}
        <div className="p-5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-mono font-bold text-sky-900 text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-sky-600" />
            <span>The Crowded Room Analogy</span>
          </div>
          <p className="text-sm font-bold text-slate-900 leading-snug">
            &quot;Grouping criminal syndicates based on who hangs out with whom.&quot;
          </p>
          <p className="leading-relaxed">
            Imagine walking into a bustling networking event or crowded cafeteria. Even without nametags, you can immediately spot tight-knit friend circles: they huddle together, chat constantly, and share drinks.
          </p>
          <p className="leading-relaxed">
            Our <strong>Louvain Community Detection algorithm</strong> does the exact same thing across thousands of Bitcoin wallets:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white rounded-lg border border-sky-100 space-y-1">
              <div className="font-bold text-slate-900 font-mono text-[11px]">
                Step 1: Pulling Up a Chair
              </div>
              <p className="text-slate-600 text-[11px]">
                Each wallet checks its neighbors and asks: &quot;Am I spending money with this group?&quot; If joining them makes sense, it pulls up a chair and enters their circle.
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-sky-100 space-y-1">
              <div className="font-bold text-slate-900 font-mono text-[11px]">
                Step 2: Locking In the Syndicate
              </div>
              <p className="text-slate-600 text-[11px]">
                Once a group forms, they are treated as one large cartel. The algorithm repeats this process until the whole network settles into distinct, organized crime syndicates.
              </p>
            </div>
          </div>
        </div>

        {/* Production Speed Metrics */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 font-mono text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Measured Algorithm Execution Performance
            </span>
            <span className="text-slate-400 text-[10px]">PRODUCTION BENCHMARK</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-300">
            <div>&bull; Graph In-Memory Projection: <strong className="text-emerald-400 font-bold">0.11s</strong></div>
            <div>&bull; 24,673 Wallets Clustered: <strong className="text-emerald-400 font-bold">6.95s</strong></div>
            <div>&bull; 100,000 Tx PostgreSQL Sync: <strong className="text-emerald-400 font-bold">3.43s</strong></div>
          </div>
        </div>
      </section>

      {/* SECTION 4: Speed Armor & Dual-Storage Architecture */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Speed Armor: Keeping the Visualizer Instant &amp; Safe
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why PostgreSQL + Neo4j are the dynamic duo, and the 4 shields protecting the analyst UI
            </p>
          </div>
        </div>

        {/* Dynamic Duo Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                PostgreSQL (The Evidence Vault)
              </span>
              <HardDrive className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Handles raw transaction records at blistering speed (<strong>11,938 rows/sec</strong>). Ensures financial data is ACID protected and allows instant searches by transaction ID or timestamp in &lt;10ms.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                Neo4j GDS (The Detective Pinboard)
              </span>
              <Network className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Connects the red strings! While SQL would freeze trying to join 15 hops of money laundering, Neo4j traces complex multi-hop paths across 24,000 wallets in just <strong>15 milliseconds</strong>.
            </p>
          </div>
        </div>

        {/* 4 Shields Grid */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
            The 4 Anti-Crash Shields Protecting the UI
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-white rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                1. Hard Ceiling (250 Nodes Max)
              </div>
              <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
                If a wallet interacted with a massive exchange (like Binance with 100,000 links), we cap the view at 250 nodes so the browser never freezes.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                2. Criminals First (Risk Sorting)
              </div>
              <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
                Nodes are sorted by AI danger scores first. Known ransomware extortionists always appear on screen before innocent transactions.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                3. No Duplicate Strings
              </div>
              <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
                Deduplication prevents drawing two red strings between the same wallets, keeping the interactive chart clean and legible.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded-lg border border-slate-200 font-mono text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                4. Safe Memory Cleanup
              </div>
              <p className="text-slate-600 font-sans text-[11px] leading-relaxed">
                Database connections are cleanly closed after every query, preventing server memory leaks during high-frequency analyst investigations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Explorers */}
      <section className="space-y-8">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Explorers: Schema &amp; Syndicate Simulator
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Click through the evidence schema or step through the live clustering algorithm
            </p>
          </div>
        </div>

        {/* INTERACTIVE COMPONENT 1: Schema Inspector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="font-bold uppercase tracking-wider text-slate-700">WIDGET 3.1: THE EVIDENCE MAP (SCHEMA INSPECTOR)</span>
            <span>CLICK TABS TO EXPLORE</span>
          </div>
          <SchemaInspector />
        </div>

        {/* INTERACTIVE COMPONENT 2: Clustering Simulator */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span className="font-bold uppercase tracking-wider text-slate-700">WIDGET 3.2: LIVE SYNDICATE DETECTION SIMULATOR</span>
            <span>STEP THROUGH TO WITNESS CONVERGENCE</span>
          </div>
          <ClusteringSimulator />
        </div>
      </section>

      {/* SECTION 6: Teammate Defense FAQ */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Teammate FAQ &amp; Plain-English Defense
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Direct technical rationales addressing storage decoupling, the friendship rule, and air-gapped security
            </p>
          </div>
        </div>

        {/* EMBEDDED FAQ ACCORDION */}
        <GraphFaq />
      </section>

      {/* SECTION 7: PITCH-READY CHEAT SHEET: How to explain this to a judge in 30 seconds */}
      <section className="space-y-4">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border-2 border-amber-400/40 shadow-xl space-y-6">
          {/* Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                ⚡
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  PITCH-READY CHEAT SHEET
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  How to Explain This to a Judge in 30 Seconds
                </h3>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 font-semibold">
              30-SECOND ELEVATOR PITCH
            </span>
          </div>

          {/* Word-for-Word Pitch Script */}
          <div className="space-y-2">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Exact Pitch Script (Memorize &amp; Deliver):
            </div>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-sm sm:text-base text-slate-100 font-sans leading-relaxed italic">
              &quot;Judges often think Bitcoin is untraceable because wallets are just random strings of letters and numbers. But here is our secret: <strong>criminals have to spend money, and when they do, they leave footprints.</strong>
              <br /><br />
              First, our <strong>Pizza Bill Rule</strong> proves that when multiple wallets are swiped together to pay for a single transaction, they belong to the exact same suspect.
              <br /><br />
              Second, our <strong>Detective&apos;s Pinboard (Neo4j)</strong> and <strong>Louvain algorithm</strong> automatically group thousands of scattered wallets into organized crime syndicates in under 7 seconds — like spotting tight friend circles in a crowded room.
              <br /><br />
              Finally, we link physical server IPs to these wallets, allowing NTRO to trace illicit funds from a bulletproof server in Europe straight to the syndicate&apos;s mastermind — <strong>100% offline with zero cloud leaks</strong>.&quot;
            </div>
          </div>

          {/* 3 Quick-Fire Judge Q&A Bullets */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
              Top 3 Tough Questions Judges Will Ask (&amp; How to Answer in 1 Sentence):
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="font-bold text-amber-300">
                  Q: &quot;What if criminals use a CoinJoin mixer to confuse you?&quot;
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Answer:</strong> &quot;Our autonomous CoinJoin detector spots the identical output amounts beforehand and quarantines them so innocent people are never falsely grouped with criminals.&quot;
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="font-bold text-sky-300">
                  Q: &quot;Why not just use PostgreSQL for everything?&quot;
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Answer:</strong> &quot;PostgreSQL is great for tabular logs, but tracing money across 10 hops in SQL takes seconds; Neo4j traces graph relationships across 24,000 wallets in just 15 milliseconds.&quot;
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="font-bold text-emerald-300">
                  Q: &quot;Can this scale to millions of transactions?&quot;
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong>Answer:</strong> &quot;Yes! Our friendship bracelet rule cuts connections by 50%, our 250-node ceiling keeps the UI smooth, and clustering updates 100,000 rows in PostgreSQL in 3.4 seconds.&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch2-ingest-geoip-security"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 2: Ingestion &amp; GeoIP Armor</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH03
        </div>

        <Link
          href="/docs/ch4-peeling-mixing-heuristics"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 4: Laundering Heuristics &amp; Detectors</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
