/* Anāmay Ashram — site interactions.
   Everything works without libraries. When GSAP (ScrollTrigger, SplitText) and Lenis are loaded from
   assets/vendor and the visitor has not asked for reduced motion, the scroll stories are added on top. */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = root.classList.contains('motion') && !!(window.gsap && window.ScrollTrigger);
  if (!motion) root.classList.remove('motion');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* smooth scrolling, driven by GSAP's ticker so every scroll scene moves in step */
  let lenis = null;
  if (motion) {
    gsap.registerPlugin(ScrollTrigger, ...(window.SplitText ? [SplitText] : []));
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (window.Lenis) {
      lenis = new Lenis({ autoRaf: false, anchors: { offset: -40 }, lerp: 0.085 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  const lock = on => { root.classList.toggle('locked', on); if (lenis) on ? lenis.stop() : lenis.start(); };
  const goTo = y => lenis ? lenis.scrollTo(y) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });

  /* header: frosted once scrolled, steps aside while reading down, returns when scrolling up */
  const header = $('.site-header');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY, d = y - lastY;
    header.classList.toggle('solid', y > 40);
    if (Math.abs(d) > 4) {
      header.classList.toggle('hide', d > 0 && y > 240 && !document.body.classList.contains('nav-open') && !header.matches(':focus-within'));
      lastY = y;
    }
    document.body.classList.toggle('float-on', y > 500);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* full-screen menu (phones and tablets) */
  const toggle = $('.menu-toggle'), menu = $('#site-menu');
  if (toggle && menu) {
    $$('.menu-nav > *, .menu-aside > *', menu).forEach((el, i) => el.style.setProperty('--i', i));
    const setMenu = open => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
      menu.inert = !open;
      lock(open);
    };
    toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('nav-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('nav-open')) { setMenu(false); toggle.focus(); } });
    matchMedia('(min-width: 1081px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
  }

  /* home: step through the doorway. Pinned scenes are set up in page order, top first,
     so the ones further down measure their start after the extra scroll length above them. */
  const th = $('.threshold');
  if (th && motion) {
    const q = s => $$(s, th), img = $('.door-img', th);
    const v = n => parseFloat(getComputedStyle(th).getPropertyValue(n));
    gsap.from(q('.tt span'), { yPercent: 35, opacity: 0, duration: 1.8, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
    gsap.from(q('.door'), { opacity: 0, y: 40, duration: 1.6, ease: 'expo.out' });
    gsap.from(q('.th-intro > *'), { opacity: 0, y: 16, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: th, start: 'top top', end: '+=110%', pin: true, scrub: 0.9, invalidateOnRefresh: true } })
      .fromTo(th, { '--dw': () => v('--dw0'), '--dh': () => v('--dh0') }, { '--dw': 420, '--dh': 250, ease: 'power2.in', duration: 1 }, 0)
      .fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
      .to(q('.tt-l'), { xPercent: -45, duration: 0.55 }, 0)
      .to(q('.tt-r'), { xPercent: 45, duration: 0.55 }, 0)
      .to(q('.tt, .th-intro, .th-cue'), { opacity: 0, duration: 0.4 }, 0)
      .to(q('.door-shade, .door .hero-ridges'), { opacity: 1, duration: 0.5 }, 0.45)
      .fromTo(q('.th-inner'), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.62);
    if (finePointer) {
      const ix = gsap.quickTo(img, 'xPercent', { duration: 1.4, ease: 'power3' }), iy = gsap.quickTo(img, 'yPercent', { duration: 1.4, ease: 'power3' });
      const tx = gsap.quickTo(q('.tt'), 'x', { duration: 1.6, ease: 'power3' }), ty = gsap.quickTo(q('.tt'), 'y', { duration: 1.6, ease: 'power3' });
      th.addEventListener('pointermove', e => { const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5; ix(nx * -2.5); iy(ny * -2.5); tx(nx * 22); ty(ny * 12); });
    }
  }

  /* headings are split into lines so they can rise line by line (CSS does the motion) */
  if (motion && window.SplitText) {
    $$('main h2, .page-hero h1').forEach(h => {
      if (!h.closest('.reveal')) h.classList.add('reveal');
      SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true, onSplit: s => s.lines.forEach((l, i) => l.style.setProperty('--li', i)) });
    });
  }

  /* reveal on scroll, with optional stagger for children of [data-stagger] */
  $$('[data-stagger]').forEach(group => [...group.children].forEach((c, i) => { c.classList.add('reveal'); c.style.setProperty('--d', (i % 6) * 0.09 + 's'); }));
  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal, .reveal-img').forEach(el => io.observe(el));

  /* count-up numbers */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, start = performance.now(), dur = reduce ? 0 : 1600;
    const tick = t => { const p = dur ? Math.min(1, (t - start) / dur) : 1; el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('en-IN'); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* the name, word by word: scrolling walks through the words, a tap or hover picks one */
  $$('[data-gloss]').forEach(g => {
    const words = $$('.gloss-words button', g), means = $$('.gloss-means p', g);
    let manual = false;
    const set = i => {
      words.forEach((w, j) => { w.classList.toggle('on', j === i); w.setAttribute('aria-pressed', j === i); });
      means.forEach((m, j) => m.classList.toggle('on', j === i));
    };
    set(0);
    words.forEach((w, i) => {
      w.addEventListener('click', () => { manual = true; set(i); });
      if (finePointer) w.addEventListener('pointerenter', () => { manual = true; set(i); });
    });
    if (motion) ScrollTrigger.create({
      trigger: g, start: 'top 70%', end: 'bottom 30%',
      onUpdate: s => { if (!manual) set(Math.min(words.length - 1, Math.floor(s.progress * words.length))); },
      onLeave: () => { manual = false; }, onLeaveBack: () => { manual = false; },
    });
  });

  /* three paths: the HUD (group, description, counter, thread) follows whichever panel is in view */
  const paths = $('.walk');
  if (paths) {
    const scroller = $('.walk-scroller', paths), track = $('.walk-track', paths), panels = $$('.path-panel', paths), hud = $('.walk-hud', paths);
    const groups = $$('.hud-groups li', hud), descs = $$('.hud-desc p', hud), count = $('.hud-count b', hud);
    let last = -1;
    const hudAt = p => {
      hud.style.setProperty('--p', p.toFixed(4));
      // the current panel is the last one whose left edge has passed the middle of the screen
      let i = 0; panels.forEach((el, j) => { if (el.getBoundingClientRect().left < innerWidth * 0.5) i = j; });
      if (p > 0.98) i = panels.length - 1;
      if (i === last) return; last = i;
      const g = panels[i].dataset.group;
      count.textContent = String(i + 1).padStart(2, '0');
      groups.forEach(li => li.classList.toggle('on', li.dataset.g === g));
      descs.forEach(d => d.classList.toggle('on', d.dataset.g === g));
    };
    hudAt(0);
    scroller.addEventListener('scroll', () => {
      if (paths.classList.contains('pinned')) return;
      const max = scroller.scrollWidth - scroller.clientWidth; hudAt(max > 0 ? scroller.scrollLeft / max : 0);
    }, { passive: true });
    if (motion) gsap.matchMedia().add('(min-width: 900px) and (min-height: 560px)', () => {
      paths.classList.add('pinned');
      // the panels move sideways, which lazy loading does not notice in time: fetch them as the section approaches
      ScrollTrigger.create({ trigger: paths, start: 'top 200%', once: true, onEnter: () => $$('img', paths).forEach(i => { i.loading = 'eager'; }) });
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, { x: () => -dist(), ease: 'none', onUpdate() { hudAt(this.progress()); }, scrollTrigger: { trigger: paths, pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 0.7, invalidateOnRefresh: true } });
      panels.forEach(p => gsap.fromTo($('img', p), { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
      // keyboard users: bring a focused panel into view
      const onFocus = e => {
        const p = e.target.closest('.path-panel'), st = tween.scrollTrigger; if (!p || !dist()) return;
        goTo(st.start + Math.min(1, Math.max(0, (p.offsetLeft - innerWidth * 0.3) / dist())) * (st.end - st.start));
      };
      paths.addEventListener('focusin', onFocus);
      return () => { paths.classList.remove('pinned'); paths.removeEventListener('focusin', onFocus); };
    });
  }

  /* a day at the ashram: the sky in the window follows the timeline item being read */
  const day = $('[data-day]');
  if (day) {
    const sec = day.closest('.day'), win = $('.dial-window', sec), items = $$('li', day);
    const timeB = $('.dial-time b', sec), timeS = $('.dial-time span', sec);
    const [night, dawn, noon, dusk] = ['night', 'dawn', 'day', 'dusk'].map(n => $('.sky-' + n, win));
    const stars = $('.stars', win), moon = $('.moon', win), arm = $('.sun-arm', win);
    const ramp = (h, a, b) => Math.min(1, Math.max(0, (h - a) / (b - a)));
    const render = h => {
      const dark = Math.min(1, 1 - ramp(h, 4.8, 6.6) + ramp(h, 18.6, 19.8));
      dawn.style.opacity = ramp(h, 4.8, 6.4) * (1 - ramp(h, 7.6, 9.4));
      noon.style.opacity = ramp(h, 7.6, 9.6) * (1 - ramp(h, 15.6, 17.6));
      dusk.style.opacity = ramp(h, 15.6, 17.4) * (1 - ramp(h, 18.6, 19.8));
      night.style.opacity = 1;
      stars.style.opacity = moon.style.opacity = dark;
      arm.style.setProperty('--sun', ((h - 12) / 6.5 * 62).toFixed(2) + 'deg');
    };
    const state = { h: +items[0].dataset.h };
    const activate = i => {
      items.forEach((li, j) => li.classList.toggle('active', j === i));
      timeB.textContent = $('time', items[i]).textContent; timeS.textContent = $('b', items[i]).textContent;
      const h = +items[i].dataset.h;
      if (motion) gsap.to(state, { h, duration: 1.4, ease: 'power2.inOut', overwrite: true, onUpdate: () => render(state.h) });
      else render(state.h = h);
    };
    render(state.h); activate(0);
    const dayIO = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) activate(items.indexOf(e.target)); }), { rootMargin: '-40% 0px -55% 0px' });
    items.forEach(li => dayIO.observe(li));
  }

  /* ways to take part: on screens with a mouse, the photograph of the hovered row follows the pointer */
  const ways = $('[data-ways]');
  if (ways && motion && finePointer) {
    const pv = document.createElement('div'); pv.className = 'way-preview'; pv.innerHTML = '<img alt="">'; document.body.append(pv);
    const pimg = $('img', pv), qx = gsap.quickTo(pv, 'x', { duration: 0.7, ease: 'power3' }), qy = gsap.quickTo(pv, 'y', { duration: 0.7, ease: 'power3' });
    ways.addEventListener('pointermove', e => { qx(Math.min(e.clientX + 40, innerWidth - 280)); qy(Math.max(20, Math.min(e.clientY - 170, innerHeight - 360))); });
    $$('.way-row', ways).forEach(r => r.addEventListener('pointerenter', () => { pimg.src = r.dataset.img; pv.classList.add('on'); }));
    ways.addEventListener('pointerleave', () => pv.classList.remove('on'));
    addEventListener('scroll', () => pv.classList.remove('on'), { passive: true });
  }

  /* voices: one quote at a time, knots on a thread */
  $$('[data-slider]').forEach(sl => {
    const track = $('.vs-track', sl), slides = [...track.children], knots = $('.vs-knots', sl);
    knots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Quote ${i + 1}"></button>`).join('');
    const kb = [...knots.children], n = slides.length;
    const cur = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = i => track.scrollTo({ left: ((i + n) % n) * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    const mark = () => kb.forEach((b, i) => { b.classList.toggle('on', i === cur()); b.setAttribute('aria-current', i === cur()); });
    track.addEventListener('scroll', mark, { passive: true }); mark();
    kb.forEach((b, i) => b.addEventListener('click', () => go(i)));
    $('.vs-prev', sl).addEventListener('click', () => go(cur() - 1));
    $('.vs-next', sl).addEventListener('click', () => go(cur() + 1));
  });

  /* film strips: drag with the mouse (touch and trackpads scroll natively) */
  $$('[data-strip]').forEach(s => {
    let down = false, moved = false, sx = 0, sl = 0;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; down = true; moved = false; sx = e.clientX; sl = s.scrollLeft; });
    addEventListener('pointermove', e => {
      if (!down) return; const dx = e.clientX - sx;
      if (Math.abs(dx) > 6) { moved = true; s.classList.add('dragging'); }
      if (moved) s.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => { down = false; s.classList.remove('dragging'); });
    s.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  });

  /* photo viewer: opens from the thumbnail, arrows, keys and swipe to move */
  const box = $('.lightbox');
  if (box) {
    const img = $('img', box), cap = $('figcaption', box), count = $('.lb-count', box);
    let items = [], idx = 0, opener = null, sx = null, swiped = false;
    const show = (i, dir = 0) => {
      idx = (i + items.length) % items.length; const a = items[idx];
      img.src = a.href; img.alt = a.dataset.caption || ''; cap.textContent = a.dataset.caption || '';
      count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
      if (motion && dir) gsap.fromTo(img, { x: 50 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' });
    };
    const open = a => {
      items = $$(`[data-lightbox="${a.dataset.lightbox}"]`); opener = a; show(items.indexOf(a));
      box.classList.add('open'); lock(true); $('.close', box).focus({ preventScroll: true });
      if (!motion) return;
      const r = ($('img', a) || a).getBoundingClientRect();
      const grow = () => {
        const f = img.getBoundingClientRect(); if (!f.width) return;
        gsap.fromTo(img, { x: r.left + r.width / 2 - (f.left + f.width / 2), y: r.top + r.height / 2 - (f.top + f.height / 2), scale: r.width / f.width }, { x: 0, y: 0, scale: 1, duration: 0.9, ease: 'expo.out' });
      };
      img.complete && img.naturalWidth ? grow() : img.addEventListener('load', grow, { once: true });
    };
    document.addEventListener('click', e => { const a = e.target.closest('[data-lightbox]'); if (!a || e.defaultPrevented) return; e.preventDefault(); open(a); });
    const close = () => { box.classList.remove('open'); lock(false); opener && opener.focus({ preventScroll: true }); };
    $('.close', box).addEventListener('click', close);
    $('.prev', box).addEventListener('click', () => show(idx - 1, -1));
    $('.next', box).addEventListener('click', () => show(idx + 1, 1));
    box.addEventListener('click', e => { if (e.target === box && !swiped) close(); swiped = false; });
    box.addEventListener('pointerdown', e => { sx = e.clientX; });
    box.addEventListener('pointerup', e => {
      if (sx === null) return; const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && !e.target.closest('button')) { swiped = true; show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    });
    addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1, -1); if (e.key === 'ArrowRight') show(idx + 1, 1);
    });
  }

  /* the thread: page progress, with a knot for each chapter of the page */
  const chapters = $$('main > section, main > .pin-spacer > section').filter(s => !s.matches('.threshold, .page-hero'))
    .map(s => ({ s, label: (s.dataset.chapter || $('.eyebrow', s)?.textContent || $('h2', s)?.textContent || '').split('·')[0].trim().slice(0, 32) }))
    .filter(c => c.label);
  if (chapters.length || document.querySelector('main')) {
    const nav = document.createElement('nav');
    nav.className = 'sutra'; nav.setAttribute('aria-label', 'Sections of this page');
    nav.innerHTML = `<span class="sutra-line"><i></i></span><ol>${chapters.map((c, i) => { c.s.id = c.s.id || 'part-' + (i + 1); return `<li><a href="#${c.s.id}"><span class="knot"></span><span class="lbl">${c.label}</span></a></li>`; }).join('')}</ol>`;
    document.body.append(nav);
    const lis = $$('li', nav);
    let current = -2, flash, ticking = false;
    const place = () => {
      const H = Math.max(1, root.scrollHeight - innerHeight);
      chapters.forEach((c, i) => lis[i].style.setProperty('--y', (Math.min(1, Math.max(0, (c.s.getBoundingClientRect().top + scrollY - innerHeight * 0.5) / H)) * 100).toFixed(2) + '%'));
    };
    const update = () => {
      ticking = false;
      const H = root.scrollHeight - innerHeight;
      nav.style.setProperty('--p', (H > 0 ? Math.min(1, scrollY / H) : 0).toFixed(4));
      nav.classList.toggle('show', scrollY > innerHeight * 0.4);
      let i = -1; chapters.forEach((c, j) => { if (c.s.getBoundingClientRect().top < innerHeight * 0.5) i = j; });
      if (i === current) return; current = i;
      lis.forEach((li, j) => { li.classList.toggle('done', j < i); li.classList.toggle('active', j === i); });
      nav.classList.toggle('dark', i >= 0 && chapters[i].s.matches('.on-dark, .pan-band'));
      if (i >= 0) { nav.classList.add('flash'); clearTimeout(flash); flash = setTimeout(() => nav.classList.remove('flash'), 1800); }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', place);
    addEventListener('load', () => { place(); update(); });
    if (motion) ScrollTrigger.addEventListener('refresh', place);
    place(); update();
  }

  /* scroll scenes */
  if (motion) {
    /* inner pages: the photograph settles into its doorway, the large Sanskrit word drifts */
    const ph = $('.page-hero');
    if (ph) {
      gsap.from($('.ph-media .arch', ph), { clipPath: 'inset(100% 0 0 0)', duration: 1.8, ease: 'expo.out', delay: 0.1 });
      const glyph = $('.ph-glyph', ph);
      if (glyph) {
        gsap.from(glyph, { opacity: 0, x: 80, duration: 2.2, ease: 'expo.out' });
        gsap.to(glyph, { xPercent: -16, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: 1 } });
      }
      gsap.to($('.ph-text', ph), { y: 70, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* dark sections open like a doorway as they arrive */
    $$('.section.on-dark').forEach(sec => {
      sec.classList.add('door-in');
      gsap.fromTo(sec, { '--mw': '46%', '--mh': '100%' }, { '--mw': '420%', '--mh': '220%', ease: 'power3.in', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 20%', scrub: true } });
    });

    /* mandalas turn with the reader, not on their own */
    $$('.mandala-spin').forEach(m => gsap.to(m, { rotation: 120, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1.5 } }));

    /* the strip of verses drifts with the scroll */
    $$('.shloka-track').forEach(t => gsap.fromTo(t, { xPercent: 0 }, { xPercent: -25, ease: 'none', scrollTrigger: { trigger: t.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 } }));

    /* a statement that fills in word by word as it is read */
    if (window.SplitText) $$('[data-words]').forEach(p => {
      const s = SplitText.create(p, { type: 'words', wordsClass: 'w' });
      gsap.fromTo(s.words, { opacity: 0.14 }, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 50%', scrub: true } });
    });

    /* Kausani: the panorama pans across as the band passes */
    $$('.pan-band').forEach(b => {
      const img = $('.pan-media img', b);
      gsap.fromTo(img, { x: 0 }, { x: () => Math.min(0, b.offsetWidth - img.offsetWidth), ease: 'none', scrollTrigger: { trigger: b, start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true } });
      if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    });

    /* gentle depth for marked layers */
    $$('[data-parallax]').forEach(el => {
      const f = +el.dataset.parallax;
      gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: 'none', scrollTrigger: { trigger: el.closest('section') || el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* YouTube: load the player only when asked (keeps pages light and private) */
  $$('.yt').forEach(el => el.addEventListener('click', () => {
    el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${el.dataset.id}?autoplay=1&rel=0" title="${el.dataset.title || 'Video'}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    el.classList.add('playing');
  }));

  /* course dates: mark past ones, highlight the next upcoming */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let nextMarked = false;
  $$('[data-start]').forEach(el => {
    if (new Date(el.dataset.start) < today) el.classList.add('past');
    else if (!nextMarked) { el.classList.add('next'); nextMarked = true; }
  });

  /* enquiry forms: validate, then hand over to e-mail or WhatsApp (no server needed) */
  $$('form[data-enquiry]').forEach(form => {
    const to = form.dataset.enquiry;
    const fields = $$('input, textarea, select', form).filter(f => f.name);
    const check = f => { const bad = !f.checkValidity(); f.closest('.field')?.classList.toggle('invalid', bad); return !bad; };
    fields.forEach(f => f.addEventListener('blur', () => check(f)));
    const compose = () => {
      const lines = [];
      fields.forEach(f => {
        if ((f.type === 'radio' || f.type === 'checkbox') && !f.checked) return;
        if (!f.value.trim()) return;
        lines.push(`${f.dataset.label || f.name}: ${f.value.trim()}`);
      });
      return lines.join('\n');
    };
    const valid = () => fields.map(check).every(Boolean);
    const done = () => { const ok = form.parentElement.querySelector('.form-success'); if (ok) { form.hidden = true; ok.classList.add('show'); } };
    form.addEventListener('submit', e => {
      e.preventDefault(); if (!valid()) { $('.invalid input, .invalid textarea', form)?.focus(); return; }
      const subject = form.dataset.subject || 'Enquiry from the website';
      location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
      done();
    });
    const wa = $('[data-whatsapp]', form);
    wa && wa.addEventListener('click', () => {
      if (!valid()) return;
      open(`https://wa.me/${wa.dataset.whatsapp}?text=${encodeURIComponent((form.dataset.subject || 'Namaste') + '\n' + compose())}`, '_blank', 'noopener');
      done();
    });
  });

  /* soft fade between pages where the browser has no cross-document view transitions */
  if (!reduce && !('onpagereveal' in window)) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 320);
    });
    addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
