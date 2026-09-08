"""Application configuration via pydantic-settings.

All settings are read from environment variables (or .env file).
No secrets are hardcoded here.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


# Resolve project root so path defaults work regardless of CWD.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]  # backend/app/config.py -> SIH26146/
_DATA_ROOT = _PROJECT_ROOT / "data"  # SIH26146/data/


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

    # --- Neo4j ---
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password123"

    # --- Ingest tuning ---
    ingest_batch_size: int = 5_000

    # --- Graph build tuning ---
    graph_pg_chunk_size: int = 5_000   # rows fetched from PostgreSQL per keyset page
    graph_neo4j_batch_size: int = 1_000  # items per Cypher UNWIND transaction

    # --- Phase 5: Anomaly Detection ---
    models_dir: str = str(_DATA_ROOT / "models")
    anomaly_threshold_percentile: float = 95.0  # 95th-pct of non-illicit held-out MSE

    # --- Phase 7: GraphSAGE Risk Scoring ---
    # Architecture dims — 3-layer SAGEConv: in → 64 → 32 → 16 → scalar
    graphsage_hidden_dim_1: int = 64
    graphsage_hidden_dim_2: int = 32
    graphsage_embedding_dim: int = 16
    graphsage_dropout: float = 0.2
    # Focal loss: γ from Lin et al. ICCV 2017; α = neg/pos ratio clamped to this ceiling
    graphsage_focal_gamma: float = 2.0
    graphsage_focal_alpha_max: float = 20.0  # prevents gradient explosion on extreme imbalance
    # Inference: wallet flagged if risk_score >= this threshold
    risk_score_flag_threshold: float = 0.5
    # Output artifact paths for Phase 8 XAI consumption
    wallet_index_map_path: str = str(_DATA_ROOT / "wallet_index_map.json")
    wallet_risk_scores_path: str = str(_DATA_ROOT / "wallet_risk_scores.json")

    # --- Phase 8: Explainability Layer ---
    xai_dir: str = str(_DATA_ROOT / "xai")
    shap_attributions_path: str = str(_DATA_ROOT / "xai" / "shap_attributions.json")
    gnn_subgraphs_path: str = str(_DATA_ROOT / "xai" / "gnn_subgraphs.json")
    evidence_trails_path: str = str(_DATA_ROOT / "xai" / "evidence_trails.json")
    composite_risk_scores_path: str = str(_DATA_ROOT / "xai" / "composite_risk_scores.json")
    # Top-K wallets to run GNNExplainer on
    gnn_explainer_top_k: int = 500

    # --- Phase 9: API Security ---
    # Static bearer token for dev/offline-demo use. Set via .env for production.
    api_dev_token: str = "dev-token-ntro-2026"

    # --- Neo4j database name ---
    neo4j_database: str = "neo4j"


settings = Settings()
