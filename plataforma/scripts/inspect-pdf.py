"""Render the delivered PDF itself, validate pages, and create review sheets."""
from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

root = Path(__file__).resolve().parent.parent
source = root / 'output/pdf/sistemas-2x2.pdf'
manifest = root / 'content/lessons/m1/algebra/sistemas-2x2/lesson.yaml'
target = root / 'output/qa/pdf'
target.mkdir(parents=True, exist_ok=True)
document = PdfReader(source)
rendered = pdfium.PdfDocument(str(source))
slides_block = manifest.read_text(encoding='utf8').split('\nslides:\n', 1)[1]
expected = sum(line.startswith('  - ') for line in slides_block.splitlines())
assert len(document.pages) == expected, f'Expected {expected} pages, got {len(document.pages)}'
for i, page in enumerate(document.pages):
    assert abs(float(page.mediabox.width) / float(page.mediabox.height) - 16 / 9) < .01
    text = page.extract_text()
    assert len(text) > 70, f'Empty or nonselectable page {i + 1}'
    assert 'Notas docentes' not in text
    rendered[i].render(scale=1).to_pil().save(target / f'page-{i+1:02}.png')
for start in range(0, len(document.pages), 4):
    sheet = Image.new('RGB', (1600, 960), '#e8edf2')
    for offset in range(min(4, len(document.pages)-start)):
        i = start + offset
        im = Image.open(target / f'page-{i+1:02}.png').convert('RGB')
        im.thumbnail((780, 439))
        x, y = (offset % 2) * 800 + 10, (offset // 2) * 480 + 28
        sheet.paste(im, (x, y))
        ImageDraw.Draw(sheet).text((x, y-20), f'Diapositiva {i+1}', fill='#101923')
    sheet.save(target / f'review-{start//4+1}.png')
print(f'PDF verified: {len(document.pages)} pages, 16:9, selectable text. Renders: {target}')
