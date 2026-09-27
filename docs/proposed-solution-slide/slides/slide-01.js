// SIH26146 — Single-slide "Proposed Solution" for Smart India Hackathon submission.
// Mirrors the template's slide-2 layout exactly (LAYOUT_WIDE 13.333 x 7.5):
//   - Title top-left, oval with codename
//   - 4-pillar system description on the left half
//   - Architecture diagram (user-supplied image) on the right half
//   - Footer bar + page number badge
//
// Image: C:\Users\bari2\Desktop\SIH26146\image.png (architecture diagram)
// Placed at the template's exact right-side image slot:
//   x = 5.6989, y = 0.9057, w = 7.6344, h = 5.8024
//   (matches template's "Picture 2" position)

const path = require('path');
const PROJECT_ROOT = 'C:\\Users\\bari2\\Desktop\\SIH26146';
const ARCH_IMG = path.join(PROJECT_ROOT, 'image.png');

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  // ---------- Background ----------
  slide.background = { color: theme.bg };

  // ---------- Bottom bar (mirrors Rectangle 8 in template) ----------
  slide.addShape('rect', {
    x: 0.0, y: 6.9514, w: 13.3333, h: 0.5503,
    fill: { color: 'F1F5F9' },
    line: { color: 'E2E8F0', width: 0.5 }
  });

  // ---------- Footer text (centered, matches template Footer Placeholder) ----------
  slide.addText('@SIH Idea submission- Template', {
    x: 5.0833, y: 6.9514, w: 3.5039, h: 0.3993,
    fontSize: 10, fontFace: 'Arial', color: '64748B',
    align: 'center', valign: 'middle'
  });

  // ---------- Slide number badge (bottom-right corner) ----------
  slide.addText('2', {
    x: 12.85, y: 6.96, w: 0.42, h: 0.39,
    fontSize: 11, bold: true, fontFace: 'Arial', color: '64748B',
    align: 'right', valign: 'middle'
  });

  // ---------- Title (matches template TextBox 8) ----------
  // Small diamond accent before the title (mirrors the slide master decorator).
  slide.addShape('diamond', {
    x: 1.95, y: 0.72, w: 0.18, h: 0.18,
    fill: { color: theme.accent },
    line: { color: theme.accent, width: 0 }
  });
  slide.addText('Proposed Solution', {
    x: 2.20, y: 0.5543, w: 5.0, h: 0.5049,
    fontSize: 24, bold: true, fontFace: 'Arial', color: theme.primary,
    valign: 'middle'
  });

  // ---------- SIH Hackathon 2026 logo (top-right, mirrors template Picture 15) ----------
  // Mandatory per the SIH submission template.
  slide.addImage({
    path: path.join(__dirname, '..', 'assets', 'slide02_01_Picture_15.png'),
    x: 11.4484, y: 0.021, w: 1.6438, h: 0.8484
  });

  // ---------- Top-left brand mark (replaces the oval — clean typographic mark) ----------
  // Vertical accent bar + BTC ₿ monogram + SIH26146 wordmark.
  slide.addShape('rect', {
    x: 0.30, y: 0.20, w: 0.06, h: 0.85,
    fill: { color: theme.accent },
    line: { color: theme.accent, width: 0 }
  });
  slide.addText('₿', {
    x: 0.42, y: 0.12, w: 0.55, h: 0.55,
    fontSize: 30, bold: true, fontFace: 'Arial', color: theme.accent,
    align: 'left', valign: 'middle'
  });
  slide.addText('SIH26146', {
    x: 0.42, y: 0.62, w: 1.40, h: 0.30,
    fontSize: 13, bold: true, fontFace: 'Arial', color: theme.primary,
    align: 'left', valign: 'middle',
    charSpacing: 2
  });

  // ---------- Subtitle on the right of brand mark: classification ----------
  slide.addText('Bitcoin AML Surveillance  ·  Air-Gapped  ·  Offline Intelligence Platform', {
    x: 2.30, y: 0.20, w: 9.0, h: 0.30,
    fontSize: 11, italic: true, fontFace: 'Arial', color: '475569',
    align: 'right', valign: 'middle'
  });

  // ---------- Left text block: 4-pillar system description ----------
  // Bold prefix + regular body for each pillar, mirrors template's runs structure.
  const PILLARS = [
    {
      label: 'THE SYSTEM  ·  ',
      body: 'SIH26146 — an end-to-end, fully air-gapped platform fusing offline blockchain graph analytics, MaxMind GeoIP/ASN enrichment, and CPU-only deep learning to flag illicit Bitcoin transaction patterns and emit court-admissible forensic dossiers for NTRO cyber-surveillance analysts.'
    },
    {
      label: 'PILLAR 1  ·  MULTI-LAYER INGESTION & CORRELATION  ·  ',
      body: 'Bulk CSV / JSON / XML traffic captures flow through FastAPI + Celery (Redis broker), are enriched offline with MaxMind GeoLite2 (City + ASN), and persisted via binary COPY into PostgreSQL 16 and Neo4j 5.26 + GDS 2.13.'
    },
    {
      label: 'PILLAR 2  ·  GRAPH ANALYTICS & ANOMALY CORE  ·  ',
      body: 'Neo4j Louvain community detection plus CIOH (Common-Input-Ownership) heuristics cluster multi-input entities; a 7-layer PyTorch Autoencoder and FT-Transformer score 18-feature transactions (F1 = 0.6972, latency 0.0222 ms) on CPU alone.'
    },
    {
      label: 'PILLAR 3  ·  LAUNDERING PATTERN ENGINE  ·  ',
      body: 'Deterministic Cypher rules detect peeling chains (97.2 % recall ≥ 5 hops) and CoinJoin mixers (100 % recall ≥ 3-in / ≥ 3-out equal denominations); a Graph Transformer (F1 = 0.9209, AUC = 0.9956) propagates risk from Ransomwhere seed entities across 24,673 wallets.'
    },
    {
      label: 'PILLAR 4  ·  EXPLAINABLE TACTICAL DASHBOARD  ·  ',
      body: 'SHAP waterfall plus GNNExplainer subgraphs power a Next.js 16 Tactical Command Center with a master alert grid, D3 force graph, and 1-click JSON / PDF dossier export — running 100 % air-gapped on commodity CPU hardware.'
    }
  ];

  // Build paragraphs — one addText() per pillar (each gets its own bullet).
// pptxgenjs 4.0.1 collapses multi-element arrays into a single paragraph, so
// we render each pillar as a separate text box stacked vertically. Each box's
// height is generous so its text doesn't overflow into the next box.
  const BULLET = { code: '25CF', indent: 18 }; // ● filled circle, ink-blue

  // (startY, height) per pillar — sized so all 5 fit within y ∈ [1.40, 6.80].
  const PILLAR_LAYOUT = [
    { y: 1.40, h: 0.95 }, // THE SYSTEM (intro — ~6 lines)
    { y: 2.40, h: 0.95 }, // PILLAR 1 — ~6 lines
    { y: 3.40, h: 1.05 }, // PILLAR 2 — ~7 lines
    { y: 4.50, h: 1.05 }, // PILLAR 3 — ~7 lines
    { y: 5.60, h: 1.20 }  // PILLAR 4 — ~8 lines (longest)
  ];

  PILLARS.forEach((p, i) => {
    const { y, h } = PILLAR_LAYOUT[i];
    slide.addText(`${p.label}${p.body}`, {
      x: 0.18, y, w: 5.50, h,
      valign: 'top', align: 'left',
      bullet: BULLET,
      fontSize: 11,
      fontFace: 'Arial',
      color: '0F172A',
      bold: true,
      lineSpacingMultiple: 1.05
    });
  });

  // ---------- Right side: architecture diagram (user-supplied image) ----------
  // Placeholder panel border so the image sits in a clean frame on the slide.
  slide.addShape('rect', {
    x: 5.6989, y: 0.9057, w: 7.6344, h: 5.8024,
    fill: { color: 'FFFFFF' },
    line: { color: 'CBD5E1', width: 1 }
  });

  // Insert architecture image at the template's exact slot.
  slide.addImage({
    path: ARCH_IMG,
    x: 5.7189, y: 0.9257, w: 7.5944, h: 5.7624
  });
}

module.exports = { createSlide };