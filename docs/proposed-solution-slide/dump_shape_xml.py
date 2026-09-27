import zipfile, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='ascii', errors='replace')
with zipfile.ZipFile('docs/proposed-solution-slide/slides/output/SIH26146_PPT_combined.pptx') as z:
    with z.open('ppt/slides/slide4.xml') as f:
        xml = f.read().decode('utf-8')
for shape_name in ['Text 12', 'Text 18', 'Text 24', 'Text 31', 'Text 37', 'Text 43']:
    m = re.search(r'<p:sp>(?:(?!<p:sp>).)*?' + re.escape(shape_name) + r'.*?</p:sp>', xml, re.DOTALL)
    if m:
        out = m.group(0)
        # Replace problematic unicode with ascii placeholder
        safe = out.encode('ascii', errors='replace').decode('ascii')
        print('---', shape_name, '---')
        print(safe[:2500])
        print()
