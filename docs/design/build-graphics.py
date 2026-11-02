#!/usr/bin/env python3
"""Rebuild the Pixtopia Keychain graphics. Reads the sibling brand repo only.
Run from any directory: python3 docs/design/build-graphics.py
"""
from pathlib import Path
import json, re, subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/assets/images'
DOC = ROOT / 'docs/design'
BRAND = ROOT.parent / 'pixtopia/assets/branding'
GLYPHS = ROOT.parent / 'pixtopia/assets/glyphs/svg'
PRISM = ['#FF4F8B', '#FFB547', '#3EE0A1', '#4CA8FF']

# Ten by ten masters; each cell is 2 × 2 at offset (2, 2).
MASTERS = {
 'trash': ['...####...', '....##....', '.########.', '..#....#..', '..#.#..#..', '..#.#..#..', '..#.#..#..', '..#....#..', '..######..', '..........'],
 'eye': ['..........', '...####...', '..#....#..', '.#..##..#.', '#..#..#..#', '.#..##..#.', '..#....#..', '...####...', '..........', '..........'],
 'eye-off': ['#.........', '.#..###...', '..#....#..', '.#.#....#.', '#...#....#', '.#...#..#.', '..#...##..', '...###.#..', '........#.', '.........#'],
 'unlock': ['.....###..', '....#...#.', '....#.....', '....#.....', '.########.', '.#......#.', '.#..##..#.', '.#..##..#.', '.#......#.', '.########.'],
 'at': ['..######..', '.#......#.', '#..###...#', '#.#...#..#', '#.#...#..#', '#..#######', '#.........', '.#........', '..######..', '..........'],
 'maximum': ['.########.', '..........', '....##....', '...####...', '..#.##.#..', '.#..##..#.', '....##....', '....##....', '....##....', '..........'],
 'grip': ['..........', '..##..##..', '..##..##..', '..........', '..##..##..', '..##..##..', '..........', '..##..##..', '..##..##..', '..........'],
 'gift': ['..##..##..', '.#..##..#.', '..######..', '##########', '#...##...#', '##########', '.#..##..#.', '.#..##..#.', '.#..##..#.', '.########.'],
 'clock': ['...####...', '.##....##.', '.#..#...#.', '#...#....#', '#...#....#', '#...###..#', '#........#', '.#......#.', '.##....##.', '...####...'],
 'pause': ['..........', '..##..##..', '..##..##..', '..##..##..', '..##..##..', '..##..##..', '..##..##..', '..##..##..', '..##..##..', '..........'],
 'vote': ['..######..', '..#....#..', '..#..#.#..', '..#.#..#..', '..######..', '.#......#.', '##########', '#........#', '#........#', '##########'],
 'keyboard': ['..........', '##########', '#........#', '#.#.#.#..#', '#........#', '#.#.#.#..#', '#........#', '#..####..#', '##########', '..........'],
 'network': ['...####...', '...#..#...', '...####...', '....##....', '....##....', '..######..', '..#....#..', '####..####', '#..#..#..#', '####..####'],
 'logout': ['######....', '#....#....', '#....#.#..', '#.......#.', '#..#######', '#.......#.', '#....#.#..', '#....#....', '######....', '..........'],
 'sliders': ['..##......', '..##......', '##########', '..##......', '..........', '......##..', '##########', '......##..', '......##..', '..........'],
 'theme': ['...####...', '.####..##.', '.####...#.', '#####....#', '#####....#', '#####....#', '#####....#', '.####...#.', '.####..##.', '...####...'],
 'sun': ['....##....', '.#......#.', '..#.##.#..', '...#..#...', '#.#....#.#', '#.#....#.#', '...#..#...', '..#.##.#..', '.#......#.', '....##....'],
 'moon': ['...####...', '.##..#....', '.#...#....', '#....#....', '#.....#...', '#......###', '#........#', '.#......#.', '.##....##.', '...####...'],
 'plug': ['..#....#..', '..#....#..', '..#....#..', '.########.', '.#......#.', '..#....#..', '...####...', '....##....', '....##....', '....##....'],
 'energy': ['.....##...', '....##....', '...##.....', '..##......', '.########.', '.....##...', '....##....', '...##.....', '..##......', '.##.......'],
 'resource': ['..#.#.#...', '.########.', '##......##', '.#..##..#.', '##..##..##', '.#..##..#.', '##......##', '.########.', '..#.#.#...', '..........'],
 'savings': ['.########.', '#........#', '#..####..#', '#........#', '#...##...#', '#..#..#..#', '#...##...#', '#........#', '.########.', '..#....#..'],
 'delegate': ['.###..###.', '.#.#..#.#.', '.###..###.', '..........', '.##....##.', '#..#..#..#', '#..####..#', '#..#..#..#', '####..####', '..........'],
 'warning': ['....##....', '...#..#...', '...#..#...', '..#.##.#..', '..#.##.#..', '.#..##..#.', '.#......#.', '#...##...#', '#........#', '##########'],
}

def grid_path(rows, unit=2, offset=2):
    assert len(rows) == 10 and all(len(r) == 10 for r in rows), rows
    parts=[]
    for y,row in enumerate(rows):
        for m in re.finditer(r'#+', row):
            x=offset+m.start()*unit; yy=offset+y*unit; w=len(m.group())*unit
            parts.append(f'M{x} {yy}h{w}v{unit}h-{w}z')
    return ''.join(parts)


def body_of(svg):
    return re.sub(r'</svg>\s*$', '', re.sub(r'^.*?<svg[^>]*>', '', svg, flags=re.S)).strip()


def glyph_body(name):
    flip = name.endswith(':up')
    name = name.removesuffix(':up')
    if name in MASTERS:
        body=f'<path d="{grid_path(MASTERS[name])}"/>'
    else:
        body=body_of((GLYPHS / (name + '.svg')).read_text())
    if flip:
        # Bake the inversion, retaining integer, even, axis-aligned coordinates.
        chunks=re.findall(r'M(\d+) (\d+)h(\d+)v(\d+)h-\d+z', body)
        body='<path d="'+''.join(f'M{24-int(x)-int(w)} {24-int(y)-int(h)}h{w}v{h}h-{w}z' for x,y,w,h in chunks)+'"/>'
    return body

MAPPING = {}
def assign(name, paths):
    for path in paths.split():
        MAPPING[path+'.svg'] = name

assign('send', 'bottom-bar/send wallet/common/send wallet/history/transfer')
assign('check', 'checkbox/checked favorite-accounts/save select/active menu/rpc/save-rpc-button')
assign('pencil', 'favorite-accounts/edit')
assign('trash', 'favorite-accounts/delete global/delete select/delete menu/advanced-settings/clear-all')
assign('close', 'favorite-accounts/cancel input/clear top-bar/close-button menu/rpc/close-button')
assign('chevron-down', 'global/arrow global/expand-collapse governance/proposal/expand-collapse select/arrow-down wallet/history/expand-collapse')
assign('chevron-down:up', 'select/arrow-up')
assign('forward', 'global/arrow-right')
assign('plus', 'global/add-circle menu/rpc/add-button')
assign('warning', 'global/error')
assign('pause', 'governance/my-witness/deactivated')
assign('chain', 'governance/witness-link')
assign('arrow-down:up', 'governance/proposal/upvote governance/proposal/upvote-value governance/update-downvote-witness wallet/hive/power-up wallet/history/power-up')
assign('coin', 'governance/proposal/budget')
assign('clock', 'governance/proposal/duration menu/user-preferences/automated-tasks wallet/common/history')
assign('search', 'wallet/search input/search')
assign('eye', 'input/show')
assign('eye-off', 'input/hide')
assign('maximum', 'input/max')
assign('lock', 'input/encrypt menu/advanced-settings/auto-lock wallet/history/escrow')
assign('unlock', 'input/decrypt')
assign('at', 'input/at')
assign('grid', 'top-bar/menu-button')
assign('sun', 'menu/theme/light-theme')
assign('moon', 'menu/theme/dark-theme')
assign('profile', 'menu/accounts')
assign('follow', 'menu/accounts/add-account wallet/history/claim-account')
assign('follow-filled', 'menu/accounts/create-account')
assign('community', 'menu/accounts/manage-accounts')
assign('key', 'menu/accounts/manage-authorities menu/advanced-settings/change-password')
assign('download', 'menu/accounts/export menu/advanced-settings/export-settings resources/delegation-incoming')
assign('upload', 'menu/advanced-settings/import-settings resources/delegation-outgoing wallet/history/stake')
assign('download', 'wallet/history/unstake')
assign('settings', 'menu/advanced-settings')
assign('repost', 'menu/advanced-settings/import-export-settings wallet/common/convert wallet/history/convert')
assign('network', 'menu/advanced-settings/rpc-nodes')
assign('keyboard', 'menu/advanced-settings/shortcuts')
assign('vote', 'menu/governance')
assign('logout', 'menu/logout')
assign('plug', 'menu/plugins')
assign('share', 'menu/user-preferences/detach')
assign('sliders', 'menu/user-preferences wallet/history/filter-button')
assign('license', 'menu/user-preferences/operations')
assign('heart', 'menu/user-preferences/favorite-accounts')
assign('theme', 'menu/user-preferences/theme')
assign('energy', 'resources/mana')
assign('resource', 'resources/rc wallet/hp/rc-delegations wallet/history/rc-delegations')
assign('savings', 'resources/savings wallet/common/savings wallet/history/savings')
assign('wallet', 'resources/wallet')
assign('back', 'top-bar/back-button')
assign('gift', 'top-bar/claim-rewards-button wallet/history/claim-rewards')
assign('copy', 'select/copy')
assign('grip', 'select/drag')
assign('arrow-down', 'wallet/hp/power-down wallet/history/power-down')
assign('delegate', 'wallet/hp/hp-delegations wallet/history/hp-delegations')
assign('upload', 'wallet/history/back-to-top')


def write_svg(rel, body, view='0 0 24 24', width=24, height=24, attrs='fill="currentColor" shape-rendering="crispEdges" aria-hidden="true"'):
    (OUT/rel).parent.mkdir(parents=True, exist_ok=True)
    # Presentation attribute is lower priority than host CSS. This keeps the
    # existing app's fixed white ancestor color from erasing light-theme icons.
    # Standalone review sheets inherit their own ink; no hardcoded icon color.
    if 'fill="currentColor"' in attrs:
        attrs += ' color="var(--main-font-color, inherit)"'
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{view}" {attrs}>{body}</svg>\n'
    (OUT/rel).write_text(svg)
    return svg

# Preserve intrinsic footprints where the caller relies on the asset dimensions.
FOOTPRINTS = {
 'top-bar/claim-rewards-button.svg': (35,35),
 'checkbox/checked.svg': (12,12),
 'wallet/common/history.svg': (36,36),
 'wallet/history/back-to-top.svg': (33,33),
}
for rel,name in sorted(MAPPING.items()):
    wh=FOOTPRINTS.get(rel, (45,40) if rel.startswith('menu/') and not rel.startswith('menu/rpc/') else (24,24))
    write_svg(rel, glyph_body(name), width=wh[0], height=wh[1])

BASE = 'M2 2H14V10H6V14H2ZM6 4V8H10V4Z'
CONCEPTS = {
 'Keeper tooth': 'M2 2H14V10H6V12H8V14H2ZM6 4V8H10V4Z',
 'Notched stem': 'M2 2H14V10H6V11H4V12H6V14H2ZM6 4V8H10V4Z',
 'Open keyway': 'M2 2H14V10H9V8H10V4H6V8H7V10H6V14H2Z',
}

def mark_body(d=CONCEPTS['Keeper tooth']):
    p=f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>'
    for (x,y),c in zip([(10,2),(12,2),(10,4),(12,4)],PRISM):
        p+=f'<rect x="{x}" y="{y}" width="2" height="2" fill="{c}"/>'
    return p

mark = mark_body()
for rel,size in [('pixtopia-keychain-mark.svg',64),('keychain-round-logo.svg',80),('keychain-round-logo-small.svg',50),('top-bar/keychain-logo.svg',40)]:
    write_svg(rel, mark, '0 0 16 16',size,size)
icon=write_svg('pixtopia-keychain-icon.svg', '<path fill="#0B0B0C" d="M0 0H16V16H0Z"/>'+mark, '0 0 16 16',128,128,'color="#F5F5F5" shape-rendering="crispEdges" role="img" aria-label="Pixtopia Keychain"')
for size in [16,32,48,128]:
    subprocess.run(['resvg','-w',str(size),'-h',str(size),str(OUT/'pixtopia-keychain-icon.svg'),str(OUT/f'icon-{size}.png')],check=True, capture_output=True)

# Exact supplied Pixtopia outlines. New letters use its four-unit stems,
# 18-unit x-height, integer vertices, square dot and chamfered corners.
word = body_of((BRAND/'pixtopia-wordmark.svg').read_text())
word = re.sub(r'<title[^>]*>.*?</title>', '', word)
LETTERS = [
 (0,'M0 2H4V15L11 8H17L9 16L18 26H12L4 18V26H0Z'),
 (22,'M3 8H15L18 11V19H4V21L5 22H18V26H3L0 23V11ZM5 12L4 13V15H14V13L13 12Z'),
 (44,'M0 8H4V21L5 22H14V8H18V29L15 32H2V28H13L14 27V26H3L0 23Z'),
 (66,'M3 8H18V12H5L4 13V21L5 22H18V26H3L0 23V11Z'),
 (88,'M0 2H4V8H15L18 11V26H14V13L13 12H4V26H0Z'),
 (110,'M3 8H18V26H3L0 23V11ZM5 12L4 13V21L5 22H14V12Z'),
 (133,'M0 8H4V26H0ZM0 1H4V5H0Z'),
 (142,'M0 8H15L18 11V26H14V13L13 12H4V26H0Z'),
]
key_word='<g fill="currentColor" fill-rule="evenodd">'+''.join(f'<path transform="translate({x} 0)" d="{d}"/>' for x,d in LETTERS)+'</g>'
# Keep the source mark / Pixtopia line spacing: scale 3, word at (60, 8).
# A second outlined line avoids an overlong product lockup in the popup.
lockup=f'<g transform="scale(3)">{mark}</g><g transform="translate(60 8)">{word}</g><g transform="translate(60 44)">{key_word}</g>'
for rel,w,h in [('pixtopia-keychain-lockup.svg',228,80),('keychain-full-logo.svg',228,80)]:
    write_svg(rel,lockup,'0 0 228 80',w,h,'fill="currentColor" role="img" aria-label="Pixtopia Keychain"')
# Splash carries no text; the existing caption is live, accessible UI text.
write_svg('splashscreen/keychain-logo.svg',mark,'0 0 16 16',128,128)

# Identity marks: window / stable bars / rising steps. Recognizable in mono.
TOKENS = {
 'wallet/hive-logo.svg': ('PIXA', ['..######..','..######..','##......##','##......##','##..##..##','##..##..##','##......##','##......##','..######..','..######..'],PRISM[0]),
 'wallet/hbd-logo.svg': ('PXS', ['.########.','.#......#.','.#.####.#.','.#......#.','.#......#.','.#......#.','.#......#.','.#.####.#.','.#......#.','.########.'],PRISM[2]),
 'wallet/hp-logo.svg': ('Pixa Power', ['....##....','...####...','..##..##..','.##....##.','##..##..##','...####...','..##..##..','.##....##.','##......##','..........'],PRISM[1]),
}
for rel,(label,rows,c) in TOKENS.items():
    # Neutral shape carries contrast in either theme; one Prism pixel is identity.
    body=f'<path d="{grid_path(rows)}"/><path fill="{c}" d="M10 10h4v4h-4z"/>'
    if label=='PXS': body=f'<path d="{grid_path(rows)}"/><path fill="{c}" d="M8 10h8v4H8z"/>'
    if label=='Pixa Power': body=f'<path d="{grid_path(rows)}"/><path fill="{c}" d="M10 2h4v2h-4z"/>'
    write_svg(rel,body,width=36,height=36,attrs=f'fill="currentColor" shape-rendering="crispEdges" role="img" aria-label="{label}"')

# Large state art is still a 2-unit pixel master. No embedded labels.
STATE_ROWS = {
 'success': ['..######..','.#......#.','#........#','#......#.#','#.....#..#','#.#..#...#','#..##....#','#........#','.#......#.','..######..'],
 'error': ['..######..','.#......#.','#........#','#..#..#..#','#..#..#..#','#........#','#...##...#','.#......#.','..######..','...##.....'],
 'warning': MASTERS['warning'],
}
for name,rows in STATE_ROWS.items():
    color={'success':PRISM[2],'error':PRISM[3],'warning':PRISM[1]}[name]
    accents={'success':'M16 8h2v2h-2zM14 10h2v2h-2zM6 12h2v2h-2zM12 12h2v2h-2zM8 14h4v2H8z', 'error':'M10 14h4v2h-4z', 'warning':'M10 8h4v6h-4zM10 16h4v2h-4z'}[name]
    write_svg(f'message/{name}.svg',f'<path d="{grid_path(rows)}"/><path fill="{color}" d="{accents}"/>',width=96,height=96)

for theme,c in [('dark','#262626'),('light','#E7E7E9')]:
    dots=''.join(f'M{x} {y}h2v2h-2z' for y in range(14,270,24) for x in range(14,435,24))
    write_svg(f'background/{theme}.svg',f'<path fill="{c}" d="{dots}"/>','0 0 435 270',435,270,'shape-rendering="crispEdges" aria-hidden="true"')

# Vector sources for the two hardcoded .png call sites. These are the necessary
# pixel-art compatibility exports; changing callers is outside the write scope.
avatar = '<path fill="#0B0B0C" d="M0 0H24V24H0Z"/>'
avatar += '<path fill="#F5F5F5" d="M8 4h8v2H8zM6 6h2v6H6zM16 6h2v6h-2zM8 12h8v2H8zM6 16h12v2H6zM4 18h2v4H4zM18 18h2v4h-2zM6 20h12v2H6z"/>'
avatar += '<path fill="#4CA8FF" d="M10 8h4v2h-4z"/>'
write_svg('placeholders/account-placeholder.svg',avatar,width=96,height=96,attrs='shape-rendering="crispEdges" role="img" aria-label="Account"')
detached_dots=''.join(f'M{x} {y}h2v2h-2z' for y in range(16,256,32) for x in range(16,256,32))
write_svg('background/detached-popup-background.svg',f'<path fill="#737373" opacity="0.12" d="{detached_dots}"/>', '0 0 256 256',256,256,'shape-rendering="crispEdges" aria-hidden="true"')
for rel in ['placeholders/account-placeholder','background/detached-popup-background']:
    subprocess.run(['resvg',str(OUT/(rel+'.svg')),str(OUT/(rel+'.png'))],check=True,capture_output=True)

# Export provenance and exact file-to-glyph mapping for the restyle handoff.
(DOC/'graphics-inventory.json').write_text(json.dumps({'glyphs':MAPPING,'new_masters':MASTERS,'tokens':{k:v[0] for k,v in TOKENS.items()},'mark':'Keeper tooth'},indent=2)+'\n')
print(f'Wrote {len(MAPPING)} glyph assets, product identity, 3 tokens, 3 states and 2 backgrounds.')
