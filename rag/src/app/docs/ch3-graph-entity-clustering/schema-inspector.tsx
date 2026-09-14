"use client";

import React, { useState } from "react";
import {
  Network,
  Copy,
  Check,
  Terminal,
  Layers,
  ShieldCheck,
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
    categoryLabel: "BLOCKCHAIN ENTITY NODE",
    badgeColor: "text-amber-700",
    badgeBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
    cardinality: "24,673 Nodes",
    cardinalitySub: "100% Clustered via Louvain",
    summary:
      "Represents a discrete cryptographic Bitcoin address (Base58 P2PKH/P2SH, Bech32 SegWit, or Bech32m Taproot). Serves as the atomic building block for entity clustering, anomaly evaluation, and Relational Graph Transformer risk inference.",
    properties: [
      {
        name: "address",
        type: "STRING",
        constraint: "UNIQUE CONSTRAINT (btree)",
        description: "Public key hash or script hash address string",
        example: "'1BoatSLRHtKNngkdXEeobR76b53LETtpyT'",
      },
      {
        name: "cluster_id",
        type: "INTEGER",
        constraint: "INDEXED (btree)",
        description: "Louvain community partition ID synced from GDS in-memory projection",
        example: "9451",
      },
      {
        name: "risk_score",
        type: "FLOAT",
        constraint: "INDEXED (range)",
        description: "Composite GNN risk probability computed by Relational Graph Transformer (PyG TransformerConv, F1=0.9209; legacy baseline GraphSAGE F1=0.8696/0.9711) [0.0, 1.0]",
        example: "0.8924",
      },
      {
        name: "anomaly_score",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "Tabular anomaly score computed by FT-Transformer (calibrated threshold θ = 0.036354; legacy baseline Autoencoder MSE 0.034618)",
        example: "0.0481",
      },
      {
        name: "is_seed_illicit",
        type: "BOOLEAN",
        constraint: "INDEXED (lookup)",
        description: "True if address matches the 11,186 curated Ransomwhere seed intelligence list",
        example: "true",
      },
      {
        name: "seed_proximity",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "Personalized PageRank (PPR) random walk score rooted at Ransomwhere seeds",
        example: "0.1428",
      },
    ],
    cypherQuery: `// 1. Enforce Uniqueness & B-Tree Indexes
CREATE CONSTRAINT wallet_address_unique IF NOT EXISTS
FOR (w:Wallet) REQUIRE w.address IS UNIQUE;

CREATE INDEX wallet_cluster_idx IF NOT EXISTS
FOR (w:Wallet) ON (w.cluster_id);

CREATE INDEX wallet_risk_idx IF NOT EXISTS
FOR (w:Wallet) ON (w.risk_score);

// 2. Sample Inspection of High-Risk Cluster Members
MATCH (w:Wallet)
WHERE w.cluster_id = 9451
RETURN w.address, w.risk_score, w.anomaly_score, w.is_seed_illicit
ORDER BY w.risk_score DESC
LIMIT 10;`,
    queryDescription:
      "Strict schema constraints ensure sub-millisecond lookup and deduplication during high-speed batch ingest.",
    hardeningRule:
      "Indexed on (cluster_id) and (risk_score) so API endpoints like /api/v1/graph/{cluster_id} execute in <15ms without full graph scans.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  transaction: {
    id: "transaction",
    name: ":Transaction",
    kind: "node",
    categoryLabel: "LEDGER STATE TRANSITION NODE",
    badgeColor: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    cardinality: "100,000 Nodes",
    cardinalitySub: "Full Multi-Input/Output Ledger",
    summary:
      "Represents a verified on-chain Bitcoin transaction. Binds sender inputs to recipient outputs and links physical network propagation telemetry (IP/ASN) to the ledger state.",
    properties: [
      {
        name: "txid",
        type: "STRING",
        constraint: "UNIQUE CONSTRAINT (btree)",
        description: "64-character double-SHA256 transaction hash identifier",
        example: "'9f8b2c4e...d81a3'",
      },
      {
        name: "ts",
        type: "DATETIME / STRING",
        constraint: "TEMPORAL INDEX",
        description: "Block confirmation timestamp or mempool initial arrival time (ISO 8601)",
        example: "'2026-09-07T18:21:04Z'",
      },
      {
        name: "total_in",
        type: "FLOAT / SATOSHI",
        constraint: "REQUIRED",
        description: "Aggregate sum of all resolved UTXO input values",
        example: "4.52000000",
      },
      {
        name: "total_out",
        type: "FLOAT / SATOSHI",
        constraint: "REQUIRED",
        description: "Aggregate sum of all generated UTXO output values",
        example: "4.51950000",
      },
      {
        name: "fee",
        type: "FLOAT / SATOSHI",
        constraint: "REQUIRED",
        description: "Miner fee (total_in - total_out) in BTC/satoshis",
        example: "0.00050000",
      },
      {
        name: "anomaly_score",
        type: "FLOAT",
        constraint: "OPTIONAL",
        description: "FT-Transformer tabular anomaly score flagging abnormal fee/entropy ratios (calibrated threshold θ = 0.036354; legacy baseline Autoencoder MSE 0.034618)",
        example: "0.0892",
      },
    ],
    cypherQuery: `// 1. Enforce Transaction Uniqueness
CREATE CONSTRAINT tx_txid_unique IF NOT EXISTS
FOR (t:Transaction) REQUIRE t.txid IS UNIQUE;

// 2. High-Volume Batch Upsert via UNWIND
UNWIND $batch AS row
MERGE (t:Transaction {txid: row.txid})
ON CREATE SET 
  t.ts = row.ts,
  t.total_in = row.total_in,
  t.total_out = row.total_out,
  t.fee = row.fee,
  t.anomaly_score = row.anomaly_score;`,
    queryDescription:
      "Batch-upserted in chunks of 1,000 items with ON CREATE SET to prevent duplicate node instantiation.",
    hardeningRule:
      "Transactional nodes are bounded in API queries (base quota: 25% of max_nodes, capped at 35) to prevent mega-transactions from flooding the D3 viewport.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  ip: {
    id: "ip",
    name: ":IP",
    kind: "node",
    categoryLabel: "NETWORK TELEMETRY NODE",
    badgeColor: "text-sky-700",
    badgeBorder: "border-sky-200",
    badgeBg: "bg-sky-50",
    cardinality: "32,840 Nodes",
    cardinalitySub: "Enriched via MaxMind mmdb",
    summary:
      "Represents a physical or proxy IP address observed broadcasting or relaying transaction packets across the Bitcoin P2P network. Enriched offline with sovereign GeoLite2 data.",
    properties: [
      {
        name: "address",
        type: "STRING",
        constraint: "UNIQUE CONSTRAINT (btree)",
        description: "IPv4 or IPv6 broadcast origin address",
        example: "'185.220.101.5'",
      },
      {
        name: "country",
        type: "STRING (ISO-2)",
        constraint: "INDEXED",
        description: "Two-letter ISO geographic sovereign country code",
        example: "'DE' (Germany)",
      },
      {
        name: "asn",
        type: "INTEGER",
        constraint: "INDEXED",
        description: "Autonomous System Number resolved from local GeoLite2-ASN database",
        example: "208323",
      },
      {
        name: "src_port",
        type: "INTEGER",
        constraint: "OPTIONAL",
        description: "Source port recorded by packet sniffer / collector daemon",
        example: "8333",
      },
    ],
    cypherQuery: `// 1. Enforce IP Uniqueness
CREATE CONSTRAINT ip_address_unique IF NOT EXISTS
FOR (ip:IP) REQUIRE ip.address IS UNIQUE;

// 2. Correlate IP Telemetry to Multi-Input Suspicious Flows
MATCH (ip:IP)-[:OBSERVED]->(t:Transaction)<-[:SENDS]-(w:Wallet)
WHERE w.risk_score > 0.85
RETURN ip.country, ip.asn, count(DISTINCT t) AS suspicious_txs, collect(DISTINCT w.cluster_id) AS clusters
ORDER BY suspicious_txs DESC
LIMIT 10;`,
    queryDescription:
      "Direct multi-hop traversal linking physical network routing (ASNs, hosting providers, Tor exit relays) to high-risk blockchain clusters.",
    hardeningRule:
      "Network IP nodes are isolated from wallet nodes; they connect strictly to :Transaction via :OBSERVED to maintain strict separation of physical network and ledger layers.",
    sourceFile: "backend/app/services/graph_service.py",
  },
  cospend: {
    id: "cospend",
    name: ":CO_SPEND",
    kind: "edge",
    categoryLabel: "COMMON-INPUT OWNERSHIP EDGE",
    badgeColor: "text-indigo-700",
    badgeBorder: "border-indigo-200",
    badgeBg: "bg-indigo-50",
    cardinality: "45,516 Stored Edges",
    cardinalitySub: "79,240 GDS Projected (Undirected)",
    summary:
      "Direct peer relationship between two :Wallet nodes established by the Common-Input Ownership Heuristic (CIOH). If Address A and Address B sign inputs to the same transaction, they are proven to belong to the same spending entity.",
    properties: [
      {
        name: "addr1",
        type: "STRING",
        constraint: "LEXICOGRAPHIC MIN",
        description: "Canonical first address satisfying addr1 < addr2",
        example: "'1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'",
      },
      {
        name: "addr2",
        type: "STRING",
        constraint: "LEXICOGRAPHIC MAX",
        description: "Canonical second address satisfying addr1 < addr2",
        example: "'3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'",
      },
      {
        name: "weight",
        type: "FLOAT (GDS projection)",
        constraint: "IMPLICIT / 1.0",
        description: "Co-occurrence frequency across multi-input transactions",
        example: "1.0",
      },
      {
        name: "attention_score",
        type: "FLOAT",
        constraint: "DYNAMIC GNN EDGE",
        description: "Multi-head attention coefficient from Relational Graph Transformer (alpha_mean = 0.88)",
        example: "0.8841",
      },
      {
        name: "head_attentions",
        type: "MAP / JSON",
        constraint: "DYNAMIC GNN EDGE",
        description: "Per-head attention weights {head_1_co_spend, head_2_multihop, head_3_seed_prox, head_4_peeling}",
        example: '{"head_1_co_spend": 0.91, "head_2_multihop": 0.84, "head_3_seed_prox": 0.89, "head_4_peeling": 0.88}',
      },
      {
        name: "is_explanatory",
        type: "BOOLEAN",
        constraint: "GNN EXPLAINER",
        description: "True if attention weight exceeds explanatory subgraph pruning threshold",
        example: "true",
      },
    ],
    cypherQuery: `// Projection of Pairwise CO_SPEND with Anti-Explosion Guard
UNWIND $batch AS row
MATCH (w1:Wallet {address: row.addr1})
MATCH (w2:Wallet {address: row.addr2})
WHERE row.addr1 < row.addr2
MERGE (w1)-[:CO_SPEND]->(w2);

// In-Memory GDS Projection for Louvain
CALL gds.graph.project(
  'wallet_cospend',
  'Wallet',
  {
    CO_SPEND: { orientation: 'UNDIRECTED' }
  }
)
YIELD graphName, nodeCount, relationshipCount;`,
    queryDescription:
      "Strictly creates edges only where addr1 < addr2, cutting edge storage by exactly 50% and preventing reciprocal graph explosion.",
    hardeningRule:
      "Crucial: Louvain projects :CO_SPEND as UNDIRECTED in GDS RAM. Storing single directed edges saves 50% disk/RAM while preserving symmetric graph modularity calculation.",
    sourceFile: "backend/scripts/cluster_wallets.py",
  },
  sends: {
    id: "sends",
    name: ":SENDS",
    kind: "edge",
    categoryLabel: "INPUT FUNDING FLOW EDGE",
    badgeColor: "text-amber-700",
    badgeBorder: "border-amber-200",
    badgeBg: "bg-amber-50",
    cardinality: "138,000 Edges",
    cardinalitySub: "Wallet → Transaction",
    summary:
      "Directed flow from a spending :Wallet to a :Transaction. Records the exact input amount consumed and the cryptographic script type used to authorize the expenditure.",
    properties: [
      {
        name: "amount",
        type: "FLOAT / SATOSHI",
        constraint: "NON-NEGATIVE",
        description: "Satoshis or BTC contributed by this input address",
        example: "1.25000000",
      },
      {
        name: "script_type",
        type: "STRING",
        constraint: "VALIDATED ENUM",
        description: "Script category (P2PKH, P2SH, P2WPKH, P2TR Taproot)",
        example: "'p2wpkh'",
      },
    ],
    cypherQuery: `// Batch Upsert of SENDS Input Edges
UNWIND $batch AS row
MATCH (w:Wallet {address: row.wallet_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (w)-[r:SENDS {amount: row.amount, script_type: row.script_type}]->(t);`,
    queryDescription:
      "Maps the UTXO consumption flow into the transaction execution node.",
    hardeningRule:
      "Edge amounts are typed as IEEE-754 double floats in Neo4j and synchronized with NUMERIC(16,8) in PostgreSQL to avoid rounding drift.",
    sourceFile: "backend/scripts/build_graph.py",
  },
  receives: {
    id: "receives",
    name: ":RECEIVES",
    kind: "edge",
    categoryLabel: "OUTPUT DISBURSEMENT FLOW EDGE",
    badgeColor: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    badgeBg: "bg-emerald-50",
    cardinality: "188,342 Edges",
    cardinalitySub: "Transaction → Wallet",
    summary:
      "Directed flow from a :Transaction to a destination :Wallet. Captures change addresses, forward peeling hops, and final beneficiary payouts.",
    properties: [
      {
        name: "amount",
        type: "FLOAT / SATOSHI",
        constraint: "NON-NEGATIVE",
        description: "Output value created by transaction in BTC/satoshis",
        example: "0.04500000",
      },
    ],
    cypherQuery: `// Batch Upsert of RECEIVES Output Edges
UNWIND $batch AS row
MATCH (t:Transaction {txid: row.txid})
MATCH (w:Wallet {address: row.wallet_addr})
MERGE (t)-[r:RECEIVES {amount: row.amount}]->(w);`,
    queryDescription:
      "Enables linear forward hop tracing for peeling-chain and fund-flow tracking.",
    hardeningRule:
      "Used extensively in Phase 6 peeling-chain detection to follow the 1-in-2-out forward hops (≥80% peel, ≤5% change).",
    sourceFile: "backend/scripts/build_graph.py",
  },
  observed: {
    id: "observed",
    name: ":OBSERVED",
    kind: "edge",
    categoryLabel: "BROADCAST TELEMETRY EDGE",
    badgeColor: "text-sky-700",
    badgeBorder: "border-sky-200",
    badgeBg: "bg-sky-50",
    cardinality: "100,000 Edges",
    cardinalitySub: "IP → Transaction Link",
    summary:
      "Directed telemetry observation linking an :IP node to a :Transaction node. Establishes the physical network socket that initially relayed the raw transaction bytes.",
    properties: [
      {
        name: "ts",
        type: "DATETIME / STRING",
        constraint: "ISO 8601",
        description: "Time of packet arrival at the NTRO passive capture tap",
        example: "'2026-09-07T18:21:04Z'",
      },
      {
        name: "dst_port",
        type: "INTEGER",
        constraint: "VALID PORT (0-65535)",
        description: "Destination port on peer node receiving broadcast",
        example: "8333",
      },
    ],
    cypherQuery: `// Batch Upsert of OBSERVED Network Link
UNWIND $batch AS row
MATCH (ip:IP {address: row.ip_addr})
MATCH (t:Transaction {txid: row.txid})
MERGE (ip)-[r:OBSERVED {ts: row.ts, dst_port: row.dst_port}]->(t);

// Network-to-Blockchain Multi-Hop Correlation
MATCH (ip:IP)-[:OBSERVED]->(t:Transaction)<-[:SENDS]-(w:Wallet)
WHERE ip.asn = 208323
RETURN w.cluster_id, count(t) AS tx_volume, collect(DISTINCT ip.country) AS countries;`,
    queryDescription:
      "Correlates raw network traffic metadata (IP address, ASN, destination port) directly with the cryptographic spending entity.",
    hardeningRule:
      "In WORK-2 §4, the router was hardened to query (ip:IP)-[:OBSERVED]-(t:Transaction) with DISTINCT and local set deduplication, eliminating duplicated link rendering in the D3 canvas.",
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
              INTERACTIVE GRAPH TOPOLOGY &amp; SCHEMA INSPECTOR
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Neo4j 5.26 Property Graph &amp; Cypher Blueprint
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click any node label or relationship type to inspect schema constraints, properties, verified cardinalities, and copy production Cypher queries.
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
            Node Labels (3)
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
            Relationships (4)
          </button>
        </div>
      </div>

      {/* Entity Selector Tabs */}
      <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap gap-1.5 sm:gap-2">
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
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              {activeEntity.summary}
            </p>
          </div>

          {/* Property Schema Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Property Definitions &amp; Constraints
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {activeEntity.properties.length} properties defined
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[540px]">
                  <thead className="bg-slate-100/80 text-slate-600 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Property</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Index / Rule</th>
                      <th className="py-2 px-3">Description</th>
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
              Engine Hardening Rule
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
              {activeEntity.hardeningRule}
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Schema Visualizer & Production Cypher (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Visual Topology Mini-Map */}
          <div className="p-4 rounded-lg bg-slate-900 text-white space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-sky-400" />
                Relational Triad Topology
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">GDS 2.13 PROJECTION</span>
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
                  <marker
                    id="arrow-indigo"
                    viewBox="0 0 10 10"
                    refX="7"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 7 5 L 0 9 z" fill="#6366f1" />
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
                    (Input)
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
                    100k
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
                    (Output)
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
                    GeoIP
                  </text>
                </g>
              </svg>
            </div>
            <div className="text-[11px] text-slate-400 text-center font-mono">
              Triad model: Blockchain layer (:Wallet, :Tx) decoupled from Network layer (:IP) via :OBSERVED
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
              <span className="text-emerald-700 font-semibold">GDS 2.13 Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
