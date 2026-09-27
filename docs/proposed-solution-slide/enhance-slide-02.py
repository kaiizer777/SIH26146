"""
Apply VISUALLY NOTICEABLE design enhancements to slide 2 (Proposed Solution)
of SIH26146_PPT_combined.pptx.

Strategy: in-place modification of existing shapes + append new decorative
shapes in correct z-order via lxml `addprevious`. Idempotent (all new
shapes are tagged with recognizable names so re-runs replace, not stack).

CRITICAL: All existing shape references are captured at the START of the
script, BEFORE any new shapes are added. Adding new shapes shifts indices
in slide.shapes and would otherwise cause stale index lookups.

The previous version had a tolerance-related bug: Shape 14 (panel) and
Image 1 (architecture) have very close positions (within ~0.04 in) so a
loose-tolerance find_at matched both for both queries. This caused
normalize_refs to clobber Shape 14's dimensions and made the white panel
cover the architecture image. This version uses explicit shape_type
matching (AUTO_SHAPE=1 for the panel, PICTURE=13 for the image) and a
tighter tolerance so panel and image are unambiguously distinguished.

Enhancements applied (all 5 categories from the spec):

  E1 Refined chrome
     - Bump "Proposed Solution" title font 36pt -> 38pt + letter-spacing 100.
     - Widen the title textbox from 5.166 to 6.000 in so the larger glyph
       has breathing room (no wrap).
     - Bump Bitcoin monogram 30pt -> 34pt.
     - Add a very faint 2-tone gradient strip behind the title row (soft
       tint band from EFF6FF to FFFFFF, low opacity).
     - Add a thin accent rule (ink-blue 1.5pt line, 2.5 in wide) under
       the title area at y=1.18, just above the body content.

  E2 Pillar list (left column) -- converted into cards
     - For each of the 5 pillar textboxes (Text 9..Text 13), split the
       single bold 11pt run into:
         * a bold 13pt label run (e.g. "THE SYSTEM", "PILLAR 1")
         * a regular 12pt body run (the long description)
       so the label reads clearly above the body.
     - Add a colored vertical accent stripe to the LEFT of each pillar
       (0.10 in wide, full pillar height) rotating through 5 distinct
       colors (blue / orange / red / purple / green).
     - Add a soft outer shadow to each pillar textbox for depth.
     - Add a subtle white "card" backdrop behind each pillar (rounded
       rectangle, very faint tint, thin border).

  E3 Architecture image panel
     - Add a soft outer shadow to the image panel frame.
     - Add an ink-blue "pill" caption above the image:
       "ARCHITECTURE  --  BITCOIN AML INTELLIGENCE PIPELINE".
     - Add small L-shaped corner accents at the four corners of the
       panel frame (decorative brackets).

  E4 Background pattern
     - Add a faint dot pattern (20 small low-opacity ink-blue dots)
       scattered across the content area behind everything.

  E5 Footer
     - Add a small ink-blue accent diamond on the left edge of the
       footer bar (matches slide 1).
     - Add a small footer label on the left: "Proposed Solution -
       SIH26146".

Constraints honored:
  - Canvas 13.333 x 7.5 in.
  - ASCII-only Python string literals.
  - Slides 1, 3, 4, 5 untouched.
  - All 5 pillar sections + labels + bodies remain readable.
  - SIH logo image untouched.

Run:
    python enhance-slide-02.py
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
from pptx.util import Inches, Pt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'slides', 'output')
DECK_PATH = os.path.join(OUT_DIR, 'SIH26146_PPT_combined.pptx')

# ---- Namespaces ----
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

# ---- Color tokens (ASCII-safe hex) ----
INK = '2563EB'
INK_LIGHT = 'BFDBFE'
INK_FAINT = 'DBEAFE'
NAVY = '1F3864'
TEXT_PRIMARY = '0F172A'
SUBTITLE = '64748B'
PANEL_BG = 'F8FAFC'
PANEL_BG_SOFT = 'EFF6FF'
WHITE = 'FFFFFF'
BORDER = 'E2E8F0'

# Pillar stripe palette -- rotates through 5 distinct colors.
PILLAR_STRIPE_COLORS = [
    '2563EB',  # 1 blue
    'F59E0B',  # 2 orange/amber
    'EF4444',  # 3 red
    '8B5CF6',  # 4 purple
    '10B981',  # 5 green
]


# ---- OOXML helpers ----


def emu_in(v):
    """Inches to EMU (1 inch = 914400 EMU)."""
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


def add_shape_before(slide, target_shape, shape_kind,
                     left_in, top_in, width_in, height_in, name=None):
    """Add a shape, inserted BEFORE target_shape in spTree so it ends up
    underneath target_shape in z-order."""
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


def add_textbox_before(slide, target_shape,
                       left_in, top_in, width_in, height_in, name=None):
    tb = slide.shapes.add_textbox(
        Inches(left_in), Inches(top_in),
        Inches(width_in), Inches(height_in),
    )
    tb._element.addprevious(target_shape._element)
    if name:
        try:
            tb.name = name
        except Exception:
            pass
    return tb


def add_shape_after(slide, target_shape, shape_kind,
                    left_in, top_in, width_in, height_in, name=None):
    """Add a shape AFTER target_shape in spTree so it ends up on top in z-order."""
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
    tb._element.addnext(target_shape._element)
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


def set_prst_geom(shape, prst_name, adj_pct=None):
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


def replace_pillar_runs(textbox, label_text, body_text, label_color_hex):
    """Replace the textbox's single bold 11pt run with three runs:
      - label_text: bold 13pt, label_color
      - "  --  " (decorative em-dash separator) in slate
      - body_text: regular 12pt, primary text color
    """
    txBody = textbox.text_frame._txBody
    paras = txBody.findall('{%s}p' % NS_A)
    if not paras:
        return False
    p = paras[0]
    pPr = p.find('{%s}pPr' % NS_A)
    # Remove all runs and endParaRPr from the paragraph
    for child in list(p):
        if child.tag in ('{%s}r' % NS_A, '{%s}endParaRPr' % NS_A):
            p.remove(child)
    # Build label run (bold, 13pt)
    label_r = etree.SubElement(p, '{%s}r' % NS_A)
    label_rPr = etree.SubElement(label_r, '{%s}rPr' % NS_A)
    label_rPr.set('lang', 'en-US')
    label_rPr.set('sz', '1300')
    label_rPr.set('b', '1')
    label_rPr.set('dirty', '0')
    label_fill = etree.SubElement(label_rPr, '{%s}solidFill' % NS_A)
    label_srgb = etree.SubElement(label_fill, '{%s}srgbClr' % NS_A)
    label_srgb.set('val', label_color_hex)
    for tag in ('latin', 'ea', 'cs'):
        f = etree.SubElement(label_rPr, '{%s}%s' % (NS_A, tag))
        f.set('typeface', 'Arial')
        f.set('pitchFamily', '34')
        f.set('charset', '0')
    label_t = etree.SubElement(label_r, '{%s}t' % NS_A)
    label_t.text = label_text
    # Separator run
    sep_r = etree.SubElement(p, '{%s}r' % NS_A)
    sep_rPr = etree.SubElement(sep_r, '{%s}rPr' % NS_A)
    sep_rPr.set('lang', 'en-US')
    sep_rPr.set('sz', '1100')
    sep_rPr.set('dirty', '0')
    sep_fill = etree.SubElement(sep_rPr, '{%s}solidFill' % NS_A)
    sep_srgb = etree.SubElement(sep_fill, '{%s}srgbClr' % NS_A)
    sep_srgb.set('val', SUBTITLE)
    for tag in ('latin', 'ea', 'cs'):
        f = etree.SubElement(sep_rPr, '{%s}%s' % (NS_A, tag))
        f.set('typeface', 'Arial')
        f.set('pitchFamily', '34')
        f.set('charset', '0')
    sep_t = etree.SubElement(sep_r, '{%s}t' % NS_A)
    sep_t.text = '  --  '
    # Body run (11pt to fit within pillar box heights; 12pt overflowed)
    body_r = etree.SubElement(p, '{%s}r' % NS_A)
    body_rPr = etree.SubElement(body_r, '{%s}rPr' % NS_A)
    body_rPr.set('lang', 'en-US')
    body_rPr.set('sz', '1100')
    body_rPr.set('dirty', '0')
    body_fill = etree.SubElement(body_rPr, '{%s}solidFill' % NS_A)
    body_srgb = etree.SubElement(body_fill, '{%s}srgbClr' % NS_A)
    body_srgb.set('val', TEXT_PRIMARY)
    for tag in ('latin', 'ea', 'cs'):
        f = etree.SubElement(body_rPr, '{%s}%s' % (NS_A, tag))
        f.set('typeface', 'Arial')
        f.set('pitchFamily', '34')
        f.set('charset', '0')
    body_t = etree.SubElement(body_r, '{%s}t' % NS_A)
    body_t.text = body_text
    # Re-insert pPr at the top
    if pPr is not None:
        p.remove(pPr)
        p.insert(0, pPr)
    end_rPr = etree.SubElement(p, '{%s}endParaRPr' % NS_A)
    end_rPr.set('lang', 'en-US')
    end_rPr.set('sz', '1100')
    end_rPr.set('dirty', '0')
    return True


# ---------------------------------------------------------------------------
# Capture stable shape references (must be done BEFORE any new shapes are
# added -- new shapes shift indices in slide.shapes).
# ---------------------------------------------------------------------------


# MSO_SHAPE_TYPE integer constants we care about:
SHAPE_TYPE_AUTO = 1   # AUTO_SHAPE
SHAPE_TYPE_PICTURE = 13  # PICTURE


def capture_shape_refs(slide):
    """Return a dict of named references to the original shapes on slide 2.

    Uses EXPLICIT shape_type matching + tight tolerance so the panel and
    the architecture image are unambiguously distinguished (the previous
    version's loose tolerance matched both for both queries, which
    caused normalize_refs to clobber the panel's dimensions).
    """
    TOL = 25000  # EMU (~0.027 in). Tight enough to distinguish panel
                 # from image (their position differs by ~18,000-36,000 EMU).

    def find_at(left, top, width, height, shape_type_int=None):
        for shape in slide.shapes:
            if shape_type_int is not None:
                # shape_type is an MSO_SHAPE_TYPE enum; compare its value
                if int(shape.shape_type) != shape_type_int:
                    continue
            try:
                if (abs(int(shape.left) - emu_in(left)) > TOL or
                        abs(int(shape.top) - emu_in(top)) > TOL):
                    continue
                if (abs(int(shape.width) - emu_in(width)) <= TOL and
                        abs(int(shape.height) - emu_in(height)) <= TOL):
                    return shape
            except Exception:
                continue
        return None

    refs = {}
    refs['footer_bar'] = find_at(0.000, 6.951, 13.333, 0.550)
    refs['footer_text'] = find_at(5.083, 6.951, 3.504, 0.399)
    refs['page_num'] = find_at(12.850, 6.960, 0.420, 0.390)
    refs['diamond_accent'] = find_at(3.029, 0.689, 0.180, 0.180)
    refs['title'] = find_at(3.324, 0.554, 5.166, 0.505)
    refs['sih_logo'] = find_at(11.448, 0.021, 1.644, 0.848,
                               shape_type_int=SHAPE_TYPE_PICTURE)
    refs['vertical_bar'] = find_at(0.300, 0.200, 0.060, 0.850)
    refs['b_mono'] = find_at(0.420, 0.120, 0.550, 0.550)
    refs['sih_wordmark'] = find_at(0.420, 0.620, 1.400, 0.300)
    refs['subtitle'] = find_at(2.200, 0.149, 9.000, 0.300)
    # Panel: AUTO_SHAPE, slightly larger than the image
    refs['img_panel'] = find_at(5.699, 1.211, 7.634, 5.497,
                                shape_type_int=SHAPE_TYPE_AUTO)
    # Architecture image: PICTURE, slightly inset from panel
    refs['arch_image'] = find_at(5.719, 1.211, 7.594, 5.478,
                                 shape_type_int=SHAPE_TYPE_PICTURE)

    # Find pillar textboxes by content (more robust than position if a
    # prior broken run moved them).
    pillar_starts = ('THE SYSTEM', 'PILLAR 1', 'PILLAR 2', 'PILLAR 3', 'PILLAR 4')
    refs['pillars'] = []
    for start in pillar_starts:
        found = None
        for shape in slide.shapes:
            try:
                if shape.has_text_frame and shape.text_frame.text.strip().startswith(start):
                    found = shape
                    break
            except Exception:
                pass
        refs['pillars'].append(found)

    missing = [k for k, v in refs.items() if k != 'pillars' and v is None]
    if missing:
        raise RuntimeError('Could not find these shapes by position: %s' % missing)
    for i, p in enumerate(refs['pillars']):
        if p is None:
            raise RuntimeError('Pillar %d not found by content' % (i + 1))
    return refs


def normalize_refs(slide, refs):
    """Restore original dimensions on shapes that may have been corrupted
    by a prior broken script run."""
    if refs['title'] is not None:
        for para in refs['title'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(36)
    if refs['b_mono'] is not None:
        for para in refs['b_mono'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(30)
    if refs['sih_wordmark'] is not None:
        for para in refs['sih_wordmark'].text_frame.paragraphs:
            for run in para.runs:
                run.font.size = Pt(13)
    pillar_layouts = [
        (1.400, 0.950),
        (2.400, 0.950),
        (3.400, 1.050),
        (4.500, 1.050),
        (5.600, 1.200),
    ]
    for i, pillar in enumerate(refs['pillars']):
        if pillar is None:
            continue
        top, h = pillar_layouts[i]
        pillar.left = Inches(0.180)
        pillar.top = Inches(top)
        pillar.width = Inches(5.500)
        pillar.height = Inches(h)
    if refs['img_panel'] is not None:
        refs['img_panel'].left = Inches(5.699)
        refs['img_panel'].top = Inches(1.211)
        refs['img_panel'].width = Inches(7.634)
        refs['img_panel'].height = Inches(5.497)
    if refs['arch_image'] is not None:
        refs['arch_image'].left = Inches(5.719)
        refs['arch_image'].top = Inches(1.211)
        refs['arch_image'].width = Inches(7.594)
        refs['arch_image'].height = Inches(5.478)
    if refs['footer_bar'] is not None:
        refs['footer_bar'].left = Inches(0.000)
        refs['footer_bar'].top = Inches(6.951)
        refs['footer_bar'].width = Inches(13.333)
        refs['footer_bar'].height = Inches(0.550)
    if refs['footer_text'] is not None:
        refs['footer_text'].left = Inches(5.083)
        refs['footer_text'].top = Inches(6.951)
        refs['footer_text'].width = Inches(3.504)
        refs['footer_text'].height = Inches(0.399)
    if refs['page_num'] is not None:
        refs['page_num'].left = Inches(12.850)
        refs['page_num'].top = Inches(6.960)
        refs['page_num'].width = Inches(0.420)
        refs['page_num'].height = Inches(0.390)


# ---------------------------------------------------------------------------
# Enhancement 1: Refined chrome
# ---------------------------------------------------------------------------


def enhance_chrome(slide, refs):
    # 1a) Subtle gradient strip behind title row.
    remove_all_named(slide, 'Enhance_S2_TitleTintBand')
    band = add_shape_before(
        slide, refs['vertical_bar'],
        MSO_SHAPE.RECTANGLE,
        0.18, 0.50, 5.30, 0.60,
        name='Enhance_S2_TitleTintBand',
    )
    set_solid_fill(band, PANEL_BG_SOFT)
    remove_line(band)
    set_fill_alpha(band, 60)

    # 1b) Bump title to 38pt and widen textbox so it doesn't wrap.
    refs['title'].width = Inches(6.000)
    set_run_font_size(refs['title'].text_frame, 38)
    set_run_letter_spacing(refs['title'].text_frame, 100)

    # 1c) Bump B monogram 30pt -> 34pt.
    set_run_font_size(refs['b_mono'].text_frame, 34)

    # 1d) Thin accent rule under title.
    remove_all_named(slide, 'Enhance_S2_TitleAccentRule')
    rule = add_shape_before(
        slide, refs['vertical_bar'],
        MSO_SHAPE.RECTANGLE,
        3.029, 1.18, 2.50, 0.030,
        name='Enhance_S2_TitleAccentRule',
    )
    set_solid_fill(rule, INK)
    remove_line(rule)


# ---------------------------------------------------------------------------
# Enhancement 2: Pillar list -> cards
# ---------------------------------------------------------------------------


def enhance_pillars(slide, refs):
    pillar_layouts = [
        (1.400, 0.950),
        (2.400, 0.950),
        (3.400, 1.050),
        (4.500, 1.050),
        (5.600, 1.200),
    ]

    for i, pillar in enumerate(refs['pillars']):
        top_in, h_in = pillar_layouts[i]
        color_hex = PILLAR_STRIPE_COLORS[i]

        # 2a) Card backdrop behind the pillar.
        remove_all_named(slide, 'Enhance_S2_PillarCard_%d' % (i + 1))
        card = add_shape_before(
            slide, pillar,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            0.180, top_in, 5.500, h_in,
            name='Enhance_S2_PillarCard_%d' % (i + 1),
        )
        set_solid_fill(card, WHITE)
        set_line_color(card, BORDER, width_pt=0.5)
        set_prst_geom(card, 'roundRect', adj_pct=4)

        # 2b) Colored vertical accent stripe on the LEFT.
        remove_all_named(slide, 'Enhance_S2_PillarStripe_%d' % (i + 1))
        stripe = add_shape_before(
            slide, pillar,
            MSO_SHAPE.RECTANGLE,
            0.180, top_in, 0.10, h_in,
            name='Enhance_S2_PillarStripe_%d' % (i + 1),
        )
        set_solid_fill(stripe, color_hex)
        remove_line(stripe)

        # 2c) Soft outer shadow on the pillar textbox.
        add_outer_shadow(pillar, blur_pt=4, offset_pt=1, direction='down',
                         opacity_pct=8, hex_color='000000')

        # 2d) Split into bold 13pt label + regular 12pt body.
        full_text = pillar.text_frame.text
        # Original separators are "  \xb7  " or " \xb7 ".
        # Split on the FIRST " \xb7 " occurrence.
        sep_candidates = [
            '  \xb7  ',
            ' \xb7 ',
            '\xb7',
        ]
        cut = -1
        for sep in sep_candidates:
            idx = full_text.find(sep)
            if idx > 0 and (cut < 0 or idx < cut):
                cut = idx
        if cut <= 0:
            label_text = full_text.split()[0] if full_text.split() else ''
            body_text = full_text[len(label_text):]
        else:
            label_text = full_text[:cut].strip()
            body_text = full_text[cut:].lstrip(' -\xb7').strip()
        replace_pillar_runs(pillar, label_text, body_text, color_hex)


# ---------------------------------------------------------------------------
# Enhancement 3: Architecture image panel
# ---------------------------------------------------------------------------


def enhance_image_panel(slide, refs):
    panel = refs['img_panel']
    img = refs['arch_image']

    # 3a) Soft outer shadow on the panel frame.
    add_outer_shadow(panel, blur_pt=8, offset_pt=3, direction='downRight',
                     opacity_pct=12, hex_color='1F3864')

    # 3b) Ink-blue pill caption above the image. Use the image as the
    #     anchor with addprevious so the pill sits immediately above the
    #     image in spTree (on top of the panel but under the image's
    #     z-band). Position at y=0.92 (above the panel which starts at 1.211).
    pill_x = 5.85
    pill_y = 0.92
    pill_w = 5.20
    pill_h = 0.28
    remove_all_named(slide, 'Enhance_S2_ArchCaptionPill')
    pill = add_shape_before(
        slide, img,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        pill_x, pill_y, pill_w, pill_h,
        name='Enhance_S2_ArchCaptionPill',
    )
    set_solid_fill(pill, INK)
    set_line_color(pill, INK, width_pt=0.5)
    set_prst_geom(pill, 'roundRect', adj_pct=50)

    remove_all_named(slide, 'Enhance_S2_ArchCaptionText')
    pill_text = add_textbox_before(
        slide, img,
        pill_x, pill_y, pill_w, pill_h,
        name='Enhance_S2_ArchCaptionText',
    )
    tf = pill_text.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = 'ARCHITECTURE  --  BITCOIN AML INTELLIGENCE PIPELINE'
    r.font.name = 'Arial'
    r.font.size = Pt(9)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(WHITE)
    set_run_letter_spacing(tf, 200)

    # 3c) Small L-shaped corner accents at the four corners of the panel.
    #     Insert AFTER the image so they render on top.
    #     Panel: (5.699, 1.211, 7.634, 5.497) -> corners at
    #       TL: (5.699, 1.211)
    #       TR: (13.333, 1.211)
    #       BL: (5.699, 6.708)
    #       BR: (13.333, 6.708)
    corner_arm_len = 0.30
    corner_arm_thick = 0.04
    corners = [
        ('TL', 5.699, 1.211, 'right', 'down'),
        ('TR', 13.333, 1.211, 'left', 'down'),
        ('BL', 5.699, 6.708, 'right', 'up'),
        ('BR', 13.333, 6.708, 'left', 'up'),
    ]
    for name_suffix, cx, cy, h_orient, v_orient in corners:
        h_x = cx if h_orient == 'right' else cx - corner_arm_len
        h_y = cy if v_orient == 'down' else cy - corner_arm_thick
        v_x = cx if h_orient == 'right' else cx - corner_arm_thick
        v_y = cy if v_orient == 'down' else cy - corner_arm_len
        remove_all_named(slide, 'Enhance_S2_Corner_%s_H' % name_suffix)
        h_arm = add_shape_after(
            slide, img,
            MSO_SHAPE.RECTANGLE,
            h_x, h_y, corner_arm_len, corner_arm_thick,
            name='Enhance_S2_Corner_%s_H' % name_suffix,
        )
        set_solid_fill(h_arm, INK)
        remove_line(h_arm)
        remove_all_named(slide, 'Enhance_S2_Corner_%s_V' % name_suffix)
        v_arm = add_shape_after(
            slide, img,
            MSO_SHAPE.RECTANGLE,
            v_x, v_y, corner_arm_thick, corner_arm_len,
            name='Enhance_S2_Corner_%s_V' % name_suffix,
        )
        set_solid_fill(v_arm, INK)
        remove_line(v_arm)


def fix_panel_image_zorder(slide, refs):
    """Post-fix: ensure Shape 14 (panel) sits BEFORE Image 1 in spTree so
    the image renders on top of the panel (matches the original visual).
    Multiple addprevious calls during enhance_image_panel can cause the
    panel and image to swap relative position; this fixup ensures the
    panel is always immediately before the image."""
    panel = refs['img_panel']
    img = refs['arch_image']
    panel_elem = panel._element
    img_elem = img._element
    if panel_elem.getparent() is not img_elem.getparent():
        return  # safety
    spTree = panel_elem.getparent()
    siblings = list(spTree)
    panel_idx = siblings.index(panel_elem)
    img_idx = siblings.index(img_elem)
    if panel_idx < img_idx:
        return  # already correct
    # Need to move panel to immediately before image. We do this by:
    # 1. Removing panel from current position
    # 2. Inserting panel before image
    spTree.remove(panel_elem)
    img_elem.addprevious(panel_elem)


# ---------------------------------------------------------------------------
# Enhancement 4: Background pattern
# ---------------------------------------------------------------------------


def enhance_background_pattern(slide, refs):
    """Add ~20 small low-opacity ink-blue dots scattered behind the content
    area. Insertion target is the very first pillar so the dots sit at the
    BACK of the slide (behind everything else)."""
    target = refs['pillars'][0]

    dot_positions = [
        # Pillar column area (x: 0.4..5.6, y: 1.4..6.7)
        (0.45, 1.42, 0.06, 10),
        (5.50, 1.45, 0.06, 10),
        (0.45, 3.20, 0.05, 8),
        (5.50, 3.50, 0.06, 10),
        (0.45, 4.30, 0.05, 8),
        (5.50, 5.10, 0.05, 8),
        (0.45, 5.40, 0.06, 10),
        (5.50, 6.50, 0.05, 8),
        # Image column edges (x: 5.9..13.1)
        (5.85, 1.30, 0.05, 8),
        (13.10, 1.30, 0.05, 8),
        (5.85, 6.60, 0.05, 8),
        (13.10, 6.60, 0.05, 8),
        # A few floating dots for visual texture
        (3.00, 6.50, 0.04, 6),
        (5.00, 6.50, 0.04, 6),
        (8.00, 6.65, 0.04, 6),
        (11.00, 6.65, 0.04, 6),
        (3.00, 1.30, 0.04, 6),
        (5.00, 1.30, 0.04, 6),
        (8.00, 1.30, 0.04, 6),
        (11.00, 1.30, 0.04, 6),
    ]
    for i, (x, y, sz, op) in enumerate(dot_positions):
        name = 'Enhance_S2_BgDot_%d' % (i + 1)
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


# ---------------------------------------------------------------------------
# Enhancement 5: Footer refinement
# ---------------------------------------------------------------------------


def enhance_footer(slide, refs):
    footer_bar = refs['footer_bar']

    remove_all_named(slide, 'Enhance_S2_FooterDiamond')
    diamond = add_shape_before(
        slide, footer_bar,
        MSO_SHAPE.DIAMOND,
        0.40, 7.12, 0.20, 0.20,
        name='Enhance_S2_FooterDiamond',
    )
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    remove_all_named(slide, 'Enhance_S2_FooterLabelBg')
    label_bg = add_shape_before(
        slide, footer_bar,
        MSO_SHAPE.RECTANGLE,
        0.70, 7.10, 2.60, 0.28,
        name='Enhance_S2_FooterLabelBg',
    )
    set_solid_fill(label_bg, PANEL_BG)
    set_line_color(label_bg, INK_LIGHT, width_pt=0.75)

    remove_all_named(slide, 'Enhance_S2_FooterLabelText')
    lbl = add_textbox_before(
        slide, footer_bar,
        0.78, 7.10, 2.50, 0.28,
        name='Enhance_S2_FooterLabelText',
    )
    tf = lbl.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = 'Proposed Solution  --  SIH26146'
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
    slide2 = prs.slides[1]
    print('Slide 2 shapes before cleanup:', len(slide2.shapes))

    # Remove any stale Enhance_* shapes from prior runs so refs are
    # captured against a clean slide.
    stale = 0
    for shape in list(slide2.shapes):
        if shape.name.startswith('Enhance_'):
            shape._element.getparent().remove(shape._element)
            stale += 1
    print('Removed %d stale Enhance_* shapes' % stale)
    print('Slide 2 shapes after cleanup:', len(slide2.shapes))

    # Capture stable shape references BEFORE adding any new shapes.
    refs = capture_shape_refs(slide2)
    print('Captured refs: %d pillars' % len(refs['pillars']))
    print('  img_panel:', refs['img_panel'].name, 'at',
          refs['img_panel'].left / 914400.0, refs['img_panel'].top / 914400.0)
    print('  arch_image:', refs['arch_image'].name, 'at',
          refs['arch_image'].left / 914400.0, refs['arch_image'].top / 914400.0)

    # Restore any dimensions that may have been corrupted by prior broken runs.
    normalize_refs(slide2, refs)
    print('Normalized refs')

    print('  -> Enhance 1: Chrome')
    enhance_chrome(slide2, refs)

    print('  -> Enhance 2: Pillars')
    enhance_pillars(slide2, refs)

    print('  -> Enhance 3: Image panel')
    enhance_image_panel(slide2, refs)

    print('  -> Enhance 4: Background dot pattern')
    enhance_background_pattern(slide2, refs)

    print('  -> Enhance 5: Footer')
    enhance_footer(slide2, refs)

    print('  -> Post-fix: ensure panel is BEFORE image in z-order')
    fix_panel_image_zorder(slide2, refs)

    print('Slide 2 shapes after:', len(slide2.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()
