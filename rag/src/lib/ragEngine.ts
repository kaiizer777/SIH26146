import knowledgeData from "@/data/project_knowledge.json";

export interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  title: string;
  tldr: string;
  body: string;
  tags: string[];
  chapterUrl: string;
  chapterTitle: string;
  fileCitations: string[];
  keyMetrics?: Record<string, string | number | undefined>;
  codeSnippet?: string;
}

export interface SearchResult {
  item: KnowledgeItem;
  score: number;
  confidence: number; // 0 to 100
  matchedTerms: string[];
  snippet: string;
  latencyMs: number;
}

// Stop words list for natural language queries
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
  "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "it's",
  "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
  "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
  "their", "theirs", "them", "themselves", "then", "there", "there's", "these",
  "they", "they'd", "they'll", "they're", "they've", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
  "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's",
  "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've",
  "your", "yours", "yourself", "yourselves"
]);

// Domain-specific Bitcoin & Forensic term stemming/normalization
const STEM_MAP: Record<string, string> = {
  addresses: "address",
  addressing: "address",
  transactions: "transaction",
  transactional: "transaction",
  txs: "transaction",
  tx: "transaction",
  txid: "txid",
  txids: "txid",
  clusters: "cluster",
  clustering: "cluster",
  clustered: "cluster",
  peeling: "peel",
  peeled: "peel",
  peels: "peel",
  mixers: "mixer",
  mixing: "mixer",
  mixed: "mixer",
  mix: "mixer",
  transformers: "transformer",
  subgraphs: "subgraph",
  attributions: "attribution",
  attributed: "attribution",
  heuristics: "heuristic",
  embeddings: "embedding",
  embedded: "embedding",
  models: "model",
  modeling: "model",
  endpoints: "endpoint",
  dossiers: "dossier",
  weights: "weight",
  weighted: "weight",
  features: "feature",
  seeds: "seed",
  seeded: "seed",
  hops: "hop",
  nodes: "node",
  edges: "edge",
  relations: "relation",
  relational: "relation",
  anomalies: "anomaly",
  anomalous: "anomaly",
  verdicts: "verdict",
  currencies: "currency",
  cryptographic: "crypto",
  cryptography: "crypto",
  locks: "lock",
  locked: "lock",
  locking: "lock",
  scanned: "scan",
  scanning: "scan",
  ingested: "ingest",
  ingestion: "ingest",
  ingesting: "ingest",
  enriched: "enrich",
  enrichment: "enrich",
  provisional: "provisional",
  provisioning: "provisional",
  servers: "server",
  processes: "process",
  processing: "process",
  workers: "worker"
};

// Exact keyword booster list
const EXACT_BOOSTER_TERMS: Record<string, number> = {
  "409": 15.0,
  "copy": 12.0,
  "peeling": 12.0,
  "louvain": 14.0,
  "transformerconv": 15.0,
  "section 65b": 15.0,
  "65b": 12.0,
  "bsa": 10.0,
  "bsa 2023": 12.0,
  "solo": 14.0,
  "pool=solo": 15.0,
  "--pool=solo": 15.0,
  "dev-server": 12.0,
  "xai_store": 14.0,
  "rlock": 12.0,
  "provisional": 12.0,
  "focal": 10.0,
  "ft-transformer": 14.0,
  "graphsage": 12.0,
  "coinjoin": 12.0,
  "maxmind": 10.0,
  "geoip": 10.0,
  "cioh": 12.0,
  "cospend": 12.0,
  "co_spend": 12.0,
  "pagerank": 10.0,
  "ppr": 12.0,
  "shap": 12.0,
  "gnnexplainer": 14.0,
  "addresshashmiddleware": 14.0,
  "pytest": 10.0,
  "8000": 10.0,
  "3000": 10.0,
  "3001": 10.0,
  "5432": 10.0,
  "7687": 10.0,
  "6379": 10.0
};

/**
 * Clean and stem a token
 */
function normalizeToken(token: string): string {
  const clean = token.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!clean) return "";
  return STEM_MAP[clean] || clean;
}

/**
 * Tokenize an arbitrary string into a list of normalized terms
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[\s,./;:!?"'()\[\]{}|\\+*=<>~`#@%^&]+/)
    .map(normalizeToken)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// In-Memory Inverted Index Entry
interface IndexEntry {
  docId: string;
  field: "question" | "tags" | "tldr" | "body" | "title";
  frequency: number;
}

class InvertedIndex {
  private index: Map<string, IndexEntry[]> = new Map();
  private documents: Map<string, KnowledgeItem> = new Map();

  constructor(items: KnowledgeItem[]) {
    this.buildIndex(items);
  }

  private buildIndex(items: KnowledgeItem[]) {
    for (const item of items) {
      this.documents.set(item.id, item);

      // 1. Index question (Weight factor: 3.0)
      this.addTokens(item.id, "question", tokenize(item.question));

      // 2. Index tags (Weight factor: 2.5)
      const tagTokens = item.tags.flatMap((t) => tokenize(t));
      this.addTokens(item.id, "tags", tagTokens);

      // 3. Index title (Weight factor: 2.5)
      this.addTokens(item.id, "title", tokenize(item.title));

      // 4. Index TL;DR (Weight factor: 2.0)
      this.addTokens(item.id, "tldr", tokenize(item.tldr));

      // 5. Index Body (Weight factor: 1.0)
      this.addTokens(item.id, "body", tokenize(item.body));
    }
  }

  private addTokens(
    docId: string,
    field: "question" | "tags" | "tldr" | "body" | "title",
    tokens: string[]
  ) {
    const counts: Record<string, number> = {};
    for (const token of tokens) {
      counts[token] = (counts[token] || 0) + 1;
    }

    for (const [token, freq] of Object.entries(counts)) {
      if (!this.index.has(token)) {
        this.index.set(token, []);
      }
      this.index.get(token)!.push({ docId, field, frequency: freq });
    }
  }

  public getPostings(token: string): IndexEntry[] {
    return this.index.get(token) || [];
  }

  public getDocument(id: string): KnowledgeItem | undefined {
    return this.documents.get(id);
  }

  public getAllDocuments(): KnowledgeItem[] {
    return Array.from(this.documents.values());
  }
}

// Global in-memory singleton
const corpus: KnowledgeItem[] = (knowledgeData as unknown) as KnowledgeItem[];
const invertedIndex = new InvertedIndex(corpus);

/**
 * Multi-Tier air-gapped retrieval engine
 * Latency is typically <1ms on modern CPU.
 */
export function searchKnowledge(
  query: string,
  options?: {
    category?: string;
    limit?: number;
  }
): SearchResult[] {
  const startTime = typeof performance !== "undefined" ? performance.now() : 0;
  const rawQuery = query.trim().toLowerCase();

  if (!rawQuery) {
    // Return default items if query is empty
    const all = invertedIndex.getAllDocuments();
    const filtered = options?.category
      ? all.filter((item) => item.category === options.category)
      : all;
    return filtered.slice(0, options?.limit || 10).map((item) => ({
      item,
      score: 1.0,
      confidence: 100,
      matchedTerms: [],
      snippet: item.tldr.slice(0, 160) + "...",
      latencyMs: 0.1,
    }));
  }

  const queryTokens = tokenize(rawQuery);
  const docScores = new Map<string, { score: number; matchedTerms: Set<string> }>();

  // Helper to accumulate scores
  const addScore = (docId: string, points: number, term: string) => {
    if (!docScores.has(docId)) {
      docScores.set(docId, { score: 0, matchedTerms: new Set() });
    }
    const record = docScores.get(docId)!;
    record.score += points;
    record.matchedTerms.add(term);
  };

  // 1. Process query tokens against inverted index
  for (const token of queryTokens) {
    const postings = invertedIndex.getPostings(token);
    for (const posting of postings) {
      let weight = 1.0;
      switch (posting.field) {
        case "question":
          weight = 3.0;
          break;
        case "tags":
        case "title":
          weight = 2.5;
          break;
        case "tldr":
          weight = 2.0;
          break;
        case "body":
          weight = 1.0;
          break;
      }
      // Logarithmic sub-linear frequency scaling
      const points = weight * (1 + Math.log(posting.frequency));
      addScore(posting.docId, points, token);
    }
  }

  // 2. Dynamic Exact Keyword Boosters
  for (const [boosterTerm, boostWeight] of Object.entries(EXACT_BOOSTER_TERMS)) {
    if (rawQuery.includes(boosterTerm)) {
      for (const item of corpus) {
        const fullText = (
          item.id + " " +
          item.question + " " +
          item.title + " " +
          item.tags.join(" ") + " " +
          item.tldr + " " +
          item.body
        ).toLowerCase();

        if (fullText.includes(boosterTerm)) {
          addScore(item.id, boostWeight, boosterTerm);
        }
      }
    }
  }

  // 3. Exact phrase match boost on question or title
  for (const item of corpus) {
    if (item.question.toLowerCase().includes(rawQuery)) {
      addScore(item.id, 12.0, rawQuery);
    } else if (item.title.toLowerCase().includes(rawQuery)) {
      addScore(item.id, 10.0, rawQuery);
    } else if (item.tldr.toLowerCase().includes(rawQuery)) {
      addScore(item.id, 6.0, rawQuery);
    }
  }

  // Filter and sort results
  let results: SearchResult[] = [];
  const maxScore = Math.max(1, ...Array.from(docScores.values()).map((v) => v.score));

  for (const [docId, { score, matchedTerms }] of docScores.entries()) {
    const doc = invertedIndex.getDocument(docId);
    if (!doc) continue;

    // Optional category filtering
    if (options?.category && doc.category !== options.category) {
      continue;
    }

    // Confidence calibration: 65% to 99%
    const relativeRatio = score / maxScore;
    const confidence = Math.min(
      99,
      Math.max(65, Math.round(65 + relativeRatio * 34))
    );

    // Extract relevant snippet highlighting matched terms
    const snippet = extractSnippet(doc, Array.from(matchedTerms));

    results.push({
      item: doc,
      score: Number(score.toFixed(2)),
      confidence,
      matchedTerms: Array.from(matchedTerms),
      snippet,
      latencyMs: 0,
    });
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  // Apply limit
  const limit = options?.limit || 10;
  results = results.slice(0, limit);

  const endTime = typeof performance !== "undefined" ? performance.now() : 0;
  const elapsed = Math.max(0.1, Number((endTime - startTime).toFixed(2)));

  for (const res of results) {
    res.latencyMs = elapsed;
  }

  return results;
}

/**
 * Extract a concise snippet around matched keywords
 */
function extractSnippet(item: KnowledgeItem, matchedTerms: string[]): string {
  if (matchedTerms.length === 0) {
    return item.tldr.slice(0, 180) + "...";
  }

  const text = item.tldr + " " + item.body;
  const lower = text.toLowerCase();

  let bestIndex = -1;
  for (const term of matchedTerms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx;
    }
  }

  if (bestIndex === -1) {
    return item.tldr.slice(0, 180) + "...";
  }

  const start = Math.max(0, bestIndex - 40);
  const end = Math.min(text.length, bestIndex + 140);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Retrieve unique categories across knowledge corpus
 */
export function getAllCategories(): string[] {
  const cats = new Set<string>();
  for (const item of corpus) {
    cats.add(item.category);
  }
  return Array.from(cats);
}

/**
 * Direct lookup by ID
 */
export function getKnowledgeById(id: string): KnowledgeItem | undefined {
  return invertedIndex.getDocument(id);
}

/**
 * Quick doubts for user pill buttons
 */
export function getQuickDoubts(): string[] {
  return [
    "Why did re-uploading the same CSV return HTTP 409?",
    "How does peeling chain traversal work in Cypher?",
    "How does FT-Transformer compute anomaly scores?",
    "Why Celery does not write directly to xai_store in Phase 11?",
    "What is Section 65B Indian Evidence Act certification?",
    "How do I run backend and celery locally without Docker?",
    "What is the Neo4j GDS Louvain modularity score?",
    "How does Relational Graph Transformer handle 3 edge types?",
    "Why must Celery be executed with --pool=solo on Windows?",
    "What is AddressHashMiddleware and why is it used?",
  ];
}

/**
 * Get all knowledge items
 */
export function getAllKnowledge(): KnowledgeItem[] {
  return corpus;
}
