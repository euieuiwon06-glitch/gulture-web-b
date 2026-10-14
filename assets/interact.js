// gulture 시안B — screen switching, window fitting and the clickable states of every screen.
// Elements carry their Figma box in data-b (x,y,w,h in stage px), texts their label in data-tx,
// rectangles / icons their Figma layer name in data-nm, buttons a click area with data-btn.
(() => {
  const ORDER = window.ORDER;
  const stages = [...document.querySelectorAll('.stage')];
  const vp = document.getElementById('viewport');
  const menu = document.getElementById('menu');
  const toastEl = document.getElementById('toast');
  let stage = stages[0], timer = null, toastTimer = null;

  const INK = '#121212', PAPER = '#fcfaf7';
  const box = el => el.dataset.b.split(',').map(Number);
  const cx = el => { const b = box(el); return b[0] + b[2] / 2; };
  const cy = el => { const b = box(el); return b[1] + b[3] / 2; };
  const scr = () => stage.querySelector('.screen.on');
  const texts = (s, label) => [...s.querySelectorAll('[data-tx]')].filter(t => t.dataset.tx === label);
  const named = (s, nm) => [...s.querySelectorAll('[data-nm]')].filter(e => e.dataset.nm === nm);

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  // ---------------- fitting ----------------
  // pick the Figma size whose aspect ratio is closest to the window and fit it without cropping;
  // portrait screens use the 1440 set at full width and scroll
  function fit() {
    const W = window.innerWidth, H = window.innerHeight, portrait = W < H;
    let best = stages[0];
    if (!portrait) {
      const r = Math.log(W / H);
      best = stages.reduce((a, b) =>
        Math.abs(Math.log(b.dataset.w / b.dataset.h) - r) < Math.abs(Math.log(a.dataset.w / a.dataset.h) - r) ? b : a);
    }
    if (best !== stage) { stage = best; show(current()); }
    stages.forEach(s => s.classList.toggle('on', s === stage));
    const sw = +stage.dataset.w, sh = +stage.dataset.h;
    const s = portrait ? W / sw : Math.min(W / sw, H / sh);
    const left = (W - sw * s) / 2;
    stage.style.transform = 'translate(' + left + 'px,0) scale(' + s + ')';
    bleed(left / s, portrait ? 0 : (H - sh * s) / s);
    vp.style.height = (portrait ? sh * s : H) + 'px';
    document.documentElement.style.overflowY = portrait ? 'auto' : 'hidden';
  }

  // photos / bars touching the frame edge reach the window edge instead of leaving paper-coloured bars
  function bleed(mx, my) {
    const sw = +stage.dataset.w, sh = +stage.dataset.h;
    stage.querySelectorAll('.screen > .n:not(.t):not(svg):not(.hit)').forEach(el => {
      const b = box(el);
      const extL = b[0] <= 0.5, extR = b[0] + b[2] >= sw - 1, extB = b[3] > 3 && b[1] + b[3] >= sh - 1;
      if (!extL && !extR && !extB) return;
      const L = b[0] - (extL ? mx : 0);
      const w2 = b[2] + (extL ? mx : 0) + (extR ? mx : 0), h2 = b[3] + (extB ? my : 0);
      el.style.left = L + 'px';
      el.style.width = w2 + 'px';
      if (b[3] > 3) el.style.height = h2 + 'px';
      if (el._bg === undefined) el._bg = [el.style.backgroundSize, el.style.backgroundPosition];
      const sz = (el._bg[0] || '').match(/^([\d.-]+)px ([\d.-]+)px$/);
      const ps = (el._bg[1] || '').match(/^([\d.-]+)px ([\d.-]+)px$/);
      if (sz && ps) {
        // grow the photo around the original box centre just enough to cover the extended box
        const iw = +sz[1], ih = +sz[2], px = +ps[1], py = +ps[2];
        const c = b[0] + b[2] / 2, il = b[0] + px, ir = il + iw;
        const f = Math.max(1, (c - (b[0] - (extL ? mx : 0))) / Math.max(1e-6, c - il),
          (b[0] + b[2] + (extR ? mx : 0) - c) / Math.max(1e-6, ir - c), h2 / Math.max(1e-6, ih + py));
        el.style.backgroundSize = iw * f + 'px ' + ih * f + 'px';
        el.style.backgroundPosition = (c - (c - il) * f - L) + 'px ' + py * f + 'px';
      }
    });
  }

  // ---------------- navigation ----------------
  const current = () => location.hash.replace(/^#\/?/, '') || ORDER[0];
  function go(slug) { location.hash = '#/' + slug; }

  function show(slug) {
    if (!ORDER.includes(slug)) slug = ORDER[0];
    let cur = null;
    stage.querySelectorAll('.screen').forEach(el => {
      const on = el.dataset.slug === slug;
      el.classList.toggle('on', on);
      if (on) cur = el;
    });
    document.querySelectorAll('.stage:not(.on) .screen.on').forEach(el => { if (el.parentNode !== stage) el.classList.remove('on'); });
    menu.querySelectorAll('a').forEach(a => a.classList.toggle('cur', a.getAttribute('href') === '#/' + slug));
    document.title = 'gulture — ' + cur.dataset.title;
    setup(cur);
    clearTimeout(timer);
    if (slug === 'analyzing') load(cur, 68, 'proportions');
    if (slug === 'preparing') load(cur, 72, 'room');
    window.scrollTo(0, 0);
  }

  // label -> screen. Per-screen entries win over the shared header links.
  const NAV = {
    LOOKS: 'looks', FITTING: 'select', JOURNAL: 'direction', SHOP: 'looks', shop: 'looks', COLLECTION: 'style',
    collections: 'style', atelier: 'product', journal: 'direction', about: 'hero', ABOUT: 'hero', STORES: 'buy',
    'BAG (0)': 'saved', ACCOUNT: 'login',
  };
  const ROUTES = {
    hero: { 'START YOUR PROFILE': 'login' },
    login: { CONTINUE: 'body', 'CONTINUE WITH GOOGLE': 'body', 'CONTINUE WITH APPLE': 'body' },
    body: { CONTINUE: 'photos' },
    proportions: { 'EXPLORE LOOKS': 'chat' },
    tonight: { 'TRY THIS LOOK': 'preparing', 'VIEW ITEMS': 'pieces' },
    style: { CONTINUE: 'direction' },
    direction: { CONTINUE: 'looks' },
    looks: { 'TRY THIS LOOK': 'sculpted', 'LOOK 024': 'sculpted', 'SCULPTED QUIET': 'sculpted' },
    quiet: { 'TRY THIS LOOK': 'preparing', 'COMPARE ALL': 'compare' },
    sculpted: { 'TRY THIS LOOK': 'preparing', 'RELATED\nLOOK': 'quiet' },
    select: { 'GENERATE FITTING': 'preparing' },
    room: { 'SAVE LOOK': 'saved', 'VIEW PIECES': 'pieces' },
    compare: { BACK: 'room', 'SAVE SIZE': 'product' },
    product: { 'SAVE LOOK': 'saved' },
    pieces: { 'VISIT STORE': 'buy', 'BACK TO FITTING': 'room' },
  };
  const TOASTS = {
    SEARCH: 'Search — coming soon', search: 'Search — coming soon', 'ADD TO BAG': 'Added to your bag',
    'VISIT STORE': 'Continuing to the retailer…', 'FORGOT': '',
  };
  // big photos that open a look
  const PHOTO = { looks: { '18': 'quiet', '19': 'sculpted', '20': 'quiet' }, quiet: { '13': 'sculpted', '24': 'sculpted' },
                  saved: { '01': 'pieces', '02': 'looks', '03': 'pieces', '04': 'product', '05': 'product' },
                  pieces: { '43': 'room' }, buy: { '29': 'looks', '30': 'looks' }, tonight: { '44': 'pieces' } };

  function route(s, label) {
    const r = (ROUTES[s.dataset.slug] || {})[label] || NAV[label];
    if (r) { go(r); return true; }
    if (TOASTS[label]) { toast(TOASTS[label]); return true; }
    return false;
  }

  // ---------------- per-screen setup (runs once per screen per size) ----------------
  function setup(s) {
    if (s._ready) return;
    s._ready = true;
    const slug = s.dataset.slug;
    // clickable texts / photos get a pointer
    s.querySelectorAll('[data-tx]').forEach(t => {
      const l = t.dataset.tx;
      if ((ROUTES[slug] || {})[l] || NAV[l] || TOASTS[l]) t.classList.add('link');
    });
    s.querySelectorAll('.img').forEach(el => {
      if ((PHOTO[slug] || {})[el.dataset.nm.slice(4)]) el.classList.add('link');
    });
    s.querySelectorAll('svg[data-nm="logo"],svg[data-nm="icon/user"],svg[data-nm="icon/bag"],svg[data-nm="icon/search"]')
      .forEach(el => el.classList.add('link'));
    // button hover: darken / tint the button rectangle under the click area
    s.querySelectorAll('.hit').forEach(h => {
      const r = [...s.querySelectorAll('[data-nm="btn"]')].find(e => e.dataset.b === h.dataset.b);
      if (!r) return;
      r.classList.add('press');
      h.addEventListener('mouseenter', () => r.classList.add('hover-dim'));
      h.addEventListener('mouseleave', () => r.classList.remove('hover-dim'));
      h.addEventListener('mousedown', () => { r.style.transform = 'scale(.985)'; });
      h.addEventListener('mouseup', () => { r.style.transform = ''; });
    });
    GROUPS[slug] && GROUPS[slug].forEach(g => optionGroup(s, g));
    (EXTRA[slug] || (() => {}))(s);
  }

  // ---------------- option rows with a moving underline ----------------
  const GROUPS = {
    login: [['LOG IN', 'CREATE ACCOUNT']],
    body: [['WOMENSWEAR', 'MENSWEAR', 'NEUTRAL'], ['TIGHT', 'BALANCED', 'RELAXED']],
    looks: [['ALL', 'TAILORING', 'KNIT', 'OUTERWEAR', 'DRESSES']],
    tonight: [],
    select: [['S', 'M', 'L']],
    compare: [['S', 'M', 'L']],
  };
  function optionGroup(s, labels) {
    const bars = [...s.querySelectorAll('[data-nm]')].filter(e => /underline|^line$/.test(e.dataset.nm));
    // the underline sits just below one of the labels: that label is the active one
    let best = null;
    labels.forEach(l => texts(s, l).forEach(t => bars.forEach(b => {
      const tb = box(t), bb = box(b);
      const dy = bb[1] - (tb[1] + tb[3]), dx = Math.abs(cx(b) - cx(t));
      if (dy > -4 && dy < 30 && dx < Math.max(30, tb[2] / 2) && bb[2] < 400 && bb[3] < 4) {
        const d = dy + dx;
        if (!best || d < best.d) best = { d, t, b };
      }
    })));
    if (!best) return;
    const bar = best.b, gap = box(bar)[1] - (box(best.t)[1] + box(best.t)[3]);
    const dist = t => Math.hypot(cx(t) - cx(best.t), cy(t) - cy(best.t));
    const opts = labels.map(l => texts(s, l).sort((a, b) => dist(a) - dist(b))[0]).filter(Boolean);
    const follow = Math.abs(box(bar)[2] - box(best.t)[2]) < box(best.t)[2] * 0.35;
    bar.classList.add('mv');
    const pick = t => {
      opts.forEach(o => { o.classList.add('fade'); o.style.color = o === t ? INK : '#8a8782'; });
      const w = follow ? box(t)[2] : box(bar)[2];
      bar.style.width = w + 'px';
      bar.style.left = cx(t) - w / 2 + 'px';
      bar.style.top = box(t)[1] + box(t)[3] + gap + 'px';
    };
    opts.forEach(o => { o.classList.add('ui'); o.addEventListener('click', e => { e.stopPropagation(); pick(o); }); });
  }

  // ---------------- small helpers for the screen-specific states ----------------
  function checkbox(el, on) {
    el._on = on === undefined ? !el._on : on;
    el.classList.add('fade');
    el.style.background = el._on ? INK : 'transparent';
    el.style.boxShadow = el._on ? 'none' : 'inset 0 0 0 1.3px ' + INK;
  }
  function textInput(s, rectName, placeholderEl, opts = {}) {
    const r = named(s, rectName)[0];
    if (!r || !placeholderEl) return null;
    const b = box(r), tb = box(placeholderEl), cs = placeholderEl.style;
    const inp = document.createElement('input');
    inp.className = 'field';
    inp.type = opts.type || 'text';
    inp.placeholder = placeholderEl.textContent;
    Object.assign(inp.style, {
      left: tb[0] + 'px', top: b[1] + 'px', width: (b[0] + b[2] - tb[0] - (opts.padRight || 12)) + 'px', height: b[3] + 'px',
      fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, color: cs.color, fontWeight: cs.fontWeight,
    });
    placeholderEl.style.visibility = 'hidden';
    s.appendChild(inp);
    return inp;
  }
  function editable(t) {
    t.contentEditable = 'true';
    t.spellcheck = false;
    t.style.outline = 'none';
    t.classList.add('ui');
  }
  function cycle(t, values) {
    let i = values.indexOf(t.textContent);
    t.textContent = values[(i + 1) % values.length];
    t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop');
  }
  function onClick(el, fn) { if (!el) return; el.classList.add('ui'); el.addEventListener('click', e => { e.stopPropagation(); fn(e); }); }

  // loading screens: bar fills, percentage counts up, then moves on
  function load(s, target, next) {
    const fill = named(s, 'progress fill')[0];
    const pct = texts(s, target + '%')[0] || [...s.querySelectorAll('[data-tx]')].find(t => /^\d+%$/.test(t.textContent));
    if (!fill) return;
    const W = box(fill)[2];
    const t0 = performance.now(), dur = 2400;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      fill.style.width = W * e + 'px';
      if (pct) pct.textContent = Math.round(target * e) + '%';
      if (k < 1 && s.classList.contains('on')) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    timer = setTimeout(() => { if (s.classList.contains('on')) go(next); }, 3000);
  }

  // ---------------- screen-specific states ----------------
  const EXTRA = {
    login(s) {
      textInput(s, 'input email', texts(s, 'EMAIL')[0], { type: 'email' });
      const pw = textInput(s, 'input password', texts(s, 'PASSWORD')[0], { type: 'password', padRight: 60 });
      onClick(named(s, 'icon/eye')[0], () => { pw.type = pw.type === 'password' ? 'text' : 'password'; pw.focus(); });
    },
    body(s) {
      const h = texts(s, '168')[0];
      if (h) editable(h);
      const size = texts(s, 'S')[0], ref = texts(s, 'Athletic')[0];
      const chev = named(s, 'icon/chev').sort((a, b) => box(a)[1] - box(b)[1]);
      const sizes = ['S', 'M', 'L', 'XS'], refs = ['Athletic', 'Slim', 'Curvy', 'Petite'];
      onClick(size, () => cycle(size, sizes)); onClick(chev[0], () => cycle(size, sizes));
      onClick(ref, () => cycle(ref, refs)); onClick(chev[1], () => cycle(ref, refs));
    },
    photos(s) {
      const status = texts(s, 'Not added');
      const add = () => {
        status.forEach((t, i) => setTimeout(() => { t.textContent = 'Added ✓'; t.style.color = INK; t.classList.add('pop'); }, i * 300));
        setTimeout(() => go('analyzing'), 1100);
      };
      s.querySelectorAll('.hit').forEach(h => onClick(h, add));
    },
    chat(s) {
      const inp = textInput(s, 'chat input', texts(s, 'TELL ME THE OCCASION, MOOD OR WEATHER...')[0]);
      const send = () => { if (!inp.value.trim()) inp.value = 'Dinner tonight'; toast('Styling: ' + inp.value); setTimeout(() => go('tonight'), 700); };
      onClick(named(s, 'send')[0], send); onClick(named(s, 'icon/arrow')[0], send);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      ['DINNER TONIGHT', 'WORK TOMORROW', 'WEEKEND AWAY'].forEach(l => texts(s, l).forEach(t =>
        onClick(t, () => { inp.value = l.charAt(0) + l.slice(1).toLowerCase(); send(); })));
    },
    tonight(s) {
      const inp = textInput(s, 'chat input', texts(s, 'TELL ME WHAT YOU’D CHANGE...')[0]);
      const send = () => {
        const v = inp.value.trim() || 'Make it a little sharper';
        inp.value = '';
        toast('Refining your edit…');
        setTimeout(() => go('preparing'), 900);
        return v;
      };
      onClick(named(s, 'send')[0], send); onClick(named(s, 'icon/arrow').find(a => box(a)[0] < box(named(s, 'send')[0])[0] + 90), send);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      const save = texts(s, 'SAVE')[0], heart = named(s, 'icon/heart')[0];
      const toggle = () => {
        const on = save.textContent === 'SAVE';
        save.textContent = on ? 'SAVED' : 'SAVE';
        heart.style.fill = on ? '#1c2240' : '';
        heart.classList.remove('pop'); void heart.getBoundingClientRect(); heart.classList.add('pop');
        toast(on ? 'Saved to your looks' : 'Removed');
      };
      onClick(save, toggle); onClick(heart, toggle);
      onClick(named(s, 'icon/ne')[0], () => go('pieces'));
    },
    style(s) {
      const boxes = [...named(s, 'checkbox'), ...named(s, 'checkbox on')];
      boxes.forEach(b => { b._on = b.dataset.nm === 'checkbox on'; });
      const count = [...s.querySelectorAll('[data-tx]')].find(t => /SELECTED$/.test(t.textContent));
      const update = () => { count.textContent = boxes.filter(b => b._on).length + ' SELECTED'; };
      const toggle = b => { checkbox(b); update(); };
      boxes.forEach(b => {
        onClick(b, () => toggle(b));
        const lab = [...s.querySelectorAll('[data-tx]')].find(t => Math.abs(cy(t) - cy(b)) < 10 && box(t)[0] > box(b)[0] && box(t)[0] - box(b)[0] < 80);
        onClick(lab, () => toggle(b));
        const img = [...s.querySelectorAll('.img')].find(i => Math.abs(box(i)[0] - box(b)[0]) < 6 && box(b)[1] > box(i)[1] + box(i)[3] - 2 && box(b)[1] - (box(i)[1] + box(i)[3]) < 40);
        if (img) { img.classList.add('link'); onClick(img, () => toggle(b)); }
      });
    },
    direction(s) {
      s.querySelectorAll('.img').forEach(img => onClick(img, () => {
        img._on = !img._on;
        img.classList.add('fade');
        img.style.boxShadow = img._on ? '0 0 0 3px ' + PAPER + ', 0 0 0 4px ' + INK : '';
        toast(img._on ? 'Direction added' : 'Direction removed');
      }));
      named(s, 'marker').forEach(m => onClick(m, () => checkbox(m)));
    },
    room(s) {
      const imgs = [...s.querySelectorAll('.img')];
      const main = imgs.reduce((a, b) => box(a)[2] * box(a)[3] > box(b)[2] * box(b)[3] ? a : b);
      const outline = named(s, 'selected outline')[0];
      const labels = ['FRONT', 'SIDE', 'BACK'].map(l => texts(s, l)[0]);
      const bar = [...s.querySelectorAll('[data-nm="line"]')].find(b => labels[0] && Math.abs(cx(b) - cx(labels[0])) < 10 && box(b)[1] > box(labels[0])[1]);
      const thumbs = labels.map(l => imgs.find(i => i !== main && Math.abs(cx(i) - cx(l)) < 20 && box(i)[1] < box(l)[1]));
      const orig = main.style.background;
      if (outline) outline.classList.add('mv');
      if (bar) bar.classList.add('mv');
      thumbs.forEach((th, i) => {
        if (!th) return;
        const pick = () => {
          if (outline) { const b = box(th); outline.style.left = b[0] + 'px'; outline.style.top = b[1] + 'px'; }
          if (bar) bar.style.left = cx(labels[i]) - box(bar)[2] / 2 + 'px';
          labels.forEach((l, k) => { l.classList.add('fade'); l.style.opacity = k === i ? 1 : 0.5; });
          main.classList.add('fade');
          main.style.background = i === 0 ? orig : th.style.backgroundImage + ' center 18% / cover no-repeat';
        };
        th.classList.add('link'); onClick(th, pick); onClick(labels[i], pick);
      });
    },
    product(s) {
      const opts = ['S', 'M', 'L'].map(l => {
        const t = texts(s, l)[0];
        const r = t && [...s.querySelectorAll('[data-nm]')].find(e => !e.matches('svg') && box(e)[2] < 60 && box(e)[3] < 60 && box(e)[2] > 20 &&
          Math.abs(cx(e) - cx(t)) < 6 && Math.abs(cy(e) - cy(t)) < 6);
        return [t, r];
      }).filter(o => o[0] && o[1]);
      const pick = i => opts.forEach(([t, r], k) => {
        r.classList.add('fade'); t.classList.add('fade');
        r.style.background = k === i ? INK : 'transparent';
        r.style.boxShadow = k === i ? 'none' : 'inset 0 0 0 1px #8a8782';
        t.style.color = k === i ? '#fff' : INK;
      });
      opts.forEach(([t, r], i) => { onClick(t, () => pick(i)); onClick(r, () => pick(i)); });
      onClick(named(s, 'icon/down')[0], () => go('pieces'));
    },
    compare(s) {},
    buy(s) {
      const boxes = [...named(s, 'Rectangle'), ...named(s, '')].filter(e => !e.matches('svg') && box(e)[2] < 30 && box(e)[2] > 10);
      const rows = boxes.map(b => [b, [...s.querySelectorAll('[data-tx]')].filter(t => Math.abs(cy(t) - cy(b)) < 10)]);
      boxes.forEach(b => { b._on = b.style.background && !/transparent/.test(b.style.background); });
      const pick = i => rows.forEach(([b], k) => checkbox(b, k === i));
      rows.forEach(([b, ts], i) => { onClick(b, () => pick(i)); ts.forEach(t => onClick(t, () => pick(i))); });
      s.querySelectorAll('.hit').forEach(h => onClick(h, () => {
        const i = rows.findIndex(([b]) => b._on);
        toast('Continuing to ' + (rows[i] ? rows[i][1][0].textContent : 'the retailer') + '…');
      }));
    },
    saved(s) {
      let added = 0;
      s.querySelectorAll('.hit').forEach(h => {
        const t = [...s.querySelectorAll('[data-tx="ADD LOOK"]')].find(x => Math.abs(cx(x) - cx(h)) < 20 && Math.abs(cy(x) - cy(h)) < 20);
        const r = [...s.querySelectorAll('[data-nm="btn"]')].find(e => e.dataset.b === h.dataset.b);
        onClick(h, () => {
          h._on = !h._on;
          added += h._on ? 1 : -1;
          if (t) t.textContent = h._on ? 'ADDED ✓' : 'ADD LOOK';
          if (r) { r.style.background = h._on ? PAPER : INK; r.style.boxShadow = h._on ? 'inset 0 0 0 1px ' + INK : ''; }
          if (t) t.style.color = h._on ? INK : '#fff';
          toast(h._on ? 'Look selected' : 'Look removed');
        });
      });
      const bar = [...s.querySelectorAll('[data-tx]')].find(t => /^ADD SELECTED/.test(t.dataset.tx));
      onClick(bar, () => toast(added ? added + (added > 1 ? ' looks' : ' look') + ' added to your bag' : 'Select a look first'));
      const sw = named(s, 'swatch');
      sw.forEach(w => onClick(w, () => {
        sw.filter(o => Math.abs(cy(o) - cy(w)) < 4).forEach(o => { o.style.outline = ''; });
        w.style.outline = '1px solid ' + INK; w.style.outlineOffset = '2px';
      }));
      const conn = named(s, 'connector')[0];
    },
    pieces(s) {},
    quiet(s) {},
  };

  // ---------------- global clicks ----------------
  vp.addEventListener('click', e => {
    const s = scr();
    const hit = e.target.closest('.hit');
    if (hit) { route(s, hit.dataset.btn); return; }
    const t = e.target.closest('[data-tx]');
    if (t && route(s, t.dataset.tx)) return;
    const n = e.target.closest('[data-nm]');
    if (!n) return;
    const nm = n.dataset.nm;
    if (nm === 'logo') return go(ORDER[0]);
    if (nm === 'icon/user') return go('login');
    if (nm === 'icon/bag') return go('saved');
    if (nm === 'icon/search') return toast('Search — coming soon');
    if (nm.startsWith('img:')) { const r = (PHOTO[s.dataset.slug] || {})[nm.slice(4)]; if (r) go(r); }
  });

  document.getElementById('idx').onclick = () => menu.classList.add('on');
  document.getElementById('close').onclick = () => menu.classList.remove('on');
  menu.addEventListener('click', e => { if (e.target.closest('a')) menu.classList.remove('on'); });
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, [contenteditable="true"]')) return;
    if (e.key === 'Escape') return menu.classList.remove('on');
    const i = ORDER.indexOf(current());
    if (e.key === 'ArrowRight') go(ORDER[Math.min(i + 1, ORDER.length - 1)]);
    if (e.key === 'ArrowLeft') go(ORDER[Math.max(i - 1, 0)]);
  });
  window.addEventListener('hashchange', () => show(current()));
  window.addEventListener('resize', fit);
  fit();
  show(current());
})();
