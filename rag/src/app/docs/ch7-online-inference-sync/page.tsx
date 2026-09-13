import React from "react";
import Link from "next/link";
import {
  Eye,
  Zap,
  Clock,
  Radio,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Share2,
  Sparkles,
  Database,
  Cpu,
  Lock,
  Search,
  Scale,
  MessageSquare,
  Award,
  Flame,
} from "lucide-react";
import { SyncSequenceDiagram } from "./sync-sequence-diagram";
import { SyncPlayground } from "./sync-playground";
import { SyncFaq } from "./sync-faq";

export const metadata = {
  title: "Chapter 7: The Watchtower — Real-Time Mempool Sniffing & Live Graph Sync — NTRO KB",
  description:
    "Plain-English, judge-ready specification for the NTRO Watchtower: sniffing the Bitcoin Mempool waiting room in under 5ms, real-time Neo4j detective pinboard synchronization, and closing the fatal 10-minute block confirmation blind spot.",
};

export default function Chapter7Page() {
  return (
    <article className="space-y-12 pb-16">
      {/* CHAPTER HEADER / HERO */}
      <div className="space-y-3 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            CHAPTER 07 • REAL-TIME MEMPOOL &amp; LIVE SYNC
          </span>
          <span className="text-xs text-slate-400 font-mono">PIPELINE TIER 6</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          The Watchtower: Real-Time Mempool Sniffing &amp; Live Graph Sync
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          How NTRO catches Bitcoin money laundering <strong>before</strong> the block is mined — turning a fatal 10-minute blind spot into a sub-5-millisecond instant intercept.
        </p>
      </div>

      {/* SECTION 1: The 10-Minute Fatal Blind Spot */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The 10-Minute Fatal Blind Spot
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Why traditional blockchain explorers lose the criminal, and how automated syndicates exploit the delay
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            When someone sends Bitcoin, that transaction is <strong>not</strong> written to the permanent blockchain immediately.
            On average, Bitcoin miners take <strong>10 minutes</strong> to assemble, solve, and mint a new block.
            For traditional law enforcement tools, this 10-minute window is an eternity of complete blindness.
          </p>

          {/* Side-by-Side Timeline Comparison Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* The Criminal Advantage */}
            <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
                  TRADITIONAL LAW ENFORCEMENT
                </span>
                <span className="text-xs font-mono font-bold text-rose-800">10-MINUTE DELAY</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                The Case Has Gone Cold Before the Block Mines
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated ransomware bots and cartel laundering scripts don&rsquo;t wait for miners. They immediately spend the
                <em> unconfirmed change output</em> across 5 subsequent peeling wallets and swap funds into privacy coins on decentralized exchanges.
                By the time a traditional explorer confirms Block #1, the money is already gone.
              </p>
              <div className="p-3 bg-white rounded-lg border border-rose-200 text-xs font-mono text-rose-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Minute 0:00 &mdash; Robbery transfer sent</span>
                  <span className="text-rose-600 font-bold">Unseen</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Minute 3:15 &mdash; Peeling Hop 1 &amp; 2</span>
                  <span className="text-rose-600 font-bold">Unseen</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Minute 7:40 &mdash; Swapped to Monero</span>
                  <span className="text-rose-600 font-bold">Lost</span>
                </div>
                <div className="flex items-center justify-between border-t border-rose-100 pt-1 text-slate-500">
                  <span>Minute 10:00 &mdash; Block confirmed</span>
                  <span className="text-slate-700 font-bold">TOO LATE</span>
                </div>
              </div>
            </div>

            {/* The NTRO Watchtower Solution */}
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white">
                  NTRO WATCHTOWER INTERCEPT
                </span>
                <span className="text-xs font-mono font-bold text-emerald-800">SUB-5MS REACTION</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Alert Sounds While the Money is Still in the Lobby
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The NTRO Watchtower doesn&rsquo;t wait for miners. It taps directly into the Bitcoin peer-to-peer gossip stream,
                sniffing the transaction packet the instant it is broadcast. An inline AI model scores the risk in <strong>under 5 milliseconds</strong>,
                firing an exchange freeze alert while the funds are still trapped in transit.
              </p>
              <div className="p-3 bg-white rounded-lg border border-emerald-200 text-xs font-mono text-emerald-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span>T + 0.00s &mdash; Transaction broadcast</span>
                  <span className="text-emerald-600 font-bold">Captured</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>T + 0.03s &mdash; Watchtower sniffs packet</span>
                  <span className="text-emerald-600 font-bold">Extracted</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>T + 0.035s &mdash; AI evaluates threat</span>
                  <span className="text-emerald-600 font-bold">Score: 0.88</span>
                </div>
                <div className="flex items-center justify-between border-t border-emerald-100 pt-1 text-slate-900 font-bold">
                  <span>T + 0.05s &mdash; Exchange freeze alert fired</span>
                  <span className="text-emerald-700 font-extrabold">INTERCEPTED!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: The "Waiting Room" Analogy */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            02
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              The &ldquo;Waiting Room&rdquo; (Mempool) Analogy
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Understanding the difference between transactions waiting in the lobby and records carved in stone
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          {/* Visual Analogy Callout Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Intuitive Mental Model for Teammates and Judges
            </div>
            <p className="text-sm text-slate-800 leading-relaxed">
              Think of the Bitcoin network as an ancient bank vault.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-800">
                  <Radio className="w-4 h-4 text-amber-600" />
                  THE MEMPOOL: &ldquo;The Waiting Room&rdquo;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Before a teller writes your deposit into the stone ledger, you wait in the bank lobby.
                  Thousands of people are standing there, tickets in hand. It is crowded, loud, and public.
                  <strong> The NTRO Watchtower stands at the lobby door with an X-ray machine.</strong>
                </p>
              </div>

              <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-800">
                  <Database className="w-4 h-4 text-emerald-600" />
                  THE BLOCKCHAIN: &ldquo;Carved in Stone&rdquo;
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Once every 10 minutes, a teller invites a batch of people in and chisels their transactions
                  into an unchangeable stone wall. Once chiseled, it cannot be altered or taken back.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-mono uppercase text-[11px] border-b border-slate-200">
                  <th className="p-3">Dimension</th>
                  <th className="p-3 text-amber-900 bg-amber-50/50">Mempool (The Waiting Room)</th>
                  <th className="p-3 text-emerald-900 bg-emerald-50/50">Blockchain (Carved in Stone)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                <tr>
                  <td className="p-3 font-semibold text-slate-900 font-mono">Arrival Speed</td>
                  <td className="p-3 text-slate-700 font-mono text-amber-800 font-semibold">0 &ndash; 3 seconds (Instant broadcast)</td>
                  <td className="p-3 text-slate-700 font-mono text-emerald-800">10 &ndash; 60 minutes (Mined into blocks)</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 font-mono">Permanence</td>
                  <td className="p-3 text-slate-700">Ephemeral (can be replaced by fee or dropped)</td>
                  <td className="p-3 text-slate-700">Cryptographically permanent &amp; immutable</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 font-mono">Criminal Strategy</td>
                  <td className="p-3 text-slate-700">Rapid nested hops to outrun investigators</td>
                  <td className="p-3 text-slate-700">Final settlement and cashout to fiat currency</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900 font-mono">NTRO Action</td>
                  <td className="p-3 text-slate-700 font-semibold text-indigo-700">Instant AI risk triage &amp; exchange freeze notice</td>
                  <td className="p-3 text-slate-700">Court-admissible Section 65B dossier sealed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 3: The 4-Step Zero-Lag Intercept Flow */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            03
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              How the Watchtower Works: The 4-Step Intercept
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              From raw P2P network packet to real-time detective alert in four synchronized phases
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                0 &ndash; 30MS
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Sniff &amp; Decode</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Watchtower ZeroMQ listeners intercept raw P2P broadcast packets the instant a transaction enters the Mempool waiting room.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                2
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                &lt;5MS
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Instant AI Triage</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              A quantized FT-Transformer and peeling heuristic rules inspect 18 features, detecting money laundering funnels in 3.8 milliseconds.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                3
              </span>
              <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                LIVE PIN
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Detective Pinboard Sync</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The suspicious wallet and its flow link directly to the Neo4j graph and analyst screen as a &ldquo;Provisional&rdquo; alert with zero page reload.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                4
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                10 MINS
              </span>
            </div>
            <h3 className="text-xs font-bold text-slate-900">Sealed in Stone</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When miners confirm the block, the pinboard automatically flips status from &ldquo;Provisional&rdquo; to &ldquo;Permanent &amp; Certified&rdquo; for court.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4: Online Graph Synchronization (The Digital Pinboard) */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            04
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Online Graph Synchronization: The Live Detective Pinboard
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Updating the Neo4j knowledge graph smoothly without dropping analyst connections or causing 404 errors
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Picture a classic police detective corkboard covered with photographs, suspect names, and red yarn connecting accomplices.
            Now imagine that corkboard is connected to live fiber-optic wires. As criminals make moves anywhere in the world,
            new photos pin themselves to the board, and red strings stretch across the room automatically.
          </p>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-600 uppercase border-b border-slate-200 pb-2">
              <span>Engineering the Zero-Lag Live Pinboard</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                ZERO-404 ARCHITECTURE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-slate-900 font-bold flex items-center gap-1.5 font-mono">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  Atomic Threading Locks
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  FastAPI handles hundreds of active analyst queries while simultaneously writing new Mempool alerts using
                  <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px] text-slate-900 ml-1 font-bold">threading.RLock()</code>.
                  Batch updates take less than 1.2ms, preventing screen stuttering or crashes.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-slate-900 font-bold flex items-center gap-1.5 font-mono">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  Provisional Status Flag
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  New entities display an amber &ldquo;Provisional&rdquo; badge so investigators know the threat was spotted in the Mempool.
                  This ensures full compliance with Section 65B Indian Evidence Act / Section 63 BSA 2023.
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-slate-900 font-bold flex items-center gap-1.5 font-mono">
                  <Share2 className="w-3.5 h-3.5 text-sky-600" />
                  Non-Blocking Graph Merge
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  When a block is finally mined, Neo4j merges the confirmed status cleanly. If a criminal cancels or replaces a payment via RBF,
                  the diversion is linked to the suspect profile as proof of intentional evasion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: Interactive Visual Elements */}
      <section className="space-y-8 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            05
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Interactive Visual Simulators &amp; Testbed
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Hands-on tools demonstrating the sub-5ms Mempool intercept and live graph pinboard synchronization
            </p>
          </div>
        </div>

        {/* Module A: Step Sequence Visualizer */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            Module A: 5-Step Watchtower Intercept Sequence Visualizer
          </div>
          <SyncSequenceDiagram />
        </div>

        {/* Module B: Mempool Playground Simulator */}
        <div className="space-y-3 pt-4">
          <div className="text-xs font-mono font-bold uppercase text-slate-700 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            Module B: Live Mempool Sniffer &amp; Graph Sync Playground
          </div>
          <SyncPlayground />
        </div>
      </section>

      {/* SECTION 6: Non-Technical FAQ */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-xs">
            06
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Judge &amp; Teammate Defense FAQ
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              Plain-English justifications addressing Mempool sniffing, double-spends, speed, and Section 65B court validity
            </p>
          </div>
        </div>

        <SyncFaq />
      </section>

      {/* SECTION 7: PITCH-READY CHEAT SHEET */}
      <section className="pt-6">
        <div className="p-6 sm:p-7 rounded-2xl border-2 border-indigo-500/80 bg-gradient-to-b from-indigo-50/60 to-white shadow-md space-y-5 relative overflow-hidden">
          {/* Decorative Corner Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                  HACKATHON PRESENTATION ESSENTIAL
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                  How to Explain Chapter 7 to a Judge in 30 Seconds
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono text-indigo-900 font-bold bg-white px-3 py-1 rounded-full border border-indigo-300 self-start sm:self-auto shadow-xs">
              30-SECOND ELEVATOR PITCH
            </span>
          </div>

          {/* The Core Pitch Script */}
          <div className="p-4 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-2">
            <div className="text-[11px] font-mono uppercase font-bold text-indigo-800 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Word-for-Word Speaking Script:
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed italic font-medium">
              &ldquo;Judges, Bitcoin takes <strong>10 minutes</strong> to confirm a block. In 10 minutes, a criminal has already moved the stolen funds through 5 different wallets and swapped to Monero. Traditional explorers arrive 10 minutes too late.
              <br /><br />
              Our <strong>Watchtower</strong> monitors the <em>Mempool</em> &mdash; the waiting room where transactions sit before miners write them to stone. The instant a suspicious payment is broadcast, our AI analyzes it in <strong>under 5 milliseconds</strong>, updates our detective pinboard live, and sounds the alarm <strong>before</strong> the transaction is even confirmed.&rdquo;
            </p>
          </div>

          {/* Three Key Talking Points Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono text-[10px] font-bold uppercase text-indigo-700">1. The Waiting Room</div>
              <div className="font-bold text-slate-900">The Mempool Analogy</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Transactions wait in the lobby before miners chisel them in rock. We scan them in the lobby.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono text-[10px] font-bold uppercase text-emerald-700">2. Sub-5ms AI Triage</div>
              <div className="font-bold text-slate-900">Zero-Lag Detection</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Detects peeling chains and ransomware seed recipients instantly on CPU without waiting for batch jobs.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1">
              <div className="font-mono text-[10px] font-bold uppercase text-amber-700">3. Live Pinboard Sync</div>
              <div className="font-bold text-slate-900">Provisional Transparency</div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Neo4j updates in real time with an amber Provisional tag, upholding Section 65B Evidence Act integrity.
              </p>
            </div>
          </div>

          {/* Judge Trap / Comeback Card */}
          <div className="p-3.5 rounded-lg bg-indigo-900 text-white text-xs space-y-1">
            <div className="font-mono text-[10px] font-bold uppercase text-amber-300">
              When a Judge Asks: &ldquo;What if the criminal cancels the transaction?&rdquo;
            </div>
            <p className="text-slate-200 text-[11px] leading-relaxed">
              <strong>Your Instant Comeback:</strong> &ldquo;That&rsquo;s Replace-By-Fee (RBF). The Watchtower catches the cancellation attempt immediately, links the diversion to the suspect&rsquo;s profile, and gives us even stronger behavioral evidence of intentional evasion!&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER FOOTER NAVIGATION */}
      <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/docs/ch6-risk-engine-xai-legal"
          className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-2 group cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
          <div className="text-left">
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Previous Chapter</div>
            <div className="font-semibold text-slate-900">Ch 6: Multi-Factor Risk &amp; Section 65B Legal</div>
          </div>
        </Link>

        <div className="text-xs font-mono text-slate-400 text-center">
          DOCUMENT SPECIFICATION • SEC-DOC-26146-CH07
        </div>

        <Link
          href="/docs/ch8-command-center-dev-ops"
          className="btn-tactical-primary text-white text-xs font-medium px-5 py-2.5 rounded-lg flex items-center gap-2 group cursor-pointer shadow-xs"
        >
          <div className="text-left">
            <div className="text-[10px] text-blue-200 font-mono uppercase tracking-wider font-semibold">Next Chapter</div>
            <div className="font-semibold text-white">Ch 8: Command Center &amp; Ops Runbook</div>
          </div>
          <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform ml-2" />
        </Link>
      </div>
    </article>
  );
}
