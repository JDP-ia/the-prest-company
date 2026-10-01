"""Optional asset maintenance; requires fonttools. The built font is committed."""
import sys
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
font = TTFont(sys.argv[1])
options = subset.Options()
options.layout_features = []
s = subset.Subsetter(options=options)
s.populate(text='PREST ')
s.subset(font)
glyphs = font.getGlyphSet()
modified = {}
for name in font.getGlyphOrder():
    pen = TTGlyphPen(glyphs)
    glyphs[name].draw(TransformPen(pen, (.54, 0, 0, 1, 0, 0)))
    modified[name] = pen.glyph()
for name, glyph in modified.items():
    font['glyf'][name] = glyph
    width, lsb = font['hmtx'][name]
    font['hmtx'][name] = (round(width * .54), round(lsb * .54))
names = {1: 'Prest Display Study', 2: 'Bold', 3: 'PrestDisplayStudy-V1', 4: 'Prest Display Study Bold', 6: 'PrestDisplayStudy-Bold', 16: 'Prest Display Study', 17: 'Bold'}
for record in font['name'].names:
    if record.nameID in names:
        record.string = names[record.nameID].encode(record.getEncoding())
font.flavor = 'woff'
font.save(Path(__file__).resolve().parents[1] / 'src/assets/prest-display.woff')
