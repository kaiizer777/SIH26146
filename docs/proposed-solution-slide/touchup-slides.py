"""
Apply subtle UI polish touchups to:
  - Slide 1 (cover)  -> outer shadows on 6 bullet cards + Bitcoin hex panel,
                          border 0.75 -> 1.0 on the 6 bullet cards, and a
                          thin lighter highlight strip on the gold accent.
  - Slide 4 (Feasibility) -> outer shadow on all 6 card frames and a small
                                line-spacing bump on bullet text frames.

Strict policy:
  - ASCII-only Python literals.
  - No layout changes (positions / sizes unchanged).
  - No text changes.
  - No color changes (the FBBF24 highlight is an explicit spec exception).
  - Slides 2, 3, 5 are not touched.
  - Idempotent: re-running the script produces the same final state.

Run:
    python touchup-slides.py
"""

import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from lxml import etree  # noqa: E402

from pptx import Presentation  # noqa: E402
from pptx.dml.color import RGBColor  # noqa: E402
from pptx.enum.shapes import MSO_SHAPE_TYPE  # noqa: E402
from pptx.util import Emu, Inches, Pt  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "slides", "output")
DECK_PATH = os.path.join(OUT_DIR, "SIH26146_PPT_combined.pptx")

# Namespaces
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

QN_SP_PR = "{%s}spPr" % NS_P
QN_EFFECT_LIST = "{%s}effectLst" % NS_A
QN_OUTER_SHDW = "{%s}outerShdw" % NS_A
QN_SRGB = "{%s}srgbClr" % NS_A
QN_ALPHA = "{%s}alpha" % NS_A
QN_PRST_GEO = "{%s}prstGeom" % NS_A
QN_SOLID = "{%s}solidFill" % NS_A
QN_OFF = "{%s}noFill" % NS_A

# OOXML helpers (1 EMU = 1/914400 inch; 1 pt = 12700 EMU)


def emu_from_pt(pt_value):
    return int(round(pt_value * 12700))


def emu_from_in(inch_value):
    return int(round(inch_value * 914400))


# ---------------------------------------------------------------------------
# OOXML helpers
# ---------------------------------------------------------------------------


def make_outer_shadow_xml(blur_pt, offset_pt, direction, opacity_pct, hex_color):
    """Return an <a:outerShdw> XML string for inlining into effectLst.

    direction: 'down' (90 deg) -> '5400000', 'downRight' (45 deg) -> '2700000',
               'right' (0 deg) -> '0'.
    opacity_pct: 0-100 (integer).
    """
    if direction == "down":
        dir_attr = "5400000"
    elif direction == "downRight":
        dir_attr = "2700000"
    elif direction == "right":
        dir_attr = "0"
    else:
        dir_attr = "5400000"
    blur_emu = emu_from_pt(blur_pt)
    dist_emu = emu_from_pt(offset_pt)
    alpha_val = int(opacity_pct * 100)  # 8000 == 80%
    return (
        '<a:outerShdw xmlns:a="%s" '
        'blurRad="%d" dist="%d" dir="%s" algn="ctr" rotWithShape="0">'
        '<a:srgbClr val="%s"><a:alpha val="%d"/></a:srgbClr>'
        '</a:outerShdw>'
        % (NS_A, blur_emu, dist_emu, dir_attr, hex_color, alpha_val)
    )


def has_outer_shadow(sp_pr_elem):
    """Return True if spPr already contains an outerShdw."""
    if sp_pr_elem is None:
        return False
    effect_lst = sp_pr_elem.find(QN_EFFECT_LIST)
    if effect_lst is None:
        return False
    for child in effect_lst:
        if child.tag == QN_OUTER_SHDW:
            return True
    return False


def apply_outer_shadow(shape, blur_pt, offset_pt, direction, opacity_pct, hex_color):
    """Add (or replace) an outer drop shadow on a shape.

    Replaces any existing <a:outerShdw> child to keep the effect idempotent.
    """
    sp_pr = shape._element.find(QN_SP_PR)
    if sp_pr is None:
        return False

    effect_lst = sp_pr.find(QN_EFFECT_LIST)
    if effect_lst is None:
        effect_lst = etree.SubElement(sp_pr, QN_EFFECT_LIST)
        # Move effectLst to the correct OOXML position: after ln (if any),
        # before scene3d / sp3d / extLst. python-pptx appends to end by
        # default which happens to be valid in most renderers, so we keep it
        # simple and stay at the end.

    # Remove any existing outerShdw to keep idempotent
    for child in list(effect_lst):
        if child.tag == QN_OUTER_SHDW:
            effect_lst.remove(child)

    new_xml = make_outer_shadow_xml(blur_pt, offset_pt, direction, opacity_pct, hex_color)
    new_shadow = etree.fromstring(new_xml)
    effect_lst.append(new_shadow)
    return True


def set_border_pt(shape, width_pt):
    """Force a shape's border width (in points). Idempotent."""
    ln = shape.line
    ln.width = Pt(width_pt)


# ---------------------------------------------------------------------------
# Slide 1 touchups
# ---------------------------------------------------------------------------


def touchup_slide1(slide):
    """Slide 1 (cover) -- subtle visual refinements.

    - 6 bullet cards (white) at indices [9, 13, 17, 21, 25, 29]: outer shadow
      + border 0.75 -> 1.0.
    - Bitcoin hex outer panel (index 33): outer shadow (deeper).
    - Gold accent strip (index 5): add a thin (0.02 in) FBBF24 highlight band
      overlaying the top edge of the strip (idempotent).
    """
    bullets_indices = [9, 13, 17, 21, 25, 29]
    for idx in bullets_indices:
        card = slide.shapes[idx]
        apply_outer_shadow(
            card,
            blur_pt=8,
            offset_pt=2,
            direction="down",
            opacity_pct=8,
            hex_color="000000",
        )
        set_border_pt(card, 1.0)

    hex_panel = slide.shapes[33]
    apply_outer_shadow(
        hex_panel,
        blur_pt=12,
        offset_pt=2,
        direction="down",
        opacity_pct=12,
        hex_color="000000",
    )

    # Gold accent strip: shape at y=1.45 in, h=0.07 in, x=0, w=13.333 in.
    # Add a thin 0.02 in lighter highlight overlay at the top edge.
    add_gold_highlight(slide)


def add_gold_highlight(slide):
    """Idempotently add a 0.02 in FBBF24 highlight band at the top of the
    gold accent strip on slide 1.

    The highlight sits at x=0, y=1.45, w=13.333, h=0.02 (overlay on the upper
    portion of the existing F59E0B strip). If a highlight rect already exists
    at these coordinates with the correct color, the function no-ops.
    """
    target_x = emu_from_in(0.0)
    target_y = emu_from_in(1.45)
    target_w = emu_from_in(13.333)
    target_h = emu_from_in(0.02)
    HIGHLIGHT_HEX = "FBBF24"

    # Look for an existing highlight strip (idempotent detection)
    for shape in slide.shapes:
        if shape.shape_type != MSO_SHAPE_TYPE.AUTO_SHAPE:
            continue
        if (shape.left == target_x and shape.top == target_y
                and shape.width == target_w and shape.height == target_h):
            try:
                fill = shape.fill
                if fill.type == 1 and str(fill.fore_color.rgb) == HIGHLIGHT_HEX:
                    return  # already present
            except Exception:
                pass
            # Replace color of any existing rect at these coords
            try:
                shape.fill.solid()
                shape.fill.fore_color.rgb = RGBColor.from_string(HIGHLIGHT_HEX)
                shape.line.fill.background()
                return
            except Exception:
                pass
            # If we couldn't reuse, fall through and add fresh below.

    # Add a fresh highlight rect (no border, solid FBBF24 fill)
    rect = slide.shapes.add_shape(
        1,  # MSO_SHAPE.RECTANGLE
        Inches(0.0), Inches(1.45), Inches(13.333), Inches(0.02),
    )
    rect.fill.solid()
    rect.fill.fore_color.rgb = RGBColor.from_string(HIGHLIGHT_HEX)
    rect.line.fill.background()
    # Tag with a recognizable name so future runs can find it cleanly.
    try:
        rect.name = "GoldAccentHighlight"
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Slide 4 touchups
# ---------------------------------------------------------------------------


def touchup_slide4(slide):
    """Slide 4 (Feasibility) -- subtle visual refinements.

    - 6 card outline shapes at indices [10, 17, 23, 30, 36, 42]: outer shadow.
    - Card body bullet text frames: bump line spacing to 1.15 for breathing
      room. We touch only the body text frames (not title bars), preserving
      positions and content.
    """
    card_frame_indices = [10, 17, 23, 30, 36, 42]
    for idx in card_frame_indices:
        apply_outer_shadow(
            slide.shapes[idx],
            blur_pt=8,
            offset_pt=2,
            direction="down",
            opacity_pct=10,
            hex_color="000000",
        )

    bump_card_body_line_spacing(slide)


def bump_card_body_line_spacing(slide):
    """Increase line spacing (lineSpacing -> 1.15) on card body bullet text.

    Cardinality: each card has 3-4 body textboxes filled with bullets. We
    target textboxes whose vertical range falls inside the bottom 80% of a
    card frame and whose vertical anchor is top (i.e. body content). Title
    bars are excluded because they sit at the top of the card.
    """
    # Cards on slide 4 are at the outer-frame indices [10, 17, 23, 30, 36, 42]
    card_frame_indices = [10, 17, 23, 30, 36, 42]
    target_card_rects = []
    for idx in card_frame_indices:
        shp = slide.shapes[idx]
        # (left, top, right, bottom) in EMU
        target_card_rects.append((
            shp.left, shp.top, shp.left + shp.width, shp.top + shp.height,
        ))

    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        # Skip the title-bar text (it has vertical_anchor MIDDLE on a small
        # height textbox near the top of each card). Detection: textbox
        # whose top sits within ~0.45 in of the card top and whose height is
        # ~0.38 in is the title.
        try:
            t_left = shape.left
            t_top = shape.top
            t_right = t_left + shape.width
            t_bottom = t_top + shape.height
        except Exception:
            continue

        is_body = False
        for (l, t, r, b) in target_card_rects:
            # Body bbox: inside card horizontally
            if not (t_left >= l - 1000 and t_right <= r + 1000):
                continue
            # Body starts well below the card top (below the title bar)
            title_bar_h_emu = emu_from_in(0.50)
            if t_top < t + title_bar_h_emu:
                continue
            # Body sits inside the card vertically
            if t_top >= t and t_bottom <= b:
                is_body = True
                break

        if not is_body:
            continue

        # Apply 1.15 line spacing to all paragraphs in this body text frame.
        tf = shape.text_frame
        for p in tf.paragraphs:
            p.line_spacing = 1.15


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    prs = Presentation(DECK_PATH)
    print("Total slides:", len(prs.slides))

    # Slide 1
    slide1 = prs.slides[0]
    print("Touching up slide 1 (cover) ...")
    touchup_slide1(slide1)

    # Slide 4 (Feasibility)
    slide4 = prs.slides[3]
    print("Touching up slide 4 (Feasibility) ...")
    touchup_slide4(slide4)

    prs.save(DECK_PATH)
    print("Wrote:", DECK_PATH)
    for i, s in enumerate(prs.slides, 1):
        first = ""
        for shp in s.shapes:
            if shp.has_text_frame and shp.text_frame.text.strip():
                first = shp.text_frame.text.strip().splitlines()[0][:60]
                break
        print("  Slide %d: %s" % (i, first))


if __name__ == "__main__":
    main()
