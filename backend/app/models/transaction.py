"""SQLAlchemy models for PostgreSQL transactions schema.
Matching SIH26146 Master Reference Document and Phase 1 specifications.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, INET, JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Transaction(Base):
    """PostgreSQL transactions table model."""

    __tablename__ = "transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    ingested_at = Column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    ts = Column(DateTime(timezone=True), nullable=False)
    src_ip = Column(INET, nullable=True)
    dst_ip = Column(INET, nullable=True)
    src_port = Column(Integer, nullable=True)
    dst_port = Column(Integer, nullable=True)
    txid = Column(String(64), unique=True, nullable=False)
    input_addresses = Column(ARRAY(String), nullable=True)
    output_addresses = Column(ARRAY(String), nullable=True)
    input_amounts = Column(ARRAY(Numeric(20, 8)), nullable=True)
    output_amounts = Column(ARRAY(Numeric(20, 8)), nullable=True)
    fee = Column(Numeric(20, 8), nullable=True)
    script_type = Column(String(10), nullable=True)
    geo_country = Column(String(2), nullable=True)
    asn = Column(Integer, nullable=True)
    cluster_id = Column(Integer, nullable=True)
    anomaly_score = Column(Numeric(6, 4), nullable=True)
    risk_score = Column(Numeric(6, 4), nullable=True)
    is_flagged = Column(Boolean, default=False, nullable=False)
    raw_json = Column(JSONB, nullable=True)

    __table_args__ = (
        Index("idx_transactions_src_ip", "src_ip"),
        Index("idx_transactions_dst_ip", "dst_ip"),
        Index("idx_transactions_cluster_id", "cluster_id"),
        Index("idx_transactions_risk_score", "risk_score"),
        CheckConstraint(
            "script_type IS NULL OR script_type IN ('P2PK', 'P2PKH', 'P2SH', 'P2WPKH', 'P2TR')",
            name="check_script_type",
        ),
        CheckConstraint(
            "geo_country IS NULL OR geo_country ~ '^[A-Z]{2}$'",
            name="check_geo_country_format",
        ),
        CheckConstraint(
            "fee IS NULL OR fee >= 0",
            name="check_fee_non_negative",
        ),
    )

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, txid='{self.txid}', ts={self.ts})>"
