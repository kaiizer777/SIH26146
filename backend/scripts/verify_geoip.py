"""Verify GeoLite2-City and GeoLite2-ASN reader functionality.
Looks up known public IP addresses and asserts country and ASN resolution.
"""

import sys
from pathlib import Path

try:
    import maxminddb
except ImportError:
    print("Error: maxminddb package is not installed.")
    sys.exit(1)

GEOIP_DIR = Path("data/geoip")
CITY_DB_PATH = GEOIP_DIR / "GeoLite2-City.mmdb"
ASN_DB_PATH = GEOIP_DIR / "GeoLite2-ASN.mmdb"

KNOWN_IPS = [
    {"ip": "8.8.8.8", "expected_asn": 15169, "expected_country": "US", "org": "Google DNS"},
    {"ip": "1.1.1.1", "expected_asn": 13335, "org": "Cloudflare DNS"},
    {"ip": "140.82.112.4", "expected_asn": 36459, "expected_country": "US", "org": "GitHub"},
    {"ip": "9.9.9.9", "expected_asn": 19281, "org": "Quad9 DNS"},
    {"ip": "77.88.8.8", "expected_country": "RU", "org": "Yandex DNS"},
]


def verify_lookups():
    if not CITY_DB_PATH.exists():
        print(f"Error: City database not found at {CITY_DB_PATH.resolve()}")
        sys.exit(1)
    if not ASN_DB_PATH.exists():
        print(f"Error: ASN database not found at {ASN_DB_PATH.resolve()}")
        sys.exit(1)

    print(f"Loading City DB: {CITY_DB_PATH.resolve()}")
    city_reader = maxminddb.open_database(str(CITY_DB_PATH))
    print(f"Loading ASN DB: {ASN_DB_PATH.resolve()}\n")
    asn_reader = maxminddb.open_database(str(ASN_DB_PATH))

    passed_count = 0
    print(f"{'IP':<16} | {'Country':<8} | {'ASN':<8} | {'Org/AS Name':<30} | {'Status'}")
    print("-" * 75)

    for entry in KNOWN_IPS:
        ip = entry["ip"]
        city_record = city_reader.get(ip)
        asn_record = asn_reader.get(ip)

        country_code = None
        if city_record and "country" in city_record:
            country_code = city_record["country"].get("iso_code")

        asn_num = None
        asn_org = None
        if asn_record:
            asn_num = asn_record.get("autonomous_system_number")
            asn_org = asn_record.get("autonomous_system_organization", "")

        # Verify
        is_ok = True
        if "expected_country" in entry and country_code != entry["expected_country"]:
            is_ok = False
        if "expected_asn" in entry and asn_num != entry["expected_asn"]:
            is_ok = False

        status = "PASSED" if is_ok else "MISMATCH"
        if is_ok:
            passed_count += 1

        org_display = (asn_org[:28] + "..") if asn_org and len(asn_org) > 28 else (asn_org or "N/A")
        print(f"{ip:<16} | {str(country_code):<8} | {str(asn_num):<8} | {org_display:<30} | {status}")

    city_reader.close()
    asn_reader.close()

    print("-" * 75)
    print(f"Verification Summary: {passed_count}/{len(KNOWN_IPS)} IP lookups verified successfully.")
    if passed_count < len(KNOWN_IPS):
        print("Warning: Some lookups did not match expected values.")
        sys.exit(1)
    return True


if __name__ == "__main__":
    verify_lookups()
