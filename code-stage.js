(() => {
  'use strict';
  // Stage rain keeps the section palette (commercial red / personal blue);
  // the scene plate itself is graded in CSS with the same hue shift.
  const STAGE_PAL={'':['214,255,224','46,240,96'],red:['255,214,206','240,62,46'],blue:['214,232,255','62,150,240']};
  const PAL=()=>STAGE_PAL[document.body.dataset.pal||'']||STAGE_PAL[''];
  // Unified "code stage": a flowing code-rain canvas with cut-out subjects
  // composited back at their original positions inside the artwork frame.
  // Used by the BONDEE stage (3 figures) and the ByteDance stage (6 subjects).
  // Bounding boxes overlap heavily, so hover/click hit-testing samples each
  // sprite's alpha channel instead of its box.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  function initRain(stage, cast, canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const glyphs = '01';
    const base = Math.max(9, parseFloat(stage.dataset.cell) || 16);
    let w = 0, h = 0, dpr = 1, cell = base, cols = [], last = 0, onScreen = true, raf = 0;

    function resize() {
      const r = cast.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      w = Math.round(r.width); h = Math.round(r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 620 ? Math.max(9, base - 4) : base;
      const n = Math.ceil(w / cell);
      cols = Array.from({ length: n }, (_, i) => (cols[i] || {
        y: Math.random() * h,
        speed: 0.9 + Math.random() * 2.4,   // px per frame-step, varies per column
        len: 8 + Math.floor(Math.random() * 16),
        glow: Math.random() < 0.22,
        live: Math.random() < 0.74          // leave gaps so the artwork breathes
      }));
      ctx.fillStyle = 'rgba(1,6,3,1)'; ctx.fillRect(0, 0, w, h);
    }

    function step(time) {
      raf = requestAnimationFrame(step);
      if (!onScreen || document.hidden || reduced.matches) return;
      if (time - last < 33) return;               // ~30fps is plenty for rain
      const dt = Math.min(3, (time - last) / 33);
      last = time;
      ctx.fillStyle = 'rgba(1,6,3,.10)';          // trail fade
      ctx.fillRect(0, 0, w, h);
      ctx.font = (cell - 2) + 'px ui-monospace,SFMono-Regular,Consolas,monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i], x = i * cell + cell / 2;
        c.y += c.speed * dt * 3;
        if (!c.live) { if (c.y - c.len * cell > h) { c.y = -Math.random() * h * .6; c.live = Math.random() < 0.74; } continue; }
        if (c.y - c.len * cell > h) {             // recycle above the top edge
          c.y = -Math.random() * h * .5;
          c.speed = 0.9 + Math.random() * 2.4;
          c.len = 8 + Math.floor(Math.random() * 16);
          c.glow = Math.random() < 0.22;
          c.live = Math.random() < 0.74;
        }
        const head = Math.floor(c.y / cell) * cell;
        for (let j = 0; j < c.len; j++) {
          const y = head - j * cell;
          if (y < -cell || y > h + cell) continue;
          const g = glyphs[(i * 7 + j * 3 + Math.floor(c.y / cell)) % glyphs.length];
          if (j === 0) {
            ctx.fillStyle = 'rgba(' + PAL()[0] + ',' + (c.glow ? .95 : .72) + ')';
          } else {
            const a = Math.max(0, (1 - j / c.len)) * (c.glow ? .55 : .35);
            ctx.fillStyle = 'rgba(' + PAL()[1] + ',' + a.toFixed(3) + ')';
          }
          ctx.fillText(g, x, y);
        }
      }
    }

    resize();
    addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); },
        { rootMargin: '120px' }).observe(stage);
    }
    raf = requestAnimationFrame(step);
    reduced.addEventListener?.('change', () => { if (reduced.matches) resize(); });
  }

  // --- perspective rain -----------------------------------------------------
  // The Meitu plate is a one-point-perspective code room, so flat vertical rain
  // would fight the artwork. This variant rebuilds the room in 3D and projects
  // every glyph through the same camera: k = 1/z is the perspective scale, 1 at
  // the picture plane and `back` on the rear wall. Glyph size, line spacing and
  // speed are all multiplied by k, so streams shrink and slow down with depth.
  //   side walls  : columns at a fixed depth, falling down the wall
  //   rear wall   : fronto-parallel, so an ordinary grid at scale `back`
  //   floor+ceil  : lanes at a fixed world x that travel along z, i.e. along the
  //                 vanishing lines - the floor rushes at you, the ceiling away
  function initSpaceRain(stage, cast, canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    const glyphs = '01';
    const num = (k, d) => { const v = parseFloat(stage.dataset[k]); return isFinite(v) ? v : d; };
    const geo = { vx: num('vpx', 50) / 100, vy: num('vpy', 43) / 100, nt: num('nearTop', -15.5) / 100, nb: num('nearBottom', 115.5) / 100, back: num('back', .44) };
    const base = Math.max(8, parseFloat(stage.dataset.cell) || 14);
    const Z = 1 / geo.back;                       // depth of the rear wall
    let w = 0, h = 0, dpr = 1, cell = base, vpx = 0, vpy = 0, halfW = 0, upH = 0, dnH = 0, halfV = 0;
    let walls = [], lanes = [], back = null, last = 0, onScreen = true;
    const projX = (u, k) => vpx + u * halfW * k;
    const projY = (v, k) => vpy + (v < 0 ? v * upH : v * dnH) * k;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function build() {
      const nWall = w < 620 ? 9 : 13;
      walls = [];
      for (const side of [-1, 1]) {
        for (let i = 0; i < nWall; i++) {
          const t = (i + .5) / nWall;             // bunch columns up near the vanishing point
          walls.push({
            u: side, k: geo.back + (1 - geo.back) * Math.pow(t, 1.55),
            v: rnd(-1.6, 1), sp: rnd(.016, .042), len: 9 + Math.floor(Math.random() * 12),
            glow: Math.random() < .26, live: Math.random() < .84
          });
        }
      }
      const nLane = w < 620 ? 11 : 17;
      lanes = [];
      for (let i = 0; i < nLane; i++) {
        const u = -1 + 2 * (i + .5) / nLane + rnd(-.03, .03);
        lanes.push({ u, v: 1, z: rnd(1, Z), sp: rnd(.009, .019), len: 10 + Math.floor(Math.random() * 9), glow: Math.random() < .3, live: Math.random() < .82 });
        if (i % 2 === 0) lanes.push({ u: u + rnd(-.06, .06), v: -1, z: rnd(1, Z), sp: -rnd(.008, .015), len: 8 + Math.floor(Math.random() * 7), glow: Math.random() < .22, live: Math.random() < .7 });
      }
      const bx0 = projX(-1, geo.back), bx1 = projX(1, geo.back);
      const by0 = projY(-1, geo.back), by1 = projY(1, geo.back);
      const bc = Math.max(5, cell * geo.back);
      back = { x0: bx0, y0: by0, w: bx1 - bx0, h: by1 - by0, cell: bc, cols: [] };
      const n = Math.ceil(back.w / bc);
      for (let i = 0; i < n; i++) back.cols.push({ y: rnd(-back.h, back.h), sp: rnd(.5, 1.9), len: 6 + Math.floor(Math.random() * 12), glow: Math.random() < .18, live: Math.random() < .62 });
    }

    function resize() {
      const r = cast.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, devicePixelRatio || 1);
      w = Math.round(r.width); h = Math.round(r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = w < 620 ? Math.max(8, base - 3) : base;
      vpx = w * geo.vx; vpy = h * geo.vy;
      halfW = w / 2; upH = vpy - h * geo.nt; dnH = h * geo.nb - vpy; halfV = (upH + dnH) / 2;
      build();
      ctx.fillStyle = 'rgba(1,6,3,1)'; ctx.fillRect(0, 0, w, h);
    }

    let font = '';
    function setFont(size) {
      const f = size + 'px ui-monospace,SFMono-Regular,Consolas,monospace';
      if (f !== font) { font = f; ctx.font = f; }
    }
    const ink = (j, len, glow, k) => {
      const depth = .42 + .58 * k;                // the room falls off toward the rear
      if (j === 0) return 'rgba(' + PAL()[0] + ',' + ((glow ? .95 : .74) * depth).toFixed(3) + ')';
      return 'rgba(' + PAL()[1] + ',' + (Math.max(0, 1 - j / len) * (glow ? .6 : .38) * depth).toFixed(3) + ')';
    };

    function step(time) {
      requestAnimationFrame(step);
      if (!onScreen || document.hidden || reduced.matches || !w) return;
      if (time - last < 33) return;
      const dt = Math.min(3, (time - last) / 33);
      last = time;
      ctx.fillStyle = 'rgba(1,6,3,.22)';
      ctx.fillRect(0, 0, w, h);
      ctx.textAlign = 'center';

      // side walls: one falling column per depth slice
      for (let i = 0; i < walls.length; i++) {
        const c = walls[i], size = Math.max(5, Math.round(cell * c.k));
        const dv = size / (halfV * c.k);           // world step that lands one glyph apart
        c.v += c.sp * dt;
        if (c.v - c.len * dv > 1) {
          c.v = -1 - Math.random() * .8; c.sp = rnd(.016, .042);
          c.len = 9 + Math.floor(Math.random() * 12); c.glow = Math.random() < .26; c.live = Math.random() < .84;
          continue;
        }
        if (!c.live) continue;
        const x = projX(c.u, c.k) - c.u * size * .62;   // inset so edge glyphs are not clipped
        const head = Math.round(c.v / dv) * dv;
        setFont(size);
        for (let j = 0; j < c.len; j++) {
          const v = head - j * dv;
          if (v < -1.05 || v > 1.05) continue;
          const y = projY(v, c.k);
          if (y < -size || y > h + size) continue;
          ctx.fillStyle = ink(j, c.len, c.glow, c.k);
          ctx.fillText(glyphs[(i * 5 + j * 3 + Math.round(c.v / dv)) % glyphs.length], x, y);
        }
      }

      // rear wall: fronto-parallel, plain grid at the rear scale
      if (back) {
        const size = Math.max(4, Math.round(back.cell));
        setFont(size);
        for (let i = 0; i < back.cols.length; i++) {
          const c = back.cols[i], x = back.x0 + i * back.cell + back.cell / 2;
          c.y += c.sp * dt * 2.1;
          if (c.y - c.len * back.cell > back.h) {
            c.y = -Math.random() * back.h * .7; c.sp = rnd(.5, 1.9);
            c.len = 6 + Math.floor(Math.random() * 12); c.glow = Math.random() < .18; c.live = Math.random() < .62;
            continue;
          }
          if (!c.live) continue;
          const head = Math.floor(c.y / back.cell) * back.cell;
          for (let j = 0; j < c.len; j++) {
            const y = head - j * back.cell;
            if (y < 0 || y > back.h) continue;
            ctx.fillStyle = ink(j, c.len, c.glow, geo.back);
            ctx.fillText(glyphs[(i * 7 + j * 3 + Math.floor(c.y / back.cell)) % glyphs.length], x, back.y0 + y);
          }
        }
      }

      // floor + ceiling: travel along z, so the trail rides a vanishing line
      for (let i = 0; i < lanes.length; i++) {
        const c = lanes[i];
        const hv = c.v < 0 ? upH : dnH;
        const r = 1 + cell / Math.max(40, hv);     // geometric step: one glyph apart in z
        c.z *= (1 - c.sp * dt * .5);
        if (c.z < 1) { c.z = Z; c.live = Math.random() < .82; c.glow = Math.random() < .3; }
        if (c.z > Z * 1.02) { c.z = 1.02; c.live = Math.random() < .7; }
        if (!c.live) continue;
        const n0 = Math.round(Math.log(c.z) / Math.log(r));
        for (let j = 0; j < c.len; j++) {
          const z = Math.pow(r, n0 + (c.sp > 0 ? j : -j));   // trail sits behind the head
          if (z < 1 || z > Z) continue;
          const k = 1 / z, size = Math.max(4, Math.round(cell * k));
          const x = projX(c.u, k), y = projY(c.v, k);
          if (x < -size || x > w + size) continue;
          setFont(size);
          ctx.fillStyle = ink(j, c.len, c.glow, k);
          ctx.fillText(glyphs[(i * 3 + n0 + j) % glyphs.length], x, y);
        }
      }
    }

    resize();
    addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { onScreen = es.some(e => e.isIntersecting); }, { rootMargin: '120px' }).observe(stage);
    }
    requestAnimationFrame(step);
    reduced.addEventListener?.('change', () => { if (reduced.matches) resize(); });
  }

  // Separable box blur over an alpha plane, used to turn a stippled sprite into
  // a solid coverage field for hit-testing (integral-free, two passes).
  function blur(a, w, h, r) {
    const tmp = new Float32Array(w * h), out = new Uint8Array(w * h);
    const win = r * 2 + 1;
    for (let y = 0; y < h; y++) {
      let sum = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = sum / win;
        sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = Math.min(255, sum / win * 2.2);   // lift the stipple mean
        sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
    return out;
  }

  function initFigures(stage, cast) {
    const collection = stage.dataset.collection || 'bondee';
    const figs = [...cast.querySelectorAll('.bd-fig')];
    const tags = [...stage.querySelectorAll('.bd-tag')];
    const masks = new Map();

    // Downsampled alpha mask per figure -> O(1) pixel-accurate hit tests.
    figs.forEach(fig => {
      const img = fig.querySelector('img');
      const build = () => {
        try {
          const mw = Math.min(300, img.naturalWidth || 300);
          const mh = Math.max(1, Math.round(mw * (img.naturalHeight || 1) / (img.naturalWidth || 1)));
          const cv = document.createElement('canvas');
          cv.width = mw; cv.height = mh;
          const c = cv.getContext('2d');
          c.drawImage(img, 0, 0, mw, mh);
          const d = c.getImageData(0, 0, mw, mh).data;
          let a = new Uint8Array(mw * mh);
          for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
          // Subjects drawn out of loose glyphs (the Meitu code faces) are a
          // stipple: most pixels inside a head are transparent, so a per-pixel
          // test misses. data-soft blurs the mask into a coverage field first,
          // which turns the stipple into the silhouette a cursor expects.
          const soft = parseInt(stage.dataset.soft || '0', 10);
          if (soft > 0) a = blur(a, mw, mh, soft);
          masks.set(fig, { w: mw, h: mh, a });
        } catch (e) { /* tainted canvas: fall back to box hit-testing */ }
      };
      if (img.complete && img.naturalWidth) build();
      else img.addEventListener('load', build, { once: true });
    });

    // line-art is mostly empty space, so accept a small neighbourhood as a hit
    const reach = parseInt(stage.dataset.reach || '0', 10);
    const hit = (fig, px, py) => {
      const r = fig.getBoundingClientRect();
      if (px < r.left || px > r.right || py < r.top || py > r.bottom) return false;
      const m = masks.get(fig);
      if (!m) return true;                       // no mask yet -> box hit
      const x = Math.floor((px - r.left) / r.width * m.w);
      const y = Math.floor((py - r.top) / r.height * m.h);
      if (m.a[y * m.w + x] > 24) return true;
      for (let dy = -reach; dy <= reach; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= m.h) continue;
        for (let dx = -reach; dx <= reach; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= m.w) continue;
          if (m.a[yy * m.w + xx] > 60) return true;
        }
      }
      return false;
    };

    let active = null;
    function setActive(fig) {
      if (fig === active) return;
      active = fig;
      figs.forEach(f => f.classList.toggle('on', f === fig));
      tags.forEach(t => t.classList.toggle('on', !!fig && t.dataset.i === fig.dataset.i));
      stage.classList.toggle('busy', !!fig);
      // Hover feedback stays in CSS (.code-stage.hot) so the custom crosshair
      // cursor is not overridden by an inline native pointer.
      stage.classList.toggle('hot', !!fig);
    }
    const pick = e => {
      // topmost first: the DOM order is back-to-front
      for (let i = figs.length - 1; i >= 0; i--) if (hit(figs[i], e.clientX, e.clientY)) return figs[i];
      return null;
    };
    const go = fig => {
      try { sessionStorage.setItem('portfolio-collection', collection); } catch (err) { }
      location.hash = fig.getAttribute('href').slice(1);
    };

    cast.addEventListener('pointermove', e => setActive(pick(e)));
    cast.addEventListener('pointerleave', () => setActive(null));
    cast.addEventListener('pointerdown', e => { const f = pick(e); if (f) setActive(f); });
    cast.addEventListener('click', e => {
      const f = pick(e);
      if (!f) return;
      e.preventDefault();
      go(f);
    });
    // keyboard: the links stay focusable even though pointer events go to the stage
    figs.forEach(fig => {
      fig.addEventListener('focus', () => setActive(fig));
      fig.addEventListener('blur', () => setActive(null));
      fig.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go(fig);
        }
      });
    });
  }

  function boot(stage) {
    if (stage.dataset.ready) return;
    stage.dataset.ready = '1';
    const cast = stage.querySelector('.bd-cast');
    const canvas = stage.querySelector('.bd-rain');
    if (!cast) return;
    if (canvas) (stage.dataset.rain === 'space' ? initSpaceRain : initRain)(stage, cast, canvas);
    initFigures(stage, cast);
  }

  const scan = () => document.querySelectorAll('.code-stage').forEach(boot);
  scan();
  // the stage is (re)built by gallery.js when a collection renders
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
