"""Application configuration via pydantic-settings.

All settings are read from environment variables (or .env file).
No secrets are hardcoded here.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve project root so path defaults work regardless of CWD.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]  # backend/app/config.py → backend/
_DATA_ROOT = _PROJECT_ROOT.parent / "data"  # SIH26146/data/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- PostgreSQL ---
    database_url: str = (
        "postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin"
    )

    # --- Celery / Redis ---
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # --- GeoIP databases ---
    geoip_city_path: str = str(_DATA_ROOT / "geoip" / "GeoLite2-City.mmdb")
    geoip_asn_path: str = str(_DATA_ROOT / "geoip" / "GeoLite2-ASN.mmdb")

    # --- Upload landing zone ---
    upload_dir: str = str(_DATA_ROOT / "uploads")

    # --- Ingest tuning ---
    ingest_batch_size: int = 5_000


settings = Settings()
