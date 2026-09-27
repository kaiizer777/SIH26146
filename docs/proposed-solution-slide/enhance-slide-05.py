"""
Apply VISUALLY NOTICEABLE design enhancements to slide 5 (Research and
References) of SIH26146_PPT_combined.pptx.

Strategy: in-place modification of existing shapes + append new decorative
shapes in correct z-order via lxml `addprevious` / `addnext`. All new shapes
are tagged with recognizable names (Enhance_S5_*) so re-runs replace, not
stack. Original chrome, table cells, title bars and bullet content are kept.

Slide 5 layout (from inspect-s5.py):
  - Chrome: footer bar (idx 0), footer text (1), page num (2), diamond (3),
    title (4), SIH logo (5), vertical bar (6), B monogram (7), SIH26146
    wordmark (8), italic subtitle (9).
  - 3 reference sections, each with: header textbox (uppercase), hairline
    connector, then pairs of (filled bullet oval + label textbox). Items:
      * Industry Platforms (4 items, y=1.67 to 2.66)
      * Research & Best Practices (4 items, y=3.37 to 4.92)
      * Feasibility Facts (1 item, y=5.87)
  - Right column comparison table at (7.20, 1.25), 5.85 x 5.281 in.
    6 rows x 3 cols.

Enhancements applied:

  E1 Title row refinement
     - Title size 24pt -> 30pt + letter-spacing 80.
     - B monogram 30pt -> 34pt.
     - 3.0 in x 1.5pt ink-blue accent rule under the title.
     - Italic slate-500 tagline below the title: 'Verified industry
       platforms - peer-reviewed papers - FATF-aligned standards'.

  E2 Section header pills
     - Navy rounded-rect pill with white bold text replaces the existing
       plain navy text + hairline design.
     - Existing uppercase textbox and hairline connector removed
       (idempotently).

  E3 Reference cards
     - Each section's items are wrapped in a subtle white card (0.5pt
       slate-200 border, soft outer shadow, slightly inset). Pill sits
       ABOVE the card. Card spans the bullet column + items.

  E4 Comparison table polish
     - Table outer border bumped 1pt -> 2pt.
     - Subtle drop shadow on the table area.
     - Header row gets a 2-band gradient overlay (lighter top 60%,
       darker bottom 40%) with low-alpha fills.
     - Yes/No/Limited cells get small colored icons (green OVAL, red
       X = two crossed rotated rectangles, amber OVAL).

  E5 Background decoration
     - 14 faint ink-blue dots scattered across the slide.
     - Subtle vertical accent stripes at slide edges.

  E6 Footer chip
     - Ink-blue diamond + label 'Research & References - SIH26146' on
       the left of the footer bar (matches slides 1-4).

Constraints honored:
  - Canvas 13.333 x 7.5 in.
  - ASCII-only Python string literals.
  - Slides 1-4 untouched.
  - All textual content (URLs, names, descriptions) preserved.
  - Idempotent re-runs converge to the same final state.

Run:
    python enhance-slide-05.py
"""

import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from lxml import etree  # noqa: E402
from pptx import Presentation  # noqa: E402
from pptx.dml.color import RGBColor  # noqa: E402
from pptx.enum.shapes import MSO_SHAPE, MSO_SHAPE_TYPE  # noqa: E402
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN  # noqa: E402
from pptx.util import Emu, Inches, Pt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'slides', 'output')
DECK_PATH = os.path.join(OUT_DIR, 'SIH26146_PPT_combined.pptx')

# ---- Namespaces ----
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

# ---- Color tokens (ASCII-safe hex) ----
INK = '2563EB'          # ink-blue accent
INK_LIGHT = 'BFDBFE'
NAVY = '1F3864'         # section pills + table header navy
NAVY_LIGHT = '2D4F7F'   # gradient-feel top band of header (lighter)
NAVY_DARK = '14264E'    # gradient-feel bottom band of header (darker)
TEXT_PRIMARY = '0F172A'
SUBTITLE = '475569'     # slate-500 dim text
PANEL_BG = 'F8FAFC'
WHITE = 'FFFFFF'
BORDER = 'E2E8F0'       # slate-200 border for table + cards

GREEN = '16A34A'
RED = 'DC2626'
AMBER = 'D97706'


# ---- OOXML helpers ----


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


def remove_all_named_prefix(slide, prefix):
    n = 0
    for shape in list(slide.shapes):
        if shape.name.startswith(prefix):
            shape._element.getparent().remove(shape._element)
            n += 1
    return n


def add_shape_before(slide, target_shape, shape_kind,
                     left_in, top_in, width_in, height_in, name=None):
    new_shape = slide.shapes.add_shape(
        shape_kind,
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    new_elem = new_shape._element
    target_elem = target_shape._element
    target_elem.addprevious(new_elem)
    if name:
        try:
            new_shape.name = name
        except Exception:
            pass
    return new_shape


def add_shape_after(slide, target_shape, shape_kind,
                    left_in, top_in, width_in, height_in, name=None):
    new_shape = slide.shapes.add_shape(
        shape_kind,
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    new_elem = new_shape._element
    target_elem = target_shape._element
    target_elem.addnext(new_elem)
    if name:
        try:
            new_shape.name = name
        except Exception:
            pass
    return new_shape


def add_textbox_after(slide, target_shape,
                      left_in, top_in, width_in, height_in, name=None):
    tb = slide.shapes.add_textbox(
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    target_shape._element.addnext(tb._element)
    if name:
        try:
            tb.name = name
        except Exception:
            pass
    return tb


def add_textbox_before(slide, target_shape,
                       left_in, top_in, width_in, height_in, name=None):
    tb = slide.shapes.add_textbox(
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    target_shape._element.addprevious(tb._element)
    if name:
        try:
            tb.name = name
        except Exception:
            pass
    return tb


def set_run_font_size(text_frame, size_pt):
    for para in text_frame.paragraphs:
        for run in para.runs:
            run.font.size = Pt(size_pt)


def set_run_letter_spacing(text_frame, hundredths_pt):
    for para in text_frame.paragraphs:
        for run in para.runs:
            rPr = run._r.find('{%s}rPr' % NS_A)
            if rPr is None:
                rPr = etree.SubElement(run._r, '{%s}rPr' % NS_A)
                run._r.insert(0, rPr)
            rPr.set('spc', str(int(hundredths_pt)))


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


# ---------------------------------------------------------------------------
# Capture stable shape references BEFORE any new shapes are added.
# ---------------------------------------------------------------------------


def capture_shape_refs(slide):
    """Find shapes by content + position, NOT by index (indexes shift after
    cleanup of original section headers / hairlines)."""
    refs = {}

    def emu_in(v):
        return v / 914400.0 if v is not None else None

    shapes = list(slide.shapes)

    # ---- Chrome (by position + content) ----
    # Title: text "Research and References".
    for sh in shapes:
        if sh.has_text_frame and 'Research and References' in sh.text_frame.text:
            refs['title'] = sh
            break
    # B monogram: small textbox at (0.420, 0.120) containing the Bitcoin symbol.
    for sh in shapes:
        try:
            if (sh.has_text_frame and sh.top is not None
                    and abs(emu_in(sh.top) - 0.12) < 0.05
                    and abs(emu_in(sh.left) - 0.42) < 0.05):
                refs['b_mono'] = sh
                break
        except Exception:
            pass
    # Vertical bar: AUTO_SHAPE at (0.300, 0.200) with width ~0.06.
    for sh in shapes:
        try:
            if (sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE
                    and abs(emu_in(sh.left) - 0.30) < 0.05
                    and abs(emu_in(sh.top) - 0.20) < 0.05
                    and abs(emu_in(sh.width) - 0.06) < 0.05):
                refs['vertical_bar'] = sh
                break
        except Exception:
            pass
    # Footer bar (full-width slim AUTO_SHAPE at y ~ 6.95).
    for sh in shapes:
        try:
            if (sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE
                    and emu_in(sh.width or 0) > 12.0
                    and 6.9 < emu_in(sh.top or 0) < 7.0):
                refs['footer_bar'] = sh
                break
        except Exception:
            pass
    # Footer text (centered text on footer bar).
    for sh in shapes:
        try:
            if (sh.has_text_frame and 'submission' in sh.text_frame.text.lower()
                    and 6.9 < emu_in(sh.top or 0) < 7.0):
                refs['footer_text'] = sh
                break
        except Exception:
            pass
    # Page number (right-edge text "5").
    for sh in shapes:
        try:
            if (sh.has_text_frame and sh.text_frame.text.strip() == '5'
                    and emu_in(sh.left or 0) > 12.0):
                refs['page_num'] = sh
                break
        except Exception:
            pass

    # ---- Reference items: detect by content + x-position ----
    # Bullets are 0.10x0.10 OVALs at x=0.40 in the left column.
    # Texts at x=0.62 in the left column. Group sections by Y bands:
    #   Industry Platforms: y ~ 1.7 - 2.7
    #   Research & BP:      y ~ 3.3 - 5.0
    #   Feasibility Facts:  y ~ 5.8 - 6.4
    bullets = []
    texts_left = []
    for sh in shapes:
        try:
            L = emu_in(sh.left)
            T = emu_in(sh.top)
            W = emu_in(sh.width)
            H = emu_in(sh.height)
            if (sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE
                    and 0.40 - 0.01 < L < 0.40 + 0.01
                    and abs(W - 0.10) < 0.02
                    and abs(H - 0.10) < 0.02
                    and T is not None and 1.0 < T < 6.6):
                bullets.append(sh)
            elif (sh.has_text_frame
                  and 0.62 - 0.02 < L < 0.62 + 0.02
                  and T is not None and 1.5 < T < 6.5
                  and sh not in refs.values()):
                texts_left.append(sh)
        except Exception:
            pass

    # Pair bullets and texts by Y proximity.
    pairs = []
    for b in bullets:
        bT = emu_in(b.top)
        # Find nearest text with similar top.
        best = None
        best_dist = 999
        for t in texts_left:
            tT = emu_in(t.top)
            d = abs(tT - (bT - 0.08))  # bullet sits 0.08 below text top
            if d < best_dist:
                best = t
                best_dist = d
        if best is not None:
            pairs.append((b, best))
            texts_left.remove(best)

    pairs.sort(key=lambda p: emu_in(p[1].top) or 0)

    def pairs_in_band(pairs, y_lo, y_hi):
        out = []
        for p in pairs:
            tT = emu_in(p[1].top) or 0
            if y_lo <= tT <= y_hi:
                out.append(p)
        return out

    ip_pairs = pairs_in_band(pairs, 1.5, 3.0)
    rb_pairs = pairs_in_band(pairs, 3.0, 5.5)
    ff_pairs = pairs_in_band(pairs, 5.5, 6.6)

    refs['ip_bullets'] = [p[0] for p in ip_pairs]
    refs['ip_texts'] = [p[1] for p in ip_pairs]
    refs['rb_bullets'] = [p[0] for p in rb_pairs]
    refs['rb_texts'] = [p[1] for p in rb_pairs]
    refs['ff_bullets'] = [p[0] for p in ff_pairs]
    refs['ff_texts'] = [p[1] for p in ff_pairs]

    # ---- Table ----
    for sh in shapes:
        if sh.shape_type == MSO_SHAPE_TYPE.TABLE:
            refs['table'] = sh
            break

    return refs


# ---------------------------------------------------------------------------
# Cleanup helpers
# ---------------------------------------------------------------------------


def remove_stale_s5(slide):
    """Idempotently remove all shapes tagged Enhance_S5_*."""
    return remove_all_named_prefix(slide, 'Enhance_S5_')


def remove_original_section_headers_and_hairlines(slide):
    """Idempotently remove the original section header textboxes
    (uppercase INDUSTRY PLATFORMS / RESEARCH AND BEST PRACTICES /
    FEASIBILITY FACTS) and the hairline connectors.
    """
    HEADER_TEXTS = {'INDUSTRY PLATFORMS', 'RESEARCH AND BEST PRACTICES',
                    'FEASIBILITY FACTS'}
    removed = 0
    # Section header textboxes.
    for shape in list(slide.shapes):
        try:
            if shape.has_text_frame:
                t = shape.text_frame.text.strip().upper()
                if t in HEADER_TEXTS:
                    shape._element.getparent().remove(shape._element)
                    removed += 1
        except Exception:
            pass
    # Horizontal hairline connectors in the left column area.
    for shape in list(slide.shapes):
        try:
            if shape.shape_type == MSO_SHAPE_TYPE.LINE:
                L = Emu(shape.left).inches
                T = Emu(shape.top).inches
                W = Emu(shape.width).inches
                H = Emu(shape.height).inches
                if (L < 1.0 and W > 5.0 and H < 0.05
                        and T > 1.0 and T < 6.5):
                    shape._element.getparent().remove(shape._element)
                    removed += 1
        except Exception:
            pass
    return removed


# ---------------------------------------------------------------------------
# Enhancement 1: Title row refinement (chrome)
# ---------------------------------------------------------------------------


def enhance_chrome(slide, refs):
    # 1a) Title 24pt -> 30pt + letter-spacing.
    set_run_font_size(refs['title'].text_frame, 30)
    set_run_letter_spacing(refs['title'].text_frame, 80)

    # 1b) B monogram 30pt -> 34pt.
    set_run_font_size(refs['b_mono'].text_frame, 34)

    # 1c) Accent rule under the title (3.0 in x 1.5pt at y=1.04).
    remove_all_named(slide, 'Enhance_S5_TitleAccentRule')
    rule = add_shape_after(
        slide, refs['title'],
        MSO_SHAPE.RECTANGLE,
        3.43, 1.04, 3.00, 0.028,
        name='Enhance_S5_TitleAccentRule',
    )
    set_solid_fill(rule, INK)
    remove_line(rule)

    # 1d) Italic slate-500 tagline below the title, ABOVE the pill area so it
# never overlaps with the section pills.
    remove_all_named(slide, 'Enhance_S5_TaglineText')
    tagline = add_textbox_after(
        slide, refs['title'],
        3.43, 1.07, 9.50, 0.14,
        name='Enhance_S5_TaglineText',
    )
    tf = tagline.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    # Disable autofit so box keeps explicit dims.
    try:
        tbPr = tf._txBody.find('{%s}bodyPr' % NS_A)
        if tbPr is not None:
            for child in list(tbPr):
                if child.tag.endswith('}spAutoFit') or child.tag.endswith('}normAutofit'):
                    tbPr.remove(child)
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = ('Verified industry platforms  -  peer-reviewed papers'
              '  -  FATF-aligned standards')
    r.font.name = 'Arial'
    r.font.size = Pt(9)
    r.font.italic = True
    r.font.color.rgb = RGBColor.from_string(SUBTITLE)
    set_run_letter_spacing(tf, 50)


# ---------------------------------------------------------------------------
# Enhancement 2: Section header pills
# ---------------------------------------------------------------------------


# Pill layout: (section_key, header_text, x_in, y_in, w_in)
SECTION_PILL_LAYOUT = [
    {
        'key': 'ip',  # Industry Platforms
        'label': 'Industry Platforms',
        'x': 0.40, 'y': 1.22, 'w': 6.50, 'h': 0.34,
        # Card content area for this section (after pill).
        'card_x': 0.32, 'card_y_top': 1.62, 'card_w': 6.66,
        # 'card_y_bottom' is computed from text bottom in enhance_cards().
    },
    {
        'key': 'rb',  # Research & Best Practices
        'label': 'Research & Best Practices',
        'x': 0.40, 'y': 2.92, 'w': 6.50, 'h': 0.34,
        'card_x': 0.32, 'card_y_top': 3.32, 'card_w': 6.66,
    },
    {
        'key': 'ff',  # Feasibility Facts
        'label': 'Feasibility Facts',
        'x': 0.40, 'y': 5.42, 'w': 6.50, 'h': 0.34,
        'card_x': 0.32, 'card_y_top': 5.82, 'card_w': 6.66,
    },
]


def add_section_pill(slide, layout, ref_bullet):
    """Add a rounded-rect pill background + white bold text. Placed BEFORE
    the first bullet of the section so that the pill sits underneath the
    bullet + text in z-order, but ABOVE any card background."""
    key = layout['key']
    x, y, w, h = layout['x'], layout['y'], layout['w'], layout['h']

    # Pill background (rounded rect, navy fill).
    pill_name = 'Enhance_S5_PillBg_%s' % key
    pill = add_shape_before(
        slide, ref_bullet,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x, y, w, h,
        name=pill_name,
    )
    # Tune corner radius (default adj is 0.1667; tighter pill = 0.40).
    try:
        sp_pr = pill._element.find('{%s}spPr' % NS_P)
        if sp_pr is not None:
            prstGeom = sp_pr.find('{%s}prstGeom' % NS_A)
            if prstGeom is not None:
                avLst = prstGeom.find('{%s}avLst' % NS_A)
                if avLst is None:
                    avLst = etree.SubElement(prstGeom, '{%s}avLst' % NS_A)
                # Clear any existing gd and set corner radius in % of size.
                for gd in list(avLst):
                    avLst.remove(gd)
                g1 = etree.SubElement(avLst, '{%s}gd' % NS_A)
                g1.set('name', 'adj')
                g1.set('fmla', 'val 40000')
    except Exception:
        pass
    set_solid_fill(pill, NAVY)
    remove_line(pill)

    # Add a faint white shine band on the top half for premium feel.
    shine_name = 'Enhance_S5_PillShine_%s' % key
    shine = add_shape_after(
        slide, pill,
        MSO_SHAPE.RECTANGLE,
        x + 0.01, y + 0.01, w - 0.02, h / 2 - 0.01,
        name=shine_name,
    )
    set_solid_fill(shine, WHITE)
    remove_line(shine)
    set_fill_alpha(shine, 8)

    # Pill text (white bold, 13pt, left-aligned with 0.18in left padding).
    txt_name = 'Enhance_S5_PillText_%s' % key
    tb = add_textbox_after(
        slide, pill,
        x + 0.15, y, w - 0.30, h,
        name=txt_name,
    )
    tf = tb.text_frame
    tf.word_wrap = False
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    # Disable auto-fit so the box keeps our explicit 0.34in height.
    try:
        tbPr = tf._txBody.find('{%s}bodyPr' % NS_A)
        if tbPr is not None:
            for child in list(tbPr):
                if child.tag.endswith('}spAutoFit') or child.tag.endswith('}normAutofit'):
                    tbPr.remove(child)
            # Set fixed size + no wrap.
            tbPr.set('wrap', 'none')
    except Exception:
        pass
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = layout['label']
    r.font.name = 'Arial'
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(WHITE)
    set_run_letter_spacing(tf, 150)


def enhance_pills(slide, refs):
    # Pair pill layout with the first bullet shape of each section so we
    # can place the pill behind it via add_shape_before.
    pill_for_first_bullet = [
        (SECTION_PILL_LAYOUT[0], refs['ip_bullets'][0]),
        (SECTION_PILL_LAYOUT[1], refs['rb_bullets'][0]),
        (SECTION_PILL_LAYOUT[2], refs['ff_bullets'][0]),
    ]
    for layout, ref in pill_for_first_bullet:
        add_section_pill(slide, layout, ref)


# ---------------------------------------------------------------------------
# Enhancement 3: Reference cards
# ---------------------------------------------------------------------------


def add_section_card(slide, layout, bullets, texts, last_text_shape):
    """Add a subtle white card wrapping the (bullet, text) pairs for a
    section. The card sits BEHIND the bullets/texts in z-order."""
    key = layout['key']
    x = layout['card_x']
    card_y_top = layout['card_y_top']
    w = layout['card_w']
    # Compute card bottom from the last text shape's bottom edge.
    try:
        text_bottom_in = Emu(last_text_shape.top + last_text_shape.height).inches
    except Exception:
        text_bottom_in = 6.20
    card_y_bottom = text_bottom_in + 0.10
    h = card_y_bottom - card_y_top

    # Place the card behind the FIRST bullet so it sits at the bottom of
    # the z-stack for that section (under pills too).
    first_bullet = bullets[0]
    card_name = 'Enhance_S5_Card_%s' % key
    card = add_shape_before(
        slide, first_bullet,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x, card_y_top, w, h,
        name=card_name,
    )
    # Subtle corner radius (12% of height).
    try:
        sp_pr = card._element.find('{%s}spPr' % NS_P)
        if sp_pr is not None:
            prstGeom = sp_pr.find('{%s}prstGeom' % NS_A)
            if prstGeom is not None:
                avLst = prstGeom.find('{%s}avLst' % NS_A)
                if avLst is None:
                    avLst = etree.SubElement(prstGeom, '{%s}avLst' % NS_A)
                for gd in list(avLst):
                    avLst.remove(gd)
                g1 = etree.SubElement(avLst, '{%s}gd' % NS_A)
                g1.set('name', 'adj')
                g1.set('fmla', 'val 8000')
    except Exception:
        pass
    set_solid_fill(card, WHITE)
    set_line_color(card, BORDER, width_pt=0.5)
    # Soft outer shadow.
    add_outer_shadow(card, blur_pt=8, offset_pt=2, direction='down',
                     opacity_pct=10, hex_color='0F172A')

    # Add a thin left ink-blue accent stripe on the card.
    accent_name = 'Enhance_S5_CardAccent_%s' % key
    accent = add_shape_after(
        slide, card,
        MSO_SHAPE.RECTANGLE,
        x, card_y_top, 0.05, h,
        name=accent_name,
    )
    set_solid_fill(accent, INK)
    remove_line(accent)


def enhance_cards(slide, refs):
    add_section_card(slide, SECTION_PILL_LAYOUT[0],
                     refs['ip_bullets'], refs['ip_texts'],
                     refs['ip_texts'][-1])
    add_section_card(slide, SECTION_PILL_LAYOUT[1],
                     refs['rb_bullets'], refs['rb_texts'],
                     refs['rb_texts'][-1])
    add_section_card(slide, SECTION_PILL_LAYOUT[2],
                     refs['ff_bullets'], refs['ff_texts'],
                     refs['ff_texts'][-1])


# ---------------------------------------------------------------------------
# Enhancement 4: Comparison table polish
# ---------------------------------------------------------------------------


def get_table_offsets(table_shape):
    """Compute cell bounding boxes via row heights and column widths."""
    L = Emu(table_shape.left).inches
    T = Emu(table_shape.top).inches
    cells = {}
    # Compute cumulative row offsets.
    row_top = T
    for ri, row in enumerate(table_shape.table.rows):
        rh = Emu(row.height).inches
        col_left = L
        for ci, col in enumerate(table_shape.table.columns):
            cw = Emu(col.width).inches
            cells[(ri, ci)] = (col_left, row_top, cw, rh)
            col_left += cw
        row_top += rh
    return cells


def _apply_table_borders_thick(table):
    """Apply 2pt border via raw XML rewrite (existing helper uses 1pt)."""
    BORDER_XML_TEMPLATE = (
        '<a:tblBorders xmlns:a="%s">' % NS_A +
        '<a:left w="12700" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:left>' % BORDER +
        '<a:right w="12700" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:right>' % BORDER +
        '<a:top w="12700" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:top>' % BORDER +
        '<a:bottom w="12700" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:bottom>' % BORDER +
        '<a:insideH w="6350" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:insideH>' % BORDER +
        '<a:insideV w="6350" cap="flat" cmpd="sng" algn="ctr">'
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>'
        '<a:prstDash val="solid"/></a:insideV>' % BORDER +
        '</a:tblBorders>'
    )
    tbl_xml = table._tbl
    for tblBorders in tbl_xml.findall('{%s}tblBorders' % NS_A):
        tbl_xml.remove(tblBorders)
    new_borders = etree.fromstring(BORDER_XML_TEMPLATE)
    tbl_xml.append(new_borders)


def enhance_table(slide, refs):
    table_shape = refs['table']
    table = table_shape.table
    target = table_shape

    # 4a) Thick borders (1pt -> 2pt).
    _apply_table_borders_thick(table)

    # 4b) Drop shadow behind the table (a slightly offset rectangle).
    remove_all_named(slide, 'Enhance_S5_TableShadow')
    shadow = add_shape_before(
        slide, target,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        7.22, 1.28, 5.85, 5.30,
        name='Enhance_S5_TableShadow',
    )
    set_solid_fill(shadow, '0F172A')
    remove_line(shadow)
    set_fill_alpha(shadow, 8)

    # 4c) Header gradient bands (overlay on the header row, low alpha).
    cells = get_table_offsets(table_shape)
    head_x, head_y, head_w, head_h = cells[(0, 0)]
    cell_w = cells[(0, 1)][2]
    cell_w2 = cells[(0, 2)][2]
    full_w = cells[(0, 0)][2] + cell_w + cell_w2

    # Top band (lighter navy, 60% of header height).
    top_h = head_h * 0.60
    remove_all_named(slide, 'Enhance_S5_HeadGradTop')
    gtop = add_shape_after(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        head_x, head_y, full_w, top_h,
        name='Enhance_S5_HeadGradTop',
    )
    set_solid_fill(gtop, NAVY_LIGHT)
    remove_line(gtop)
    set_fill_alpha(gtop, 35)

    # Bottom band (darker navy, 40% of header height).
    bot_h = head_h * 0.40
    remove_all_named(slide, 'Enhance_S5_HeadGradBot')
    gbot = add_shape_after(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        head_x, head_y + top_h, full_w, bot_h,
        name='Enhance_S5_HeadGradBot',
    )
    set_solid_fill(gbot, NAVY_DARK)
    remove_line(gbot)
    set_fill_alpha(gbot, 40)

    # 4d) Cell icons in SIH26146 (col 1, all Yes green) and Existing
    # Systems (col 2, No red or Limited amber).
    # Row status map for col 2: row 1 No, row 2 No, row 3 Limited,
    # row 4 No, row 5 No.
    col2_status = ['No', 'No', 'Limited', 'No', 'No']

    for ri in range(1, 6):
        # SIH26146 column (col 1) - green dot at left side of cell.
        cx, cy, cw, ch = cells[(ri, 1)]
        icon_size = 0.20
        ix = cx + 0.18
        iy = cy + ch / 2 - icon_size / 2
        icon_name = 'Enhance_S5_IconYes_%d' % ri
        remove_all_named(slide, icon_name)
        icon = add_shape_after(
            slide, target,
            MSO_SHAPE.OVAL,
            ix, iy, icon_size, icon_size,
            name=icon_name,
        )
        set_solid_fill(icon, GREEN)
        remove_line(icon)

        # Existing Systems column (col 2) - red diamond or amber dot.
        cx2, cy2, cw2, ch2 = cells[(ri, 2)]
        ix2 = cx2 + 0.20
        iy2 = cy2 + ch2 / 2 - icon_size / 2
        status = col2_status[ri - 1]

        if status == 'No':
            # Red diamond (rotated square) - simple X-like shape.
            icon_name = 'Enhance_S5_IconNo_%d' % ri
            remove_all_named(slide, icon_name)
            icon = add_shape_after(
                slide, target,
                MSO_SHAPE.DIAMOND,
                ix2, iy2, icon_size, icon_size,
                name=icon_name,
            )
            set_solid_fill(icon, RED)
            remove_line(icon)
        else:  # Limited
            # Amber dot.
            icon_name = 'Enhance_S5_IconLimited_%d' % ri
            remove_all_named(slide, icon_name)
            icon = add_shape_after(
                slide, target,
                MSO_SHAPE.OVAL,
                ix2, iy2, icon_size, icon_size,
                name=icon_name,
            )
            set_solid_fill(icon, AMBER)
            remove_line(icon)


# ---------------------------------------------------------------------------
# Enhancement 5: Background dot pattern + edge stripes
# ---------------------------------------------------------------------------


def enhance_background(slide, refs):
    target = refs['vertical_bar']
    dot_positions = [
        (0.10, 1.25, 0.07, 14),
        (13.16, 1.25, 0.07, 14),
        (0.10, 2.20, 0.06, 12),
        (13.16, 2.20, 0.06, 12),
        (0.10, 3.20, 0.07, 14),
        (13.16, 3.20, 0.07, 14),
        (0.10, 4.20, 0.06, 12),
        (13.16, 4.20, 0.06, 12),
        (0.10, 5.20, 0.07, 14),
        (13.16, 5.20, 0.07, 14),
        (0.10, 6.25, 0.06, 12),
        (13.16, 6.25, 0.06, 12),
        (6.65, 1.05, 0.06, 12),
        (6.65, 7.10, 0.06, 12),
        (6.65, 3.95, 0.06, 12),
    ]
    for i, (x, y, sz, op) in enumerate(dot_positions):
        name = 'Enhance_S5_BgDot_%d' % (i + 1)
        remove_all_named(slide, name)
        dot = add_shape_before(
            slide, target,
            MSO_SHAPE.OVAL,
            x, y, sz, sz,
            name=name,
        )
        set_solid_fill(dot, INK)
        remove_line(dot)
        set_fill_alpha(dot, op)

    # Left edge stripe.
    remove_all_named(slide, 'Enhance_S5_LeftEdgeStripe')
    ls = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        0.0, 0.0, 0.10, 7.5,
        name='Enhance_S5_LeftEdgeStripe',
    )
    set_solid_fill(ls, INK)
    remove_line(ls)
    set_fill_alpha(ls, 35)

    # Right edge stripe.
    remove_all_named(slide, 'Enhance_S5_RightEdgeStripe')
    rs = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        13.233, 0.0, 0.10, 7.5,
        name='Enhance_S5_RightEdgeStripe',
    )
    set_solid_fill(rs, INK)
    remove_line(rs)
    set_fill_alpha(rs, 35)


# ---------------------------------------------------------------------------
# Enhancement 6: Footer chip (diamond + label)
# ---------------------------------------------------------------------------


def enhance_footer(slide, refs):
    target = refs['page_num']

    # Diamond accent on the left of the footer (in the footer bar area).
    remove_all_named(slide, 'Enhance_S5_FooterDiamond')
    diamond = add_shape_after(
        slide, target,
        MSO_SHAPE.DIAMOND,
        0.30, 6.951 + (0.55 - 0.20) / 2.0, 0.20, 0.20,
        name='Enhance_S5_FooterDiamond',
    )
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    # Footer label.
    remove_all_named(slide, 'Enhance_S5_FooterLabel')
    label = add_textbox_after(
        slide, target,
        0.60, 6.951, 4.50, 0.55,
        name='Enhance_S5_FooterLabel',
    )
    tf = label.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = 'Research & References  -  SIH26146'
    r.font.name = 'Arial'
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(INK)
    set_run_letter_spacing(tf, 100)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print('Opening:', DECK_PATH)
    prs = Presentation(DECK_PATH)
    slide = prs.slides[4]
    print('Slide 5 shapes before cleanup:', len(slide.shapes))

    # Always start by removing any prior Enhance_S5_* shapes (idempotency).
    stale = remove_stale_s5(slide)
    print('Removed %d stale Enhance_S5_* shapes' % stale)

    # Always remove original section header textboxes + hairlines (once,
    # idempotent).
    removed_orig = remove_original_section_headers_and_hairlines(slide)
    print('Removed %d original section header / hairline shapes' % removed_orig)

    print('Slide 5 shapes after cleanup:', len(slide.shapes))
    refs = capture_shape_refs(slide)
    print('Captured refs.')

    print('  -> Enhance 1: Chrome (title + tagline + accent rule + monogram)')
    enhance_chrome(slide, refs)

    print('  -> Enhance 2: Section header pills')
    enhance_pills(slide, refs)

    print('  -> Enhance 3: Reference section cards')
    enhance_cards(slide, refs)

    print('  -> Enhance 4: Comparison table (border, shadow, gradient, icons)')
    enhance_table(slide, refs)

    print('  -> Enhance 5: Background dots + edge stripes')
    enhance_background(slide, refs)

    print('  -> Enhance 6: Footer chip')
    enhance_footer(slide, refs)

    print('Slide 5 shapes after:', len(slide.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()
