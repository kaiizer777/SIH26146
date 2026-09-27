"""Fix slide 1 regressions (v2 - robust name-based updates):
  1. Re-assert Card 1 text content/styling (Problem Statement ID: 26146).
  2. Move card icons OUT of the text frame area. Shrink text frame width
     AND reposition icons to the far-right of each card, vertically centered.

Idempotent: Enhance_CardIcon_* shapes are removed first, then re-added.
"""
import os
import sys

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Inches, Pt

DECK = r"C:\Users\bari2\Desktop\SIH26146\docs\proposed-solution-slide\slides\output\SIH26146_PPT_combined.pptx"

NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'

INK = '2563EB'
INK_LIGHT = 'BFDBFE'
TEXT_PRIMARY = '0F172A'

# (shape name, label, search_substring, value)
CARD_SHAPES = [
    ("Text 11", "Problem Statement ID",   "Problem Statement ID",   "26146"),
    ("Text 15", "Problem Statement Title","Title",                  "AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic"),
    ("Text 19", "Theme",                  "Theme",                  "Blockchain & Cybersecurity"),
    ("Text 23", "PS Category",            "PS Category",            "Software"),
    ("Text 27", "Team ID",                "Team ID",                ""),
    ("Text 31", "Team Name",              "Team Name",              "AlertX"),
]

CARD_TOPS = (3.30, 3.86, 4.42, 4.98, 5.54, 6.10)

ICON_KINDS = [
    MSO_SHAPE.OVAL,
    MSO_SHAPE.RECTANGLE,
    MSO_SHAPE.CHEVRON,
    MSO_SHAPE.DIAMOND,
    MSO_SHAPE.ISOSCELES_TRIANGLE,
    MSO_SHAPE.HEXAGON,
]

# Move icons OUT of the card into the gap between the cards (right edge
# x=8.00) and the Bitcoin hex panel (left edge x=8.40). This keeps the card
# text frame full-width (no wrap on long titles) and avoids icon-on-text
# overlap entirely.
NEW_ICON_SIZE_IN = 0.20
NEW_ICON_X_IN = 8.10  # gap center between card edge (8.00) and panel (8.40)
NEW_TEXT_FRAME_W_IN = 6.95  # unchanged: keep original text frame width


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


def set_solid_fill(shape, hex_color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(hex_color)


def set_line_color(shape, hex_color, width_pt=None):
    shape.line.color.rgb = RGBColor.from_string(hex_color)
    if width_pt is not None:
        shape.line.width = Pt(width_pt)


def remove_line(shape):
    try:
        shape.line.fill.background()
    except Exception:
        pass


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


def set_card_text(text_frame, label, value):
    """Re-author text frame: bold label + regular value, color 0F172A, 12pt."""
    text_frame.clear()
    p = text_frame.paragraphs[0]
    p.alignment = 1  # LEFT
    r1 = p.add_run()
    r1.text = label + ":  "
    r1.font.name = 'Arial'
    r1.font.size = Pt(12)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor.from_string(TEXT_PRIMARY)
    if value:
        r2 = p.add_run()
        r2.text = value
        r2.font.name = 'Arial'
        r2.font.size = Pt(12)
        r2.font.bold = False
        r2.font.color.rgb = RGBColor.from_string(TEXT_PRIMARY)


def main():
    print("Opening:", DECK)
    prs = Presentation(DECK)
    slide1 = prs.slides[0]

    # ---- 1) Re-author text content + size for all 6 card texts ----
    for i, (shape_name, label, _search, value) in enumerate(CARD_SHAPES):
        shape = find_shape_by_name(slide1, shape_name)
        if shape is None:
            raise RuntimeError("Card %d shape %s not found" % (i + 1, shape_name))
        # Resize/reposition first (BEFORE clear, since clear() may invalidate).
        shape.left = Inches(0.95)
        shape.top = Inches(CARD_TOPS[i])
        shape.width = Inches(NEW_TEXT_FRAME_W_IN)
        shape.height = Inches(0.50)
        # Re-author text with primary color.
        set_card_text(shape.text_frame, label, value)
        print("  Card %d (%s) text re-authored: label=%r value=%r" % (
            i + 1, shape_name, label, value))
        # Verify
        actual = shape.text_frame.text
        print("    -> actual text: %r" % actual)
        actual_w = shape.width
        print("    -> width: %.3f in" % (actual_w / 914400.0))

    # ---- 2) Remove and re-add icons at new positions ----
    for i in range(6):
        top = CARD_TOPS[i]
        body = None
        for shape in slide1.shapes:
            try:
                if (abs(int(shape.left) - Inches(0.50)) < Inches(0.01) and
                        abs(int(shape.top) - Inches(top)) < Inches(0.01) and
                        shape.shape_type == 1):
                    body = shape
                    break
            except Exception:
                pass
        if body is None:
            raise RuntimeError("Card %d body not found" % (i + 1))

        remove_all_named(slide1, 'Enhance_CardIcon_%d' % (i + 1))

        icon_x = NEW_ICON_X_IN
        icon_y = top + (0.50 - NEW_ICON_SIZE_IN) / 2.0
        icon = add_shape_before(
            slide1, body,
            ICON_KINDS[i],
            icon_x, icon_y, NEW_ICON_SIZE_IN, NEW_ICON_SIZE_IN,
            name='Enhance_CardIcon_%d' % (i + 1),
        )
        set_solid_fill(icon, INK_LIGHT)
        set_line_color(icon, INK, width_pt=0.75)
        print("  Card %d icon repositioned to (%.3f, %.3f) %.3fx%.3f" % (
            i + 1, icon_x, icon_y, NEW_ICON_SIZE_IN, NEW_ICON_SIZE_IN))

    prs.save(DECK)
    print("Saved:", DECK)


if __name__ == '__main__':
    main()
