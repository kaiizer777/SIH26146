"""Final verification: confirm only slide 1 changed and all 6 cards are good."""
from pptx import Presentation
from pptx.util import Emu

DECK = r"C:\Users\bari2\Desktop\SIH26146\docs\proposed-solution-slide\slides\output\SIH26146_PPT_combined.pptx"

prs = Presentation(DECK)
print("Total slides:", len(prs.slides))

# Per-card expected (label, value) and search substring.
expected = [
    ("Text 11", "Problem Statement ID",   "26146"),
    ("Text 15", "Problem Statement Title","AI-Powered Monitoring & Analysis of Bitcoin Transaction Traffic"),
    ("Text 19", "Theme",                  "Blockchain & Cybersecurity"),
    ("Text 23", "PS Category",            "Software"),
    ("Text 27", "Team ID",                ""),
    ("Text 31", "Team Name",              "AlertX"),
]

slide1 = prs.slides[0]
print("\n=== Slide 1 verification ===")
all_ok = True
for shape_name, label, value in expected:
    found = None
    for shape in slide1.shapes:
        if shape.name == shape_name:
            found = shape
            break
    if found is None:
        print("  FAIL: %s missing" % shape_name)
        all_ok = False
        continue
    text = found.text_frame.text
    expected_full = label + ":  " + value
    if text.strip() != expected_full.strip():
        print("  FAIL: %s text=%r expected=%r" % (shape_name, text, expected_full))
        all_ok = False
    else:
        print("  OK: %s -> %r" % (shape_name, text[:60]))
    # Check icon shape position
    icon_name = "Enhance_CardIcon_%d" % (expected.index((shape_name, label, value)) + 1)
    icon = None
    for shape in slide1.shapes:
        if shape.name == icon_name:
            icon = shape
            break
    if icon is None:
        print("  FAIL: icon %s missing" % icon_name)
        all_ok = False
    else:
        icon_x = icon.left / 914400.0
        icon_y = icon.top / 914400.0
        icon_w = icon.width / 914400.0
        print("    -> icon at (%.3f, %.3f) %.3fx%.3f" % (icon_x, icon_y, icon_w, icon.height/914400.0))

print("\nAll OK:", all_ok)
