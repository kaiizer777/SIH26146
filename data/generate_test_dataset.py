import csv
import hashlib
import random
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Add backend to path so we can validate directly with TransactionRecord
sys.path.insert(0, r"c:\Users\bari2\Desktop\SIH26146\backend")
from app.schemas.ingest import TransactionRecord
from app.services.parser import _normalise_csv_row

OUTPUT_PATH = Path(r"C:\Users\bari2\Desktop\test_dataset_400.csv")

# Seeds from Ransomwhere
KNOWN_SEEDS = [
    "17TMc2UkVRSga2yYvuxSD9Q1XyB2EPRjTF",
    "1DTE5x3Rjn2q75HjX6hiu8CQwEGqe6wQ4s",
    "1AEoiAcsm8z4r5eGfVb27ap4TL4w3mW5zL",
    "3Kzh9qAqVWydyCG8dD2qN17x84g94fHZuM",
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
]

SCRIPT_TYPES = ["P2WPKH", "P2TR", "P2PKH", "P2SH"]
COUNTRIES_ASNS = [
    ("US", 15169),
    ("DE", 24940),
    ("SG", 4657),
    ("JP", 2516),
    ("CH", 3303),
    ("GB", 2856),
    ("NL", 1103),
    ("FR", 16276),
    ("CA", 8075),
    ("AU", 1221),
]

IPS = [
    "8.8.8.",
    "1.1.1.",
    "88.198.45.",
    "203.116.1.",
    "210.140.10.",
    "194.230.79.",
    "54.240.196.",
    "185.107.56.",
]

def make_addr(prefix="bc1q"):
    h = hashlib.sha256(random.randbytes(16)).hexdigest()
    if prefix == "bc1q":
        return f"bc1q{h[:38]}"
    elif prefix == "bc1p":
        return f"bc1p{h[:38]}"
    elif prefix == "1":
        return f"1{h[:33]}"
    elif prefix == "3":
        return f"3{h[:33]}"
    return f"bc1q{h[:38]}"

base_time = datetime(2026, 3, 18, 12, 0, 0, tzinfo=timezone.utc)
rows = []

for i in range(400):
    txid = hashlib.sha256(f"test_batch_2026_salt_{i}_{random.random()}".encode()).hexdigest()
    tx_time = base_time + timedelta(seconds=i * 27 + random.randint(1, 15))
    ts = tx_time.strftime("%Y-%m-%dT%H:%M:%SZ")

    geo_country, asn = random.choice(COUNTRIES_ASNS)
    src_ip = f"{random.choice(IPS)}{random.randint(1, 254)}"
    dst_ip = f"{random.choice(IPS)}{random.randint(1, 254)}"
    src_port = random.randint(1024, 65534)
    dst_port = 8333

    # Categorize into behavior clusters:
    # 0..30: CRITICAL candidates (Ransomware seed inputs/recipients + peeling chains)
    # 31..100: HIGH candidates (Peeling chain candidates with high asymmetry or seed outputs)
    # 101..230: MEDIUM candidates (Standard 2-output or 3-input mixing/coinjoin variations)
    # 231..400: LOW candidates (Clean, normal transfers, 1-in-1-out or 2-in-2-out)

    if i < 30:
        # Critical tier
        seed = random.choice(KNOWN_SEEDS)
        script = "P2WPKH"
        if i % 2 == 0:
            # Seed input + 2 outputs (peeling chain)
            in_addrs = [seed]
            out_addrs = [make_addr("bc1q"), make_addr("bc1p")]
            total_in = round(random.uniform(5.5, 35.0), 8)
            fee = round(random.uniform(0.0001, 0.0008), 8)
            peel_amt = round(random.uniform(0.1, 0.8), 8)
            change_amt = round(total_in - peel_amt - fee, 8)
            in_amts = [total_in]
            out_amts = [peel_amt, change_amt]
        else:
            # High-value peeling chain candidate with massive anomaly
            in_addrs = [make_addr("bc1q")]
            out_addrs = [seed, make_addr("bc1q")]
            total_in = round(random.uniform(12.0, 50.0), 8)
            fee = round(random.uniform(0.0002, 0.001), 8)
            seed_amt = round(random.uniform(2.0, 10.0), 8)
            rem_amt = round(total_in - seed_amt - fee, 8)
            in_amts = [total_in]
            out_amts = [seed_amt, rem_amt]

    elif i < 100:
        # High tier: Peeling chains (1 in, 2 out) with asymmetrical split
        script = random.choice(["P2WPKH", "P2TR"])
        in_addrs = [make_addr("bc1q")]
        out_addrs = [make_addr("bc1q"), make_addr("bc1p")]
        total_in = round(random.uniform(1.5, 10.0), 8)
        fee = round(random.uniform(0.00003, 0.0002), 8)
        peel_amt = round(random.uniform(0.05, 0.3), 8)
        change_amt = round(total_in - peel_amt - fee, 8)
        in_amts = [total_in]
        out_amts = [peel_amt, change_amt]

    elif i < 230:
        # Medium tier: standard 2-in-2-out or 1-in-2-out balanced
        script = random.choice(SCRIPT_TYPES)
        if random.random() < 0.5:
            in_addrs = [make_addr("bc1q"), make_addr("3")]
            out_addrs = [make_addr("bc1q"), make_addr("1")]
            amt1 = round(random.uniform(0.2, 1.5), 8)
            amt2 = round(random.uniform(0.2, 1.5), 8)
            total_in = amt1 + amt2
            fee = round(random.uniform(0.000015, 0.00005), 8)
            out1 = round((total_in - fee) * 0.45, 8)
            out2 = round(total_in - fee - out1, 8)
            in_amts = [amt1, amt2]
            out_amts = [out1, out2]
        else:
            in_addrs = [make_addr("bc1q")]
            out_addrs = [make_addr("bc1q"), make_addr("bc1q")]
            total_in = round(random.uniform(0.3, 1.2), 8)
            fee = round(random.uniform(0.00001, 0.00003), 8)
            out1 = round((total_in - fee) * 0.5, 8)
            out2 = round(total_in - fee - out1, 8)
            in_amts = [total_in]
            out_amts = [out1, out2]

    else:
        # Low tier: Normal standard 1-in-1-out or 2-in-1-out payments
        script = random.choice(SCRIPT_TYPES)
        in_addrs = [make_addr("bc1q")]
        out_addrs = [make_addr("bc1q")]
        total_in = round(random.uniform(0.005, 0.25), 8)
        fee = round(random.uniform(0.000008, 0.000025), 8)
        out_amt = round(total_in - fee, 8)
        in_amts = [total_in]
        out_amts = [out_amt]

    # Format postgres arrays
    in_addrs_str = "{" + ",".join(in_addrs) + "}"
    out_addrs_str = "{" + ",".join(out_addrs) + "}"
    in_amts_str = "{" + ",".join(str(a) for a in in_amts) + "}"
    out_amts_str = "{" + ",".join(str(a) for a in out_amts) + "}"

    row = {
        "txid": txid,
        "ts": ts,
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": src_port,
        "dst_port": dst_port,
        "input_addresses": in_addrs_str,
        "output_addresses": out_addrs_str,
        "input_amounts": in_amts_str,
        "output_amounts": out_amts_str,
        "fee": fee,
        "script_type": script,
        "geo_country": geo_country,
        "asn": asn,
    }

    # Verify each row passes TransactionRecord model validation exactly as ingest will do!
    norm = _normalise_csv_row(row)
    TransactionRecord.model_validate(norm)

    rows.append(row)

fieldnames = [
    "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
    "input_addresses", "output_addresses", "input_amounts", "output_amounts",
    "fee", "script_type", "geo_country", "asn"
]

with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"SUCCESS: Generated {len(rows)} verified records at {OUTPUT_PATH}")
