"""Unit tests for entity explain endpoint topological subgraph fallback."""

import asyncio
import pytest

from app.schemas.entity import GnnSubgraphNode, GnnSubgraphEdge, GnnSubgraph
from app.routers.entity import _fetch_topological_subgraph_from_neo4j


def test_fetch_topological_subgraph_from_neo4j_live():
    """Verify live Neo4j topological fallback returns valid nodes and edges for connected wallet."""
    addr = "bc1q5df00faa8236f410b7c2e605cd18059edb7e87"
    subgraph = asyncio.run(_fetch_topological_subgraph_from_neo4j(addr))
    assert subgraph is not None
    assert len(subgraph.nodes) > 1
    assert any(n.id == addr for n in subgraph.nodes)
    assert len(subgraph.edges) > 0


def test_fetch_topological_subgraph_from_neo4j_missing_address():
    """Verify missing address returns None gracefully without exception."""
    subgraph = asyncio.run(_fetch_topological_subgraph_from_neo4j("nonexistent_wallet_999999999999"))
    assert subgraph is None
