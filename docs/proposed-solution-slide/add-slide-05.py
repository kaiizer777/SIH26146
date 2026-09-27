"""
Insert slide 5 (Research and References) into the combined deck,
matching the chrome style of slides 2-4.

Strategy:
  1. Open the combined deck (already contains slides 1-4 and possibly a
     stale slide 5 from a previous run).
  2. If a slide 5 already exists, delete it (sldId from sldIdLst + drop
     rel on presentation_part) so the script is idempotent.
  3. Use slide 2 (index 1 -- the v3 source slide) as the chrome template.
  4. Add a new slide, strip default placeholders.
  5. Deep-copy 10 chrome shapes (footer bar, footer text, page num,
     diamond, title, SIH logo image, vertical accent bar, Bitcoin
     monogram, SIH26146 wordmark, italic subtitle) from source slide.
  6. Handle image relationship (copy image part, rewrite blip rId).
  7. Update title text "Proposed Solution" -> "Research and References".
  8. Update page number text from "2" -> "5".
  9. Add left-column reference sections (Industry Platforms, Research &
     Best Practices, Feasibility Facts) with inline URLs, filled-circle
     bullets, and tight stacking.
 10. Add right-column comparison table (header + 5 body rows) with navy
     header and alternating-row body.
 11. Save back to the same path.
"""

import io
import os
import re
import sys
from copy import deepcopy

# Force utf-8 output to handle non-ASCII chars safely when printing slide titles.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.util import Inches, Pt, Emu
from lxml import etree


HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, 'slides', 'output')
OUT_PATH = os.path.join(OUT_DIR, 'SIH26146_PPT_combined.pptx')

# Namespace shortcuts
NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

# Within a <p:sp>, the txBody element is in the presentationml namespace.
# But the text-run children (a:r, a:t, a:rPr) live in the drawingml namespace.
NS_P_TXBODY = '{%s}txBody' % NS_P
NS_A_T = '{%s}t' % NS_A
NS_A_R = '{%s}r' % NS_A
NS_A_P = '{%s}p' % NS_A

# Color tokens (ASCII-safe hex)
NAVY = '1F3864'        # section header + table header navy
INK = '2563EB'         # ink-blue accent (bullets)
PRIMARY = '0F172A'     # body text (deep ink)
SLATE_700 = '334155'
SLATE_500 = '475569'   # dim URL text
BORDER = 'E2E8F0'
PANEL_BG = 'F8FAFC'    # alternating table row
GREEN = '16A34A'       # SIH26146 "Yes" green
RED = 'DC2626'         # Existing "No" red
AMBER = 'D97706'       # Existing "Limited" amber


# ---------------------------------------------------------------------------
# Slide deletion helper (python-pptx has no built-in delete_slide)
# ---------------------------------------------------------------------------

def delete_slide_by_index(presentation, slide_index):
    """Delete a slide by 0-based index. Idempotent: no-op if out of range.

    Implementation:
      - Remove the <p:sldId> element from <p:sldIdLst> in presentation.xml.
      - Drop the corresponding relationship on the PresentationPart.

    The orphaned slide part is not explicitly removed from the package,
    but since no other part references it, it becomes garbage-collected on
    save.
    """
    sldIdLst = presentation.slides._sldIdLst
    sldId_elems = list(sldIdLst)
    if slide_index < 0 or slide_index >= len(sldId_elems):
        return False
    target = sldId_elems[slide_index]
    rId = target.get('{%s}id' % NS_R)
    sldIdLst.remove(target)
    if rId and rId in presentation.part.rels:
        presentation.part.drop_rel(rId)
    return True


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def find_txbody(shape_elem):
    """Return the txBody element for a shape (or picture)."""
    return shape_elem.find('.//' + NS_P_TXBODY)


def set_text_run(shape_elem, new_text, paragraph_index=0, run_index=0):
    """Set the text content of a specific run within a shape's txBody."""
    txBody = find_txbody(shape_elem)
    if txBody is None:
        raise RuntimeError('txBody not found for shape')
    paragraphs = txBody.findall(NS_A_P)
    runs = paragraphs[paragraph_index].findall(NS_A_R)
    target_run = runs[run_index]
    target_t = target_run.find(NS_A_T)
    target_t.text = new_text


def reassign_shape_ids(slide_elem, start_id=1000):
    """Reassign numeric IDs in p:cNvPr id attributes to avoid collisions."""
    counter = start_id
    for cNvPr in slide_elem.iter('{%s}cNvPr' % NS_P):
        id_attr = cNvPr.get('id')
        if id_attr is not None:
            cNvPr.set('id', str(counter))
            counter += 1


def _estimate_item_height(label, desc, url, width_in, body_pt):
    """Roughly estimate the height of one entry at the given width.

    12pt Arial at 1.0 line spacing ~= 0.167 in per line. We pad each line
    by 0.033 in for visual breathing room. Conservative char-per-line for
    12pt Arial over 6.30 in is ~80 chars.
    """
    sep = ' - '
    text = label + sep + (desc + sep if desc else '') + (url if url else '')
    chars_per_line = 80
    n_lines = max(1, (len(text) + chars_per_line - 1) // chars_per_line)
    line_h = 0.20  # 12pt at 1.0 spacing + small buffer
    return n_lines * line_h + 0.03


def add_section(slide, x, y, w, h, header, items):
    """Add a reference section: header bar + items with filled-circle bullets.

    Each item dict: {'label': ..., 'desc': ..., 'url': ...}.
    Layout:
      - Header: 13pt bold navy all-caps, letter-spacing 2.
      - Hairline below header.
      - Items: filled ink-blue circle (0.10x0.10 in) + single paragraph
        with bold label, description, and inline dim URL.
    """
    HEADER_H = 0.30
    BODY_PT = 12
    ITEM_GAP = 0.06
    BULLET_X = x
    TEXT_X = x + 0.22
    TEXT_W = w - 0.22

    # ---- Header text ----
    hdr_tb = slide.shapes.add_textbox(
        Inches(x), Inches(y), Inches(w), Inches(HEADER_H)
    )
    tf = hdr_tb.text_frame
    tf.margin_left = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_bottom = Inches(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.LEFT
    r = p.add_run()
    r.text = header.upper()
    r.font.bold = True
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor.from_string(NAVY)
    r.font.name = 'Arial'
    rPr = r._r.get_or_add_rPr()
    rPr.set('spc', '200')  # letter-spacing 2 (hundredths of a point)

    # ---- Thin slate hairline below header ----
    line = slide.shapes.add_connector(
        1,  # MSO_CONNECTOR.STRAIGHT
        Inches(x), Inches(y + HEADER_H),
        Inches(x + w), Inches(y + HEADER_H)
    )
    line.line.color.rgb = RGBColor.from_string(BORDER)
    line.line.width = Pt(0.75)

    # ---- Items ----
    cur_y = y + HEADER_H + 0.12  # leave a small gap below hairline

    for item in items:
        # Filled ink-blue circle bullet
        bcircle = slide.shapes.add_shape(
            9,  # MSO_SHAPE.OVAL
            Inches(BULLET_X), Inches(cur_y + 0.08),
            Inches(0.10), Inches(0.10)
        )
        bcircle.fill.solid()
        bcircle.fill.fore_color.rgb = RGBColor.from_string(INK)
        bcircle.line.fill.background()

        # Estimated item height (used to position next bullet)
        est_h = _estimate_item_height(
            item['label'], item.get('desc', ''), item.get('url', ''),
            width_in=TEXT_W, body_pt=BODY_PT
        )

        # Single textbox with bold label + description + inline URL
        tb = slide.shapes.add_textbox(
            Inches(TEXT_X), Inches(cur_y),
            Inches(TEXT_W), Inches(max(est_h, 0.30))
        )
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0)
        tf.margin_right = Inches(0)
        tf.margin_top = Inches(0)
        tf.margin_bottom = Inches(0)
        tf.vertical_anchor = MSO_ANCHOR.TOP
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT
        p.line_spacing = 1.0

        # Bold label
        rl = p.add_run()
        rl.text = item['label'] + ' - '
        rl.font.bold = True
        rl.font.size = Pt(BODY_PT)
        rl.font.color.rgb = RGBColor.from_string(PRIMARY)
        rl.font.name = 'Arial'

        # Description
        if item.get('desc'):
            rd = p.add_run()
            rd.text = item['desc'] + ' - '
            rd.font.size = Pt(BODY_PT)
            rd.font.color.rgb = RGBColor.from_string(SLATE_700)
            rd.font.name = 'Arial'

        # Inline URL (dim slate, same size)
        if item.get('url'):
            ru = p.add_run()
            ru.text = item['url']
            ru.font.size = Pt(BODY_PT)
            ru.font.color.rgb = RGBColor.from_string(SLATE_500)
            ru.font.name = 'Arial'

        cur_y += est_h + ITEM_GAP


def add_comparison_table(slide, x, y, w, h):
    """Add the 6x3 comparison table."""
    rows = 6
    cols = 3
    table_shape = slide.shapes.add_table(
        rows, cols,
        Inches(x), Inches(y), Inches(w), Inches(h)
    )
    table = table_shape.table

    # Column widths: 2.85 / 1.40 / 1.60 in (label / SIH26146 / Existing)
    col_widths = [2.85, 1.40, 1.60]
    total = sum(col_widths)
    scale = w / total
    for i, cw in enumerate(col_widths):
        table.columns[i].width = Inches(cw * scale)

    # Row heights: header 0.45 in, body 0.55 in (per spec)
    header_h = 0.45
    body_h = 0.55
    table.rows[0].height = Inches(header_h)
    for i in range(1, rows):
        table.rows[i].height = Inches(body_h)

    # -------- Header row --------
    headers = ['Feature', 'SIH26146', 'Existing Systems']
    for i, hd in enumerate(headers):
        cell = table.cell(0, i)
        cell.fill.solid()
        cell.fill.fore_color.rgb = RGBColor.from_string(NAVY)
        cell.margin_left = Inches(0.08)
        cell.margin_right = Inches(0.08)
        cell.margin_top = Inches(0.04)
        cell.margin_bottom = Inches(0.04)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf = cell.text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.alignment = (PP_ALIGN.LEFT if i == 0 else PP_ALIGN.CENTER)
        r = p.add_run()
        r.text = hd
        r.font.bold = True
        r.font.size = Pt(12)
        r.font.color.rgb = RGBColor.from_string('FFFFFF')
        r.font.name = 'Arial'

    # -------- Body rows --------
    body = [
        ('Real-time Wallet Risk Scoring',            True,  False),
        ('Peeling-Chain Detection',                  True,  False),
        ('CoinJoin / Mixing Detection',              True,  'Limited'),
        ('Air-Gapped CPU-Only Inference',            True,  False),
        ('Court-Admissible Forensic Dossier Export', True,  False),
    ]

    for ri, (feature, has, peer) in enumerate(body, start=1):
        row_bg = 'FFFFFF' if ri % 2 == 1 else PANEL_BG

        # Feature column
        c0 = table.cell(ri, 0)
        c0.vertical_anchor = MSO_ANCHOR.MIDDLE
        c0.fill.solid()
        c0.fill.fore_color.rgb = RGBColor.from_string(row_bg)
        tf0 = c0.text_frame
        tf0.clear()
        p0 = tf0.paragraphs[0]
        p0.alignment = PP_ALIGN.LEFT
        r0 = p0.add_run()
        r0.text = feature
        r0.font.size = Pt(11)
        r0.font.bold = True
        r0.font.color.rgb = RGBColor.from_string(PRIMARY)
        r0.font.name = 'Arial'

        # SIH26146 column (always "Yes" green)
        c1 = table.cell(ri, 1)
        c1.vertical_anchor = MSO_ANCHOR.MIDDLE
        c1.fill.solid()
        c1.fill.fore_color.rgb = RGBColor.from_string(row_bg)
        tf1 = c1.text_frame
        tf1.clear()
        p1 = tf1.paragraphs[0]
        p1.alignment = PP_ALIGN.CENTER
        r1 = p1.add_run()
        r1.text = 'Yes'
        r1.font.size = Pt(11)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor.from_string(GREEN)
        r1.font.name = 'Arial'

        # Existing Systems column (No / Limited)
        c2 = table.cell(ri, 2)
        c2.vertical_anchor = MSO_ANCHOR.MIDDLE
        c2.fill.solid()
        c2.fill.fore_color.rgb = RGBColor.from_string(row_bg)
        tf2 = c2.text_frame
        tf2.clear()
        p2 = tf2.paragraphs[0]
        p2.alignment = PP_ALIGN.CENTER
        r2 = p2.add_run()
        if peer == 'Limited':
            r2.text = 'Limited'
            r2.font.color.rgb = RGBColor.from_string(AMBER)
        else:
            r2.text = 'No'
            r2.font.color.rgb = RGBColor.from_string(RED)
        r2.font.size = Pt(11)
        r2.font.bold = True
        r2.font.name = 'Arial'

    # Thin slate borders on all cells
    _apply_table_borders(table)


def _apply_table_borders(table):
    """Apply a thin slate-200 border to all cells in the table."""
    BORDER_XML_TEMPLATE = (
        '<a:tblBorders xmlns:a="%s">' % NS_A +
        '<a:left w="6350" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:left>' +
        '<a:right w="6350" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:right>' +
        '<a:top w="6350" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:top>' +
        '<a:bottom w="6350" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:bottom>' +
        '<a:insideH w="3175" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:insideH>' +
        '<a:insideV w="3175" cap="flat" cmpd="sng" algn="ctr">' +
        '<a:solidFill><a:srgbClr val="%s"/></a:solidFill>' % BORDER +
        '<a:prstDash val="solid"/>' +
        '</a:insideV>' +
        '</a:tblBorders>'
    )
    tbl_xml = table._tbl
    for tblBorders in tbl_xml.findall('{%s}tblBorders' % NS_A):
        tbl_xml.remove(tblBorders)
    new_borders = etree.fromstring(BORDER_XML_TEMPLATE)
    tbl_xml.append(new_borders)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Step 1: open the combined deck
    combined = Presentation(OUT_PATH)

    # Step 2: delete the existing slide 5 (if any) so the script is idempotent.
    # The slide is at 0-based index 4 (the 5th slide).
    if len(combined.slides) >= 5:
        deleted = delete_slide_by_index(combined, 4)
        print('Deleted existing slide 5: %s' % deleted)

    # Source slide is slide 2 (index 1) -- the v3 content slide with full chrome.
    src_slide = combined.slides[1]

    # Step 3: add a new slide
    new_slide = combined.slides.add_slide(combined.slide_layouts[0])

    # Step 4: strip default placeholders
    for ph in list(new_slide.placeholders):
        ph._element.getparent().remove(ph._element)

    # Step 5: deep-copy chrome shapes from source slide
    # Chrome indices in slide 2:
    #   0 = footer bar (light slate)
    #   1 = "@SIH Idea submission- Template"
    #   2 = page number "2"
    #   3 = diamond accent
    #   4 = title "Proposed Solution"
    #   5 = SIH logo (Picture)
    #   6 = vertical ink-blue accent bar
    #   7 = Bitcoin monogram ("B with vertical stroke")
    #   8 = SIH26146 wordmark
    #   9 = italic subtitle
    chrome_indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

    src_shapes = list(src_slide.shapes)

    # Step 6: handle image relationships BEFORE rewriting blips
    src_image_parts = {}
    for idx in chrome_indices:
        shape = src_shapes[idx]
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            blip = shape._element.find('.//{%s}blip' % NS_A)
            if blip is None:
                continue
            src_rId = blip.get('{%s}embed' % NS_R)
            src_image_parts[src_rId] = shape.image

    # Deep-copy chrome elements into the new slide's spTree
    for idx in chrome_indices:
        shape = src_shapes[idx]
        new_elem = deepcopy(shape._element)
        new_slide.shapes._spTree.append(new_elem)

    # Map source rIds -> new rIds for images, with image-part copy
    src_to_new_rid = {}
    for src_rId, image in src_image_parts.items():
        blob = image.blob
        img_stream = io.BytesIO(blob)
        image_part = combined.part.package.get_or_add_image_part(img_stream)
        new_rId = new_slide.part.relate_to(image_part, RT.IMAGE)
        src_to_new_rid[src_rId] = new_rId

    # Rewrite blip rIds in the new slide
    for shape in new_slide.shapes:
        if shape.shape_type == MSO_SHAPE_TYPE.PICTURE:
            blip = shape._element.find('.//{%s}blip' % NS_A)
            if blip is None:
                continue
            old_rId = blip.get('{%s}embed' % NS_R)
            if old_rId in src_to_new_rid:
                blip.set('{%s}embed' % NS_R, src_to_new_rid[old_rId])

    # Reassign shape IDs in the new slide to avoid collisions with existing IDs.
    reassign_shape_ids(new_slide.shapes._spTree, start_id=1000)

    # Step 7: update title text "Proposed Solution" -> "Research and References"
    for shape in new_slide.shapes:
        if shape.has_text_frame and 'Proposed Solution' in shape.text_frame.text:
            # Widen the title text box so the long title fits on a single line.
            shape.width = Inches(9.5)
            set_text_run(shape._element, 'Research and References')
            break

    # Step 8: update page number "2" -> "5"
    for shape in new_slide.shapes:
        if shape.has_text_frame and shape.text_frame.text.strip() == '2':
            set_text_run(shape._element, '5')
            break

    # Step 9: add left-column reference sections (tight stacking)
    LEFT_X = 0.40
    LEFT_W = 6.50

    add_section(
        new_slide,
        x=LEFT_X, y=1.25, w=LEFT_W, h=1.60,
        header='Industry Platforms',
        items=[
            {
                'label': 'Chainalysis',
                'desc': 'Blockchain analytics for crypto compliance',
                'url': 'chainalysis.com',
            },
            {
                'label': 'Elliptic',
                'desc': 'Blockchain analytics for AML compliance',
                'url': 'elliptic.co',
            },
            {
                'label': 'TRM Labs',
                'desc': 'Blockchain intelligence for AML and fraud',
                'url': 'trmlabs.com',
            },
            {
                'label': 'Crystal Intelligence',
                'desc': 'Digital asset risk intelligence',
                'url': 'crystalintelligence.com',
            },
        ],
    )

    add_section(
        new_slide,
        x=LEFT_X, y=2.95, w=LEFT_W, h=2.40,
        header='Research and Best Practices',
        items=[
            {
                'label': 'Weber et al., KDD 2019',
                'desc': 'Anti-Money Laundering in Bitcoin: Experimenting with Graph Convolutional Networks for Financial Forensics',
                'url': 'arxiv.org/abs/1908.02591',
            },
            {
                'label': 'Kappos et al., arXiv 2022',
                'desc': 'How to Peel a Million: Validating and Expanding Bitcoin Clusters',
                'url': 'arxiv.org/abs/2205.13882',
            },
            {
                'label': 'Schnoering and Vazirgiannis, arXiv 2023',
                'desc': 'Heuristics for Detecting CoinJoin Transactions on the Bitcoin Blockchain',
                'url': 'arxiv.org/abs/2311.12491',
            },
            {
                'label': 'FATF 2015/2018/2021',
                'desc': 'Guidance for a Risk-Based Approach: Virtual Assets and VASPs',
                'url': 'fatf-gafi.org/en/publications.html',
            },
        ],
    )

    add_section(
        new_slide,
        x=LEFT_X, y=5.45, w=LEFT_W, h=1.30,
        header='Feasibility Facts',
        items=[
            {
                'label': 'Europol IOCTA',
                'desc': 'Annual strategic report covering cryptocurrencies as a cybercrime enabler',
                'url': 'europol.europa.eu/publications-events/main-reports/iocta-report',
            },
        ],
    )

    # Step 10: add right-column comparison table
    add_comparison_table(
        new_slide,
        x=7.20, y=1.25, w=5.85, h=5.55,
    )

    # Step 11: save
    combined.save(OUT_PATH)
    print('Wrote: %s' % OUT_PATH)
    print('Total slides: %d' % len(combined.slides))
    for i, s in enumerate(combined.slides, 1):
        first_text = ''
        for sh in s.shapes:
            if sh.has_text_frame and sh.text_frame.text.strip():
                first_text = sh.text_frame.text.strip().splitlines()[0][:70]
                break
        print('  Slide %d: %s' % (i, first_text))


if __name__ == '__main__':
    main()
