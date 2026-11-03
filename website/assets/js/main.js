/* Anāmay Ashram — site interactions. Plain JS, no dependencies. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* header: transparent over the hero, solid once scrolled */
  const header = $('.site-header');
  const onScroll = () => header && header.classList.toggle('solid', scrollY > 60);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* mobile navigation */
  const toggle = $('.menu-toggle');
  toggle && toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });

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

  /* gentle parallax for hero media and ridges */
  const layers = $$('[data-parallax]');
  if (layers.length && !reduce) {
    let ticking = false;
    const update = () => {
      layers.forEach(el => { const r = el.parentElement.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; el.style.transform = `translate3d(0, ${(-r.top * +el.dataset.parallax).toFixed(1)}px, 0)`; });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* lightbox for galleries */
  const box = $('.lightbox');
  if (box) {
    const img = $('img', box), cap = $('figcaption', box);
    let items = [], idx = 0;
    const show = i => { idx = (i + items.length) % items.length; const a = items[idx]; img.src = a.href; img.alt = a.dataset.caption || ''; cap.textContent = a.dataset.caption || ''; };
    $$('[data-lightbox]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); items = $$(`[data-lightbox="${a.dataset.lightbox}"]`); show(items.indexOf(a));
      box.classList.add('open'); $('.close', box).focus();
    }));
    const close = () => box.classList.remove('open');
    $('.close', box).addEventListener('click', close);
    $('.prev', box).addEventListener('click', () => show(idx - 1));
    $('.next', box).addEventListener('click', () => show(idx + 1));
    box.addEventListener('click', e => { if (e.target === box) close(); });
    addEventListener('keydown', e => { if (!box.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
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
    const done = () => { const ok = form.parentElement.querySelector('.form-success'); if (ok) { form.hidden = true; ok.classList.add('show'); } };
  });

  /* soft fade between pages (skipped where the browser does native view transitions) */
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
