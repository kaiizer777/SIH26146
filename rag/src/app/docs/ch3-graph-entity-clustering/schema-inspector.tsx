"use client";

import React, { useState } from "react";
import {
  Database,
  Network,
  Copy,
  Check,
  Code2,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Info,
  ExternalLink,
  Sparkles,
} from "lucide-react";

type SchemaCategory = "nodes" | "edges";

interface PropertyDefinition {
  name: string;
  type: string;
  constraint: string;
  description: string;
  example: string;
}

interface SchemaEntity {
  id: string;
  name: string;
  kind: "node" | "edge";
  categoryLabel: string;
  badgeColor: string;
  badgeBorder: string;
  badgeBg: string;
  cardinality: string;
  cardinalitySub: string;
  analogy: string;
  summary: string;
  properties: PropertyDefinition[];
  cypherQuery: string;
  queryDescription: string;
  hardeningRule: string;
  sourceFile: string;
}

const SCHEMA_ENTITIES: Record<string, SchemaEntity> = {
  wallet: {
    id: "wallet",
    name: ":Wallet",
    kind: "node",
    categoryLabel: "THE SUSPECT'S WALLET (NODE)",
    badgeColor: "text-amber-700",
    badgeBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
    cardinality: "24,673 Nodes",
    cardinalitySub: "100% Grouped into Syndicates",
    analogy: "Detective's Pinboard: Suspect Photo",
    summary:
      "Every cryptocurrency address is like a suspect's digital bank account. Even though criminals use fake names, their wallet addresses are permanently recorded on the blockchain. Our AI groups these addresses into criminal syndicates.",
    properties: [
      {
        name: "address",
        type: "STRING",
        constraint: "UNIQUE (btree)",
        description: "Public wallet address (like a bank account number)",
        example: "'1BoatSLRHtKNngkdXEeobR76b53LETtpyT'",
      },
      {
        name: "cluster_id",
        type: "INTEGER",
        constraint: "INDEXED",
        description: "Crime Syndicate ID (grouped automatically by Louvain clustering)",
        example: "9451 (Ransomware Group)",
      },
      {
        name: "risk_score",
        type: "FLOAT",
        constraint: "INDEXED",
        description: "AI Danger Rating: from 0.0 (clean) to 1.0 (dangerous criminal)",
        example: "0.89 (High Risk)",
      },
      {
        name: "anomaly_score",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "Weirdness Rating: flags abnormal spending surges or bot activity",
        example: "0.048",
      },
      {
        name: "is_seed_illicit",
        type: "BOOLEAN",
        constraint: "INDEXED",
        description: "True if verified by law enforcement intelligence as a ransomware gang",
        example: "true",
      },
      {
        name: "seed_proximity",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "Proximity score: how closely connected this wallet is to known hackers",
        example: "0.1428",
      },
    ],
    cypherQuery: `// 1. Enforce Uniqueness & Fast B-Tree Indexes
CREATE CONSTRAINT wallet_address_unique IF NOT EXISTS
FOR (w:Wallet) REQUIRE w.address IS UNIQUE;

CREATE INDEX wallet_cluster_idx IF NOT EXISTS
FOR (w:Wallet) ON (w.cluster_id);

CREATE INDEX wallet_risk_idx IF NOT EXISTS
FOR (w:Wallet) ON (w.risk_score);

// 2. Sample Inspection: Find Most Dangerous Wallets in Syndicate #9451
MATCH (w:Wallet)
WHERE w.cluster_id = 9451
RETURN w.address, w.risk_score, w.anomaly_score, w.is_seed_illicit
ORDER BY w.risk_score DESC
LIMIT 10;`,
    queryDescription:
      "Strict schema rules guarantee sub-millisecond wallet lookup and instant syndicate filtering.",
    hardeningRule:
      "Indexed on (cluster_id) and (risk_score) so when an investigator searches an alert, the entire syndicate loads in <15ms.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  transaction: {
    id: "transaction",
    name: ":Transaction",
    kind: "node",
    categoryLabel: "THE MONEY TRANSFER (NODE)",
    badgeColor: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    cardinality: "100,000 Nodes",
    cardinalitySub: "Full Multi-Input Ledger",
    analogy: "Detective's Pinboard: Wire Transfer Receipt",
    summary:
      "Represents the actual transfer of Bitcoin on the immutable ledger. It binds sender input wallets to recipient output wallets and links physical internet broadcast servers (IP/ASN) to the money flow.",
    properties: [
      {
        name: "txid",
        type: "STRING",
        constraint: "UNIQUE (btree)",
        description: "Unique 64-character transaction hash (wire confirmation code)",
        example: "'9f8b2c4e...d81a3'",
      },
      {
        name: "ts",
        type: "DATETIME",
        constraint: "TIME INDEX",
        description: "Exact timestamp when the transaction occurred",
        example: "'2026-09-07T18:21:04Z'",
      },
      {
        name: "total_in",
        type: "FLOAT",
        constraint: "REQUIRED",
        description: "Total Bitcoin collected from all input wallets combined",
        example: "4.52000000 BTC",
      },
      {
        name: "total_out",
        type: "FLOAT",
        constraint: "REQUIRED",
        description: "Total Bitcoin paid out to recipient and change wallets",
        example: "4.51950000 BTC",
      },
      {
        name: "fee",
        type: "FLOAT",
        constraint: "REQUIRED",
        description: "Miner processing fee (total_in minus total_out)",
        example: "0.00050000 BTC",
      },
      {
        name: "anomaly_score",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "Unusual fee or transaction structure warning score",
        example: "0.0892",
      },
    ],
    cypherQuery: `// 1. Enforce Transaction Uniqueness
CREATE CONSTRAINT tx_txid_unique IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.txid IS UNIQUE;

// 2. High-Speed Batch Ingest via UNWIND
UNWIND $batch AS row
MERGE (t:Transaction {txid: row.txid})
ON CREATE SET 
  t.ts = row.ts,
  t.total_in = row.total_in,
  t.total_out = row.total_out,
  t.fee = row.fee,
  t.anomaly_score = row.anomaly_score;`,
    queryDescription:
      "Batch-upserted in chunks of 1,000 items to prevent duplicate transactions without locking the database.",
    hardeningRule:
      "Bounded display quota (capped at 35 transactions per view) ensures the interactive 3D/graph canvas never freezes.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  ip: {
    id: "ip",
    name: ":IP",
    kind: "node",
    categoryLabel: "CRIME SCENE LOCATION (NODE)",
    badgeColor: "text-sky-700",
    badgeBorder: "border-sky-200",
    badgeBg: "bg-sky-50",
    cardinality: "32,840 Nodes",
    cardinalitySub: "Enriched with Sovereign GeoIP",
    analogy: "Detective's Pinboard: Crime Scene Map Marker",
    summary:
      "The physical internet IP address and server location that transmitted the transaction across the web. Enriched 100% offline using local GeoIP files so we know the hosting provider and country.",
    properties: [
      {
        name: "address",
        type: "STRING",
        constraint: "UNIQUE (btree)",
        description: "Physical IPv4 or IPv6 internet broadcast address",
        example: "'185.220.101.5'",
      },
      {
        name: "country",
        type: "STRING (ISO-2)",
        constraint: "INDEXED",
        description: "Sovereign country code where the server is located",
        example: "'DE' (Germany), 'BG' (Bulgaria)",
      },
      {
        name: "asn",
        type: "INTEGER",
        constraint: "INDEXED",
        description: "Network provider number (bulletproof hosting datacenter ID)",
        example: "208323 (Bulletproof Hosting)",
      },
      {
        name: "src_port",
        type: "INTEGER",
        constraint: "OPTIONAL",
        description: "Port used to relay the Bitcoin transaction packet",
        example: "8333",
      },
    ],
    cypherQuery: `// 1. Enforce IP Uniqueness
CREATE CONSTRAINT ip_address_unique IF NOT EXISTS
FOR (ip:IP) REQUIRE ip.address IS UNIQUE;

// 2. Trace Malicious Server to Criminal Syndicates
MATCH (ip:IP)-[:OBSERVED]->(t:Transaction)<-[:SENDS]-(w:Wallet)
WHERE ip.asn = 208323 AND w.risk_score > 0.85
RETURN ip.address, ip.country, count(DISTINCT t) AS illicit_txs, collect(DISTINCT w.cluster_id) AS syndicates
ORDER BY illicit_txs DESC
LIMIT 10;`,
    queryDescription:
      "Direct multi-hop traversal linking physical servers to high-risk criminal syndicates.",
    hardeningRule:
      "IP nodes connect strictly to :Transaction via :OBSERVED to maintain clean separation between physical internet wiring and on-chain wallets.",
    sourceFile: "backend/app/services/graph_service.py",
  },
  cospend: {
    id: "cospend",
    name: ":CO_SPEND",
    kind: "edge",
    categoryLabel: "THE PIZZA BILL CONNECTION (EDGE)",
    badgeColor: "text-indigo-700",
    badgeBorder: "border-indigo-200",
    badgeBg: "bg-indigo-50",
    cardinality: "79,240 Edges",
    cardinalitySub: "Saved with Friendship Rule",
    analogy: "Detective's Pinboard: The Smoking Gun Red String",
    summary:
      "The smoking gun! If Wallet A and Wallet B are both spent together to pay for a single transaction, they must be controlled by the exact same suspect (Common-Input Ownership Heuristic).",
    properties: [
      {
        name: "addr1",
        type: "STRING",
        constraint: "ALPHABETICAL MIN",
        description: "First wallet address in the pair (alphabetically smaller)",
        example: "'1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'",
      },
      {
        name: "addr2",
        type: "STRING",
        constraint: "ALPHABETICAL MAX",
        description: "Second wallet address in the pair (alphabetically larger)",
        example: "'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'",
      },
      {
        name: "weight",
        type: "FLOAT",
        constraint: "FREQUENCY",
        description: "Connection strength: how many times they spent coins together",
        example: "1.0",
      },
    ],
    cypherQuery: `// 1. Create Pairwise CO_SPEND with Anti-Explosion Rule
UNWIND $batch AS row
MATCH (w1:Wallet {address: row.addr1})
MATCH (w2:Wallet {address: row.addr2})
WHERE row.addr1 < row.addr2
MERGE (w1)-[:CO_SPEND]->(w2);

// 2. In-Memory Graph Projection for Rapid Louvain Clustering
CALL gds.graph.project(
  'wallet_cospend',
  'Wallet',
  {
    CO_SPEND: { orientation: 'UNDIRECTED' }
  }
)
YIELD graphName, nodeCount, relationshipCount;`,
    queryDescription:
      "Only creates edges where addr1 < addr2, cutting database storage by exactly 50% and eliminating duplicate lines.",
    hardeningRule:
      "Storing single directed edges cuts disk storage and memory by 50% while Louvain analyzes them symmetrically in RAM.",
    sourceFile: "backend/scripts/cluster_wallets.py",
  },
  sends: {
    id: "sends",
    name: ":SENDS",
    kind: "edge",
    categoryLabel: "MONEY LEAVING WALLET (EDGE)",
    badgeColor: "text-amber-700",
    badgeBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
    cardinality: "138,000 Edges",
    cardinalitySub: "Wallet → Transaction",
    analogy: "Detective's Pinboard: Outgoing Payment Flow",
    summary:
      "Directed flow from a suspect's wallet to the transaction they funded. Records the exact amount of Bitcoin supplied and the address type used.",
    properties: [
      {
        name: "amount",
        type: "FLOAT",
        constraint: "POSITIVE",
        description: "Bitcoin amount contributed from this input wallet",
        example: "1.25000000 BTC",
      },
      {
        name: "script_type",
        type: "STRING",
        constraint: "SCRIPT TYPE",
        description: "Bitcoin address category (Legacy, SegWit, or modern Taproot)",
        example: "'p2wpkh' (SegWit)",
      },
    ],
    cypherQuery: `// Batch Upsert of SENDS Input Edges
UNWIND $batch AS row
MATCH (w:Wallet {address: row.wallet_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (w)-[r:SENDS {amount: row.amount, script_type: row.script_type}]->(t);`,
    queryDescription:
      "Maps the source funds flowing into the transaction execution node.",
    hardeningRule:
      "Amounts are synchronized with high-precision decimals in PostgreSQL to guarantee zero rounding errors across millions of transactions.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  receives: {
    id: "receives",
    name: ":RECEIVES",
    kind: "edge",
    categoryLabel: "MONEY ARRIVING AT WALLET (EDGE)",
    badgeColor: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    cardinality: "188,342 Edges",
    cardinalitySub: "Transaction → Wallet",
    analogy: "Detective's Pinboard: Incoming Payout Flow",
    summary:
      "Directed flow from a transaction to a destination wallet. Captures payments to merchants, payouts to accomplices, and change addresses returning unspent coins to the sender.",
    properties: [
      {
        name: "amount",
        type: "FLOAT",
        constraint: "POSITIVE",
        description: "Bitcoin amount received by this destination wallet",
        example: "0.04500000 BTC",
      },
    ],
    cypherQuery: `// Batch Upsert of RECEIVES Output Edges
UNWIND $batch AS row
MATCH (t:Transaction {txid: row.txid})
MATCH (w:Wallet {address: row.wallet_addr})
MERGE (t)-[r:RECEIVES {amount: row.amount}]->(w);`,
    queryDescription:
      "Enables linear forward tracing for peeling chains and fund tracking.",
    hardeningRule:
      "Used extensively by our Peeling Chain Detector to trace money hop-by-hop as criminals peel off small amounts to wash their loot.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  observed: {
    id: "observed",
    name: ":OBSERVED",
    kind: "edge",
    categoryLabel: "CAUGHT ON CAMERA (EDGE)",
    badgeColor: "text-sky-700",
    badgeBorder: "border-sky-200",
    badgeBg: "bg-sky-50",
    cardinality: "100,000 Edges",
    cardinalitySub: "IP → Transaction Link",
    analogy: "Detective's Pinboard: Network Wiretap Link",
    summary:
      "Connects the physical internet IP address to the transaction it broadcasted across the web. This is the crucial bridge connecting physical location to the blockchain ledger.",
    properties: [
      {
        name: "ts",
        type: "DATETIME",
        constraint: "TIMESTAMP",
        description: "Exact time the transaction packet arrived at the network sensor",
        example: "'2026-09-07T18:21:04Z'",
      },
      {
        name: "dst_port",
        type: "INTEGER",
        constraint: "PORT (0-65535)",
        description: "Destination port on the Bitcoin node receiving the packet",
        example: "8333",
      },
    ],
    cypherQuery: `// Batch Upsert of OBSERVED Network Link
UNWIND $batch AS row
MATCH (ip:IP {address: row.ip_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (ip)-[r:OBSERVED {ts: row.ts, dst_port: row.dst_port}]->(t);

// Network-to-Blockchain Correlation: Which Syndicates Use This Malicious ASN?
MATCH (ip:IP)-[:OBSERVED]->(t:Transaction)<-[:SENDS]-(w:Wallet)
WHERE ip.asn = 208323
RETURN w.cluster_id, count(t) AS tx_volume, collect(DISTINCT ip.country) AS countries;`,
    queryDescription:
      "Correlates raw internet network traffic metadata directly with the cryptographic spending entity.",
    hardeningRule:
      "Deduplicated in Python memory before rendering so the forensic graph never renders duplicate red strings.",
    sourceFile: "backend/app/routers/graph.py",
  },
};

export function SchemaInspector() {
  const [selectedCategory, setSelectedCategory] = useState<SchemaCategory>("nodes");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("wallet");
  const [copied, setCopied] = useState<boolean>(false);

  const activeEntity = SCHEMA_ENTITIES[selectedEntityId] || SCHEMA_ENTITIES.wallet;

  const handleCopyCypher = () => {
    navigator.clipboard.writeText(activeEntity.cypherQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nodeIds = ["wallet", "transaction", "ip"];
  const edgeIds = ["cospend", "sends", "receives", "observed"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Tactical Component Header */}
      <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              INTERACTIVE DETECTIVE PINBOARD SCHEMA
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            The Evidence Map: Nodes &amp; Red Strings
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any node or connection below to inspect real-world analogies, properties, and production Cypher queries.
          </p>
        </div>

        {/* Category Switcher */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-lg border border-slate-200 text-xs font-mono">
          <button
            onClick={() => {
              setSelectedCategory("nodes");
              if (!nodeIds.includes(selectedEntityId)) setSelectedEntityId("wallet");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              selectedCategory === "nodes"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Evidence Nodes (3)
          </button>
          <button
            onClick={() => {
              setSelectedCategory("edges");
              if (!edgeIds.includes(selectedEntityId)) setSelectedEntityId("cospend");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
              selectedCategory === "edges"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Red String Edges (4)
          </button>
        </div>
      </div>

      {/* Entity Selector Tabs */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap gap-2">
        {(selectedCategory === "nodes" ? nodeIds : edgeIds).map((id) => {
          const item = SCHEMA_ENTITIES[id];
          const isSelected = selectedEntityId === id;
          return (
            <button
              key={id}
              onClick={() => setSelectedEntityId(id)}
              className={`px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center gap-2 cursor-pointer border ${
                isSelected
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  id === "wallet"
                    ? "bg-amber-400"
                    : id === "transaction"
                    ? "bg-emerald-400"
                    : id === "ip"
                    ? "bg-sky-400"
                    : id === "cospend"
                    ? "bg-indigo-400"
                    : id === "sends"
                    ? "bg-amber-400"
                    : id === "receives"
                    ? "bg-emerald-400"
                    : "bg-sky-400"
                }`}
              />
              <span className="font-bold">{item.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isSelected ? "bg-slate-800 text-slate-300" : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                {item.cardinality.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Inspection Grid */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Entity Definition & Property Table (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Header Card */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${activeEntity.badgeBg} ${activeEntity.badgeColor} border ${activeEntity.badgeBorder}`}
                >
                  {activeEntity.name}
                </span>
                <span className="text-slate-400 text-xs font-mono">/</span>
                <span className="font-mono text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {activeEntity.categoryLabel}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-bold text-slate-900">{activeEntity.cardinality}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({activeEntity.cardinalitySub})</span>
              </div>
            </div>

            {/* Analogy Badge */}
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>{activeEntity.analogy}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {activeEntity.summary}
            </p>
          </div>

          {/* Property Schema Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Evidence Properties &amp; Meaning
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activeEntity.properties.length} properties defined
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Field</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Index Rule</th>
                      <th className="py-2 px-3">Plain-English Meaning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeEntity.properties.map((prop, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {prop.name}
                        </td>
                        <td className="py-2 px-2 font-mono text-[11px] text-sky-700">
                          {prop.type}
                        </td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              prop.constraint.includes("UNIQUE")
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : prop.constraint.includes("INDEXED")
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {prop.constraint}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">
                          {prop.description}
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            e.g. {prop.example}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Hardening & Performance Note */}
          <div className="p-3 bg-sky-50/50 rounded-lg border border-sky-100 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-sky-900">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              Forensic Reliability Rule
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              {activeEntity.hardeningRule}
            </p>
          </div>
        </div>

        {/* Right Column: Visual Triad Mini-Map & Cypher Box (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Visual Topology Mini-Map */}
          <div className="p-4 rounded-lg bg-slate-900 text-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-sky-400" />
                The Detective&apos;s Pinboard Web
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">INTERACTIVE MINI-MAP</span>
            </div>

            {/* SVG Visual Triad */}
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center justify-center">
              <svg viewBox="0 0 320 180" className="w-full h-auto max-w-[300px]">
                {/* Background Grid Accent */}
                <defs>
                  <pattern id="grid-pattern" width="16" height="16" patternUnits="userSpaceOnUse">
                    <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                  </pattern>
                  <marker
                    id="arrow-amber"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 7 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="arrow-emerald"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 7 5 L 0 9 z" fill="#10b981" />
                  </marker>
                  <marker
                    id="arrow-sky"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 7 5 L 0 9 z" fill="#0284c7" />
                  </marker>
                </defs>
                <rect width="320" height="180" fill="url(#grid-pattern)" />

                {/* SENDS edge (Wallet -> Transaction) */}
                <path
                  d="M 80 50 L 160 50"
                  stroke={selectedEntityId === "sends" ? "#f59e0b" : "#475569"}
                  strokeWidth={selectedEntityId === "sends" ? "2.5" : "1.5"}
                  strokeDasharray={selectedEntityId === "sends" ? "none" : "3,2"}
                  markerEnd="url(#arrow-amber)"
                />
                <text x="120" y="42" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  :SENDS
                </text>

                {/* RECEIVES edge (Transaction -> Destination Wallet) */}
                <path
                  d="M 215 65 L 260 110"
                  stroke={selectedEntityId === "receives" ? "#10b981" : "#475569"}
                  strokeWidth={selectedEntityId === "receives" ? "2.5" : "1.5"}
                  strokeDasharray={selectedEntityId === "receives" ? "none" : "3,2"}
                  markerEnd="url(#arrow-emerald)"
                />
                <text x="250" y="80" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  :RECEIVES
                </text>

                {/* OBSERVED edge (IP -> Transaction) */}
                <path
                  d="M 160 135 L 180 80"
                  stroke={selectedEntityId === "observed" ? "#0284c7" : "#475569"}
                  strokeWidth={selectedEntityId === "observed" ? "2.5" : "1.5"}
                  markerEnd="url(#arrow-sky)"
                />
                <text x="150" y="112" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  :OBSERVED
                </text>

                {/* CO_SPEND edge (Wallet A <-> Wallet B) */}
                <path
                  d="M 50 75 Q 35 120 70 145"
                  fill="none"
                  stroke={selectedEntityId === "cospend" ? "#818cf8" : "#475569"}
                  strokeWidth={selectedEntityId === "cospend" ? "2.5" : "1.5"}
                  strokeDasharray="4,2"
                />
                <text x="35" y="112" fill="#a5b4fc" fontSize="8" fontFamily="monospace" textAnchor="middle">
                  :CO_SPEND
                </text>

                {/* Node: Wallet (Sender) */}
                <g
                  className="cursor-pointer"
                  onClick={() => setSelectedEntityId("wallet")}
                >
                  <circle
                    cx="55"
                    cy="50"
                    r="24"
                    fill="#1e293b"
                    stroke={selectedEntityId === "wallet" ? "#f59e0b" : "#64748b"}
                    strokeWidth={selectedEntityId === "wallet" ? "3" : "1.5"}
                  />
                  <text x="55" y="53" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    :Wallet
                  </text>
                  <text x="55" y="63" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    (Sender)
                  </text>
                </g>

                {/* Node: Peer Wallet (CO_SPEND) */}
                <g
                  className="cursor-pointer"
                  onClick={() => setSelectedEntityId("wallet")}
                >
                  <circle
                    cx="85"
                    cy="145"
                    r="18"
                    fill="#1e293b"
                    stroke={selectedEntityId === "wallet" ? "#f59e0b" : "#475569"}
                    strokeWidth="1.5"
                  />
                  <text x="85" y="148" fill="#f8fafc" fontSize="8" fontFamily="monospace" textAnchor="middle">
                    :Wallet
                  </text>
                </g>

                {/* Node: Transaction */}
                <g
                  className="cursor-pointer"
                  onClick={() => setSelectedEntityId("transaction")}
                >
                  <rect
                    x="165"
                    y="32"
                    width="48"
                    height="36"
                    rx="6"
                    fill="#1e293b"
                    stroke={selectedEntityId === "transaction" ? "#10b981" : "#64748b"}
                    strokeWidth={selectedEntityId === "transaction" ? "3" : "1.5"}
                  />
                  <text x="189" y="50" fill="#f8fafc" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    :Tx
                  </text>
                  <text x="189" y="60" fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
                    Transfer
                  </text>
                </g>

                {/* Node: Destination Wallet */}
                <g
                  className="cursor-pointer"
                  onClick={() => setSelectedEntityId("wallet")}
                >
                  <circle
                    cx="275"
                    cy="125"
                    r="20"
                    fill="#1e293b"
                    stroke={selectedEntityId === "wallet" ? "#f59e0b" : "#475569"}
                    strokeWidth="1.5"
                  />
                  <text x="275" y="127" fill="#f8fafc" fontSize="8" fontFamily="monospace" textAnchor="middle">
                    :Wallet
                  </text>
                  <text x="275" y="136" fill="#94a3b8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                    (Receiver)
                  </text>
                </g>

                {/* Node: IP */}
                <g
                  className="cursor-pointer"
                  onClick={() => setSelectedEntityId("ip")}
                >
                  <circle
                    cx="150"
                    cy="148"
                    r="20"
                    fill="#1e293b"
                    stroke={selectedEntityId === "ip" ? "#0284c7" : "#64748b"}
                    strokeWidth={selectedEntityId === "ip" ? "3" : "1.5"}
                  />
                  <text x="150" y="151" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    :IP
                  </text>
                  <text x="150" y="160" fill="#38bdf8" fontSize="6.5" fontFamily="monospace" textAnchor="middle">
                    Server
                  </text>
                </g>
              </svg>
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Click any node or line above to inspect its properties and queries
            </div>
          </div>

          {/* Production Cypher Box */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white space-y-0">
            <div className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-mono text-xs font-bold text-slate-800">
                  Production Cypher Implementation
                </span>
              </div>
              <button
                onClick={handleCopyCypher}
                className="btn-tactical-primary text-white text-[11px] font-mono px-2.5 py-1 rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-300" />
                    <span>Copy Cypher</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[220px] leading-relaxed">
              <pre>{activeEntity.cypherQuery}</pre>
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-500 flex items-center justify-between">
              <span>Source: {activeEntity.sourceFile}</span>
              <span className="text-emerald-700 font-semibold">100% Offline Neo4j 5.26</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
