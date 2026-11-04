/* The Visiting page: the programme calendar (earlier dates fold away) and the stay enquiry (the fields build a message
   that can still be edited before it opens in WhatsApp or the e-mail app). Runs after main.js, which marks the dates. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  $$('[data-pdates]').forEach(cal => {
    const items = $$('.pd-item', cal), past = items.filter(li => li.classList.contains('past'));
    items.forEach(li => {
      const key = ['next', 'now', 'past'].find(k => li.classList.contains(k));
      $('.pd-status', li).textContent = { next: cal.dataset.lNext, now: cal.dataset.lNow, past: cal.dataset.lDone }[key] || '';
    });
    if (items.length === past.length) $('.pd-empty', cal).hidden = false;
    if (!past.length) return;
    const toggle = $('.pd-toggle', cal), years = $$('.pd-year', cal);
    const fold = hide => {
      cal.classList.toggle('hide-past', hide);
      years.forEach(y => y.classList.toggle('all-past', $$('.pd-item', y).every(li => past.includes(li))));
      toggle.setAttribute('aria-expanded', String(!hide));
      toggle.textContent = hide ? cal.dataset.lShow.replace('{n}', past.length) : cal.dataset.lHide;
    };
    toggle.hidden = false;
    toggle.addEventListener('click', () => fold(!cal.classList.contains('hide-past')));
    fold(true);
  });

  $$('[data-compose]').forEach(box => {
    const fields = $$('[data-line]', box), msg = $('textarea', box), wa = $('[data-send="wa"]', box), mail = $('[data-send="mail"]', box), reset = $('[data-reset]', box);
    const lang = document.documentElement.lang;
    const value = f => (f.type === 'date' && f.valueAsDate ? f.valueAsDate.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : f.value.trim());
    const build = () => box.dataset.template.replace('{details}', fields.filter(f => value(f)).map(f => `${f.dataset.line}: ${value(f)}`).join('\n')).replace(/\n{3,}/g, '\n\n').trim();
    const links = () => {
      wa.href = `https://wa.me/${box.dataset.wa}?text=${encodeURIComponent(msg.value)}`;
      mail.href = `mailto:${box.dataset.email}?subject=${encodeURIComponent(box.dataset.subject)}&body=${encodeURIComponent(msg.value)}`;
    };
    let edited = false; // once the visitor has changed the message, the fields no longer overwrite it
    const refresh = () => { if (!edited) msg.value = build(); links(); };
    fields.forEach(f => f.addEventListener('input', refresh));
    msg.addEventListener('input', () => { edited = true; reset.hidden = false; links(); });
    reset.addEventListener('click', () => { edited = false; reset.hidden = true; refresh(); });
    $('.enq-fields', box).hidden = false;
    refresh();
  });
})();
