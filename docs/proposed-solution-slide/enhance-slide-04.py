"""
Apply VISUALLY NOTICEABLE design enhancements to slide 4 (Feasibility and
Viability) of SIH26146_PPT_combined.pptx.

Strategy: in-place modification of existing shapes + append new decorative
shapes in correct z-order via lxml `addprevious` / `addnext`. All new shapes
are tagged with recognizable names (Enhance_S4_*) so re-runs replace, not
stack. Original chrome, card frames, title bars and bullet content are kept.

Slide 4 layout (from inspect-out.txt):
  - 6 cards in a 3x2 grid. Card frame indices [10, 17, 23, 30, 36, 42].
    Each card frame is a rounded rectangle (6.40 x 1.85 in) with a 1.5pt
    colored border. The colored title bar (h=0.42 in) sits at the top of
    each card and contains a title text frame with an emoji + title.
  - Card body bullet text frames sit below each title bar.
  - Standard SIH chrome at top (vertical bar, B monogram, SIH26146 wordmark,
    italic subtitle, SIH logo, diamond + title).
  - Footer at bottom with submission caption + page number.

Enhancements applied:

  E1 Title row refinement
     - Title size 24pt -> 30pt + letter-spacing 80.
     - B monogram 30pt -> 34pt.
     - Accent rule under title.
     - Tagline below the title: 'Operational - Economic - Regulatory
       viability for NTRO-grade deployment'.

  E2 Card redesign
     - Card border 1.5pt -> 2pt.
     - Outer shadow strengthened (blur 12pt, offset 3pt, opacity 18%).
     - Geometric icon (drawn as composed shapes) replaces the leading emoji
       in the title bar for each card.
     - Numbered badge '01'..'06' in a soft colored circle in the top-right
       corner of each card.
     - Title text frame widened / repositioned to sit cleanly after the
       icon, with leading emoji characters stripped so the icon is the
       visual anchor.

  E3 Background decoration
     - Faint dot pattern scattered around the cards.
     - Subtle vertical accent stripes at slide edges.

  E4 Footer chip
     - Ink-blue diamond + label 'Feasibility & Viability - SIH26146' on
       the left of the footer bar (matches slides 1, 2, 3).

Constraints honored:
  - Canvas 13.333 x 7.5 in.
  - ASCII-only Python string literals.
  - Slides 1, 2, 3, 5 untouched.
  - Card bullet text content preserved.
  - Idempotent re-runs converge to the same final state.

Run:
    python enhance-slide-04.py
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

# Card color palette (matches original borders/titles).
CARD_COLORS = [
    '2563EB',  # 0 Feasibility   - blue
    'EA580C',  # 1 Solutions     - orange
    'DC2626',  # 2 Viability     - red
    '7C3AED',  # 3 Use Cases     - purple
    '16A34A',  # 4 Challenges    - green
    '475569',  # 5 Supporting    - slate
]

# Lighter shades for the gradient overlay on title bars.
CARD_LIGHT = [
    '60A5FA',  # blue lighter
    'FB923C',  # orange lighter
    'F87171',  # red lighter
    'A78BFA',  # purple lighter
    '4ADE80',  # green lighter
    '94A3B8',  # slate lighter
]

CARD_TITLES = [
    'Feasibility',
    'Solutions',
    'Viability & Business Potential',
    'Use Cases',
    'Challenges',
    'Supporting Facts',
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
# Card layout map (matches inspect-out.txt positions).
# Frame indices are used only at capture time to grab stable references.
# ---------------------------------------------------------------------------

CARDS_LAYOUT = [
    {  # 0 Feasibility (blue, top-left)
        'frame_idx': 10,
        'title_bar_idx': 11,
        'title_text_idx': 12,
        'x': 0.200, 'y': 1.100,
        'color': CARD_COLORS[0],
        'light': CARD_LIGHT[0],
        'label': '01',
        'icon': 'gear',
    },
    {  # 1 Solutions (orange, top-right)
        'frame_idx': 17,
        'title_bar_idx': 18,
        'title_text_idx': 19,
        'x': 6.730, 'y': 1.100,
        'color': CARD_COLORS[1],
        'light': CARD_LIGHT[1],
        'label': '02',
        'icon': 'shield',
    },
    {  # 2 Viability (red, middle-left)
        'frame_idx': 23,
        'title_bar_idx': 24,
        'title_text_idx': 25,
        'x': 0.200, 'y': 3.050,
        'color': CARD_COLORS[2],
        'light': CARD_LIGHT[2],
        'label': '03',
        'icon': 'chart',
    },
    {  # 3 Use Cases (purple, middle-right)
        'frame_idx': 30,
        'title_bar_idx': 31,
        'title_text_idx': 32,
        'x': 6.730, 'y': 3.050,
        'color': CARD_COLORS[3],
        'light': CARD_LIGHT[3],
        'label': '04',
        'icon': 'people',
    },
    {  # 4 Challenges (green, bottom-left)
        'frame_idx': 36,
        'title_bar_idx': 37,
        'title_text_idx': 38,
        'x': 0.200, 'y': 5.000,
        'color': CARD_COLORS[4],
        'light': CARD_LIGHT[4],
        'label': '05',
        'icon': 'warning',
    },
    {  # 5 Supporting Facts (slate, bottom-right)
        'frame_idx': 42,
        'title_bar_idx': 43,
        'title_text_idx': 44,
        'x': 6.730, 'y': 5.000,
        'color': CARD_COLORS[5],
        'light': CARD_LIGHT[5],
        'label': '06',
        'icon': 'star',
    },
]


# ---------------------------------------------------------------------------
# Capture stable shape references BEFORE any new shapes are added.
# ---------------------------------------------------------------------------


def capture_shape_refs(slide):
    refs = {}
    refs['footer_bar'] = slide.shapes[0]
    refs['footer_text'] = slide.shapes[1]
    refs['page_num'] = slide.shapes[2]
    refs['vertical_bar'] = slide.shapes[3]
    refs['b_mono'] = slide.shapes[4]
    refs['sih_wordmark'] = slide.shapes[5]
    refs['subtitle'] = slide.shapes[6]
    refs['sih_logo'] = slide.shapes[7]
    refs['diamond'] = slide.shapes[8]
    refs['title'] = slide.shapes[9]
    # Card refs - capture by original index, then keep direct refs.
    refs['cards'] = []
    for layout in CARDS_LAYOUT:
        refs['cards'].append({
            'frame': slide.shapes[layout['frame_idx']],
            'title_bar': slide.shapes[layout['title_bar_idx']],
            'title_text': slide.shapes[layout['title_text_idx']],
            'x': layout['x'],
            'y': layout['y'],
            'color': layout['color'],
            'light': layout['light'],
            'label': layout['label'],
            'icon': layout['icon'],
        })
    return refs


def normalize_refs(slide, refs):
    """Restore expected chrome positions/sizes for re-run idempotency."""
    if refs.get('title') is not None:
        # Reset title font to 24pt so subsequent enhance_chrome bumps it.
        set_run_font_size(refs['title'].text_frame, 24)
    if refs.get('b_mono') is not None:
        set_run_font_size(refs['b_mono'].text_frame, 30)
    # Restore card border thickness to original 1.5pt.
    for card in refs['cards']:
        set_line_color(card['frame'], card['color'], width_pt=1.5)
    # Restore title text frame positions/sizes.
    original_title_positions = [
        (0.380, 1.120, 6.040, 0.380),
        (6.910, 1.120, 6.040, 0.380),
        (0.380, 3.070, 6.040, 0.380),
        (6.910, 3.070, 6.040, 0.380),
        (0.380, 5.020, 6.040, 0.380),
        (6.910, 5.020, 6.040, 0.380),
    ]
    for i, card in enumerate(refs['cards']):
        tt = card['title_text']
        x, y, w, h = original_title_positions[i]
        tt.left = Inches(x)
        tt.top = Inches(y)
        tt.width = Inches(w)
        tt.height = Inches(h)
        set_run_font_size(tt.text_frame, 14)


# ---------------------------------------------------------------------------
# Enhancement 1: Title row refinement (chrome)
# ---------------------------------------------------------------------------


def enhance_chrome(slide, refs):
    # 1a) Title 24pt -> 30pt + letter-spacing.
    set_run_font_size(refs['title'].text_frame, 30)
    set_run_letter_spacing(refs['title'].text_frame, 80)

    # 1b) B monogram 30pt -> 34pt.
    set_run_font_size(refs['b_mono'].text_frame, 34)

    # 1c) Accent rule under the title.
    remove_all_named(slide, 'Enhance_S4_TitleAccentRule')
    rule = add_shape_before(
        slide, refs['title'],
        MSO_SHAPE.RECTANGLE,
        3.364, 1.04, 1.30, 0.028,
        name='Enhance_S4_TitleAccentRule',
    )
    set_solid_fill(rule, INK)
    remove_line(rule)

    # 1d) Tagline directly below the accent rule.
    remove_all_named(slide, 'Enhance_S4_TaglineText')
    tagline = add_textbox_after(
        slide, refs['title'],
        4.70, 1.00, 8.50, 0.32,
        name='Enhance_S4_TaglineText',
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
    r.text = ('Operational  -  Economic  -  Regulatory viability for '
              'NTRO-grade deployment')
    r.font.name = 'Arial'
    r.font.size = Pt(11)
    r.font.italic = True
    r.font.color.rgb = RGBColor.from_string(SUBTITLE)


# ---------------------------------------------------------------------------
# Enhancement 2: Card redesign (border, shadow, icons, badges)
# ---------------------------------------------------------------------------


def strip_leading_emoji(text_frame):
    """Remove non-ASCII leading characters and any leading whitespace from
    the title text frame's first paragraph. Joins all runs, filters, then
    puts the cleaned string into the first run and clears the rest.
    Idempotent: if no leading emoji, this is a no-op.
    """
    if not text_frame.paragraphs:
        return
    p = text_frame.paragraphs[0]
    if not p.runs:
        return
    full_text = ''.join(r.text for r in p.runs)
    if not full_text:
        return
    # Quick path: no leading non-ASCII -> nothing to do.
    if all(ord(c) < 128 for c in full_text[:3]):
        return
    result = []
    started = False
    for c in full_text:
        if not started:
            if c.isascii() and not c.isspace():
                started = True
                result.append(c)
            # else: drop leading non-ASCII / whitespace
        else:
            result.append(c)
    cleaned = ''.join(result)
    p.runs[0].text = cleaned
    for r in p.runs[1:]:
        r.text = ''


def add_card_icon(slide, target_shape, card_idx, icon_type, color,
                  x, y, size):
    """Draw a geometric icon composed of simple shapes (circle / rectangle /
    polygon / triangle / star). The icon visually replaces the leading
    emoji in the title bar."""
    suffix = '_%d' % (card_idx + 1)

    # Background soft-circle behind the icon (gives it a "chip" feel).
    bg_name = 'Enhance_S4_IconBg%s' % suffix
    remove_all_named(slide, bg_name)
    bg = add_shape_after(
        slide, target_shape,
        MSO_SHAPE.OVAL,
        x, y, size, size,
        name=bg_name,
    )
    set_solid_fill(bg, WHITE)
    remove_line(bg)
    set_fill_alpha(bg, 30)

    if icon_type == 'gear':
        # Outer filled circle
        outer_name = 'Enhance_S4_IconGearOuter%s' % suffix
        remove_all_named(slide, outer_name)
        outer = add_shape_after(
            slide, target_shape,
            MSO_SHAPE.OVAL,
            x + 0.05, y + 0.05, size - 0.10, size - 0.10,
            name=outer_name,
        )
        set_solid_fill(outer, color)
        remove_line(outer)
        # Inner white circle (creates a ring / gear look)
        inner_name = 'Enhance_S4_IconGearInner%s' % suffix
        remove_all_named(slide, inner_name)
        inner = add_shape_after(
            slide, target_shape,
            MSO_SHAPE.OVAL,
            x + size * 0.30, y + size * 0.30,
            size * 0.40, size * 0.40,
            name=inner_name,
        )
        set_solid_fill(inner, WHITE)
        remove_line(inner)
    elif icon_type == 'shield':
        sh_name = 'Enhance_S4_IconShield%s' % suffix
        remove_all_named(slide, sh_name)
        sh = add_shape_after(
            slide, target_shape,
            MSO_SHAPE.PENTAGON,
            x + 0.04, y + 0.04, size - 0.08, size - 0.08,
            name=sh_name,
        )
        set_solid_fill(sh, color)
        remove_line(sh)
    elif icon_type == 'chart':
        # Three ascending vertical bars (Viability / dollar-chart).
        bar_w = size * 0.18
        gap = size * 0.05
        base_y = y + size - 0.07
        heights = [size * 0.30, size * 0.50, size * 0.72]
        for j, h in enumerate(heights):
            bar_name = 'Enhance_S4_IconChartBar%d%s' % (j, suffix)
            remove_all_named(slide, bar_name)
            bar = add_shape_after(
                slide, target_shape,
                MSO_SHAPE.RECTANGLE,
                x + 0.06 + j * (bar_w + gap),
                base_y - h,
                bar_w, h,
                name=bar_name,
            )
            set_solid_fill(bar, color)
            remove_line(bar)
    elif icon_type == 'people':
        # Three small circles in a triangle (1 top, 2 bottom).
        r = size * 0.16
        positions = [
            (x + size * 0.50 - r / 2, y + size * 0.15 - r / 2),
            (x + size * 0.27 - r / 2, y + size * 0.55 - r / 2),
            (x + size * 0.73 - r / 2, y + size * 0.55 - r / 2),
        ]
        for j, (cx, cy) in enumerate(positions):
            p_name = 'Enhance_S4_IconPeople%d%s' % (j, suffix)
            remove_all_named(slide, p_name)
            p = add_shape_after(
                slide, target_shape,
                MSO_SHAPE.OVAL,
                cx, cy, r, r,
                name=p_name,
            )
            set_solid_fill(p, color)
            remove_line(p)
    elif icon_type == 'warning':
        tr_name = 'Enhance_S4_IconWarning%s' % suffix
        remove_all_named(slide, tr_name)
        tr = add_shape_after(
            slide, target_shape,
            MSO_SHAPE.ISOSCELES_TRIANGLE,
            x + 0.04, y + 0.05, size - 0.08, size - 0.08,
            name=tr_name,
        )
        set_solid_fill(tr, color)
        remove_line(tr)
    elif icon_type == 'star':
        st_name = 'Enhance_S4_IconStar%s' % suffix
        remove_all_named(slide, st_name)
        st = add_shape_after(
            slide, target_shape,
            MSO_SHAPE.STAR_5_POINT,
            x + 0.04, y + 0.04, size - 0.08, size - 0.08,
            name=st_name,
        )
        set_solid_fill(st, color)
        remove_line(st)


def add_number_badge(slide, target_shape, card_idx, label, color,
                     x, y, size):
    """Add a small numbered badge (e.g. '01') in a colored circle in the
    top-right corner of the card."""
    suffix = '_%d' % (card_idx + 1)

    bg_name = 'Enhance_S4_BadgeBg%s' % suffix
    remove_all_named(slide, bg_name)
    bg = add_shape_after(
        slide, target_shape,
        MSO_SHAPE.OVAL,
        x, y, size, size,
        name=bg_name,
    )
    set_solid_fill(bg, color)
    remove_line(bg)
    set_fill_alpha(bg, 92)

    text_name = 'Enhance_S4_BadgeText%s' % suffix
    remove_all_named(slide, text_name)
    txt = add_textbox_after(
        slide, target_shape,
        x, y, size, size,
        name=text_name,
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
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor.from_string(WHITE)


def add_title_gradient(slide, target_shape, card_x, card_y, card_idx,
                       light_color):
    """Add a subtle lighter-shade overlay on the right ~35% of the title
    bar for a gradient feel."""
    suffix = '_%d' % (card_idx + 1)
    overlay_w = 2.20
    overlay_h = 0.42
    overlay_x = card_x + 6.40 - overlay_w
    overlay_y = card_y
    name = 'Enhance_S4_TitleGrad%s' % suffix
    remove_all_named(slide, name)
    overlay = add_shape_after(
        slide, target_shape,
        MSO_SHAPE.RECTANGLE,
        overlay_x, overlay_y, overlay_w, overlay_h,
        name=name,
    )
    set_solid_fill(overlay, light_color)
    remove_line(overlay)
    set_fill_alpha(overlay, 55)


def enhance_cards(slide, refs):
    for i, card in enumerate(refs['cards']):
        frame = card['frame']
        title_bar = card['title_bar']
        title_text = card['title_text']
        card_x = card['x']
        card_y = card['y']
        color = card['color']

        # 2a) Thicken card border 1.5pt -> 2pt.
        set_line_color(frame, color, width_pt=2.0)

        # 2b) Strengthen outer shadow (12pt blur, 3pt offset, 18% opacity).
        add_outer_shadow(frame, blur_pt=12, offset_pt=3, direction='down',
                         opacity_pct=18, hex_color='0F172A')

        # 2c) Strip leading emoji from title text (idempotent).
        strip_leading_emoji(title_text.text_frame)

        # 2d) Reposition title text frame to sit cleanly after the icon.
        # Icon takes 0.30 in at x = card_x + 0.18 with 0.07 in padding.
        new_x = card_x + 0.60
        new_w = 6.40 - (new_x - card_x) - 0.55  # leave room for badge
        title_text.left = Inches(new_x)
        title_text.width = Inches(new_w)

        # 2e) Add geometric icon at start of title bar.
        icon_x = card_x + 0.18
        icon_y = card_y + 0.06
        icon_size = 0.30
        add_card_icon(slide, frame, i, card['icon'], color,
                      icon_x, icon_y, icon_size)

        # 2f) Numbered badge in the top-right corner of the title bar.
        badge_size = 0.32
        badge_x = card_x + 6.40 - badge_size - 0.18
        badge_y = card_y + 0.05
        add_number_badge(slide, frame, i, card['label'], color,
                         badge_x, badge_y, badge_size)

        # 2g) Subtle gradient overlay on the title bar (right portion).
        add_title_gradient(slide, frame, card_x, card_y, i, card['light'])


# ---------------------------------------------------------------------------
# Enhancement 3: Background dot pattern + edge stripes
# ---------------------------------------------------------------------------


def enhance_background(slide, refs):
    target = refs['vertical_bar']
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
        (0.10, 6.80, 0.06, 10),
        (13.18, 6.80, 0.06, 10),
        (6.65, 0.95, 0.05, 8),
        (6.65, 7.00, 0.05, 8),
    ]
    for i, (x, y, sz, op) in enumerate(dot_positions):
        name = 'Enhance_S4_BgDot_%d' % (i + 1)
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
    remove_all_named(slide, 'Enhance_S4_LeftEdgeStripe')
    ls = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        0.0, 0.0, 0.07, 7.5,
        name='Enhance_S4_LeftEdgeStripe',
    )
    set_solid_fill(ls, INK)
    remove_line(ls)
    set_fill_alpha(ls, 22)

    # Right edge stripe.
    remove_all_named(slide, 'Enhance_S4_RightEdgeStripe')
    rs = add_shape_before(
        slide, target,
        MSO_SHAPE.RECTANGLE,
        13.263, 0.0, 0.07, 7.5,
        name='Enhance_S4_RightEdgeStripe',
    )
    set_solid_fill(rs, INK)
    remove_line(rs)
    set_fill_alpha(rs, 22)


# ---------------------------------------------------------------------------
# Enhancement 4: Footer chip (diamond + label)
# ---------------------------------------------------------------------------


def enhance_footer(slide, refs):
    target = refs['page_num']

    # Diamond accent on the left of the footer.
    remove_all_named(slide, 'Enhance_S4_FooterDiamond')
    diamond = add_shape_after(
        slide, target,
        MSO_SHAPE.DIAMOND,
        0.30, 6.951 + (0.55 - 0.20) / 2.0, 0.20, 0.20,
        name='Enhance_S4_FooterDiamond',
    )
    set_solid_fill(diamond, INK)
    remove_line(diamond)

    # Footer label.
    remove_all_named(slide, 'Enhance_S4_FooterLabel')
    label = add_textbox_after(
        slide, target,
        0.60, 6.951, 4.20, 0.55,
        name='Enhance_S4_FooterLabel',
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
    r.text = 'Feasibility & Viability  -  SIH26146'
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
    slide = prs.slides[3]
    print('Slide 4 shapes before cleanup:', len(slide.shapes))

    # Remove any stale Enhance_S4_* shapes from prior runs.
    stale = 0
    for shape in list(slide.shapes):
        if shape.name.startswith('Enhance_S4_'):
            shape._element.getparent().remove(shape._element)
            stale += 1
    print('Removed %d stale Enhance_S4_* shapes' % stale)
    print('Slide 4 shapes after cleanup:', len(slide.shapes))

    refs = capture_shape_refs(slide)
    print('Captured refs.')

    normalize_refs(slide, refs)
    print('Normalized refs.')

    print('  -> Enhance 1: Chrome (title + tagline + accent rule + monogram)')
    enhance_chrome(slide, refs)

    print('  -> Enhance 2: Cards (border + shadow + icons + badges + gradient)')
    enhance_cards(slide, refs)

    print('  -> Enhance 3: Background pattern + edge stripes')
    enhance_background(slide, refs)

    print('  -> Enhance 4: Footer chip')
    enhance_footer(slide, refs)

    print('Slide 4 shapes after:', len(slide.shapes))
    prs.save(DECK_PATH)
    print('Wrote:', DECK_PATH)


if __name__ == '__main__':
    main()
