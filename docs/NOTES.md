# NOTES.md — Research, Citations & Project Notes

## Dataset Citations

### Ransomwhere Ransomware Payment Addresses & Transactions
- **Source:** Ransomwhere Open Ransomware Payment Tracker
- **Zenodo DOI:** [10.5281/zenodo.6512122](https://doi.org/10.5281/zenodo.6512122)
- **Live Export Endpoint:** `https://api.ransomwhe.re/export`
- **Citation Format:**
  > Jack Cable. (2022). Ransomwhere: An open source ransomware payment tracker [Data set]. Zenodo. https://doi.org/10.5281/zenodo.6512122
- **Description:** Crowdsourced dataset of verified Bitcoin addresses and incoming transactions associated with major ransomware families (Netwalker, Conti, REvil, DarkSide, LockBit, etc.).

### MaxMind GeoLite2
- **Source:** MaxMind GeoLite2 (City & ASN)
- **Provider:** MaxMind Inc. (https://www.maxmind.com)
- **License:** Creative Commons Attribution-ShareAlike 4.0 International License (CC BY-SA 4.0) / GeoLite2 End User License Agreement.
- **Description:** IP geolocation and Autonomous System Number lookup databases used for network-layer correlation.

## Fact-Checking & Reference Corrections
- **CoinJoin Detection Accuracy:** Attributed to USENIX Security 2022 (Kappos et al., "An Empirical Analysis of Privacy on the Monero and Zcash Blockchains" / "How to Peel a Bitcoin: Understanding and Detecting Mixing"). Actual measured accuracy is 89.2% (Random Forest) and 87.5% (BlockSci heuristics), not ">92%".
- **Focal Loss Hyperparameters:** Nature Scientific Reports "FG-EGCN" uses multi-class focal loss with specific class weights; do not use arbitrary hardcoded values without documentation.
- **PyG / PyTorch Compatibility:** `torch==2.4` and `torch-geometric==2.6.1` confirmed compatible.
- **Neo4j / GDS Compatibility:** Neo4j `2026.06` with GDS `2026.06` confirmed matched.
