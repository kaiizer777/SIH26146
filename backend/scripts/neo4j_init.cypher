// ==============================================================================
// SIH26146 — Neo4j Graph Schema Initialization Script
// AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic
// ==============================================================================

// ------------------------------------------------------------------------------
// 1. Schema Constraints
// ------------------------------------------------------------------------------

// Uniqueness constraint on Wallet(address)
CREATE CONSTRAINT wallet_address_unique IF NOT EXISTS
FOR (w:Wallet)
REQUIRE w.address IS UNIQUE;

// Uniqueness constraint on Transaction(txid)
CREATE CONSTRAINT transaction_txid_unique IF NOT EXISTS
FOR (t:Transaction)
REQUIRE t.txid IS UNIQUE;

// Uniqueness constraint on IP(address)
CREATE CONSTRAINT ip_address_unique IF NOT EXISTS
FOR (i:IP)
REQUIRE i.address IS UNIQUE;

// ------------------------------------------------------------------------------
// 2. Indexes for Fast Traversal & Filtering
// ------------------------------------------------------------------------------

// Index on Wallet(cluster_id) for Louvain clustering queries & visualizer
CREATE INDEX wallet_cluster_id_idx IF NOT EXISTS
FOR (w:Wallet)
ON (w.cluster_id);

// Index on Wallet(risk_score) for risk ranking
CREATE INDEX wallet_risk_score_idx IF NOT EXISTS
FOR (w:Wallet)
ON (w.risk_score);

// Index on Transaction(ts) for temporal queries
CREATE INDEX transaction_ts_idx IF NOT EXISTS
FOR (t:Transaction)
ON (t.ts);

// Index on Transaction(anomaly_score) for alert filtering
CREATE INDEX transaction_anomaly_score_idx IF NOT EXISTS
FOR (t:Transaction)
ON (t.anomaly_score);

// Index on IP(country) & IP(asn) for geo/network filtering
CREATE INDEX ip_country_idx IF NOT EXISTS
FOR (i:IP)
ON (i.country);

CREATE INDEX ip_asn_idx IF NOT EXISTS
FOR (i:IP)
ON (i.asn);

// ------------------------------------------------------------------------------
// 3. Schema Documentation & Node / Edge Property Specification
// ------------------------------------------------------------------------------
// Node Labels and Properties:
//   (:Wallet {
//       address: STRING (Unique PK),
//       cluster_id: INTEGER (F1 Louvain cluster ID),
//       risk_score: FLOAT (F4 GraphSAGE risk score [0.0 - 1.0]),
//       is_seed_illicit: BOOLEAN (True if matched with Ransomwhere seed),
//       label: STRING (Threat label, e.g. 'Ransomware', 'Netwalker', or 'Normal')
//   })
//
//   (:Transaction {
//       txid: STRING (Unique PK, 64-char hex),
//       ts: DATETIME / STRING (Transaction timestamp),
//       total_in: FLOAT (Total input amount in BTC),
//       total_out: FLOAT (Total output amount in BTC),
//       fee: FLOAT (Transaction fee in BTC),
//       anomaly_score: FLOAT (F2 Autoencoder reconstruction MSE),
//       is_mixing: BOOLEAN (F3 Peeling chain / CoinJoin flag)
//   })
//
//   (:IP {
//       address: STRING (Unique PK, IPv4/IPv6 address),
//       country: STRING (2-letter ISO country code),
//       asn: INTEGER (Autonomous System Number),
//       src_port: INTEGER (Observed source port)
//   })
//
// Relationships:
//   (:Wallet)-[:SENDS {amount: FLOAT, script_type: STRING}]->(:Transaction)
//   (:Transaction)-[:RECEIVES {amount: FLOAT}]->(:Wallet)
//   (:IP)-[:OBSERVED {ts: DATETIME / STRING, dst_port: INTEGER}]->(:Transaction)
//   (:Wallet)-[:CO_SPEND]->(:Wallet)
// ==============================================================================
