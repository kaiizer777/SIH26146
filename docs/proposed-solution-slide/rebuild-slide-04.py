"""
Rebuild slide 4 (Feasibility and Viability) of SIH26146_PPT_combined.pptx.

The current state has the card body frames (Shape 9, 16, 22, 29, 35, 41)
drawn LAST in z-order, which covers the title bars (Shape 10, 17, 23, 30,
36, 42) and all text frames. Result: cards appear empty.

Strategy:
  1. Strip ALL card-related shapes (bodies, title bars, title texts,
     bullet texts, and prior Enhance_S4_* decorations).
  2. Rebuild the 6 cards with proper z-order: body -> title bar ->
     title text + emoji icon + badge -> bullets -> gradient overlay.
  3. Apply visible enhancements (title bump, accent rule, background
     dots, edge stripes, footer chip, card shadows).

ASCII-only Python string literals. Em-dash (U+2014) and en-dash
(U+2013) are intentionally left as UTF-8 inside string literals where
required for bullet body content.
"""

import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from lxml import etree  # noqa: E402
from pptx import Presentation  # noqa: E402
from pptx.dml.color import RGBColor  # noqa: E402
from pptx.enum.shapes import MSO_SHAPE  # noqa: E402
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN  # noqa: E402
from pptx.util import Inches, Pt, Emu  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'slides', 'output')
DECK_PATH = os.path.join(OUT_DIR, 'SIH26146_PPT_combined.pptx')

# ---- Namespaces ----
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'

# ---- Color tokens (ASCII-safe hex) ----
INK = '2563EB'
INK_LIGHT = 'BFDBFE'
NAVY = '1F3864'
TEXT_PRIMARY = '0F172A'
SUBTITLE = '64748B'
WHITE = 'FFFFFF'
BG_PANEL = 'F8FAFC'

# Card palette (border/title bar color -> light body fill)
CARDS = [
    {  # 0 Feasibility - blue
        'idx': 0, 'col': 0, 'row': 0,
        'x': 0.200, 'y': 1.100, 'w': 6.400, 'h': 1.850,
        'border': '2563EB', 'fill': 'EFF6FF', 'title': 'Feasibility',
        'icon': '\u2699\ufe0f',  # gear emoji
        'bullets': [
            ('Technical: ', 'FastAPI 0.141.1 + Next.js 16 + Neo4j 5.26 + '
                            'PyTorch \u2014 fully open-source, no proprietary '
                            'hardware.'),
            ('Modular: ', 'backend (FastAPI/Celery), graph DB (Neo4j + '
                          'GDS 2.13), frontend (Next.js) deploy '
                          'independently.'),
            ('Market: ', 'NTRO cyber-surveillance mandate + Interpol + FATF '
                         'travel-rule; growing demand for BTC AML '
                         'analytics.'),
            ('Economic: ', 'commodity-CPU node vs $250K\u2013$500K '
                           'commercial suites \u2014 orders-of-magnitude '
                           'cheaper.'),
        ],
        'bullet_char': '\u25cf',  # filled circle
    },
    {  # 1 Solutions - orange
        'idx': 1, 'col': 1, 'row': 0,
        'x': 6.730, 'y': 1.100, 'w': 6.400, 'h': 1.850,
        'border': 'EA580C', 'fill': 'FFF7ED', 'title': 'Solutions',
        'icon': '\U0001F6E1\ufe0f',  # shield emoji
        'bullets': [
            ('Air-Gap: ', 'CPU-only ONNX-exportable models \u2014 no GPU, '
                          'no internet, no cloud dependency.'),
            ('Algorithm: ', 'Louvain community detection + CIOH heuristics '
                            '+ FT-Transformer \u2014 peer-reviewed graph '
                            'analytics.'),
            ('Training: ', 'class-weighted loss + SMOTE on 18 hand-crafted '
                           'features \u2014 F1 0.6972 anomaly, F1 0.9209 '
                           'risk.'),
        ],
        'bullet_char': '\u25cf',
    },
    {  # 2 Viability - red
        'idx': 2, 'col': 0, 'row': 1,
        'x': 0.200, 'y': 3.050, 'w': 6.400, 'h': 1.850,
        'border': 'DC2626', 'fill': 'FEF2F2',
        'title': 'Viability & Business Potential',
        'icon': '\U0001F4B0',  # money bag emoji
        'bullets': [
            ('Production Champion: ',
             'FT-Transformer F1 0.6972, AUC 0.9956, 0.0222 ms / '
             'inference.'),
            ('Cost Efficiency: ',
             'sub-$1K commodity CPU vs $250K\u2013$500K commercial '
             '\u2014 extends budget 250\u00d7.'),
            ('Compliance: ',
             'court-admissible JSON + PDF dossiers with tamper-evident '
             'SHA-256 chain.'),
            ('Resilience: ',
             '100% air-gapped \u2014 immune to network outages, DDoS, '
             'sovereign-cloud risk.'),
        ],
        'bullet_char': '\u25cf',
    },
    {  # 3 Use Cases - purple
        'idx': 3, 'col': 1, 'row': 1,
        'x': 6.730, 'y': 3.050, 'w': 6.400, 'h': 1.850,
        'border': '7C3AED', 'fill': 'F5F3FF', 'title': 'Use Cases',
        'icon': '\U0001F465',  # busts emoji
        'bullets': [
            ('NTRO Cyber Analysts: ',
             '4-tier severity master alert grid + D3 force-graph drilling '
             'on suspect wallets.'),
            ('Forensic Investigators: ',
             'SHAP waterfall + GNNExplainer subgraphs for traceable, '
             'defensible case files.'),
            ('Field Officers / Liaison: ',
             '1-click JSON / PDF dossier export for courtroom delivery '
             'and chain-of-custody.'),
        ],
        'bullet_char': '\u25cf',
    },
    {  # 4 Challenges - green
        'idx': 4, 'col': 0, 'row': 2,
        'x': 0.200, 'y': 5.000, 'w': 6.400, 'h': 1.850,
        'border': '16A34A', 'fill': 'F0FDF4', 'title': 'Challenges',
        'icon': '\U0001F6A7',  # construction emoji
        'bullets': [
            ('Synthetic Stream Today: ',
             'demo runs on anonymized ledger traces; live NTRO '
             'transaction feed pilot pending.'),
            ('Edge Hardware: ',
             'ONNX scripts ready; ruggedised Pi-class node procurement '
             '+ field hardening in progress.'),
            ('Multi-Tenant Scale: ',
             'multi-NTRO-unit isolation + Celery pool tuning at >100k '
             'tx/sec not yet benchmarked.'),
        ],
        'bullet_char': '\u25cf',
    },
    {  # 5 Supporting Facts - slate
        'idx': 5, 'col': 1, 'row': 2,
        'x': 6.730, 'y': 5.000, 'w': 6.400, 'h': 1.850,
        'border': '475569', 'fill': 'F1F5F9', 'title': 'Supporting Facts',
        'icon': '\u2B50',  # star emoji
        'bullets': [
            ('', '11,938 tx/sec sustained PostgreSQL binary-COPY '
                 'ingest.'),
            ('', '24,673 wallets / 9,794 Louvain clusters / 45,516 '
                 'edges scored.'),
            ('', 'Graph Transformer AUC 0.9956; 0 / 197 missed '
                 'high-risk wallets on Ransomwhere seed set.'),
        ],
        'bullet_char': '\u27a4',  # arrow
    },
]


# ---- OOXML helpers ----


def emu_in(v):
    return int(round(v * 914400))


def set_solid_fill(shape, hex_color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(hex_color)


def remove_line(shape):
    try:
        shape.line.fill.background()
    except Exception:
        pass


def set_line_color(shape, hex_color, width_pt=None):
    shape.line.color.rgb = RGBColor.from_string(hex_color)
    if width_pt is not None:
        shape.line.width = Pt(width_pt)


def remove_all_named(slide, name):
    n = 0
    for shape in list(slide.shapes):
        if shape.name == name:
            shape._element.getparent().remove(shape._element)
            n += 1
    return n


def remove_named_starting_with(slide, prefix):
    n = 0
    for shape in list(slide.shapes):
        if shape.name.startswith(prefix):
            shape._element.getparent().remove(shape._element)
            n += 1
    return n


def set_fill_alpha(shape, opacity_pct):
    """opacity_pct is a percentage (0-100)."""
    sp_pr = shape._element.find('{%s}spPr' % NS_P)
    if sp_pr is None:
        return
    solidFill = sp_pr.find('{%s}solidFill' % NS_A)
    if solidFill is None:
        return
    srgb = solidFill.find('{%s}srgbClr' % NS_A)
    if srgb is None:
        return
    for a in list(srgb):
        if a.tag.endswith('}alpha'):
            srgb.remove(a)
    alpha = etree.SubElement(srgb, '{%s}alpha' % NS_A)
    alpha.set('val', str(int(opacity_pct * 1000)))


def add_outer_shadow(shape, blur_pt, offset_pt, direction,
                     opacity_pct, hex_color):
    if direction == 'down':
        dir_attr = '5400000'
    elif direction == 'downRight':
        dir_attr = '2700000'
    elif direction == 'right':
        dir_attr = '0'
    else:
        dir_attr = '5400000'
    blur_emu = int(round(blur_pt / 72.0 * 914400))
    dist_emu = int(round(offset_pt / 72.0 * 914400))
    alpha_val = int(opacity_pct * 100)
    sp_pr = shape._element.find('{%s}spPr' % NS_P)
    if sp_pr is None:
        return False
    effect_lst = sp_pr.find('{%s}effectLst' % NS_A)
    if effect_lst is None:
        effect_lst = etree.SubElement(sp_pr, '{%s}effectLst' % NS_A)
    for child in list(effect_lst):
        if child.tag == '{%s}outerShdw' % NS_A:
            effect_lst.remove(child)
    new_xml = (
        '<a:outerShdw xmlns:a="%s" '
        'blurRad="%d" dist="%d" dir="%s" algn="ctr" rotWithShape="0">'
        '<a:srgbClr val="%s"><a:alpha val="%d"/></a:srgbClr>'
        '</a:outerShdw>' % (NS_A, blur_emu, dist_emu, dir_attr, hex_color, alpha_val)
    )
    effect_lst.append(etree.fromstring(new_xml))
    return True


def set_run_letter_spacing(text_frame, hundredths_pt):
    for para in text_frame.paragraphs:
        for run in para.runs:
            rPr = run._r.find('{%s}rPr' % NS_A)
            if rPr is None:
                rPr = etree.SubElement(run._r, '{%s}rPr' % NS_A)
                run._r.insert(0, rPr)
            rPr.set('spc', str(int(hundredths_pt)))


def set_run_font_size(text_frame, size_pt):
    for para in text_frame.paragraphs:
        for run in para.runs:
            run.font.size = Pt(size_pt)


def add_shape(slide, kind, left_in, top_in, width_in, height_in, name=None):
    s = slide.shapes.add_shape(
        kind,
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    if name:
        try:
            s.name = name
        except Exception:
            pass
    return s


def add_textbox(slide, left_in, top_in, width_in, height_in, name=None):
    tb = slide.shapes.add_textbox(
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    if name:
        try:
            tb.name = name
        except Exception:
            pass
    return tb


def build_card(slide, card, target_z):
    """Build a single card in proper z-order. Returns (body, title_bar,
    title_text) shape refs for downstream decoration."""
    x = card['x']
    y = card['y']
    w = card['w']
    h = card['h']
    border = card['border']
    fill = card['fill']
    title = card['title']
    icon = card['icon']

    # ---- 1. Card body (rounded rect) ----
    body = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                     x, y, w, h,
                     name='CardBody_%d' % card['idx'])
    set_solid_fill(body, fill)
    set_line_color(body, border, width_pt=2.0)
    # Outer shadow: 8pt blur, 12% opacity, slight down offset
    add_outer_shadow(body, blur_pt=8, offset_pt=2, direction='down',
                     opacity_pct=12, hex_color='0F172A')
    # Move body to correct z-position (it must be BEHIND the title bar)
    body_elem = body._element
    body_elem.getparent().remove(body_elem)
    target_z.addprevious(body_elem)

    # ---- 2. Title bar (rect over top 0.42 in of card) ----
    bar_h = 0.42
    bar = add_shape(slide, MSO_SHAPE.RECTANGLE,
                    x, y, w, bar_h,
                    name='CardTitleBar_%d' % card['idx'])
    set_solid_fill(bar, border)
    remove_line(bar)
    # Move bar to be on top of body
    bar_elem = bar._element
    bar_elem.getparent().remove(bar_elem)
    target_z.addprevious(bar_elem)

    # ---- 3. Title text (emoji + title in white bold) ----
    title_x = x + 0.55  # leave room for emoji icon on left
    title_w = w - 0.55 - 0.50  # leave room for badge on right
    title_tb = add_textbox(slide, title_x, y + 0.02, title_w, 0.38,
                           name='CardTitleText_%d' % card['idx'])
    tf = title_tb.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    # First run: emoji + spaces (regular, not bold)
    r_emoji = p.add_run()
    r_emoji.text = icon + '   '
    r_emoji.font.name = 'Arial'
    r_emoji.font.size = Pt(15)
    r_emoji.font.bold = False
    r_emoji.font.color.rgb = RGBColor.from_string(WHITE)
    # Second run: title text (bold)
    r_title = p.add_run()
    r_title.text = title
    r_title.font.name = 'Arial'
    r_title.font.size = Pt(15)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor.from_string(WHITE)
    set_run_letter_spacing(tf, 20)
    # Move title text to be on top of bar
    title_elem = title_tb._element
    title_elem.getparent().remove(title_elem)
    target_z.addprevious(title_elem)

    # ---- 4. Number badge in top-right of title bar ----
    badge_size = 0.32
    badge_x = x + w - badge_size - 0.12
    badge_y = y + 0.05
    badge_bg = add_shape(slide, MSO_SHAPE.OVAL,
                         badge_x, badge_y, badge_size, badge_size,
                         name='CardBadgeBg_%d' % card['idx'])
    set_solid_fill(badge_bg, WHITE)
    remove_line(badge_bg)
    badge_bg_elem = badge_bg._element
    badge_bg_elem.getparent().remove(badge_bg_elem)
    target_z.addprevious(badge_bg_elem)

    badge_tb = add_textbox(slide, badge_x, badge_y,
                           badge_size, badge_size,
                           name='CardBadgeText_%d' % card['idx'])
    btf = badge_tb.text_frame
    btf.margin_left = Inches(0)
    btf.margin_right = Inches(0)
    btf.margin_top = Inches(0)
    btf.margin_bottom = Inches(0)
    btf.vertical_anchor = MSO_ANCHOR.MIDDLE
    bp = btf.paragraphs[0]
    bp.alignment = PP_ALIGN.CENTER
    br = bp.add_run()
    br.text = '%02d' % (card['idx'] + 1)
    br.font.name = 'Arial'
    br.font.size = Pt(11)
    br.font.bold = True
    br.font.color.rgb = RGBColor.from_string(border)
    badge_tb_elem = badge_tb._element
    badge_tb_elem.getparent().remove(badge_tb_elem)
    target_z.addprevious(badge_tb_elem)

    # ---- 5. Bullet text frames (below title bar) ----
    n_bullets = len(card['bullets'])
    body_top = y + 0.42  # just below title bar (0.42 in)
    body_bot = y + h - 0.04  # near bottom of card
    body_avail = body_bot - body_top  # ~ 1.39 in for 3-4 bullets
    line_h = body_avail / max(n_bullets, 1)
    bullet_x = x + 0.18
    bullet_w = w - 0.36
    # Pick font size based on bullet count to avoid overflow on 4-bullet cards
    bullet_pt = 9.5 if n_bullets == 4 else 10.0

    bullet_char = card['bullet_char']
    for bi, (label, body_text) in enumerate(card['bullets']):
        bt = add_textbox(slide,
                         bullet_x,
                         body_top + bi * line_h,
                         bullet_w,
                         line_h,
                         name='CardBullet_%d_%d' % (card['idx'], bi))
        btf = bt.text_frame
        btf.margin_left = Inches(0)
        btf.margin_right = Inches(0)
        btf.margin_top = Inches(0)
        btf.margin_bottom = Inches(0)
        btf.word_wrap = True
        btf.vertical_anchor = MSO_ANCHOR.TOP
        bp = btf.paragraphs[0]
        bp.alignment = PP_ALIGN.LEFT
        # Set line spacing 115%
        pPr = bp._pPr
        if pPr is None:
            pPr = etree.SubElement(bp._p, '{%s}pPr' % NS_A)
            bp._p.insert(0, pPr)
        lnSpc = etree.SubElement(pPr, '{%s}lnSpc' % NS_A)
        spcPct = etree.SubElement(lnSpc, '{%s}spcPct' % NS_A)
        spcPct.set('val', '115000')
        # Run: bullet char (regular)
        if label or bullet_char:
            r1 = bp.add_run()
            r1.text = bullet_char + ' '
            r1.font.name = 'Arial'
            r1.font.size = Pt(bullet_pt)
            r1.font.bold = False
            r1.font.color.rgb = RGBColor.from_string(border)
        # Run: label (bold)
        if label:
            r2 = bp.add_run()
            r2.text = label
            r2.font.name = 'Arial'
            r2.font.size = Pt(bullet_pt)
            r2.font.bold = True
            r2.font.color.rgb = RGBColor.from_string(TEXT_PRIMARY)
        # Run: body text (regular)
        r3 = bp.add_run()
        r3.text = body_text
        r3.font.name = 'Arial'
        r3.font.size = Pt(bullet_pt)
        r3.font.bold = False
        r3.font.color.rgb = RGBColor.from_string(TEXT_PRIMARY)
        bt_elem = bt._element
        bt_elem.getparent().remove(bt_elem)
        target_z.addprevious(bt_elem)


def enhance_chrome(slide):
    """Bump title font size + add accent rule + tagline area cleanup."""
    # The slide already has Text 8 = "Feasibility and Viability".
    # Bump its font size to 30pt.
    title_shape = None
    for shape in slide.shapes:
        if shape.name == 'Text 8':
            title_shape = shape
            break
    if title_shape is not None:
        set_run_font_size(title_shape.text_frame, 30)
        set_run_letter_spacing(title_shape.text_frame, 60)

    # Add thin ink-blue accent rule under title.
    # Title position: x=3.364, y=0.286, w=6.472, h=0.773 -> bottom ~1.06
    # Place rule at y=1.04 with width 2.5 in.
    rule = add_shape(slide, MSO_SHAPE.RECTANGLE,
                     3.364, 1.04, 2.50, 0.020,
                     name='CardTitleAccentRule')
    set_solid_fill(rule, INK)
    remove_line(rule)


def enhance_background(slide, target_z):
    """Add 12 ink-blue dots scattered + edge stripes."""
    dot_positions = [
        (0.10, 1.10, 0.06, 10),
        (13.18, 1.10, 0.06, 10),
        (0.10, 1.95, 0.05, 8),
        (13.18, 1.95, 0.05, 8),
        (0.10, 2.90, 0.06, 10),
        (13.18, 2.90, 0.06, 10),
        (0.10, 3.95, 0.05, 8),
        (13.18, 3.95, 0.05, 8),
        (0.10, 4.90, 0.06, 10),
        (13.18, 4.90, 0.06, 10),
        (0.10, 6.10, 0.05, 8),
        (13.18, 6.10, 0.05, 8),
    ]
    for i, (dx, dy, sz, op) in enumerate(dot_positions):
        d = add_shape(slide, MSO_SHAPE.OVAL, dx, dy, sz, sz,
                      name='CardBgDot_%d' % (i + 1))
        set_solid_fill(d, INK)
        remove_line(d)
        set_fill_alpha(d, op)
        # Move behind everything else (just before target_z)
        d_elem = d._element
        d_elem.getparent().remove(d_elem)
        target_z.addprevious(d_elem)

    # Left edge stripe
    ls = add_shape(slide, MSO_SHAPE.RECTANGLE, 0.0, 0.0, 0.07, 7.5,
                   name='CardLeftEdgeStripe')
    set_solid_fill(ls, INK)
    remove_line(ls)
    set_fill_alpha(ls, 22)
    ls_elem = ls._element
    ls_elem.getparent().remove(ls_elem)
    target_z.addprevious(ls_elem)

    # Right edge stripe
    rs = add_shape(slide, MSO_SHAPE.RECTANGLE, 13.263, 0.0, 0.07, 7.5,
                   name='CardRightEdgeStripe')
    set_solid_fill(rs, INK)
    remove_line(rs)
    set_fill_alpha(rs, 22)
    rs_elem = rs._element
    rs_elem.getparent().remove(rs_elem)
    target_z.addprevious(rs_elem)


def enhance_footer(slide):
    """Add ink-blue diamond + footer label on left edge of footer bar."""
    # Footer bar (Shape 0) at (0.000, 6.951, 13.333x0.550).
    # Diamond + label go on the LEFT.
    diamond = add_shape(slide, MSO_SHAPE.DIAMOND,
                        0.30, 7.126, 0.20, 0.20,
                        name='CardFooterDiamond')
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    label = add_textbox(slide, 0.60, 6.951, 4.20, 0.55,
                        name='CardFooterLabel')
    tf = label.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = 'Feasibility & Viability   SIH26146'
    r.font.name = 'Arial'
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(INK)
    set_run_letter_spacing(tf, 100)


def main():
    print('Opening:', DECK_PATH)
    prs = Presentation(DECK_PATH)
    slide = prs.slides[3]
    print('Slide 4 shapes before cleanup:', len(slide.shapes))

    # ---- 1. Strip ALL card-related shapes and prior enhancements ----
    # Original card frame names: Shape 9, 16, 22, 29, 35, 41 (card bodies).
    # Original card title bars: Shape 10, 17, 23, 30, 36, 42.
    # Original title texts: Text 11, 18, 24, 31, 37, 43.
    # Original bullet texts: Text 12-15, 19-21, 25-28, 32-34, 38-40, 44-46.
    # Plus all prior Enhance_S4_* decorations.
    stale_card_names = (
        ['Shape 9', 'Shape 16', 'Shape 22', 'Shape 29', 'Shape 35', 'Shape 41',
         'Shape 10', 'Shape 17', 'Shape 23', 'Shape 30', 'Shape 36', 'Shape 42']
        + ['Text 11', 'Text 18', 'Text 24', 'Text 31', 'Text 37', 'Text 43']
        + ['Text 12', 'Text 13', 'Text 14', 'Text 15',
           'Text 19', 'Text 20', 'Text 21',
           'Text 25', 'Text 26', 'Text 27', 'Text 28',
           'Text 32', 'Text 33', 'Text 34',
           'Text 38', 'Text 39', 'Text 40',
           'Text 44', 'Text 45', 'Text 46']
        + ['Enhance_S4_TaglineText', 'Enhance_S4_TitleAccentRule']
    )
    removed = 0
    for nm in stale_card_names:
        removed += remove_all_named(slide, nm)
    # Also strip any prior Enhance_S4_* shapes (icons/badges/grads/dots/stripes)
    removed += remove_named_starting_with(slide, 'Enhance_S4_')
    # Strip any new-shape leftovers from prior runs that may not be prefixed
    removed += remove_named_starting_with(slide, 'CardTitleAccentRule_')
    # Strip our own card names from any prior attempt
    removed += remove_named_starting_with(slide, 'CardBody_')
    removed += remove_named_starting_with(slide, 'CardTitleBar_')
    removed += remove_named_starting_with(slide, 'CardTitleText_')
    removed += remove_named_starting_with(slide, 'CardBadgeBg_')
    removed += remove_named_starting_with(slide, 'CardBadgeText_')
    removed += remove_named_starting_with(slide, 'CardBullet_')
    removed += remove_named_starting_with(slide, 'CardBgDot_')
    removed += remove_named_starting_with(slide, 'CardLeftEdgeStripe')
    removed += remove_named_starting_with(slide, 'CardRightEdgeStripe')
    removed += remove_named_starting_with(slide, 'CardFooterDiamond')
    removed += remove_named_starting_with(slide, 'CardFooterLabel')
    print('Removed %d stale shapes' % removed)
    print('Slide 4 shapes after cleanup:', len(slide.shapes))

    # ---- 2. Find a z-position target ----
    # We want new card shapes to be inserted BEFORE the footer (Shape 0 at
    # index 0) but AFTER the chrome (subtitle, sih logo, etc.). Actually
    # we want them to render ABOVE the background but BELOW the footer.
    # Simplest: append them just before the page-number shape (Text 2).
    target_z = None
    for shape in slide.shapes:
        if shape.name == 'Text 2':
            target_z = shape._element
            break
    if target_z is None:
        # Fallback: append at end of slide
        target_z = slide.shapes._spTree[-1]

    # ---- 3. Build the 6 cards ----
    for card in CARDS:
        build_card(slide, card, target_z)
    print('Built 6 cards.')

    # ---- 4. Apply chrome enhancements (title bump + accent rule) ----
    enhance_chrome(slide)
    print('Chrome enhanced.')

    # ---- 5. Apply background enhancements (dots + stripes) ----
    enhance_background(slide, target_z)
    print('Background enhanced.')

    # ---- 6. Apply footer enhancements ----
    enhance_footer(slide)
    print('Footer enhanced.')

    print('Slide 4 shapes after:', len(slide.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()
