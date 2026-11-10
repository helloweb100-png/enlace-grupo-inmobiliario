/* ==========================================================================
   Enlace Grupo Inmobiliario · script.js
   JavaScript puro (sin librerías): ninguna CDN puede romper la página.
   Cada bloque está aislado en try/catch: si uno falla, los demás siguen.
   ========================================================================== */
(() => {
  'use strict';

  const html = document.documentElement;
  const body = document.body;

  // Avisa al <head> de que el script arrancó (si no, ese script libera todo el contenido a los 3.2 s).
  html.classList.add('js-ok');
  // Red de seguridad: el hero se libera aunque el cargador falle.
  setTimeout(() => body.classList.add('is-ready'), 2600);

  /* ------------------------------------------------------------------
     CONFIGURACIÓN · el número de WhatsApp vive SOLO aquí.
     Formato: 52 + 10 dígitos. Si queda vacío, los botones y el envío se ocultan.
     ------------------------------------------------------------------ */
  const WHATSAPP = '522223361974';
  const MSG_BASE = 'Hola, vi la página de Enlace Grupo Inmobiliario y quiero información de terrenos.';

  /* ---------- Utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const waUrl = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg || MSG_BASE)}`;

  /* ---------- Planificador de scroll/resize (un solo rAF) ---------- */
  const frameTasks = [];
  let ticking = false;
  const onFrame = (fn) => { frameTasks.push(fn); };
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      frameTasks.forEach((fn) => { try { fn(); } catch (e) { /* un fallo no detiene a los demás */ } });
    });
  };
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);

  /* ==================================================================
     1. WhatsApp
     ================================================================== */
  function initWhatsApp() {
    $$('[data-wa]').forEach((a) => {
      if (!WHATSAPP) { a.hidden = true; return; }
      a.href = waUrl(a.dataset.msg);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
    if (!WHATSAPP) {
      $$('[data-wa-only]').forEach((el) => { el.hidden = true; });
      $$('[data-wa-missing]').forEach((el) => { el.hidden = false; });
      const calc = $('#calcWa'); if (calc) calc.hidden = true;
    }
    const float = $('.wa-float');
    if (float && WHATSAPP && fine) {
      setTimeout(() => float.classList.add('show-tip'), 5500);
      setTimeout(() => float.classList.remove('show-tip'), 11500);
      float.addEventListener('pointerenter', () => float.classList.add('show-tip'));
      float.addEventListener('pointerleave', () => float.classList.remove('show-tip'));
    }
  }

  /* ==================================================================
     2. Cargador (termina en ≤ 2.4 s; hay respaldo en CSS)
     ================================================================== */
  function initLoader() {
    const el = $('#loader');
    const pct = $('.loader__pct');
    const txt = $('.loader__txt');
    const phrases = ['Midiendo el terreno', 'Colocando estacas', 'Trazando linderos', 'Abriendo el camino'];
    const dur = reduce ? 450 : 1500;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (el) {
        el.classList.add('is-done');
        setTimeout(() => { el.hidden = true; }, 900);
      }
      body.classList.add('is-ready');
    };
    if (!el) { finish(); return; }

    const t0 = performance.now();
    (function tick(now) {
      const p = clamp((now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      if (pct) pct.textContent = String(Math.round(e * 100)).padStart(3, '0');
      if (txt) txt.textContent = phrases[Math.min(phrases.length - 1, Math.floor(p * phrases.length))];
      if (p < 1) requestAnimationFrame(tick); else finish();
    })(t0);
    setTimeout(finish, 1900); // seguridad si rAF se pausa
  }

  /* ==================================================================
     3. Navegación, menú móvil y enlace activo
     ================================================================== */
  function initNav() {
    const nav = $('#nav');
    const burger = $('#burger');
    const menu = $('#menu');
    if (!nav) return;

    let lastY = window.scrollY;
    onFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 30);
      if (!body.classList.contains('menu-open')) {
        const dy = y - lastY;
        if (y < 420 || dy < -6) nav.classList.remove('is-hidden');
        else if (dy > 6) nav.classList.add('is-hidden');
      }
      lastY = y;
    });

    const setMenu = (open) => {
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      body.classList.toggle('menu-open', open);
      if (open) nav.classList.remove('is-hidden');
    };
    if (burger) burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
    if (menu) $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

    const links = $$('.nav__links a');
    const targets = links.map((a) => $(a.getAttribute('href')));
    onFrame(() => {
      const mark = window.innerHeight * 0.4;
      let current = -1;
      targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= mark) current = i; });
      links.forEach((a, i) => {
        if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    });
  }

  /* ==================================================================
     4. Entradas con scroll: IntersectionObserver + respaldo por geometría
     ================================================================== */
  function initReveal() {
    const items = $$('[data-reveal]');
    const show = (el) => el.classList.add('is-in');
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(show); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    items.forEach((el) => io.observe(el));

    let pending = items.slice();
    const sweep = () => {
      const vh = window.innerHeight;
      pending = pending.filter((el) => {
        if (el.classList.contains('is-in')) return false;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.96 && r.bottom > 0) { show(el); io.unobserve(el); return false; }
        return true;
      });
    };
    onFrame(sweep);
    [600, 1400, 2200, 3500].forEach((ms) => setTimeout(sweep, ms));
    window.addEventListener('load', () => setTimeout(sweep, 250));
  }

  /* ==================================================================
     5. Hero: curvas de nivel vivas (canvas) + inclinación 3D + retícula
     ================================================================== */
  function initHero() {
    const hero = $('#inicio');
    const cv = $('#topo');
    if (!hero || !cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const stack = $('#stack');
    const hud = $('.hud');
    const hudTxt = $('.hud__txt');
    const inner = $('.hero__inner');

    let W = 0, H = 0, cell = 30, cols = 0, rows = 0, field = new Float32Array(0), sig = 160;
    let px = 0.64, py = 0.42, tx = 0.64, ty = 0.42;
    let active = false, lastMove = 0, visible = true, last = 0;
    const LV = [];
    for (let v = -1.1; v <= 2.15; v += 0.2) LV.push(v);

    function size() {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W < 700 ? 34 : 28;
      cols = Math.ceil(W / cell) + 2; rows = Math.ceil(H / cell) + 2;
      field = new Float32Array(cols * rows);
      sig = Math.max(W, H) * 0.12;
    }

    function sample(t) {
      const a = t * 0.00021, b = t * 0.00016, c = t * 0.00011;
      const bx = px * W, by = py * H, s2 = 2 * sig * sig;
      for (let j = 0; j < rows; j++) {
        const y = j * cell, ny = y * 0.0042;
        for (let i = 0; i < cols; i++) {
          const x = i * cell, nx = x * 0.0042;
          let v = Math.sin(nx * 1.9 + a + Math.sin(ny * 1.4 - b) * 1.7) * 0.55
                + Math.sin(ny * 2.3 - b + Math.cos(nx * 1.2 + c) * 1.5) * 0.38
                + Math.sin((nx + ny) * 1.1 + c) * 0.3;
          const dx = x - bx, dy = y - by;
          v += 1.15 * Math.exp(-(dx * dx + dy * dy) / s2);
          field[j * cols + i] = v;
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const gx = px * W, gy = py * H;
      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.34);
      g.addColorStop(0, 'rgba(255,228,0,.13)'); g.addColorStop(1, 'rgba(255,228,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';

      for (let li = 0; li < LV.length; li++) {
        const L = LV[li];
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          const y = j * cell, o = j * cols;
          for (let i = 0; i < cols - 1; i++) {
            const a = field[o + i], b = field[o + i + 1], c = field[o + cols + i + 1], d = field[o + cols + i];
            const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            const x = i * cell;
            const tX = x + cell * ((L - a) / (b - a)), tY = y;
            const rX = x + cell, rY = y + cell * ((L - b) / (c - b));
            const bX = x + cell * ((L - d) / (c - d)), bY = y + cell;
            const lX = x, lY = y + cell * ((L - a) / (d - a));
            switch (idx) {
              case 1: case 14: ctx.moveTo(lX, lY); ctx.lineTo(bX, bY); break;
              case 2: case 13: ctx.moveTo(bX, bY); ctx.lineTo(rX, rY); break;
              case 3: case 12: ctx.moveTo(lX, lY); ctx.lineTo(rX, rY); break;
              case 4: case 11: ctx.moveTo(tX, tY); ctx.lineTo(rX, rY); break;
              case 6: case 9: ctx.moveTo(tX, tY); ctx.lineTo(bX, bY); break;
              case 7: case 8: ctx.moveTo(tX, tY); ctx.lineTo(lX, lY); break;
              case 5: ctx.moveTo(tX, tY); ctx.lineTo(rX, rY); ctx.moveTo(lX, lY); ctx.lineTo(bX, bY); break;
              case 10: ctx.moveTo(tX, tY); ctx.lineTo(lX, lY); ctx.moveTo(bX, bY); ctx.lineTo(rX, rY); break;
              default: break;
            }
          }
        }
        const major = li % 5 === 0;
        ctx.strokeStyle = major ? 'rgba(255,228,0,.46)' : 'rgba(255,228,0,.15)';
        ctx.lineWidth = major ? 1.4 : 0.9;
        ctx.stroke();
      }
    }

    size();
    window.addEventListener('resize', () => { size(); if (reduce) { sample(3000); draw(); } });
    if (reduce) { sample(3000); draw(); return; }

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = clamp((e.clientX - r.left) / r.width); ty = clamp((e.clientY - r.top) / r.height);
      active = true; lastMove = performance.now();
      if (hud && fine) hud.classList.add('is-on');
    });
    hero.addEventListener('pointerleave', () => { active = false; if (hud) hud.classList.remove('is-on'); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }

    function loop(ts) {
      requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      if (ts - last < 24) return;
      last = ts;

      if (!active || ts - lastMove > 3000) {
        tx = 0.62 + 0.2 * Math.sin(ts * 0.00035);
        ty = 0.42 + 0.22 * Math.cos(ts * 0.0003);
      }
      px += (tx - px) * 0.07; py += (ty - py) * 0.07;

      sample(ts); draw();

      if (stack) {
        stack.style.setProperty('--rx', ((px - 0.5) * 2).toFixed(3));
        stack.style.setProperty('--ry', ((py - 0.5) * 2).toFixed(3));
      }
      if (hud && fine && active) {
        hud.style.transform = `translate3d(${(px * W).toFixed(1)}px, ${(py * H).toFixed(1)}px, 0)`;
        if (hudTxt) hudTxt.textContent = `X ${String(Math.round(px * 100)).padStart(2, '0')} · Y ${String(Math.round(py * 100)).padStart(2, '0')}`;
      }
    }
    requestAnimationFrame(loop);

    // Parallax suave del contenido del hero al hacer scroll
    onFrame(() => {
      const y = window.scrollY, vh = window.innerHeight;
      if (y > vh * 1.3) return;
      if (inner) {
        inner.style.transform = `translate3d(0, ${(y * 0.14).toFixed(1)}px, 0)`;
        inner.style.opacity = (1 - clamp(y / (vh * 0.95)) * 0.9).toFixed(3);
      }
      cv.style.transform = `translate3d(0, ${(y * 0.3).toFixed(1)}px, 0)`;
    });
  }

  /* ==================================================================
     6. Barra de progreso de lectura
     ================================================================== */
  function initProgress() {
    const bar = $('.progress');
    if (!bar) return;
    onFrame(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty('--sp', max > 0 ? clamp(window.scrollY / max).toFixed(4) : '0');
    });
  }

  /* ==================================================================
     7. Manifiesto: el texto se ilumina palabra por palabra con el scroll
     ================================================================== */
  function initScrub() {
    const el = $('[data-scrub]');
    if (!el) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
    const items = $$('.w, .inl', el);
    el.classList.add('is-scrub');
    if (reduce) { items.forEach((it) => it.style.setProperty('--o', '1')); return; }

    const update = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.2));
      const n = p * items.length * 1.1;
      items.forEach((it, i) => {
        const v = clamp(n - i);
        if (it._v !== v) { it._v = v; it.style.setProperty('--o', (0.15 + 0.85 * v).toFixed(3)); }
      });
    };
    onFrame(update);
    update();
  }

  /* ==================================================================
     8. Recorrido: la imagen se abre a pantalla completa con el scroll
     ================================================================== */
  function initExpand() {
    const ex = $('#recorrido');
    if (!ex) return;
    if (reduce) { ex.style.setProperty('--p', '1'); ex.classList.add('is-open'); return; }
    const update = () => {
      const r = ex.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const raw = total > 0 ? clamp(-r.top / total) : 1;
      const p = raw * raw * (3 - 2 * raw); // smoothstep
      ex.style.setProperty('--p', p.toFixed(4));
      ex.classList.toggle('is-open', raw > 0.72);
    };
    onFrame(update);
    update();
  }

  /* ==================================================================
     9. Línea de tiempo del método
     ================================================================== */
  function initTimeline() {
    const tl = $('#tl');
    if (!tl) return;
    const steps = $$('.step', tl);
    const update = () => {
      const r = tl.getBoundingClientRect();
      const mid = window.innerHeight * 0.55;
      tl.style.setProperty('--tp', clamp((mid - r.top) / r.height).toFixed(4));
      steps.forEach((s) => s.classList.toggle('is-active', s.getBoundingClientRect().top < mid));
    };
    onFrame(update);
    update();
  }

  /* ==================================================================
     10. Parallax de fotos
     ================================================================== */
  function initParallax() {
    if (reduce) return;
    const els = $$('[data-parallax]');
    if (!els.length) return;
    onFrame(() => {
      const vh = window.innerHeight;
      els.forEach((el) => {
        const ref = el.parentElement.getBoundingClientRect();
        if (ref.bottom < -200 || ref.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0;
        const y = clamp(((ref.top + ref.height / 2) - vh / 2) * speed, -30, 30);
        el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      });
    });
  }

  /* ==================================================================
     11. Galería 3D (anillo): gira sola, con el scroll y al arrastrar
     ================================================================== */
  function initRing() {
    const ring = $('#ring');
    const stage = $('#ringStage');
    if (!ring || !stage) return;
    const cards = $$('.rc', stage);
    const n = cards.length;
    if (!n) return;
    const step = 360 / n;
    stage.style.setProperty('--step', `${step}deg`);
    stage.classList.add('is-js');

    let angle = 0, vel = 0, dragging = false, lastX = 0, visible = true, lastSy = window.scrollY;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(ring);
    }

    ring.addEventListener('pointerdown', (e) => {
      dragging = true; lastX = e.clientX; ring.classList.add('is-drag');
      if (ring.setPointerCapture) { try { ring.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } }
    });
    ring.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      angle += dx * 0.32; vel = dx * 0.32;
    });
    const stop = () => { dragging = false; ring.classList.remove('is-drag'); };
    ring.addEventListener('pointerup', stop);
    ring.addEventListener('pointercancel', stop);
    ring.addEventListener('pointerleave', stop);

    const render = () => {
      stage.style.transform = `rotateX(-5deg) rotateY(${angle.toFixed(2)}deg)`;
      cards.forEach((c, i) => {
        const cos = Math.cos(((i * step + angle) * Math.PI) / 180);
        const o = (0.28 + 0.72 * clamp((cos + 0.15) / 1.15)).toFixed(2);
        if (c._o !== o) { c._o = o; c.style.opacity = o; }
      });
    };
    render();

    (function loop() {
      requestAnimationFrame(loop);
      const sy = window.scrollY;
      if (!visible) { lastSy = sy; return; }
      if (!dragging) { angle += (reduce ? 0 : 0.14) + vel; vel *= 0.94; }
      if (!reduce) angle += (sy - lastSy) * 0.06;
      lastSy = sy;
      render();
    })();
  }

  /* ==================================================================
     12. Plano: inclinación 3D + visor ampliado
     ================================================================== */
  function initSheet() {
    const sheet = $('#sheet');
    if (sheet) {
      let hover = false;
      if (fine) {
        sheet.addEventListener('pointermove', (e) => {
          const r = sheet.getBoundingClientRect();
          sheet.style.setProperty('--sy', (((e.clientX - r.left) / r.width - 0.5) * 16).toFixed(2));
          sheet.style.setProperty('--sx', ((-((e.clientY - r.top) / r.height - 0.5)) * 12).toFixed(2));
          hover = true;
        });
        sheet.addEventListener('pointerleave', () => { hover = false; requestUpdate(); });
      }
      if (!reduce) {
        onFrame(() => {
          if (hover) return;
          const r = sheet.getBoundingClientRect();
          const p = clamp((r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight, -1, 1);
          sheet.style.setProperty('--sy', (-9 + p * 8).toFixed(2));
          sheet.style.setProperty('--sx', (3 + p * 6).toFixed(2));
        });
      }
    }

    const lb = $('#lightbox');
    if (!lb) return;
    const img = $('img', lb);
    const closeBtn = $('.lightbox__close', lb);
    const open = (src, alt) => {
      if (img) { img.src = src; img.alt = alt || ''; }
      lb.hidden = false;
      body.classList.add('lb-open');
      requestAnimationFrame(() => lb.classList.add('is-open'));
      if (closeBtn) closeBtn.focus();
    };
    const close = () => {
      lb.classList.remove('is-open');
      body.classList.remove('lb-open');
      setTimeout(() => { lb.hidden = true; }, 350);
    };
    $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => open(b.dataset.lightbox, b.dataset.alt)));
    if (closeBtn) closeBtn.addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
  }

  /* ==================================================================
     13. Medidor de lote (dibuja a escala y arma el mensaje de WhatsApp)
     ================================================================== */
  function initCalc() {
    const form = $('#calcForm');
    if (!form) return;
    const fr = $('#frente'), fo = $('#fondo');
    const frOut = $('#frenteOut'), foOut = $('#fondoOut');
    const areaOut = $('#areaOut'), cmp = $('#areaCmp'), wa = $('#calcWa');
    const rect = $('#lotRect'), fill = $('#lotFill'), pat = $('#lotPat2');
    const stakes = $$('.stake');
    const lw = $('#lotW'), lh = $('#lotH'), dw = $('#dimW'), dh = $('#dimH');
    const nf = new Intl.NumberFormat('es-MX');
    const nf1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

    let cur = { w: +fr.value, h: +fo.value };
    let target = { ...cur };
    let raf = 0;
    const set = (el, o) => { Object.keys(o).forEach((k) => el.setAttribute(k, o[k])); };

    function paint(w, h) {
      const s = Math.min(300 / w, 196 / h);
      const rw = w * s, rh = h * s;
      const x = (440 - rw) / 2, y = (292 - rh) / 2 + 6;
      set(rect, { x, y, width: rw, height: rh });
      set(fill, { x, y, width: rw, height: rh });
      const cellPx = Math.max(5 * s, 5);
      set(pat, { width: cellPx, height: cellPx, x, y });
      const yy = y + rh + 18, xx = x + rw + 18;
      set(dw, { x1: x, y1: yy, x2: x + rw, y2: yy });
      set(dh, { x1: xx, y1: y, x2: xx, y2: y + rh });
      set(lw, { x: x + rw / 2, y: yy + 18 });
      set(lh, { x: xx + 16, y: y + rh / 2, transform: `rotate(90 ${xx + 16} ${y + rh / 2})` });
      const corners = [[x, y], [x + rw, y], [x, y + rh], [x + rw, y + rh]];
      stakes.forEach((st, i) => set(st, { x: corners[i][0] - 5, y: corners[i][1] - 5 }));
      areaOut.textContent = nf.format(Math.round(w * h));
    }

    function labels() {
      const w = +fr.value, h = +fo.value, area = w * h;
      frOut.textContent = `${w} m`; foOut.textContent = `${h} m`;
      lw.textContent = `${w} m`; lh.textContent = `${h} m`;
      [fr, fo].forEach((r) => r.style.setProperty('--fill', `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
      cmp.textContent = `Equivale a ${nf1.format(area / 420)} canchas de básquetbol y ${nf.format(Math.max(1, Math.floor(area / 12.5)))} cajones de estacionamiento.`;
      if (wa && WHATSAPP) {
        const zona = form.elements.zona ? form.elements.zona.value : 'Veracruz o Puebla';
        const uso = form.elements.uso ? form.elements.uso.value : 'mi casa';
        const msg = `Hola, vi la página de Enlace Grupo Inmobiliario. Busco un terreno de aprox. ${w} × ${h} m (${nf.format(area)} m²) en ${zona}, para ${uso}. ¿Qué opciones tienen disponibles?`;
        wa.href = waUrl(msg); wa.target = '_blank'; wa.rel = 'noopener noreferrer';
      }
    }

    function tick() {
      cur.w += (target.w - cur.w) * 0.2;
      cur.h += (target.h - cur.h) * 0.2;
      if (Math.abs(target.w - cur.w) < 0.02 && Math.abs(target.h - cur.h) < 0.02) { cur = { ...target }; paint(cur.w, cur.h); raf = 0; return; }
      paint(cur.w, cur.h);
      raf = requestAnimationFrame(tick);
    }
    function update() {
      target = { w: +fr.value, h: +fo.value };
      labels();
      if (reduce) { cur = { ...target }; paint(cur.w, cur.h); return; }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    form.addEventListener('input', update);
    form.addEventListener('submit', (e) => e.preventDefault());
    labels(); paint(cur.w, cur.h);
  }

  /* ==================================================================
     14. Formulario de contacto → WhatsApp
     ================================================================== */
  function initForm() {
    const form = $('#contactForm');
    if (!form) return;
    const status = $('#formStatus');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!WHATSAPP) { if (status) status.textContent = 'Por ahora atendemos por teléfono: 222 336 1974.'; return; }
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const f = new FormData(form);
      const nombre = String(f.get('nombre') || '').trim();
      const zona = String(f.get('zona') || 'Veracruz o Puebla');
      const uso = String(f.get('uso') || '').trim();
      const extra = String(f.get('mensaje') || '').trim();
      let msg = `Hola, soy ${nombre}. Vi la página de Enlace Grupo Inmobiliario y me interesa un terreno en ${zona}`;
      msg += uso ? ` para ${uso}.` : '.';
      if (extra) msg += ` ${extra}`;
      msg += ' ¿Me pueden compartir opciones?';
      const url = waUrl(msg);
      const w = window.open(url, '_blank');
      if (w) { try { w.opener = null; } catch (err) { /* noop */ } } else { window.location.href = url; }
      if (status) status.textContent = '¡Listo! Abrimos WhatsApp con tu mensaje.';
    });
  }

  /* ==================================================================
     15. Detalles: botones magnéticos y luz que sigue al cursor
     ================================================================== */
  function initFx() {
    if (!fine) return;
    if (!reduce) {
      $$('[data-mag]').forEach((b) => {
        b.addEventListener('pointermove', (e) => {
          const r = b.getBoundingClientRect();
          b.style.setProperty('--tx', `${((e.clientX - (r.left + r.width / 2)) * 0.16).toFixed(1)}px`);
          b.style.setProperty('--ty', `${((e.clientY - (r.top + r.height / 2)) * 0.26).toFixed(1)}px`);
        });
        b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
      });
    }
    $$('.bcard').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  /* ---------- Arranque (cada bloque aislado) ---------- */
  [initWhatsApp, initLoader, initNav, initReveal, initHero, initProgress, initScrub, initExpand,
    initTimeline, initParallax, initRing, initSheet, initCalc, initForm, initFx].forEach((fn) => {
    try { fn(); } catch (err) { if (window.console) console.error(fn.name, err); }
  });

  requestUpdate();
  window.addEventListener('load', requestUpdate);
})();
