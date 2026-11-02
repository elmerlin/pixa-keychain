#!/usr/bin/env python3
"""Check the shipping glyph grid, identity invariants and packaged paths."""
from pathlib import Path
import glob, json, re, struct, subprocess, xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'public/assets/images'
DATA=json.loads((ROOT/'docs/design/graphics-inventory.json').read_text())
NS={'s':'http://www.w3.org/2000/svg'}
for rel in DATA['glyphs']:
    text=(ASSETS/rel).read_text()
    node=ET.fromstring(text)
    assert node.get('viewBox')=='0 0 24 24',rel
    assert node.get('fill')=='currentColor',rel
    assert node.get('shape-rendering')=='crispEdges',rel
    assert not re.search(r'#[0-9a-fA-F]{3,8}|\bstroke\b|<(?:image|text|filter)\b',text),rel
    assert len(node)==1 and node[0].tag.endswith('path'),rel
    d=node[0].get('d')
    rects=re.findall(r'M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z',d)
    assert ''.join(f'M{x} {y}h{w}v{h}h-{back}z' for x,y,w,h,back in rects)==d,rel
    occupied=set()
    for rect in rects:
        x,y,w,h,back=map(int,rect)
        assert w==back and all(n%2==0 for n in (x,y,w,h)),(rel,rect)
        assert 2<=x<x+w<=22 and 2<=y<y+h<=22,(rel,rect)
        cells={(xx,yy) for xx in range(x,x+w,2) for yy in range(y,y+h,2)}
        assert not occupied & cells,(rel,'overlap')
        occupied|=cells
    assert occupied,rel
for p in ASSETS.rglob('*.svg'):
    s=p.read_text();ET.fromstring(s)
    assert not re.search(r'hive|hbd|steem|e31337|212838',s,re.I),p
    assert not re.search(r'<(?:text|image|filter)\b|\bstroke(?:-|=)',s),p
    assert not re.search(r'\b(?:href|src)=',s),p
mark=ET.fromstring((ASSETS/'pixtopia-keychain-mark.svg').read_text())
assert mark.get('viewBox')=='0 0 16 16'
assert mark[0].get('d')=='M2 2H14V10H6V12H8V14H2ZM6 4V8H10V4Z'
for n,(x,y,c) in zip(mark.findall('s:rect',NS),[(10,2,'#FF4F8B'),(12,2,'#FFB547'),(10,4,'#3EE0A1'),(12,4,'#4CA8FF')]):
    assert n.attrib=={'x':str(x),'y':str(y),'width':'2','height':'2','fill':c}
assert len(mark.findall('s:rect',NS))==4
for size in (16,32,48,128):
    data=(ASSETS/f'icon-{size}.png').read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',data[16:24])==(size,size)
# Every enum asset, including previously missing RPC close, now resolves.
for rel in re.findall(r"= '([^']+)'",(ROOT/'src/common-ui/icons.enum.ts').read_text()):
    assert (ASSETS/(rel+'.svg')).exists(),rel
# Only the authorized icon fields differ in either manifest.
for flavor,action in [('chromium','action'),('firefox','browser_action')]:
    path=f'manifests/{flavor}/manifest.json'
    old=json.loads(subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT))
    new=json.loads((ROOT/path).read_text())
    assert set(new['icons'])==set(map(str,[16,32,48,128]))
    assert new['icons']==new[action]['default_icon']
    for rel in new['icons'].values():assert (ROOT/'public'/rel.lstrip('/')).exists(),rel
    for d in [old,new]:
        del d['icons'];del d[action]['default_icon'];del d['web_accessible_resources']
    assert old==new,flavor
# Manifest path fields only; URL matching patterns are not local resources.
m=json.loads((ROOT/'dist-prod/manifest.json').read_text())
paths=list(m['icons'].values())+list(m['action']['default_icon'].values())
paths += [m['action']['default_popup'],m['background']['service_worker']]
for group in m['web_accessible_resources']: paths+=group['resources']
for group in m['content_scripts']:paths+=group.get('js',[])+group.get('css',[])
for rel in paths:assert glob.glob(str(ROOT/'dist-prod'/rel.lstrip('/'))),rel
# Prose deletion log is not a runtime reference. Include tracked/untracked source.
result=subprocess.run(['rg','-n','iconhive|checked-old','src','public','manifests','webpack'],cwd=ROOT,capture_output=True,text=True)
assert result.returncode==1,result.stdout
assert not list(ASSETS.glob('iconhive*.png'))
print(f'PASS: {len(DATA["glyphs"])} even-grid monochrome glyphs; all SVGs parse; Prism preserved; 4 PNG sizes; enum assets; manifest scope; {len(paths)} packaged paths; deleted references absent.')
