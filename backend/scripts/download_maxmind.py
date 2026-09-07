"""Download MaxMind GeoLite2-City and GeoLite2-ASN databases.
Authenticates using MAXMIND_LICENSE_KEY from .env.
Extracts .mmdb files into data/geoip/.
"""

import os
import shutil
import sys
import tarfile
import urllib.request
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory, backend/, or parent
ENV_PATHS = [
    Path("backend/.env"),
    Path(".env"),
    Path("../.env"),
]
loaded = False
for env_path in ENV_PATHS:
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
        loaded = True
        break

LICENSE_KEY = os.getenv("MAXMIND_LICENSE_KEY")
if not LICENSE_KEY:
    print("Error: MAXMIND_LICENSE_KEY is not set in environment or .env file.")
    sys.exit(1)

OUTPUT_DIR = Path("data/geoip")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

DATABASES = ["GeoLite2-City", "GeoLite2-ASN"]


def download_and_extract(edition_id: str) -> Path:
    """Download tar.gz for edition_id and extract the .mmdb file."""
    url = (
        f"https://download.maxmind.com/app/geoip_download?"
        f"edition_id={edition_id}&suffix=tar.gz&license_key={LICENSE_KEY}"
    )
    tar_path = OUTPUT_DIR / f"{edition_id}.tar.gz"
    print(f"Downloading {edition_id} from MaxMind...")

    request = urllib.request.Request(
        url,
        headers={"User-Agent": "SIH26146-MaxMind-Downloader/1.0"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        with open(tar_path, "wb") as f:
            shutil.copyfileobj(response, f)

    file_size_mb = tar_path.stat().st_size / (1024 * 1024)
    print(f"Downloaded {edition_id}.tar.gz ({file_size_mb:.2f} MB). Extracting .mmdb...")

    mmdb_dest = OUTPUT_DIR / f"{edition_id}.mmdb"
    extracted = False

    with tarfile.open(tar_path, "r:gz") as tar:
        for member in tar.getmembers():
            if member.name.endswith(".mmdb"):
                extracted_file = tar.extractfile(member)
                if extracted_file:
                    with open(mmdb_dest, "wb") as out_f:
                        shutil.copyfileobj(extracted_file, out_f)
                    extracted = True
                    print(f"Extracted {member.name} -> {mmdb_dest} ({mmdb_dest.stat().st_size / (1024*1024):.2f} MB)")
                    break

    # Clean up archive
    if tar_path.exists():
        tar_path.unlink()

    if not extracted or not mmdb_dest.exists():
        raise RuntimeError(f"Failed to find and extract .mmdb file from {edition_id}.tar.gz")

    return mmdb_dest


def main():
    print(f"Target directory: {OUTPUT_DIR.resolve()}")
    results = {}
    for db in DATABASES:
        target_mmdb = OUTPUT_DIR / f"{db}.mmdb"
        if target_mmdb.exists() and target_mmdb.stat().st_size > 1000000:
            print(f"{db}.mmdb already exists ({target_mmdb.stat().st_size / (1024*1024):.2f} MB). Skipping download.")
            results[db] = target_mmdb
        else:
            try:
                results[db] = download_and_extract(db)
            except Exception as e:
                print(f"Failed to download {db}: {e}")
                sys.exit(1)

    print("\nAll MaxMind GeoLite2 databases downloaded successfully:")
    for db, path in results.items():
        print(f"  - {db}: {path.resolve()} ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
