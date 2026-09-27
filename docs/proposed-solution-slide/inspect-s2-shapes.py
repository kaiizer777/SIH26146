"""Inspect current state of slide 2 shapes (positions, sizes, fonts)."""
import os
import sys
from pptx import Presentation
from pptx.util import Emu

HERE = os.path.dirname(os.path.abspath(__file__))
DECK_PATH = os.path.join(HERE, 'slides', 'output', 'SIH26146_PPT_combined.pptx')

prs = Presentation(DECK_PATH)
slide2 = prs.slides[1]

print('Total shapes on slide 2:', len(slide2.shapes))
print('=' * 80)
for i, shape in enumerate(slide2.shapes):
    try:
        left_in = shape.left / 914400.0
        top_in = shape.top / 914400.0
        w_in = shape.width / 914400.0
        h_in = shape.height / 914400.0
    except Exception:
        left_in = top_in = w_in = h_in = 0
    name = shape.name
    st = shape.shape_type
    text = ''
    if shape.has_text_frame:
        text = shape.text_frame.text[:60].replace('\n', ' / ')
        text = text.encode('ascii', 'replace').decode('ascii')
    print(f'[{i:2d}] {name[:35]:35s} type={st} pos=({left_in:.3f},{top_in:.3f}) size=({w_in:.3f}x{h_in:.3f}) text="{text}"')
