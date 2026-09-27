import io
import sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pptx import Presentation
from lxml import etree
prs = Presentation('slides/output/SIH26146_PPT_combined.pptx')
slide = prs.slides[2]
print('Slide count:', len(prs.slides))
for i, shape in enumerate(slide.shapes):
    txt = ''
    if shape.has_text_frame:
        for p in shape.text_frame.paragraphs:
            for r in p.runs:
                txt += r.text
            txt += ' | '
    print(f'{i:3d} name={shape.name!r}')
    print(f'     full text: {txt!r}')
    # Dump XML for the shape
    try:
        x = etree.tostring(shape._element, pretty_print=True).decode()
        # Only show first 600 chars
        print('     xml head:', x[:1200])
    except Exception as e:
        print('     xml err:', e)
    print()