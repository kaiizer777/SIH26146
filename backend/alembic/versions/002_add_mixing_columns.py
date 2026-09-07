"""add is_mixing and chain_hops to transactions

Revision ID: 002_add_mixing_columns
Revises: 001_create_transactions
Create Date: 2026-09-08

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_add_mixing_columns"
down_revision: Union[str, None] = "001_create_transactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # is_mixing: written by Phase 6 peeling-chain + CoinJoin detectors.
    # chain_hops: integer depth of detected peeling chain; NULL for non-peeling.
    op.add_column(
        "transactions",
        sa.Column(
            "is_mixing",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "transactions",
        sa.Column("chain_hops", sa.Integer(), nullable=True),
    )
    # Partial index: only index mixing transactions so Phase 7/8/9 lookups are fast.
    op.create_index(
        "idx_transactions_is_mixing",
        "transactions",
        ["is_mixing"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_transactions_is_mixing", table_name="transactions")
    op.drop_column("transactions", "chain_hops")
    op.drop_column("transactions", "is_mixing")
