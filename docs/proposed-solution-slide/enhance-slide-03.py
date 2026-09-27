"""
Apply VISUALLY NOTICEABLE design enhancements to slide 3 (Technical Approach)
of SIH26146_PPT_combined.pptx.

Strategy: in-place modification of existing shapes + append new decorative
shapes in correct z-order via lxml `addprevious`. Idempotent (all new
shapes are tagged with recognizable names so re-runs replace, not stack).

Slide 3 layout (from inspection):
  - Shape 0    AUTO_SHAPE    vertical ink-blue bar at (0.290, 0.200, 0.070, 0.669)
  - Text 1     AUTO_SHAPE    Bitcoin B monogram at (0.420, 0.120, 0.550, 0.550)
  - Text 2     AUTO_SHAPE    "SIH26146" wordmark at (0.420, 0.620, 1.400, 0.300)
  - Text 3     AUTO_SHAPE    italic subtitle at (2.448, 0.145, 9.000, 0.300)
  - Image 0    PICTURE       SIH Hackathon 2026 logo at (11.448, 0.021, 1.644, 0.848)
  - Shape 4    AUTO_SHAPE    diamond accent at (3.118, 0.562, 0.180, 0.180)
  - Text 5     AUTO_SHAPE    "TECHNICAL APPROACH" title at (3.298, 0.370, 8.150, 0.624)
  - Picture 10 PICTURE       full-slide infographic at (0.004, 0.994, 13.326, 6.506)

The infographic fills nearly the entire body of the slide (it has its own
embedded footer / chrome regions). Enhancements focus on:
  - The chrome strip at the top (title + diamond + ₿ monogram).
  - A border / frame / corner brackets / pip caption AROUND the image so the
    infographic reads as a framed plate.
  - A faint dot pattern + edge stripes for visual interest.
  - Small numbered section markers along the left edge.
  - A footer overlay at the bottom (since the infographic fills the slide).

Constraints honored:
  - Canvas 13.333 x 7.5 in.
  - ASCII-only Python string literals.
  - Slides 1, 2, 4, 5 untouched.
  - Infographic image content untouched.

Run:
    python enhance-slide-03.py
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
ORANGE = 'F59E0B'
PURPLE = '8B5CF6'
GREEN = '10B981'
RED = 'EF4444'


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


def remove_all_named(slide, name):
    n = 0
    for shape in list(slide.shapes):
        if shape.name == name:
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


# ---- Shape-type constants ----
SHAPE_TYPE_AUTO = 1
SHAPE_TYPE_PICTURE = 13


# ---------------------------------------------------------------------------
# Capture stable shape references BEFORE any new shapes are added.
# ---------------------------------------------------------------------------


def capture_shape_refs(slide):
    TOL = 25000  # EMU

    def find_at(left, top, width, height, shape_type_int=None):
        for shape in slide.shapes:
            if shape_type_int is not None:
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
    refs['vertical_bar'] = find_at(0.290, 0.200, 0.070, 0.669,
                                   shape_type_int=SHAPE_TYPE_AUTO)
    refs['b_mono'] = find_at(0.420, 0.120, 0.550, 0.550,
                             shape_type_int=SHAPE_TYPE_AUTO)
    refs['sih_wordmark'] = find_at(0.420, 0.620, 1.400, 0.300,
                                   shape_type_int=SHAPE_TYPE_AUTO)
    refs['subtitle'] = find_at(2.448, 0.145, 9.000, 0.300,
                               shape_type_int=SHAPE_TYPE_AUTO)
    refs['sih_logo'] = find_at(11.448, 0.021, 1.644, 0.848,
                               shape_type_int=SHAPE_TYPE_PICTURE)
    refs['diamond_accent'] = find_at(3.118, 0.562, 0.180, 0.180,
                                     shape_type_int=SHAPE_TYPE_AUTO)
    refs['title'] = find_at(3.298, 0.370, 8.150, 0.624,
                            shape_type_int=SHAPE_TYPE_AUTO)
    refs['infographic'] = find_at(0.004, 0.994, 13.326, 6.506,
                                  shape_type_int=SHAPE_TYPE_PICTURE)

    missing = [k for k, v in refs.items() if v is None]
    if missing:
        raise RuntimeError('Could not find these shapes by position: %s' % missing)
    return refs


def normalize_refs(slide, refs):
    """Restore expected chrome positions/sizes in case a prior broken run moved them."""
    if refs['vertical_bar'] is not None:
        refs['vertical_bar'].left = Inches(0.290)
        refs['vertical_bar'].top = Inches(0.200)
        refs['vertical_bar'].width = Inches(0.070)
        refs['vertical_bar'].height = Inches(0.669)
    if refs['title'] is not None:
        # Title was 24pt; bump in normalize so re-runs converge.
        set_run_font_size(refs['title'].text_frame, 24)
    if refs['b_mono'] is not None:
        set_run_font_size(refs['b_mono'].text_frame, 30)
    if refs['sih_wordmark'] is not None:
        set_run_font_size(refs['sih_wordmark'].text_frame, 13)


# ---------------------------------------------------------------------------
# Enhancement 1: Title + chrome refinement
# ---------------------------------------------------------------------------


def enhance_chrome(slide, refs):
    # 1a) Faint tint band behind the chrome row.
    remove_all_named(slide, 'Enhance_S3_TitleTintBand')
    band = add_shape_before(
        slide, refs['vertical_bar'],
        MSO_SHAPE.RECTANGLE,
        0.18, 0.05, 13.0, 0.90,
        name='Enhance_S3_TitleTintBand',
    )
    set_solid_fill(band, PANEL_BG_SOFT)
    remove_line(band)
    set_fill_alpha(band, 55)

    # 1b) Bump title font 24pt -> 32pt + letter-spacing 150.
    set_run_font_size(refs['title'].text_frame, 32)
    set_run_letter_spacing(refs['title'].text_frame, 150)

    # 1c) Bump B monogram 30pt -> 36pt.
    set_run_font_size(refs['b_mono'].text_frame, 36)

    # 1d) Subtle accent rule under the title (right under the chrome band).
    remove_all_named(slide, 'Enhance_S3_TitleAccentRule')
    rule = add_shape_before(
        slide, refs['infographic'],
        MSO_SHAPE.RECTANGLE,
        3.118, 0.95, 3.50, 0.025,
        name='Enhance_S3_TitleAccentRule',
    )
    set_solid_fill(rule, INK)
    remove_line(rule)

    # 1e) Tagline directly under the accent rule.
    remove_all_named(slide, 'Enhance_S3_TaglineText')
    tagline = add_textbox_before(
        slide, refs['infographic'],
        3.118, 0.97, 8.50, 0.32,
        name='Enhance_S3_TaglineText',
    )
    tf = tagline.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = 'End-to-end air-gapped pipeline  -  FT-Transformer  -  GNN risk scoring'
    r.font.name = 'Arial'
    r.font.size = Pt(11)
    r.font.italic = True
    r.font.color.rgb = RGBColor.from_string(SUBTITLE)


# ---------------------------------------------------------------------------
# Enhancement 2: Frame the infographic image
# ---------------------------------------------------------------------------


def enhance_image_frame(slide, refs):
    img = refs['infographic']

    # 2a) Outer shadow on the image (so it lifts off the slide).
    add_outer_shadow(img, blur_pt=10, offset_pt=3, direction='downRight',
                     opacity_pct=18, hex_color='1F3864')

    # 2b) Thick ink-blue border framing the image (sits on top of the image).
    #     Slightly inset so the border itself is fully visible. Use a
    #     stronger navy color so it reads against the image's own colored
    #     panels.
    frame_inset = 0.03
    frame_x = 0.004 + frame_inset
    frame_y = 0.994 + frame_inset
    frame_w = 13.326 - 2 * frame_inset
    frame_h = 6.506 - 2 * frame_inset
    remove_all_named(slide, 'Enhance_S3_ImageBorder')
    border = add_shape_after(
        slide, img,
        MSO_SHAPE.RECTANGLE,
        frame_x, frame_y, frame_w, frame_h,
        name='Enhance_S3_ImageBorder',
    )
    # Transparent fill, thick navy line (3pt).
    border.fill.background()
    set_line_color(border, NAVY, width_pt=3.0)

    # 2c) Ink-blue "FIG. 1 - System Architecture" pip label on top-left.
    pip_x = 0.18
    pip_y = 1.10
    pip_w = 2.40
    pip_h = 0.32
    remove_all_named(slide, 'Enhance_S3_FigPipBg')
    pip_bg = add_shape_after(
        slide, img,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        pip_x, pip_y, pip_w, pip_h,
        name='Enhance_S3_FigPipBg',
    )
    set_solid_fill(pip_bg, INK)
    remove_line(pip_bg)
    set_prst_geom(pip_bg, 'roundRect', adj_pct=50)

    remove_all_named(slide, 'Enhance_S3_FigPipText')
    pip_text = add_textbox_after(
        slide, img,
        pip_x, pip_y, pip_w, pip_h,
        name='Enhance_S3_FigPipText',
    )
    tf = pip_text.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = 'FIG. 1  -  SYSTEM ARCHITECTURE'
    r.font.name = 'Arial'
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(WHITE)
    set_run_letter_spacing(tf, 150)

    # 2d) L-shaped corner brackets at the four corners of the image frame.
    #     Larger and thicker so they read against the image content.
    corner_arm_len = 0.55
    corner_arm_thick = 0.10
    img_x = 0.004
    img_y = 0.994
    img_right = img_x + 13.326
    img_bottom = img_y + 6.506
    corners = [
        ('TL', img_x, img_y, 'right', 'down'),
        ('TR', img_right, img_y, 'left', 'down'),
        ('BL', img_x, img_bottom, 'right', 'up'),
        ('BR', img_right, img_bottom, 'left', 'up'),
    ]
    for name_suffix, cx, cy, h_orient, v_orient in corners:
        h_x = cx if h_orient == 'right' else cx - corner_arm_len
        h_y = cy if v_orient == 'down' else cy - corner_arm_thick
        v_x = cx if h_orient == 'right' else cx - corner_arm_thick
        v_y = cy if v_orient == 'down' else cy - corner_arm_len
        remove_all_named(slide, 'Enhance_S3_Corner_%s_H' % name_suffix)
        h_arm = add_shape_after(
            slide, img,
            MSO_SHAPE.RECTANGLE,
            h_x, h_y, corner_arm_len, corner_arm_thick,
            name='Enhance_S3_Corner_%s_H' % name_suffix,
        )
        set_solid_fill(h_arm, INK)
        remove_line(h_arm)
        remove_all_named(slide, 'Enhance_S3_Corner_%s_V' % name_suffix)
        v_arm = add_shape_after(
            slide, img,
            MSO_SHAPE.RECTANGLE,
            v_x, v_y, corner_arm_thick, corner_arm_len,
            name='Enhance_S3_Corner_%s_V' % name_suffix,
        )
        set_solid_fill(v_arm, INK)
        remove_line(v_arm)


# ---------------------------------------------------------------------------
# Enhancement 3: Background dot pattern (behind everything, in chrome area)
# ---------------------------------------------------------------------------


def enhance_background_pattern(slide, refs):
    """Add ~16 small low-opacity ink-blue dots scattered across the chrome area
    and along the edges of the slide. Inserted BEFORE the first chrome shape
    so they sit at the back of the slide."""
    target = refs['vertical_bar']

    dot_positions = [
        # Chrome area dots
        (3.00, 0.10, 0.05, 8),
        (5.50, 0.05, 0.04, 6),
        (8.00, 0.10, 0.05, 8),
        (10.50, 0.05, 0.04, 6),
        (1.80, 0.55, 0.05, 8),
        (2.40, 0.55, 0.04, 6),
        # Body area dots (mostly near edges so they don't fight the infographic)
        (0.20, 1.40, 0.05, 8),
        (13.10, 1.40, 0.05, 8),
        (0.20, 3.50, 0.04, 6),
        (13.10, 3.50, 0.04, 6),
        (0.20, 5.00, 0.05, 8),
        (13.10, 5.00, 0.05, 8),
        (0.20, 6.50, 0.04, 6),
        (13.10, 6.50, 0.04, 6),
        # A few chrome-area accents
        (0.85, 0.05, 0.04, 6),
        (11.00, 0.40, 0.04, 6),
    ]
    for i, (x, y, sz, op) in enumerate(dot_positions):
        name = 'Enhance_S3_BgDot_%d' % (i + 1)
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

    # Vertical accent stripes on the very edges.
    remove_all_named(slide, 'Enhance_S3_LeftEdgeStripe')
    left_stripe = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        0.0, 0.0, 0.10, 7.5,
        name='Enhance_S3_LeftEdgeStripe',
    )
    set_solid_fill(left_stripe, INK)
    remove_line(left_stripe)
    set_fill_alpha(left_stripe, 18)

    remove_all_named(slide, 'Enhance_S3_RightEdgeStripe')
    right_stripe = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        13.233, 0.0, 0.10, 7.5,
        name='Enhance_S3_RightEdgeStripe',
    )
    set_solid_fill(right_stripe, INK)
    remove_line(right_stripe)
    set_fill_alpha(right_stripe, 18)


# ---------------------------------------------------------------------------
# Enhancement 4: Numbered section markers along the right side of the image
# ---------------------------------------------------------------------------


def enhance_section_markers(slide, refs):
    """Add 6 small numbered markers (1..6) along the right edge of the image,
    hinting at the numbered sections in the infographic. Each marker is a
    small ink-blue circle with a white bold number."""
    img = refs['infographic']
    # Approximate vertical centerline of each numbered section, from top-right
    # column of the infographic (1..6 stacked along the right).
    # These positions mirror the rough placement of the numbered steps inside
    # the image.
    section_positions = [
        ('1', 1.65, INK),
        ('2', 2.55, INK),
        ('3', 3.40, INK),
        ('4', 4.40, ORANGE),
        ('5', 5.40, PURPLE),
        ('6', 6.30, GREEN),
    ]
    marker_radius = 0.18
    # Place just to the RIGHT of the image, outside the slide -- but the
    # image already fills the slide width. So place ON the image at the far
    # right, where the infographic's own margin sits.
    marker_x = 12.85
    for label, cy, color in section_positions:
        name_bg = 'Enhance_S3_SectionMarker_%s' % label
        name_text = 'Enhance_S3_SectionMarkerText_%s' % label
        remove_all_named(slide, name_bg)
        bg = add_shape_after(
            slide, img,
            MSO_SHAPE.OVAL,
            marker_x, cy - marker_radius / 2.0, marker_radius, marker_radius,
            name=name_bg,
        )
        set_solid_fill(bg, color)
        remove_line(bg)
        remove_all_named(slide, name_text)
        txt = add_textbox_after(
            slide, img,
            marker_x, cy - marker_radius / 2.0, marker_radius, marker_radius,
            name=name_text,
        )
        tf = txt.text_frame
        tf.margin_left = Inches(0)
        tf.margin_right = Inches(0)
        tf.margin_top = Inches(0)
        tf.margin_bottom = Inches(0)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        r = p.add_run()
        r.text = label
        r.font.name = 'Arial'
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)


# ---------------------------------------------------------------------------
# Enhancement 5: Footer overlay
# ---------------------------------------------------------------------------


def enhance_footer(slide, refs):
    """Add a footer bar at the bottom of the slide, overlaying the bottom
    portion of the infographic. Footer is a soft tint band with a left
    diamond + label + page number on the right."""
    img = refs['infographic']

    footer_y = 7.08
    footer_h = 0.34

    # Footer tint band.
    remove_all_named(slide, 'Enhance_S3_FooterBar')
    bar = add_shape_after(
        slide, img,
        MSO_SHAPE.RECTANGLE,
        0.10, footer_y, 13.13, footer_h,
        name='Enhance_S3_FooterBar',
    )
    set_solid_fill(bar, WHITE)
    set_line_color(bar, INK_LIGHT, width_pt=0.75)
    set_fill_alpha(bar, 88)

    # Diamond accent at left edge.
    remove_all_named(slide, 'Enhance_S3_FooterDiamond')
    diamond = add_shape_after(
        slide, img,
        MSO_SHAPE.DIAMOND,
        0.30, footer_y + (footer_h - 0.20) / 2.0, 0.20, 0.20,
        name='Enhance_S3_FooterDiamond',
    )
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    # Footer label "Technical Approach  -  SIH26146".
    remove_all_named(slide, 'Enhance_S3_FooterLabelText')
    lbl = add_textbox_after(
        slide, img,
        0.62, footer_y, 3.30, footer_h,
        name='Enhance_S3_FooterLabelText',
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
    r.text = 'Technical Approach  -  SIH26146'
    r.font.name = 'Arial'
    r.font.size = Pt(10)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(INK)
    set_run_letter_spacing(tf, 100)

    # Separator dot in middle.
    remove_all_named(slide, 'Enhance_S3_FooterSepDot')
    sep = add_shape_after(
        slide, img,
        MSO_SHAPE.OVAL,
        4.00, footer_y + footer_h / 2.0 - 0.04, 0.08, 0.08,
        name='Enhance_S3_FooterSepDot',
    )
    set_solid_fill(sep, INK)
    remove_line(sep)

    # Submission caption in middle.
    remove_all_named(slide, 'Enhance_S3_FooterSubmission')
    cap = add_textbox_after(
        slide, img,
        4.20, footer_y, 4.50, footer_h,
        name='Enhance_S3_FooterSubmission',
    )
    tf = cap.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = '@SIH Idea submission - Template'
    r.font.name = 'Arial'
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor.from_string(SUBTITLE)

    # Page number on the right.
    remove_all_named(slide, 'Enhance_S3_PageNumText')
    pg = add_textbox_after(
        slide, img,
        12.60, footer_y, 0.65, footer_h,
        name='Enhance_S3_PageNumText',
    )
    tf = pg.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.RIGHT
    r = p.add_run()
    r.text = '03'
    r.font.name = 'Arial'
    r.font.size = Pt(13)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(INK)


# ---------------------------------------------------------------------------
# Post-fix: z-order repair
# ---------------------------------------------------------------------------


def fix_infographic_zorder(slide, refs):
    """Move the infographic (Picture 10) to right AFTER the title shape in
    spTree. This restores its original z-position relative to the chrome
    and ensures all decorative shapes (border, corners, pip, footer, section
    markers) that were added via addprevious/addnext on it end up rendering
    ON TOP of the infographic, not behind it.

    Without this fix, python-pptx leaves the image at the END of spTree,
    which means later-in-spTree wins for z-order, and the image hides all
    our new decorations.
    """
    img = refs['infographic']
    title = refs['title']
    img_elem = img._element
    title_elem = title._element
    parent = img_elem.getparent()
    if parent is None or parent is not title_elem.getparent():
        return
    # Remove from current position and insert right after title.
    parent.remove(img_elem)
    title_elem.addnext(img_elem)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print('Opening:', DECK_PATH)
    prs = Presentation(DECK_PATH)
    slide = prs.slides[2]
    print('Slide 3 shapes before cleanup:', len(slide.shapes))

    # Remove any stale Enhance_S3_* shapes from prior runs.
    stale = 0
    for shape in list(slide.shapes):
        if shape.name.startswith('Enhance_S3_'):
            shape._element.getparent().remove(shape._element)
            stale += 1
    print('Removed %d stale Enhance_S3_* shapes' % stale)
    print('Slide 3 shapes after cleanup:', len(slide.shapes))

    refs = capture_shape_refs(slide)
    print('Captured refs.')
    print('  vertical_bar:', refs['vertical_bar'].name)
    print('  title:', refs['title'].name, '->', refs['title'].text_frame.text)
    print('  infographic:', refs['infographic'].name,
          'at', refs['infographic'].left / 914400.0,
          refs['infographic'].top / 914400.0)

    normalize_refs(slide, refs)
    print('Normalized refs')

    print('  -> Enhance 1: Chrome (title + tagline + accent rule)')
    enhance_chrome(slide, refs)

    print('  -> Enhance 2: Image frame (border + pip + corner brackets + shadow)')
    enhance_image_frame(slide, refs)

    print('  -> Enhance 3: Background pattern + edge stripes')
    enhance_background_pattern(slide, refs)

    print('  -> Enhance 4: Numbered section markers')
    enhance_section_markers(slide, refs)

    print('  -> Enhance 5: Footer overlay')
    enhance_footer(slide, refs)

    # CRITICAL post-fix: the infographic (Picture 10) was originally the
    # LAST shape in spTree. After adding ~50 new decorative shapes via
    # addprevious/addnext, python-pptx leaves Picture 10 at the END of
    # spTree, which means it renders ON TOP of all new shapes (and hides
    # them, since they overlap spatially). To fix this, move Picture 10
    # to its original z-position: right after the chrome shapes (the
    # title textbox), so all our new decorative shapes render on top.
    print('  -> Post-fix: move infographic to its original z-position')
    fix_infographic_zorder(slide, refs)

    print('Slide 3 shapes after:', len(slide.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()
