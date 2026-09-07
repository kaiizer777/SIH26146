"""Neo4j connection manager and graph service.

Thread-safe driver lifecycle with context-manager support.
All write operations use `session.execute_write()` for explicit transaction control.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from neo4j import GraphDatabase, Driver, ManagedTransaction

from app.config import settings

logger = logging.getLogger(__name__)


class GraphService:
    """Manages the Neo4j driver lifecycle.

    Usage:
        with GraphService() as svc:
            svc.run_schema_init(Path("backend/scripts/neo4j_init.cypher"))
    """

    def __init__(
        self,
        uri: str | None = None,
        user: str | None = None,
        password: str | None = None,
    ) -> None:
        self._uri = uri or settings.neo4j_uri
        self._user = user or settings.neo4j_user
        self._password = password or settings.neo4j_password
        self._driver: Driver | None = None

    # ------------------------------------------------------------------
    # Context manager
    # ------------------------------------------------------------------

    def __enter__(self) -> "GraphService":
        self.connect()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Driver lifecycle
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """Open the Neo4j driver (idempotent)."""
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password),
                max_connection_pool_size=10,
            )
            self._driver.verify_connectivity()
            logger.info("Neo4j driver connected to %s", self._uri)

    def close(self) -> None:
        """Close the driver and release all connections."""
        if self._driver is not None:
            self._driver.close()
            self._driver = None
            logger.info("Neo4j driver closed")

    @property
    def driver(self) -> Driver:
        if self._driver is None:
            raise RuntimeError(
                "GraphService is not connected. Call connect() or use as context manager."
            )
        return self._driver

    # ------------------------------------------------------------------
    # Schema initialisation
    # ------------------------------------------------------------------

    def run_schema_init(self, cypher_path: Path) -> None:
        """Execute every Cypher statement in *cypher_path* against Neo4j.

        Statements are split on `;`. Blank and comment-only blocks are skipped.
        All constraints / indexes use `IF NOT EXISTS` so this is idempotent.
        """
        raw = cypher_path.read_text(encoding="utf-8")
        statements = [s.strip() for s in raw.split(";") if s.strip()]
        executed = 0
        with self.driver.session() as session:
            for stmt in statements:
                non_comment = "\n".join(
                    line for line in stmt.splitlines() if not line.strip().startswith("//")
                ).strip()
                if not non_comment:
                    continue
                session.run(stmt)
                executed += 1
        logger.info(
            "Schema init: executed %d Cypher statements from %s", executed, cypher_path.name
        )

    # ------------------------------------------------------------------
    # Constraint verification
    # ------------------------------------------------------------------

    def verify_constraints(self) -> dict[str, bool]:
        """Return a mapping of expected constraint name -> exists boolean.

        Returns:
            {
                "wallet_address": bool,
                "transaction_txid": bool,
                "ip_address": bool,
            }
        """
        results = {"wallet_address": False, "transaction_txid": False, "ip_address": False}
        with self.driver.session() as session:
            rows = session.run("SHOW CONSTRAINTS").data()
        for row in rows:
            labels = str(row.get("labelsOrTypes") or "").lower()
            props = str(row.get("properties") or "").lower()
            if "wallet" in labels and "address" in props:
                results["wallet_address"] = True
            if "transaction" in labels and "txid" in props:
                results["transaction_txid"] = True
            if "ip" in labels and "address" in props:
                results["ip_address"] = True
        return results

    # ------------------------------------------------------------------
    # Generic write helper
    # ------------------------------------------------------------------

    def batch_write(self, cypher: str, batch: list[dict], database: str = "neo4j") -> None:
        """Run a single `UNWIND $batch AS row ...` write transaction.

        Args:
            cypher: Cypher string that references `$batch`.
            batch: List of row dicts, capped at 1,000 items by contract.
            database: Neo4j logical database name.

        Raises:
            ValueError: If batch exceeds 1,000 items (caller bug, not retried).
        """
        if not batch:
            return
        if len(batch) > 1_000:
            raise ValueError(
                f"batch_write: {len(batch)} items — exceeds 1,000-item cap. Split before calling."
            )

        def _write(tx: ManagedTransaction) -> None:
            tx.run(cypher, batch=batch)

        with self.driver.session(database=database) as session:
            session.execute_write(_write)

    # ------------------------------------------------------------------
    # Convenience: count query
    # ------------------------------------------------------------------

    def count_query(self, cypher: str, database: str = "neo4j") -> int:
        """Run a single-value `RETURN count(...)` query and return the int."""
        with self.driver.session(database=database) as session:
            record = session.run(cypher).single()
            if record is None:
                return 0
            return int(record[0])
