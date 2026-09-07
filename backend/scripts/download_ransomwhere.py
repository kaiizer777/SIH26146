"""Download and verify Ransomwhere ransomware seed dataset.
Fetches bulk export from https://api.ransomwhe.re/export.
Saves raw response to data/ransomwhere_seeds.json.
Validates fields (address, family, transactions/amount/balance) and logs total metrics.
"""

import json
import sys
import urllib.request
from pathlib import Path

DATA_DIR = Path("data")
DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = DATA_DIR / "ransomwhere_seeds.json"
EXPORT_URL = "https://api.ransomwhe.re/export"


def fetch_ransomwhere_data() -> dict:
    """Fetch export data from Ransomwhere API."""
    print(f"Fetching Ransomwhere dataset from {EXPORT_URL}...")
    req = urllib.request.Request(
        EXPORT_URL,
        headers={"User-Agent": "SIH26146-Ransomwhere-Fetcher/1.0"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read().decode("utf-8")
        return json.loads(content)


def verify_and_save(data: dict):
    """Verify records schema and save to output file."""
    records = data.get("result", [])
    if not records and isinstance(data, list):
        records = data

    print(f"Total raw records received: {len(records)}")
    if not records:
        raise ValueError("Received empty dataset from Ransomwhere API.")

    valid_records = 0
    unique_addresses = set()
    total_balance_sats = 0
    total_balance_usd = 0.0
    families = set()

    for idx, r in enumerate(records):
        address = r.get("address")
        family = r.get("family")
        balance = r.get("balance", 0)
        balance_usd = r.get("balanceUSD", 0.0)

        if not address or not family:
            continue

        valid_records += 1
        unique_addresses.add(address)
        families.add(family)
        if isinstance(balance, (int, float)):
            total_balance_sats += balance
        if isinstance(balance_usd, (int, float)):
            total_balance_usd += balance_usd

    total_btc = total_balance_sats / 1e8

    print("\n" + "=" * 60)
    print("RANSOMWHERE DATASET VERIFICATION REPORT")
    print("=" * 60)
    print(f"Total Records:           {len(records):,}")
    print(f"Valid Records:           {valid_records:,}")
    print(f"Unique Bitcoin Addresses:{len(unique_addresses):,}")
    print(f"Ransomware Families:     {len(families):,}")
    print(f"Total Tracked Sats:      {total_balance_sats:,}")
    print(f"Total Tracked BTC:       {total_btc:,.4f} BTC")
    print(f"Total Tracked USD:       ${total_balance_usd:,.2f}")
    print("=" * 60)

    # Save to disk
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    file_size_mb = OUTPUT_FILE.stat().st_size / (1024 * 1024)
    print(f"Saved dataset to {OUTPUT_FILE.resolve()} ({file_size_mb:.2f} MB)")
    return {
        "total_records": len(records),
        "unique_addresses": len(unique_addresses),
        "families_count": len(families),
        "total_btc": total_btc,
        "total_usd": total_balance_usd,
        "file_path": str(OUTPUT_FILE),
    }


def main():
    if "--verify-only" in sys.argv and OUTPUT_FILE.exists():
        print(f"Verifying existing file at {OUTPUT_FILE.resolve()}...")
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        verify_and_save(data)
    else:
        try:
            data = fetch_ransomwhere_data()
            verify_and_save(data)
        except Exception as e:
            print(f"Error fetching Ransomwhere dataset: {e}")
            if OUTPUT_FILE.exists():
                print(f"Falling back to existing local file: {OUTPUT_FILE}")
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                verify_and_save(data)
            else:
                sys.exit(1)


if __name__ == "__main__":
    main()
