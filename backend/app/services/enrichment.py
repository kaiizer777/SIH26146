"""GeoIP enrichment service using MaxMind GeoLite2 databases.

Opens both .mmdb files once per process (singleton pattern) and exposes
a single enrich() call. Lookup strategy:
  1. Try src_ip in GeoLite2-City → geo_country.
  2. Try src_ip in GeoLite2-ASN  → asn.
  3. If src_ip not found, fall back to dst_ip for each database.
  4. Return (None, None) if neither IP resolves — never raises.

This result is then merged with any values already present in the row:
GeoIP lookup wins over CSV-supplied values when it returns a non-None result.
"""

import logging
from typing import Optional

import maxminddb

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton enricher
# ---------------------------------------------------------------------------


class GeoIPEnricher:
    """Thread-safe (read-only) GeoIP lookup wrapper.

    maxminddb.Reader is documented as thread-safe for reads.
    """

    def __init__(
        self,
        city_path: str = settings.geoip_city_path,
        asn_path: str = settings.geoip_asn_path,
    ) -> None:
        try:
            self._city_db = maxminddb.open_database(city_path)
            logger.info("Opened GeoLite2-City database: %s", city_path)
        except Exception as exc:
            logger.error("Failed to open GeoLite2-City database: %s", exc)
            self._city_db = None

        try:
            self._asn_db = maxminddb.open_database(asn_path)
            logger.info("Opened GeoLite2-ASN database: %s", asn_path)
        except Exception as exc:
            logger.error("Failed to open GeoLite2-ASN database: %s", exc)
            self._asn_db = None

    def enrich(
        self,
        src_ip: str,
        dst_ip: str,
    ) -> tuple[Optional[str], Optional[int]]:
        """Look up geo_country (ISO-2) and asn (integer) for the given IPs.

        Returns (geo_country, asn). Either value may be None if the IP is
        not in the database. Never raises.
        """
        geo_country = self._lookup_country(src_ip) or self._lookup_country(dst_ip)
        asn = self._lookup_asn(src_ip) or self._lookup_asn(dst_ip)
        return geo_country, asn

    def _lookup_country(self, ip: str) -> Optional[str]:
        if self._city_db is None:
            return None
        try:
            record = self._city_db.get(ip)
            if record is None:
                return None
            country = record.get("country") or record.get("registered_country")
            if country is None:
                return None
            iso_code = country.get("iso_code")
            return iso_code if isinstance(iso_code, str) and len(iso_code) == 2 else None
        except Exception:
            # AddressNotFoundError or any other maxminddb error — not a hard failure.
            return None

    def _lookup_asn(self, ip: str) -> Optional[int]:
        if self._asn_db is None:
            return None
        try:
            record = self._asn_db.get(ip)
            if record is None:
                return None
            asn_num = record.get("autonomous_system_number")
            return int(asn_num) if asn_num is not None else None
        except Exception:
            return None

    def close(self) -> None:
        """Release database file handles."""
        if self._city_db is not None:
            self._city_db.close()
        if self._asn_db is not None:
            self._asn_db.close()


# ---------------------------------------------------------------------------
# Module-level singleton (lazy-initialised per worker process)
# ---------------------------------------------------------------------------

_enricher: Optional[GeoIPEnricher] = None


def get_enricher() -> GeoIPEnricher:
    """Return the process-level GeoIPEnricher singleton.

    Lazy-initialised on first call. Safe in a Celery worker context because
    each worker is a single process.
    """
    global _enricher
    if _enricher is None:
        _enricher = GeoIPEnricher()
    return _enricher
