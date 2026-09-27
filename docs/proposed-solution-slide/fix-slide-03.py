"""
Fix slide 3 (combined.slides[2]) of SIH26146_PPT_combined.pptx.

Two issues described by the user:
  1. A pip label "FIG. 1 - SYSTEM ARCHITECTURE" overlaps with an italic tagline
     ("End-to-end air-gapped pipeline ...").
  2. Title "TECHNICAL APPROACH" may be too big (32pt instead of 24pt).

Fix:
  - Remove the tagline shape (find by text "End-to-end air-gapped").
  - Remove any Enhance_S3_Tagline* shape.
  - Set the title "TECHNICAL APPROACH" font size to 24pt.
  - Keep the "FIG. 1" pip label (don't touch the pip background or text).
  - Do NOT touch slides 1, 2, 4, 5.

Behavior:
  - Idempotent: if a target shape does not exist, it is silently skipped and
    reported in the run log. Safe to re-run.
  - Only slide 3 (0-indexed slides[2]) is modified.

Run:
    python fix-slide-03.py
"""

import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pptx import Presentation
from pptx.util import Pt


HERE = os.path.dirname(os.path.abspath(__file__))
DECK_PATH = os.path.join(HERE, 'slides', 'output', 'SIH26146_PPT_combined.pptx')

# --- Constants used for matching ---
TAGLINE_TEXT_NEEDLE = 'End-to-end air-gapped'
TITLE_TEXT_NEEDLE = 'TECHNICAL APPROACH'
TAGLINE_SHAPE_PREFIXES = (
    'Enhance_S3_Tagline',  # covers Enhance_S3_TaglineText, Enhance_S3_TaglineBg, etc.
)


def _shape_text(shape):
    if not shape.has_text_frame:
        return ''
    chunks = []
    for p in shape.text_frame.paragraphs:
        for r in p.runs:
            chunks.append(r.text)
    return ''.join(chunks)


def _set_run_font_size(text_frame, size_pt):
    for para in text_frame.paragraphs:
        for run in para.runs:
            run.font.size = Pt(size_pt)


def main():
    print('Opening:', DECK_PATH)
    if not os.path.exists(DECK_PATH):
        raise SystemExit('Deck not found: %s' % DECK_PATH)

    prs = Presentation(DECK_PATH)
    print('Total slides in deck:', len(prs.slides))

    if len(prs.slides) < 3:
        raise SystemExit('Deck has fewer than 3 slides; cannot target slides[2].')

    slide = prs.slides[2]
    print('Targeting slide 3 (0-indexed slides[2]).')

    removed_by_text = []
    removed_by_name = []
    title_resized = None

    # Snapshot current shape IDs to avoid mutating-while-iterating.
    shape_snapshot = list(slide.shapes)
    for shape in shape_snapshot:
        # 1) Tagline removal by text content.
        if TAGLINE_TEXT_NEEDLE.lower() in _shape_text(shape).lower():
            elem = shape._element
            parent = elem.getparent()
            if parent is not None:
                parent.remove(elem)
            removed_by_text.append(shape.name)
            continue

        # 2) Tagline removal by shape name prefix (Enhance_S3_Tagline*).
        if any(shape.name.startswith(p) for p in TAGLINE_SHAPE_PREFIXES):
            elem = shape._element
            parent = elem.getparent()
            if parent is not None:
                parent.remove(elem)
            removed_by_name.append(shape.name)
            continue

        # 3) Title resize: "TECHNICAL APPROACH" -> 24pt.
        text = _shape_text(shape)
        if TITLE_TEXT_NEEDLE in text:
            _set_run_font_size(shape.text_frame, 24)
            title_resized = (shape.name, text[:40])

    print('Removed by text match (%r): %d -> %s' % (
        TAGLINE_TEXT_NEEDLE, len(removed_by_text), removed_by_text))
    print('Removed by name prefix %s: %d -> %s' % (
        TAGLINE_SHAPE_PREFIXES, len(removed_by_name), removed_by_name))
    if title_resized is None:
        print('WARNING: title shape containing %r was NOT FOUND.' % TITLE_TEXT_NEEDLE)
    else:
        print('Title resized to 24pt: name=%s text=%r' % title_resized)

    prs.save(DECK_PATH)
    print('Saved in place:', DECK_PATH)
    print('Final slide count:', len(prs.slides))


if __name__ == '__main__':
    main()