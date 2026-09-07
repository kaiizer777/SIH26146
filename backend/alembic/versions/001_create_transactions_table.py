"""create transactions table

Revision ID: 001_create_transactions
Revises: 
Create Date: 2026-09-07 22:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_create_transactions"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "transactions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column(
            "ingested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("src_ip", postgresql.INET(), nullable=True),
        sa.Column("dst_ip", postgresql.INET(), nullable=True),
        sa.Column("src_port", sa.Integer(), nullable=True),
        sa.Column("dst_port", sa.Integer(), nullable=True),
        sa.Column("txid", sa.String(length=64), nullable=False),
        sa.Column("input_addresses", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("output_addresses", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("input_amounts", postgresql.ARRAY(sa.Numeric(precision=20, scale=8)), nullable=True),
        sa.Column("output_amounts", postgresql.ARRAY(sa.Numeric(precision=20, scale=8)), nullable=True),
        sa.Column("fee", sa.Numeric(precision=20, scale=8), nullable=True),
        sa.Column("script_type", sa.Text(), nullable=True),
        sa.Column("geo_country", sa.CHAR(length=2), nullable=True),
        sa.Column("asn", sa.Integer(), nullable=True),
        sa.Column("cluster_id", sa.Integer(), nullable=True),
        sa.Column("anomaly_score", sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column("risk_score", sa.Numeric(precision=6, scale=4), nullable=True),
        sa.Column("is_flagged", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("raw_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint("id", name="pk_transactions"),
        sa.UniqueConstraint("txid", name="uq_transactions_txid"),
        sa.CheckConstraint(
            "script_type IS NULL OR script_type IN ('P2PK', 'P2PKH', 'P2SH', 'P2WPKH', 'P2TR')",
            name="check_script_type",
        ),
        sa.CheckConstraint(
            "geo_country IS NULL OR geo_country ~ '^[A-Z]{2}$'",
            name="check_geo_country_format",
        ),
        sa.CheckConstraint(
            "fee IS NULL OR fee >= 0",
            name="check_fee_non_negative",
        ),
    )

    # Indexes
    op.create_index("idx_transactions_src_ip", "transactions", ["src_ip"], unique=False)
    op.create_index("idx_transactions_dst_ip", "transactions", ["dst_ip"], unique=False)
    op.create_index("idx_transactions_cluster_id", "transactions", ["cluster_id"], unique=False)
    op.create_index("idx_transactions_risk_score", "transactions", ["risk_score"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_transactions_risk_score", table_name="transactions")
    op.drop_index("idx_transactions_cluster_id", table_name="transactions")
    op.drop_index("idx_transactions_dst_ip", table_name="transactions")
    op.drop_index("idx_transactions_src_ip", table_name="transactions")
    op.drop_table("transactions")
