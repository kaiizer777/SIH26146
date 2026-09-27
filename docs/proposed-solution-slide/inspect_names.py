import zipfile, re
with zipfile.ZipFile('docs/proposed-solution-slide/slides/output/SIH26146_PPT_combined.pptx') as z:
    with z.open('ppt/slides/slide4.xml') as f:
        xml = f.read().decode('utf-8')
names = re.findall(r'name="([^"]+)"', xml)
print('Shape names in slide4.xml:')
for n in names:
    print(' ', n)
