// SIH26146 -- Slide 04 (cover / title slide of the deck).
//
// Polished cover for the SIH26146 submission. Mirrors the official SIH
// submission template's structure (banner + team name + bullet list + themed
// graphic) and elevates it with:
//   - Dark navy header band with white banner text and ink-blue accent stripes
//   - Thin gold accent strip directly below the banner
//   - Centered team name with a small horizontal accent rule above it
//   - Six info rows as soft white cards with colored left stripes + gold dot
//   - Refined Bitcoin hex motif panel (layered tints + ring of hexes)
//   - Refined footer
//
// SIH Hackathon 2026 logo (top-right) and the "SMART INDIA HACKATHON 2026"
// banner are preserved per submission requirements.
//
// Canvas: LAYOUT_WIDE = 13.333 x 7.5 in.

const path = require('path');

// Color tokens (no '#' in hex strings).
const C = {
  navy:    '1F3864', // header band
  ink:     '2563EB', // primary accent (ink blue)
  gold:    'F59E0B', // secondary accent (amber)
  bg:      'F8FAFC', // slide background (very light slate)
  cardBg:  'FFFFFF', // bullet card background
  panelBg: 'EFF6FF', // outer hex panel tint
  panelIn: 'DBEAFE', // inner hex panel tint
  border:  'E2E8F0', // subtle border
  text:    '0F172A', // body text
  muted:   '64748B'  // secondary text
};

function createSlide(pres, theme) {
  const slide = pres.addSlide();

  // ---------- Background ----------
  slide.background = { color: C.bg };

  // ============================================================
  // 1. HEADER BAND (dark navy)
  // ============================================================
  slide.addShape('rect', {
    x: 0.0, y: 0.0, w: 13.333, h: 1.45,
    fill: { color: C.navy },
    line: { color: C.navy, width: 0 }
  });

  // Left accent stripe (vertical, ink-blue)
  slide.addShape('rect', {
    x: 0.0, y: 0.0, w: 0.20, h: 1.45,
    fill: { color: C.ink },
    line: { color: C.ink, width: 0 }
  });
  // Right accent stripe (vertical, ink-blue)
  slide.addShape('rect', {
    x: 13.133, y: 0.0, w: 0.20, h: 1.45,
    fill: { color: C.ink },
    line: { color: C.ink, width: 0 }
  });

  // "SMART INDIA HACKATHON 2026" banner (white, bold, centered)
  slide.addText('SMART INDIA HACKATHON 2026', {
    x: 0.4, y: 0.0, w: 10.7, h: 1.45,
    fontSize: 34, bold: true, fontFace: 'Arial',
    color: 'FFFFFF',
    align: 'center', valign: 'middle',
    charSpacing: 3
  });

  // SIH Hackathon 2026 logo (top-right, sits on the band)
  slide.addImage({
    path: path.join(__dirname, '..', 'assets', 'slide02_01_Picture_15.png'),
    x: 11.55, y: 0.20, w: 1.55, h: 0.85
  });

  // ============================================================
  // 2. Gold accent strip directly below the band
  // ============================================================
  slide.addShape('rect', {
    x: 0.0, y: 1.45, w: 13.333, h: 0.07,
    fill: { color: C.gold },
    line: { color: C.gold, width: 0 }
  });

  // ============================================================
  // 3. Team name section (centered)
  // ============================================================
  // Small horizontal accent rule above the team name
  slide.addShape('rect', {
    x: 5.917, y: 1.80, w: 1.50, h: 0.04,
    fill: { color: C.ink },
    line: { color: C.ink, width: 0 }
  });

  // Centered team name (large, bold, underlined)
  slide.addText('AlertX', {
    x: 0.0, y: 1.92, w: 13.333, h: 0.85,
    fontSize: 44, bold: true, fontFace: 'Arial', color: C.text,
    align: 'center', valign: 'middle',
    underline: { style: 'sng' }
  });

  // Subtitle under team name (italic, muted)
  slide.addText('Team Submission  |  Smart India Hackathon 2026', {
    x: 0.0, y: 2.78, w: 13.333, h: 0.30,
    fontSize: 11, italic: true, fontFace: 'Arial', color: C.muted,
    align: 'center', valign: 'middle',
    charSpacing: 3
  });

  // ============================================================
  // 4. Left bullets panel -- 6 info rows as soft cards
  // ============================================================
  const BULLETS = [
    { label: 'Problem Statement ID',    value: '26146' },
    { label: 'Problem Statement Title', value: 'AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic' },
    { label: 'Theme',                   value: 'Blockchain & Cybersecurity' },
    { label: 'PS Category',             value: 'Software' },
    { label: 'Team ID',                 value: '' },
    { label: 'Team Name',               value: 'AlertX' }
  ];

  const BULLET_X = 0.50;
  const BULLET_W = 7.50;
  const BULLET_TOP = 3.30;
  const BULLET_GAP = 0.56;

  BULLETS.forEach((b, i) => {
    const y = BULLET_TOP + i * BULLET_GAP;

    // Card background (soft white with subtle border + rounded corners)
    slide.addShape('roundRect', {
      x: BULLET_X, y, w: BULLET_W, h: 0.50,
      fill: { color: C.cardBg },
      line: { color: C.border, width: 0.75 },
      rectRadius: 0.05
    });

    // Colored left accent stripe (ink-blue)
    slide.addShape('rect', {
      x: BULLET_X, y, w: 0.10, h: 0.50,
      fill: { color: C.ink },
      line: { color: C.ink, width: 0 }
    });

    // Small gold dot (decorative bullet)
    slide.addShape('ellipse', {
      x: BULLET_X + 0.25, y: y + 0.21, w: 0.08, h: 0.08,
      fill: { color: C.gold },
      line: { color: C.gold, width: 0 }
    });

    // Label (bold) + value (regular)
    slide.addText([
      { text: `${b.label}:  `, options: { bold: true,  color: C.text, fontSize: 12 } },
      { text:        b.value,  options: { bold: false, color: C.text, fontSize: 12 } }
    ], {
      x: BULLET_X + 0.45, y, w: BULLET_W - 0.55, h: 0.50,
      fontFace: 'Arial', valign: 'middle', align: 'left',
      lineSpacingMultiple: 1.05,
      margin: 0
    });
  });

  // ============================================================
  // 5. Right side: Bitcoin hex motif panel
  // ============================================================
  const PANEL_X = 8.40;
  const PANEL_Y = 3.30;
  const PANEL_W = 4.50;
  const PANEL_H = 3.30;

  // Outer soft panel
  slide.addShape('roundRect', {
    x: PANEL_X, y: PANEL_Y, w: PANEL_W, h: PANEL_H,
    fill: { color: C.panelBg },
    line: { color: C.ink, width: 1 },
    rectRadius: 0.08
  });

  // Inner panel for depth
  slide.addShape('roundRect', {
    x: PANEL_X + 0.20, y: PANEL_Y + 0.20, w: PANEL_W - 0.40, h: PANEL_H - 0.55,
    fill: { color: C.panelIn },
    line: { color: 'BFDBFE', width: 0.5 },
    rectRadius: 0.06
  });

  // Hex nodes arranged around the B (ring of 6)
  const HEX_CX = PANEL_X + PANEL_W / 2;
  const HEX_CY = PANEL_Y + (PANEL_H - 0.30) / 2;
  const RING_R = 1.05;
  const HEX_SIZE = 0.38;

  // Central large B monogram
  slide.addText('B', {
    x: HEX_CX - 0.50, y: HEX_CY - 0.65, w: 1.00, h: 1.30,
    fontSize: 130, bold: true, fontFace: 'Arial', color: C.navy,
    align: 'center', valign: 'middle'
  });

  // 6 hex nodes around the B
  for (let k = 0; k < 6; k++) {
    const angle = (Math.PI / 3) * k - Math.PI / 2; // start at top
    const hx = HEX_CX + RING_R * Math.cos(angle) - HEX_SIZE / 2;
    const hy = HEX_CY + RING_R * Math.sin(angle) - HEX_SIZE / 2;
    slide.addShape('hexagon', {
      x: hx, y: hy, w: HEX_SIZE, h: HEX_SIZE,
      fill: { color: C.ink },
      line: { color: C.navy, width: 1.25 }
    });
  }

  // Caption under the B -- domain tag
  slide.addText('BLOCKCHAIN  |  AML  |  NTRO', {
    x: PANEL_X, y: PANEL_Y + PANEL_H - 0.30, w: PANEL_W, h: 0.28,
    fontSize: 10, bold: true, fontFace: 'Arial', color: C.navy,
    align: 'center', valign: 'middle',
    charSpacing: 4
  });

  // ============================================================
  // 6. Footer bar
  // ============================================================
  slide.addShape('rect', {
    x: 0.0, y: 6.9514, w: 13.3333, h: 0.5503,
    fill: { color: 'F1F5F9' },
    line: { color: C.border, width: 0.5 }
  });

  // Footer text (centered)
  slide.addText('@SIH Idea submission- Template', {
    x: 5.0833, y: 6.9514, w: 3.5039, h: 0.3993,
    fontSize: 10, fontFace: 'Arial', color: C.muted,
    align: 'center', valign: 'middle'
  });

  // Page number badge (bottom-right)
  slide.addText('1', {
    x: 12.85, y: 6.96, w: 0.42, h: 0.39,
    fontSize: 11, bold: true, fontFace: 'Arial', color: C.muted,
    align: 'right', valign: 'middle'
  });
}

module.exports = { createSlide };
