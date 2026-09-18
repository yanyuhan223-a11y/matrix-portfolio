(() => {
  'use strict';
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
            ctx.fillStyle = 'rgba(214,255,224,' + (c.glow ? .95 : .72) + ')';
          } else {
            const a = Math.max(0, (1 - j / c.len)) * (c.glow ? .55 : .35);
            ctx.fillStyle = 'rgba(46,240,96,' + a.toFixed(3) + ')';
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
          const a = new Uint8Array(mw * mh);
          for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
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
      stage.style.cursor = fig ? 'pointer' : '';
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
    if (canvas) initRain(stage, cast, canvas);
    initFigures(stage, cast);
  }

  const scan = () => document.querySelectorAll('.code-stage').forEach(boot);
  scan();
  // the stage is (re)built by gallery.js when a collection renders
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();
