#!/usr/bin/env python3
"""Make self-contained review sheets from the shipping artwork."""
from pathlib import Path
import base64, html, json, re
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/design'
OUT=ROOT/'public/assets/images'
DATA=json.loads((DOC/'graphics-inventory.json').read_text())
# Embed the brand's installed Geist faces; sheets work offline and travel together.
fonts=ROOT.parent/'pixtopia/node_modules/@expo-google-fonts'
font_css=''
for family,folder,file in [('Geist','geist/400Regular','Geist_400Regular.ttf'),('Geist Mono','geist-mono/400Regular','GeistMono_400Regular.ttf')]:
    p=fonts/folder/file
    if p.exists(): font_css+=f'@font-face{{font-family:"{family}";src:url(data:font/ttf;base64,{base64.b64encode(p.read_bytes()).decode()})}}'
CSS=font_css+'''
*{box-sizing:border-box}html{background:#151515;color:#f5f5f5;font-family:Geist,sans-serif}body{margin:0}main{width:1440px;margin:0 auto}header{padding:44px 48px 32px}h1{font-size:36px;letter-spacing:-.035em;margin:0 0 12px;font-weight:600}p{font-size:15px;color:#a3a3a3;line-height:1.55;margin:0;max-width:900px}.panels{display:grid;grid-template-columns:1fr 1fr}.canvas{padding:28px 32px 40px;background:var(--canvas);color:var(--ink);--line:#262626;--muted:#a3a3a3}.dark{--canvas:#0b0b0c;--ink:#f5f5f5}.light{--canvas:#fafafa;--ink:#0b0b0c;--line:#e7e7e9;--muted:#52525b}h2{font-size:23px;letter-spacing:-.025em;margin:0 0 24px}h3{font-size:16px;font-weight:600;margin:32px 0 12px}small,figcaption,.name,.meta{font-family:"Geist Mono",monospace;color:var(--muted);font-size:11px;line-height:1.5}figure{margin:0}svg,img{display:block;flex-shrink:0}svg{overflow:visible}img{image-rendering:pixelated}svg{color:inherit}a{color:inherit;text-underline-offset:4px}.sample{display:flex;align-items:center;gap:20px}.size{display:flex;flex-direction:column;align-items:center;justify-content:end;gap:12px}.sizes{display:flex;align-items:end;gap:32px;margin:22px 0}.rule{border-top:1px solid var(--line);padding-top:20px}.wordmark{height:80px;margin:0 0 16px}.inventory{display:grid;grid-template-columns:repeat(4,1fr);gap:0 16px}.tile{padding:16px 0 13px;border-top:1px solid var(--line);min-width:0}.tile .sample{gap:16px;height:44px;align-items:center}.tile .name{display:block;margin-top:8px;overflow-wrap:anywhere;font-size:10px}.groups{margin-top:24px}.art-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.art-row figure{display:flex;flex-direction:column;align-items:center;gap:10px}.surface{margin-top:16px;height:84px;overflow:hidden;border:1px solid var(--line)}.surface svg{width:100%;height:100%;object-fit:cover}.concept{padding:28px 0;border-top:1px solid var(--line)}.concept h3{margin:0 0 4px}.concept p{color:var(--muted);font-size:13px;max-width:570px}.concept .sizes{gap:42px}.chosen{font-size:11px;font-weight:400;padding-left:12px;color:var(--muted)}footer{padding:24px 48px 40px;font-size:12px;color:#a3a3a3;line-height:1.6}.strip{display:flex;gap:28px;align-items:center;min-height:48px}.token-label{margin-top:8px;text-align:center}.note{font-size:11px;color:var(--muted);line-height:1.6;margin-top:10px}::selection{background:#52525b;color:#fafafa}@media(max-width:1440px){main{margin:0}}@media print{main{width:1440px}*{print-color-adjust:exact}}
'''

def svg(rel,size=None,height=None):
    s=(OUT/rel).read_text().strip()
    if size:
        s=re.sub(r'width="[^"]*"',f'width="{size}"',s,count=1)
        s=re.sub(r'height="[^"]*"',f'height="{height or size}"',s,count=1)
    return s

def sizes(rel,points=[16,32,48,128]):
    return '<div class="sizes">'+''.join(f'<div class="size">{svg(rel,n)}<small>{n}px</small></div>' for n in points)+'</div>'

def page(title,intro,panels,footer):
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>'+CSS+'</style><main><header><h1>'+title+'</h1><p>'+intro+'</p></header><div class="panels">'+panels+'</div><footer>'+footer+'</footer></main></html>'

# Concepts use the exact master, with no font or external image dependency.
MARKS=[('Keeper tooth','M2 2H14V10H6V12H8V14H2ZM6 4V8H10V4Z','Chosen. A single 2×2 tooth at the foot makes a key while keeping the original P, open 4×4 counter and four Prism cells intact.'),('Notched stem','M2 2H14V10H6V11H4V12H6V14H2ZM6 4V8H10V4Z','A cut into the stem suggests a key, but its one-unit notch is fragile at 16px and weakens the P.'),('Open keyway','M2 2H14V10H9V8H10V4H6V8H7V10H6V14H2Z','The counter opens into a keyway. It is more literal, but interrupts the lower bar and changes the original square counter.')]
panels=''
for theme in ['dark','light']:
    panel=f'<section class="canvas {theme}"><h2>{theme.title()} canvas</h2>'
    for i,(name,d,description) in enumerate(MARKS):
        panel+=f'<article class="concept"><h3>{name}'+('<span class="chosen">Selected</span>' if i==0 else '')+f'</h3><p>{description}</p><div class="sizes">'
        for n in [16,32,48,128]:
            art=svg('pixtopia-keychain-mark.svg',n)
            art=art.replace(MARKS[0][1],d)
            panel+=f'<div class="size">{art}<small>{n}px</small></div>'
        panel+='</div></article>'
    panel+='<h3>Selected in the browser toolbar</h3><div class="strip">'
    for n in [16,32,48,128]:
        data=base64.b64encode((OUT/f'icon-{n}.png').read_bytes()).decode()
        panel+=f'<img alt="{n} pixel extension icon" width="{n}" height="{n}" src="data:image/png;base64,{data}">'
    panel+='</div><p class="note">The PNGs use a charcoal field for reliable contrast in either browser theme. The 16px render is the same integer master; no extra hinting is needed.</p></section>'
    panels+=panel
(DOC/'mark-concepts.html').write_text(page('Pixtopia Keychain · mark study','Three ways to turn Prism Corner into a key. Compare at 100% zoom: 16, 32, 48 and 128 CSS pixels on both canvases. The four Prism pixels retain their original positions and colors.',panels,'Construction: 16×16 · visible bounds 2–14 · integer coordinates · axis-aligned edges · transparent counter · no strokes or filters. The selected keeper tooth occupies (6,12)–(8,14), inside the original bounds.'))

# A full inventory, including duplicates, proves that every runtime filename was replaced.
GROUPS=[('Controls','global/ select/ input/ checkbox/ favorite-accounts/'),('Navigation & account','top-bar/ bottom-bar/ menu/'),('Wallet & resources','wallet/ resources/'),('Governance','governance/')]
panels=''
for theme in ['dark','light']:
    panel=f'<section class="canvas {theme}"><h2>{theme.title()} canvas</h2><div class="wordmark">{svg("pixtopia-keychain-lockup.svg",228,80)}</div>'
    panel+=sizes('pixtopia-keychain-mark.svg')
    panel+='<div class="strip rule">'
    for n in [16,32,48,128]:
        data=base64.b64encode((OUT/f'icon-{n}.png').read_bytes()).decode()
        panel+=f'<div class="size"><img alt="Extension icon {n}px" width="{n}" height="{n}" src="data:image/png;base64,{data}"><small>PNG · {n}</small></div>'
    panel+='</div><h3>Token identities</h3><div class="art-row">'
    for rel,label in DATA['tokens'].items():
        panel+=f'<figure><div class="sample">{svg(rel,16)}{svg(rel,32)}{svg(rel,48)}</div><figcaption>{label}</figcaption></figure>'
    panel+='</div><h3>States</h3><div class="art-row">'
    for name in ['success','error','warning']:
        panel+=f'<figure>{svg("message/"+name+".svg",96)}<div class="sample">{svg("message/"+name+".svg",16)}{svg("message/"+name+".svg",32)}</div><figcaption>{"Oops / empty" if name=="error" else name.title()}</figcaption></figure>'
    panel+='</div><h3>Loader & splash</h3><div class="strip">'+svg('keychain-round-logo.svg',48)+svg('splashscreen/keychain-logo.svg',64)+'<small>The product mark serves both existing states.</small></div>'
    panel+=f'<h3>Quiet pixel field</h3><div class="surface">{svg("background/"+theme+".svg")}</div>'
    if (OUT/'placeholders/account-placeholder.svg').exists():
        panel+='<h3>Account placeholder & detached canvas</h3><div class="strip">'
        for rel,n in [('placeholders/account-placeholder.png',48),('background/detached-popup-background.png',64)]:
            data=base64.b64encode((OUT/rel).read_bytes()).decode()
            panel+=f'<img alt="{rel.split("/")[-1]}" width="{n}" height="{n}" src="data:image/png;base64,{data}">'
        panel+='<small>Two PNG exports preserve existing callers.<br>Both have authored SVG masters.</small></div>'
    for title,prefixes in GROUPS:
        panel+=f'<div class="groups"><h3>{title}</h3><div class="inventory">'
        for rel,name in sorted(DATA['glyphs'].items()):
            if not any(rel.startswith(p) for p in prefixes.split()): continue
            label=rel.removesuffix('.svg').replace('hive','pixa').replace('hbd','pxs')
            panel+=f'<figure class="tile"><div class="sample">{svg(rel,16)}{svg(rel,24)}{svg(rel,32)}</div><figcaption class="name">{html.escape(label)}<br>{"New · " if name in DATA["new_masters"] else "Pixtopia · "}{html.escape(name.replace(":up"," ↑"))}</figcaption></figure>'
        panel+='</div></div>'
    panel+='</section>'
    panels+=panel
(DOC/'graphics-sheet.html').write_text(page('Pixtopia Keychain · graphics','The complete replacement family. Every control is shown at 16, 24 and 32px, using inherited ink. Brand and state artwork retain the Prism; chrome stays monochrome. View at 100% zoom.',panels,'All controls use the Pixtopia 10×10 master: 2×2 cells within a 24×24 viewBox, even coordinates, fill only, crisp edges. Existing runtime filenames remain intact. The inventory lists every file-to-glyph mapping. Source and reproduction: build-graphics.py · build-sheets.py.'))
print('Built both self-contained HTML sheets.')
