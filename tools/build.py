"""Build index.html from the Figma 시안B layer exports (tools/figma/{1440,1920,2048}.json).

Each JSON is one Figma page ("시안B 1440" / "시안B" / "시안B 2048") flattened to absolute
layers per frame. All three sets go into the page; the browser picks the one whose
aspect ratio is closest to the window. Run: python tools/build.py
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIG = os.path.join(ROOT, 'tools', 'figma')
SETS = ['1440', '1920', '2048']

# Figma frame number -> url slug (order = reading order of the frames on the page)
SLUG = {
    '02': 'hero', '05': 'login', '06': 'body', '07': 'photos', '08': 'analyzing', '10': 'proportions',
    '11': 'chat', '13': 'tonight', '14': 'style', '15': 'direction', '16': 'looks', '17': 'quiet',
    '18': 'sculpted', '20': 'preparing', '21': 'select', '22': 'room', '23': 'compare', '24': 'product',
    '25': 'pieces', '26': 'buy', '27': 'saved',
}

WEIGHT = {'Light': 300, 'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Bold': 700}

data = {s: json.load(open(os.path.join(FIG, s + '.json'), encoding='utf-8')) for s in SETS}

# ---------- icons -> <symbol> ----------
symbols, sym_id = [], {}
for s in SETS:
    for key, svg in data[s]['svgs'].items():
        vb = re.search(r'viewBox="([^"]+)"', svg).group(1)
        body = re.sub(r'^<svg[^>]*>|</svg>\s*$', '', svg.strip(), flags=re.S).strip()
        sig = vb + body
        if sig not in sym_id:
            sym_id[sig] = 's%d' % len(sym_id)
            symbols.append('<symbol id="%s" viewBox="%s">%s</symbol>' % (sym_id[sig], vb, body))
        data[s].setdefault('sym', {})[key] = sym_id[sig]


def px(v):
    return '%gpx' % round(float(v), 2)


def color(p):
    if isinstance(p, list):
        h, a = p
        r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
        return 'rgba(%d,%d,%d,%g)' % (r, g, b, a)
    return p


def background(p, w, h):
    if not p:
        return ''
    if isinstance(p, list) and p[0] == 'img':
        _, key, mode, (a, tx, d, ty) = p
        url = 'url(assets/img/%s.webp)' % key
        if mode == 'CROP':
            sw, sh = w / a, h / d
            return 'background:%s %s %s / %s %s no-repeat' % (url, px(-tx * sw), px(-ty * sh), px(sw), px(sh))
        return 'background:%s center / cover no-repeat' % url
    return 'background:' + color(p)


def clean(t):
    return re.sub(r'[→↗←⟶]', '', t).strip()


def render(n, sym):
    k, x, y, w, h = n[:5]
    st = ['left:' + px(x), 'top:' + px(y)]
    b = 'data-b="%g,%g,%g,%g"' % (x, y, w, h)
    if k == 'T':
        txt, fam, sty, size, ls, lh, col, al = n[5:]
        st += ['width:' + px(w + 2), 'font-family:\'%s\'' % fam, 'font-weight:%d' % WEIGHT.get(sty, 400),
               'font-size:' + px(size), 'line-height:' + px(lh), 'color:' + col]
        if ls:
            st.append('letter-spacing:%gem' % round(ls / 100, 4))
        if al == 'C':
            st += ['left:' + px(x - 1)]
            st.append('text-align:center')
        elif al == 'R':
            st += ['left:' + px(x - 2)]
            st.append('text-align:right')
        return '<div class="n t" style="%s" %s data-tx="%s">%s</div>' % (
            ';'.join(st), b, html.escape(clean(txt)), html.escape(txt))
    if k == 'S':
        key = n[5]
        st += ['width:' + px(w), 'height:' + px(h)]
        return '<svg class="n s" style="%s" %s data-nm="%s" preserveAspectRatio="none" fill="none"><use href="#%s"/></svg>' % (
            ';'.join(st), b, html.escape(key.split('|')[0]), sym[key])
    if k == 'L':
        col, dash = n[5:]
        st += ['width:' + px(w), 'height:0', 'border-top:1px %s %s' % ('dashed' if dash else 'solid', col)]
        return '<div class="n" style="%s" %s data-nm="dash"></div>' % (';'.join(st), b)
    if k == 'B':
        st += ['width:' + px(w), 'height:' + px(h)]
        return '<div class="n hit" style="%s" %s data-btn="%s"></div>' % (';'.join(st), b, html.escape(clean(n[5])))
    if k in ('R', 'E'):
        fill = n[5]
        st += ['width:' + px(w), 'height:' + px(h)]
        bg = background(fill, w, h)
        if bg:
            st.append(bg)
        nm = ''
        if k == 'R':
            stroke, sw, rad, nm = n[6:]
            if stroke:
                st.append('box-shadow:inset 0 0 0 %s %s' % (px(sw), stroke))
            if rad:
                st.append('border-radius:' + px(rad))
        else:
            if n[6]:
                st.append('box-shadow:inset 0 0 0 1.4px %s' % n[6])
            st.append('border-radius:50%')
        cls = 'n'
        if isinstance(fill, list) and fill[0] == 'img':
            cls += ' img'
            nm = 'img:' + fill[1]
        return '<div class="%s" style="%s" %s data-nm="%s"></div>' % (cls, ';'.join(st), b, html.escape(nm))
    return ''


stages = []
order = None
for s in SETS:
    d = data[s]
    frames = d['frames']
    W, H = int(frames[0]['w']), int(frames[0]['h'])
    out, slugs = [], []
    for f in frames:
        num = f['n'][4:6]
        slug = SLUG[num]
        slugs.append(slug)
        body = [render(n, d['sym']) for n in f['c'] if n[0] != 'B']
        body += [render(n, d['sym']) for n in f['c'] if n[0] == 'B']   # click areas on top
        title = f['n'].split(' ', 3)[3]
        out.append('<section class="screen" data-slug="%s" data-title="%s" style="background:%s">%s</section>'
                   % (slug, html.escape(title), f['bg'] if isinstance(f['bg'], str) else '#fcfaf7', ''.join(body)))
    if order is None:
        order = [(sl, f['n'].split(' ', 3)[3]) for sl, f in zip(slugs, frames)]
    stages.append('<div class="stage" data-set="%s" data-w="%d" data-h="%d" style="width:%dpx;height:%dpx">%s</div>'
                  % (s, W, H, W, H, '\n'.join(out)))

menu = ''.join('<a href="#/%s"><span>%02d</span>%s</a>' % (sl, i + 1, html.escape(t)) for i, (sl, t) in enumerate(order))
tpl = open(os.path.join(ROOT, 'tools', 'template.html'), encoding='utf-8').read()
page = (tpl.replace('{{SYMBOLS}}', ''.join(symbols)).replace('{{STAGES}}', '\n'.join(stages))
        .replace('{{MENU}}', menu).replace('{{ORDER}}', json.dumps([sl for sl, _ in order])))
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(page)
print('index.html', len(page) // 1024, 'KB,', len(order), 'screens x', len(SETS), 'sets,', len(symbols), 'icons')
