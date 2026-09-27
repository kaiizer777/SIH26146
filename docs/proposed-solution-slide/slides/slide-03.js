// SIH26146 — Slide 03: "Feasibility and Viability".
// Mirrors slide-01 / slide-02 chrome (vertical accent bar + ₿ monogram +
// SIH26146 wordmark + italic subtitle + SIH Hackathon 2026 logo + diamond
// accent + slide title). Body is a 3-row × 2-col card grid that inherits the
// AlertX reference deck's slide-4 panel pattern — colored 1.5 pt rounded
// borders with a soft tinted fill, an icon-glyph + bold title, and a stack
// of bold-label / body bullets. Content is rewritten for SIH26146 (NTRO BTC
// AML surveillance) — not pasted from the reference.
//
// Canvas: LAYOUT_WIDE = 13.333 × 7.5 in.
// Grid:   rows at y=1.10, 3.05, 5.00 (h=1.85, gaps 0.10). Cols x=0.20 (w=6.40),
//         x=6.73 (w=6.40). Bottom footer bar y=6.9514 (matches slide-01).

const path = require('path');

// Card color tokens — border + matching light tint.
const CARDS = [
  {
    title: 'Feasibility',
    icon: '⚙️',
    border: '2563EB',
    fill:   'EFF6FF',
    bullets: [
      ['Technical: ', 'FastAPI 0.141.1 + Next.js 16 + Neo4j 5.26 + PyTorch — fully open-source, no proprietary hardware.'],
      ['Modular: ',   'backend (FastAPI/Celery), graph DB (Neo4j + GDS 2.13), frontend (Next.js) deploy independently.'],
      ['Market: ',    'NTRO cyber-surveillance mandate + Interpol + FATF travel-rule; growing demand for BTC AML analytics.'],
      ['Economic: ',  'commodity-CPU node vs $250K–$500K commercial suites — orders-of-magnitude cheaper.']
    ]
  },
  {
    title: 'Solutions',
    icon: '🛡️',
    border: 'EA580C',
    fill:   'FFF7ED',
    bullets: [
      ['Air-Gap: ',   'CPU-only ONNX-exportable models — no GPU, no internet, no cloud dependency.'],
      ['Algorithm: ', 'Louvain community detection + CIOH heuristics + FT-Transformer — peer-reviewed graph analytics.'],
      ['Training: ',  'class-weighted loss + SMOTE on 18 hand-crafted features — F1 0.6972 anomaly, F1 0.9209 risk.']
    ]
  },
  {
    title: 'Viability & Business Potential',
    icon: '💰',
    border: 'DC2626',
    fill:   'FEF2F2',
    bullets: [
      ['Production Champion: ', 'FT-Transformer F1 0.6972, AUC 0.9956, 0.0222 ms / inference.'],
      ['Cost Efficiency: ',     'sub-$1K commodity CPU vs $250K–$500K commercial — extends budget 250×.'],
      ['Compliance: ',          'court-admissible JSON + PDF dossiers with tamper-evident SHA-256 chain.'],
      ['Resilience: ',          '100% air-gapped — immune to network outages, DDoS, sovereign-cloud risk.']
    ]
  },
  {
    title: 'Use Cases',
    icon: '👥',
    border: '7C3AED',
    fill:   'F5F3FF',
    bullets: [
      ['NTRO Cyber Analysts: ',         '4-tier severity master alert grid + D3 force-graph drilling on suspect wallets.'],
      ['Forensic Investigators: ',      'SHAP waterfall + GNNExplainer subgraphs for traceable, defensible case files.'],
      ['Field Officers / Liaison: ',    '1-click JSON / PDF dossier export for courtroom delivery and chain-of-custody.']
    ]
  },
  {
    title: 'Challenges',
    icon: '🚧',
    border: '16A34A',
    fill:   'F0FDF4',
    bullets: [
      ['Synthetic Stream Today: ', 'demo runs on anonymized ledger traces; live NTRO transaction feed pilot pending.'],
      ['Edge Hardware: ',          'ONNX scripts ready; ruggedised Pi-class node procurement + field hardening in progress.'],
      ['Multi-Tenant Scale: ',     'multi-NTRO-unit isolation + Celery pool tuning at >100k tx/sec not yet benchmarked.']
    ]
  },
  {
    title: 'Supporting Facts',
    icon: '⭐',
    border: '475569',
    fill:   'F1F5F9',
    // This card uses ➤ instead of ● so it reads as an evidence panel.
    bullets: [
      ['11,938 tx/sec ',      'sustained PostgreSQL binary-COPY ingest.'],
      ['24,673 wallets ',     '/ 9,794 Louvain clusters / 45,516 edges scored.'],
      ['Graph Transformer ',  'AUC 0.9956; 0 / 197 missed high-risk wallets on Ransomwhere seed set.']
    ],
    bulletGlyph: '➤'
  }
];

// Layout constants.
const COLS = [
  { x: 0.20, w: 6.40 }, // left
  { x: 6.73, w: 6.40 }  // right
];
const ROWS = [
  { y: 1.10, h: 1.85 }, // row 1
  { y: 3.05, h: 1.85 }, // row 2
  { y: 5.00, h: 1.85 }  // row 3
];

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  // ---------- Background ----------
  slide.background = { color: theme.bg };

  // ---------- Bottom footer bar (same style as slide-01) ----------
  slide.addShape('rect', {
    x: 0.0, y: 6.9514, w: 13.3333, h: 0.5503,
    fill: { color: 'F1F5F9' },
    line: { color: 'E2E8F0', width: 0.5 }
  });

  // ---------- Footer text (centered, matches slide-01) ----------
  slide.addText('@SIH Idea submission- Template', {
    x: 5.0833, y: 6.9514, w: 3.5039, h: 0.3993,
    fontSize: 10, fontFace: 'Arial', color: '64748B',
    align: 'center', valign: 'middle'
  });

  // ---------- Slide number badge (bottom-right) ----------
  slide.addText('4', {
    x: 12.85, y: 6.96, w: 0.42, h: 0.39,
    fontSize: 11, bold: true, fontFace: 'Arial', color: '64748B',
    align: 'right', valign: 'middle'
  });

  // ---------- Top-left brand mark (vertical accent bar + ₿ + SIH26146) ----------
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

  // ---------- Classification subtitle (right-aligned) ----------
  slide.addText('Bitcoin AML Surveillance  ·  Air-Gapped  ·  Offline Intelligence Platform', {
    x: 2.30, y: 0.20, w: 9.0, h: 0.30,
    fontSize: 11, italic: true, fontFace: 'Arial', color: '475569',
    align: 'right', valign: 'middle'
  });

  // ---------- SIH Hackathon 2026 logo (top-right) ----------
  slide.addImage({
    path: path.join(__dirname, '..', 'assets', 'slide02_01_Picture_15.png'),
    x: 11.4484, y: 0.021, w: 1.6438, h: 0.8484
  });

  // ---------- Slide title with diamond accent ----------
  slide.addShape('diamond', {
    x: 1.95, y: 0.72, w: 0.18, h: 0.18,
    fill: { color: theme.accent },
    line: { color: theme.accent, width: 0 }
  });
  slide.addText('Feasibility and Viability', {
    x: 2.20, y: 0.5543, w: 9.0, h: 0.5049,
    fontSize: 24, bold: true, fontFace: 'Arial', color: theme.primary,
    valign: 'middle'
  });

  // ---------- 6-card grid (3 rows × 2 cols) ----------
  CARDS.forEach((card, idx) => {
    const col = COLS[idx % 2];
    const row = ROWS[Math.floor(idx / 2)];

    // Card background — rounded rectangle with colored border + tinted fill.
    slide.addShape('roundRect', {
      x: col.x, y: row.y, w: col.w, h: row.h,
      fill: { color: card.fill },
      line: { color: card.border, width: 1.5 },
      rectRadius: 0.08
    });

    // Title bar — icon glyph + card title, bold, in the card's border color.
    // A thin tinted bar at the top of the card keeps icon+title visually anchored.
    slide.addShape('rect', {
      x: col.x, y: row.y, w: col.w, h: 0.42,
      fill: { color: card.border },
      line: { color: card.border, width: 0 }
    });
    slide.addText([
      { text: `${card.icon}  `, options: { fontSize: 14, bold: true } },
      { text: card.title,       options: { fontSize: 14, bold: true } }
    ], {
      x: col.x + 0.18, y: row.y + 0.02, w: col.w - 0.36, h: 0.38,
      fontFace: 'Arial', color: 'FFFFFF',
      align: 'left', valign: 'middle'
    });

    // Bullet stack — one addText() per bullet so label bold / body regular
    // renders correctly without pptxgenjs collapsing rich-text paragraphs.
    const bodyTop = row.y + 0.50;
    const bodyAvail = row.h - 0.58;
    const bulletH = bodyAvail / card.bullets.length;
    const glyph = card.bulletGlyph || '●';

    card.bullets.forEach((b, i) => {
      const bulletY = bodyTop + i * bulletH;
      slide.addText([
        { text: `${glyph} ${b[0]}`, options: { bold: true,  color: '0F172A' } },
        { text:        b[1],       options: { bold: false, color: '0F172A' } }
      ], {
        x: col.x + 0.18, y: bulletY, w: col.w - 0.36, h: bulletH,
        fontSize: 10, fontFace: 'Arial',
        valign: 'top', align: 'left',
        lineSpacingMultiple: 1.05
      });
    });
  });
}

module.exports = { createSlide };
