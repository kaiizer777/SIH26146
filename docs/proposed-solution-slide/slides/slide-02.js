// SIH26146 — Technical Approach slide (slide-02).
// Mirrors slide-01's top-layer chrome (vertical accent bar + ₿ monogram +
// SIH26146 wordmark + italic subtitle + SIH Hackathon 2026 logo +
// diamond accent + slide title). The technical-approach.png infographic
// is shifted below the chrome and scaled to preserve its native aspect
// (1908 x 957, ~2:1) so all its content (TECH STACK, ARCHITECTURE,
// PIPELINE METRICS, 6-step pipeline) is fully visible. The image bakes
// in its own footer + page badge ("3"), so no second overlay is added.

const path = require('path');
const TECH_IMG = path.join(
  'C:\\Users\\bari2\\Desktop\\SIH26146',
  'docs', 'proposed-solution-slide', 'assets', 'technical-approach.png'
);

// Layout math (canvas is LAYOUT_WIDE = 13.333 x 7.5 inches):
//   chrome zone : y ∈ [0.02, 1.06]   (brand mark, subtitle, SIH logo, title)
//   image starts: y = 1.20            (small gutter below chrome)
//   image h     : 5.85                (leaves 0.45" footer breath)
//   native aspect: 1908 / 957 = 1.9941 ≈ 2:1
//   image w     : h * aspect = 11.67
//   centering   : x = (13.333 - 11.67) / 2 ≈ 0.831
const IMG = { x: 0.831, y: 1.20, w: 11.671, h: 5.85 };

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  // ---------- Background (white, fills side margins around the image) ----------
  slide.background = { color: theme.bg };

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

  // ---------- Classification subtitle (right-aligned, mirrors slide-01) ----------
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

  // ---------- Slide title with diamond accent (FULL title) ----------
  slide.addShape('diamond', {
    x: 1.95, y: 0.72, w: 0.18, h: 0.18,
    fill: { color: theme.accent },
    line: { color: theme.accent, width: 0 }
  });
  slide.addText('Technical Approach', {
    x: 2.20, y: 0.5543, w: 9.0, h: 0.5049,
    fontSize: 24, bold: true, fontFace: 'Arial', color: theme.primary,
    valign: 'middle'
  });

  // ---------- Technical approach infographic (native ~2:1 aspect, centered) ----------
  slide.addImage({
    path: TECH_IMG,
    ...IMG
  });

  // No footer / page-number badge — image bakes in "@SIH Idea submission- Template"
  // and "3" at its own bottom edge.
}

module.exports = { createSlide };
