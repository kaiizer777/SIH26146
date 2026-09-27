"""
Apply VISUALLY NOTICEABLE design enhancements to slide 1 (cover) of
SIH26146_PPT_combined.pptx.

Strategy: in-place modification of existing shapes + append new decorative
shapes in correct z-order via lxml `addprevious`. Idempotent (all new
shapes are tagged with recognizable names so re-runs replace, not stack).

CRITICAL: All existing shape references are captured at the START of the
script, BEFORE any new shapes are added. Index-based access (slide.shapes[N])
is NEVER used after that, because adding new shapes shifts indices and would
cause stale index lookups (the previous version had this bug).

Enhancements applied (5 of the 5 from the spec):

  E1 Hero header band
     - Add a darker navy (`0F1E3D`) 2-tone top stripe (top 0.30 in).
     - Add 4 small hexagon watermarks in the top-right area at low opacity.
     - Add a thin angled gold accent line on the very right edge of the band.
     - Bump SMART INDIA HACKATHON 2026 font from 34pt -> 40pt with letter-spacing.

  E2 Team name area (hero treatment)
     - Add a soft tinted backdrop card behind AlertX (light `EFF6FF` fill,
       thin ink-blue top + bottom rules, rounded corners).
     - Add a navy Bitcoin-shield oval + white "B" glyph to the LEFT of AlertX.
     - Bump AlertX font from 44pt -> 56pt for hero feel.
     - Add a slate pill badge background behind the italic subtitle.

  E3 Bullet cards (dynamic + polished)
     - Widen the left ink-blue stripe from 0.10 in -> 0.18 in on all 6 cards.
     - Add an inner highlight stripe (lighter `BFDBFE`, 0.04 in) next to each
       main stripe.
     - Replace the plain gold dot with a polished marker (outer ring + filled
       center) on all 6 cards.
     - Add small geometric icons (circle / square / chevron / diamond /
       triangle / hex) on the right edge of each card.

  E4 Bitcoin hex panel (richer)
     - Add a faint dot pattern (12 small low-opacity dots) behind the B.
     - Add 3 dashed concentric orbit rings around the B (radii 0.9, 1.2, 1.5 in).
     - Bump B monogram font from 130pt -> 150pt and add a soft glow shadow.
     - Slightly grow the B textbox (1.0x1.3 -> 1.3x1.7) so the bigger glyph
       has breathing room.

  E5 Footer (refined)
     - Add a small ink-blue accent diamond + "Cover - Submission 2026" label
       at the left edge of the footer bar.

Constraints honored:
  - Canvas 13.333 x 7.5 in.
  - ASCII-only Python string literals.
  - Slides 2-5 untouched.
  - Text content unchanged.
  - SIH logo image untouched.

Run:
    python enhance-slide-01.py
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
from pptx.util import Inches, Pt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'slides', 'output')
DECK_PATH = os.path.join(OUT_DIR, 'SIH26146_PPT_combined.pptx')

# ---- Namespaces ----
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

# ---- Color tokens (ASCII-safe hex) ----
NAVY_DARK = '0F1E3D'
NAVY = '1F3864'
INK = '2563EB'
INK_LIGHT = 'BFDBFE'
GOLD = 'F59E0B'
TEXT_PRIMARY = '0F172A'
SUBTITLE = '64748B'
PANEL_BG = 'F8FAFC'
PANEL_BG_SOFT = 'EFF6FF'
CARD_BG = 'FFFFFF'
BORDER = 'E2E8F0'
WHITE = 'FFFFFF'

# ---- OOXML helpers ----


def emu_in(v):
    """Inches to EMU (1 inch = 914400 EMU)."""
    return int(round(v * 914400))


def set_solid_fill(shape, hex_color):
    """Set shape fill to a solid color."""
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(hex_color)


def remove_line(shape):
    """Remove the shape's outline."""
    try:
        shape.line.fill.background()
    except Exception:
        pass


def set_line_color(shape, hex_color, width_pt=None):
    """Set shape outline color and optional width."""
    shape.line.color.rgb = RGBColor.from_string(hex_color)
    if width_pt is not None:
        shape.line.width = Pt(width_pt)


def find_shape_by_name(slide, name):
    for shape in slide.shapes:
        if shape.name == name:
            return shape
    return None


def remove_all_named(slide, name):
    n = 0
    for shape in list(slide.shapes):
        if shape.name == name:
            shape._element.getparent().remove(shape._element)
            n += 1
    return n


def add_shape_before(slide, target_shape, shape_kind,
                     left_in, top_in, width_in, height_in, name=None):
    """Add a shape to the slide, but insert it BEFORE target_shape in the spTree
    so it ends up underneath target_shape in z-order.

    Returns the new shape object.
    """
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


def add_outer_shadow(shape, blur_pt, offset_pt, direction, opacity_pct, hex_color):
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


def set_fill_alpha(shape, opacity_pct):
    """Set alpha on the shape's solid fill color (for transparency)."""
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


def set_line_alpha(shape, opacity_pct):
    """Set alpha on the shape's line color."""
    ln = shape._element.find('.//{%s}ln' % NS_A)
    if ln is None:
        return
    srgb = ln.find('{%s}solidFill/{%s}srgbClr' % (NS_A, NS_A))
    if srgb is None:
        return
    for a in list(srgb):
        if a.tag.endswith('}alpha'):
            srgb.remove(a)
    alpha = etree.SubElement(srgb, '{%s}alpha' % NS_A)
    alpha.set('val', str(int(opacity_pct * 1000)))


def set_prst_geom(shape, prst_name, adj_pct=None):
    """Set preset geometry (e.g. 'roundRect') and optional corner radius (%)."""
    prst = shape._element.find('.//{%s}prstGeom' % NS_A)
    if prst is None:
        return
    prst.set('prst', prst_name)
    if adj_pct is not None:
        for av in list(prst.findall('{%s}avLst' % NS_A)):
            prst.remove(av)
        av_lst = etree.SubElement(prst, '{%s}avLst' % NS_A)
        av1 = etree.SubElement(av_lst, '{%s}gd' % NS_A)
        av1.set('name', 'adj')
        av1.set('fmla', 'val %d' % int(adj_pct * 1000))


def make_dashed_line(shape, dash_val='dash'):
    """Set the line dash style (e.g. 'dash', 'dashDot', 'lgDash')."""
    ln = shape._element.find('.//{%s}ln' % NS_A)
    if ln is None:
        return
    prstDash = ln.find('{%s}prstDash' % NS_A)
    if prstDash is None:
        prstDash = etree.SubElement(ln, '{%s}prstDash' % NS_A)
    prstDash.set('val', dash_val)


# ---------------------------------------------------------------------------
# Capture stable shape references (must be done BEFORE any new shapes are
# added -- new shapes shift indices in slide.shapes).
# ---------------------------------------------------------------------------


def capture_shape_refs(slide):
    """Return a dict of named references to the original shapes on slide 1.

    Uses position-based lookup (left, top, width, height in inches) rather
    than indices because previous addprevious inserts shuffled the spTree
    and broke index ordering.

    Original shape positions (after the touchup script ran but before any
    Enhance_* shapes were added):
      main_band            (0.00, 0.00, 13.333 x 1.45)
      left_stripe          (0.00, 0.00, 0.20 x 1.45)
      right_stripe         (13.133, 0.00, 0.20 x 1.45)
      title_text           (0.40, 0.00, 10.70 x 1.45)
      sih_logo (picture)   (11.55, 0.20, 1.55 x 0.85)
      gold_strip           (0.00, 1.45, 13.333 x 0.07)
      ink_rule_alertx      (5.917, 1.80, 1.50 x 0.04)
      alertx_text          (0.00, 1.92, 13.333 x 0.85)
      subtitle_text        (0.00, 2.78, 13.333 x 0.30)

      card body top y positions:
        card 1: 3.30
        card 2: 3.86
        card 3: 4.42
        card 4: 4.98
        card 5: 5.54
        card 6: 6.10
      Each card:
        body   (0.50, top, 7.50 x 0.50)
        stripe (0.50, top, 0.10 x 0.50)
        dot    (0.75, top+0.21, 0.08 x 0.08)
        text   (0.95, top, 6.95 x 0.50)

      hex_panel_outer      (8.40, 3.30, 4.50 x 3.30)
      hex_panel_inner      (8.60, 3.50, 4.10 x 2.75)
      b_text               (10.15, 4.15, 1.00 x 1.30)
      first_hex            (10.46, 3.56, 0.38 x 0.38)  (top-left hex around B)
      caption              (8.40, 6.30, 4.50 x 0.28)
      footer_bar           (0.00, 6.95, 13.333 x 0.55)
      footer_text          (5.083, 6.95, 3.504 x 0.40)
      page_num             (12.85, 6.96, 0.42 x 0.39)
    """
    TOL = 100000  # EMU tolerance for matching (~0.11 in). Loose to handle
                  # corrupted shapes from prior broken runs.

    def find_at(left, top, width, height, shape_type=None, allow_wide_match=False):
        """Find first shape whose xfrm matches the given inches.

        If allow_wide_match=True, only the top-left position must match (so
        we can locate corrupted shapes whose width/height were reset by a
        prior broken script run).
        """
        for shape in slide.shapes:
            if shape_type is not None and shape.shape_type != shape_type:
                continue
            try:
                if (abs(int(shape.left) - emu_in(left)) > TOL or
                        abs(int(shape.top) - emu_in(top)) > TOL):
                    continue
                if allow_wide_match:
                    return shape
                if (abs(int(shape.width) - emu_in(width)) <= TOL and
                        abs(int(shape.height) - emu_in(height)) <= TOL):
                    return shape
            except Exception:
                continue
        return None

    refs = {}
    refs['main_band'] = find_at(0.00, 0.00, 13.333, 1.45)
    refs['left_stripe'] = find_at(0.00, 0.00, 0.20, 1.45)
    refs['right_stripe'] = find_at(13.133, 0.00, 0.20, 1.45)
    refs['title_text'] = find_at(0.40, 0.00, 10.70, 1.45)
    refs['sih_logo'] = find_at(11.55, 0.20, 1.55, 0.85)
    refs['gold_strip'] = find_at(0.00, 1.45, 13.333, 0.07)
    refs['ink_rule_alertx'] = find_at(5.917, 1.80, 1.50, 0.04)
    refs['alertx_text'] = find_at(0.00, 1.92, 13.333, 0.85, allow_wide_match=True)
    refs['subtitle_text'] = find_at(0.00, 2.78, 13.333, 0.30)

    refs['cards'] = []
    for top in (3.30, 3.86, 4.42, 4.98, 5.54, 6.10):
        body = find_at(0.50, top, 7.50, 0.50)
        stripe = find_at(0.50, top, 0.10, 0.50)
        dot = find_at(0.75, top + 0.21, 0.08, 0.08)
        # Card text: search by content (it may have been moved by a prior
        # broken run, so position-based lookup is unreliable).
        expected_text = {
            3.30: 'Problem Statement ID',
            3.86: 'Problem Statement Title',
            4.42: 'Theme',
            4.98: 'PS Category',
            5.54: 'Team ID',
            6.10: 'Team Name',
        }[top]
        text = None
        for shape in slide.shapes:
            try:
                if shape.has_text_frame and expected_text in shape.text_frame.text:
                    text = shape
                    break
            except Exception:
                pass
        refs['cards'].append({'body': body, 'stripe': stripe, 'dot': dot, 'text': text})

    refs['hex_panel_outer'] = find_at(8.40, 3.30, 4.50, 3.30)
    refs['hex_panel_inner'] = find_at(8.60, 3.50, 4.10, 2.75)
    # B text: search by content ("B") to avoid matching the wrong shape
    # (a prior broken script may have moved Text 27 "Team ID:" to the B
    # position and left the real B elsewhere).
    refs['b_text'] = None
    for shape in slide.shapes:
        try:
            if shape.has_text_frame and shape.text_frame.text.strip() == 'B':
                refs['b_text'] = shape
                break
        except Exception:
            pass
    refs['first_hex'] = find_at(10.46, 3.56, 0.38, 0.38)
    refs['caption'] = find_at(8.40, 6.30, 4.50, 0.28)
    refs['footer_bar'] = find_at(0.00, 6.95, 13.333, 0.55, allow_wide_match=True)
    refs['footer_text'] = find_at(5.083, 6.95, 3.504, 0.40, allow_wide_match=True)
    refs['page_num'] = find_at(12.85, 6.96, 0.42, 0.39)

    # Sanity check: every ref must be non-None.
    missing = [k for k, v in refs.items() if k != 'cards' and v is None]
    if missing:
        raise RuntimeError('Could not find these shapes by position: %s' % missing)
    for i, card in enumerate(refs['cards']):
        for k, v in card.items():
            if v is None:
                raise RuntimeError('Card %d %s not found by position' % (i + 1, k))

    return refs


def normalize_refs(slide, refs):
    """Restore original dimensions on shapes that may have been corrupted
    by a prior broken script run."""
    # Also fix z-order: ensure each card's body shape sits BEFORE its text
    # frame in the spTree, so the text renders on top of the body.
    card_tops = (3.30, 3.86, 4.42, 4.98, 5.54, 6.10)
    for i, card in enumerate(refs['cards']):
        body = card.get('body')
        text = card.get('text')
        if body is None or text is None:
            continue
        body_elem = body._element
        text_elem = text._element
        # If body is AFTER text in spTree, move body before text.
        # Compare positions in spTree.
        try:
            # Find indices in spTree by counting preceding siblings
            spTree = body_elem.getparent()
            siblings = list(spTree)
            if siblings.index(body_elem) > siblings.index(text_elem):
                # Move body before text
                text_elem.addprevious(body_elem)
        except Exception:
            pass
    # AlertX text: full width
    if refs['alertx_text'] is not None:
        refs['alertx_text'].left = Inches(0.00)
        refs['alertx_text'].top = Inches(1.92)
        refs['alertx_text'].width = Inches(13.333)
        refs['alertx_text'].height = Inches(0.85)
        # Reset font to 44pt (broken runs may have set it to 56)
        for para in refs['alertx_text'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(44)
    # Subtitle text: original font
    if refs['subtitle_text'] is not None:
        for para in refs['subtitle_text'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(11)
    # Footer bar: full width, original y
    if refs['footer_bar'] is not None:
        refs['footer_bar'].left = Inches(0.00)
        refs['footer_bar'].top = Inches(6.951)
        refs['footer_bar'].width = Inches(13.333)
        refs['footer_bar'].height = Inches(0.55)
    # Footer text
    if refs['footer_text'] is not None:
        refs['footer_text'].left = Inches(5.083)
        refs['footer_text'].top = Inches(6.951)
        refs['footer_text'].width = Inches(3.504)
        refs['footer_text'].height = Inches(0.399)
    # Page num
    if refs['page_num'] is not None:
        refs['page_num'].left = Inches(12.85)
        refs['page_num'].top = Inches(6.96)
        refs['page_num'].width = Inches(0.42)
        refs['page_num'].height = Inches(0.39)
    # B text: original position + original font 130pt
    if refs['b_text'] is not None:
        refs['b_text'].left = Inches(10.15)
        refs['b_text'].top = Inches(4.15)
        refs['b_text'].width = Inches(1.00)
        refs['b_text'].height = Inches(1.30)
        # Reset font to original 130pt (broken runs may have set it to 150
        # for some other shape, but the real B should be at 130pt here)
        # Actually we want to reset to whatever the original was. Hardcode 130.
        for para in refs['b_text'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(130)

    # The 6 hex shapes around B: a prior broken script may have moved one
    # of them to the B textbox position (10.00, 3.95, 1.30, 1.70). Find any
    # shape whose position doesn't match the expected hex positions and
    # restore it.
    expected_hex_positions = {
        'Shape 35': (10.460, 3.560, 0.380, 0.380),
        'Shape 36': (11.369, 4.085, 0.380, 0.380),
        'Shape 37': (11.369, 5.135, 0.380, 0.380),
        'Shape 38': (10.460, 5.660, 0.380, 0.380),
        'Shape 39': (9.551, 5.135, 0.380, 0.380),
        'Shape 40': (9.551, 4.085, 0.380, 0.380),
    }
    for shape in slide.shapes:
        name = shape.name
        if name in expected_hex_positions:
            exp = expected_hex_positions[name]
            # If position is way off, reset
            cur = (shape.left, shape.top, shape.width, shape.height)
            exp_emu = (emu_in(exp[0]), emu_in(exp[1]), emu_in(exp[2]), emu_in(exp[3]))
            if (abs(int(cur[0]) - exp_emu[0]) > emu_in(0.5) or
                    abs(int(cur[1]) - exp_emu[1]) > emu_in(0.5) or
                    abs(int(cur[2]) - exp_emu[2]) > emu_in(0.5)):
                shape.left = Inches(exp[0])
                shape.top = Inches(exp[1])
                shape.width = Inches(exp[2])
                shape.height = Inches(exp[3])
    # Caption
    if refs['caption'] is not None:
        for para in refs['caption'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(10)
    # Card texts and stripes: force original positions/dimensions + 12pt font
    card_tops = (3.30, 3.86, 4.42, 4.98, 5.54, 6.10)
    for i, card in enumerate(refs['cards']):
        top = card_tops[i]
        if card['text'] is not None:
            card['text'].left = Inches(0.95)
            card['text'].top = Inches(top)
            card['text'].width = Inches(6.95)
            card['text'].height = Inches(0.50)
            # Reset font to 12pt
            for para in card['text'].text_frame.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(12)
        if card['stripe'] is not None:
            card['stripe'].left = Inches(0.50)
            card['stripe'].top = Inches(top)
            card['stripe'].width = Inches(0.10)
            card['stripe'].height = Inches(0.50)
        if card['dot'] is not None:
            card['dot'].left = Inches(0.75)
            card['dot'].top = Inches(top + 0.21)
            card['dot'].width = Inches(0.08)
            card['dot'].height = Inches(0.08)
        if card['body'] is not None:
            card['body'].left = Inches(0.50)
            card['body'].top = Inches(top)
            card['body'].width = Inches(7.50)
            card['body'].height = Inches(0.50)


# ---------------------------------------------------------------------------
# Enhancement 1: Hero header band (2-tone + hex watermarks + bigger title)
# ---------------------------------------------------------------------------


def enhance_hero_band(slide, refs):
    # 1a) Darker 2-tone top stripe, inserted before the left edge stripe so
    #     the stripe is underneath the edge stripes and title text.
    remove_all_named(slide, 'Enhance_HeroTopStripe')
    dark_top = add_shape_before(
        slide, refs['left_stripe'],
        MSO_SHAPE.RECTANGLE,
        0.0, 0.0, 13.333, 0.30,
        name='Enhance_HeroTopStripe',
    )
    set_solid_fill(dark_top, NAVY_DARK)
    remove_line(dark_top)

    # 1b) Hexagon watermarks (4 small hexes) inserted before title text so
    #     they sit above the band but under the title.
    hex_specs = [
        (9.40, 0.05, 0.18, 18),
        (9.95, 0.10, 0.22, 22),
        (10.55, 0.04, 0.18, 16),
        (11.10, 0.12, 0.20, 20),
    ]
    for i, (x, y, sz, op) in enumerate(hex_specs):
        name = 'Enhance_HeroHexWatermark_%d' % (i + 1)
        remove_all_named(slide, name)
        hex_shape = add_shape_before(
            slide, refs['title_text'],
            MSO_SHAPE.HEXAGON,
            x, y, sz, sz,
            name=name,
        )
        set_solid_fill(hex_shape, INK_LIGHT)
        set_fill_alpha(hex_shape, op)
        remove_line(hex_shape)

    # 1c) Thin angled gold accent line on the right edge of the band.
    remove_all_named(slide, 'Enhance_HeroAccentLine')
    accent_line = slide.shapes.add_connector(
        1,  # MSO_CONNECTOR.STRAIGHT
        Inches(12.20), Inches(0.00),
        Inches(13.00), Inches(1.30),
    )
    accent_line._element.addprevious(refs['sih_logo']._element)
    accent_line.line.color.rgb = RGBColor.from_string(GOLD)
    accent_line.line.width = Pt(2.0)
    try:
        accent_line.name = 'Enhance_HeroAccentLine'
    except Exception:
        pass

    # 1d) Bump SMART INDIA HACKATHON 2026 font size + add letter-spacing.
    set_run_font_size(refs['title_text'].text_frame, 40)
    set_run_letter_spacing(refs['title_text'].text_frame, 200)


# ---------------------------------------------------------------------------
# Enhancement 2: Team name area (hero treatment)
# ---------------------------------------------------------------------------


def enhance_team_name_area(slide, refs):
    alertx = refs['alertx_text']

    # 2a) Tinted backdrop card behind AlertX (rounded rect, light tint).
    remove_all_named(slide, 'Enhance_AlertXBackdrop')
    backdrop = add_shape_before(
        slide, alertx,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        2.50, 1.85, 8.33, 1.25,
        name='Enhance_AlertXBackdrop',
    )
    set_solid_fill(backdrop, PANEL_BG_SOFT)
    remove_line(backdrop)
    set_prst_geom(backdrop, 'roundRect', adj_pct=8)
    add_outer_shadow(backdrop, blur_pt=12, offset_pt=2, direction='down',
                     opacity_pct=8, hex_color='000000')

    # 2b) Thin ink-blue top rule on the backdrop.
    remove_all_named(slide, 'Enhance_AlertXBackdropTopRule')
    top_rule = add_shape_before(
        slide, alertx,
        MSO_SHAPE.RECTANGLE,
        2.50, 1.85, 8.33, 0.04,
        name='Enhance_AlertXBackdropTopRule',
    )
    set_solid_fill(top_rule, INK)
    remove_line(top_rule)

    # 2c) Thin ink-blue bottom rule on the backdrop.
    remove_all_named(slide, 'Enhance_AlertXBackdropBottomRule')
    bottom_rule = add_shape_before(
        slide, alertx,
        MSO_SHAPE.RECTANGLE,
        2.50, 3.06, 8.33, 0.04,
        name='Enhance_AlertXBackdropBottomRule',
    )
    set_solid_fill(bottom_rule, INK)
    remove_line(bottom_rule)

    # 2d) Bitcoin shield oval to the LEFT of AlertX.
    remove_all_named(slide, 'Enhance_AlertXBShield')
    b_shield = add_shape_before(
        slide, alertx,
        MSO_SHAPE.OVAL,
        3.10, 2.05, 0.90, 0.90,
        name='Enhance_AlertXBShield',
    )
    set_solid_fill(b_shield, NAVY)
    remove_line(b_shield)
    add_outer_shadow(b_shield, blur_pt=6, offset_pt=1, direction='down',
                     opacity_pct=14, hex_color='000000')

    # 2e) White "B" text on top of the shield (separate textbox).
    remove_all_named(slide, 'Enhance_AlertXBShieldGlyph')
    b_glyph = slide.shapes.add_textbox(
        Inches(3.10), Inches(2.10), Inches(0.90), Inches(0.85),
    )
    b_glyph._element.addprevious(alertx._element)
    try:
        b_glyph.name = 'Enhance_AlertXBShieldGlyph'
    except Exception:
        pass
    btf = b_glyph.text_frame
    btf.margin_left = Inches(0)
    btf.margin_right = Inches(0)
    btf.margin_top = Inches(0)
    btf.margin_bottom = Inches(0)
    btf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = btf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = 'B'
    r.font.name = 'Arial'
    r.font.bold = True
    r.font.size = Pt(40)
    r.font.color.rgb = RGBColor.from_string(WHITE)

    # 2f) Bump AlertX font size 44pt -> 56pt for hero feel.
    set_run_font_size(alertx.text_frame, 56)

    # 2g) Subtitle pill badge background (insert before subtitle text).
    remove_all_named(slide, 'Enhance_SubtitlePill')
    pill = add_shape_before(
        slide, refs['subtitle_text'],
        MSO_SHAPE.ROUNDED_RECTANGLE,
        4.20, 2.78, 4.93, 0.30,
        name='Enhance_SubtitlePill',
    )
    set_solid_fill(pill, PANEL_BG_SOFT)
    set_line_color(pill, INK_LIGHT, width_pt=0.75)
    set_prst_geom(pill, 'roundRect', adj_pct=50)  # full pill


# ---------------------------------------------------------------------------
# Enhancement 3: Bullet cards (dynamic + polished)
# ---------------------------------------------------------------------------


def enhance_bullet_cards(slide, refs):
    # Per-card icon variety
    icon_shape_kinds = [
        MSO_SHAPE.OVAL,            # PS ID: circle
        MSO_SHAPE.RECTANGLE,       # PS Title: square
        MSO_SHAPE.CHEVRON,         # Theme: chevron
        MSO_SHAPE.DIAMOND,         # Category: diamond
        MSO_SHAPE.ISOSCELES_TRIANGLE,  # Team ID: triangle
        MSO_SHAPE.HEXAGON,         # Team Name: hex
    ]

    for i, card in enumerate(refs['cards']):
        body = card['body']
        stripe = card['stripe']
        dot = card['dot']
        # Note: 'text' is unused here.

        card_top_in = body.top / 914400.0
        card_left_in = body.left / 914400.0
        card_height_in = body.height / 914400.0

        # 3a) Widen left stripe from 0.10 in -> 0.18 in.
        stripe.width = Inches(0.18)

        # 3b) Inner highlight stripe (lighter blue) right after main stripe.
        remove_all_named(slide, 'Enhance_CardInnerStripe_%d' % (i + 1))
        inner = add_shape_before(
            slide, body,
            MSO_SHAPE.RECTANGLE,
            card_left_in + 0.18, card_top_in, 0.04, card_height_in,
            name='Enhance_CardInnerStripe_%d' % (i + 1),
        )
        set_solid_fill(inner, INK_LIGHT)
        remove_line(inner)

        # 3c) Replace gold dot with polished marker:
        #     - hide original dot (no fill, no line)
        #     - add outer ring (no fill, ink-blue line)
        #     - add filled gold center
        try:
            dot.fill.background()
        except Exception:
            pass
        remove_line(dot)

        outer_x = card_left_in + 0.30
        outer_y = card_top_in + 0.18
        remove_all_named(slide, 'Enhance_CardMarkerOuter_%d' % (i + 1))
        outer_marker = add_shape_before(
            slide, body,
            MSO_SHAPE.OVAL,
            outer_x, outer_y, 0.14, 0.14,
            name='Enhance_CardMarkerOuter_%d' % (i + 1),
        )
        outer_marker.fill.background()
        set_line_color(outer_marker, INK, width_pt=1.25)

        remove_all_named(slide, 'Enhance_CardMarkerCenter_%d' % (i + 1))
        center_marker = add_shape_before(
            slide, body,
            MSO_SHAPE.OVAL,
            outer_x + 0.035, outer_y + 0.035, 0.07, 0.07,
            name='Enhance_CardMarkerCenter_%d' % (i + 1),
        )
        set_solid_fill(center_marker, GOLD)
        remove_line(center_marker)

        # 3d) Small geometric icon on the right edge of each card.
        icon_x = card_left_in + 6.85  # card width 7.50 - 0.40 (icon 0.24) - 0.25
        icon_y = card_top_in + 0.13
        icon_size = 0.24
        remove_all_named(slide, 'Enhance_CardIcon_%d' % (i + 1))
        icon = add_shape_before(
            slide, body,
            icon_shape_kinds[i],
            icon_x, icon_y, icon_size, icon_size,
            name='Enhance_CardIcon_%d' % (i + 1),
        )
        set_solid_fill(icon, INK_LIGHT)
        set_line_color(icon, INK, width_pt=0.75)


# ---------------------------------------------------------------------------
# Enhancement 4: Bitcoin hex panel (richer)
# ---------------------------------------------------------------------------


def enhance_bitcoin_panel(slide, refs):
    b_text = refs['b_text']
    hex_inner = refs['hex_panel_inner']
    first_hex = refs['first_hex']

    # 4a) Dot pattern behind the B.
    #     Insert BEFORE hex_inner so dots sit behind the panel tint.
    dot_positions = [
        (9.00, 3.85), (9.50, 4.10), (10.00, 3.80), (10.50, 4.20),
        (11.00, 3.85), (11.50, 4.10), (12.00, 3.85), (12.30, 4.30),
        (9.20, 5.85), (9.70, 6.00), (11.80, 5.90), (12.20, 6.00),
    ]
    for i, (dx, dy) in enumerate(dot_positions):
        remove_all_named(slide, 'Enhance_HexDotPattern_%d' % (i + 1))
        dot = add_shape_before(
            slide, hex_inner,
            MSO_SHAPE.OVAL,
            dx, dy, 0.08, 0.08,
            name='Enhance_HexDotPattern_%d' % (i + 1),
        )
        set_solid_fill(dot, INK_LIGHT)
        set_fill_alpha(dot, 45)
        remove_line(dot)

    # 4b) Dashed concentric orbit rings around the B.
    #     Insert before first_hex so they sit behind the 6 hex shapes but in
    #     front of the hex panel.
    #     Center the rings on the B textbox center (after we modify it below).
    #     B center target = (10.65, 4.80) (see below).
    ring_specs = [
        (0.90, INK, 28, 1.25),
        (1.30, INK, 22, 1.00),
        (1.65, INK, 18, 0.75),
    ]
    cx, cy = 10.65, 4.80
    for i, (r, col, op, dash_pt) in enumerate(ring_specs):
        remove_all_named(slide, 'Enhance_OrbitRing_%d' % (i + 1))
        d = r * 2.0
        ring = add_shape_before(
            slide, first_hex,
            MSO_SHAPE.OVAL,
            cx - r, cy - r, d, d,
            name='Enhance_OrbitRing_%d' % (i + 1),
        )
        ring.fill.background()
        set_line_color(ring, col, width_pt=dash_pt)
        make_dashed_line(ring, 'dash')
        set_line_alpha(ring, op)

    # 4c) Grow B textbox from 1.0x1.3 -> 1.3x1.7 (keep center at 10.65, 4.80).
    new_w, new_h = 1.30, 1.70
    b_text.left = Inches(cx - new_w / 2.0)
    b_text.top = Inches(cy - new_h / 2.0)
    b_text.width = Inches(new_w)
    b_text.height = Inches(new_h)

    # 4d) Bump font size on B from 130 -> 150 and add a soft glow.
    set_run_font_size(b_text.text_frame, 150)
    add_outer_shadow(b_text, blur_pt=10, offset_pt=2, direction='down',
                     opacity_pct=22, hex_color='1F3864')


# ---------------------------------------------------------------------------
# Enhancement 5: Footer (refined)
# ---------------------------------------------------------------------------


def enhance_footer(slide, refs):
    footer_bar = refs['footer_bar']

    # 5a) Small ink-blue diamond at the left edge of the footer bar.
    remove_all_named(slide, 'Enhance_FooterDiamond')
    diamond = add_shape_before(
        slide, footer_bar,
        MSO_SHAPE.DIAMOND,
        0.40, 7.12, 0.20, 0.20,
        name='Enhance_FooterDiamond',
    )
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    # 5b) Soft tinted label background for the footer accent text.
    remove_all_named(slide, 'Enhance_FooterLabel')
    label_bg = add_shape_before(
        slide, footer_bar,
        MSO_SHAPE.RECTANGLE,
        0.70, 7.10, 2.20, 0.28,
        name='Enhance_FooterLabel',
    )
    set_solid_fill(label_bg, PANEL_BG)
    set_line_color(label_bg, INK_LIGHT, width_pt=0.75)

    # 5c) Footer label text "Cover - Submission 2026".
    remove_all_named(slide, 'Enhance_FooterLabelText')
    lbl = slide.shapes.add_textbox(
        Inches(0.78), Inches(7.10), Inches(2.10), Inches(0.28),
    )
    lbl._element.addprevious(footer_bar._element)
    try:
        lbl.name = 'Enhance_FooterLabelText'
    except Exception:
        pass
    tf = lbl.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = 'Cover - Submission 2026'
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
    slide1 = prs.slides[0]
    print('Slide 1 shapes before cleanup:', len(slide1.shapes))

    # First, remove any stale Enhance_* shapes from prior runs so refs are
    # captured against a clean slide (original 47 shapes + post-touchup).
    stale = 0
    for shape in list(slide1.shapes):
        if shape.name.startswith('Enhance_'):
            shape._element.getparent().remove(shape._element)
            stale += 1
    print('Removed %d stale Enhance_* shapes' % stale)
    print('Slide 1 shapes after cleanup:', len(slide1.shapes))

    # Capture stable shape references BEFORE adding any new shapes.
    refs = capture_shape_refs(slide1)
    print('Captured refs for %d cards' % len(refs['cards']))

    # Restore any dimensions that may have been corrupted by prior broken
    # runs (e.g. AlertX text width set to 0.18 by a buggy addprevious chain).
    normalize_refs(slide1, refs)
    print('Normalized refs')

    print('  -> Enhance 1: Hero band')
    enhance_hero_band(slide1, refs)

    print('  -> Enhance 2: Team name area')
    enhance_team_name_area(slide1, refs)

    print('  -> Enhance 3: Bullet cards')
    enhance_bullet_cards(slide1, refs)

    print('  -> Enhance 4: Bitcoin hex panel')
    enhance_bitcoin_panel(slide1, refs)

    print('  -> Enhance 5: Footer')
    enhance_footer(slide1, refs)

    print('Slide 1 shapes after:', len(slide1.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()