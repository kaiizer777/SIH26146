# DATA_SOURCES.md — SIH26146 Data Inventory & Documentation

This document records the four primary datasets utilized by the SIH26146 Bitcoin Transaction Monitoring System, including their provenance, schema, acquisition dates, and verification metrics.

---

## 1. Ransomwhere Seed Dataset

- **Source:** Ransomwhere Open Ransomware Payment Tracker (Crowdsourced initiative)
- **Acquisition Date:** 2026-09-07
- **Acquisition Method:** Live HTTP GET from bulk export API (`https://api.ransomwhe.re/export`) via `backend/scripts/download_ransomwhere.py`
- **Zenodo DOI:** [10.5281/zenodo.6512122](https://doi.org/10.5281/zenodo.6512122)
- **Local Storage:** `data/ransomwhere_seeds.json` (7.77 MB)
- **Live Measured Metrics:**
  - **Total Records:** 11,186
  - **Unique Bitcoin Addresses:** 11,186
  - **Ransomware Families Tracked:** 136 (e.g. Netwalker, Conti, LockBit, REvil, DarkSide)
  - **Total Tracked Satoshis:** 11,511,691,028,795 sats (~115,116.91 BTC)
  - **Total Tracked Value (USD):** $1,018,573,922.46
- **Schema Fields:**
  - `address`: Bitcoin address associated with ransomware payment demands.
  - `family`: Associated ransomware family or threat actor group.
  - `balance`: Cumulative satoshis received.
  - `balanceUSD`: Estimated USD equivalent value at transaction time.
  - `blockchain`: Network name (`bitcoin`).
  - `transactions`: Array of historical transactions with transaction hashes, timestamps, and amounts.

---

## 2. MaxMind GeoLite2-City

- **Source:** MaxMind GeoLite2 (City database)
- **Acquisition Date:** 2026-09-07
- **Acquisition Method:** Authenticated HTTPS download using MaxMind account ID & license key via `backend/scripts/download_maxmind.py`
- **License:** Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
- **Local Storage:** `data/geoip/GeoLite2-City.mmdb`
- **Format:** MaxMind DB binary format (`.mmdb`)
- **Lookup Fields:**
  - Country ISO Code (2-character, e.g. `US`, `DE`, `RU`)
  - City name
  - Geographic coordinates (latitude, longitude)
  - Postal code & subdivisions

---

## 3. MaxMind GeoLite2-ASN

- **Source:** MaxMind GeoLite2 (Autonomous System Numbers database)
- **Acquisition Date:** 2026-09-07
- **Acquisition Method:** Authenticated HTTPS download using MaxMind account ID & license key via `backend/scripts/download_maxmind.py`
- **License:** CC BY-SA 4.0
- **Local Storage:** `data/geoip/GeoLite2-ASN.mmdb`
- **Format:** MaxMind DB binary format (`.mmdb`)
- **Lookup Fields:**
  - `autonomous_system_number`: Integer Autonomous System Number (e.g., `15169`, `13335`)
  - `autonomous_system_organization`: Registered organization name (e.g., `Google LLC`, `Cloudflare, Inc.`)

---

## 4. Synthetic Bitcoin Transaction Dataset

- **Source:** Internally generated via `backend/scripts/generate_synthetic_data.py`
- **Generation Date:** 2026-09-07
- **Transaction Count:** ~100,000 transactions
- **Formats Exported:**
  - CSV: `data/synthetic_transactions.csv`
  - JSON: `data/synthetic_transactions.json`
  - XML: `data/synthetic_transactions.xml`
- **Engine Realism Constraints Implemented:**
  1. **Power-Law Wallet Degree Distribution:** Implemented via Pareto sampling ($\alpha=2.2$), ensuring heavy-tailed wallet reuse characteristic of Bitcoin transaction networks.
  2. **Illicit Transaction Injection:** 2.0% – 5.0% of transactions injected with known ransomware seed addresses from `data/ransomwhere_seeds.json`.
  3. **Peeling Chains Embedder:** Sequential 1-input $\to$ 2-output laundering chains (5–40 hops) where peeled change is $\le 5\%$ and forward peel is $\ge 80\%$.
  4. **CoinJoin Mixer Embedder:** Multi-party mixes with $\ge 3$ inputs, $\ge 3$ outputs, equal denomination output amounts, and $\ge 0.05$ BTC minimum input.
  5. **Fee-Rate Sampler:** Log-normal sat/vbyte distribution reflecting real Bitcoin mempool fee dynamics.
  6. **Script-Type Mix Sampler:** Realistic proportions across SegWit/Taproot/Legacy (`P2WPKH` ~45%, `P2TR` ~20%, `P2SH` ~20%, `P2PKH` ~15%).
  7. **Diurnal Timezone Timestamps:** Sinusoidal diurnal activity modeling real-world global financial market volumes.
  8. **Correlated Network-Layer Events:** Source IPs correlated with realistic ASNs and ISO 2-letter country codes; destination port standard P2P port `8333`.
